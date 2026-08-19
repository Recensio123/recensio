import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendCancellationFor } from '@/lib/cancellationEmail'
import { TYSTA } from '@/lib/bookingEmail'

type Params = { params: Promise<{ slug: string }> }

/* The cancellation the confirmation page links to. The token is the secret:
 * whoever holds the link made the booking, no login needed.
 *
 * How close to the appointment self-cancel stays open is the salon's own
 * policy (booking_cancel_hours, set under Bokningar → Inställningar). The
 * default is 0 — cancel anytime — because a customer who cannot cancel
 * usually just fails to show up, and an honest cancellation at least hands
 * the slot back. Inside the window the page points to the phone instead. */

async function lookupCompany(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('companies').select('id, name').eq('slug', slug).single()
  if (!data) return null
  // The policy column is a later migration — without it, anytime applies
  let cancelHours = 0
  try {
    const { data: policy, error } = await admin
      .from('companies').select('booking_cancel_hours').eq('id', data.id).single()
    if (!error) cancelHours = policy?.booking_cancel_hours ?? 0
  } catch { /* pre-migration database */ }
  return { ...data, cancelHours }
}

// GET — look the booking up so the page can show what is being cancelled
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()
  const company = await lookupCompany(slug)
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: booking } = await admin
    .from('bookings')
    .select('service_name, booking_date, start_time, status, customer_name')
    .eq('company_id', company.id)
    .eq('cancel_token', token)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    company:      company.name,
    service:      booking.service_name,
    date:         booking.booking_date,
    time:         booking.start_time.slice(0, 5),
    status:       booking.status,
    cancellable:  cancellable(booking.booking_date, booking.start_time, company.cancelHours),
    cancel_hours: company.cancelHours,
  })
}

// POST — actually cancel
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()
  const company = await lookupCompany(slug)
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: booking } = await admin
    .from('bookings')
    .select('id, booking_date, start_time, status')
    .eq('company_id', company.id)
    .eq('cancel_token', token)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (booking.status === 'cancelled') return NextResponse.json({ ok: true })

  if (!cancellable(booking.booking_date, booking.start_time, company.cancelHours)) {
    return NextResponse.json({ error: 'too_late', cancel_hours: company.cancelHours }, { status: 409 })
  }

  const { error } = await admin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', booking.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  /* Kvittensen till kunden, och aviseringen till salongen om att timmen är
     ledig igen — den senare kan de agera på samma dag. Ett mail som inte går
     fram får inte fälla avbokningen: tiden är redan släppt, och att svara med
     ett fel skulle få kunden att avboka igen. */
  const mail = await sendCancellationFor(admin, booking.id as string, { by: 'customer' })
  if (!mail.sent && mail.reason && !TYSTA.includes(mail.reason)) {
    console.error(`[avbokning ${booking.id}] beskedet gick inte fram: ${mail.reason}`)
  }

  return NextResponse.json({ ok: true })
}

/** Open until the salon's window closes; with 0 hours, until the slot starts. */
function cancellable(date: string, time: string, hours: number): boolean {
  const start = new Date(`${date}T${time.length === 5 ? time + ':00' : time}`)
  return start.getTime() - Date.now() > hours * 60 * 60 * 1000
}
