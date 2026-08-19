import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchTemplates, settingsFor, leadMs } from '@/lib/messageTemplates'
import { sendTimedMessage, type TimedBooking } from '@/lib/timedMessages'
import { TYSTA_SKÄL } from '@/lib/sendMessage'

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

  /* Vilka salonger har något påslaget alls. Utan detta läser jobbet varje
     salongs bokningar varje timme för att upptäcka att inget är på. */
  const { data: rader, error } = await admin
    .from('message_templates')
    .select('company_id, kind')
    .in('kind', ['reminder', 'review'])
    .eq('enabled', true)

  /* Migrationen inte körd ännu: inget att göra, och inget att larma om. */
  if (error) return NextResponse.json({ skipped: 'no_columns' })
  if (!rader?.length) return NextResponse.json({ sent: 0, checked: 0 })

  const salonger = [...new Set(rader.map(r => r.company_id as string))]

  let skickade = 0
  let granskade = 0
  const fel: string[] = []

  for (const companyId of salonger) {
    const mallar = await fetchTemplates(admin, companyId)

    for (const kind of ['reminder', 'review'] as const) {
      const s = settingsFor(mallar, kind)
      if (!s.enabled) continue

      const lead = leadMs(s)

      /* Påminnelsen ligger före besöket, recensionsförfrågan efter. Alltså
         söker de i motsatta riktningar från nu. */
      const from = kind === 'reminder'
        ? new Date(nu + lead - DYGN)    // hann vi inte i tid är det för sent
        : new Date(nu - lead - 7 * DYGN)
      const till = kind === 'reminder'
        ? new Date(nu + lead + TIMME)   // jobbet vaknar varje timme
        : new Date(nu - lead)

      const stämpel = kind === 'reminder' ? 'reminder_sent_at' : 'review_sent_at'

      /* Påminnelse på en bokad tid; recensionsförfrågan bara på ett besök som
         faktiskt genomfördes. En kund som uteblev ska inte ombes recensera. */
      const status = kind === 'reminder' ? 'confirmed' : 'completed'

      const { data: bokningar } = await admin
        .from('bookings')
        .select('id, company_id, customer_name, customer_email, customer_phone, service_name, booking_date, start_time, staff_id')
        .eq('company_id', companyId)
        .eq('status', status)
        .is(stämpel, null)
        .gte('booking_date', dag(from))
        .lte('booking_date', dag(till))
        .limit(200)

      for (const b of bokningar ?? []) {
        /* Datumfiltret ovan är grovt — det arbetar på dagar, medan ledtiden är
           timmar. Den exakta jämförelsen görs här, med tiden på dygnet med. */
        const start = new Date(`${b.booking_date}T${(b.start_time as string).slice(0, 8)}`).getTime()
        const moget = kind === 'reminder'
          ? nu >= start - lead && nu <= start
          : nu >= start + lead

        if (!moget) continue
        granskade++

        const r = await sendTimedMessage(admin, b as TimedBooking, kind)

        if (r.sent) {
          skickade++
          await admin
            .from('bookings')
            .update({ [stämpel]: new Date().toISOString() })
            .eq('id', b.id)
        } else if (r.reason && !TYSTA_SKÄL.includes(r.reason)) {
          fel.push(`${kind} ${b.id}: ${r.reason}`)
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
