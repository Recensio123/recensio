import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess } from '@/lib/access'
import { fetchStaff } from '@/lib/staffQuery'
import { hämtaKö } from '@/lib/kommandeServer'
import { meddelandeData } from '@/lib/meddelandenData'
import { teamData } from '@/lib/teamData'
import { redirect } from 'next/navigation'
import { BokningarDashboard } from './BokningarDashboard'
import { visaExempel } from '@/lib/datalage.server'
import { DEFAULT_HOURS, type WeekHours } from './kalender'
import { månadsrader } from '@/lib/bokningsstatistik'
import type { Booking, StaffMember, Absence, ServiceOption } from './data'

type Admin = ReturnType<typeof createAdminClient>

/*
 * Bokningarna i fönstret sidan ritar.
 *
 * Egen funktion för att den har två försök i sig — staff_id och source_channel
 * kom i en senare migration, och en databas utan dem ska visa sina bokningar
 * ändå i stället för en tom kalender. Utbruten hit så att de två försöken inte
 * ligger mitt i hämtningen nedan och döljer att allt annat sker samtidigt.
 */
const KOLUMNER = 'id, customer_name, customer_phone, customer_email, service_name, service_duration_minutes, service_price_sek, booking_date, start_time, status, customer_note, source, created_at'

async function hämtaBokningar(admin: Admin, companyId: string, from: string, to: string) {
  const fråga = (cols: string) => admin
    .from('bookings')
    .select(cols)
    .eq('company_id', companyId)
    .gte('booking_date', from)
    .lte('booking_date', to)
    .order('booking_date')
    .order('start_time')

  const med = await fråga(`${KOLUMNER}, source_channel, staff_id, staff_requested`)
  if (!med.error) return med.data as unknown as Record<string, unknown>[]

  const utan = await fråga(KOLUMNER)
  return (utan.data ?? []) as unknown as Record<string, unknown>[]
}

/*
 * Årets bokningar, buntade till en rad per månad innan de lämnar servern.
 *
 * Kalenderfönstret ovan går trettio dagar bakåt, vilket räcker för en kalender
 * och inte alls för en historik. Det här är den andra frågan: ett år tillbaka,
 * men bara de fyra fält statistiken räknar på, och summerade här i stället för
 * i webbläsaren.
 *
 * Skälet att summera på servern är storleken. En salong med tre stolar bokar
 * några tusen tider på ett år, och att skicka dem alla för att rita tolv
 * staplar vore att lägga en halv megabyte på varje besök i panelen. Tolv rader
 * väger ingenting.
 */
async function hämtaÅrsstatistik(admin: Admin, companyId: string, från: string, till: string) {
  const { data, error } = await admin
    .from('bookings')
    .select('booking_date, status, service_price_sek, service_duration_minutes')
    .eq('company_id', companyId)
    .gte('booking_date', från)
    .lte('booking_date', till)

  if (error) return månadsrader([], från, till)

  return månadsrader((data ?? []).map(r => ({
    datum:   String(r.booking_date),
    status:  String(r.status),
    pris:    Number(r.service_price_sek ?? 0),
    minuter: Number(r.service_duration_minutes ?? 0),
  })), från, till)
}

/* Ett misslyckat anrop ska inte ta hela sidan med sig. Promise.all faller på
   första avvisade löfte, och en omigrerad tabell någonstans i listan skulle
   annars släcka kalendern i stället för att bara sakna sin egen ruta. */
function säkert<T>(p: PromiseLike<T>, reserv: T): Promise<T> {
  /* PromiseLike och inte Promise: Supabase frågebyggare är en thenable utan
     catch, så den behöver gå genom resolve först. */
  return Promise.resolve(p).catch(() => reserv)
}

