import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isClosed, avtalAvslutat } from '@/lib/accountStatus'

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
    /*
     * Avslutat avtal ger ingen behörighet alls.
     *
     * Grinden sitter här och inte i varje sida, för det här är frågan alla
     * ställer: både panelen och varje skrivande route går genom currentAccess.
     * Svaret "ingen" är den säkra riktningen — en ny route som glömmer att
     * fråga om avtalet är ändå skyddad, eftersom den inte får någon behörighet
     * att arbeta med.
     *
     * Inloggningssidan kan inte skilja "ingen session" från "avslutat avtal",
     * och skulle skicka dem runt i en slinga. Därför finns accountClosure()
     * nedan, som panelen använder för att kunna säga vad som hänt i stället.
     */
    if (await isClosed(admin, owned.id)) return null
    return {
      companyId: owned.id, role: 'admin', staffId: null, isOwner: true,
      userId: user.id, email: user.email ?? null,
    }
  }

  /* Not an owner — an account the salon created. The table is a later
   * migration, so a database without it simply has no such accounts. */
  try {
    /*
     * Äldsta medlemskapet, uttryckligen.
     *
     * En rad utan sorteringsordning är en rad Postgres får välja fritt, och
     * valet behöver inte bli detsamma två gånger. Skulle någon någon gång ha
     * konton hos två salonger — inbjudningsflödet hindrar det idag, men
     * databasen gör det inte — betydde det att samma person kunde hamna i den
     * ena salongen ena gången och i den andra nästa. Ingen läckt data, men
     * ingen förklarlig vy heller.
     */
    const { data: member, error } = await admin
      .from('company_members')
      .select('company_id, role, staff_id')
      .eq('user_id', user.id)
      .order('created_at')
      .limit(1)
      .maybeSingle()
    if (error || !member) return null
    /* Salongens egna konton följer salongens avtal — en stylist ska inte kunna
       arbeta vidare i en panel vars ägare sagt upp sig. */
    if (await isClosed(admin, member.company_id)) return null
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

/**
 * Sessionen finns, men avtalet är avslutat.
 *
 * `currentAccess` svarar "ingen" för ett avslutat avtal, vilket är rätt för
 * varje route som skriver — men fel som besked till en människa som just
 * skrivit sitt lösenord. Den här svarar på "varför kom jag inte in", så panelen
 * kan säga det rakt ut i stället för att skicka dem tillbaka till en tom
 * inloggningsruta de kommer att fylla i igen.
 *
 * Anropas bara när behörigheten redan uteblivit, så den kostar ingenting i
 * normal drift.
 */
export async function accountClosure(): Promise<{ name: string | null; closedAt: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  /* Både ägarens konto och salongens egna konton ska få samma besked. */
  const { data: owned } = await admin
    .from('companies')
    .select('id, name, closed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let rad = owned as { id: string; name: string | null; closed_at: string | null } | null
  if (!rad) {
    try {
      const { data: member } = await admin
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (member?.company_id) {
        const { data } = await admin
          .from('companies')
          .select('id, name, closed_at')
          .eq('id', member.company_id)
          .maybeSingle()
        rad = data as typeof rad
      }
    } catch { /* company_members inte migrerad */ }
  }

  if (!rad?.closed_at || !avtalAvslutat(rad.closed_at)) return null
  return { name: rad.name, closedAt: rad.closed_at }
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
