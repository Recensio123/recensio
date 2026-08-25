import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchStaff } from '@/lib/staffQuery'
import { fetchPolicy } from '@/lib/bookingPolicy'
import { slotsForDay, defaultAvailability, leadRuleFor, salonNow, type StaffRow, type BookingRow, type BlockedRow } from '@/lib/bookingSlots'

type Params = { params: Promise<{ slug: string }> }

// GET /api/book/[slug]/slots?date=YYYY-MM-DD&duration=60&staff=<uuid>
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const date     = searchParams.get('date')
  const duration = parseInt(searchParams.get('duration') ?? '60', 10)
  const staffId  = searchParams.get('staff')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  /* A day that has already passed on the salon's own clock has no slots to
   * show, whatever timezone the server happens to run in. */
  if (date < salonNow().date) {
    return NextResponse.json({ slots: [] })
  }

  const dow = new Date(date + 'T12:00:00').getDay()
  const policy = await fetchPolicy(admin, company.id)
  const lead   = leadRuleFor(date, policy.lead_minutes)

  const { data: avail } = await admin
    .from('booking_availability')
    .select('open_time, close_time, slot_duration_minutes, is_active')
    .eq('company_id', company.id)
    .eq('day_of_week', dow)
    .single()

  /* A salon created before the availability seeding has no rows at all —
   * it gets the same default week the seeding writes. A salon that HAS rows
   * and is closed this day stays closed. */
  const hours = avail ?? defaultAvailability(dow)
  if (!hours.is_active) {
    return NextResponse.json({ slots: [] })
  }

  const { data: existing } = await admin
    .from('bookings')
    .select('staff_id, start_time, end_time, service_id')
    .eq('company_id', company.id)
    .eq('booking_date', date)
    .neq('status', 'cancelled')

  /* Staff and blocked times arrived with a later migration — a database
   * without them answers with an error, and the salon then simply behaves
   * as the single chair it was before. */
  let staff: StaffRow[] = []
  let blocked: BlockedRow[] = []
  try {
    staff = (await fetchStaff(admin, company.id) ?? []) as StaffRow[]

    const { data: bl } = await admin
      .from('blocked_times')
      .select('staff_id, start_time, end_time')
      .eq('company_id', company.id)
      .lte('date_from', date)
      .gte('date_to', date)
    blocked = (bl ?? []) as BlockedRow[]
  } catch { /* pre-migration database */ }

  /*
   * Tiden och stolarna avgörs av tjänsterna, inte av webbläsaren.
   *
   * Rutten tog tidigare emot `duration` som en siffra i adressen. Det räckte
   * när en tjänst bara hade en längd, men tre saker hänger numera på vilka
   * tjänster besöket gäller — städtiden efter, vilka som kan utföra dem, och
   * taket per dag — och ingen av dem ska en klient få bestämma.
   *
   * `duration` finns kvar som reserv för äldre anrop.
   */
  const valda = (searchParams.get('services') ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)

  let upptagen = duration
  let kanUtföra = staff

  if (valda.length) {
    const { data: tjänster } = await admin
      .from('services')
      .select('id, minuter, max_per_dag')
      .eq('company_id', company.id)
      .eq('aktiv', true)
      .eq('bokningsbar', true)
      .in('id', valda)

    if (tjänster?.length) {
      /* Behandlingarna läggs efter varandra; städningen sker en gång, efteråt.
         Den är salongens regel och inte tjänstens — den som vill ha en kvart
         mellan kunderna vill ha det mellan alla kunder. */
      upptagen = tjänster.reduce((s, t) => s + Number(t.minuter ?? 0), 0) + policy.buffer_minutes

      /* Taket per dag. Är det fullt finns inga tider att visa — och det är ett
         ärligare besked än en kalender full av tider salongen inte hinner. */
      for (const t of tjänster) {
        const tak = t.max_per_dag === null ? null : Number(t.max_per_dag)
        if (!tak) continue
        const idag = (existing ?? []).filter(b => b.service_id === t.id).length
        if (idag >= tak) return NextResponse.json({ slots: [], fullt: true })
      }

      /* Bara stolar som kan utföra hela besöket. En tjänst utan koppling kan
         alla — tom lista betyder alla, inte ingen. */
      try {
        const { data: koppl } = await admin
          .from('service_staff').select('service_id, staff_id').in('service_id', valda)
        const per = new Map<string, Set<string>>()
        for (const k of koppl ?? []) {
          const s = per.get(k.service_id as string) ?? new Set<string>()
          s.add(k.staff_id as string)
          per.set(k.service_id as string, s)
        }
        if (per.size) {
          kanUtföra = staff.filter(s =>
            valda.every(id => !per.has(id) || per.get(id)!.has(s.id)))
        }
      } catch { /* kopplingstabellen inte migrerad — alla kan allt */ }
    }
  }

  /* Ingen stol klarar kombinationen. Att då visa salongens öppettider som
     lediga vore att sälja en tid ingen kan ta. */
  if (staff.length && !kanUtföra.length) {
    return NextResponse.json({ slots: [], ingenSomKan: true })
  }

  const slots = slotsForDay({
    salon:    hours,
    dow,
    duration: upptagen,
    staff:    kanUtföra,
    staffId:  staffId || null,
    bookings: (existing ?? []) as unknown as BookingRow[],
    blocked,
    lead,
  })

  return NextResponse.json({ slots })
}
