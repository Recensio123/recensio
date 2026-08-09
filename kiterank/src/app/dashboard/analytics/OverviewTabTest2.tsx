'use client'
import { useMemo, useState } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang } from '@/components/LanguageProvider'
import { type AnalyticsData, type Period } from './types'
import { Sparkline, VisitsOverTimeChart, StackedDeviceChart, type CompetitorLine } from './charts'
import { fmtDuration } from './helpers'
import { useCoverage, coveredValue } from '@/components/DataCoverageProvider'
import { CoverageNote, MeasuringSince } from '@/components/dashboard/CoverageNote'

// Mock competitor benchmarks — replaced with live DataForSEO data when connected
const MOCK_COMPETITORS: Array<{ name: string; monthly: number[]; weekly: number[]; yearly: number[]; color: string }> = [
  {
    name:    'Rörjansen AB',
    monthly: [680, 710, 695, 720, 740, 760],
    weekly:  [162, 170, 164, 175, 178, 172, 180, 188],
    yearly:  [6200, 6500, 6800, 7100, 7400, 7700, 8000, 8200, 8400, 8600, 8900, 9200],
    color:   '#60a5fa',
  },
  {
    name:    'Plumb24 Stockholm',
    monthly: [420, 450, 440, 480, 500, 510],
    weekly:  [104, 112, 108, 118, 122, 120, 126, 132],
    yearly:  [3800, 4000, 4200, 4500, 4700, 4900, 5100, 5200, 5100, 5300, 5500, 5700],
    color:   '#fb923c',
  },
]

// ── Deterministic period scaling — same approach as SEODashboardTest2's chartTrend ──
// The mock is monthly. Weekly ≈ monthly / 4.3; yearly ≈ monthly × 12 adjusted for the
// growth ramp through the year (earlier months were smaller), landing near ×10.2.
const WEEK_DIVISOR = 4.3
const YEAR_FACTOR  = 10.2
// 8-week chart shape — fixed factors, last step ≈ +12% to match sessions_wow
const WEEK_FACTORS = [0.72, 0.78, 0.74, 0.81, 0.86, 0.83, 0.89, 1.0]
// 3-year chart shape — last step ≈ +34% to match sessions_yoy
const YEAR_SCALES  = [0.55, 0.75, 1.0]

// ── Chart depth guard ────────────────────────────────────────────────────────
// Site analytics only exist from the day the tracking tag went in, and nothing
// is backfilled. The series above are all derived from the monthly mock, so
// they will happily claim eight weeks or three years of history we do not
// hold. Buckets beyond our record are dropped from the front of the series
// rather than drawn.
const DAY_MS = 86_400_000
const BUCKET_DAYS: Record<Period, number> = { Weekly: 7, Monthly: 30, Yearly: 365 }

function supportedBuckets(startedAt: Date | null, period: Period): number {
  if (!startedAt) return 1
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const heldDays = Math.max(0, (now.getTime() - startedAt.getTime()) / DAY_MS)
  return Math.max(1, Math.ceil(heldDays / BUCKET_DAYS[period]))
}

function tail<T>(series: T[], keep: number): T[] {
  return series.length > keep ? series.slice(series.length - keep) : series
}

function scaleFlow(v: number, period: Period): number {
  if (period === 'Weekly') return Math.round(v / WEEK_DIVISOR)
  if (period === 'Yearly') return Math.round(v * YEAR_FACTOR)
  return v
}

