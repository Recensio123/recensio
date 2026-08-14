'use client'
import { useMemo, useState } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang } from '@/components/LanguageProvider'
import { type AnalyticsData, type Period, type Source } from './types'
import { CHANNEL_COLORS, CHANNEL_TOOLTIPS, DONUT_COLORS, DONUT_PALETTE, CATEGORY_COLORS, CATEGORY_TOOLTIPS } from './constants'
import { fmtDuration } from './helpers'
import { usePlan, hasBooking } from '@/components/PlanProvider'
import { useCoverage, coveredValue } from '@/components/DataCoverageProvider'
import { CoverageNote } from '@/components/dashboard/CoverageNote'

// Booking attribution mock — average booking value until real per-booking
// revenue flows from the bookings table.
const AVG_BOOKING_SEK = 1_200

/*
 * Traffic — merger of the old "Incoming traffic" and "Marketing channels" tabs,
 * plus the visitor-profile content from the dissolved "Audience" tab.
 * One tab answers "where do my visitors come from, and who are they?"
 */

// ─── Verdict scoring — plain-language labels ──────────────────────────────────
type Verdict = 'Invest more' | 'Improve first' | 'Look into'

function getVerdict(s: Source): Verdict {
  const trendUp = s.trend.length > 1 ? s.trend[s.trend.length - 1] >= s.trend[0] : true
  if (trendUp && (s.conversions > 0 || s.engagementRate >= 0.55)) return 'Invest more'
  if (!trendUp && s.conversions === 0 && s.engagementRate < 0.40)  return 'Look into'
  return 'Improve first'
}

const VERDICT_CFG: Record<Verdict, { pill: string }> = {
  'Invest more':   { pill: 'text-green-400 bg-green-500/10 border-green-500/20' },
  'Improve first': { pill: 'text-mustard bg-mustard/10 border-mustard/20'       },
  'Look into':     { pill: 'text-red-400 bg-red-500/10 border-red-500/20'       },
}

const VERDICT_LABEL: Record<'sv' | 'en', Record<Verdict, string>> = {
  sv: { 'Invest more': 'Satsa mer', 'Improve first': 'Förbättra först', 'Look into': 'Undersök' },
  en: { 'Invest more': 'Invest more', 'Improve first': 'Improve first', 'Look into': 'Look into' },
}

type EnrichedSource = Source & { convRate: number; verdict: Verdict }

// ── Deterministic period scaling — same approach as SEODashboardTest2's chartTrend ──
// The mock is monthly. Weekly ≈ monthly / 4.3; yearly ≈ monthly × 12 adjusted for the
// growth ramp through the year (earlier months were smaller), landing near ×10.2.
const WEEK_DIVISOR = 4.3
const YEAR_FACTOR  = 10.2
// Fixed per-row factors deriving the WoW / YoY change of a source from its stored
// MoM change — plausible per-period deltas without randomness.
const SRC_CHG_WEEKLY = [0.5, 0.35, 0.65, 0.45, 0.55]
const SRC_CHG_YEARLY = [2.4, 1.8, 2.9, 2.1, 2.6]

// The per-channel sparkline is a six-month series built from the monthly mock.
// Analytics starts on the day the tag went in and nothing is backfilled, so
// months we never measured are dropped from the front instead of drawn.
const DAY_MS     = 86_400_000
const MONTH_DAYS = 30

function supportedMonths(startedAt: Date | null): number {
  if (!startedAt) return 1
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const heldDays = Math.max(0, (now.getTime() - startedAt.getTime()) / DAY_MS)
  return Math.max(1, Math.ceil(heldDays / MONTH_DAYS))
}

