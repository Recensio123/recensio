'use client'
import { useMemo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { type GBPData } from './types'
import { type Period } from '@/components/dashboard/PeriodSelector'
import { usePlan, hasBooking } from '@/components/PlanProvider'
import { useLang } from '@/components/LanguageProvider'
import { useCoverage, coveredValue } from '@/components/DataCoverageProvider'
import { CoverageNote, MeasuringSince } from '@/components/dashboard/CoverageNote'
import { KomIgangKort } from './KomIgangKort'
import { KonkurrentKort } from './KonkurrentKort'

// Booking attribution — mock until the booking page stores its referrer.
// Bookings whose visit started from the GBP listing's booking link.
const MOCK_GBP_BOOKINGS = { count: 9, revenueSEK: 8_400 }

const BUCKET_DAYS: Record<Period, number> = { Weekly: 7, Monthly: 30, Yearly: 365 }

/** How many chart buckets the history we hold actually supports. */
function supportedBuckets(startedAt: Date | null, period: Period): number {
  if (!startedAt) return 1
  const held = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 86_400_000))
  return Math.max(1, Math.ceil(held / BUCKET_DAYS[period]))
}

// Period scaling for FLOW metrics (things that accumulate: views, calls,
// directions, website clicks, bookings). Weekly ≈ monthly / 4.3; yearly ≈
// monthly × 12 with plausible growth (earlier months ran slower, so the year
// total lands below a flat ×12). Fixed deterministic factors — no randomness.
const FLOW_SCALE: Record<Period, number> = {
  Weekly:  1 / 4.3,
  Monthly: 1,
  Yearly:  11.2,
}

// Previous-period divisors for delta calculation — WoW, MoM and YoY should
// not show identical percentages. Monthly uses the real prev-month mock data;
// these fixed factors shape the weekly and yearly comparisons.
// prev = curr / factor  →  factor 1.042 renders as ↑4.2%, 0.973 as ↓2.7%.
const DELTA_FACTOR: Record<'Weekly' | 'Yearly', { views: number; actions: number }> = {
  Weekly: { views: 1.042, actions: 0.973 },
  Yearly: { views: 1.316, actions: 1.248 },
}

