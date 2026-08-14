'use client'
import { useMemo, useState } from 'react'
import { type AdsData, type EditCampaignData } from './types'
import { CampaignsTabTest2 }         from './CampaignsTabTest2'
import { KeywordsTabTest2 }          from './KeywordsTabTest2'
import { AdsTabTest2 }               from './AdsTabTest2'
import { OverviewTabGoogle }        from './OverviewTabGoogle'
import { KeywordsTabGoogle }        from './KeywordsTabGoogle'
import { AdsTabGoogle }             from './AdsTabGoogle'
import { type ProfileForAd }        from './AdPreview'
import { CampaignBuilderWizard }     from './CampaignBuilderWizard'
import { CampaignEditPanel }         from './CampaignEditPanel'
import { type SelectedKeyword }      from './KeywordGeneratorPanel'
import { fmtMicros }                 from './helpers'
import { Tooltip }                   from '@/components/Tooltip'
import { PeriodSelector, type Period, PERIOD_LABEL } from '@/components/dashboard/PeriodSelector'
import { usePlan, hasBooking }       from '@/components/PlanProvider'
import { useLang }                   from '@/components/LanguageProvider'
import { ActionPlanLink }            from '@/components/dashboard/ActionPlanLink'
import { HelpButton }                 from '@/components/dashboard/HelpButton'
import { useCoverage, coveredValue } from '@/components/DataCoverageProvider'
import { CoverageNote, MeasuringSince } from '@/components/dashboard/CoverageNote'

// Booking attribution — mock until the booking page stores UTM/gclid on each
// booking row. Bookings attributed to ads × their service prices (bookings table).
const MOCK_AD_BOOKINGS = { count: 27, revenueSEK: 32_400 }

/* ── Period scaling — deterministic factors, same approach as SEODashboardTest2 ──
 * Flow metrics (spend, clicks, customers, wasted spend) scale with the period:
 * weekly ≈ monthly / 4.3, yearly ≈ monthly × 12. The previous-period factor
 * deliberately differs slightly per period so deltas read plausibly, and the
 * booking-revenue factor differs slightly from the spend factor so the ROAS
 * headline stays in the same ballpark without being identical. No randomness. */
const PERIOD_SCALE: Record<Period, { flow: number; prevFlow: number; revenue: number }> = {
  Weekly:  { flow: 1 / 4.3, prevFlow: (1 / 4.3) * 0.94, revenue: (1 / 4.3) * 0.97 },
  Monthly: { flow: 1,       prevFlow: 1,                revenue: 1 },
  Yearly:  { flow: 12,      prevFlow: 12 * 0.84,        revenue: 12 * 1.05 },
}
const WEEKLY_FACTORS = [0.82, 0.9, 0.86, 0.94, 0.9, 0.97, 0.93, 1.0]  // last 8 weeks
const YEARLY_SCALES  = [0.55, 0.78, 1.0]                              // last 3 years

// Period wording, plus the variant used when the selected period reaches
// further back than our record does — "denna månad" would be a claim we
// cannot stand behind when we only hold part of it.
const PERIOD_WORD: Record<Period | 'SinceStart', { sv: string; en: string }> = {
  Weekly:     { sv: 'denna vecka', en: 'this week' },
  Monthly:    { sv: 'denna månad', en: 'this month' },
  Yearly:     { sv: 'i år',        en: 'this year' },
  SinceStart: { sv: 'sedan start', en: 'since we started' },
}

/* ── Chart truncation ────────────────────────────────────────────────────────
 * Google does not backfill, so a bar covering a stretch we never measured is
 * invention. Work out how many buckets our history actually supports and drop
 * the leading ones — most visible on Yearly, where three year-bars would
 * otherwise be drawn on sixteen months of data. */
const BUCKET_DAYS: Record<Period, number> = { Weekly: 7, Monthly: 30, Yearly: 365 }

function supportedBuckets(startedAt: Date | null, period: Period): number {
  if (!startedAt) return 1
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const heldDays = Math.max(0, Math.floor((midnight.getTime() - startedAt.getTime()) / 86_400_000))
  return Math.max(1, Math.ceil(heldDays / BUCKET_DAYS[period]))
}

