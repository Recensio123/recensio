import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchTemplates, settingsFor, kanalFor, leadMs } from '@/lib/messageTemplates'
import { sendTimedMessage, type TimedBooking } from '@/lib/timedMessages'
import { TYSTA_SKÄL } from '@/lib/sendMessage'
import { hämtaKanalval } from '@/lib/kontaktsatt'
import { fetchPolicy } from '@/lib/bookingPolicy'

/*
 * Klockan bakom påminnelsen och recensionsförfrågan.
 *
 * Vaknar varje timme och frågar en sak: vilka bokningar är mogna nu? Varje
 * salong har sin egen ledtid, så frågan ställs per salong och inte som ett
 * svep över alla bokningar.
 *
 * Två regler som gör att jobbet kan köras hur ofta som helst utan att göra
 * skada:
 *
 *   Stämpeln på bokningen. Ett utskick som gått ut går inte ut igen, hur många
 *   gånger jobbet än vaknar. Det är också det enda som skiljer "en påminnelse"
 *   från "en påminnelse varje timme i ett dygn".
 *
 *   Ingen retroaktiv skur. En salong som slår på påminnelser i dag ska inte
 *   utlösa utskick för hela nästa vecka på en gång. Fönstret bakåt är därför
 *   begränsat: en bokning som passerat sin påminnelsetid med mer än ett dygn
 *   får ingen — den skulle nå kunden efter besöket ändå.
 */

const TIMME = 3_600_000
const DYGN  = 86_400_000

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const nu    = Date.now()

  const avslutade = await avslutaGenomförda(admin, nu)

  /* Vilka salonger har något påslaget alls. Utan detta läser jobbet varje
     salongs bokningar varje timme för att upptäcka att inget är på. */
  const { data: rader, error } = await admin
    .from('message_templates')
    .select('company_id, kind')
    .in('kind', ['reminder', 'review'])
    .eq('enabled', true)

  /* Migrationen inte körd ännu: inget att göra, och inget att larma om. */
  if (error) return NextResponse.json({ skipped: 'no_columns', avslutade })
  if (!rader?.length) return NextResponse.json({ sent: 0, checked: 0, avslutade })

  const salonger = [...new Set(rader.map(r => r.company_id as string))]

  let skickade = 0
  let granskade = 0
  const fel: string[] = []

  for (const companyId of salonger) {
    const mallar  = await fetchTemplates(admin, companyId)
    /* Kontaktsättet gäller bekräftelsen och avbokningen. De två här väljer
       kanal själva — en påminnelse ska läsas i tid, en recensionsförfrågan mår
       bra av en knapp — så kanalen slås upp per meddelande. */
    const kanalval = await hämtaKanalval(admin, companyId)
    /* Salongens egen gräns för hur sent en bokning får göras och ändå få en
       påminnelse. Läses en gång per salong, inte per bokning. */
    const hoppaSent = (await fetchPolicy(admin, companyId)).reminder_skip_hours * TIMME

    for (const kind of ['reminder', 'review'] as const) {
      const channel = kanalFor(kind, kanalval)
      const s = settingsFor(mallar, kind, channel)
      if (!s.enabled) continue

      const lead = leadMs(s)

      /* Påminnelsen ligger före besöket, recensionsförfrågan efter. Alltså
         söker de i motsatta riktningar från nu. */
      const from = kind === 'reminder'
        ? new Date(nu + lead - DYGN)    // hann vi inte i tid är det för sent
        : new Date(nu - lead - 7 * DYGN)
      const till = kind === 'reminder'
        ? new Date(nu + lead + TIMME)   // marginal över väckningstakten
        : new Date(nu - lead)

      /* En stämpel per meddelande, oavsett kanal. Salongen har bara en kanal,
         och en stämpel per kanal hade betytt att ett byte skickade om
         påminnelsen till alla som redan fått den — på den nya kanalen, och till
         en kostnad om den nya är SMS. */
      const stämpel = kind === 'reminder' ? 'reminder_sent_at' : 'review_sent_at'

      /* Påminnelse på en bokad tid; recensionsförfrågan bara på ett besök som
         faktiskt genomfördes. En kund som uteblev ska inte ombes recensera. */
      const status = kind === 'reminder' ? 'confirmed' : 'completed'

      const { data: bokningar, error: läsfel } = await admin
        .from('bookings')
        .select('id, company_id, customer_name, customer_email, customer_phone, service_name, booking_date, start_time, staff_id, cancel_code, skip_reminder, skip_review, created_at')
        .eq('company_id', companyId)
        .eq('status', status)
        .is(stämpel, null)
        .gte('booking_date', dag(from))
        .lte('booking_date', dag(till))
        .limit(200)

      /* Kunde raderna inte läsas hoppas de över i stället för att skickas utan
         att kunna stämplas — det hade blivit samma utskick varje timme. */
      if (läsfel) continue

      for (const b of bokningar ?? []) {
        /* Datumfiltret ovan är grovt — det arbetar på dagar, medan ledtiden är
           timmar. Den exakta jämförelsen görs här, med tiden på dygnet med. */
        const start = new Date(`${b.booking_date}T${(b.start_time as string).slice(0, 8)}`).getTime()
        const moget = kind === 'reminder'
          ? nu >= start - lead && nu <= start
          : nu >= start + lead

        if (!moget) continue

        /* Avstängt för just den här bokningen. Salongen har sett den i
           kommandelistan och sagt nej — stamkunden som inte behöver en
           påminnelse, eller kunden som just klagat och inte ska få frågan om
           ett omdöme. */
        const över = kind === 'reminder' ? b.skip_reminder : b.skip_review
        if (över) continue

        /*
         * Bokad för sent för att påminnas.
         *
         * Den som bokar klockan nio för klockan två har just fått en
         * bekräftelse. En påminnelse några minuter senare säger ingenting nytt
         * — den läser som ett fel i systemet, och på SMS kostar den salongen en
         * krona för besväret. Salongen sätter gränsen själv; noll betyder att
         * påminnelsen alltid går.
         */
        if (kind === 'reminder' && hoppaSent > 0 && b.created_at) {
          const bokadesVid = new Date(b.created_at as string).getTime()
          if (start - bokadesVid < hoppaSent) continue
        }

        granskade++

        const r = await sendTimedMessage(admin, b as TimedBooking, kind, channel)

        if (r.sent) {
          skickade++
          await admin
            .from('bookings')
            .update({ [stämpel]: new Date().toISOString() })
            .eq('id', b.id)
        } else if (r.reason && !TYSTA_SKÄL.includes(r.reason)) {
          fel.push(`${kind}/${channel} ${b.id}: ${r.reason}`)
        }
      }
    }
  }

  if (fel.length) console.error('[send-messages]', fel.join(' | '))

  return NextResponse.json({ sent: skickade, checked: granskade, errors: fel.length })
}