const T = {
  sv: {
    moversTip:       'Kanalernas största rörelser denna vecka jämfört med förra — se skiften direkt utan att läsa hela tabellen.',
    allChannels:     'alla kanaler',
    thisWeek:        'Denna vecka',
    hChannel:        'Kanal',
    hChannelTip:     'Trafikkanalen.',
    hTrend:          '6-månaderstrend',
    hTrendTip:       'Besök per månad de senaste 6 månaderna.',
    hTrendShort:     'Trend',
    hTrendShortTip:  'Besök per månad sedan vi började mäta.',
    hVisits:         'Besök',
    hVisitsTip:      'Totala besök från den här kanalen under vald period.',
    hEngaged:        'Engagerade',
    hEngagedTip:     'Besökare som stannade minst 10 sekunder eller såg mer än en sida.',
    hBookingPct:     'Bokningar %',
    hLeadsPct:       'Förfrågningar %',
    hBookingPctTip:  'Andel besök från kanalen som slutade i en bokning.',
    hLeadsPctTip:    'Andel besök från kanalen som blev en förfrågan — ett samtal, formulär eller bokning.',
    hAvgVisit:       'Snittbesök',
    hAvgVisitTip:    'Genomsnittlig tid besökarna var på din sida.',
    hBookings:       'Bokningar',
    hLeads:          'Förfrågningar',
    hBookingsTip:    'Bokningar från kanalen denna period, med totalt värde från ditt bokningssystem.',
    hLeadsTip:       'Totala förfrågningar från kanalen denna period.',
    hChange:         'Förändring',
    hChangeTip:      (p: Period) => `Jämfört med ${p === 'Weekly' ? 'förra veckan' : p === 'Monthly' ? 'förra månaden' : 'förra året'}.`,
    changeStartTip:  'Vi har inte mätt tillräckligt länge för att jämföra med en tidigare period än. Siffrorna bredvid gäller — det är bara jämförelsen som saknas.',
    hVerdict:        'Bedömning',
    hVerdictTip:     'Satsa mer = det funkar, lägg mer krut här. Förbättra först = fixa något innan du satsar mer. Undersök = går nedåt utan att ge något tillbaka.',
    verdictTips:     {
      'Invest more':   'Kanalen växer och ger resultat. Lägg mer tid eller pengar här.',
      'Improve first': 'Kanalen ger besök men något brister. Åtgärda det innan du satsar mer.',
      'Look into':     'Kanalen går nedåt utan att ge förfrågningar. Ta reda på varför.',
    } as Record<Verdict, string>,
    shareBarTip:     'Färgfältet visar varje kanals andel av alla besök. Färgerna matchar prickarna i tabellen.',
    qualityInsight:  (best: string, bestPct: number, top: string, topPct: number) =>
                     `${best} har din högsta engagemangsnivå på ${bestPct} % — före ${top} på ${topPct} %.`,
    reviewInsight:   (pct: number) => `Recensionssajter skickar ${pct} % av din trafik — varje ny recension ökar din synlighet på dessa plattformar.`,
    allSourcesTitle: 'Alla trafikkällor',
    allSourcesTip:   'Alla webbplatser och källor som skickade besökare till dig denna månad, från flest till minst.',
    sSource:         'Källa',
    sSourceTip:      'Webbplatsen eller plattformen besökaren kom ifrån.',
    sType:           'Typ',
    sTypeTip:        'Typ av källa — sökmotor, recensionssajt, katalog och så vidare.',
    sVisitsTip:      'Antal besök från den här källan de senaste 30 dagarna.',
    sEngagedTip:     'Hur många av besökarna som stannade och engagerade sig — minst 10 sekunder eller mer än en sida.',
    sAvgTip:         'Hur länge besökare från den här källan i snitt stannade på din sida.',
    sShare:          'Andel',
    sShareTip:       'Andel av månadens totala trafik.',
    sChangeTip:      (p: Period) => `Förändring mot ${p === 'Weekly' ? 'förra veckan' : p === 'Monthly' ? 'förra månaden' : 'förra året'}. 'Ny' betyder ingen trafik under föregående period.`,
    directTip:       'Besökare som skrev in din adress direkt, använde ett bokmärke eller kom via en mobilapp. Appar tar ofta bort avsändarinformationen, så en del av detta kan vara trafik från sociala medier som inte går att spåra.',
    newBadge:        'Ny',
    whoTitle:        'Vilka dina besökare är',
    whereTitle:      'Var de finns',
    whereTip:        'Vilka städer dina besökare kommer ifrån.',
    whatTitle:       'Vad de använder',
    whatTip:         'Vilken typ av enhet dina besökare använder — mobil, dator eller surfplatta.',
    devices:         { Mobile: 'Mobil', Desktop: 'Dator', Tablet: 'Surfplatta' } as Record<string, string>,
    mobileNote:      'De flesta besöker dig via mobilen — det är den versionen av din sida som spelar störst roll.',
    ageGender:       'Ålder & kön',
    signedInOnly:    '(endast inloggade Google-användare)',
    age:             'Ålder',
    gender:          'Kön',
    sampleNote:      'Bygger enbart på inloggade Google-användare — ett urval, inte alla besökare.',
  },
  en: {
    moversTip:       'Biggest channel moves this week vs last week — spot momentum shifts without scanning the whole table.',
    allChannels:     'all channels',
    thisWeek:        'This week',
    hChannel:        'Channel',
    hChannelTip:     'The traffic channel.',
    hTrend:          '6-month trend',
    hTrendTip:       'Monthly visits over the last 6 months.',
    hTrendShort:     'Trend',
    hTrendShortTip:  'Monthly visits since we started measuring.',
    hVisits:         'Visits',
    hVisitsTip:      'Total visits from this channel in the selected period.',
    hEngaged:        'Engaged',
    hEngagedTip:     'Visitors who stayed 10+ seconds or viewed more than one page.',
    hBookingPct:     'Booking %',
    hLeadsPct:       'Leads %',
    hBookingPctTip:  'Percentage of visits from this channel that ended in a booking.',
    hLeadsPctTip:    'Percentage of visits from this channel that became a lead — a call, form fill, or booking.',
    hAvgVisit:       'Avg. visit',
    hAvgVisitTip:    'Average time visitors spent on your site.',
    hBookings:       'Bookings',
    hLeads:          'Leads',
    hBookingsTip:    'Bookings from this channel this period, with their total value from your booking system.',
    hLeadsTip:       'Total leads from this channel this period.',
    hChange:         'Change',
    hChangeTip:      (p: Period) => `Change vs. ${p === 'Weekly' ? 'last week' : p === 'Monthly' ? 'last month' : 'last year'}.`,
    changeStartTip:  'We have not been measuring long enough to compare against an earlier period yet. The numbers beside it hold — only the comparison is missing.',
    hVerdict:        'Verdict',
    hVerdictTip:     "Invest more = it's working, put more into it. Improve first = fix something before spending more. Look into = declining with nothing to show for it.",
    verdictTips:     {
      'Invest more':   'This channel is growing and delivering. Put more time or money here.',
      'Improve first': 'This channel brings visits but something is off. Fix it before spending more.',
      'Look into':     'This channel is declining with no leads to show. Find out why.',
    } as Record<Verdict, string>,
    shareBarTip:     'The coloured bar shows each channel\'s share of all visits. Colours match the dots in the table.',
    qualityInsight:  (best: string, bestPct: number, top: string, topPct: number) =>
                     `${best} has your highest engagement rate at ${bestPct}% — ahead of ${top} at ${topPct}%.`,
    reviewInsight:   (pct: number) => `Review sites are sending ${pct}% of your traffic — each new review increases your visibility on these platforms.`,
    allSourcesTitle: 'All traffic sources',
    allSourcesTip:   'Every website or source that sent visitors to you this month, listed from most to least.',
    sSource:         'Source',
    sSourceTip:      'The website or platform the visitor came from.',
    sType:           'Type',
    sTypeTip:        'The type of source — search engine, review site, directory, etc.',
    sVisitsTip:      'How many visits came from this source in the last 30 days.',
    sEngagedTip:     'How many of these visitors stayed and engaged — spent 10+ seconds or viewed more than one page.',
    sAvgTip:         'How long visitors from this source spent on your site on average.',
    sShare:          'Share',
    sShareTip:       'Share of total traffic this month.',
    sChangeTip:      (p: Period) => `Change vs ${p === 'Weekly' ? 'last week' : p === 'Monthly' ? 'last month' : 'last year'}. 'New' means no traffic in the previous period.`,
    directTip:       'Visitors who typed your address directly, used a bookmark, or arrived via a mobile app. Apps often strip referral data, so some of this may be social media traffic that cannot be attributed to a specific source.',
    newBadge:        'New',
    whoTitle:        'Who your visitors are',
    whereTitle:      'Where they are',
    whereTip:        'Which cities your visitors are coming from.',
    whatTitle:       'What they use',
    whatTip:         'What type of device your visitors are using — phone, computer, or tablet.',
    devices:         { Mobile: 'Mobile', Desktop: 'Desktop', Tablet: 'Tablet' } as Record<string, string>,
    mobileNote:      "Most visitors are on their phone — that's the version of your site to care about.",
    ageGender:       'Age & gender',
    signedInOnly:    '(signed-in Google users only)',
    age:             'Age',
    gender:          'Gender',
    sampleNote:      'Based on signed-in Google users only — a sample, not all visitors.',
  },
}

