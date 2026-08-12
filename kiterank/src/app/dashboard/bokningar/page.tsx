import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { BokningarDashboard } from './BokningarDashboard'
import type { Booking, StaffMember, Absence, ServiceOption } from './data'

export default async function BokningarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, slug')
    .eq('user_id', user.id)
    .maybeSingle()

  let initialBookings: Booking[] = []
  let initialStaff: StaffMember[] = []
  let initialAbsences: Absence[] = []
  let services: ServiceOption[] = []

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
      .select('id, customer_name, customer_phone, customer_email, service_name, service_duration_minutes, service_price_sek, booking_date, start_time, status, customer_note, source, source_channel, staff_id, created_at')
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
      createdAt:    String(r['created_at']),
    }))

    try {
      const { data: st, error } = await admin
        .from('staff')
        .select('id, name, title, image, schedule, is_active')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('sort_order')
      if (!error) initialStaff = (st ?? []) as StaffMember[]

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
  }

  return (
    <BokningarDashboard
      initialBookings={initialBookings}
      initialStaff={initialStaff}
      initialAbsences={initialAbsences}
      services={services}
      bookingLink={company?.slug ? `/book/${company.slug}` : undefined}
    />
  )
}
