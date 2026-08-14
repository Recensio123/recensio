'use client'
import { useMemo } from 'react'
import { type AdsData } from './types'
import { fmtMicros } from './helpers'
import { Tooltip } from '@/components/Tooltip'
import { type Period } from '@/components/dashboard/PeriodSelector'
import { useLang } from '@/components/LanguageProvider'
import { useCoverage, coveredValue } from '@/components/DataCoverageProvider'
import { CoverageNote, MeasuringSince } from '@/components/dashboard/CoverageNote'

/*
 * The overview, restricted to what Google Ads actually reports.
 *
 * Same sections as before — a spend signal, four key figures, a budget card, a
 * spend chart — but every number on screen is one Google returns, and nothing
 * is a verdict of ours dressed as a measurement. What changed, and why:
 *
 * The return headline ("every krona came back as 1.7×") is gone. It was built
 * from two constants written into the source, and bookings are our data, not
 * Google's. It belongs here eventually, fed from our own booking rows matched
 * to the ad click via gclid — that is a genuinely strong figure Google cannot
 * produce on its own, and it should arrive as measurement, not as a placeholder.
 *
 * "Wasted spend" became "keywords with no conversions". Google never labels
 * anything wasted; the old threshold — over five kronor with zero conversions —
 * was ours, and five kronor is one click. The figure also summed keywords and
 * search terms together, which double-counts: a search term's cost is already
 * inside its keyword's cost. Now it counts keywords once and states the fact.
 *
 * The monthly budget ceiling and the "runs out in ~8 days" forecast are gone.
 * Google Ads has no monthly budget — it has a daily budget per campaign, and
 * it may spend up to twice that on a given day while balancing over the month.
 * The card now shows the daily budgets Google holds and what has actually been
 * spent, with no invented ceiling and no projection.
 *
 * Cost per customer comes from metrics.cost_per_conversion rather than our own
 * division, so it matches what the customer sees inside Google Ads.
 *
 * Everything here also survives an account with no conversion tracking, which
 * is most small salons. Without it Google reports zero conversions, and the old
 * page would then flag every keyword as waste and tell them to block their
 * whole account. Now the absence is stated instead.
 */

/* ── Period scaling ──────────────────────────────────────────────────────────
 * A mock artefact, not a display figure: the example account is monthly at the
 * source, so flow metrics are scaled to fill the other periods. On a live
 * account the period is a date range sent to Google and none of this runs. */
const PERIOD_SCALE: Record<Period, { flow: number; prevFlow: number }> = {
  Weekly:  { flow: 1 / 4.3, prevFlow: (1 / 4.3) * 0.94 },
  Monthly: { flow: 1,       prevFlow: 1 },
  Yearly:  { flow: 12,      prevFlow: 12 * 0.84 },
}

const PERIOD_WORD: Record<Period | 'SinceStart', { sv: string; en: string }> = {
  Weekly:     { sv: 'denna vecka', en: 'this week' },
  Monthly:    { sv: 'denna månad', en: 'this month' },
  Yearly:     { sv: 'i år',        en: 'this year' },
  SinceStart: { sv: 'sedan start', en: 'since we started' },
}

const BUCKET_DAYS: Record<Period, number> = { Weekly: 7, Monthly: 30, Yearly: 365 }

/* Google does not backfill, so a bar covering a stretch we never measured
   would be invention. */
function supportedBuckets(startedAt: Date | null, period: Period): number {
  if (!startedAt) return 1
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const heldDays = Math.max(0, Math.floor((midnight.getTime() - startedAt.getTime()) / 86_400_000))
  return Math.max(1, Math.ceil(heldDays / BUCKET_DAYS[period]))
}

