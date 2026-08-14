import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, canManageSalon } from '@/lib/access'
import { fetchStaff } from '@/lib/staffQuery'

/*
 * The salon's staff, managed from the bookings dashboard.
 *
 * Hiring, removing and renaming are the salon's own acts. A stylist's login
 * reaches exactly one row — their own — and only the parts that describe
 * when they work: the schedule and the absence. Everyone may read the list,
 * because a calendar without names is unusable.
 */

export async function GET() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access.companyId
  const admin = createAdminClient()
  try {
    const data = await fetchStaff(admin, companyId)
    if (!data) throw new Error('no staff table')
    const { data: absences } = await admin
      .from('blocked_times')
      .select('id, staff_id, date_from, date_to, start_time, end_time, reason')
      .eq('company_id', companyId)
      .gte('date_to', new Date().toISOString().slice(0, 10))
      .order('date_from')
    return NextResponse.json({ staff: data, absences: absences ?? [] })
  } catch {
    // Pre-migration database: the dashboard falls back to its example data
    return NextResponse.json({ staff: [], absences: [], migrated: false })
  }
}

export async function POST(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access!.companyId
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
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access.companyId
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  /* A stylist edits their own working hours and nothing else. Their name,
   * their title and whether they are bookable at all belong to the salon. */
  const mine = access.staffId && id === access.staffId
  if (!canManageSalon(access) && !(access.role === 'staff' && mine)) {
    return NextResponse.json({ error: 'Du kan bara ändra ditt eget schema' }, { status: 403 })
  }
  const editable = canManageSalon(access)
    ? ['name', 'title', 'image', 'schedule', 'is_active', 'sort_order'] as const
    : ['schedule'] as const

  const allowed: Record<string, unknown> = {}
  for (const k of editable) {
    if (k in fields) allowed[k] = fields[k]
  }
  /* The two rules a chair may keep for itself. Null is a real value here —
   * it is how a member hands the decision back to the salon. Both are the
   * salon's policy, so a stylist cannot loosen their own notice period. */
  if (canManageSalon(access) && 'lead_minutes' in fields) {
    const raw = fields.lead_minutes
    if (raw === null) {
      allowed.lead_minutes = null
    } else {
      const mins = Number(raw)
      if (!Number.isFinite(mins) || mins < 0 || mins > 10080) {
        return NextResponse.json({ error: 'Ogiltigt värde' }, { status: 400 })
      }
      allowed.lead_minutes = Math.round(mins)
    }
  }
  if (canManageSalon(access) && 'auto_confirm' in fields) {
    allowed.auto_confirm = fields.auto_confirm === null ? null : Boolean(fields.auto_confirm)
  }
  if (!Object.keys(allowed).length) {
    return NextResponse.json({ error: 'Inget att ändra' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { error } = await admin.from('staff').update(allowed).eq('id', id).eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access!.companyId
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  /* Deactivate rather than delete: her past bookings keep their name, and
   * the calendar's history stays true. */
  const admin = createAdminClient()
  const { error } = await admin.from('staff').update({ is_active: false }).eq('id', id).eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
