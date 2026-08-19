'use client'
import { useMemo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang } from '@/components/LanguageProvider'
import { type AnalyticsData, type Period } from './types'
import { VisitsOverTimeChart } from './charts'
import { useCoverage, coveredValue } from '@/components/DataCoverageProvider'
import { MeasuringSince } from '@/components/dashboard/CoverageNote'
import { VisitTimesCard } from './VisitTimesCard'
import { type BookingsByPeriod } from './siteBookings'


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
    funnelTitle:      'Besökartratt',
    fBookings:        'Bokningar',
    fBookedWord:      'bokade tid',
    fBookedPctTip:    'Andelen av de engagerade besökarna som bokade en tid. Steget kommer från dina egna bokningar, inte från Google.',
    alsoEnquiries:    (n: string) => `Utöver bokningarna hörde ${n} av sig på telefon eller formulär i stället för att boka online.`,
    fBookingValue:    (v: string) => `${v} i bokningsvärde`,
    funnelChange:     (n: string, pct: number) =>
      `${n} förfrågningar — ${pct > 0 ? '↑' : '↓'}${Math.abs(pct)} % mot föregående period`,
    newVisitors:      'Nya besökare',
    newVisitorsTip:   'Hur många av besökarna som aldrig varit på sidan förut. Når du nya människor eller samma återkommande?',
    newShare:         (pct: number) => `${pct} % av besöken var förstagångsbesök`,
    returning:        'Återkommande',
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
    funnelTitle:      'Visitor funnel',
    fBookings:        'Bookings',
    fBookedWord:      'booked',
    fBookedPctTip:    'The share of engaged visitors who booked an appointment. This step comes from your own bookings, not from Google.',
    alsoEnquiries:    (n: string) => `Besides the bookings, ${n} got in touch by phone or form instead of booking online.`,
    fBookingValue:    (v: string) => `${v} in booking value`,
    funnelChange:     (n: string, pct: number) =>
      `${n} enquiries — ${pct > 0 ? '↑' : '↓'}${Math.abs(pct)}% vs the previous period`,
    newVisitors:      'New visitors',
    newVisitorsTip:   'How many of your visitors had never been to the site before. Are you reaching new people, or the same regulars?',
    newShare:         (pct: number) => `${pct}% of visits were first-time visits`,
    returning:        'Returning',
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
  },
}

