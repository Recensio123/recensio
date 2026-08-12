import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addMinutes } from '@/lib/bookingSlots'

/* The dashboard's own writes: the manual booking a salon takes over the
 * phone, and the status changes on existing rows. The public flow never
 * touches this route — it has /api/book/[slug]. */

async function companyOf(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('companies').select('id').eq('user_id', user.id).maybeSingle()
  return data?.id ?? null
}

// POST — a phone or walk-in booking, entered by the salon
export async function POST(req: NextRequest) {
  const companyId = await companyOf()
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    staff_id, service_name, duration_minutes, price_sek,
    booking_date, start_time, customer_name, customer_phone, note, source,
  } = await req.json()

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
  const companyId = await companyOf()
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  const valid = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']
  if (!id || !valid.includes(status)) {
    return NextResponse.json({ error: 'Ogiltig status' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
