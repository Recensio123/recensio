import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BokningarDashboard } from './BokningarDashboard'

export default async function BokningarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get company for this user
  const { data: company } = await supabase
    .from('companies')
    .select('id, slug')
    .eq('user_id', user.id)
    .maybeSingle()

  let initialBookings: Parameters<typeof BokningarDashboard>[0]['initialBookings'] = []

  if (company) {
    // Fetch bookings from past 30 days through next 90 days
    const past   = new Date(); past.setDate(past.getDate() - 30)
    const future = new Date(); future.setDate(future.getDate() + 90)
    const from   = past.toISOString().split('T')[0]
    const to     = future.toISOString().split('T')[0]

    const { data: rows } = await supabase
      .from('bookings')
      .select('id, customer_name, customer_phone, customer_email, service_name, service_duration_minutes, service_price_sek, booking_date, start_time, status, customer_note, source, created_at')
      .eq('company_id', company.id)
      .gte('booking_date', from)
      .lte('booking_date', to)
      .order('booking_date')
      .order('start_time')

    initialBookings = (rows ?? []).map(r => ({
      id:           r.id,
      customerName: r.customer_name,
      phone:        r.customer_phone  ?? '',
      email:        r.customer_email  ?? '',
      service:      r.service_name,
      duration:     r.service_duration_minutes,
      price:        r.service_price_sek ?? 0,
      date:         r.booking_date,
      time:         r.start_time.slice(0, 5),   // trim seconds
      status:       r.status,
      note:         r.customer_note  ?? '',
      source:       r.source as 'online' | 'phone' | 'walk_in',
      createdAt:    r.created_at,
    }))
  }

  return (
    <BokningarDashboard
      initialBookings={initialBookings}
      bookingLink={company?.slug ? `/book/${company.slug}` : undefined}
    />
  )
}
