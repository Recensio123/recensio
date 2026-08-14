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
    .select('staff_id, start_time, end_time')
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

  const slots = slotsForDay({
    salon:    hours,
    dow,
    duration,
    staff,
    staffId:  staffId || null,
    bookings: (existing ?? []) as BookingRow[],
    blocked,
    lead,
  })

  return NextResponse.json({ slots })
}