const T = {
  sv: {
    noConvLead:    'gick till sökord som inte gav någon konvertering',
    noConvSub:     (n: number) => `${n} sökord med klick men noll konverteringar`,
    noConvTip:     'Google räknar en konvertering när någon gör det du valt att mäta — ringer, bokar eller fyller i ett formulär. Sökorden här har kostat pengar utan att någon gjort det. Det säger inte i sig att de är dåliga: ett sökord kan behöva fler klick innan en konvertering hinner ske.',
    seeKeywords:   'Se sökorden →',
    noTrackTitle:  'Google rapporterar inga konverteringar för kontot',
    noTrackSub:    'Utan konverteringsmätning vet Google inte vad som händer efter klicket, och då går det inte att säga vilka sökord som ger kunder. Det är en inställning i Google Ads.',
    spend:         'Total kostnad',
    spendTip:      'metrics.cost_micros — vad Google fakturerat för perioden.',
    customers:     'Kunder från annonser',
    customersTip:  'metrics.conversions — antalet gånger någon gjorde det du valt att mäta som konvertering efter att ha klickat på en annons.',
    noTracking:    'Ingen konverteringsmätning',
    costPer:       'Kostnad per kund',
    costPerTip:    'metrics.cost_per_conversion — Googles eget tal, inte vår division. Google räknar konverteringen till dagen för klicket, vilket kan skilja sig något från kostnad delat med antal.',
    clicks:        'Personer som klickade',
    clicksTip:     'metrics.clicks — antal klick på dina annonser under perioden.',
    deltaTip:      'Förändring mot föregående period, hämtad som ett eget datumintervall från Google.',
    budget:        'Dagsbudget',
    budgetTip:     'Google Ads har ingen månadsbudget. Varje kampanj har en dagsbudget, och Google får spendera upp till det dubbla en enskild dag så länge månaden går jämnt ut. Talen här är kampanjernas dagsbudgetar och vad som faktiskt kostat.',
    budgetSum:     'Summa dagsbudget',
    budgetActive:  (n: number) => `${n} aktiv${n === 1 ? '' : 'a'} kampanj${n === 1 ? '' : 'er'}`,
    spentSoFar:    'Spenderat denna månad',
    perDay:        'Snittkostnad per dag',
    ofDays:        (d: number) => `över ${d} dagar`,
    trendMonthly:  'Månadskostnad',
    trendWeekly:   'Veckokostnad',
    trendYearly:   'Årskostnad',
    trendTip:      'segments.month, segments.week eller segments.year — Googles egen uppdelning av kostnaden över tid.',
  },
  en: {
    noConvLead:    'went to keywords that produced no conversions',
    noConvSub:     (n: number) => `${n} keywords with clicks but zero conversions`,
    noConvTip:     'Google counts a conversion when someone does the thing you chose to measure — calls, books, or fills in a form. These keywords cost money without anyone doing it. That alone does not make them bad: a keyword may need more clicks before a conversion has time to happen.',
    seeKeywords:   'See the keywords →',
    noTrackTitle:  'Google reports no conversions for this account',
    noTrackSub:    'Without conversion tracking Google does not know what happens after the click, so there is no way to say which keywords bring customers. It is a setting inside Google Ads.',
    spend:         'Total spend',
    spendTip:      'metrics.cost_micros — what Google billed for the period.',
    customers:     'Customers from ads',
    customersTip:  'metrics.conversions — the number of times someone did what you chose to measure as a conversion after clicking an ad.',
    noTracking:    'No conversion tracking',
    costPer:       'Cost per customer',
    costPerTip:    'metrics.cost_per_conversion — Google’s own figure, not our division. Google counts a conversion against the day of the click, which can differ slightly from spend divided by count.',
    clicks:        'People who clicked',
    clicksTip:     'metrics.clicks — clicks on your ads during the period.',
    deltaTip:      'Change against the previous period, fetched from Google as its own date range.',
    budget:        'Daily budget',
    budgetTip:     'Google Ads has no monthly budget. Each campaign has a daily budget, and Google may spend up to twice that on a given day as long as the month balances out. These figures are the campaigns’ daily budgets and what has actually been spent.',
    budgetSum:     'Total daily budget',
    budgetActive:  (n: number) => `${n} active campaign${n === 1 ? '' : 's'}`,
    spentSoFar:    'Spent this month',
    perDay:        'Average spend per day',
    ofDays:        (d: number) => `across ${d} days`,
    trendMonthly:  'Monthly spend',
    trendWeekly:   'Weekly spend',
    trendYearly:   'Yearly spend',
    trendTip:      'segments.month, segments.week or segments.year — Google’s own breakdown of spend over time.',
  },
}