const T = {
  sv: {
    visits:           'Besök',
    visitsTip:        'Ett besök är en session på din hemsida. Om samma person besöker tre gånger räknas det som tre besök.',
    visitors:         'Besökare',
    visitorsTip:      'Antalet enskilda personer som besökte din hemsida, var och en räknad en gång oavsett hur många gånger de kom tillbaka.',
    engaged:          'Stannade och engagerade sig',
    engagedTip:       'Andelen besök där någon faktiskt läste eller klickade på något i stället för att lämna direkt — stannade minst 10 sekunder, såg mer än en sida eller gjorde något aktivt.',
    avgVisit:         'Snittbesök',
    avgVisitTip:      'Hur länge besökarna i snitt stannar på din hemsida per besök.',
    leads:            'Förfrågningar från hemsidan',
    leadsTip:         'Antalet gånger någon kontaktade dig via sidan — fyllde i ett formulär, klickade på ditt telefonnummer eller bokade. Visar 0 om inga mål är inställda i Google Analytics än.',
    ofVisits:         'av besöken',
    periodWord:       { Weekly: 'mot förra veckan', Monthly: 'mot förra månaden', Yearly: 'mot förra året' } as Record<Period, string>,
    biggestChange:    'Störst förändring denna period:',
    biggestChangeTip: 'Kanalen som ökat eller minskat mest sedan förra perioden. Klicka på länken för att se alla kanaler.',
    seeAllTraffic:    'Se all trafik →',
    funnelTitle:      'Besökartratt',
    funnelTitleStart: 'Besökartratt sedan start',
    funnelTip:        'Hur dina besökare rör sig genom varje steg — de kommer till sidan, stannar och engagerar sig i innehållet, och kontaktar dig till slut.',
    fVisits:          'Besök',
    fEngaged:         'Engagerade',
    fLeads:           'Förfrågningar',
    fEngagedWord:     'engagerade sig',
    fEngagedPctTip:   'Andelen av besöken som stannade och engagerade sig i innehållet.',
    fBecameLeads:     'blev förfrågningar',
    fBecameLeadsPctTip: 'Andelen av de engagerade besökarna som kontaktade dig.',
    visitsOverTime:   'Besök över tid',
    visitsOverTimeStart: 'Besök sedan start',
    visitsOverTip:    'Hur många som besökte din hemsida över tid. Bra för att se lugna och hektiska perioder, eller om något du gjort gav effekt.',
    compareVs:        'Jämför med',
    compareTip:       'Lägg till liknande företags besökskurvor i diagrammet. Siffran vid namnet är deras besök den senaste perioden.',
    total:            'Totalt',
    byDevice:         'Per enhet',
    desktop:          'Dator',
    mobile:           'Mobil',
  },
  en: {
    visits:           'Visits',
    visitsTip:        'One visit equals one session on your website. If the same person visits three times, that counts as three visits.',
    visitors:         'Visitors',
    visitorsTip:      'The number of individual people who visited your website, each counted once no matter how many times they came back.',
    engaged:          'Stayed and engaged',
    engagedTip:       'The share of visits where someone actually read or clicked something instead of leaving immediately — stayed at least 10 seconds, viewed more than one page, or took an action.',
    avgVisit:         'Avg. visit',
    avgVisitTip:      'How long visitors spend on your website on average per visit.',
    leads:            'Leads from your website',
    leadsTip:         'The number of times someone contacted you through the site — filled in a form, clicked your phone number, or made a booking. Shows 0 if no goals are set up in Google Analytics yet.',
    ofVisits:         'of visits',
    periodWord:       { Weekly: 'Weekly', Monthly: 'Monthly', Yearly: 'Yearly' } as Record<Period, string>,
    biggestChange:    'Biggest change this period:',
    biggestChangeTip: 'The channel that grew or dropped the most since last period. Click the link to see all channels.',
    seeAllTraffic:    'See all traffic →',
    funnelTitle:      'Visitor funnel',
    funnelTitleStart: 'Visitor funnel since we started',
    funnelTip:        'How your visitors move through each stage — arriving on your site, staying and engaging with the content, and finally contacting you.',
    fVisits:          'Visits',
    fEngaged:         'Engaged',
    fLeads:           'Leads',
    fEngagedWord:     'engaged',
    fEngagedPctTip:   'The share of visits that stayed and engaged with the content.',
    fBecameLeads:     'became leads',
    fBecameLeadsPctTip: 'The share of engaged visitors who contacted you.',
    visitsOverTime:   'Visits over time',
    visitsOverTimeStart: 'Visits since we started',
    visitsOverTip:    'How many people visited your website over time. Useful for spotting busy and quiet periods, or seeing whether something you did made a difference.',
    compareVs:        'Compare vs.',
    compareTip:       'Add similar businesses\' visit curves to the chart. The number next to the name is their visits in the latest period.',
    total:            'Total',
    byDevice:         'By device',
    desktop:          'Desktop',
    mobile:           'Mobile',
  },
}

