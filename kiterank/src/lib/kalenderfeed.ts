import { randomBytes } from 'node:crypto'
import type { createAdminClient } from '@/lib/supabase/admin'
import { icsKalender, type IcsHändelse } from '@/lib/ics'

/*
 * Salongens kalender som en prenumeration.
 *
 * Valet av teknik är gjort för att en salong ska kunna göra det själv på en
 * minut. En ICS-adress läses av Google, Outlook, iPhone och Android med samma
 * länk och utan att någon behöver godkänna en app — mot att den är enkelriktad:
 * bokningarna syns i telefonen, men det som skrivs i telefonen kommer inte
 * tillbaka hit.
 *
 * Tvåvägssynk hade krävt OAuth mot Google och Microsoft var för sig, en
 * granskning hos båda innan den får användas skarpt, och den hade ändå inte
 * nått iPhones egen kalender utan att gå omvägen via ett av de kontona. Den
 * dagen det behövs byggs den vid sidan av — den här får stå kvar för alla som
 * bara vill se sina tider i telefonen.
 */

type Admin = ReturnType<typeof createAdminClient>

export type Feed = {
  token:    string
  staffId:  string | null
  skapad:   string
  senast:   string | null
}

/* Lång nog för att inte gå att gissa, kort nog att gå att klistra in.
   32 tecken ur base64url är 192 bitar. */
function nyToken(): string {
  return randomBytes(24).toString('base64url')
}

/** Salongens alla prenumerationslänkar. Tom lista när tabellen inte finns. */
export async function hämtaFeeds(admin: Admin, companyId: string): Promise<Feed[]> {
  const { data, error } = await admin
    .from('calendar_feeds')
    .select('token, staff_id, created_at, last_read_at')
    .eq('company_id', companyId)

  if (error || !data) return []

  return data.map(r => ({
    token:   String(r.token),
    staffId: (r.staff_id as string | null) ?? null,
    skapad:  String(r.created_at),
    senast:  (r.last_read_at as string | null) ?? null,
  }))
}

/**
 * Länken för en kalender, skapad om den inte fanns.
 *
 * Skapas vid första visningen och inte vid registreringen: en salong som aldrig
 * öppnar kalendersynken ska inte ha en hemlig adress liggande som ingen vet om.
 */
export async function säkraFeed(
  admin: Admin, companyId: string, staffId: string | null,
): Promise<string | null> {
  const fråga = admin
    .from('calendar_feeds').select('token').eq('company_id', companyId)

  const { data, error } = staffId
    ? await fråga.eq('staff_id', staffId).maybeSingle()
    : await fråga.is('staff_id', null).maybeSingle()

  if (error) return null
  if (data?.token) return String(data.token)

  const token = nyToken()
  const { error: skrivfel } = await admin
    .from('calendar_feeds')
    .insert({ token, company_id: companyId, staff_id: staffId })

  if (!skrivfel) return token

  /* Två samtidiga öppningar av sidan skapar samma kalender två gånger, och det
     unika indexet avvisar den andra. Den som förlorade läser om i stället för
     att lämna en tom ruta: raden finns nu, den skrevs bara av någon annan. */
  const igen = admin
    .from('calendar_feeds').select('token').eq('company_id', companyId)
  const { data: efter } = staffId
    ? await igen.eq('staff_id', staffId).maybeSingle()
    : await igen.is('staff_id', null).maybeSingle()

  return efter?.token ? String(efter.token) : null
}

/**
 * Byter ut en länk.
 *
 * Den gamla slutar fungera i samma stund. Det är hela poängen: en anställd som
 * slutat har adressen kvar i sin telefon, och det finns ingen annan väg att ta
 * ifrån den hen.
 */
export async function bytFeed(
  admin: Admin, companyId: string, staffId: string | null,
): Promise<string | null> {
  const bort = admin
    .from('calendar_feeds').delete().eq('company_id', companyId)

  const { error } = staffId
    ? await bort.eq('staff_id', staffId)
    : await bort.is('staff_id', null)

  if (error) return null
  return säkraFeed(admin, companyId, staffId)
}