export function OverviewTabTest2({
  data,
  period,
  bookings,
}: {
  data:          AnalyticsData
  period:        Period
  /** Bookings made through the site, per window — our own data, and the only
   *  step of the funnel Analytics cannot see. Null when there is no booking
   *  system on the account. */
  bookings?:     BookingsByPeriod
}) {
  const { lang } = useLang()
  const t = T[lang]


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

    return { sessions, users, conversions, engaged, chartValues, chartLabels }
  }, [data, period, lang, coverage])

  // Series trimmed to the buckets our history can honestly fill. The surviving
  // bucket only holds the days we measured, so its value has to shrink to match
  // — otherwise five days of tracking draws a full month's column.
  const buckets     = supportedBuckets(coverage.startedAt, period)
  const chartValues = tail(view.chartValues, buckets).map(v => coveredValue(v, coverage))
  const chartLabels = tail(view.chartLabels, buckets)
  const hasSeries   = chartValues.length >= 2


  const engToConvRate = view.engaged  > 0 ? (view.conversions / view.engaged  * 100).toFixed(1) : '0.0'


  /* The booking step only appears when there is a booking system behind it,
     and it reads the window the selector is on like everything else here. */
  const periodBookings = bookings?.[period] ?? null
  const showBookings   = !!periodBookings
  const engToBookRate = periodBookings && view.engaged > 0
    ? ((periodBookings.count / view.engaged) * 100).toFixed(1)
    : '0.0'

  /* Share of visits from someone who had never been on the site before. */
  const newShare = data.sessions > 0 && data.new_users
    ? Math.min(100, Math.round((data.new_users / data.sessions) * 100))
    : null

  const leadChange = period === 'Weekly' ? data.conversions_wow
    : period === 'Monthly' ? data.conversions_mom : data.conversions_yoy

  return (
    <>
      {/* Visitor funnel */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 max-w-2xl">
        <Tooltip text={t.funnelTip}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">
            {coverage.state === 'since-start' ? t.funnelTitleStart : t.funnelTitle}
          </p>
        </Tooltip>
        <div className="flex items-center flex-wrap gap-y-2">
          <div className="flex-1 min-w-[110px] text-center py-3 px-2 sm:px-4 bg-navy-700/50 rounded-lg">
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
          <div className="flex-1 min-w-[110px] text-center py-3 px-2 sm:px-4 bg-navy-700/50 rounded-lg">
            <p className="text-slate-500 text-xs mb-1.5">{t.fEngaged}</p>
            <p className="text-white text-xl sm:text-2xl font-bold tabular-nums">{view.engaged.toLocaleString('sv-SE')}</p>
          </div>
          <div className="flex flex-col items-center px-2 sm:px-3 shrink-0">
            <Tooltip text={showBookings ? t.fBookedPctTip : t.fBecameLeadsPctTip}>
              <span className={`text-xs font-semibold tabular-nums cursor-default ${showBookings ? 'text-green-400' : 'text-mustard'}`}>
                {showBookings ? engToBookRate : engToConvRate}%
              </span>
            </Tooltip>
            <div className="flex items-center gap-1 my-1">
              <div className="w-8 h-px bg-navy-600" />
              <span className="text-slate-500 text-xs leading-none">▶</span>
            </div>
            <span className="text-slate-500 text-xs">{showBookings ? t.fBookedWord : t.fBecameLeads}</span>
          </div>

          {/* With a booking system the third step is the booking itself. The
              enquiry is not a stage on the way there — someone booking online
              never enquires first — so it moves below as the other way in. */}
          {showBookings ? (
            <div className="flex-1 min-w-[130px] text-center py-3 px-2 sm:px-4 bg-green-500/8 border border-green-500/20 rounded-lg">
              <p className="text-slate-500 text-xs mb-1.5">{t.fBookings}</p>
              <p className="text-green-400 text-xl sm:text-2xl font-bold tabular-nums">{periodBookings!.count.toLocaleString('sv-SE')}</p>
              <p className="text-slate-500 text-xs mt-1">{t.fBookingValue(`${periodBookings!.valueSEK.toLocaleString('sv-SE')} kr`)}</p>
            </div>
          ) : (
            <div className="flex-1 min-w-[110px] text-center py-3 px-2 sm:px-4 bg-navy-700/50 rounded-lg">
              <p className="text-slate-500 text-xs mb-1.5">{t.fLeads}</p>
              <p className="text-white text-xl sm:text-2xl font-bold tabular-nums">{view.conversions.toLocaleString('sv-SE')}</p>
            </div>
          )}
        </div>

        {/* The other way in: a phone call or a form, which the booking table
            never sees. A parallel outcome, so it is stated, not sequenced —
            and it carries its own change rather than repeating it a line down. */}
        {showBookings && view.conversions > 0 && (
          <p className="text-slate-500 text-xs mt-3">
            {t.alsoEnquiries(view.conversions.toLocaleString('sv-SE'))}
            {showDelta && leadChange !== 0 && (
              <span className={leadChange > 0 ? ' text-green-400' : ' text-red-400'}>
                {' '}{leadChange > 0 ? '↑' : '↓'}{Math.abs(leadChange)} % {t.periodWord[period]}
              </span>
            )}
          </p>
        )}

        {/* The change the five stat cards used to carry, in one line */}
        {!showBookings && showDelta && leadChange !== 0 && (
          <p className={`text-xs mt-3 ${leadChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {t.funnelChange(view.conversions.toLocaleString('sv-SE'), leadChange)}
          </p>
        )}
      </div>

      {/* New vs returning — new_users has been in the model all along, unused */}
      {newShare !== null && (
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 max-w-2xl">
          <Tooltip text={t.newVisitorsTip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">{t.newVisitors}</p>
          </Tooltip>
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="bg-mustard" style={{ width: `${newShare}%` }} />
            <div className="bg-navy-600" style={{ width: `${100 - newShare}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-mustard">{t.newVisitors} {newShare}%</span>
            <span className="text-slate-500">{t.returning} {100 - newShare}%</span>
          </div>
          <p className="text-slate-500 text-xs mt-2">{t.newShare(newShare)}</p>
        </div>
      )}

      {/* Visits over time */}
      <div>
        <Tooltip text={t.visitsOverTip}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">
            {coverage.state === 'since-start' ? t.visitsOverTimeStart : t.visitsOverTime}
          </h2>
        </Tooltip>
        <div className="bg-navy-800 rounded-xl border border-navy-700 px-4 pt-4 pb-3">

          {/* One bucket of history is a number, not a curve — draw it as one */}
          {!hasSeries && (
            <div className="py-8 text-center">
              <p className="text-white text-3xl font-bold tabular-nums">{(chartValues[0] ?? 0).toLocaleString('sv-SE')}</p>
              <p className="text-slate-500 text-xs mt-1">{chartLabels[0]}</p>
            </div>
          )}
          {hasSeries && (
            <VisitsOverTimeChart values={chartValues} labels={chartLabels} />
          )}

          <MeasuringSince coverage={coverage} className="mt-3" />
        </div>
      </div>

      <VisitTimesCard byDay={data.traffic_by_day} byHour={data.traffic_by_hour} period={period} />
    </>
  )
}