export function OverviewTabTest2({
  data,
  period,
  onGoToTraffic,
}: {
  data:          AnalyticsData
  period:        Period
  onGoToTraffic: () => void
}) {
  const { lang } = useLang()
  const t = T[lang]
  const [activeCompetitors, setActiveCompetitors] = useState<string[]>([])
  const [chartView,         setChartView]         = useState<'total' | 'device'>('total')

  const toggleComp = (name: string) =>
    setActiveCompetitors(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])

  // How far back our record for the site actually reaches. The tag only starts
  // logging the day it is installed, so a delta is safe to draw only once the
  // preceding period is covered too — and a period-scaled total has to be cut
  // back to the days we measured before it goes under a "since we started" heading.
  const coverage  = useCoverage('website', period)
  const showDelta = coverage.state === 'full'

  // Period-aware flow metrics + chart series, derived from the monthly mock.
  // Ratios (engagement, lead rate) are recomputed from the scaled counts so they stay consistent.
  const view = useMemo(() => {
    const cv = (n: number) => coveredValue(n, coverage)
    // Raw period total before the coverage cut — the chart series is derived
    // from it and gets its own trim per bucket further down.
    const fullSessions = scaleFlow(data.sessions, period)
    const sessions     = cv(fullSessions)
    const users        = cv(scaleFlow(data.users, period))
    const conversions  = cv(scaleFlow(data.conversions, period))
    const engaged      = Math.round(sessions * data.engagement_rate)

    const now        = new Date()
    const dateLocale = lang === 'sv' ? 'sv-SE' : 'en-GB'
    let chartValues: number[]
    let chartLabels: string[]
    if (period === 'Weekly') {
      // Last 8 weeks
      chartValues = WEEK_FACTORS.map(f => Math.round(data.sessions / WEEK_DIVISOR * f))
      chartLabels = WEEK_FACTORS.map((_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - (7 - i) * 7)
        return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
      })
    } else if (period === 'Yearly') {
      // Last 3 years
      chartValues = YEAR_SCALES.map(s => Math.round(fullSessions * s))
      chartLabels = YEAR_SCALES.map((_, i) => String(now.getFullYear() - (YEAR_SCALES.length - 1) + i))
    } else {
      // Existing months
      chartValues = data.sessions_trend_mom
      chartLabels = data.sessions_trend_mom.map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (data.sessions_trend_mom.length - 1) + i, 1)
        return d.toLocaleDateString(dateLocale, { month: 'short' })
      })
    }

    const competitorValues = (c: (typeof MOCK_COMPETITORS)[number]): number[] => {
      if (period === 'Weekly') return c.weekly
      if (period === 'Yearly') {
        const yTotal = Math.round((c.monthly[c.monthly.length - 1] ?? 0) * YEAR_FACTOR)
        return YEAR_SCALES.map(s => Math.round(yTotal * s))
      }
      return c.monthly
    }

    return { sessions, users, conversions, engaged, chartValues, chartLabels, competitorValues }
  }, [data, period, lang, coverage])

  // Series trimmed to the buckets our history can honestly fill. The surviving
  // bucket only holds the days we measured, so its value has to shrink to match
  // — otherwise five days of tracking draws a full month's column.
  const buckets     = supportedBuckets(coverage.startedAt, period)
  const chartValues = tail(view.chartValues, buckets).map(v => coveredValue(v, coverage))
  const chartLabels = tail(view.chartLabels, buckets)
  const hasSeries   = chartValues.length >= 2

  const activeCompData: CompetitorLine[] = MOCK_COMPETITORS
    .filter(c => activeCompetitors.includes(c.name))
    .map(c => ({
      name:   c.name,
      color:  c.color,
      values: tail(view.competitorValues(c), buckets),
    }))

  function delta(wow: number, mom: number, yoy: number) {
    return period === 'Weekly' ? wow : period === 'Monthly' ? mom : yoy
  }
  function trend(wow: number[], mom: number[], yoy: number[]) {
    return period === 'Weekly' ? wow : period === 'Monthly' ? mom : yoy
  }

  const convRate      = view.sessions > 0 ? (view.conversions / view.sessions * 100).toFixed(1) : '0.0'
  const engToConvRate = view.engaged  > 0 ? (view.conversions / view.engaged  * 100).toFixed(1) : '0.0'

  const stats = [
    { label: t.visits,   tooltip: t.visitsTip,   value: view.sessions.toLocaleString('sv-SE'),        d: delta(data.sessions_wow, data.sessions_mom, data.sessions_yoy),         t: trend(data.sessions_trend_wow, data.sessions_trend_mom, data.sessions_trend_yoy) },
    { label: t.visitors, tooltip: t.visitorsTip, value: view.users.toLocaleString('sv-SE'),            d: delta(data.users_wow, data.users_mom, data.users_yoy),                   t: trend(data.users_trend_wow, data.users_trend_mom, []) },
    { label: t.engaged,  tooltip: t.engagedTip,  value: `${Math.round(data.engagement_rate * 100)}%`, d: delta(data.engagement_wow, data.engagement_mom, data.engagement_yoy),   t: [] as number[] },
    { label: t.avgVisit, tooltip: t.avgVisitTip, value: fmtDuration(data.avg_session_duration),       d: delta(data.duration_wow, data.duration_mom, data.duration_yoy),         t: [] as number[] },
    { label: t.leads,    tooltip: t.leadsTip,    value: String(view.conversions),                     d: delta(data.conversions_wow, data.conversions_mom, data.conversions_yoy), t: trend(data.conversions_trend_wow, data.conversions_trend_mom, data.conversions_trend_yoy), sub: `${convRate}% ${t.ofVisits}` },
  ]

  // Biggest channel mover this period — one line linking to the Traffic tab
  const movers = data.traffic_sources
    .map(s => ({ ...s, chg: period === 'Weekly' ? s.wow : period === 'Monthly' ? s.mom : s.yoy }))
    .filter(s => s.chg !== 0)
    .sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg))
  const topMover = movers[0]

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map(card => {
          const spark = tail(card.t, buckets)
          return (
            <div key={card.label} className="bg-navy-800 rounded-xl p-4 border border-navy-700 flex flex-col gap-1">
              <Tooltip text={card.tooltip}>
                <p className="text-slate-500 text-xs cursor-default">{card.label}</p>
              </Tooltip>
              <p className="text-white text-xl font-bold leading-tight">{card.value}</p>
              {'sub' in card && card.sub && (
                <p className="text-slate-500 text-xs">{card.sub}</p>
              )}
              {showDelta ? (
                card.d !== 0 && (
                  <p className={`text-xs font-medium ${card.d > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {card.d > 0 ? '↑' : '↓'}{Math.abs(card.d)}% {t.periodWord[period]}
                  </p>
                )
              ) : (
                <div><CoverageNote coverage={coverage} period={period} /></div>
              )}
              {spark.length > 1 && (
                <div className="mt-1"><Sparkline values={spark} positive={card.d >= 0} /></div>
              )}
            </div>
          )
        })}
      </div>

      {/* Biggest mover — one line, links to Traffic */}
      {topMover && (
        <div className="bg-navy-800 rounded-xl border border-navy-700 px-4 py-3 flex items-center gap-3 flex-wrap">
          {showDelta ? (
            <>
              <span className={topMover.chg > 0 ? 'text-green-400' : 'text-red-400'}>{topMover.chg > 0 ? '↑' : '↓'}</span>
              <Tooltip text={t.biggestChangeTip}>
                <p className="flex-1 text-sm text-slate-300 min-w-[200px] cursor-default">
                  {t.biggestChange} <span className="text-white font-medium">{topMover.channel}</span>{' '}
                  <span className={topMover.chg > 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {topMover.chg > 0 ? '+' : ''}{topMover.chg}%
                  </span>
                </p>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip text={t.biggestChangeTip}>
                <p className="flex-1 text-sm text-slate-400 min-w-[200px] cursor-default">{t.biggestChange}</p>
              </Tooltip>
              <CoverageNote coverage={coverage} period={period} />
            </>
          )}
          <button onClick={onGoToTraffic} className="shrink-0 text-xs text-mustard hover:underline">
            {t.seeAllTraffic}
          </button>
        </div>
      )}

      {/* Visitor funnel */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 max-w-2xl">
        <Tooltip text={t.funnelTip}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">
            {coverage.state === 'since-start' ? t.funnelTitleStart : t.funnelTitle}
          </p>
        </Tooltip>
        <div className="flex items-center">
          <div className="flex-1 text-center py-3 px-2 sm:px-4 bg-navy-700/50 rounded-lg">
            <p className="text-slate-500 text-xs mb-1.5">{t.fVisits}</p>
            <p className="text-white text-xl sm:text-2xl font-bold tabular-nums">{view.sessions.toLocaleString('sv-SE')}</p>
          </div>
          <div className="flex flex-col items-center px-2 sm:px-3 shrink-0">
            <Tooltip text={t.fEngagedPctTip}>
              <span className="text-mustard text-xs font-semibold tabular-nums cursor-default">{Math.round(data.engagement_rate * 100)}%</span>
            </Tooltip>
            <div className="flex items-center gap-1 my-1">
              <div className="w-8 h-px bg-navy-600" />
              <span className="text-slate-500 text-xs leading-none">▶</span>
            </div>
            <span className="text-slate-500 text-xs">{t.fEngagedWord}</span>
          </div>
          <div className="flex-1 text-center py-3 px-2 sm:px-4 bg-navy-700/50 rounded-lg">
            <p className="text-slate-500 text-xs mb-1.5">{t.fEngaged}</p>
            <p className="text-white text-xl sm:text-2xl font-bold tabular-nums">{view.engaged.toLocaleString('sv-SE')}</p>
          </div>
          <div className="flex flex-col items-center px-2 sm:px-3 shrink-0">
            <Tooltip text={t.fBecameLeadsPctTip}>
              <span className="text-mustard text-xs font-semibold tabular-nums cursor-default">{engToConvRate}%</span>
            </Tooltip>
            <div className="flex items-center gap-1 my-1">
              <div className="w-8 h-px bg-navy-600" />
              <span className="text-slate-500 text-xs leading-none">▶</span>
            </div>
            <span className="text-slate-500 text-xs">{t.fBecameLeads}</span>
          </div>
          <div className="flex-1 text-center py-3 px-2 sm:px-4 bg-navy-700/50 rounded-lg">
            <p className="text-slate-500 text-xs mb-1.5">{t.fLeads}</p>
            <p className="text-white text-xl sm:text-2xl font-bold tabular-nums">{view.conversions.toLocaleString('sv-SE')}</p>
          </div>
        </div>
      </div>

      {/* Visits over time */}
      <div>
        <Tooltip text={t.visitsOverTip}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">
            {coverage.state === 'since-start' ? t.visitsOverTimeStart : t.visitsOverTime}
          </h2>
        </Tooltip>
        <div className="bg-navy-800 rounded-xl border border-navy-700 px-4 pt-4 pb-3">
          {/* Competitor toggle — a curve needs at least two points to compare against */}
          {hasSeries && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Tooltip text={t.compareTip}>
              <span className="text-slate-500 text-xs font-medium shrink-0 cursor-default">{t.compareVs}</span>
            </Tooltip>
            {MOCK_COMPETITORS.map(comp => {
              const active = activeCompetitors.includes(comp.name)
              return (
                <button
                  key={comp.name}
                  onClick={() => toggleComp(comp.name)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'border-transparent text-navy-950'
                      : 'bg-transparent border-navy-600 text-slate-500 hover:text-slate-300 hover:border-navy-500'
                  }`}
                  style={active ? { backgroundColor: comp.color } : {}}
                >
                  {comp.name}
                  <span className="tabular-nums opacity-70">
                    {view.competitorValues(comp).at(-1)?.toLocaleString('sv-SE')}
                  </span>
                </button>
              )
            })}
          </div>
          )}

          {/* Chart view toggle */}
          {hasSeries && (
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-1 bg-navy-900 p-0.5 rounded-lg">
              {(['total', 'device'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    chartView === v ? 'bg-navy-700 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {v === 'total' ? t.total : t.byDevice}
                </button>
              ))}
            </div>
            {chartView === 'device' && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-blue-500 opacity-70 inline-block" />{t.desktop}</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-blue-300 opacity-50 inline-block" />{t.mobile}</span>
              </div>
            )}
          </div>
          )}

          {/* One bucket of history is a number, not a curve — draw it as one */}
          {!hasSeries && (
            <div className="py-8 text-center">
              <p className="text-white text-3xl font-bold tabular-nums">{(chartValues[0] ?? 0).toLocaleString('sv-SE')}</p>
              <p className="text-slate-500 text-xs mt-1">{chartLabels[0]}</p>
            </div>
          )}
          {hasSeries && chartView === 'total' && (
            <VisitsOverTimeChart values={chartValues} labels={chartLabels} competitors={activeCompData} />
          )}
          {hasSeries && chartView === 'device' && (() => {
            const deskVals   = chartValues.map(v => Math.round(v * data.device_desktop / 100))
            const mobileVals = chartValues.map(v => Math.round(v * data.device_mobile  / 100))
            return <StackedDeviceChart desktop={deskVals} mobile={mobileVals} labels={chartLabels} />
          })()}

          <MeasuringSince coverage={coverage} className="mt-3" />
        </div>
      </div>
    </>
  )
}