export function OverviewTabGoogle({
  data,
  period = 'Monthly',
  periodLabel = 'MoM',
  onGoToKeywords,
}: {
  data:           AdsData
  period?:        Period
  periodLabel?:   string
  onGoToKeywords: () => void
}) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const t  = T[lang]

  const coverage  = useCoverage('ads', period)
  const showDelta = coverage.state === 'full'

  const view = useMemo(() => {
    const s       = PERIOD_SCALE[period]
    const monthly = period === 'Monthly'
    const cv = (n: number) => coveredValue(n, coverage)
    const scaleSpend = (m: number) =>
      monthly ? m : Math.round((m * s.flow) / 10_000_000) * 10_000_000
    const scaleCount = (n: number) => (monthly ? n : Math.round(n * s.flow))

    /* Keywords only. A search term's cost is already counted inside the
     * keyword that triggered it, so adding both would bill the salon twice
     * for the same click. */
    const noConv = data.keywords.filter(k => k.conversions === 0 && k.spendMicros > 0)

    const series =
      period === 'Weekly' ? data.spendTrendWeekly :
      period === 'Yearly' ? data.spendTrendYearly :
      data.spendTrend
    let trend = series ?? data.spendTrend

    const supported = supportedBuckets(coverage.startedAt, period)
    if (trend.length > supported) trend = trend.slice(-supported)
    trend = trend.map(b => ({ ...b, spendMicros: cv(b.spendMicros) }))

    return {
      spentMicros:  cv(scaleSpend(data.spentToDateMicros)),
      clicks:       cv(scaleCount(data.totalClicks)),
      conversions:  cv(scaleCount(data.totalConversions)),
      noConvMicros: cv(scaleSpend(noConv.reduce((acc, k) => acc + k.spendMicros, 0))),
      noConvCount:  noConv.length,
      prev: {
        spendMicros: Math.round(data.prevPeriod.spendMicros * s.prevFlow),
        clicks:      Math.round(data.prevPeriod.clicks      * s.prevFlow),
        conversions: Math.round(data.prevPeriod.conversions * s.prevFlow),
      },
      trend,
    }
  }, [data, period, coverage])

  const pw = sv
    ? PERIOD_WORD[coverage.state === 'since-start' ? 'SinceStart' : period].sv
    : PERIOD_WORD[coverage.state === 'since-start' ? 'SinceStart' : period].en

  /* No conversions anywhere in the account is almost always a missing setting,
   * not a hundred bad keywords. Saying so is the honest reading. */
  const noTracking = data.totalConversions === 0

  const mkDelta = (curr: number, prev: number, lowerIsBetter = false) => {
    if (!prev) return null
    const d    = (curr - prev) / prev * 100
    const good = lowerIsBetter ? d < 0 : d > 0
    return {
      label: `${d > 0 ? '↑' : '↓'}${Math.abs(d).toFixed(1)}% ${periodLabel}`,
      color: good ? 'text-green-400' : 'text-red-400',
    }
  }

  const p = view.prev

  const kpis: {
    label: string; tooltip: string; value: string; sub?: string
    delta: { label: string; color: string } | null; highlight?: boolean
  }[] = [
    {
      label:   t.spend,
      tooltip: t.spendTip,
      value:   fmtMicros(view.spentMicros, data.currency),
      delta:   mkDelta(view.spentMicros, p.spendMicros),
    },
    {
      label:     t.customers,
      tooltip:   t.customersTip,
      value:     noTracking ? '—' : String(view.conversions),
      sub:       noTracking ? t.noTracking : undefined,
      delta:     noTracking ? null : mkDelta(view.conversions, p.conversions),
      highlight: !noTracking,
    },
    {
      label:   t.costPer,
      tooltip: t.costPerTip,
      // Google's own figure. Absent or zero conversions leaves nothing to state.
      value:   noTracking || !data.costPerConversionMicros
        ? '—'
        : fmtMicros(data.costPerConversionMicros, data.currency),
      delta:   null,
    },
    {
      label:   t.clicks,
      tooltip: t.clicksTip,
      value:   view.clicks.toLocaleString('sv-SE'),
      delta:   mkDelta(view.clicks, p.clicks),
    },
  ]

  /* Budget — Google's unit is the campaign's daily budget. Paused campaigns
   * spend nothing, so only enabled ones count towards the day's ceiling. */
  const activeCampaigns = data.campaigns.filter(c => c.status === 'Enabled')
  const dailyBudgetSum  = activeCampaigns.reduce((acc, c) => acc + c.dailyBudgetMicros, 0)
  const perDayMicros    = data.daysPassed > 0 ? Math.round(data.spentToDateMicros / data.daysPassed) : 0

  const fmtK = (micros: number) => {
    const val = micros / 1_000_000
    return val >= 1000
      ? (val / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 }) + 'k'
      : Math.round(val).toLocaleString('sv-SE')
  }
  const maxSpend = Math.max(...view.trend.map(s => s.spendMicros), 1)

  const trendTitle =
    period === 'Weekly' ? t.trendWeekly :
    period === 'Yearly' ? t.trendYearly :
    t.trendMonthly

  return (
    <>
      {/* Keywords Google reports no conversions for */}
      {noTracking ? (
        <div className="bg-navy-800 rounded-xl border border-navy-600 px-4 py-3 flex items-start gap-3">
          <span className="text-slate-400 shrink-0 mt-0.5">●</span>
          <div className="flex-1">
            <p className="text-sm text-slate-300">{t.noTrackTitle}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.noTrackSub}</p>
          </div>
        </div>
      ) : view.noConvMicros > 0 && (
        <div className="bg-navy-800 rounded-xl border border-mustard/25 px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-mustard shrink-0">●</span>
          <Tooltip text={t.noConvTip}>
            <div className="flex-1 cursor-default">
              <p className="text-sm text-slate-300">
                <span className="text-mustard font-bold">{fmtMicros(view.noConvMicros, data.currency)}</span>
                {' '}{t.noConvLead}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{t.noConvSub(view.noConvCount)} · {pw}</p>
            </div>
          </Tooltip>
          <button
            onClick={onGoToKeywords}
            className="shrink-0 text-xs bg-navy-700 hover:bg-navy-600 text-slate-200 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {t.seeKeywords}
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
              <Tooltip text={t.deltaTip}>
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

      {/* Daily budget + spend chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <Tooltip text={t.budgetTip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">{t.budget}</p>
          </Tooltip>
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 text-xs">{t.budgetSum}</span>
              <span className="text-white text-xl font-bold tabular-nums">
                {fmtMicros(dailyBudgetSum, data.currency)}<span className="text-slate-500 text-sm font-normal">/{sv ? 'dag' : 'day'}</span>
              </span>
            </div>
            <p className="text-slate-600 text-xs -mt-2 text-right">{t.budgetActive(activeCampaigns.length)}</p>

            <div className="border-t border-navy-700 pt-3 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-500 text-xs">{t.spentSoFar}</span>
                <span className="text-slate-200 text-sm font-semibold tabular-nums">
                  {fmtMicros(data.spentToDateMicros, data.currency)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-500 text-xs">{t.perDay}</span>
                <span className="text-slate-200 text-sm font-semibold tabular-nums">
                  {fmtMicros(perDayMicros, data.currency)}
                </span>
              </div>
              <p className="text-slate-600 text-xs text-right">{t.ofDays(data.daysPassed)}</p>
            </div>
          </div>
        </div>

        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <Tooltip text={t.trendTip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">{trendTitle}</p>
          </Tooltip>
          <div className="flex items-end gap-2 h-36">
            {view.trend.map((s, i) => {
              const barH   = Math.round((s.spendMicros / maxSpend) * 100) + 4
              const isLast = i === view.trend.length - 1
              return (
                <div
                  key={i}
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
