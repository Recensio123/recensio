import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SMSDashboard } from './SMSDashboard'

export default async function SMSPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: company } = user
    ? await admin.from('companies').select('name').eq('user_id', user.id).single()
    : { data: null }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <SMSDashboard salonName={company?.name ?? 'Din salong'} />
    </div>
  )
}