const T = {
  sv: {
    needsAttention:    'Behöver din uppmärksamhet',
    allCaughtUp:       'Allt klart — inget behöver din uppmärksamhet just nu.',
    reviewsWaiting:    (n: number) => `${n} recension${n === 1 ? '' : 'er'} väntar på svar`,
    replyNow:          'Svara nu',
    noPost:            (d: number) => `Inget inlägg på ${Math.round(d / 30)} månader — dags igen (texten är redan skriven åt dig)`,
    writePost:         'Skriv ett inlägg',
    setupLink:         'Profilens uppsättning',
    actionsTooltip:    'Riktiga kundhändelser direkt från din Google-profil denna månad — det tydligaste måttet på vad profilen ger ditt företag.',
    actionsTitle:      { Weekly: 'Vad din profil gav dig denna vecka', Monthly: 'Vad din profil gav dig denna månad', Yearly: 'Vad din profil gav dig i år' } as Record<Period, string>,
    actionsTitleStart: 'Vad din profil gav dig sedan start',
    bookedViaProfile:  'Bokade via din profil',
    calledYou:         'Personer ringde dig',
    askedDirections:   'Sökte vägbeskrivning',
    visitedWebsite:    'Besökte din hemsida',
    bookedTooltip:     'Kunder som bokade efter att ha klickat på bokningslänken i din profil. Summan räknas på dina faktiska bokningar.',
    calledTooltip:     'Antal gånger någon tryckte på ring-knappen på din profil under perioden. Varje samtal är en möjlig kund.',
    directionsTooltip: 'Antal gånger någon bad Google om vägen till din adress — ett starkt tecken på ett planerat besök.',
    websiteTooltip:    'Antal klick från din profil vidare till din hemsida. Personen ville veta mer innan den hörde av sig.',
    deltaTooltip:      'Förändringen jämfört med föregående period. Grön pil betyder uppåt, röd betyder nedåt.',
    legendMapsTip:     'Visningar från personer som sökte efter din typ av tjänst på kartan — utan att känna till ditt namn.',
    legendSearchTip:   'Visningar från personer som sökte på ditt företagsnamn. De kände redan till dig.',
    ratingTooltip:     'Ditt genomsnittliga stjärnbetyg från alla Google-recensioner. Det mest synliga förtroendetecknet på din profil.',
    averageRating:     'Snittbetyg',
    reviews:           'recensioner',
    findTooltip:       'Hur många gånger din profil visades på Google, och var. Visningar på Maps är personer som söker efter din typ av tjänst — växer de vinner din profil nya kunder.',
    findTitle:         'Så hittar folk dig',
    legendMaps:        'Hittade dig på Maps',
    legendSearch:      'Sökte på ditt namn',
  },
  en: {
    needsAttention:    'Needs attention',
    allCaughtUp:       'All caught up — nothing needs your attention right now.',
    reviewsWaiting:    (n: number) => `${n} review${n === 1 ? '' : 's'} waiting for a reply`,
    replyNow:          'Reply now',
    noPost:            (d: number) => `No post in ${Math.round(d / 30)} months — time for another (the text is already written for you)`,
    writePost:         'Write a post',
    setupLink:         'Profile setup',
    actionsTooltip:    'Real customer actions taken directly from your Google listing this month — the clearest measure of what your profile is doing for your business.',
    actionsTitle:      { Weekly: 'What your profile brought in this week', Monthly: 'What your profile brought in this month', Yearly: 'What your profile brought in this year' } as Record<Period, string>,
    actionsTitleStart: 'What your profile brought in since we started',
    bookedViaProfile:  'Booked via your profile',
    calledYou:         'People called you',
    askedDirections:   'Asked for directions',
    visitedWebsite:    'Visited your website',
    bookedTooltip:     'Customers who booked after clicking the booking link on your listing. The amount is based on your actual bookings.',
    calledTooltip:     'How many times someone tapped the call button on your listing this period. Every call is a potential customer.',
    directionsTooltip: 'How many times someone asked Google for directions to your address — a strong sign of a planned visit.',
    websiteTooltip:    'Clicks from your listing through to your website. These people wanted to know more before reaching out.',
    deltaTooltip:      'The change versus the previous period. A green arrow means up, red means down.',
    legendMapsTip:     'Views from people searching for your type of service on the map — without knowing your name.',
    legendSearchTip:   'Views from people who searched for your business name. They already knew about you.',
    ratingTooltip:     'Your average star rating across all Google reviews. The single most visible trust signal on your listing.',
    averageRating:     'Average rating',
    reviews:           'reviews',
    findTooltip:       'How many times your listing was seen on Google, and where. Maps views are people searching for your type of service — growing Maps views means your listing is winning new customers.',
    findTitle:         'How people find you',
    legendMaps:        'Found you on Maps',
    legendSearch:      'Searched your name',
  },
}

