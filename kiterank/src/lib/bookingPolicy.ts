import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * The rules a salon sets once: how late a customer may cancel, how close to
 * the hour they may book, whether a free slot confirms itself, what the
 * confirmation says, and whether a finished appointment closes itself.
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
  /**
   * Timmar efter sluttiden innan besöket stängs automatiskt. Noll = direkt.
   *
   * Avslutet sker alltid av sig självt — ingen salong vill kryssa av gårdagens
   * besök, och den som glömde fick tidigare en lista som växte tills
   * omdömesfrågorna slutade gå ut. Det enda som är kvar att bestämma är
   * marginalen för besöket som drar över.
   */
  auto_complete_hours: number
  /**
   * Bokningar gjorda närmare tiden än så får ingen påminnelse. Noll = alltid.
   *
   * Den som bokar klockan nio för klockan två har redan fått en bekräftelse.
   * En påminnelse några timmar senare säger ingenting nytt, och på SMS kostar
   * den både salongen en krona och kunden tålamod.
   */
  reminder_skip_hours: number
  /**
   * Städtid mellan bokningar, i minuter. Noll = avstängd.
   *
   * Spärras i kalendern efter varje besök men syns aldrig för kunden och ingår
   * inte i priset. Utan den bokas nästa kund in i städningen och salongen ligger
   * efter från förmiddagen.
   */
  buffer_minutes:    number
}

export const DEFAULT_POLICY: BookingPolicy = {
  cancel_hours:      0,
  lead_minutes:      60,
  auto_confirm:      true,
  confirmation_text: null,
  auto_complete_hours: 1,
  reminder_skip_hours: 4,
  buffer_minutes:    0,
}

const REGLER = 'booking_cancel_hours, booking_confirmation_text, booking_lead_minutes, booking_auto_confirm, booking_buffer_minutes, booking_auto_complete_hours, booking_reminder_skip_hours'
const BUFF  = 'booking_cancel_hours, booking_confirmation_text, booking_lead_minutes, booking_auto_confirm, booking_auto_complete, booking_buffer_minutes'
const NYAST = 'booking_cancel_hours, booking_confirmation_text, booking_lead_minutes, booking_auto_confirm, booking_auto_complete'
const FULL  = 'booking_cancel_hours, booking_confirmation_text, booking_lead_minutes, booking_auto_confirm'
const BASE  = 'booking_cancel_hours, booking_confirmation_text'

export async function fetchPolicy(admin: Admin, companyId: string): Promise<BookingPolicy> {
  const read = (cols: string) =>
    admin.from('companies').select(cols).eq('id', companyId).single()

  /* Each migration added a column, so the read steps back one generation at
   * a time rather than failing outright. */
  let row: Record<string, unknown> | null = null
  for (const cols of [REGLER, BUFF, NYAST, FULL, BASE]) {
    const res = await read(cols)
    if (!res.error) { row = res.data as unknown as Record<string, unknown>; break }
  }
  if (!row) return { ...DEFAULT_POLICY }

  return {
    cancel_hours:      Number(row.booking_cancel_hours ?? DEFAULT_POLICY.cancel_hours),
    lead_minutes:      Number(row.booking_lead_minutes ?? DEFAULT_POLICY.lead_minutes),
    auto_confirm:      Boolean(row.booking_auto_confirm ?? DEFAULT_POLICY.auto_confirm),
    confirmation_text: (row.booking_confirmation_text ?? null) as string | null,
    auto_complete_hours: Number(row.booking_auto_complete_hours ?? DEFAULT_POLICY.auto_complete_hours),
    reminder_skip_hours: Number(row.booking_reminder_skip_hours ?? DEFAULT_POLICY.reminder_skip_hours),
    buffer_minutes:    Number(row.booking_buffer_minutes ?? DEFAULT_POLICY.buffer_minutes),
  }
}
