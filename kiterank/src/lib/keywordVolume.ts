import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken } from '@/lib/google'

/*
 * What Google says about a phrase.
 *
 * Measured nationally, on purpose. Narrowing the lookup to a city makes the
 * figures smaller but not better: Keyword Planner rounds and suppresses low
 * volumes, so "balayage södermalm" comes back as nothing at all — and the
 * local phrases are exactly the ones a salon should own. National demand for
 * the treatment is a stable number; the local angle belongs in the advice,
 * not in the measurement.
 *
 * Returns null when the Ads account is not connected. A caller that gets null
 * must say the number is unmeasured rather than print a plausible one.
 */

const ADS_BASE = 'https://googleads.googleapis.com/v19'

/** Sweden, Swedish. Read from the company's country once more markets open. */
const GEO_SWEDEN = 'geoTargetConstants/20269'
const LANG_SV    = 'languageConstants/1015'

export type Measured = {
  keyword:          string
  avgVolume:        number
  competition:      'LOW' | 'MEDIUM' | 'HIGH'
  competitionIndex: number
}

/* Shaped like Keyword Planner output for a Stockholm salon, so the panel has
   something true-to-form to show while no Ads account is connected. */
const MOCK: Record<string, Measured> = {
  'frisör':              { keyword: 'frisör',              avgVolume: 74_000, competition: 'MEDIUM', competitionIndex: 48 },
  'frisör nära mig':     { keyword: 'frisör nära mig',     avgVolume: 22_200, competition: 'MEDIUM', competitionIndex: 52 },
  'hårfärgning':         { keyword: 'hårfärgning',         avgVolume: 14_800, competition: 'MEDIUM', competitionIndex: 41 },
  'balayage':            { keyword: 'balayage',            avgVolume:  9_900, competition: 'LOW',    competitionIndex: 28 },
  'slingor':             { keyword: 'slingor',             avgVolume:  8_100, competition: 'LOW',    competitionIndex: 31 },
  'klippning dam':       { keyword: 'klippning dam',       avgVolume:  4_400, competition: 'LOW',    competitionIndex: 22 },
  'herrklippning':       { keyword: 'herrklippning',       avgVolume:  3_600, competition: 'LOW',    competitionIndex: 25 },
  'keratinbehandling':   { keyword: 'keratinbehandling',   avgVolume:  2_900, competition: 'MEDIUM', competitionIndex: 44 },
  'drop in frisör':      { keyword: 'drop in frisör',      avgVolume:  2_400, competition: 'LOW',    competitionIndex: 19 },
  'barnklippning':       { keyword: 'barnklippning',       avgVolume:  1_600, competition: 'LOW',    competitionIndex: 17 },
  'bruduppsättning':     { keyword: 'bruduppsättning',     avgVolume:  1_300, competition: 'LOW',    competitionIndex: 21 },
}

/** Loose match so "balayage" answers for "Balayage " and similar. */
function mockFor(keyword: string): Measured | undefined {
  const k = keyword.trim().toLowerCase()
  if (MOCK[k]) return MOCK[k]
  const hit = Object.keys(MOCK).find(m => k.includes(m) || m.includes(k))
  return hit ? { ...MOCK[hit], keyword } : undefined
}

/**
 * Monthly searches and competition for each phrase, keyed by the phrase.
 *
 * `null` means we could not measure — no Ads connection, or the call failed.
 * Mock figures are returned only when explicitly asked for, so a caller never
 * mistakes example data for a reading.
 */
export async function measureKeywords(
  companyId: string,
  keywords: string[],
  opts: { fallbackToMock?: boolean } = {},
): Promise<Map<string, Measured> | null> {
  const wanted = [...new Set(keywords.map(k => k.trim()).filter(Boolean))].slice(0, 20)
  if (!wanted.length) return new Map()

  const mocked = () => {
    if (!opts.fallbackToMock) return null
    const m = new Map<string, Measured>()
    for (const k of wanted) {
      const hit = mockFor(k)
      if (hit) m.set(k, hit)
    }
    return m
  }

  const admin = createAdminClient()
  const { data: conn } = await admin
    .from('google_connections')
    .select('ads_customer_id, refresh_token')
    .eq('company_id', companyId)
    .maybeSingle()

  if (!conn?.refresh_token || !conn.ads_customer_id) return mocked()

  const token = await getValidToken(companyId)
  if (!token) return mocked()

  try {
    const res = await fetch(
      `${ADS_BASE}/customers/${conn.ads_customer_id}:generateKeywordIdeas`,
      {
        method: 'POST',
        headers: {
          Authorization:     `Bearer ${token}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
          'Content-Type':    'application/json',
        },
        body: JSON.stringify({
          keywordSeed:        { keywords: wanted },
          keywordPlanNetwork: 'GOOGLE_SEARCH',
          geoTargetConstants: [GEO_SWEDEN],
          language:           LANG_SV,
        }),
      },
    )
    if (!res.ok) return mocked()

    const json = await res.json()
    const out  = new Map<string, Measured>()

    for (const r of (json.results ?? []) as { text?: string; keywordIdeaMetrics?: Record<string, unknown> }[]) {
      const text = String(r.text ?? '').toLowerCase()
      const m    = r.keywordIdeaMetrics
      if (!text || !m) continue
      out.set(text, {
        keyword:          text,
        avgVolume:        Number(m.avgMonthlySearches ?? 0),
        competition:      (m.competition as Measured['competition']) ?? 'MEDIUM',
        competitionIndex: Number(m.competitionIndex ?? 50),
      })
    }

    /* The API answers with ideas as well as the seeds, and does not promise
     * to echo every seed back. Anything it stayed silent about is genuinely
     * unmeasured and must not be filled in from somewhere else. */
    const matched = new Map<string, Measured>()
    for (const k of wanted) {
      const hit = out.get(k.toLowerCase())
      if (hit) matched.set(k, hit)
    }
    return matched
  } catch {
    return mocked()
  }
}