export default async function BokningarPage({ searchParams }: { searchParams: Promise<{ flik?: string }> }) {
  const { flik } = await searchParams
  /* Owner, reception or a single chair — the same page, scoped differently.
   * The scoping is repeated in the routes; this only decides what to fetch
   * and what to draw. */
  const access = await currentAccess()
  if (!access) redirect('/auth/login')

  const admin = createAdminClient()
  const cid   = access.companyId

  // Bookings from past 30 days through next 90 days
  const past   = new Date(); past.setDate(past.getDate() - 30)
  const future = new Date(); future.setDate(future.getDate() + 90)
  const from   = past.toISOString().split('T')[0]
  const to     = future.toISOString().split('T')[0]

  /* Historikens spann: tolv hela månader bakåt plus den månad vi står i. Det
     börjar och slutar på månadsgränser och inte på "för 365 dagar sedan", av
     två skäl. Den första stapeln blir en hel månad i stället för en stump som
     ser ut som ett ras. Och den sista räknar hela månaden, resten av den
     medräknad: panelen räknar om innevarande månad ur sin egen lista, som når
     nittio dagar framåt, och om servern stannade vid idag skulle samma stapel
     betyda "hittills" ena gången och "hela månaden" den andra. */
  const idag     = new Date()
  const årFrån   = `${idag.getFullYear() - 1}-${String(idag.getMonth() + 1).padStart(2, '0')}-01`
  const sistaDag = new Date(idag.getFullYear(), idag.getMonth() + 1, 0)
  const årTill   = `${sistaDag.getFullYear()}-${String(sistaDag.getMonth() + 1).padStart(2, '0')}-${String(sistaDag.getDate()).padStart(2, '0')}`

  /*
   * Allt sidan behöver, på en gång.
   *
   * Frågorna låg tidigare på rad, var och en väntande på den innan, trots att
   * ingen behövde svaret från föregående — de vill alla bara veta salongens id,
   * och det står redan i behörigheten.
   *
   * Vinsten är mindre än den ser ut. Mätt på den här maskinen gick hämtningen
   * från ungefär 220 ms till 175: frågorna trängs om samma anslutning, så tio
   * samtidiga blir inte tio gånger snabbare, och botten sätts ändå av kön och
   * meddelandena som har två varv var inuti sig. Att sidan ändå känns snabbare
   * att klicka på är loading.tsx förtjänst, inte den här listans. Det som
   * däremot är rena besparingar: policyn läses en gång i stället för två, och
   * en misslyckad tabell tar inte längre grannarna med sig.
   *
   * Ordningen spelar ingen roll för hastigheten, bara för läsbarheten:
   * kalendern först, sedan flikarna, sist salongens vecka.
   */
  const [
    företag, rows, staffRows, absRows, svcRows, kommande, meddelanden, team, avail, exempel, årsrader,
  ] = await Promise.all([
    säkert(admin.from('companies').select('slug').eq('id', cid).maybeSingle().then(r => r.data), null),
    säkert(hämtaBokningar(admin, cid, from, to), [] as Record<string, unknown>[]),
    säkert(fetchStaff(admin, cid), null),
    säkert(
      admin.from('blocked_times')
        .select('id, staff_id, date_from, date_to, start_time, end_time, reason')
        .eq('company_id', cid)
        .gte('date_to', new Date().toISOString().slice(0, 10))
        .order('date_from')
        .then(r => r.data),
      null,
    ),
    säkert(
      admin.from('services')
        .select('id, namn, minuter, pris_kr, pris_fran, bokningsbar')
        .eq('company_id', cid)
        .eq('aktiv', true)
        .order('sort_order')
        .then(r => r.data),
      null,
    ),
    hämtaKö(admin, cid),
    meddelandeData(admin, cid),
    teamData(admin, cid, access.email),
    säkert(
      admin.from('booking_availability')
        .select('day_of_week, open_time, close_time, is_active')
        .eq('company_id', cid)
        .then(r => r.data),
      null,
    ),
    visaExempel(),
    säkert(hämtaÅrsstatistik(admin, cid, årFrån, årTill), månadsrader([], årFrån, årTill)),
  ])

  const initialStaff:    StaffMember[]   = (staffRows ?? []) as StaffMember[]
  const initialAbsences: Absence[]       = (absRows ?? []) as Absence[]
  const services:        ServiceOption[] = (svcRows ?? []).map(s =>
    ({ id: s.id, name: s.namn, duration: s.minuter, price: s.pris_kr }))
  const policy = kommande.policy

  let initialBookings: Booking[] = (rows as never[]).map((r: Record<string, never>) => ({
    id:           String(r['id']),
    customerName: String(r['customer_name']),
    phone:        String(r['customer_phone'] ?? ''),
    email:        String(r['customer_email'] ?? ''),
    service:      String(r['service_name']),
    duration:     Number(r['service_duration_minutes']),
    price:        Number(r['service_price_sek'] ?? 0),
    date:         String(r['booking_date']),
    time:         String(r['start_time']).slice(0, 5),
    status:       r['status'],
    note:         String(r['customer_note'] ?? ''),
    source:       r['source'],
    channel:      (r['source_channel'] ?? null) as string | null,
    staffId:      (r['staff_id'] ?? null) as string | null,
    /* Pre-migration rows have no flag. Treating them as a customer choice
     * is the careful reading — better to warn before a move than to move
     * someone's requested stylist without a word. */
    staffRequested: r['staff_requested'] === undefined ? true : Boolean(r['staff_requested']),
    createdAt:    String(r['created_at']),
  }))

  /*
   * A stylist sees the salon's week, but a colleague's hour is only ever
   * "Upptaget". Stripped here rather than hidden in the components: a name
   * that never leaves the server cannot leak through a devtools panel.
   */
  if (access.role === 'staff') {
    initialBookings = initialBookings.map(b => b.staffId === access.staffId ? b : {
      ...b,
      customerName: 'Upptaget',
      phone: '', email: '', service: '', note: '', channel: null, price: 0,
      status: 'confirmed' as const,
      staffRequested: true,
      masked: true,
    })
  }

  /* The calendar draws the salon's real week: a day it never opens is a
   * strip rather than a column, and the grid starts when the doors do. A
   * salon created before the availability seeding has no rows and keeps
   * the same default week the booking system falls back on. */
  let salonHours: WeekHours = DEFAULT_HOURS
  if (avail?.length) {
    salonHours = DEFAULT_HOURS.map((fallback, dow) => {
      const row = avail.find(a => a.day_of_week === dow)
      if (!row) return fallback
      return {
        open:   String(row.open_time).slice(0, 5),
        close:  String(row.close_time).slice(0, 5),
        active: row.is_active !== false,
      }
    })
  }

  return (
    <BokningarDashboard
      initialBookings={initialBookings}
      initialStaff={initialStaff}
      initialAbsences={initialAbsences}
      services={services}
      salonHours={salonHours}
      initialCancelHours={policy.cancel_hours}
      initialLeadMinutes={policy.lead_minutes}
      initialAutoConfirm={policy.auto_confirm}
      initialAutoCompleteHours={policy.auto_complete_hours}
      initialReminderSkipHours={policy.reminder_skip_hours}
      initialBufferMinutes={policy.buffer_minutes}
      initialKommande={kommande.bookings}
      köInst={kommande.inst}
      kundNoteringar={kommande.notes}
      initialMeddelanden={meddelanden}
      initialTeam={team}
      årsrader={årsrader}
      bokningarFrån={from}
      initialTab={flik === 'kommande' ? 'kommande' : flik === 'meddelanden' ? 'meddelanden' : flik === 'installningar' ? 'installningar' : flik === 'konton' ? 'konton' : 'kalender'}
      bookingLink={företag?.slug ? `/book/${företag.slug}` : undefined}
      role={access.role}
      myStaffId={access.staffId}
      ownerEmail={access.email}
      exempel={exempel}
    />
  )
}
