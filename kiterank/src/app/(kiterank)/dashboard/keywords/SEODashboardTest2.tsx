'use client'
import { useState, useMemo }  from 'react'
import { Tooltip }            from '@/components/Tooltip'
import { PeriodSelector, type Period } from '@/components/dashboard/PeriodSelector'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { SEOTrendChart }      from './TrendChart'
import type { Query }         from './KeywordTable'
import { KeywordTableTest2, DEFAULT_SORT, type TableSort, type SortCol } from './KeywordTableTest2'
import { OpportunitiesPanelTest2 } from './OpportunitiesPanelTest2'
import { type TrendPoint }    from './TrendChart'
import { ActionPlanLink }     from '@/components/dashboard/ActionPlanLink'
import { HelpButton }         from '@/components/dashboard/HelpButton'
import { useCoverage, coveredValue } from '@/components/DataCoverageProvider'
import { CoverageNote, MeasuringSince } from '@/components/dashboard/CoverageNote'

type PrevData = { clicks: number; impressions: number; avgPosition: number }

// Flow metrics (clicks/impressions) scale with the selected period.
// Weekly ≈ monthly / 4.3, Yearly ≈ monthly × 12. Deterministic — no randomness.
const FLOW_FACTOR: Record<Period, number> = { Weekly: 1 / 4.3, Monthly: 1, Yearly: 12 }
// Adjusts the previous-period baseline so WoW / MoM / YoY deltas differ plausibly:
// week-over-week is noisier and smaller, year-over-year shows cumulative growth.
const PREV_ADJUST: Record<Period, number> = { Weekly: 1.05, Monthly: 1, Yearly: 0.78 }

// One chart bar covers this many days, per selected period. Used to cut the
// series back to the number of buckets our Search Console history can actually
// fill — Google does not backfill, so drawing three year-bars for a property
// registered 16 months ago would invent two of them.
const BUCKET_DAYS: Record<Period, number> = { Weekly: 7, Monthly: 30, Yearly: 365 }
const DAY_MS = 86_400_000

/** How many chart buckets our history for this source can honestly fill. */
function supportedBuckets(startedAt: Date | null, period: Period): number {
  if (!startedAt) return 1
  const now = new Date()
  now.setHours(0, 0, 0, 0)   // midnight-anchored, matching DataCoverageProvider
  const held = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS))
  return Math.max(1, Math.ceil(held / BUCKET_DAYS[period]))
}

/* Period-scaled trend series, derived from the monthly mock. Fixed
   deterministic factors — no randomness in render. */
function buildSeries(period: Period, trend: TrendPoint[], lang: Lang): TrendPoint[] {
  if (period === 'Weekly') {
    const lastClicks = trend[trend.length - 1]?.clicks      ?? 99
    const lastImp    = trend[trend.length - 1]?.impressions ?? 5_440
    const factors    = [0.85, 0.88, 0.82, 0.90, 0.95, 0.93, 0.98, 1.0]
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (7 - i) * 7)
      return {
        month:       d.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' }),
        clicks:      Math.round(lastClicks / 4.3 * factors[i]),
        impressions: Math.round(lastImp    / 4.3 * factors[i]),
      }
    })
  }
  if (period === 'Yearly') {
    const now         = new Date()
    const totalClicks = trend.reduce((s, p) => s + p.clicks, 0)
    const totalImp    = trend.reduce((s, p) => s + p.impressions, 0)
    const scales      = [0.55, 0.75, 1.0]
    return Array.from({ length: 3 }, (_, i) => ({
      month:       String(now.getFullYear() - 2 + i),
      clicks:      Math.round(totalClicks * 2 * scales[i]),
      impressions: Math.round(totalImp    * 2 * scales[i]),
    }))
  }
  return trend
}