// Tooltip texts for elements a rookie could misread
const T: Record<string, { sv: string; en: string }> = {
  roas: {
    sv: 'Bokningsvärdet delat med annonskostnaden. Över 1 betyder att annonserna ger tillbaka mer än de kostar.',
    en: 'Booking value divided by ad spend. Above 1 means the ads return more than they cost.',
  },
  wasted: {
    sv: 'Kostnad för sökningar och sökord som fått klick men aldrig gett en kund. Blockera dem så flyttas budgeten till sökningar som fungerar.',
    en: 'Spend on searches and keywords that got clicks but never produced a customer. Block them to move budget to searches that work.',
  },
  delta: {
    sv: 'Förändring jämfört med förra perioden. Grönt är en förbättring, rött en försämring.',
    en: 'Change compared with the previous period. Green is an improvement, red a decline.',
  },
  budget: {
    sv: 'Stapeln visar hur mycket av månadsbudgeten som är använd. Det vita strecket visar var i månaden du är — ligger stapeln före strecket går pengarna för fort.',
    en: 'The bar shows how much of the monthly budget is used. The white line marks where you are in the month — a bar ahead of the line means spend is running too fast.',
  },
  trend: {
    sv: 'Annonskostnaden per månad de senaste månaderna. Den gula stapeln är nuvarande månad.',
    en: 'Ad spend per month over recent months. The yellow bar is the current month.',
  },
  trendWeekly: {
    sv: 'Annonskostnaden per vecka de senaste 8 veckorna. Den gula stapeln är nuvarande vecka.',
    en: 'Ad spend per week over the last 8 weeks. The yellow bar is the current week.',
  },
  trendYearly: {
    sv: 'Annonskostnaden per år de senaste 3 åren. Den gula stapeln är nuvarande år.',
    en: 'Ad spend per year over the last 3 years. The yellow bar is the current year.',
  },
}

/* ── Tab list — no "Campaigns" tab (it lives inside Overview) ──────────────── */

type TestTab = 'overview' | 'keywords' | 'ads'

const TABS: { id: TestTab; sv: string; en: string }[] = [
  { id: 'overview',  sv: 'Översikt', en: 'Overview'  },
  { id: 'keywords',  sv: 'Sökord',   en: 'Keywords'  },
  { id: 'ads',       sv: 'Annonser', en: 'Ads'       },
]

/* ── Simplified overview — 4 KPIs + wasted-spend alert ─────────────────────── */

