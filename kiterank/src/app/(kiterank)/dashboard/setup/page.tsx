import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SetupFlow } from './SetupFlow'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  // The salon name and city prefill the Google lookup, so the customer does
  // not have to type anything to find out whether a profile already exists.
  const { data: company } = user
    ? await admin.from('companies').select('id, name, city').eq('user_id', user.id).single()
    : { data: null }

  // Whether measurement already exists is something we can see the moment the
  // Google account is connected — far more reliable than asking a salon owner
  // whether Analytics is installed on a site their agency built.
  const { data: conn } = company
    ? await admin.from('google_connections').select('refresh_token, ga4_property_id, sc_site_url').eq('company_id', company.id).single()
    : { data: null }

  return (
    <SetupFlow
      salonName={company?.name ?? ''}
      city={company?.city ?? ''}
      isConnected={!!conn?.refresh_token}
      ga4Active={!!conn?.ga4_property_id}
      scActive={!!conn?.sc_site_url}
    />
  )
}