const T = {
  sv: {
    subtitle:      'Hur folk hittar dig på Google — och var du går miste om besökare',
    sample:        'Exempeldata',
    visibility:    'Synlighet',
    kpiClicks:     { Weekly: 'Klick denna vecka', Monthly: 'Klick denna månad', Yearly: 'Klick i år' } as Record<Period, string>,
    kpiClicksStart: 'Klick sedan start',
    kpiClicksTip:  'Hur många gånger någon klickade sig vidare till din hemsida från ett sökresultat på Google.',
    kpiPage1:      'Sökord på sida 1',
    kpiPage1Tip:   'Hur många av dina sökord som visas på första sidan av Googles resultat. Väldigt få tittar längre än sida 1 — det är den här siffran ditt SEO-arbete ska lyfta.',
    of:            'av',
    viewAll:       'Visa alla →',
    kpiQuick:      'Snabba vinster',
    kpiQuickTip:   'Sökord där du ligger på plats 4–15. De är närmast sida 1 och kräver minst arbete att lyfta.',
    seeWhich:      'Se vilka →',
    trendWeekly:   'Organisk trafik — senaste 8 veckorna',
    trendYearly:   'Organisk trafik — senaste 3 åren',
    trendMonthly:  'Organisk trafik — senaste 6 månaderna',
    trendStart:    'Organisk trafik — sedan start',
    keywordsTitle: 'Dina sökord',
    keywordsTip:   'Varje sökfras din hemsida har visats för på Google, sorterade efter hur ofta du synts.',
    opportunities: 'Möjligheter',
    opportunitiesTip: 'Sökord du inte rankar för ännu — förslag att satsa på, växande efterfrågan, säsongstoppar och din egen bevakningslista.',
    actionContext: 'Vill du klättra i placeringarna?',
    period: { Weekly: 'mot förra veckan', Monthly: 'mot förra månaden', Yearly: 'mot förra året' } as Record<Period, string>,
  },
  en: {
    subtitle:      "How people find you on Google — and where you're leaving traffic on the table",
    sample:        'Sample data',
    visibility:    'Visibility',
    kpiClicks:     { Weekly: 'Clicks this week', Monthly: 'Clicks this month', Yearly: 'Clicks this year' } as Record<Period, string>,
    kpiClicksStart: 'Clicks since we started',
    kpiClicksTip:  'How many times someone clicked through to your website from a Google search result.',
    kpiPage1:      'Keywords on page 1',
    kpiPage1Tip:   'How many of your keywords appear on the first page of Google results. Very few people ever look past page 1 — this number is what your SEO work is pushing up.',
    of:            'of',
    viewAll:       'View all →',
    kpiQuick:      'Quick wins',
    kpiQuickTip:   'Keywords where you rank in positions 4–15. These are the closest to page 1 and take the least effort to push up.',
    seeWhich:      'See which ones →',
    trendWeekly:   'Organic traffic — last 8 weeks',
    trendYearly:   'Organic traffic — last 3 years',
    trendMonthly:  'Organic traffic — last 6 months',
    trendStart:    'Organic traffic — since we started',
    keywordsTitle: 'Your keywords',
    keywordsTip:   'Every search term your website has appeared for on Google, sorted by how often you were seen.',
    opportunities: 'Opportunities',
    opportunitiesTip: "Keywords you don't rank for yet — suggestions to target, growing demand, seasonal peaks, and your own watchlist.",
    actionContext: 'Want to climb these rankings?',
    period: { Weekly: 'WoW', Monthly: 'MoM', Yearly: 'YoY' } as Record<Period, string>,
  },
}

