import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, seesWholeCalendar, canEditAnyChair } from '@/lib/access'
import { addMinutes } from '@/lib/bookingSlots'

/* The dashboard's own writes: the manual booking a salon takes over the
 * phone, and the status changes on existing rows. The public flow never
 * touches this route — it has /api/book/[slug].
 *
 * Every verb re-reads who is asking. A stylist's login may only touch the
 * bookings sitting on their own chair, and that has to be enforced here
 * rather than by the page that renders the buttons. */

// GET — the summary the home dashboard shows next to the marketing numbers
export async function GET() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access.companyId

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 6)
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)

  let q = admin
    .from('bookings')
    .select('booking_date, service_price_sek, status, source_channel, staff_id')
    .eq('company_id', companyId)
    .gte('booking_date', monthAgo.toISOString().split('T')[0])
    .lte('booking_date', weekEnd.toISOString().split('T')[0])
    .neq('status', 'cancelled')

  // A stylist's own numbers, not the salon's
  if (!seesWholeCalendar(access)) q = q.eq('staff_id', access.staffId ?? '')

  const { data: rows } = await q

  const all = rows ?? []
  const week = all.filter(b => b.booking_date >= today)

  /* Kronor per channel: the point of the whole integration. Every online
   * booking carries the utm_source it arrived from, so marketing spend can
   * be answered in booked kronor rather than clicks. Last 30 days + ahead. */
  const channels: Record<string, number> = {}
  for (const b of all) {
    if (!b.source_channel) continue
    channels[b.source_channel] = (channels[b.source_channel] ?? 0) + (b.service_price_sek ?? 0)
  }

  return NextResponse.json({
    real:      all.length > 0,
    today:     week.filter(b => b.booking_date === today).length,
    week:      week.length,
    weekValue: week.reduce((s, b) => s + (b.service_price_sek ?? 0), 0),
    pending:   all.filter(b => b.status === 'pending' && b.booking_date >= today).length,
    channels:  Object.entries(channels).map(([channel, value]) => ({ channel, value }))
      .sort((a, b) => b.value - a.value).slice(0, 4),
  })
}

// POST — a phone or walk-in booking, entered by the salon
export async function POST(req: NextRequest) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access.companyId

  const body = await req.json()
  const {
    service_name, duration_minutes, price_sek,
    booking_date, start_time, customer_name, customer_phone, note, source,
  } = body

  /* A stylist books into their own chair, whatever the form sent. */
  const staff_id = canEditAnyChair(access) ? body.staff_id : access.staffId
  if (!canEditAnyChair(access) && !staff_id) {
    return NextResponse.json({ error: 'Kontot är inte kopplat till en medarbetare' }, { status: 403 })
  }

  if (!service_name || !booking_date || !start_time || !customer_name) {
    return NextResponse.json({ error: 'Fält saknas' }, { status: 400 })
  }

  const admin = createAdminClient()
  const base = {
    company_id:               companyId,
    service_name,
    service_duration_minutes: Number(duration_minutes ?? 30),
    service_price_sek:        price_sek ? Number(price_sek) : null,
    booking_date,
    start_time,
    end_time:                 addMinutes(start_time, Number(duration_minutes ?? 30)),
    customer_name,
    customer_phone:           customer_phone || null,
    customer_note:            note || null,
    /* Booked by the salon herself — confirmed on arrival, no pending step */
    status:                   'confirmed',
    source:                   source === 'walk_in' ? 'walk_in' : 'phone',
  }

  // staff_id is the newer migration; retry without it on older databases
  let inserted = await admin.from('bookings').insert({ ...base, staff_id: staff_id || null }).select('id').single()
  if (inserted.error) {
    inserted = await admin.from('bookings').insert(base).select('id').single()
  }
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: inserted.data.id })
}

// PATCH — status changes from the calendar and the list
export async function PATCH(req: NextRequest) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access.companyId

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  /* Whose booking is this? A stylist may work their own day and no one
   * else's — even when the salon lets them read everyone's — so the row is
   * read before it is written. */
  if (!canEditAnyChair(access)) {
    const { data: row } = await admin
      .from('bookings').select('staff_id').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!row || !access.staffId || row.staff_id !== access.staffId) {
      return NextResponse.json({ error: 'Bokningen ligger inte i din kalender' }, { status: 403 })
    }
    /* Handing a booking to another chair is the salon's call, not a
     * stylist's — it changes someone else's day. */
    if ('staff_id' in body) {
      return NextResponse.json({ error: 'Bara salongen kan flytta en bokning till en annan medarbetare' }, { status: 403 })
    }
  }

  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ('status' in body) {
    const valid = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']
    if (!valid.includes(body.status)) {
      return NextResponse.json({ error: 'Ogiltig status' }, { status: 400 })
    }
    fields.status = body.status
  }

  /* Moving a booking to another chair. The salon is the authority on who
   * stands where, so this is not slot-checked — if it double-books someone
   * that is a decision the salon can see in the calendar and undo. */
  if ('staff_id' in body) {
    fields.staff_id = body.staff_id || null
  }

  if (Object.keys(fields).length === 1) {
    return NextResponse.json({ error: 'Inget att ändra' }, { status: 400 })
  }

  const { error } = await admin
    .from('bookings')
    .update(fields)
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
