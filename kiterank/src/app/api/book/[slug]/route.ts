import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ slug: string }> }

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function shortRef(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// GET /api/book/[slug] — return company info + active services
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: company, error } = await admin
    .from('companies')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (error || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const { data: services } = await admin
    .from('booking_services')
    .select('id, name, description, duration_minutes, price_sek')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('sort_order')

  return NextResponse.json({
    company: { name: company.name, slug: company.slug },
    services: services ?? [],
  })
}

// POST /api/book/[slug] — create a booking + upsert customer
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = createAdminClient()

  const {
    service_id,
    service_name,
    service_duration_minutes,
    service_price_sek,
    booking_date,
    start_time,
    customer_name,
    customer_phone,
    customer_email,
    customer_note,
    sms_opt_in,
  } = await req.json()

  if (!service_name || !booking_date || !start_time || !customer_name || !customer_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Look up company
  const { data: company, error: companyErr } = await admin
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single()

  if (companyErr || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const end_time = addMinutes(start_time, Number(service_duration_minutes))

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

  // Insert booking
  const { error: bookingErr } = await admin
    .from('bookings')
    .insert({
      company_id:               company.id,
      customer_id:              customer?.id ?? null,
      service_id:               service_id ?? null,
      service_name,
      service_duration_minutes: Number(service_duration_minutes),
      service_price_sek:        service_price_sek ? Number(service_price_sek) : null,
      booking_date,
      start_time,
      end_time,
      customer_name,
      customer_phone,
      customer_email:           customer_email || null,
      customer_note:            customer_note  || null,
      source:                   'online',
      status:                   'pending',
    })

  if (bookingErr) {
    return NextResponse.json({ error: bookingErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, reference: shortRef() })
}
