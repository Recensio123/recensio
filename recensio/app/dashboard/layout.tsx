import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#edf2ee', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '1.75rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
