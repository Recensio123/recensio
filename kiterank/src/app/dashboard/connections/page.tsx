import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConnectionsView } from './ConnectionsView'

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; detail?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const { data: company } = user
    ? await admin.from('companies').select('id, name, city').eq('user_id', user.id).single()
    : { data: null }

  const { data: conn } = company
    ? await admin.from('google_connections').select('*').eq('company_id', company.id).single()
    : { data: null }

  const { data: latestSnapshot } = company
    ? await admin.from('gbp_snapshots').select('created_at').eq('company_id', company.id).order('created_at', { ascending: false }).limit(1).single()
    : { data: null }

  const { count: scQueryCount } = company
    ? await admin.from('search_console_queries').select('*', { count: 'exact', head: true }).eq('company_id', company.id)
    : { count: null }

  const isConnected = !!conn?.refresh_token
  const hasLocation = !!conn?.gbp_location_id
  const scActive    = isConnected && !!conn?.sc_site_url
  const adsActive   = isConnected && !!conn?.ads_customer_id
  const ga4Active   = isConnected && !!conn?.ga4_property_id

  return (
    <ConnectionsView
      error={params.error}
      errorDetail={params.detail}
      success={params.success}
      isConnected={isConnected}
      hasLocation={hasLocation}
      scActive={scActive}
      adsActive={adsActive}
      ga4Active={ga4Active}
      companyName={company?.name ?? null}
      city={company?.city ?? null}
      connectedAt={conn?.connected_at ?? null}
      scSiteUrl={conn?.sc_site_url ?? null}
      scQueryCount={scQueryCount ?? null}
      adsCustomerId={conn?.ads_customer_id ?? null}
      ga4PropertyId={conn?.ga4_property_id ?? null}
      lastSynced={latestSnapshot?.created_at ?? null}
    />
  )
}