/** Vem en adress hör till, eller null när den inte finns längre. */
export async function slåUppFeed(
  admin: Admin, token: string,
): Promise<{ companyId: string; staffId: string | null } | null> {
  const { data, error } = await admin
    .from('calendar_feeds')
    .select('company_id, staff_id')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return null
  return {
    companyId: String(data.company_id),
    staffId:   (data.staff_id as string | null) ?? null,
  }
}

/* Fönstret kalendern visar. Bakåt räcker en månad — äldre tider finns i
   kundhistoriken och tynger bara en telefon. Framåt ett halvår, som är längre
   än någon bokar. */
const BAKÅT  = 30
const FRAMÅT = 180

function dag(d: Date): string { return d.toISOString().slice(0, 10) }

function plus(tid: string, minuter: number): string {
  const [t, m] = tid.slice(0, 5).split(':').map(Number)
  const summa = t * 60 + m + (minuter || 30)
  return `${String(Math.floor(summa / 60) % 24).padStart(2, '0')}:${String(summa % 60).padStart(2, '0')}`
}

/**
 * Kalendern som text.
 *
 * Avbokade tider tas med och märks som avbokade i stället för att utelämnas.
 * En post som bara försvinner ur filen städas inte alltid bort av klienten, och
 * en avbokad tid som ligger kvar i telefonen är värre än ingen synk alls.
 */
export async function byggKalender(
  admin: Admin, companyId: string, staffId: string | null, nu = new Date(),
): Promise<string | null> {
  const från = new Date(nu.getTime() - BAKÅT  * 86_400_000)
  const till = new Date(nu.getTime() + FRAMÅT * 86_400_000)

  let q = admin
    .from('bookings')
    .select('id, customer_name, customer_phone, customer_note, service_name, service_duration_minutes, service_price_sek, booking_date, start_time, end_time, status, updated_at')
    .eq('company_id', companyId)
    .gte('booking_date', dag(från))
    .lte('booking_date', dag(till))
    .order('booking_date')
    .limit(1000)

  if (staffId) q = q.eq('staff_id', staffId)

  const { data, error } = await q
  if (error) return null

  /* Namnet kalendern får i telefonen. Salongens namn räcker — den som lagt in
     den vet vad den är, och en lång rubrik klipps ändå av. */
  const { data: co } = await admin
    .from('companies').select('name').eq('id', companyId).maybeSingle()

  let namn = String(co?.name ?? 'Bokningar')
  if (staffId) {
    const { data: s } = await admin
      .from('staff').select('name').eq('id', staffId).maybeSingle()
    if (s?.name) namn = `${namn} — ${s.name}`
  }

  const händelser: IcsHändelse[] = (data ?? []).map(b => {
    const start = String(b.start_time).slice(0, 5)
    const slut  = b.end_time
      ? String(b.end_time).slice(0, 5)
      : plus(start, Number(b.service_duration_minutes ?? 30))

    const rader = [
      b.customer_phone ? String(b.customer_phone) : '',
      b.service_price_sek ? `${b.service_price_sek} kr` : '',
      b.customer_note ? String(b.customer_note) : '',
      b.status === 'pending' ? 'Väntar på din bekräftelse' : '',
    ].filter(Boolean)

    return {
      /* Bokningens id plus en domändel, som formatet vill ha det. Stabilt över
         tid, så en ändrad tid flyttar posten i stället för att lägga en till. */
      uid:         `${b.id}@kiterank`,
      datum:       String(b.booking_date),
      start,
      slut,
      rubrik:      `${String(b.customer_name ?? '')} — ${String(b.service_name ?? '')}`.trim(),
      beskrivning: rader.join('\n'),
      avbokad:     b.status === 'cancelled',
      /* Ändringsnumret måste växa när posten ändrats. Sekunder sedan raden
         senast rördes duger och är monotont. */
      sekvens:     b.updated_at ? Math.floor(new Date(String(b.updated_at)).getTime() / 1000) : 0,
    }
  })

  return icsKalender({ namn, händelser, nu })
}
