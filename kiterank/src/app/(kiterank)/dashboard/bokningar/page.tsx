import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess } from '@/lib/access'
import { fetchStaff } from '@/lib/staffQuery'
import { fetchPolicy, DEFAULT_POLICY, type BookingPolicy } from '@/lib/bookingPolicy'
import { redirect } from 'next/navigation'
import { BokningarDashboard } from './BokningarDashboard'
import { DEFAULT_HOURS, type WeekHours } from './kalender'
import type { Booking, StaffMember, Absence, ServiceOption } from './data'

export default async function BokningarPage({ searchParams }: { searchParams: Promise<{ flik?: string }> }) {
  const { flik } = await searchParams
  /* Owner, reception or a single chair — the same page, scoped differently.
   * The scoping is repeated in the routes; this only decides what to fetch
   * and what to draw. */
  const access = await currentAccess()
  if (!access) redirect('/auth/login')

  const { data: company } = await createAdminClient()
    .from('companies')
    .select('id, slug, name')
    .eq('id', access.companyId)
    .maybeSingle()

  let initialBookings: Booking[] = []
  let initialStaff: StaffMember[] = []
  let initialAbsences: Absence[] = []
  let services: ServiceOption[] = []
  let policy: BookingPolicy = { ...DEFAULT_POLICY }
  let salonHours: WeekHours = DEFAULT_HOURS

  if (company) {
    const admin = createAdminClient()

    // Bookings from past 30 days through next 90 days
    const past   = new Date(); past.setDate(past.getDate() - 30)
    const future = new Date(); future.setDate(future.getDate() + 90)
    const from   = past.toISOString().split('T')[0]
    const to     = future.toISOString().split('T')[0]

    /* staff_id/source_channel are the newer migration — retry without them
     * so an unmigrated database still shows its bookings. */
    let rows: Record<string, unknown>[] | null = null
    const withStaff = await admin
      .from('bookings')
      .select('id, customer_name, customer_phone, customer_email, service_name, service_duration_minutes, service_price_sek, booking_date, start_time, status, customer_note, source, source_channel, staff_id, staff_requested, created_at')
      .eq('company_id', company.id)
      .gte('booking_date', from)
      .lte('booking_date', to)
      .order('booking_date')
      .order('start_time')
    if (!withStaff.error) {
      rows = withStaff.data
    } else {
      const legacy = await admin
        .from('bookings')
        .select('id, customer_name, customer_phone, customer_email, service_name, service_duration_minutes, service_price_sek, booking_date, start_time, status, customer_note, source, created_at')
        .eq('company_id', company.id)
        .gte('booking_date', from)
        .lte('booking_date', to)
        .order('booking_date')
        .order('start_time')
      rows = legacy.data
    }

    initialBookings = ((rows ?? []) as never[]).map((r: Record<string, never>) => ({
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

    try {
      const st = await fetchStaff(admin, company.id)
      if (st) initialStaff = st as StaffMember[]

      const { data: abs } = await admin
        .from('blocked_times')
        .select('id, staff_id, date_from, date_to, start_time, end_time, reason')
        .eq('company_id', company.id)
        .gte('date_to', new Date().toISOString().slice(0, 10))
        .order('date_from')
      initialAbsences = (abs ?? []) as Absence[]
    } catch { /* pre-migration database — the dashboard shows its example salon */ }

    const { data: svc } = await admin
      .from('booking_services')
      .select('id, name, duration_minutes, price_sek')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('sort_order')
    services = (svc ?? []).map(s => ({ id: s.id, name: s.name, duration: s.duration_minutes, price: s.price_sek }))

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

    policy = await fetchPolicy(admin, company.id)

    /* The calendar draws the salon's real week: a day it never opens is a
     * strip rather than a column, and the grid starts when the doors do. A
     * salon created before the availability seeding has no rows and keeps
     * the same default week the booking system falls back on. */
    const { data: avail } = await admin
      .from('booking_availability')
      .select('day_of_week, open_time, close_time, is_active')
      .eq('company_id', company.id)
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
      initialConfirmationText={policy.confirmation_text}
      initialTab={flik === 'sms' ? 'sms' : flik === 'installningar' ? 'installningar' : flik === 'konton' ? 'konton' : 'kalender'}
      companyName={company?.name ?? 'Din salong'}
      bookingLink={company?.slug ? `/book/${company.slug}` : undefined}
      role={access.role}
      myStaffId={access.staffId}
      ownerEmail={access.email}
    />
  )
}