export function SEODashboardTest2({
  queries,
  trend,
  prev,
  isLive,
}: {
  queries:    Query[]
  trend:      TrendPoint[]
  prev:       PrevData
  isLive:     boolean
  paid?:      unknown
}) {
  const { lang } = useLang()
  const t = T[lang]
  const [period,   setPeriod]   = useState<Period>('Monthly')
  const [tableSort, setTableSort] = useState<TableSort>(DEFAULT_SORT)
  const periodLabel = t.period[period]

  // How far back our Search Console record actually reaches. A change
  // percentage is only safe to render once the preceding period is covered too.
  const coverage  = useCoverage('search', period)
  const showDelta = coverage.state === 'full'
  const startedAt = coverage.startedAt

  // Period-aware chart data, cut back to the buckets our history can fill.
  // Anything older than the day we started measuring would be a fabricated bar.
  const chartTrend = useMemo(() => {
    const series    = buildSeries(period, trend, lang)
    const supported = supportedBuckets(startedAt, period)
    const trimmed   = supported >= series.length ? series : series.slice(series.length - supported)
    // A surviving bucket only holds the days we actually measured, so its bar
    // has to shrink to match — otherwise a 6-day record draws a full year.
    return trimmed.map(p => ({
      ...p,
      clicks:      coveredValue(p.clicks,      coverage),
      impressions: coveredValue(p.impressions, coverage),
    }))
  }, [period, trend, lang, startedAt, coverage])

  const trendTitle =
    coverage.state === 'since-start' ? t.trendStart  :
    period === 'Weekly'              ? t.trendWeekly :
    period === 'Yearly'              ? t.trendYearly :
    t.trendMonthly

  // KPIs — clicks are a flow metric and scale with the period; page-1 and
  // quick-win counts are state metrics and stay the same regardless of period.
  // A period-scaled flow figure is also trimmed to the days we actually hold:
  // under a "sedan start" heading, a full year projected from a few weeks of
  // measurement would be exactly the confident-but-wrong number to avoid.
  const { periodClicks, periodPrevClicks } = useMemo(() => {
    const monthlyClicks = queries.reduce((s, q) => s + q.clicks, 0)
    const f = FLOW_FACTOR[period]
    return {
      periodClicks:     coveredValue(Math.round(monthlyClicks * f), coverage),
      periodPrevClicks: prev.clicks * f * PREV_ADJUST[period],
    }
  }, [queries, prev, period, coverage])
  const page1Count  = queries.filter(q => q.position <= 10).length
  const quickWins   = queries.filter(q => q.position >= 4 && q.position <= 15).length

  const mkDelta = (curr: number, p: number, lowerIsBetter = false) => {
    if (!p) return null
    const pct        = (curr - p) / p * 100
    const isPositive = lowerIsBetter ? pct < 0 : pct > 0
    return {
      label: `${pct > 0 ? '↑' : '↓'}${Math.abs(pct).toFixed(1)}% ${periodLabel}`,
      color: isPositive ? 'text-green-400' : 'text-red-400',
    }
  }

  // KPI cards jump straight to the matching table view — a number you can act on
  /* A KPI card points at a column, not at a verdict — the table has no
   * opinionated views left to land on. */
  function jumpToTable(col: SortCol) {
    setTableSort({ col, dir: col === 'position' ? 'asc' : 'desc' })
    document.getElementById('keyword-table-t2')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const kpis: {
    label: string; tooltip: string; value: string
    delta: { label: string; color: string } | null
    // Cards carrying a period-over-period comparison — these swap the delta
    // badge for a coverage note when the comparison period is not fully held.
    comparative?: boolean
    sub?: string; highlight?: boolean; onClick?: () => void
  }[] = [
    {
      label:   coverage.state === 'since-start' ? t.kpiClicksStart : t.kpiClicks[period],
      tooltip: t.kpiClicksTip,
      value:   periodClicks.toLocaleString('sv-SE'),
      delta:   mkDelta(periodClicks, periodPrevClicks),
      comparative: true,
    },
    {
      label:   t.kpiPage1,
      tooltip: t.kpiPage1Tip,
      value:   `${page1Count} ${t.of} ${queries.length}`,
      delta:   null,
      sub:     t.viewAll,
      onClick: () => jumpToTable('position'),
    },
    {
      label:   t.kpiQuick,
      tooltip: t.kpiQuickTip,
      value:   String(quickWins),
      delta:   null,
      sub:     t.seeWhich,
      highlight: quickWins > 0,
      /* Positions 4–15 sit immediately under the top three, so ordering by
       * position puts them near the top of the list the card points at. */
      onClick: () => jumpToTable('position'),
    },
  ]

  return (
    <div className="px-4 sm:px-8 py-6 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">{lang === 'sv' ? 'Synlighet på Google' : 'Google visibility'}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {t.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!isLive && (
            <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
              {t.sample}
            </span>
          )}
          <PeriodSelector period={period} onChange={setPeriod} />
          <HelpButton topic="synlighet" />
        </div>
      </div>

      {/* ── Section 1: Visibility ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.visibility}</p>

        {/* 3 KPI cards — clickable where there's a view to jump to */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {kpis.map(k => {
            const Card = k.onClick ? 'button' : 'div'
            return (
              <Card
                key={k.label}
                onClick={k.onClick}
                className={`rounded-xl p-4 border text-left ${
                  k.highlight
                    ? 'bg-mustard/5 border-mustard/20'
                    : 'bg-navy-800 border-navy-700'
                } ${k.onClick ? 'hover:border-navy-500 transition-colors cursor-pointer group' : ''}`}
              >
                <Tooltip text={k.tooltip}>
                  <p className="text-slate-400 text-xs mb-1 cursor-default">{k.label}</p>
                </Tooltip>
                <p className="text-3xl font-bold text-white tabular-nums">{k.value}</p>
                {k.comparative && !showDelta ? (
                  <div className="mt-1">
                    <CoverageNote coverage={coverage} period={period} />
                  </div>
                ) : k.delta ? (
                  <p className={`text-xs mt-1 ${k.delta.color}`}>{k.delta.label}</p>
                ) : k.sub ? (
                  <p className={`text-xs mt-1 ${k.highlight ? 'text-mustard' : 'text-slate-500'} group-hover:underline`}>
                    {k.sub}
                  </p>
                ) : null}
              </Card>
            )
          })}
        </div>

        {/* Traffic chart */}
        <div>
          <SEOTrendChart trend={chartTrend} title={trendTitle} />
          <MeasuringSince coverage={coverage} className="mt-3" />
        </div>

      </section>

      {/* ── Section 2: Your keywords ────────────────────────────────────────── */}
      <section id="keyword-table-t2" className="space-y-3 scroll-mt-6">
        <Tooltip text={t.keywordsTip}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-default">
            {t.keywordsTitle}
          </p>
        </Tooltip>
        <KeywordTableTest2 queries={queries} sort={tableSort} onSortChange={setTableSort} period={period} />
      </section>

      {/* ── Section 3: Opportunities — one home for keywords you don't rank for ── */}
      <section className="space-y-3">
        <Tooltip text={t.opportunitiesTip}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-default">
            {t.opportunities}
          </p>
        </Tooltip>
        <OpportunitiesPanelTest2 />
      </section>


      <ActionPlanLink context={t.actionContext} />

    </div>
  )
}
