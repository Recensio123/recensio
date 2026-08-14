'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { type StaffMember } from './data'

/*
 * The salon's logins.
 *
 * Three levels, and the difference between them is worth spelling out on
 * screen rather than in a manual: a salon owner deciding who gets a login is
 * deciding who can see the takings and who can only see Tuesday.
 *
 * There is no mail going out yet, so the account is created with a starting
 * password the owner hands over in person. That is stated plainly instead of
 * being dressed up as an invitation.
 */

type Member = {
  id: string; user_id: string; email: string; name: string | null
  role: 'admin' | 'schema' | 'staff'
  staff_id: string | null
  created_at: string
}

const T = {
  sv: {
    title: 'Konton',
    intro: 'Vilka som kan logga in på salongen och hur mycket de ser. Du som skapade salongen är alltid administratör.',
    owner: 'Du (skapade salongen)',
    add: '+ Nytt konto', name: 'Namn', email: 'E-post', password: 'Lösenord', save: 'Skapa konto', cancel: 'Avbryt',
    role: 'Behörighet', member: 'Medarbetare', pickStaff: 'Välj medarbetare',
    remove: 'Ta bort', removeTip: 'Kontot kan inte längre logga in. Bokningarna påverkas inte.',
    roles: {
      admin:     { name: 'Administratör', desc: 'Hela plattformen — kalender, inställningar, marknadsföring och konton.' },
      schema:    { name: 'Schema',        desc: 'Kan redigera hela salongens schema — alla medarbetares bokningar. Passar en receptionist, eller en anställd som sköter boken. Ser inte inställningar eller marknadsföring.' },
      staff:     { name: 'Medarbetare',   desc: 'Redigerar bara sitt eget schema och sina egna bokningar. Om de dessutom ser resten av salongen väljer du under Inställningar.' },
    },
    passwordHint: 'Minst 8 tecken. Ge lösenordet till personen — inget mejl skickas ut än.',
    empty: 'Inga fler konton än. Bara du kan logga in.',
    created: (e: string) => `Kontot ${e} är skapat. Personen loggar in med sin e-post och lösenordet du valde.`,
    needStaff: 'En medarbetare behöver kopplas till en stol för att se något alls.',
    notMigrated: 'Kontofunktionen behöver en databasuppdatering innan den kan användas.',
  },
  en: {
    title: 'Accounts',
    intro: 'Who can sign in to the salon and how much they see. You created the salon, so you are always an administrator.',
    owner: 'You (created the salon)',
    add: '+ New account', name: 'Name', email: 'Email', password: 'Password', save: 'Create account', cancel: 'Cancel',
    role: 'Access', member: 'Staff member', pickStaff: 'Choose a staff member',
    remove: 'Remove', removeTip: 'The account can no longer sign in. Bookings are untouched.',
    roles: {
      admin:     { name: 'Administrator', desc: 'The whole platform — calendar, settings, marketing and accounts.' },
      schema:    { name: 'Schedule',      desc: 'Can edit the whole schedule — every chair\'s bookings. Suits a receptionist, or a stylist who runs the book. No settings, no marketing.' },
      staff:     { name: 'Staff',         desc: 'Edits only their own schedule and their own bookings. Whether they also see the rest of the salon is set under Settings.' },
    },
    passwordHint: 'At least 8 characters. Hand the password over in person — no mail goes out yet.',
    empty: 'No other accounts yet. Only you can sign in.',
    created: (e: string) => `The account ${e} is created. They sign in with their email and the password you chose.`,
    needStaff: 'A staff account needs a chair before it can see anything.',
    notMigrated: 'Accounts need a database update before they can be used.',
  },
}

const ROLE_ORDER = ['admin', 'schema', 'staff'] as const

const inputCls = 'bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-mustard/60 w-full'