export function OverviewTabTest2({
  data,
  period      = 'Monthly',
  periodLabel = 'MoM',
  auditPassed = 0,
  auditTotal  = 8,
  onTabChange,
}: {
  data:          GBPData
  period?:       Period
  periodLabel?:  string
  /** The one-time setup only — the recurring items live in the list below. */
  auditPassed?:  number
  auditTotal?:   number
  onTabChange?:  (tab: string) => void
}) {
  const { plan } = usePlan()
  const { lang } = useLang()
  const t = T[lang]
  const bookingMode  = hasBooking(plan)

  // How far back our record for this source actually reaches. A delta is only
  // safe to render once the preceding period is covered too.
  const coverage = useCoverage('gbp', period)
  const showDelta = coverage.state === 'full'

  // Period-scaled FLOW metrics — derived from the monthly mock (GBPData).
  // STATE metrics (rating, review counts, checklist, days since post) are
  // deliberately not scaled: they describe current status, not a flow.
  const stats = useMemo(() => {
    const f = FLOW_SCALE[period]
    const cv = (n: number) => coveredValue(n, coverage)
    const callClicks        = cv(Math.round(data.callClicks        * f))
    const directionRequests = cv(Math.round(data.directionRequests * f))
    const websiteClicks     = cv(Math.round(data.websiteClicks     * f))
    const views             = cv(Math.round(data.monthlyViews      * f))
    const actions           = callClicks + directionRequests + websiteClicks
    const bookings          = Math.max(1, cv(Math.round(MOCK_GBP_BOOKINGS.count * f)))
    const revenueSEK        = Math.round(cv(Math.round(MOCK_GBP_BOOKINGS.revenueSEK * f)) / 100) * 100

    const prevViews   = period === 'Monthly'
      ? data.prevMonthViews
      : Math.round(views   / DELTA_FACTOR[period].views)
    const prevActions = period === 'Monthly'
      ? data.prevMonthActions
      : Math.round(actions / DELTA_FACTOR[period].actions)

    return { callClicks, directionRequests, websiteClicks, views, actions, bookings, revenueSEK, prevViews, prevActions }
  }, [period, coverage, data.callClicks, data.directionRequests, data.websiteClicks, data.monthlyViews, data.prevMonthViews, data.prevMonthActions])

  // Delta vs previous period (WoW / MoM / YoY)
  const mkDelta = (curr: number, prev: number) => {
    if (!prev) return null
    const d = (curr - prev) / prev * 100
    return {
      label: `${d > 0 ? '↑' : '↓'}${Math.abs(d).toFixed(1)}% ${periodLabel}`,
      color: d > 0 ? 'text-green-400' : 'text-red-400',
    }
  }
  const viewsDelta   = mkDelta(stats.views,   stats.prevViews)
  const actionsDelta = mkDelta(stats.actions, stats.prevActions)

  // Needs-attention items — merged from the old shortcut cards
  const attention: { text: string; button: string; tab: string; urgent: boolean }[] = []
  if (data.unansweredReviews > 0) {
    attention.push({
      text:   t.reviewsWaiting(data.unansweredReviews),
      button: t.replyNow,
      tab:    'reviews',
      urgent: data.unansweredReviews >= 3,
    })
  }
  /* Half a year, not a month. Posting is something a salon does a few times
   * a year; asking every month turned an occasional job into a standing
   * reproach, and a list that is always full is a list nobody reads. */
  if (data.daysSincePost > 180) {
    attention.push({
      text:   t.noPost(data.daysSincePost),
      button: t.writePost,
      tab:    'content',
      urgent: data.daysSincePost > 365,
    })
  }

  // Stacked bar chart — granularity driven by selected period, Maps/Search
  // split kept in every granularity. Derived from the monthly mock trend
  // with fixed deterministic factors (no randomness in render).
  const chartTrend = useMemo(() => {
    const series = (() => {
    if (period === 'Weekly') {
      // Last 8 weeks — derived from the latest month split at ~4.3 weeks/month
      const base       = data.viewsTrend[data.viewsTrend.length - 1]
      const searchBase = Math.round((base?.searchViews ?? 3_780) / 4.3)
      const mapsBase   = Math.round((base?.mapsViews   ?? 4_620) / 4.3)
      const factors    = [0.88, 0.92, 0.85, 0.95, 1.02, 0.98, 1.05, 1.0]
      return Array.from({ length: 8 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (7 - i) * 7)
        const label = d.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' })
        return {
          month:       label,
          searchViews: Math.round(searchBase * factors[i]),
          mapsViews:   Math.round(mapsBase   * factors[i]),
        }
      })
    }
    if (period === 'Yearly') {
      // Last 3 years — annualise the 6-month mock trend (×2), earlier years
      // scaled down to show plausible growth
      const now         = new Date()
      const totalSearch = data.viewsTrend.reduce((s, v) => s + v.searchViews, 0)
      const totalMaps   = data.viewsTrend.reduce((s, v) => s + v.mapsViews,   0)
      const scales      = [0.58, 0.78, 1.0]
      return Array.from({ length: 3 }, (_, i) => ({
        month:       String(now.getFullYear() - 2 + i),
        searchViews: Math.round(totalSearch * 2 * scales[i]),
        mapsViews:   Math.round(totalMaps   * 2 * scales[i]),
      }))
    }
    return data.viewsTrend
    })()

    // Never draw buckets our record does not reach back to — three year-bars
    // on sixteen months of history would be an invention, not a chart.
    const max     = supportedBuckets(coverage.startedAt, period)
    const trimmed = series.length > max ? series.slice(series.length - max) : series

    // The surviving bucket only holds the days we measured, so its bar has to
    // shrink to match — otherwise a 40-day record draws a full year's height.
    return trimmed.map(v => ({
      ...v,
      searchViews: coveredValue(v.searchViews, coverage),
      mapsViews:   coveredValue(v.mapsViews,   coverage),
    }))
  }, [period, data.viewsTrend, lang, coverage])

  const maxTotal = Math.max(...chartTrend.map(v => v.searchViews + v.mapsViews), 1)
  const MAX_BAR  = 100

  const setupDone = auditPassed >= auditTotal

  return (
    <div className="space-y-4">

      {/* Setting up, while that is still the honest description of the work */}
      {!setupDone && (
        <KomIgangKort passed={auditPassed} total={auditTotal} onOpen={() => onTabChange?.('audit')} />
      )}

      {/* Needs attention — merged action strip */}
      {attention.length > 0 ? (
        <div className="bg-navy-800 rounded-xl border border-mustard/25 divide-y divide-navy-700">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-medium text-mustard uppercase tracking-wider">{t.needsAttention}</p>
          </div>
          {attention.map(item => (
            <div key={item.tab} className="px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className={`shrink-0 ${item.urgent ? 'text-red-400' : 'text-amber-400'}`}>●</span>
              <p className="flex-1 text-sm text-slate-300 min-w-[180px]">{item.text}</p>
              <button
                onClick={() => onTabChange?.(item.tab)}
                className="shrink-0 text-xs bg-mustard hover:bg-mustard-light text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                {item.button} →
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-navy-800 rounded-xl border border-green-500/20 px-4 py-3 flex items-center gap-3">
          <span className="text-green-400 shrink-0">✓</span>
          <p className="text-sm text-slate-300">{t.allCaughtUp}</p>
        </div>
      )}

      {/* What Google is doing for you — actions first, then rating */}
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <Tooltip text={t.actionsTooltip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">
              {coverage.state === 'since-start' ? t.actionsTitleStart : t.actionsTitle[period]}
            </p>
          </Tooltip>
          {showDelta && actionsDelta ? (
            <Tooltip text={t.deltaTooltip}>
              <span className={`text-xs cursor-default ${actionsDelta.color}`}>{actionsDelta.label}</span>
            </Tooltip>
          ) : (
            <CoverageNote coverage={coverage} period={period} />
          )}
        </div>
        <div className={`grid gap-3 ${bookingMode ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {bookingMode && (
            <div className="bg-navy-800 rounded-xl p-4 border border-green-500/25">
              <p className="text-2xl mb-1">📅</p>
              <p className="text-green-400 text-2xl font-bold tabular-nums">{stats.bookings}</p>
              <Tooltip text={t.bookedTooltip}>
                <p className="text-slate-500 text-xs mt-0.5 cursor-default">{t.bookedViaProfile}</p>
              </Tooltip>
              <p className="text-green-400/80 text-xs mt-1 font-medium">{stats.revenueSEK.toLocaleString('sv-SE')} SEK</p>
            </div>
          )}
          <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
            <p className="text-2xl mb-1">📞</p>
            <p className="text-white text-2xl font-bold tabular-nums">{stats.callClicks}</p>
            <Tooltip text={t.calledTooltip}>
              <p className="text-slate-500 text-xs mt-0.5 cursor-default">{t.calledYou}</p>
            </Tooltip>
          </div>
          <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
            <p className="text-2xl mb-1">📍</p>
            <p className="text-white text-2xl font-bold tabular-nums">{stats.directionRequests}</p>
            <Tooltip text={t.directionsTooltip}>
              <p className="text-slate-500 text-xs mt-0.5 cursor-default">{t.askedDirections}</p>
            </Tooltip>
          </div>
          <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
            <p className="text-2xl mb-1">🌐</p>
            <p className="text-white text-2xl font-bold tabular-nums">{stats.websiteClicks}</p>
            <Tooltip text={t.websiteTooltip}>
              <p className="text-slate-500 text-xs mt-0.5 cursor-default">{t.visitedWebsite}</p>
            </Tooltip>
          </div>
          <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
            <Tooltip text={t.ratingTooltip}>
              <p className="text-slate-500 text-xs mb-1 cursor-default">{t.averageRating}</p>
            </Tooltip>
            <p className="text-white text-2xl font-bold tabular-nums">{data.averageRating.toFixed(1)}</p>
            <p className="text-mustard text-xs mt-1">
              {'★'.repeat(Math.round(data.averageRating))}{'☆'.repeat(5 - Math.round(data.averageRating))}
              <span className="text-slate-500 ml-1">{data.totalReviews} {t.reviews}</span>
            </p>
          </div>
        </div>
      </div>

      {/* How people find you */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Tooltip text={t.findTooltip}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">{t.findTitle}</p>
            </Tooltip>
            {showDelta && viewsDelta ? (
              <Tooltip text={t.deltaTooltip}>
                <span className={`text-xs cursor-default ${viewsDelta.color}`}>{viewsDelta.label}</span>
              </Tooltip>
            ) : (
              <CoverageNote coverage={coverage} period={period} />
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            <Tooltip text={t.legendMapsTip}>
              <span className="flex items-center gap-1.5 cursor-default">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-500/70 inline-block" />
                {t.legendMaps}
              </span>
            </Tooltip>
            <Tooltip text={t.legendSearchTip}>
              <span className="flex items-center gap-1.5 cursor-default">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/60 inline-block" />
                {t.legendSearch}
              </span>
            </Tooltip>
          </div>
        </div>
        <div className="flex items-end gap-2 h-36">
          {chartTrend.map((v, i) => {
            const total   = v.searchViews + v.mapsViews
            const mapsH   = Math.round((v.mapsViews   / maxTotal) * MAX_BAR)
            const searchH = Math.round((v.searchViews / maxTotal) * MAX_BAR)
            const isLast  = i === chartTrend.length - 1
            const kVal    = total >= 1000
              ? (total / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 }) + 'k'
              : total.toString()
            return (
              <div
                key={i}
                /* A lone bucket would otherwise stretch the full card width */
                className={`flex-1 flex flex-col items-center gap-1 ${chartTrend.length < 3 ? 'max-w-[96px]' : ''}`}
              >
                <span className={`text-xs tabular-nums font-medium ${isLast ? 'text-mustard' : 'text-slate-500'}`}>
                  {kVal}
                </span>
                <div className="flex-1 flex items-end w-full">
                  <div className="w-full flex flex-col">
                    <div
                      className={`w-full rounded-t-sm ${isLast ? 'bg-blue-400/80' : 'bg-blue-500/50'}`}
                      style={{ height: `${searchH}px` }}
                    />
                    <div
                      className={`w-full rounded-b-sm ${isLast ? 'bg-green-400/80' : 'bg-green-500/50'}`}
                      style={{ height: `${mapsH}px` }}
                    />
                  </div>
                </div>
                <span className={`text-xs ${isLast ? 'text-mustard' : 'text-slate-500'}`}>{v.month}</span>
              </div>
            )
          })}
        </div>
        <MeasuringSince coverage={coverage} className="mt-3" />
      </div>

      {/* Where you stand locally — a card, not a tab */}
      <KonkurrentKort onOpen={() => onTabChange?.('competitors')} />

      {/* Once setup is done it stops shouting, but stays reachable */}
      {setupDone && (
        <div className="pt-1">
          <button
            onClick={() => onTabChange?.('audit')}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            {t.setupLink} →
          </button>
        </div>
      )}

    </div>
  )
}
