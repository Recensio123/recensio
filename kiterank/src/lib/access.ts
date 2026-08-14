import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/*
 * Who is asking, and what may they touch.
 *
 * One place, because the answer has to be identical everywhere: the page
 * that renders the calendar and the route that writes to it must agree about
 * whose bookings a given login owns. A resolver per file is how a stylist
 * ends up able to cancel someone else's Friday.
 *
 * The owner of the company is always an admin, whether or not they also have
 * a membership row — losing your own salon by mis-editing a table is not a
 * failure mode worth having.
 */

export type Role = 'admin' | 'schema' | 'staff'

export type Access = {
  companyId: string
  role:      Role
  /** The chair a staff login speaks for. Null for admin and schema logins. */
  staffId:   string | null
  /** True for the login the company was created with. */
  isOwner:   boolean
  userId:    string
  email:     string | null
}

export async function currentAccess(): Promise<Access | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: owned } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (owned) {
    return {
      companyId: owned.id, role: 'admin', staffId: null, isOwner: true,
      userId: user.id, email: user.email ?? null,
    }
  }

  /* Not an owner — an account the salon created. The table is a later
   * migration, so a database without it simply has no such accounts. */
  try {
    const { data: member, error } = await admin
      .from('company_members')
      .select('company_id, role, staff_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (error || !member) return null
    return {
      companyId: member.company_id,
      role:      (member.role ?? 'staff') as Role,
      staffId:   member.staff_id ?? null,
      isOwner:   false,
      userId:    user.id,
      email:     user.email ?? null,
    }
  } catch {
    return null
  }
}

/** Settings, staff and accounts are the salon's own. */
export function canManageSalon(a: Access | null): boolean {
  return a?.role === 'admin'
}

/**
 * May this login change any chair's day?
 *
 * Seeing and editing came apart the moment the salon got a say in what a
 * stylist may look at: a staff account can be given the whole week to read
 * and still only its own to touch. Every write path asks this one; only the
 * read paths ask `seesWholeCalendar`.
 */
export function canEditAnyChair(a: Access | null): boolean {
  return a?.role === 'admin' || a?.role === 'schema'
}

/**
 * May this login read a booking in full — the customer, the treatment, the
 * price?
 *
 * A stylist sees the salon's grid, but a colleague's hour arrives as
 * "Upptaget" and nothing more: enough to answer "can I send this customer to
 * Sara on Thursday?", not enough to hand her client list to everyone with a
 * login. The masking happens where the rows are fetched, so the names never
 * reach the browser at all.
 */
export function seesWholeCalendar(a: Access | null): boolean {
  return canEditAnyChair(a)
}

/** Takings are the owner's business. */
export function seesRevenue(a: Access | null): boolean {
  return a?.role === 'admin'
}

/**
 * May this login act on a booking sitting on `staffId`?
 *
 * A staff account whose chair has not been linked yet touches nothing rather
 * than everything — the safe direction for a half-finished setup.
 */
export function canEditBooking(a: Access | null, bookingStaffId: string | null): boolean {
  if (!a) return false
  if (canEditAnyChair(a)) return true
  return Boolean(a.staffId) && bookingStaffId === a.staffId
}
