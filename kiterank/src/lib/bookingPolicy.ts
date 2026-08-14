import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * The four rules a salon sets once: how late a customer may cancel, how close
 * to the hour they may book, whether a free slot confirms itself, and what
 * the confirmation says.
 *
 * They arrived in separate migrations, so reading them is a question of
 * degrading gracefully — a database missing the newest column answers with
 * the defaults rather than failing the booking page. The defaults here must
 * stay identical to the ones in the migrations, or a salon would see one
 * rule in the dashboard and its customers would meet another.
 */

type Admin = ReturnType<typeof createAdminClient>

export type BookingPolicy = {
  cancel_hours:      number
  lead_minutes:      number
  auto_confirm:      boolean
  confirmation_text: string | null
}

export const DEFAULT_POLICY: BookingPolicy = {
  cancel_hours:      0,
  lead_minutes:      60,
  auto_confirm:      true,
  confirmation_text: null,
}

const FULL = 'booking_cancel_hours, booking_confirmation_text, booking_lead_minutes, booking_auto_confirm'
const BASE = 'booking_cancel_hours, booking_confirmation_text'

export async function fetchPolicy(admin: Admin, companyId: string): Promise<BookingPolicy> {
  const read = (cols: string) =>
    admin.from('companies').select(cols).eq('id', companyId).single()

  /* Each migration added a column, so the read steps back one generation at
   * a time rather than failing outright. */
  let row: Record<string, unknown> | null = null
  for (const cols of [FULL, BASE]) {
    const res = await read(cols)
    if (!res.error) { row = res.data as unknown as Record<string, unknown>; break }
  }
  if (!row) return { ...DEFAULT_POLICY }

  return {
    cancel_hours:      Number(row.booking_cancel_hours ?? DEFAULT_POLICY.cancel_hours),
    lead_minutes:      Number(row.booking_lead_minutes ?? DEFAULT_POLICY.lead_minutes),
    auto_confirm:      Boolean(row.booking_auto_confirm ?? DEFAULT_POLICY.auto_confirm),
    confirmation_text: (row.booking_confirmation_text ?? null) as string | null,
  }
}
