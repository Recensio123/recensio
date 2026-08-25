import { NextResponse }       from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { getValidToken }      from '@/lib/google'
import { visaExempel } from '@/lib/datalage.server'

const ADS_BASE = 'https://googleads.googleapis.com/v19'

function adsHeaders(token: string) {
  return {
    Authorization:     `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type':    'application/json',
  }
}

export type KeywordIdea = {
  keyword:       string
  avgVolume:     number          // average monthly searches (last 12 mo)
  monthlyVolume: number[]        // 12 values, oldest first — for sparkline
  yoyGrowth:     number          // % change: last 3 months vs same 3 months prior year
  competition:   'LOW' | 'MEDIUM' | 'HIGH'
  competitionIndex: number       // 0–100
  /* Google's own estimate of what advertisers pay to sit at the top of the
     page for this phrase — keywordIdeaMetrics.highTopOfPageBidMicros. Without
     it a suggestion has no price, and a salon cannot tell a 6 kr click from a
     60 kr one. */
  topOfPageBidMicros: number
}
export async function GET() {
  const exempel = await visaExempel()
  if (exempel) return NextResponse.json({ ideas: MOCK_IDEAS, source: 'mock' })

    const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = c.admin

  const { data: company } = await admin
    .from('companies')
    .select('id, name, website')
    .eq('id', c.id)
    .single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const { data: conn } = await admin
    .from('google_connections')
    .select('ads_customer_id, refresh_token')
    .eq('company_id', company.id)
    .single()

  // No Ads connection — return mock data so the UI always has something to show
  if (!conn?.refresh_token) {
    return NextResponse.json({ ideas: MOCK_IDEAS, source: 'mock' })
  }

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ ideas: MOCK_IDEAS, source: 'mock' })

  const customerId = conn.ads_customer_id
  if (!customerId) return NextResponse.json({ ideas: MOCK_IDEAS, source: 'mock' })

  try {
    // Seed keywords derived from existing Search Console queries
    const { data: scRows } = await admin
      .from('search_console_queries')
      .select('query')
      .eq('company_id', company.id)
      .order('impressions', { ascending: false })
      .limit(5)

    const seedKeywords = scRows?.map((r: { query: string }) => r.query).filter(Boolean) ?? [company.name]

    const body = {
      keywordSeed:        { keywords: seedKeywords },
      ...(company.website ? { urlSeed: { url: company.website } } : {}),
      keywordPlanNetwork: 'GOOGLE_SEARCH',
      // Sweden geo target — will be refined per company country in a future update
      geoTargetConstants: ['geoTargetConstants/20269'],
      language:           'languageConstants/1015',
    }

    const res = await fetch(
      `${ADS_BASE}/customers/${customerId}:generateKeywordIdeas`,
      { method: 'POST', headers: adsHeaders(token), body: JSON.stringify(body) },
    )

    if (!res.ok) {
      console.error('generateKeywordIdeas failed:', res.status, await res.text())
      return NextResponse.json({ ideas: MOCK_IDEAS, source: 'mock' })
    }

    const json = await res.json()
    const results: any[] = json.results ?? []

    const ideas: KeywordIdea[] = results
      .filter(r => r.keywordIdeaMetrics?.avgMonthlySearches > 50)
      .map(r => {
        const metrics   = r.keywordIdeaMetrics
        const monthly: number[] = (metrics.monthlySearchVolumes ?? [])
          .slice(-12)
          .map((m: any) => Number(m.monthlySearches ?? 0))

        // YoY: compare latest 3 months vs same 3 months of the prior year
        const recent = monthly.slice(-3).reduce((a: number, b: number) => a + b, 0)
        const prior  = monthly.slice(0, 3).reduce((a: number, b: number) => a + b, 0)
        const yoyGrowth = prior > 0 ? Math.round((recent - prior) / prior * 100) : 0

        return {
          keyword:          r.text ?? '',
          avgVolume:        Number(metrics.avgMonthlySearches ?? 0),
          monthlyVolume:    monthly,
          yoyGrowth,
          competition:      metrics.competition ?? 'MEDIUM',
          competitionIndex: Number(metrics.competitionIndex ?? 50),
          topOfPageBidMicros: Number(metrics.highTopOfPageBidMicros ?? 0),
        }
      })
      .sort((a, b) => b.avgVolume - a.avgVolume)
      .slice(0, 30)

    return NextResponse.json({ ideas, source: 'live' })
  } catch (err) {
    console.error('keyword-ideas error:', err)
    return NextResponse.json({ ideas: MOCK_IDEAS, source: 'mock' })
  }
}

// ── Mock data — Stockholm salon (volumes shaped like DataForSEO/Keyword Planner output) ──

const MOCK_IDEAS: KeywordIdea[] = [
  {
    keyword: 'frisör stockholm',
    avgVolume: 1900, yoyGrowth: 24, competition: 'HIGH', competitionIndex: 78, topOfPageBidMicros: 28_000_000,
    monthlyVolume: [1300,1250,1400,1600,1700,1800,1850,1900,2000,2100,2200,1900],
  },
  {
    keyword: 'klippning pris',
    avgVolume: 1200, yoyGrowth: 31, competition: 'LOW', competitionIndex: 22, topOfPageBidMicros: 12_000_000,
    monthlyVolume: [700,750,800,900,950,1000,1100,1150,1200,1300,1350,1200],
  },
  {
    keyword: 'balayage stockholm',
    avgVolume: 3400, yoyGrowth: 18, competition: 'MEDIUM', competitionIndex: 51, topOfPageBidMicros: 20_000_000,
    monthlyVolume: [2000,2100,2800,3200,3600,3800,3900,3700,3400,3100,2900,3400],
  },
  {
    keyword: 'drop in frisör stockholm',
    avgVolume: 880, yoyGrowth: 42, competition: 'LOW', competitionIndex: 18, topOfPageBidMicros: 11_000_000,
    monthlyVolume: [400,420,450,500,550,600,700,750,800,880,920,880],
  },
  {
    keyword: 'hårfärgning pris',
    avgVolume: 2200, yoyGrowth: 8, competition: 'MEDIUM', competitionIndex: 44, topOfPageBidMicros: 18_000_000,
    monthlyVolume: [1800,1900,2000,2200,2300,2100,2000,2100,2200,2300,2400,2200],
  },
  {
    keyword: 'lash lift stockholm',
    avgVolume: 590, yoyGrowth: 67, competition: 'LOW', competitionIndex: 11, topOfPageBidMicros: 9_000_000,
    monthlyVolume: [200,220,260,310,360,410,460,500,530,560,580,590],
  },
  {
    keyword: 'keratinbehandling',
    avgVolume: 1400, yoyGrowth: 15, competition: 'MEDIUM', competitionIndex: 48, topOfPageBidMicros: 19_000_000,
    monthlyVolume: [1000,1050,1100,1200,1300,1350,1400,1420,1430,1440,1450,1400],
  },
  {
    keyword: 'barberare södermalm',
    avgVolume: 760, yoyGrowth: 22, competition: 'LOW', competitionIndex: 29, topOfPageBidMicros: 14_000_000,
    monthlyVolume: [480,500,540,580,640,680,700,720,740,760,770,760],
  },
  {
    keyword: 'permanent hår pris',
    avgVolume: 1100, yoyGrowth: -4, competition: 'LOW', competitionIndex: 15, topOfPageBidMicros: 10_000_000,
    monthlyVolume: [1200,1150,1100,1050,1000,980,970,1000,1050,1100,1150,1100],
  },
  {
    keyword: 'nagelförlängning stockholm',
    avgVolume: 2800, yoyGrowth: 12, competition: 'HIGH', competitionIndex: 71, topOfPageBidMicros: 26_000_000,
    monthlyVolume: [2200,2300,2500,2700,2800,2900,2950,2900,2850,2800,2750,2800],
  },
  {
    keyword: 'fransförlängning pris',
    avgVolume: 680, yoyGrowth: 9, competition: 'LOW', competitionIndex: 20, topOfPageBidMicros: 12_000_000,
    monthlyVolume: [560,570,590,620,650,660,670,680,690,700,710,680],
  },
  {
    keyword: 'brudhår stockholm',
    avgVolume: 1650, yoyGrowth: 38, competition: 'MEDIUM', competitionIndex: 55, topOfPageBidMicros: 21_000_000,
    monthlyVolume: [900,950,1050,1200,1350,1450,1550,1600,1620,1640,1650,1650],
  },
]
