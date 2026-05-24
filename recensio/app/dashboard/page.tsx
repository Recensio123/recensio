import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'

function fmtTime(d: string) {
  const diff = new Date(d).getTime() - Date.now()
  const m = Math.round(diff / 60000)
  if (m < 60) return `Om ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `Om ${h} tim`
  return `Om ${Math.round(h / 24)} dagar`
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createSupabaseAdminClient()

  const { data: userData } = await admin.from('users').select('company_id, companies(name)').eq('id', user!.id).single()
  const companies = userData?.companies as unknown as { name: string } | null
  const companyName = companies?.name ?? 'ditt företag'

  const { data: pending } = await admin
    .from('customers')
    .select('*')
    .eq('company_id', userData!.company_id)
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true })

  const now = new Date()
  const dateStr = now.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.4rem', color: '#0e1410' }}>
            God dag, <span style={{ color: '#2e6649' }}>{companyName}</span> 👋
          </div>
          <div style={{ fontSize: 12, color: '#9c9285', marginTop: 2 }}>{dateStr}</div>
        </div>
        <a href="/dashboard/historik" style={{ background: '#1a3d2b', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
          + Lägg till kund
        </a>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Kommande utskick
          <a href="/dashboard/historik" style={{ fontSize: 11, color: '#4d8c68', fontWeight: 400, textDecoration: 'none' }}>+ Lägg till kund</a>
        </div>

        {!pending?.length && (
          <p style={{ fontSize: 12, color: '#9c9285', padding: '.75rem 0' }}>Inga schemalagda utskick just nu.</p>
        )}

        {pending?.map(c => (
          <div key={c.id} style={{ border: '1px solid #e5dfd4', borderRadius: 10, padding: '.65rem .85rem', marginBottom: '.5rem', background: '#f7f3ec' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.5rem' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#deeae3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#2e6649' }}>
                {c.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0e1410', flex: 1 }}>{c.name}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#c47f2a', whiteSpace: 'nowrap' }}>
                {c.scheduled_for ? fmtTime(c.scheduled_for) : '–'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#9c9285' }}>{c.phone} · {c.platform}</div>
          </div>
        ))}
      </div>
    </>
  )
}
