import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ slug: string }> }

/* The cancellation the confirmation page links to. The token is the secret:
 * whoever holds the link made the booking, no login needed. The 24-hour rule
 * the flow promises ("Kostnadsfri avbokning upp till 24 timmar innan") is
 * enforced here — closer than that, the page tells them to call instead, so
 * the salon gets a voice and a chance to refill the slot. */

// GET — look the booking up so the page can show what is being cancelled
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()
  const { data: company } = await admin.from('companies').select('id, name').eq('slug', slug).single()
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: booking } = await admin
    .from('bookings')
    .select('service_name, booking_date, start_time, status, customer_name')
    .eq('company_id', company.id)
    .eq('cancel_token', token)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    company:     company.name,
    service:     booking.service_name,
    date:        booking.booking_date,
    time:        booking.start_time.slice(0, 5),
    status:      booking.status,
    cancellable: cancellable(booking.booking_date, booking.start_time),
  })
}

// POST — actually cancel
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()
  const { data: company } = await admin.from('companies').select('id').eq('slug', slug).single()
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: booking } = await admin
    .from('bookings')
    .select('id, booking_date, start_time, status')
    .eq('company_id', company.id)
    .eq('cancel_token', token)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (booking.status === 'cancelled') return NextResponse.json({ ok: true })

  if (!cancellable(booking.booking_date, booking.start_time)) {
    return NextResponse.json({ error: 'too_late' }, { status: 409 })
  }

  const { error } = await admin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', booking.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

function cancellable(date: string, time: string): boolean {
  const start = new Date(`${date}T${time.length === 5 ? time + ':00' : time}`)
  return start.getTime() - Date.now() > 24 * 60 * 60 * 1000
}
