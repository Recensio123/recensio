'use client'
import { Tooltip } from '@/components/Tooltip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BacklinksData {
  total: number
  totalChange: number
  referringDomains: number
  referringDomainsChange: number
  domainRating: number
  domainRatingChange: number
  newThisMonth: number
  lostThisMonth: number
  topDomains: Array<{
    domain: string
    backlinks: number
    dr: number
    firstSeen: string
  }>
}

interface SerpFeaturesData {
  tracked: number
  features: Array<{
    name: string
    count: number
    description: string
  }>
}

interface Competitor {
  domain: string
  sharedKeywords: number
  rankingAboveYou: number
  uniqueKeywords: number
  estimatedTraffic: number
}

interface KeywordGap {
  keyword: string
  volume: number
  difficulty: number
  bestCompetitorPos: number
}

interface LocalPackKeyword {
  keyword: string
  yourPosition: number | null   // 1–3 = in pack, null = not in top 3
  pack: Array<{ name: string; position: number; rating: number; reviews: number }>
}

interface LocalPackCompetitor {
  name: string
  appearances: number   // out of total keywords tracked
  avgPosition: number
  rating: number
  reviews: number
}

interface LocalPackData {
  totalKeywords: number
  keywords: LocalPackKeyword[]
  topCompetitors: LocalPackCompetitor[]
}

