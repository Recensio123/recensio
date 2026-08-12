import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* The salon's staff, managed from the bookings dashboard. Auth first: every
 * verb resolves the caller to their company and touches only its rows. */

async function companyOf(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('companies').select('id').eq('user_id', user.id).maybeSingle()
  return data?.id ?? null
}

export async function GET() {
  const companyId = await companyOf()
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('staff')
      .select('id, name, title, image, schedule, is_active, sort_order')
      .eq('company_id', companyId)
      .order('sort_order')
    if (error) throw error
    const { data: absences } = await admin
      .from('blocked_times')
      .select('id, staff_id, date_from, date_to, start_time, end_time, reason')
      .eq('company_id', companyId)
      .gte('date_to', new Date().toISOString().slice(0, 10))
      .order('date_from')
    return NextResponse.json({ staff: data ?? [], absences: absences ?? [] })
  } catch {
    // Pre-migration database: the dashboard falls back to its example data
    return NextResponse.json({ staff: [], absences: [], migrated: false })
  }
}

export async function POST(req: NextRequest) {
  const companyId = await companyOf()
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, title, schedule, sort_order } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Namn saknas' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('staff')
    .insert({ company_id: companyId, name: name.trim(), title: title || null, schedule: schedule ?? null, sort_order: sort_order ?? 0 })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: NextRequest) {
  const companyId = await companyOf()
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const allowed: Record<string, unknown> = {}
  for (const k of ['name', 'title', 'image', 'schedule', 'is_active', 'sort_order'] as const) {
    if (k in fields) allowed[k] = fields[k]
  }
  const admin = createAdminClient()
  const { error } = await admin.from('staff').update(allowed).eq('id', id).eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const companyId = await companyOf()
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  /* Deactivate rather than delete: her past bookings keep their name, and
   * the calendar's history stays true. */
  const admin = createAdminClient()
  const { error } = await admin.from('staff').update({ is_active: false }).eq('id', id).eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
