import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import PendingList from './PendingList'
import AddCustomerButton from './AddCustomerButton'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createSupabaseAdminClient()

  const { data: userData } = await admin.from('users').select('company_id, companies(name)').eq('id', user!.id).single()
  if (!userData) redirect('/setup')

  const companies = userData?.companies as unknown as { name: string } | null
  const companyName = companies?.name ?? 'ditt företag'

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
        <AddCustomerButton />
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '.85rem' }}>
          Kommande utskick
        </div>
        <PendingList />
      </div>
    </>
  )
}