function dag(d: Date): string {
  return d.toISOString().split('T')[0]
}

/*
 * Besök som är över räknas som genomförda.
 *
 * Recensionsförfrågan går bara på status 'completed'. Ingenting satte den
 * statusen, så på ett konto som inte bockade av sina tider för hand stod
 * förfrågan och väntade på ett besked som ingen visste att den skulle ge — det
 * såg ut som ett trasigt utskick och var i själva verket en bokning som aldrig
 * blev färdig.
 *
 * Körs före utskicken och inte efter, så att ett besök som just tagit slut kan
 * få sin fråga i samma körning i stället för en timme senare.
 *
 * Varje salong stängs automatiskt — det finns inget manuellt läge längre. Vad
 * de bestämmer är marginalen: hur länge systemet väntar efter sluttiden innan
 * besöket räknas som genomfört. Den finns för behandlingen som drar över och
 * för salongen som vill hinna markera ett uteblivet besök innan en
 * omdömesfråga går ut.
 *
 * Bara bekräftade tider. En bokning salongen aldrig godkände blev inget besök,
 * hur länge den än legat kvar.
 */
async function avslutaGenomförda(
  admin: ReturnType<typeof createAdminClient>, nu: number,
): Promise<number> {
  let salonger: { id: string; timmar: number }[] = []
  const läs = async (kol: string) => admin.from('companies').select(kol).limit(2000)

  /* Marginalen per salong. En äldre databas utan kolumnen får standardvärdet i
     stället för att hoppa över avsluten helt. */
  const nytt = await läs('id, booking_auto_complete_hours')
  if (!nytt.error) {
    salonger = (nytt.data as unknown as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      timmar: Number(r.booking_auto_complete_hours ?? 1),
    }))
  } else {
    const gammalt = await läs('id')
    if (gammalt.error) return 0
    salonger = (gammalt.data as unknown as Record<string, unknown>[])
      .map(r => ({ id: r.id as string, timmar: 1 }))
  }

  if (!salonger.length) return 0
  const marginal = new Map(salonger.map(s => [s.id, s.timmar * TIMME]))

  /* Fönstret bakåt fångar upp en körning som legat nere ett par dagar. Längre
     tillbaka än så vore det ingen tjänst att skicka en omdömesfråga om ett
     besök kunden knappt minns. */
  const { data: rader, error: läsfel } = await admin
    .from('bookings')
    .select('id, company_id, booking_date, start_time, end_time')
    .in('company_id', salonger.map(c => c.id))
    .eq('status', 'confirmed')
    .gte('booking_date', dag(new Date(nu - 8 * DYGN)))
    .lte('booking_date', dag(new Date(nu)))
    .limit(500)

  if (läsfel || !rader?.length) return 0

  /* Datumfiltret ovan arbetar på dagar. Den exakta jämförelsen görs här, med
     klockslaget och salongens marginal med — annars stängs dagens
     eftermiddagstider på morgonen. */
  const färdiga = rader.filter(b => {
    const slut = String(b.end_time ?? b.start_time).slice(0, 8)
    const vänta = marginal.get(b.company_id as string) ?? TIMME
    return new Date(`${b.booking_date}T${slut}`).getTime() + vänta <= nu
  }).map(b => b.id as string)

  if (!färdiga.length) return 0

  const { error: skrivfel } = await admin
    .from('bookings').update({ status: 'completed' }).in('id', färdiga)

  return skrivfel ? 0 : färdiga.length
}