export function KontonTab({ staff, ownerEmail }: { staff: StaffMember[]; ownerEmail: string | null }) {
  const { lang } = useLang()
  const L = T[lang]

  const [members, setMembers] = useState<Member[]>([])
  const [migrated, setMigrated] = useState(true)
  const [adding, setAdding]     = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState('')

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState<Member['role']>('staff')
  const [staffId, setStaffId]   = useState('')

  useEffect(() => {
    fetch('/api/team')
      .then(r => r.json())
      .then(d => { setMembers(d.members ?? []); if (d.migrated === false) setMigrated(false) })
      .catch(() => {})
  }, [])

  const bookable = staff.filter(s => s.is_active)

  function reset() {
    setName(''); setEmail(''); setPassword(''); setRole('staff'); setStaffId(''); setAdding(false); setError('')
  }

  async function create() {
    setBusy(true); setError(''); setDone('')
    const res = await fetch('/api/team', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, staff_id: role === 'staff' ? staffId || null : null }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data?.error ?? 'Kunde inte skapa kontot'); return }
    setMembers(prev => [...prev, data.member])
    setDone(L.created(email))
    reset()
  }

  async function changeRole(m: Member, next: Member['role']) {
    const staff_id = next === 'staff' ? (m.staff_id ?? bookable[0]?.id ?? null) : null
    if (next === 'staff' && !staff_id) { setError(L.needStaff); return }
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, role: next, staff_id } : x))
    await fetch('/api/team', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, role: next, staff_id }),
    })
  }

  async function linkStaff(m: Member, next: string) {
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, staff_id: next } : x))
    await fetch('/api/team', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, staff_id: next }),
    })
  }

  async function remove(m: Member) {
    setMembers(prev => prev.filter(x => x.id !== m.id))
    await fetch('/api/team', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id }),
    })
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-white font-semibold text-lg mb-1">{L.title}</h2>
      <p className="text-slate-400 text-sm mb-5">{L.intro}</p>

      {!migrated && (
        <p className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 text-sm">
          {L.notMigrated}
        </p>
      )}

      {/* What each level means — the decision needs the consequences beside it */}
      <div className="grid sm:grid-cols-3 gap-2 mb-6">
        {ROLE_ORDER.map(r => (
          <div key={r} className="bg-navy-900 border border-navy-700 rounded-xl p-3">
            <div className="text-white text-sm font-semibold">{L.roles[r].name}</div>
            <div className="text-slate-400 text-xs mt-1 leading-relaxed">{L.roles[r].desc}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {/* The owner, who cannot be demoted out of their own salon */}
        <div className="bg-navy-900 border border-navy-700 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate">{ownerEmail ?? '—'}</div>
            <div className="text-slate-500 text-xs">{L.owner}</div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-mustard/15 border border-mustard/40 text-mustard text-xs font-semibold">
            {L.roles.admin.name}
          </span>
        </div>

        {members.map(m => (
          <div key={m.id} className="bg-navy-900 border border-navy-700 rounded-xl p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <div className="text-white text-sm font-semibold truncate">{m.name || m.email}</div>
                {m.name && <div className="text-slate-500 text-xs truncate">{m.email}</div>}
              </div>

              <select
                value={m.role}
                onChange={e => changeRole(m, e.target.value as Member['role'])}
                className="bg-navy-800 border border-navy-600 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-mustard/60"
              >
                {ROLE_ORDER.map(r => <option key={r} value={r}>{L.roles[r].name}</option>)}
              </select>

              {m.role === 'staff' && (
                <select
                  value={m.staff_id ?? ''}
                  onChange={e => linkStaff(m, e.target.value)}
                  className="bg-navy-800 border border-navy-600 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-mustard/60"
                >
                  <option value="">{L.pickStaff}</option>
                  {bookable.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}

              <button onClick={() => remove(m)} title={L.removeTip}
                className="px-3 py-1.5 bg-red-500/10 text-red-400/80 hover:text-red-400 rounded-lg text-xs">
                {L.remove}
              </button>
            </div>

            {m.role === 'staff' && !m.staff_id && (
              <p className="text-amber-300/80 text-xs mt-2">{L.needStaff}</p>
            )}
          </div>
        ))}

        {members.length === 0 && migrated && (
          <p className="text-slate-500 text-sm px-1">{L.empty}</p>
        )}
      </div>

      {done && <p className="text-green-400 text-xs mt-4">{done}</p>}

      {/* New account */}
      {adding ? (
        <div className="mt-4 bg-navy-900 border border-navy-700 rounded-xl p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-slate-500 mb-1">{L.name}</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} autoFocus />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-slate-500 mb-1">{L.email} *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-slate-500 mb-1">{L.password} *</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
              <p className="text-slate-500 text-xs mt-1">{L.passwordHint}</p>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-slate-500 mb-1">{L.role}</label>
              <select value={role} onChange={e => setRole(e.target.value as Member['role'])} className={inputCls}>
                {ROLE_ORDER.map(r => <option key={r} value={r}>{L.roles[r].name}</option>)}
              </select>
            </div>
            {role === 'staff' && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-slate-500 mb-1">{L.member} *</label>
                <select value={staffId} onChange={e => setStaffId(e.target.value)} className={inputCls}>
                  <option value="">{L.pickStaff}</option>
                  {bookable.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button onClick={create} disabled={busy}
              className="px-4 py-2 bg-mustard text-navy-950 rounded-lg text-sm font-semibold disabled:opacity-50">
              {L.save}
            </button>
            <button onClick={reset} className="px-4 py-2 bg-navy-800 text-slate-400 rounded-lg text-sm">{L.cancel}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setDone('') }}
          className="mt-4 px-4 py-2 bg-navy-900 border border-navy-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium">
          {L.add}
        </button>
      )}
    </div>
  )
}
