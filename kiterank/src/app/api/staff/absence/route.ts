import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* Vacation, sick days and other blocked time. staff_id null = whole salon. */

async function companyOf(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('companies').select('id').eq('user_id', user.id).maybeSingle()
  return data?.id ?? null
}

export async function POST(req: NextRequest) {
  const companyId = await companyOf()
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { staff_id, date_from, date_to, start_time, end_time, reason } = await req.json()
  if (!date_from || !date_to) return NextResponse.json({ error: 'Datum saknas' }, { status: 400 })

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
  const companyId = await companyOf()
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('blocked_times').delete().eq('id', id).eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
