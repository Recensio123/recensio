import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * One way to read the staff table.
 *
 * Four callers need the same rows — the public slot grid, the public booking
 * write, the dashboard page and the staff API — and the per-person rule
 * columns arrive in a later migration than the table itself. Asking in one
 * place means a database mid-migration degrades once, here, instead of four
 * times in four different ways.
 */

type Admin = ReturnType<typeof createAdminClient>

export type StaffRecord = {
  id:         string
  name:       string
  title:      string | null
  image:      string | null
  schedule:   Record<string, { start: string; end: string } | null> | null
  is_active:  boolean
  sort_order: number
  /** Own booking notice in minutes. Null = the salon's rule applies. */
  lead_minutes: number | null
  /** Own approval rule. Null = the salon's rule applies. */
  auto_confirm: boolean | null
}

const BASE = 'id, name, title, image, schedule, is_active, sort_order'
const FULL = `${BASE}, lead_minutes, auto_confirm`

/**
 * Every staff row the booking system needs, or null when the table itself is
 * missing — which is how a caller tells "this salon has no staff" apart from
 * "this database predates staff".
 */
export async function fetchStaff(
  admin: Admin, companyId: string, opts: { activeOnly?: boolean } = {},
): Promise<StaffRecord[] | null> {
  const activeOnly = opts.activeOnly ?? true

  const query = (cols: string) => {
    let q = admin.from('staff').select(cols).eq('company_id', companyId)
    if (activeOnly) q = q.eq('is_active', true)
    return q.order('sort_order')
  }

  let rows: unknown[] | null = null
  const full = await query(FULL)
  if (full.error) {
    // The rule columns are the newer migration — ask for what is certainly there
    const base = await query(BASE)
    if (base.error) return null
    rows = base.data
  } else {
    rows = full.data
  }

  return (rows ?? []).map(r => {
    const row = r as Record<string, unknown>
    return {
      id:           String(row.id),
      name:         String(row.name),
      title:        (row.title ?? null) as string | null,
      image:        (row.image ?? null) as string | null,
      schedule:     (row.schedule ?? null) as StaffRecord['schedule'],
      is_active:    row.is_active !== false,
      sort_order:   Number(row.sort_order ?? 0),
      lead_minutes: (row.lead_minutes ?? null) as number | null,
      auto_confirm: (row.auto_confirm ?? null) as boolean | null,
    }
  })
}