function OverviewTabTest2({
  data,
  period = 'Monthly',
  periodLabel = 'MoM',
  onGoToKeywords,
  bookingMode = false,
}: {
  data:           AdsData
  period?:        Period
  periodLabel?:   string
  onGoToKeywords: () => void
  bookingMode?:   boolean
}) {
  const { lang } = useLang()
  const sv = lang === 'sv'

  // How far back our Ads record actually reaches. A change percentage is only
  // safe to render once the preceding period is covered too.
  const coverage  = useCoverage('ads', period)
  const showDelta = coverage.state === 'full'

  // Period-aware figures — flow metrics scale, derived metrics recompute from
  // the scaled values. Budget pacing is left out on purpose: it is inherently
  // monthly and always shows the monthly picture regardless of period.
  //
  // `cv` trims each period-scaled flow figure down to the stretch we actually
  // measured. A yearly total assumes 365 days of spend; under a "sedan start"
  // heading, projecting that from a few weeks of record would be an invention.
  // Ratios (cost per customer, the return multiple) are deliberately left out
  // of the trimming and recomputed from the trimmed figures instead, so they
  // stay in the same ballpark rather than shrinking with the record.
  const view = useMemo(() => {
    const s       = PERIOD_SCALE[period]
    const monthly = period === 'Monthly'
    const cv = (n: number) => coveredValue(n, coverage)
    const scaleSpend = (m: number, stepSEK = 10) =>
      monthly ? m : Math.round((m * s.flow) / (stepSEK * 1_000_000)) * stepSEK * 1_000_000
    const scaleCount = (n: number) => (monthly ? n : Math.round(n * s.flow))

    const rawWastedMicros =
      data.searchTerms.filter(t => t.isWasted).reduce((acc, t) => acc + t.spendMicros, 0) +
      data.keywords.filter(k => k.isWasted).reduce((acc, k) => acc + k.spendMicros, 0)

    // Spend chart — granularity follows the period
    let trend = data.spendTrend
    if (period === 'Weekly') {
      const base = data.spendTrend[data.spendTrend.length - 1]?.spendMicros ?? data.spentToDateMicros
      trend = WEEKLY_FACTORS.map((f, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (WEEKLY_FACTORS.length - 1 - i) * 7)
        return {
          month:       d.toLocaleDateString(sv ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' }),
          spendMicros: scaleSpend(base * f),
        }
      })
    } else if (period === 'Yearly') {
      const total6mo = data.spendTrend.reduce((acc, m) => acc + m.spendMicros, 0)
      const now      = new Date()
      trend = YEARLY_SCALES.map((sc, i) => ({
        month:       String(now.getFullYear() - (YEARLY_SCALES.length - 1) + i),
        spendMicros: Math.round((total6mo * 2 * sc) / 1_000_000_000) * 1_000_000_000,
      }))
    }

    // Never draw further back than our record reaches
    const supported = supportedBuckets(coverage.startedAt, period)
    if (trend.length > supported) trend = trend.slice(-supported)

    // The surviving bucket only holds the days we measured, so its bar has to
    // shrink to match — otherwise a part-year record draws a full year's height.
    trend = trend.map(b => ({ ...b, spendMicros: cv(b.spendMicros) }))

    const rawBookings = monthly ? MOCK_AD_BOOKINGS.count      : Math.round(MOCK_AD_BOOKINGS.count * s.flow)
    const rawRevenue  = monthly ? MOCK_AD_BOOKINGS.revenueSEK : Math.round(MOCK_AD_BOOKINGS.revenueSEK * s.revenue)

    return {
      spentMicros:       cv(scaleSpend(data.spentToDateMicros)),
      totalSpendMicros:  cv(scaleSpend(data.totalSpendMicros)),
      clicks:            cv(scaleCount(data.totalClicks)),
      conversions:       cv(scaleCount(data.totalConversions)),
      bookings:          Math.max(1, cv(rawBookings)),
      bookingRevenueSEK: Math.round(cv(rawRevenue) / 100) * 100,
      wastedMicros:      cv(scaleSpend(rawWastedMicros)),
      prev: {
        spendMicros: Math.round(data.prevPeriod.spendMicros * s.prevFlow),
        clicks:      Math.round(data.prevPeriod.clicks      * s.prevFlow),
        conversions: Math.round(data.prevPeriod.conversions * s.prevFlow),
      },
      trend,
    }
  }, [data, period, sv, coverage])

  const periodKey = coverage.state === 'since-start' ? 'SinceStart' : period
  const pw = sv ? PERIOD_WORD[periodKey].sv : PERIOD_WORD[periodKey].en

  const costPerLead = view.conversions > 0
    ? fmtMicros(view.totalSpendMicros / view.conversions, data.currency)
    : '—'

  // Booking customers see kronor, not counted clicks. Both sides of the ratio
  // are trimmed the same way, so the multiple holds even on a short record —
  // but a source we hold nothing for leaves no ratio to state.
  const adReturn = bookingMode && view.spentMicros > 0
    ? view.bookingRevenueSEK / (view.spentMicros / 1_000_000)
    : null

  const p = view.prev

  const mkDelta = (curr: number, prev: number, lowerIsBetter = false) => {
    if (!prev) return null
    const d    = (curr - prev) / prev * 100
    const good = lowerIsBetter ? d < 0 : d > 0
    return {
      label: `${d > 0 ? '↑' : '↓'}${Math.abs(d).toFixed(1)}% ${periodLabel}`,
      color: good ? 'text-green-400' : 'text-red-400',
    }
  }

  const kpis = [
    {
      label:   sv ? 'Total kostnad' : 'Total spend',
      tooltip: sv
        ? 'Så mycket du har lagt på Google Ads denna månad.'
        : 'How much you have spent on Google Ads this month.',
      value:   fmtMicros(view.spentMicros, data.currency),
      delta:   null,
    },
    bookingMode
      ? {
          label:   sv ? 'Bokningar från annonser' : 'Bookings from ads',
          tooltip: sv
            ? 'Bokningar gjorda via din bokningssida av personer som kom dit via en Google-annons.'
            : 'Bookings made through your booking page by people who arrived via a Google ad.',
          value:   String(view.bookings),
          sub:     sv
            ? `${view.bookingRevenueSEK.toLocaleString('sv-SE')} SEK i bokningsvärde`
            : `${view.bookingRevenueSEK.toLocaleString('sv-SE')} SEK in booking value`,
          delta:   mkDelta(view.bookings, p.conversions),
          highlight: true,
        }
      : {
          label:   sv ? 'Kunder från annonser' : 'Customers from ads',
          tooltip: sv
            ? 'Personer som klickade på din annons och sedan ringde, fyllde i ett formulär eller köpte något.'
            : 'People who clicked your ad and then called, filled in a form, or completed a purchase.',
          value:   view.conversions.toString(),
          delta:   mkDelta(view.conversions, p.conversions),
          highlight: true,
        },
    bookingMode
      ? {
          label:   sv ? 'Kostnad per bokning' : 'Cost per booking',
          tooltip: sv
            ? 'Vad du i snitt betalade i annonser för varje bokning som kom via dem.'
            : 'What you paid in ads on average for each booking that came through them.',
          value:   fmtMicros(view.spentMicros / view.bookings, data.currency),
          sub:     sv
            ? `snittbokning värd ${Math.round(view.bookingRevenueSEK / view.bookings).toLocaleString('sv-SE')} SEK`
            : `avg booking worth ${Math.round(view.bookingRevenueSEK / view.bookings).toLocaleString('sv-SE')} SEK`,
          delta:   null,
        }
      : {
          label:   sv ? 'Kostnad per kund' : 'Cost per customer',
          tooltip: sv
            ? 'Så mycket du i snitt betalade för varje kund som kom via en annons.'
            : 'How much you paid on average for each customer who came through an ad.',
          value:   costPerLead,
          delta:   mkDelta(
            view.conversions > 0 ? view.totalSpendMicros / view.conversions : 0,
            p.conversions > 0    ? p.spendMicros / p.conversions            : 0,
            true,
          ),
        },
    {
      label:   sv ? 'Personer som klickade' : 'People who clicked',
      tooltip: sv
        ? 'Totalt antal klick på dina annonser denna månad.'
        : 'Total number of clicks on your ads this month.',
      value:   view.clicks.toLocaleString('sv-SE'),
      delta:   mkDelta(view.clicks, p.clicks),
    },
  ] as { label: string; tooltip: string; value: string; sub?: string; delta: { label: string; color: string } | null; highlight?: boolean }[]

  // Wasted spend — searches and keywords that cost money but produced no
  // customers. Computed inside `view` so it scales with the selected period.
  const wastedMicros = view.wastedMicros

  // Budget pacing — always monthly, regardless of selected period
  const budgetPct       = Math.min(Math.round(data.spentToDateMicros / data.monthlyBudgetMicros * 100), 100)
  const dayPct          = Math.round(data.daysPassed / data.daysInMonth * 100)
  const dailyRate       = data.daysPassed > 0 ? data.spentToDateMicros / data.daysPassed : 0
  const projectedMicros = Math.round(dailyRate * data.daysInMonth)
  const daysLeft        = data.daysInMonth - data.daysPassed
  const budgetRemaining = data.monthlyBudgetMicros - data.spentToDateMicros
  const daysUntilEmpty  = dailyRate > 0 ? budgetRemaining / dailyRate : Infinity
  const budgetStatus    =
    daysUntilEmpty < daysLeft - 2                      ? 'exhausted' :
    projectedMicros > data.monthlyBudgetMicros * 1.08  ? 'overspend' :
    'on-track'

  const emptyDays = Math.round(daysUntilEmpty)

  // Spend trend
  const fmtK = (micros: number) => {
    const val = micros / 1_000_000
    return val >= 1000
      ? (val / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 }) + 'k'
      : Math.round(val).toLocaleString('sv-SE')
  }
  const maxSpend = Math.max(...view.trend.map(s => s.spendMicros), 1)

  const trendTitle =
    period === 'Weekly' ? (sv ? 'Veckokostnad' : 'Weekly spend') :
    period === 'Yearly' ? (sv ? 'Årskostnad'   : 'Yearly spend') :
    (sv ? 'Månadskostnad' : 'Monthly spend')
  const trendTip =
    period === 'Weekly' ? T.trendWeekly :
    period === 'Yearly' ? T.trendYearly :
    T.trend

  return (
    <>
      {/* The headline: what every spent krona came back as */}
      {bookingMode && adReturn !== null && (
        <div className="bg-green-500/8 rounded-xl border border-green-500/25 px-5 py-4 flex items-center gap-4">
          <Tooltip text={sv ? T.roas.sv : T.roas.en}>
            <p className="text-green-400 text-3xl font-bold tabular-nums shrink-0 cursor-default">{adReturn.toFixed(1)}×</p>
          </Tooltip>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">
              {sv
                ? `Varje krona du la på annonser kom tillbaka som ${adReturn.toFixed(1)} kr i bokningar`
                : `Every krona you spent on ads came back as ${adReturn.toFixed(1)} kr in bookings`}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              {sv ? (
                <>{fmtMicros(view.spentMicros, data.currency)} spenderat → <span className="text-green-400 font-medium">{view.bookingRevenueSEK.toLocaleString('sv-SE')} SEK</span> i bokningsvärde {pw}</>
              ) : (
                <>{fmtMicros(view.spentMicros, data.currency)} spent → <span className="text-green-400 font-medium">{view.bookingRevenueSEK.toLocaleString('sv-SE')} SEK</span> in booking value {pw}</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Wasted-spend alert */}
      {wastedMicros > 0 && (
        <div className="bg-navy-800 rounded-xl border border-red-500/25 px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-red-400 shrink-0">●</span>
          <Tooltip text={sv ? T.wasted.sv : T.wasted.en}>
          <p className="flex-1 text-sm text-slate-300 cursor-default">
            {sv ? (
              <><span className="text-red-400 font-bold">{fmtMicros(wastedMicros, data.currency)}</span> spenderat {pw} på sökningar som aldrig blir kunder</>
            ) : (
              <><span className="text-red-400 font-bold">{fmtMicros(wastedMicros, data.currency)}</span> spent {pw} on searches that never become customers</>
            )}
          </p>
          </Tooltip>
          <button
            onClick={onGoToKeywords}
            className="shrink-0 text-xs bg-mustard hover:bg-mustard/90 text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {sv ? 'Stoppa slöseriet →' : 'Stop the waste →'}
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(c => (
          <div key={c.label} className={`rounded-xl p-4 border ${
            c.highlight ? 'bg-green-500/8 border-green-500/20' : 'bg-navy-800 border-navy-700'
          }`}>
            <Tooltip text={c.tooltip}>
              <p className="text-slate-500 text-xs mb-1 cursor-default">{c.label}</p>
            </Tooltip>
            <p className={`text-2xl font-bold ${c.highlight ? 'text-green-400' : 'text-white'}`}>{c.value}</p>
            {c.sub && <p className="text-slate-500 text-xs mt-1">{c.sub}</p>}
            {showDelta && c.delta ? (
              <Tooltip text={sv ? T.delta.sv : T.delta.en}>
                <p className={`text-xs mt-1.5 cursor-default ${c.delta.color}`}>{c.delta.label}</p>
              </Tooltip>
            ) : !showDelta ? (
              <div className="mt-1.5">
                <CoverageNote coverage={coverage} period={period} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Budget pacing + Spend trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <Tooltip text={sv ? T.budget.sv : T.budget.en}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">{sv ? 'Månadsbudget' : 'Monthly budget'}</p>
          </Tooltip>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-white text-xl font-bold">{fmtMicros(data.spentToDateMicros, data.currency)}</span>
              <span className="text-slate-500 text-sm"> {sv ? 'av' : 'of'} {fmtMicros(data.monthlyBudgetMicros, data.currency)}</span>
            </div>
            <span className="text-slate-500 text-xs">{sv ? 'Dag' : 'Day'} {data.daysPassed} {sv ? 'av' : 'of'} {data.daysInMonth}</span>
          </div>
          <div className="relative h-3 bg-navy-700 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full ${
                budgetStatus === 'exhausted' ? 'bg-red-500' :
                budgetStatus === 'overspend' ? 'bg-yellow-500' :
                'bg-mustard'
              }`}
              style={{ width: `${budgetPct}%` }}
            />
            <div className="absolute top-0 bottom-0 w-0.5 bg-white/25" style={{ left: `${dayPct}%` }} />
          </div>
          <p className={`text-xs font-medium ${
            budgetStatus === 'exhausted' ? 'text-red-400' :
            budgetStatus === 'overspend' ? 'text-yellow-400' :
            'text-green-400'
          }`}>
            {budgetStatus === 'exhausted'
              ? (sv
                  ? `⚠ Budgeten tar slut om ~${emptyDays} dag${emptyDays === 1 ? '' : 'ar'} — annonserna slutar visas`
                  : `⚠ Budget runs out in ~${emptyDays} day${emptyDays === 1 ? '' : 's'} — ads will go dark`)
              : budgetStatus === 'overspend'
              ? (sv
                  ? `⚠ På väg att överskrida budgeten — beräknat ${fmtMicros(projectedMicros, data.currency)}`
                  : `⚠ On track to overspend — projected ${fmtMicros(projectedMicros, data.currency)}`)
              : (sv
                  ? `I fas — beräknat ${fmtMicros(projectedMicros, data.currency)} vid månadens slut`
                  : `On track — projected ${fmtMicros(projectedMicros, data.currency)} by month end`)
            }
          </p>
        </div>

        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <Tooltip text={sv ? trendTip.sv : trendTip.en}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">{trendTitle}</p>
          </Tooltip>
          <div className="flex items-end gap-2 h-36">
            {view.trend.map((s, i) => {
              const barH   = Math.round((s.spendMicros / maxSpend) * 100) + 4
              const isLast = i === view.trend.length - 1
              return (
                <div
                  key={i}
                  /* A lone surviving bucket would otherwise stretch the whole card */
                  className={`flex-1 flex flex-col items-center gap-1 ${view.trend.length < 3 ? 'max-w-[96px]' : ''}`}
                >
                  <span className={`text-xs tabular-nums font-medium ${isLast ? 'text-mustard' : 'text-slate-500'}`}>
                    {fmtK(s.spendMicros)}
                  </span>
                  <div className="flex-1 flex items-end w-full">
                    <div
                      className={`w-full rounded-sm ${isLast ? 'bg-mustard' : 'bg-navy-600'}`}
                      style={{ height: `${barH}px` }}
                    />
                  </div>
                  <span className={`text-xs ${isLast ? 'text-mustard' : 'text-slate-500'}`}>{s.month}</span>
                </div>
              )
            })}
          </div>
          <MeasuringSince coverage={coverage} className="mt-3" />
        </div>

      </div>
    </>
  )
}

/* ── Main test2 dashboard ──────────────────────────────────────────────────── */

type Props = {
  data:             AdsData
  companyIndustry?: string
  companyCity?:     string
  companyCountry?:  string
  gbpConnected?:    boolean
  profile:          ProfileForAd
}

export function PaidSearchDashboardTest2({ data, gbpConnected = false, profile }: Props) {
  const { plan } = usePlan()
  const { lang } = useLang()
  const sv = lang === 'sv'
  const [tab,              setTab]             = useState<TestTab>('overview')
  const [period,           setPeriod]          = useState<Period>('Monthly')
  const [showBuilder,      setShowBuilder]     = useState(false)
  const [seedKeywords,     setSeedKeywords]    = useState<SelectedKeyword[]>([])
  const [editCampaignData, setEditCampaignData]= useState<EditCampaignData | null>(null)
  const periodLabel = PERIOD_LABEL[period]

  // How far back our Ads record reaches — the campaign figures below are
  // period-scaled flows and have to be trimmed to it, same as the overview.
  const coverage = useCoverage('ads', period)

  // Campaign list with period-scaled flow metrics (spend, clicks, impressions,
  // customers), each trimmed to the days we hold. State stays untouched:
  // status, daily budgets, avg CPC, quality scores. Same deterministic factors
  // as the overview. Per-campaign cost per customer is derived downstream from
  // these trimmed figures, so the ratio stays put while the totals shrink.
  const campaignData = useMemo<AdsData>(() => {
    const monthly = period === 'Monthly'
    if (monthly && coverage.state !== 'since-start') return data
    const s = PERIOD_SCALE[period]
    const cv = (n: number) => coveredValue(n, coverage)
    const scaleCount = (n: number) => cv(monthly ? n : Math.round(n * s.flow))
    const scaleSpend = (m: number, stepSEK = 10) =>
      cv(monthly ? m : Math.round((m * s.flow) / (stepSEK * 1_000_000)) * stepSEK * 1_000_000)
    return {
      ...data,
      campaigns: data.campaigns.map(c => ({
        ...c,
        spendMicros: scaleSpend(c.spendMicros),
        clicks:      scaleCount(c.clicks),
        impressions: scaleCount(c.impressions),
        conversions: scaleCount(c.conversions),
      })),
      keywords: data.keywords.map(k => ({
        ...k,
        spendMicros: scaleSpend(k.spendMicros, 1),
        clicks:      scaleCount(k.clicks),
        impressions: scaleCount(k.impressions),
        conversions: scaleCount(k.conversions),
      })),
    }
  }, [data, period, coverage])

  function closeBuilder() {
    setShowBuilder(false)
    setSeedKeywords([])
    setEditCampaignData(null)
  }

  function openBuilderWithKeywords(keywords: SelectedKeyword[]) {
    setSeedKeywords(keywords)
    setShowBuilder(true)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-end justify-between border-b border-navy-700 flex-wrap gap-y-2">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? 'text-white border-mustard'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {sv ? t.sv : t.en}
              </button>
            ))}
          </div>
          <div className="mb-2 flex items-center gap-3">
            <button
              onClick={() => { setSeedKeywords([]); setShowBuilder(true) }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-mustard hover:bg-mustard/90 text-navy-950 text-xs font-semibold rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {sv ? 'Ny kampanj' : 'New campaign'}
            </button>
            <PeriodSelector period={period} onChange={setPeriod} />
            <HelpButton topic="annonser" section={tab} />
          </div>
        </div>

        {tab === 'overview' && (
          <>
            {/* testbok2 is where the Google-only rebuild is being tried out —
                the other two modes keep the existing overview so the change
                can be looked at side by side rather than remembered. */}
            {plan === 'testbok2' ? (
              <OverviewTabGoogle
                data={data}
                period={period}
                periodLabel={periodLabel}
                onGoToKeywords={() => setTab('keywords')}
              />
            ) : (
              <OverviewTabTest2
                data={data}
                period={period}
                periodLabel={periodLabel}
                onGoToKeywords={() => setTab('keywords')}
                bookingMode={hasBooking(plan)}
              />
            )}
            <CampaignsTabTest2 data={campaignData} period={period} onGoToTab={t => setTab(t)} />
          </>
        )}

        {tab === 'keywords' && (
          plan === 'testbok2'
            ? <KeywordsTabGoogle data={data} onAddToCampaign={openBuilderWithKeywords} />
            : <KeywordsTabTest2  data={data} onAddToCampaign={openBuilderWithKeywords} />
        )}

        {tab === 'ads' && (
          plan === 'testbok2'
            ? <AdsTabGoogle data={data} gbpConnected={gbpConnected} profile={profile} />
            : <AdsTabTest2  data={data} />
        )}

        <ActionPlanLink context={sv ? 'Vill du få ut mer av din annonsbudget?' : 'Want more out of your ad budget?'} />
      </div>

      {showBuilder && !editCampaignData && (
        <CampaignBuilderWizard
          data={data}
          seedKeywords={seedKeywords}
          onClose={closeBuilder}
        />
      )}

      {editCampaignData && (
        <CampaignEditPanel
          editData={editCampaignData}
          currency={data.currency}
          onClose={closeBuilder}
        />
      )}
    </>
  )
}
