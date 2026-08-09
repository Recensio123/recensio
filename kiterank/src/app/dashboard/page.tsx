import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Tooltip } from '@/components/Tooltip'
import { OverviewPeriodBar } from './OverviewPeriodBar'
import { WeeklyCalendar } from './action-plan/WeeklyCalendar'
import { StartpageSwitch } from './StartpageSwitch'

type Status = 'good' | 'warn' | 'bad'
type Delta  = { text: string; positive: boolean } | null

type HealthItem = {
  href:    string
  label:   string
  tooltip: string
  value:   string
  status:  Status
  hint:    string
  delta:   Delta
}

const DOT:  Record<Status, string> = {
  good: 'bg-green-400',
  warn: 'bg-mustard',
  bad:  'bg-red-400',
}
const RING: Record<Status, string> = {
  good: 'border-green-500/20 hover:border-green-500/40',
  warn: 'border-mustard/20 hover:border-mustard/40',
  bad:  'border-red-500/20 hover:border-red-500/40',
}
const VALUE_COLOR: Record<Status, string> = {
  good: 'text-green-400',
  warn: 'text-mustard',
  bad:  'text-red-400',
}

const FORCE_MOCK = true

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const { data: company } = user
    ? await admin.from('companies').select('*').eq('user_id', user.id).single()
    : { data: null }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    snapshotResult,
    prevSnapshotResult,
    scQueriesResult,
  ] = await Promise.all([
    company
      ? admin.from('gbp_snapshots').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(1).single()
      : Promise.resolve({ data: null }),
    company
      ? admin.from('gbp_snapshots').select('*').eq('company_id', company.id).lt('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false }).limit(1).single()
      : Promise.resolve({ data: null }),
    company
      ? admin.from('search_console_queries').select('position').eq('company_id', company.id)
      : Promise.resolve({ data: null }),
  ])

  const snapshot     = FORCE_MOCK ? null : snapshotResult.data
  const prevSnapshot = FORCE_MOCK ? null : prevSnapshotResult.data
  const scQueries    = FORCE_MOCK ? null : scQueriesResult.data

  const rating       = Number(snapshot?.rating                   ?? 4.2)
  const reviewCount  = Number(snapshot?.review_count             ?? 47)
  const responded    = Number(snapshot?.reviews_responded        ?? 19)
  const posts        = Number(snapshot?.posts_last_30_days       ?? 0)
  const photos       = Number(snapshot?.photos_count             ?? 8)
  const impressions  = Number(snapshot?.impressions_last_30_days ?? 3847)
  const responseRate = reviewCount > 0 ? responded / reviewCount : 0
  const quickWins    = (scQueries ?? []).filter(q => Number(q.position) >= 4 && Number(q.position) <= 15).length

  const newReviews = (snapshot && prevSnapshot)
    ? Math.max(0, reviewCount - Number(prevSnapshot.review_count ?? 0))
    : 3

  const impressionsDeltaPct = (snapshot && prevSnapshot && Number(prevSnapshot.impressions_last_30_days) > 0)
    ? Math.round((impressions - Number(prevSnapshot.impressions_last_30_days)) / Number(prevSnapshot.impressions_last_30_days) * 100)
    : 12

  const ratingDelta = (snapshot && prevSnapshot)
    ? Number((rating - Number(prevSnapshot.rating ?? 0)).toFixed(1))
    : 0.1

  const hasWin = (newReviews !== null && newReviews > 0) ||
                 (impressionsDeltaPct !== null && impressionsDeltaPct >= 5)

  const winText = (() => {
    const parts: string[] = []
    if (newReviews && newReviews > 0)
      parts.push(`${newReviews} new review${newReviews === 1 ? '' : 's'} this week`)
    if (impressionsDeltaPct !== null && impressionsDeltaPct >= 5)
      parts.push(`impressions up ${impressionsDeltaPct}%`)
    return parts.join(' · ')
  })()

  // ── New sections mock data (all from integrated APIs) ─────────────────────

  // Google Ads budget pacing (Ads API)
  const MOCK_SPEND_SEK  = 3_200
  const MOCK_BUDGET_SEK = 5_000
  const MOCK_DAYS_IN    = 27
  const MOCK_DAYS_TOTAL = 31
  const budgetPct       = Math.round(MOCK_SPEND_SEK  / MOCK_BUDGET_SEK  * 100)
  const dayPct          = Math.round(MOCK_DAYS_IN    / MOCK_DAYS_TOTAL  * 100)
  const projectedSEK    = Math.round(MOCK_SPEND_SEK  / MOCK_DAYS_IN     * MOCK_DAYS_TOTAL)

  // GA4 total conversions (Analytics API)
  const MOCK_CONV_TOTAL = 38
  const MOCK_CONV_MOM   = 12

  // Week-over-week (GBP + Search Console + Ads + GA4)
  const wow = [
    { label: 'Profile views',  curr: 2_100, prev: 1_780 },
    { label: 'Organic clicks', curr: 24,    prev: 21    },
    { label: 'Ad leads',       curr: 3,     prev: 2     },
    { label: 'Website visits', curr: 310,   prev: 270   },
  ]

  // Channel performance (one key metric per channel)
  const channels = [
    { label: 'GBP',        metric: '8 400',   unit: 'profile views', deltaPct: +18, href: '/dashboard/gbp',         lowerBetter: false },
    { label: 'SEO',        metric: '99',      unit: 'organic clicks', deltaPct: +15, href: '/dashboard/keywords',    lowerBetter: false },
    { label: 'Google Ads', metric: '113 SEK', unit: 'per lead',       deltaPct:  -8, href: '/dashboard/paid-search', lowerBetter: true  },
    { label: 'Website',    metric: '1 240',   unit: 'visits',         deltaPct: +18, href: '/dashboard/analytics',   lowerBetter: false },
  ]

  // Alerts — derived from existing data
  const unansweredReviews = reviewCount - responded
  type AlertItem = { level: 'urgent' | 'warn'; message: string; href: string }
  const alerts: AlertItem[] = []
  if (unansweredReviews > 0)
    alerts.push({ level: 'warn',   message: `${unansweredReviews} Google review${unansweredReviews === 1 ? '' : 's'} still without a reply`, href: '/dashboard/reviews' })
  if (budgetPct > dayPct + 15)
    alerts.push({ level: 'urgent', message: `Ad budget ${budgetPct}% spent with ${100 - dayPct}% of the month left — ads may go dark early`, href: '/dashboard/paid-search' })

  const health: HealthItem[] = [
    {
      href:    '/dashboard/reviews',
      label:   'Star rating',
      tooltip: 'Your average star rating on Google. Above 4.5 is great. Below 4.0 can make people choose a competitor instead.',
      value:   `${rating.toFixed(1)}`,
      status:  rating >= 4.5 ? 'good' : rating >= 4.0 ? 'warn' : 'bad',
      hint:    rating >= 4.5 ? 'Excellent' : rating >= 4.0 ? 'Ask happy customers for reviews' : 'Needs urgent attention',
      delta:   ratingDelta !== 0 ? { text: `${ratingDelta > 0 ? '+' : ''}${ratingDelta} this week`, positive: ratingDelta > 0 } : null,
    },
    {
      href:    '/dashboard/reviews',
      label:   'Review replies',
      tooltip: 'How many of your Google reviews you have replied to. Replying to every review shows potential customers you care — and Google notices it too.',
      value:   `${Math.round(responseRate * 100)}%`,
      status:  responseRate >= 0.8 ? 'good' : responseRate >= 0.4 ? 'warn' : 'bad',
      hint:    responseRate >= 0.8 ? 'All caught up' : `${reviewCount - responded} review${reviewCount - responded === 1 ? '' : 's'} need a reply`,
      delta:   newReviews > 0 ? { text: `+${newReviews} new this week`, positive: true } : null,
    },
    {
      href:    '/dashboard/posts',
      label:   'Posting',
      tooltip: 'How many posts you have published to your Google business listing in the last 30 days. Posting regularly shows Google your business is active.',
      value:   String(posts),
      status:  posts >= 1 ? 'good' : 'bad',
      hint:    posts === 0 ? 'One post a month keeps your profile active' : 'On track',
      delta:   null,
    },
    {
      href:    '/dashboard/photos',
      label:   'Photos',
      tooltip: 'How many photos you have on your Google business listing. Businesses with more photos get more direction requests and website clicks.',
      value:   String(photos),
      status:  photos >= 10 ? 'good' : photos >= 5 ? 'warn' : 'bad',
      hint:    photos >= 10 ? 'Looking good' : 'More photos = more clicks',
      delta:   null,
    },
    {
      href:    '/dashboard/keywords',
      label:   'Search rankings',
      tooltip: 'Search terms where you are close to the top of Google but not quite on the first page yet.',
      value:   quickWins > 0 ? String(quickWins) : '✓',
      status:  quickWins > 3 ? 'bad' : quickWins > 0 ? 'warn' : 'good',
      hint:    quickWins > 0 ? `keyword${quickWins === 1 ? '' : 's'} near page 1` : 'Rankings healthy',
      delta:   impressionsDeltaPct !== null ? { text: `${impressionsDeltaPct >= 0 ? '+' : ''}${impressionsDeltaPct}% impressions`, positive: impressionsDeltaPct >= 0 } : null,
    },
  ]

  return (
    <StartpageSwitch companyName={company?.name ?? 'Your business'} connected={!!snapshot}>
    <div className="px-8 py-6 space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{company?.name ?? 'Your business'}</h1>
          <p className="text-slate-500 text-sm mt-0.5">Performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          {!snapshot && (
            <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
              Sample data
            </span>
          )}
          <OverviewPeriodBar />
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 border max-w-2xl transition-opacity hover:opacity-80 ${
                a.level === 'urgent'
                  ? 'bg-red-500/8 border-red-500/20'
                  : 'bg-mustard/8 border-mustard/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${a.level === 'urgent' ? 'bg-red-400' : 'bg-mustard'}`} />
              <span className={`text-sm ${a.level === 'urgent' ? 'text-red-300' : 'text-mustard/90'}`}>{a.message}</span>
              <span className="ml-auto text-slate-600 text-xs shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}

      {/* ── Business health — 5 KPI cards ────────────────────────────────── */}
      <div>
        <Tooltip text="A weekly overview of the five most important things affecting how your business appears on Google.">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">Business health</p>
        </Tooltip>
        <div className="grid grid-cols-5 gap-4">
          {health.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={`bg-navy-800 rounded-xl p-4 border transition-colors flex flex-col ${RING[item.status]}`}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[item.status]}`} />
                <Tooltip text={item.tooltip}>
                  <span className="text-slate-500 text-xs cursor-default truncate">{item.label}</span>
                </Tooltip>
              </div>
              <p className={`text-3xl font-bold leading-none mb-2 tabular-nums ${VALUE_COLOR[item.status]}`}>
                {item.value}
              </p>
              <p className="text-slate-500 text-xs leading-snug flex-1">{item.hint}</p>
              {item.delta && (
                <p className={`text-xs mt-2 font-medium ${item.delta.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {item.delta.text}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Snapshot strip — 3 context cards ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Google impressions */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Google impressions</p>
          <p className="text-3xl font-bold text-white tabular-nums">{impressions.toLocaleString('sv-SE')}</p>
          <p className="text-xs text-slate-500 mt-1">searches showing your business last 30 days</p>
          {impressionsDeltaPct !== 0 && (
            <p className={`text-xs mt-2 font-semibold ${impressionsDeltaPct > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {impressionsDeltaPct > 0 ? '↑' : '↓'}{Math.abs(impressionsDeltaPct)}% vs last week
            </p>
          )}
        </div>

        {/* Reviews snapshot */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reviews</p>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold text-mustard tabular-nums">{reviewCount}</p>
              <p className="text-xs text-slate-500 mt-1">total on Google</p>
            </div>
            <div className="text-right pb-0.5">
              <p className="text-2xl font-bold text-white tabular-nums">{rating.toFixed(1)} ★</p>
              <p className="text-xs text-slate-500 mt-1">avg rating</p>
            </div>
          </div>
          {newReviews > 0 && (
            <p className="text-xs text-green-400 font-medium mt-2 pt-2 border-t border-navy-700">
              +{newReviews} new this week
            </p>
          )}
        </div>

        {/* Win of the week */}
        {hasWin ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400">★</span>
              <p className="text-green-400 text-sm font-semibold">Win this week</p>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{winText}</p>
          </div>
        ) : (
          <div className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-white text-sm font-medium">No wins recorded yet</p>
              <p className="text-slate-500 text-xs mt-0.5">Complete your priorities and wins will show up here.</p>
            </div>
          </div>
        )}

      </div>

      {/* ── Channel performance snapshot ─────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Channel performance</p>
        <div className="grid grid-cols-4 gap-3">
          {channels.map(c => {
            const positive = c.lowerBetter ? c.deltaPct < 0 : c.deltaPct > 0
            return (
              <Link
                key={c.label}
                href={c.href}
                className="bg-navy-800 rounded-xl p-4 border border-navy-700 hover:border-navy-600 transition-colors"
              >
                <p className="text-slate-500 text-xs mb-2">{c.label}</p>
                <p className="text-white text-xl font-bold tabular-nums">{c.metric}</p>
                <p className="text-slate-600 text-xs mt-0.5">{c.unit}</p>
                <p className={`text-xs mt-2 font-medium ${positive ? 'text-green-400' : 'text-red-400'}`}>
                  {c.deltaPct > 0 ? '↑' : '↓'}{Math.abs(c.deltaPct)}% MoM
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Leads this month + Ad budget ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Leads */}
        <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Leads this month</p>
          <p className="text-3xl font-bold text-white tabular-nums">{MOCK_CONV_TOTAL}</p>
          <p className="text-slate-500 text-xs mt-1">conversions across all channels</p>
          <p className="text-green-400 text-xs font-medium mt-2">↑{MOCK_CONV_MOM}% MoM</p>
        </div>

        {/* Ad budget pulse */}
        <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Ad budget</p>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-white text-xl font-bold tabular-nums">{MOCK_SPEND_SEK.toLocaleString('sv-SE')} SEK</span>
            <span className="text-slate-500 text-xs">of {MOCK_BUDGET_SEK.toLocaleString('sv-SE')} SEK · day {MOCK_DAYS_IN} of {MOCK_DAYS_TOTAL}</span>
          </div>
          <div className="relative h-2 bg-navy-700 rounded-full overflow-hidden mb-2">
            <div className="absolute h-full bg-mustard rounded-full" style={{ width: `${budgetPct}%` }} />
            <div className="absolute top-0 bottom-0 w-0.5 bg-white/30" style={{ left: `${dayPct}%` }} />
          </div>
          <p className="text-green-400 text-xs font-medium">
            On track — projected {projectedSEK.toLocaleString('sv-SE')} SEK by month end
          </p>
        </div>

      </div>

      {/* ── This week vs last week ────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">This week vs last week</p>
        <div className="grid grid-cols-4 gap-3">
          {wow.map(w => {
            const delta = Math.round((w.curr - w.prev) / w.prev * 100)
            return (
              <div key={w.label} className="bg-navy-800 rounded-xl p-4 border border-navy-700">
                <p className="text-slate-500 text-xs mb-2">{w.label}</p>
                <p className="text-white text-xl font-bold tabular-nums">{w.curr.toLocaleString('sv-SE')}</p>
                <p className="text-slate-600 text-xs mt-0.5">{w.prev.toLocaleString('sv-SE')} last week</p>
                <p className={`text-xs mt-2 font-medium ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {delta >= 0 ? '↑' : '↓'}{Math.abs(delta)}% WoW
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Recurring tasks this week ─────────────────────────────────────── */}
      <WeeklyCalendar />

    </div>
    </StartpageSwitch>
  )
}