interface Props {
  backlinks:    BacklinksData
  serpFeatures: SerpFeaturesData
  competitors:  Competitor[]
  keywordGaps:  KeywordGap[]
  localPack:    LocalPackData
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drColor(dr: number): string {
  if (dr >= 70) return 'text-green-400'
  if (dr >= 40) return 'text-mustard'
  return 'text-red-400'
}

function difficultyLabel(d: number): { label: string; color: string } {
  if (d < 35)  return { label: 'Easy',   color: 'text-green-400' }
  if (d <= 55) return { label: 'Medium', color: 'text-mustard'   }
  return              { label: 'Hard',   color: 'text-red-400'   }
}

function serpBarColor(name: string): string {
  if (name === 'Local Pack')       return '#4ade80'  // green-400
  if (name === 'AI Overview')      return '#a78bfa'  // violet-400
  if (name === 'Featured Snippet') return '#f0b429'  // mustard
  return '#60a5fa'                                    // blue-400
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  positive,
}: {
  label:    string
  value:    string
  sub:      string
  positive?: boolean
}) {
  const subColor =
    positive === undefined
      ? 'text-slate-400'
      : positive
      ? 'text-green-400'
      : 'text-red-400'
  return (
    <div className="bg-navy-800 rounded-xl p-4 border border-navy-700 flex flex-col gap-1">
      <p className="text-slate-500 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white text-xl font-bold leading-tight">{value}</p>
      <p className={`text-xs font-medium ${subColor}`}>{sub}</p>
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function DataForSEODashboard({ backlinks, serpFeatures, competitors, keywordGaps, localPack }: Props) {
  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">DataForSEO</h1>
          <p className="text-slate-400 text-sm mt-1">Backlinks, SERP features and competitor rankings</p>
        </div>
        <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
          Sample data
        </span>
      </div>

      {/* ── Section 1: Backlink overview ───────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Backlink overview</h2>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Total backlinks"
            value={backlinks.total.toLocaleString('sv-SE')}
            sub={`+${backlinks.totalChange} this month`}
            positive={true}
          />
          <StatCard
            label="Referring domains"
            value={backlinks.referringDomains.toLocaleString('sv-SE')}
            sub={`+${backlinks.referringDomainsChange} this month`}
            positive={true}
          />
          <div className="bg-navy-800 rounded-xl p-4 border border-navy-700 flex flex-col gap-1">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Domain rating</p>
            <p className="text-white text-xl font-bold leading-tight">
              {backlinks.domainRating}
              <span className="text-slate-500 text-sm font-normal">/100</span>
            </p>
            <p className="text-xs font-medium text-green-400">+{backlinks.domainRatingChange} this month</p>
          </div>
          <div className="bg-navy-800 rounded-xl p-4 border border-navy-700 flex flex-col gap-1">
            <p className="text-slate-500 text-xs uppercase tracking-wider">New this month</p>
            <p className="text-white text-xl font-bold leading-tight">{backlinks.newThisMonth}</p>
            <p className="text-xs font-medium text-red-400">−{backlinks.lostThisMonth} lost</p>
          </div>
        </div>

        {/* Top referring domains table */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <div className="grid grid-cols-[1fr_64px_80px_100px] gap-4 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
            <span>Domain</span>
            <Tooltip text="Domain Rating — a score from 0 to 100 reflecting how strong a website's backlink profile is. Higher means more valuable.">
              <span className="cursor-default">DR</span>
            </Tooltip>
            <span className="text-right">Backlinks</span>
            <span>First seen</span>
          </div>
          <div className="divide-y divide-navy-700">
            {backlinks.topDomains.map(row => (
              <div key={row.domain} className="grid grid-cols-[1fr_64px_80px_100px] gap-4 px-5 py-3 items-center">
                <span className="text-white text-sm font-medium">{row.domain}</span>
                <span className={`text-sm font-bold tabular-nums ${drColor(row.dr)}`}>{row.dr}</span>
                <span className="text-slate-300 text-sm text-right tabular-nums">{row.backlinks}</span>
                <span className="text-slate-500 text-xs">{row.firstSeen}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: SERP features ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SERP features</h2>
        <p className="text-slate-400 text-sm -mt-2">
          {serpFeatures.tracked} tracked keywords trigger these search features — each one changes how your result looks and competes for attention.
        </p>
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 space-y-4">
          {serpFeatures.features.map(feature => {
            const widthPct = Math.round((feature.count / serpFeatures.tracked) * 100)
            const color    = serpBarColor(feature.name)
            return (
              <div key={feature.name} className="flex items-center gap-4">
                <div className="w-36 shrink-0">
                  <Tooltip text={feature.description}>
                    <span className="text-slate-300 text-sm cursor-default">{feature.name}</span>
                  </Tooltip>
                </div>
                <div className="flex-1 bg-navy-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${widthPct}%`, backgroundColor: color }}
                  />
                </div>
                <span className="w-12 text-right text-slate-400 text-xs tabular-nums shrink-0">
                  {feature.count} / {serpFeatures.tracked}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Section 3: Local Pack ────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Local Pack rankings</h2>
        <p className="text-slate-400 text-sm -mt-2">
          Who appears in Google&apos;s 3-pack for your tracked keywords — and where you stand against them.
        </p>

        {/* Keyword-by-keyword pack breakdown */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_1fr_1fr_1fr] gap-3 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
            <span>Keyword</span>
            <Tooltip text="Your position in the local pack for this keyword. '—' means you don't appear in the top 3.">
              <span className="cursor-default text-center">Your rank</span>
            </Tooltip>
            <span className="text-center">Position 1</span>
            <span className="text-center">Position 2</span>
            <span className="text-center">Position 3</span>
          </div>
          <div className="divide-y divide-navy-700">
            {localPack.keywords.map(row => {
              return (
                <div key={row.keyword} className="grid grid-cols-[1fr_80px_1fr_1fr_1fr] gap-3 px-5 py-3 items-center">
                  <span className="text-white text-sm font-medium">{row.keyword}</span>
                  <div className="flex justify-center">
                    {row.yourPosition !== null ? (
                      <span className="text-xs font-bold text-green-400">#{row.yourPosition}</span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>
                  {[1, 2, 3].map(pos => {
                    const entry = row.pack.find(p => p.position === pos)
                    if (!entry) return <div key={pos} />
                    const isYou = row.yourPosition === pos
                    return (
                      <div key={pos} className={`rounded-lg px-2 py-1.5 text-center ${isYou ? 'bg-green-500/10 border border-green-500/20' : 'bg-navy-700/50'}`}>
                        <p className={`text-xs font-medium truncate ${isYou ? 'text-green-400' : 'text-slate-300'}`} title={entry.name}>
                          {entry.name}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {entry.rating} ★ · {entry.reviews} reviews
                        </p>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recurring pack competitors */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your recurring local competitors</h3>
          <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
            <div className="grid grid-cols-[1fr_110px_120px_80px_80px] gap-4 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
              <span>Business</span>
              <Tooltip text={`How many of your ${localPack.totalKeywords} tracked keywords this competitor appears in the local pack for.`}>
                <span className="text-right cursor-default">Pack appearances</span>
              </Tooltip>
              <Tooltip text="Their average position across all keywords where they appear in the local pack.">
                <span className="text-right cursor-default">Avg. position</span>
              </Tooltip>
              <span className="text-right">Rating</span>
              <span className="text-right">Reviews</span>
            </div>
            <div className="divide-y divide-navy-700">
              {localPack.topCompetitors.map(comp => {
                const appearPct   = comp.appearances / localPack.totalKeywords
                const threatColor = appearPct >= 0.6 ? 'text-red-400' : appearPct >= 0.4 ? 'text-mustard' : 'text-slate-300'
                return (
                  <div key={comp.name} className="grid grid-cols-[1fr_110px_120px_80px_80px] gap-4 px-5 py-3 items-center">
                    <span className="text-white text-sm font-medium">{comp.name}</span>
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-sm font-medium tabular-nums ${threatColor}`}>{comp.appearances}</span>
                      <span className="text-slate-600 text-xs">/ {localPack.totalKeywords}</span>
                    </div>
                    <span className="text-slate-300 text-sm text-right tabular-nums">#{comp.avgPosition.toFixed(1)}</span>
                    <span className="text-slate-300 text-sm text-right tabular-nums">{comp.rating} ★</span>
                    <span className="text-slate-300 text-sm text-right tabular-nums">{comp.reviews}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Organic competitors ───────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Competitors</h2>

        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_120px_140px_120px] gap-4 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
            <span>Domain</span>
            <Tooltip text="Keywords that you and this competitor both rank for.">
              <span className="text-right cursor-default">Shared keywords</span>
            </Tooltip>
            <Tooltip text="Of your shared keywords, how many this competitor ranks higher for than you.">
              <span className="text-right cursor-default">Ranking above you</span>
            </Tooltip>
            <Tooltip text="Keywords this competitor ranks for that you don't — potential opportunities.">
              <span className="text-right cursor-default">Unique to them</span>
            </Tooltip>
            <Tooltip text="Estimated monthly organic visits to their site.">
              <span className="text-right cursor-default">Est. traffic</span>
            </Tooltip>
          </div>
          <div className="divide-y divide-navy-700">
            {competitors.map(comp => {
              const abovePct = comp.sharedKeywords > 0
                ? comp.rankingAboveYou / comp.sharedKeywords
                : 0
              const aboveColor = abovePct > 0.5 ? 'text-red-400' : 'text-slate-300'
              return (
                <div key={comp.domain} className="grid grid-cols-[1fr_100px_120px_140px_120px] gap-4 px-5 py-3 items-center">
                  <span className="text-white text-sm font-medium">{comp.domain}</span>
                  <span className="text-slate-300 text-sm text-right tabular-nums">{comp.sharedKeywords}</span>
                  <span className={`text-sm text-right tabular-nums font-medium ${aboveColor}`}>{comp.rankingAboveYou}</span>
                  <span className="text-slate-300 text-sm text-right tabular-nums">{comp.uniqueKeywords}</span>
                  <span className="text-slate-300 text-sm text-right tabular-nums">{comp.estimatedTraffic.toLocaleString('sv-SE')}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Keyword gaps */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Keywords you&apos;re missing</h3>
          <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_120px_140px] gap-4 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
              <span>Keyword</span>
              <Tooltip text="Average number of times this keyword is searched per month.">
                <span className="text-right cursor-default">Monthly searches</span>
              </Tooltip>
              <Tooltip text="How hard it is to rank on the first page for this keyword, from 0 (easy) to 100 (very hard).">
                <span className="text-right cursor-default">Difficulty</span>
              </Tooltip>
              <Tooltip text="The best position any of your competitors holds for this keyword.">
                <span className="text-right cursor-default">Best competitor pos.</span>
              </Tooltip>
            </div>
            <div className="divide-y divide-navy-700">
              {keywordGaps.map(kw => {
                const diff = difficultyLabel(kw.difficulty)
                return (
                  <div key={kw.keyword} className="grid grid-cols-[1fr_100px_120px_140px] gap-4 px-5 py-3 items-center">
                    <span className="text-white text-sm font-medium">{kw.keyword}</span>
                    <span className="text-slate-300 text-sm text-right tabular-nums">{kw.volume.toLocaleString('sv-SE')}</span>
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-xs font-semibold ${diff.color}`}>{diff.label}</span>
                      <span className="text-slate-500 text-xs tabular-nums">({kw.difficulty})</span>
                    </div>
                    <span className="text-slate-300 text-sm text-right tabular-nums">#{kw.bestCompetitorPos}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
