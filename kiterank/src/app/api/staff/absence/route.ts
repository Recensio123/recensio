import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, canEditAnyChair } from '@/lib/access'

/*
 * Vacation, sick days and other blocked time. staff_id null = whole salon.
 *
 * A stylist registers their own absence — that is the point of giving them a
 * login. Closing the whole salon is not theirs to do, so an account without
 * the run of the calendar can only ever block its own chair.
 */

export async function POST(req: NextRequest) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access.companyId

  const body = await req.json()
  const { date_from, date_to, start_time, end_time, reason } = body
  if (!date_from || !date_to) return NextResponse.json({ error: 'Datum saknas' }, { status: 400 })

  const staff_id = canEditAnyChair(access) ? body.staff_id : access.staffId
  if (!canEditAnyChair(access) && !staff_id) {
    return NextResponse.json({ error: 'Kontot är inte kopplat till en medarbetare' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('blocked_times')
    .insert({
      company_id: companyId,
      staff_id:   staff_id || null,
      date_from, date_to,
      start_time: start_time || null,
      end_time:   end_time   || null,
      reason:     reason     || null,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function DELETE(req: NextRequest) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access.companyId
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  if (!canEditAnyChair(access)) {
    const { data: row } = await admin
      .from('blocked_times').select('staff_id').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!row || !access.staffId || row.staff_id !== access.staffId) {
      return NextResponse.json({ error: 'Frånvaron är inte din' }, { status: 403 })
    }
  }

  const { error } = await admin.from('blocked_times').delete().eq('id', id).eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
