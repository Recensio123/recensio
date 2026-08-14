import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, canManageSalon } from '@/lib/access'

/*
 * The salon's logins.
 *
 * Only an admin gets here — creating accounts is the one action that can
 * hand away everything else, so it is gated harder than the rest and every
 * verb re-checks rather than trusting the page that called it.
 *
 * Accounts are created with a starting password the salon chooses and passes
 * on, because there is no mail going out yet. When sendouts are connected
 * this becomes an invitation link and the password field disappears.
 */

const ROLES = ['admin', 'schema', 'staff'] as const

/**
 * The lockout guards.
 *
 * Two ways a salon can shut itself out: an administrator demotes or deletes
 * their own account, or the last administrator is removed. The owner's login
 * is always an administrator and has no membership row, so the second is
 * only reachable if ownership ever moves — the check is here so it stays
 * true when it does.
 *
 * Both refusals are worth an explicit message. "Unauthorized" on your own
 * account reads as a bug, not a rule.
 */
type Guarded = { error: string; status: number } | null

async function lockoutGuard(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  memberId: string,
  actingUserId: string,
  isOwner: boolean,
  nextRole?: string,
): Promise<Guarded> {
  const { data: target } = await admin
    .from('company_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('company_id', companyId)
    .maybeSingle()
  if (!target) return { error: 'Kontot finns inte', status: 404 }

  if (target.user_id === actingUserId) {
    return {
      error: nextRole
        ? 'Du kan inte ändra din egen behörighet. Be en annan administratör göra det.'
        : 'Du kan inte ta bort ditt eget konto. Be en annan administratör göra det.',
      status: 400,
    }
  }

  // Losing the last administrator, with no owner login to fall back on
  const losingAdmin = target.role === 'admin' && nextRole !== 'admin'
  if (losingAdmin && !isOwner) {
    const { count } = await admin
      .from('company_members')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('role', 'admin')
    if ((count ?? 0) <= 1) {
      return { error: 'Salongen måste ha minst en administratör.', status: 400 }
    }
  }
  return null
}

export async function GET() {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('company_members')
      .select('id, user_id, email, name, role, staff_id, created_at')
      .eq('company_id', access!.companyId)
      .order('created_at')
    if (error) throw error
    return NextResponse.json({ members: data ?? [], owner: access!.email })
  } catch {
    // Pre-migration database — the salon simply has no extra accounts yet
    return NextResponse.json({ members: [], owner: access!.email, migrated: false })
  }
}

export async function POST(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, password, name, role, staff_id } = await req.json()

  const mail = String(email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
    return NextResponse.json({ error: 'Ogiltig e-postadress' }, { status: 400 })
  }
  if (String(password ?? '').length < 8) {
    return NextResponse.json({ error: 'Lösenordet måste vara minst 8 tecken' }, { status: 400 })
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: 'Ogiltig behörighet' }, { status: 400 })
  }
  /* A staff login without a chair can see nothing, so it is not a state the
   * salon should be able to create by forgetting a field. */
  if (role === 'staff' && !staff_id) {
    return NextResponse.json({ error: 'Välj vilken medarbetare kontot gäller' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (staff_id) {
    const { data: chair } = await admin
      .from('staff').select('id').eq('id', staff_id).eq('company_id', access!.companyId).maybeSingle()
    if (!chair) return NextResponse.json({ error: 'Medarbetaren finns inte' }, { status: 400 })
  }

  const created = await admin.auth.admin.createUser({
    email: mail,
    password: String(password),
    email_confirm: true,          // no mail is going out yet, so pre-confirm
  })
  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? 'Kunde inte skapa kontot'
    const taken = /already|registered|exists/i.test(msg)
    return NextResponse.json(
      { error: taken ? 'E-postadressen används redan' : msg },
      { status: taken ? 409 : 500 },
    )
  }

  const { data: member, error } = await admin
    .from('company_members')
    .insert({
      company_id: access!.companyId,
      user_id:    created.data.user.id,
      email:      mail,
      name:       String(name ?? '').trim() || null,
      role,
      staff_id:   role === 'staff' ? staff_id : null,
    })
    .select('id, user_id, email, name, role, staff_id, created_at')
    .single()

  if (error) {
    // Don't leave an auth user behind that belongs to no salon
    await admin.auth.admin.deleteUser(created.data.user.id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, member })
}

export async function PATCH(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, role, staff_id, name } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const fields: Record<string, unknown> = {}
  if (role !== undefined) {
    if (!ROLES.includes(role)) return NextResponse.json({ error: 'Ogiltig behörighet' }, { status: 400 })
    if (role === 'staff' && !staff_id) {
      return NextResponse.json({ error: 'Välj vilken medarbetare kontot gäller' }, { status: 400 })
    }
    fields.role = role
    fields.staff_id = role === 'staff' ? staff_id : null
  } else if (staff_id !== undefined) {
    fields.staff_id = staff_id || null
  }
  if (name !== undefined) fields.name = String(name ?? '').trim() || null

  if (!Object.keys(fields).length) {
    return NextResponse.json({ error: 'Inget att ändra' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (role !== undefined) {
    const blocked = await lockoutGuard(admin, access!.companyId, id, access!.userId, access!.isOwner, role)
    if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status })
  }

  const { error } = await admin
    .from('company_members')
    .update(fields)
    .eq('id', id)
    .eq('company_id', access!.companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  const blocked = await lockoutGuard(admin, access!.companyId, id, access!.userId, access!.isOwner)
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status })

  const { data: member } = await admin
    .from('company_members')
    .select('user_id')
    .eq('id', id)
    .eq('company_id', access!.companyId)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Kontot finns inte' }, { status: 404 })

  /* Removing the membership first: if deleting the login then fails, the
   * account is already locked out of the salon, which is the direction that
   * fails safe. */
  const { error } = await admin.from('company_members').delete().eq('id', id).eq('company_id', access!.companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await admin.auth.admin.deleteUser(member.user_id).catch(() => {})

  return NextResponse.json({ ok: true })
}
