import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SEODashboard }      from './SEODashboard'

const now = new Date()

const mockQueries = [
  { query: 'frisör södermalm',              clicks: 45, impressions:  880, ctr: 0.051, position:  3.2, clicksChange:  18, positionChange: -1 },
  { query: 'frisör stockholm',              clicks: 18, impressions:  860, ctr: 0.021, position:  2.4, clicksChange:   5, positionChange:  0 },
  { query: 'klippning dam södermalm',       clicks: 12, impressions:  320, ctr: 0.038, position:  8.1, clicksChange:  33, positionChange: -2 },
  { query: 'balayage stockholm',            clicks:  8, impressions:  210, ctr: 0.038, position:  6.3, clicksChange: -12, positionChange:  1 },
  { query: 'klippning pris stockholm',      clicks:  4, impressions:  590, ctr: 0.007, position:  5.1, clicksChange:   0, positionChange:  0 },
  { query: 'hårfärgning stockholm',         clicks:  2, impressions: 1200, ctr: 0.002, position: 34,   clicksChange: -25, positionChange:  4 },
  { query: 'keratinbehandling stockholm',   clicks:  1, impressions:  590, ctr: 0.002, position: 28,   clicksChange:   0, positionChange:  0 },
  { query: 'drop in frisör södermalm',      clicks:  0, impressions:  210, ctr: 0,     position:  9.4, clicksChange:   0, positionChange: -1 },
  { query: 'boka frisör online',            clicks:  6, impressions:  140, ctr: 0.043, position:  4.7, clicksChange:  50, positionChange: -3 },
  { query: 'billig frisör stockholm',       clicks:  3, impressions:  440, ctr: 0.007, position:  7.2, clicksChange:  -8, positionChange:  2 },
]

// 28% branded (people searching the company name), 72% non-branded (people discovering via service searches)
// Derived from Search Console queries containing the business name vs. generic service queries

const mockTrend = Array.from({ length: 6 }, (_, i) => {
  const d           = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
  const clicks      = [52, 61, 74, 82, 91, 99][i]
  const impressions = [2_800, 3_200, 3_600, 4_100, 4_800, 5_440][i]
  return {
    month:       d.toLocaleDateString('en-GB', { month: 'short' }),
    clicks,
    impressions,
  }
})

const MOCK_PREV = { clicks: 85, impressions: 4_800, avgPosition: 11.4 }

// Google Ads summary — spend + sessions from GA4 paid channel, keywords from Ads API (Phase 3)
const MOCK_PAID = { spend: 1_850, spendPrev: 1_400, sessions: 94, keywords: 12 }

export default async function SEOPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin.from('companies').select('id, name').eq('user_id', user.id).single()
    : { data: null }

  const { data: rows } = company
    ? await admin
        .from('search_console_queries')
        .select('*')
        .eq('company_id', company.id)
        .order('impressions', { ascending: false })
        .limit(100)
    : { data: null }

  const FORCE_MOCK = true
  const isLive  = !FORCE_MOCK && !!rows?.length
  const queries = isLive ? rows! : mockQueries

  return (
    <SEODashboard
      queries={queries}
      trend={mockTrend}
      prev={MOCK_PREV}
      isLive={isLive}
      paid={MOCK_PAID}
    />
  )
}