export function TrafficTabTest2({
  data,
  period,
  periodLabel,
}: {
  data:        AnalyticsData
  period:      Period
  periodLabel: string
}) {
  const [showDemographics, setShowDemographics] = useState(false)
  const { plan } = usePlan()
  const { lang } = useLang()
  const t = T[lang]
  const bookingMode = hasBooking(plan)

  // How far back the site tag reaches. Every cross-period figure below is
  // checked against it; state signals — verdicts, engagement, shares — are not.
  const coverage    = useCoverage('website', period)
  const showDelta   = coverage.state === 'full'
  const trendMonths = supportedMonths(coverage.startedAt)
  const fullTrend   = trendMonths >= 6

  // Period-scaled flow counts (visits, leads) derived from the monthly mock, then
  // cut back to the days we actually measured so a fortnight of tracking never
  // reports a full year's traffic. State signals — verdicts, engagement rates,
  // durations, shares — stay period-independent, so verdicts are always computed
  // from the monthly base data.
  const { channels, incoming } = useMemo(() => {
    const f = (v: number) => {
      const scaled =
        period === 'Weekly' ? Math.round(v / WEEK_DIVISOR) :
        period === 'Yearly' ? Math.round(v * YEAR_FACTOR)  : v
      return coveredValue(scaled, coverage)
    }
    return {
      channels: data.traffic_sources.map(s => {
        const sessions    = f(s.sessions)
        const conversions = f(s.conversions)
        return {
          ...s,
          sessions,
          conversions,
          convRate: sessions > 0 ? (conversions / sessions) * 100 : 0,
          verdict:  getVerdict(s),
        }
      }),
      incoming: data.incoming_sources.map((s, i) => ({
        ...s,
        sessions: f(s.sessions),
        change:   s.change == null ? s.change :
                  period === 'Weekly' ? Math.round(s.change * SRC_CHG_WEEKLY[i % SRC_CHG_WEEKLY.length]) :
                  period === 'Yearly' ? Math.round(s.change * SRC_CHG_YEARLY[i % SRC_CHG_YEARLY.length]) :
                  s.change,
      })),
    }
  }, [data, period, coverage])

  const totalSrc      = channels.reduce((s, t) => s + t.sessions, 0) || 1
  const totalIncoming = incoming.reduce((s, t) => s + t.sessions, 0) || 1
  // Monthly base totals — for ratio insights that must not drift with period scaling
  const totalSrcBase      = data.traffic_sources.reduce((s, t) => s + t.sessions, 0) || 1
  const totalIncomingBase = data.incoming_sources.reduce((s, t) => s + t.sessions, 0) || 1

  const channelChange = (s: EnrichedSource) =>
    period === 'Weekly' ? s.wow : period === 'Monthly' ? s.mom : s.yoy

  const maxSessions = Math.max(...channels.map(s => s.sessions), 1)

  // Weekly movers — always week-vs-week, computed from the monthly base
  const totalPrev = data.traffic_sources.reduce((s, t) => s + t.sessions / (1 + t.wow / 100), 0)
  const netWoW    = totalPrev > 0 ? Math.round((totalSrcBase - totalPrev) / totalPrev * 100) : null
  const gainers   = [...data.traffic_sources].filter(s => s.wow > 0).sort((a, b) => b.wow - a.wow).slice(0, 2)
  const decliners = [...data.traffic_sources].filter(s => s.wow < 0).sort((a, b) => a.wow - b.wow).slice(0, 2)

  // Source-table insights — share ratios from the monthly base, stable across periods
  const reviewSessions = data.incoming_sources.filter(s => s.category === 'Review Site').reduce((sum, s) => sum + s.sessions, 0)
  const reviewPct      = Math.round((reviewSessions / totalIncomingBase) * 100)

  const qualitySources     = data.incoming_sources.filter(s => s.source !== '(direct)' && s.sessions >= 20)
  const bestQualitySrc     = [...qualitySources].sort((a, b) => b.engagementRate - a.engagementRate)[0]
  const topVolumeSrc       = [...qualitySources].sort((a, b) => b.sessions - a.sessions)[0]
  const showQualityInsight = bestQualitySrc && topVolumeSrc &&
                             bestQualitySrc.source !== topVolumeSrc.source &&
                             bestQualitySrc.engagementRate >= 0.70

  const maxAge    = Math.max(...data.demo_age.map(d => d.sessions), 1)
  const maxGender = Math.max(...data.demo_gender.map(d => d.sessions), 1)

  return (
    <>
      <div className="-mt-4">
        {showDelta
          ? <p className="text-xs text-slate-500">{periodLabel}</p>
          : <CoverageNote coverage={coverage} period={period} />}
      </div>

      {/* ── Weekly movers strip — pure week-vs-week, so it needs a full record ── */}
      {showDelta && (gainers.length > 0 || decliners.length > 0) && (
        <Tooltip text={t.moversTip}>
          <div className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-3.5 flex items-center gap-5 flex-wrap cursor-default">
            {netWoW !== null && (
              <>
                <div className="shrink-0">
                  <p className={`text-lg font-bold tabular-nums leading-none ${netWoW > 0 ? 'text-green-400' : netWoW < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {netWoW > 0 ? '+' : ''}{netWoW}%
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.allChannels}</p>
                </div>
                <div className="h-6 w-px bg-navy-700 shrink-0" />
              </>
            )}
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider shrink-0">{t.thisWeek}</span>

            {gainers.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-green-500 text-xs font-bold">↑</span>
                {gainers.map((s, i) => (
                  <span key={s.channel} className="flex items-center gap-1.5 text-xs">
                    {i > 0 && <span className="text-slate-700">·</span>}
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CHANNEL_COLORS[s.channel]?.dot ?? 'bg-slate-500'}`} />
                    <span className="text-slate-300 font-medium">{s.channel}</span>
                    <span className="text-green-400 font-bold tabular-nums">+{s.wow}%</span>
                  </span>
                ))}
              </div>
            )}
            {gainers.length > 0 && decliners.length > 0 && <div className="h-4 w-px bg-navy-700 shrink-0" />}
            {decliners.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-red-500 text-xs font-bold">↓</span>
                {decliners.map((s, i) => (
                  <span key={s.channel} className="flex items-center gap-1.5 text-xs">
                    {i > 0 && <span className="text-slate-700">·</span>}
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CHANNEL_COLORS[s.channel]?.dot ?? 'bg-slate-500'}`} />
                    <span className="text-slate-300 font-medium">{s.channel}</span>
                    <span className="text-red-400 font-bold tabular-nums">{s.wow}%</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Tooltip>
      )}

      {/* ── Channel table ───────────────────────────────────────────────── */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <Tooltip text={t.shareBarTip}>
          <div className="flex h-2 overflow-hidden">
            {channels.map((s, i) => (
              <div key={i} style={{ width: `${(s.sessions / totalSrc) * 100}%` }}
                   className={CHANNEL_COLORS[s.channel]?.bar ?? 'bg-slate-500'} />
            ))}
          </div>
        </Tooltip>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1fr_108px_84px_72px_62px_68px_70px_56px_86px] gap-3 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
              <Tooltip text={t.hChannelTip}><span className="cursor-default">{t.hChannel}</span></Tooltip>
              <Tooltip text={fullTrend ? t.hTrendTip : t.hTrendShortTip}>
                <span className="cursor-default">{fullTrend ? t.hTrend : t.hTrendShort}</span>
              </Tooltip>
              <Tooltip text={t.hVisitsTip}><span className="text-right cursor-default">{t.hVisits}</span></Tooltip>
              <Tooltip text={t.hEngagedTip}><span className="text-right cursor-default">{t.hEngaged}</span></Tooltip>
              <Tooltip text={bookingMode ? t.hBookingPctTip : t.hLeadsPctTip}><span className="text-right cursor-default">{bookingMode ? t.hBookingPct : t.hLeadsPct}</span></Tooltip>
              <Tooltip text={t.hAvgVisitTip}><span className="text-right cursor-default">{t.hAvgVisit}</span></Tooltip>
              <Tooltip text={bookingMode ? t.hBookingsTip : t.hLeadsTip}><span className="text-right cursor-default">{bookingMode ? t.hBookings : t.hLeads}</span></Tooltip>
              <Tooltip text={showDelta ? t.hChangeTip(period) : t.changeStartTip}>
                <span className="text-right cursor-default">{t.hChange}</span>
              </Tooltip>
              <Tooltip text={t.hVerdictTip}>
                <span className="text-right cursor-default">{t.hVerdict}</span>
              </Tooltip>
            </div>
            <div className="divide-y divide-navy-700">
              {channels.map((s, i) => {
                const engPct    = Math.round(s.engagementRate * 100)
                const engColor  = s.engagementRate >= 0.65 ? 'text-green-400' : s.engagementRate >= 0.45 ? 'text-mustard' : 'text-red-400'
                const colors    = CHANNEL_COLORS[s.channel]
                const vc        = VERDICT_CFG[s.verdict]
                const chg       = channelChange(s)
                const color  = DONUT_COLORS[s.channel] ?? '#64748b'
                const barPct = (s.sessions / maxSessions) * 100
                // Verdicts still read the full base trend — only the drawn line is trimmed
                const trend  = s.trend.length > trendMonths ? s.trend.slice(s.trend.length - trendMonths) : s.trend
                return (
                  <div key={i} className="grid grid-cols-[1fr_108px_84px_72px_62px_68px_70px_56px_86px] gap-3 px-5 py-3.5 items-center">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors?.dot ?? 'bg-slate-500'}`} />
                        <Tooltip text={CHANNEL_TOOLTIPS[s.channel] ?? s.channel}>
                          <span className="text-white text-sm font-medium cursor-default">{s.channel}</span>
                        </Tooltip>
                      </div>
                      <div className="mt-1.5 ml-5 h-[3px] bg-navy-700 rounded-full overflow-hidden" style={{ maxWidth: '120px' }}>
                        <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.65 }} />
                      </div>
                    </div>
                    {/* 6-month line sparkline */}
                    {trend.length >= 2 ? (() => {
                      const sw = 108, sh = 24, pad = 2
                      const minV = Math.min(...trend)
                      const maxV = Math.max(...trend, minV + 1)
                      const rx = (idx: number) => (pad + (idx / (trend.length - 1)) * (sw - pad * 2)).toFixed(1)
                      const ry = (v: number)   => (sh - pad - ((v - minV) / (maxV - minV)) * (sh - pad * 2 - 2)).toFixed(1)
                      const pts     = trend.map((v, idx) => `${rx(idx)},${ry(v)}`).join(' ')
                      const lastX   = rx(trend.length - 1)
                      const lastY   = ry(trend[trend.length - 1])
                      const baseY   = (sh - pad).toFixed(1)
                      const firstX  = rx(0)
                      const gradId  = `tg-${s.channel.replace(/\s+/g, '')}`
                      return (
                        <svg width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`}>
                          <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"   stopColor={color} stopOpacity="0.2" />
                              <stop offset="100%" stopColor={color} stopOpacity="0"   />
                            </linearGradient>
                          </defs>
                          <polygon points={`${firstX},${baseY} ${pts} ${lastX},${baseY}`} fill={`url(#${gradId})`} />
                          <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
                        </svg>
                      )
                    })() : <span className="text-slate-500 text-xs">—</span>}
                    <div className="text-right">
                      <p className="text-white text-sm tabular-nums font-medium">{s.sessions.toLocaleString('sv-SE')}</p>
                      <p className="text-slate-500 text-xs tabular-nums">{Math.round(s.sessions / totalSrc * 100)}%</p>
                    </div>
                    <span className={`text-xs text-right font-medium tabular-nums ${engColor}`}>{engPct}%</span>
                    <span className={`text-xs text-right font-medium tabular-nums ${s.convRate > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                      {s.convRate > 0 ? `${s.convRate.toFixed(1)}%` : '—'}
                    </span>
                    <span className="text-slate-300 text-xs text-right tabular-nums">{fmtDuration(s.avgDuration)}</span>
                    <div className="text-right">
                      {s.conversions > 0 ? (
                        <>
                          <p className="text-green-400 text-sm font-semibold tabular-nums">{s.conversions}</p>
                          {bookingMode && (
                            <p className="text-green-400/70 text-xs tabular-nums">{(s.conversions * AVG_BOOKING_SEK).toLocaleString('sv-SE')} SEK</p>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </div>
                    <div className="text-right">
                      {!showDelta || chg === 0
                        ? <span className="text-slate-500 text-xs">—</span>
                        : <span className={`text-xs font-semibold tabular-nums ${chg > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {chg > 0 ? '+' : ''}{chg}%
                          </span>}
                    </div>
                    <div className="flex justify-end">
                      <Tooltip text={t.verdictTips[s.verdict]}>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap cursor-default ${vc.pill}`}>{VERDICT_LABEL[lang][s.verdict]}</span>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── All traffic sources ─────────────────────────────────────────── */}
      <div>
        {/* Insights — slim strip above the table */}
        {(showQualityInsight || reviewPct > 0) && (
          <div className="flex flex-col gap-1.5 mb-3">
            {showQualityInsight && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/8 border border-blue-500/15 rounded-lg">
                <span className="text-blue-400 text-xs">◆</span>
                <p className="text-blue-300 text-xs">
                  {t.qualityInsight(
                    bestQualitySrc.source,
                    Math.round(bestQualitySrc.engagementRate * 100),
                    topVolumeSrc.source,
                    Math.round(topVolumeSrc.engagementRate * 100),
                  )}
                </p>
              </div>
            )}
            {reviewPct > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/8 border border-green-500/15 rounded-lg">
                <span className="text-green-400 text-xs">◆</span>
                <p className="text-green-300 text-xs">{t.reviewInsight(reviewPct)}</p>
              </div>
            )}
          </div>
        )}

        <Tooltip text={t.allSourcesTip}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">{t.allSourcesTitle}</h2>
        </Tooltip>

        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium"
                   style={{ gridTemplateColumns: '1fr 110px 70px 62px 80px 44px 68px' }}>
                <Tooltip text={t.sSourceTip}><span className="cursor-default">{t.sSource}</span></Tooltip>
                <Tooltip text={t.sTypeTip}><span className="cursor-default">{t.sType}</span></Tooltip>
                <Tooltip text={t.sVisitsTip}><span className="text-right cursor-default">{t.hVisits}</span></Tooltip>
                <Tooltip text={t.sEngagedTip}><span className="text-right cursor-default">{t.hEngaged}</span></Tooltip>
                <Tooltip text={t.sAvgTip}><span className="text-right cursor-default">{t.hAvgVisit}</span></Tooltip>
                <Tooltip text={t.sShareTip}><span className="text-right cursor-default">{t.sShare}</span></Tooltip>
                <Tooltip text={showDelta ? t.sChangeTip(period) : t.changeStartTip}><span className="text-right cursor-default">{t.hChange}</span></Tooltip>
              </div>

              <div className="divide-y divide-navy-700">
                {incoming.map((s, i) => {
                  const pct      = Math.round((s.sessions / totalIncoming) * 100)
                  const catColor = CATEGORY_COLORS[s.category] ?? 'text-slate-400 bg-navy-700'
                  const initial  = s.source === '(direct)' ? '→' : s.source[0].toUpperCase()
                  const engColor = s.engagementRate >= 0.65 ? 'text-green-400' : s.engagementRate >= 0.45 ? 'text-mustard' : 'text-red-400'
                  const isNew    = 'change' in s && s.change === null
                  const chg      = s.change ?? undefined

                  return (
                    <div key={i} className="grid px-5 py-3.5 items-center"
                         style={{ gridTemplateColumns: '1fr 110px 70px 62px 80px 44px 68px' }}>

                      {/* Source */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-navy-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                          {initial}
                        </div>
                        {s.source === '(direct)' ? (
                          <Tooltip text={t.directTip}>
                            <span className="text-white text-sm font-medium truncate cursor-default">{s.source}</span>
                          </Tooltip>
                        ) : (
                          <span className="text-white text-sm font-medium truncate">{s.source}</span>
                        )}
                      </div>

                      {/* Type */}
                      <Tooltip text={CATEGORY_TOOLTIPS[s.category] ?? s.category}>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit cursor-default ${catColor}`}>
                          {s.category}
                        </span>
                      </Tooltip>

                      {/* Visits */}
                      <span className="text-white text-sm text-right tabular-nums font-medium">{s.sessions.toLocaleString('sv-SE')}</span>

                      {/* Engaged */}
                      <span className={`text-xs text-right font-semibold tabular-nums ${engColor}`}>{Math.round(s.engagementRate * 100)}%</span>

                      {/* Avg visit */}
                      <span className="text-slate-300 text-xs text-right tabular-nums">{fmtDuration(s.avgDuration)}</span>

                      {/* Share % */}
                      <span className="text-slate-500 text-xs text-right tabular-nums">{pct}%</span>

                      {/* Change */}
                      <div className="text-right">
                        {!showDelta ? (
                          <Tooltip text={t.changeStartTip}>
                            <span className="text-slate-500 text-xs cursor-default">—</span>
                          </Tooltip>
                        ) : isNew ? (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">{t.newBadge}</span>
                        ) : chg !== undefined ? (
                          <span className={`text-xs font-medium tabular-nums ${chg > 0 ? 'text-green-400' : chg < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            {chg > 0 ? '↑' : chg < 0 ? '↓' : ''}{Math.abs(chg)}%
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Who your visitors are — from the dissolved Audience tab ──────── */}
      <div>
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t.whoTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Geographic — horizontal bars (lengths are read accurately; donuts are not) */}
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
            <Tooltip text={t.whereTip}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">{t.whereTitle}</p>
            </Tooltip>
            <div className="space-y-3">
              {(() => {
                const maxGeo = Math.max(...data.geo_sources.map(g => g.sessions), 1)
                return data.geo_sources.map((g, i) => {
                  const pct   = Math.round((g.sessions / data.sessions) * 100)
                  const color = DONUT_PALETTE[i % DONUT_PALETTE.length]
                  return (
                    <div key={g.name} className="flex items-center gap-3">
                      <span className="text-base leading-none shrink-0">{g.flag ?? '📍'}</span>
                      <span className="text-slate-300 text-sm w-28 truncate shrink-0">{g.name}</span>
                      <div className="flex-1 h-2.5 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(g.sessions / maxGeo) * 100}%`, backgroundColor: color, opacity: 0.8 }} />
                      </div>
                      <span className="text-white text-sm font-semibold tabular-nums w-12 text-right shrink-0">{g.sessions.toLocaleString('sv-SE')}</span>
                      <span className="text-slate-500 text-xs w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* Device — horizontal bars */}
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
            <Tooltip text={t.whatTip}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">{t.whatTitle}</p>
            </Tooltip>
            <div className="space-y-3">
              {[
                { key: 'Mobile',  pct: data.device_mobile,  color: DONUT_COLORS['Mobile']  },
                { key: 'Desktop', pct: data.device_desktop, color: DONUT_COLORS['Desktop'] },
                { key: 'Tablet',  pct: data.device_tablet,  color: DONUT_COLORS['Tablet']  },
              ].map(d => (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm w-28 shrink-0">{t.devices[d.key]}</span>
                  <div className="flex-1 h-2.5 bg-navy-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color, opacity: 0.8 }} />
                  </div>
                  <span className="text-white text-sm font-semibold tabular-nums w-12 text-right shrink-0">{d.pct}%</span>
                </div>
              ))}
              <p className="text-slate-500 text-xs pt-2">{t.mobileNote}</p>
            </div>
          </div>

        </div>

        {/* Age & gender — collapsed; sparse Google Signals data */}
        {(data.demo_age.length > 0 || data.demo_gender.length > 0) && (
          <div className="mt-3">
            <button
              onClick={() => setShowDemographics(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showDemographics ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {t.ageGender} {showDemographics ? '' : t.signedInOnly}
            </button>

            {showDemographics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t.age}</p>
                  <div className="space-y-2">
                    {data.demo_age.map(d => (
                      <div key={d.label} className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs w-12 shrink-0">{d.label}</span>
                        <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                          <div className="h-full bg-mustard/50 rounded-full" style={{ width: `${(d.sessions / maxAge) * 100}%` }} />
                        </div>
                        <span className="text-white text-xs font-medium tabular-nums w-10 text-right">{d.sessions.toLocaleString('sv-SE')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t.gender}</p>
                  <div className="space-y-2">
                    {data.demo_gender.map(d => (
                      <div key={d.label} className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs w-14 shrink-0">{d.label}</span>
                        <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400/50 rounded-full" style={{ width: `${(d.sessions / maxGender) * 100}%` }} />
                        </div>
                        <span className="text-white text-xs font-medium tabular-nums w-10 text-right">{d.sessions.toLocaleString('sv-SE')}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-500 text-xs mt-3">{t.sampleNote}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
