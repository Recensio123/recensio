import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bookingSeedsFrom, bookingServices } from '@/lib/trades'
import {
  addMinutes, assignStaff, staffFree, timeToMins, defaultAvailability,
  type StaffRow, type BookingRow, type BlockedRow, type Availability,
} from '@/lib/bookingSlots'

type Params = { params: Promise<{ slug: string }> }

function shortRef(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// GET /api/book/[slug] — company info, active services and bookable staff
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: company, error } = await admin
    .from('companies')
    .select('id, name, slug, industry')
    .eq('slug', slug)
    .single()

  if (error || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  let { data: services } = await admin
    .from('booking_services')
    .select('id, name, description, duration_minutes, price_sek')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('sort_order')

  /* No bookable services configured — the salon's price list is the truth,
   * so it steps in: first the list they edited on their website, then their
   * trade's example list. A booking page must never stand empty next to a
   * site full of prices. */
  if (!services?.length) {
    const { data: cfg } = await admin
      .from('site_config')
      .select('content')
      .eq('company_id', company.id)
      .maybeSingle()
    const cats = (cfg?.content as { menuCategories?: { items: { name: string; desc?: string; duration?: string; price?: string }[] }[] } | null)?.menuCategories
    const seeds = cats?.length ? bookingSeedsFrom(cats) : bookingServices(company.industry)
    services = seeds.map((s, i) => ({
      id: `pris-${i}`, name: s.name, description: s.description,
      duration_minutes: s.duration_minutes, price_sek: s.price_sek,
    }))
  }

  // Staff is a later migration — an older database just has none, and the
  // flow then skips the person step on its own.
  let staff: { id: string; name: string; title: string | null; image: string | null }[] = []
  try {
    const { data } = await admin
      .from('staff')
      .select('id, name, title, image')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('sort_order')
    staff = data ?? []
  } catch { /* pre-migration database */ }

  return NextResponse.json({
    company:  { name: company.name, slug: company.slug },
    services: services ?? [],
    staff,
  })
}

// POST /api/book/[slug] — create a booking + upsert customer
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = createAdminClient()

  const {
    services,            // [{ id, name, duration_minutes, price_sek }] — one or more in the same visit
    staff_id,            // chosen member, or null for no preference
    booking_date,
    start_time,
    customer_name,
    customer_phone,
    customer_email,
    customer_note,
    sms_opt_in,
    source_channel,      // utm_source from the page the visitor arrived on
  } = await req.json()

  const list = Array.isArray(services) ? services.filter(s => s?.name) : []
  if (!list.length || !booking_date || !start_time || !customer_name || !customer_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: company, error: companyErr } = await admin
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single()

  if (companyErr || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  /* One visit, one row: the services combine into a single appointment whose
   * length is their sum. "Klippning + skägg" is one slot in the calendar,
   * not two bookings the salon has to piece together. */
  const totalDuration = list.reduce((s: number, x: { duration_minutes?: number }) => s + Number(x.duration_minutes ?? 0), 0)
  const totalPrice    = list.reduce((s: number, x: { price_sek?: number | null }) => s + Number(x.price_sek ?? 0), 0)
  const serviceName   = list.map((x: { name: string }) => x.name).join(' + ')
  const end_time      = addMinutes(start_time, totalDuration)

  /* Re-check the slot at write time — two visitors can be staring at the
   * same free 14:00, and the second one to press the button must be told
   * no rather than double-booking the chair. */
  const dow = new Date(booking_date + 'T12:00:00').getDay()
  const { data: avail } = await admin
    .from('booking_availability')
    .select('open_time, close_time, slot_duration_minutes, is_active')
    .eq('company_id', company.id)
    .eq('day_of_week', dow)
    .single()

  const hours = avail ?? defaultAvailability(dow)
  if (!hours.is_active) {
    return NextResponse.json({ error: 'Stängt den dagen' }, { status: 409 })
  }

  const { data: existing } = await admin
    .from('bookings')
    .select('staff_id, start_time, end_time')
    .eq('company_id', company.id)
    .eq('booking_date', booking_date)
    .neq('status', 'cancelled')

  let staff: StaffRow[] = []
  let blocked: BlockedRow[] = []
  let hasStaffTables = false
  try {
    const { data, error: staffErr } = await admin
      .from('staff')
      .select('id, name, schedule')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('sort_order')
    if (!staffErr) {
      hasStaffTables = true
      staff = (data ?? []) as StaffRow[]
      const { data: bl } = await admin
        .from('blocked_times')
        .select('staff_id, start_time, end_time')
        .eq('company_id', company.id)
        .lte('date_from', booking_date)
        .gte('date_to', booking_date)
      blocked = (bl ?? []) as BlockedRow[]
    }
  } catch { /* pre-migration database */ }

  const bookings = (existing ?? []) as BookingRow[]
  let assigned: StaffRow | null = null

  if (staff.length > 0) {
    if (staff_id) {
      const chosen = staff.find(s => s.id === staff_id)
      if (!chosen || !staffFree(chosen, timeToMins(start_time), totalDuration, dow, hours as Availability, bookings, blocked)) {
        return NextResponse.json({ error: 'Tiden är inte längre ledig' }, { status: 409 })
      }
      assigned = chosen
    } else {
      assigned = assignStaff(staff, start_time, totalDuration, dow, hours as Availability, bookings, blocked)
      if (!assigned) {
        return NextResponse.json({ error: 'Tiden är inte längre ledig' }, { status: 409 })
      }
    }
  } else {
    const startM = timeToMins(start_time)
    const taken = bookings.some(b =>
      timeToMins(b.start_time) < startM + totalDuration && timeToMins(b.end_time) > startM)
    if (taken) {
      return NextResponse.json({ error: 'Tiden är inte längre ledig' }, { status: 409 })
    }
  }

  // Upsert customer (match on company + phone)
  const { data: customer } = await admin
    .from('customers')
    .upsert(
      {
        company_id:  company.id,
        name:        customer_name,
        phone:       customer_phone,
        email:       customer_email || null,
        sms_opt_in:  sms_opt_in ?? true,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'company_id,phone', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  const reference = shortRef()
  const base = {
    company_id:               company.id,
    customer_id:              customer?.id ?? null,
    service_id:               /^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(list[0]?.id ?? '') ? list[0].id : null,
    service_name:             serviceName,
    service_duration_minutes: totalDuration,
    service_price_sek:        totalPrice || null,
    booking_date,
    start_time,
    end_time,
    customer_name,
    customer_phone,
    customer_email:           customer_email || null,
    customer_note:            customer_note  || null,
    source:                   'online',
    status:                   'pending',
  }

  /* The staff columns are the newer migration. Insert with them first; a
   * pre-migration database rejects the unknown columns and gets the row it
   * still understands. */
  let cancelToken: string | null = null
  if (hasStaffTables) {
    const { data: row, error: err } = await admin
      .from('bookings')
      .insert({ ...base, staff_id: assigned?.id ?? null, booking_ref: reference, source_channel: source_channel || null })
      .select('cancel_token')
      .single()
    if (err) return NextResponse.json({ error: err.message }, { status: 500 })
    cancelToken = row?.cancel_token ?? null
  } else {
    const { error: err } = await admin.from('bookings').insert(base)
    if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({
    ok:         true,
    reference,
    staff_name: assigned?.name ?? null,
    cancel_url: cancelToken ? `/book/${slug}/avboka/${cancelToken}` : null,
  })
}
