'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePlan, hasBooking } from '@/components/PlanProvider'
import { useLang } from '@/components/LanguageProvider'
import { HelpButton } from '@/components/dashboard/HelpButton'
import { MOCK_ACTIONS } from './action-plan/ActionPlanPanel'
import { ProgressRing, HABITS, MOCK_STREAK, MOCK_WINS, loadWeek, saveWeek } from './action-plan/ActionPlanTest2'
import { BokningarHemSection } from './BokningarHemSection'
import { konverteringsOrd } from '@/lib/konvertering'

/*
 * Home — summary + weekly actions in one page.
 * Actions are compact rows (title · category · time) that expand on click,
 * so the whole page fits on one screen again.
 * Fully bilingual (sv primary / en) via useLang.
 */

const CATEGORY_COLORS: Record<string, string> = {
  Reviews:   'text-green-400 bg-green-500/10 border-green-500/20',
  SEO:       'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Ads:       'text-red-400 bg-red-500/10 border-red-500/20',
  Photos:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Analytics: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  GBP:       'text-mustard bg-mustard/10 border-mustard/20',
}

const CATEGORY_SV: Record<string, string> = {
  Reviews: 'Recensioner', SEO: 'SEO', Ads: 'Annonser', Photos: 'Foton', Analytics: 'Hemsida', GBP: 'Google-profil',
}

// Exempelsiffror. Vilket läge vyerna kör i avgörs av VISA_EXEMPEL i lib/datalage.
const MOCK_DATA = {
  reviewCount:       47,
  responded:         19,
  newReviews:        3,
  impressionsDelta:  12,
  budgetPct:         64,
  dayPct:            87,
}

const T = {
  sv: {
    subtitle:        'Vad som hänt, och vad du gör härnäst',
    sample:          'Exempeldata',
    thisWeek:        'Denna vecka',
    headline:        '14 nya kunder hittade dig via Google',
    headlineSub:     'Upp från 11 förra veckan. Nedan ser du varifrån de kom.',
    digestLink:      'Förhandsgranska din måndagsrapport →',
    alertReviews:    (n: number) => `${n} Google-recension${n === 1 ? '' : 'er'} väntar på svar`,
    alertBudget:     (b: number, d: number) => `Annonsbudgeten är ${b}% förbrukad med ${d}% av månaden kvar — annonserna kan ta slut i förtid`,
    winPrefix:       'Veckans vinst:',
    winReviews:      (n: number) => `${n} ny${n === 1 ? '' : 'a'} recension${n === 1 ? '' : 'er'} denna vecka`,
    winSeen:         (p: number) => `du syntes ${p}% mer på Google`,
    weekComplete:    'Veckan klar — allt gjort.',
    weekProgress:    (d: number, t: number) => `${d} av ${t} klara denna vecka`,
    weekCompleteSub: 'Din marknadsföring fick sin veckodos. Vi ses på måndag.',
    weekProgressSub: 'Bocka av åtgärderna och vanorna nedan för att slutföra veckan.',
    streak:          'veckor i rad',
    best:            'bäst',
    actionsTitle:    'Veckans åtgärder',
    whyItMatters:    'Varför det spelar roll:',
    habitsTitle:     'Veckans vanor',
    habitsSub:       'Det lilla som bygger över tid — nollställs varje måndag',
    wowTitle:        'Denna vecka mot förra veckan',
    lastWeek:        'förra veckan',
    vsLastWeek:      'mot förra veckan',
    channelsTitle:   'Dina kanaler',
    vsLastMonth:     'mot förra månaden',
    winsTitle:       'Dina vinster',
    winsEffect:      'effekten syns när din data uppdateras',
    wow: [
      { label: 'Personer som såg dig på Google', href: '/dashboard/gbp'         },
      { label: 'Klick från sökningar',            href: '/dashboard/keywords'    },
      { label: 'Förfrågningar från annonser',     href: '/dashboard/paid-search' },
      { label: 'Hemsidebesök',                    href: '/dashboard/analytics'   },
    ],
    channels: [
      { label: 'Din Google-profil', unit: 'profilvisningar', href: '/dashboard/gbp'         },
      { label: 'Google-sök',        unit: 'sökklick',        href: '/dashboard/keywords'    },
      { label: 'Annonser',          unit: 'per kund',        href: '/dashboard/paid-search' },
      { label: 'Hemsida',           unit: 'besök',           href: '/dashboard/analytics'   },
    ],
    adsBookingUnit:  'tillbaka per annonskrona · 32 400 kr',
  },
  en: {
    subtitle:        'What changed, and what to do next',
    sample:          'Sample data',
    thisWeek:        'This week',
    headline:        '14 new customers found you on Google',
    headlineSub:     'Up from 11 last week. Everything below shows where they came from.',
    digestLink:      'Preview your Monday report →',
    alertReviews:    (n: number) => `${n} Google review${n === 1 ? '' : 's'} still without a reply`,
    alertBudget:     (b: number, d: number) => `Ad budget ${b}% spent with ${d}% of the month left — ads may go dark early`,
    winPrefix:       "This week's win:",
    winReviews:      (n: number) => `${n} new review${n === 1 ? '' : 's'} this week`,
    winSeen:         (p: number) => `you were seen ${p}% more on Google`,
    weekComplete:    'Week complete — everything done.',
    weekProgress:    (d: number, t: number) => `${d} of ${t} done this week`,
    weekCompleteSub: 'Your marketing got its weekly attention. See you next Monday.',
    weekProgressSub: 'Finish the actions and habits below to complete the week.',
    streak:          'week streak',
    best:            'best',
    actionsTitle:    "This week's actions",
    whyItMatters:    'Why it matters:',
    habitsTitle:     'Weekly habits',
    habitsSub:       'The small things that compound — reset every Monday',
    wowTitle:        'This week vs last week',
    lastWeek:        'last week',
    vsLastWeek:      'vs last week',
    channelsTitle:   'Your channels',
    vsLastMonth:     'vs last month',
    winsTitle:       'Your wins',
    winsEffect:      'effect shows as data updates',
    wow: [
      { label: 'People who saw you on Google', href: '/dashboard/gbp'         },
      { label: 'Clicks from search',            href: '/dashboard/keywords'    },
      { label: 'Leads from ads',                href: '/dashboard/paid-search' },
      { label: 'Website visits',                href: '/dashboard/analytics'   },
    ],
    channels: [
      { label: 'Your Google profile', unit: 'profile views', href: '/dashboard/gbp'         },
      { label: 'Google search',       unit: 'search clicks', href: '/dashboard/keywords'    },
      { label: 'Ads',                 unit: 'per customer',  href: '/dashboard/paid-search' },
      { label: 'Website',             unit: 'visits',        href: '/dashboard/analytics'   },
    ],
    adsBookingUnit:  'back on ad spend · 32 400 kr',
  },
}

const WOW_NUMBERS = [
  { curr: 2_100, prev: 1_780 },
  { curr: 24,    prev: 21    },
  { curr: 3,     prev: 2     },
  { curr: 310,   prev: 270   },
]

const CHANNEL_NUMBERS = [
  { metric: '8 400',   deltaPct: +18, lowerBetter: false },
  { metric: '99',      deltaPct: +15, lowerBetter: false },
  { metric: '113 kr',  deltaPct: -8,  lowerBetter: true  },
  { metric: '1 240',   deltaPct: +18, lowerBetter: false },
]

export function HomeTest2({ companyName }: { companyName: string }) {
  const { plan } = usePlan()
  const { lang } = useLang()
  const t = T[lang]
  const bookingMode = hasBooking(plan)
  /* Bokning eller lead — ordet, och det som får sägas om kronor. */
  const ord = konverteringsOrd(plan, lang)
  const d = MOCK_DATA
  const unanswered = d.reviewCount - d.responded

  type AlertItem = { level: 'urgent' | 'warn'; message: string; href: string }
  const alerts: AlertItem[] = []
  if (unanswered > 0)
    alerts.push({ level: 'warn',   message: t.alertReviews(unanswered), href: '/dashboard/gbp' })
  if (d.budgetPct > d.dayPct + 15)
    alerts.push({ level: 'urgent', message: t.alertBudget(d.budgetPct, 100 - d.dayPct), href: '/dashboard/paid-search' })

  const winParts: string[] = []
  if (d.newReviews > 0)        winParts.push(t.winReviews(d.newReviews))
  if (d.impressionsDelta >= 5) winParts.push(t.winSeen(d.impressionsDelta))
  const winText = winParts.join(' · ')

  // ── Weekly action state (shared storage with the old Action Plan) ─────────
  const actions = MOCK_ACTIONS.slice(0, 4)
  const total   = actions.length + HABITS.length

  const [week,     setWeek]     = useState<{ actions: number[]; habits: string[] }>({ actions: [], habits: [] })
  const [wins,     setWins]     = useState(MOCK_WINS)
  const [showWins, setShowWins] = useState(false)
  const [openAction, setOpenAction] = useState<number | null>(null)

  useEffect(() => { setWeek(loadWeek()) }, [])

  const update = useCallback((next: { actions: number[]; habits: string[] }) => {
    setWeek(next)
    saveWeek(next, total)
  }, [total])

  function toggleAction(priority: number, title: string) {
    const has  = week.actions.includes(priority)
    const next = { ...week, actions: has ? week.actions.filter(p => p !== priority) : [...week.actions, priority] }
    update(next)
    if (!has) {
      setWins(w => [{ week: lang === 'sv' ? 'Denna vecka' : 'This week', text: title, metric: undefined }, ...w])
    } else {
      setWins(w => {
        const idx = w.findIndex(x => x.text === title)
        return idx >= 0 ? [...w.slice(0, idx), ...w.slice(idx + 1)] : w
      })
    }
  }

  function toggleHabit(id: string) {
    const has = week.habits.includes(id)
    update({ ...week, habits: has ? week.habits.filter(h => h !== id) : [...week.habits, id] })
  }

  const done     = week.actions.length + week.habits.length
  const complete = done >= total
  const streak   = MOCK_STREAK.current + (complete ? 1 : 0)
  const best     = Math.max(MOCK_STREAK.best, streak)

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">{companyName}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
            {t.sample}
          </span>
          <HelpButton topic="hem" />
        </div>
      </div>

      {/* ── The one number that matters ──────────────────────────────────── */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 px-5 sm:px-6 py-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">{t.thisWeek}</p>
        <p className="text-white text-xl sm:text-2xl font-bold leading-snug">
          {t.headline}
          <span className="text-green-400">{ord.rubrikTillägg}</span>
        </p>
        <div className="flex items-center justify-between gap-3 flex-wrap mt-1">
          <p className="text-slate-400 text-sm">{t.headlineSub}</p>
          <Link href="/dashboard/digest" className="text-xs text-slate-400 hover:text-mustard transition-colors shrink-0">
            {t.digestLink}
          </Link>
        </div>
      </div>

      {/* ── Alerts + win ─────────────────────────────────────────────────── */}
      {(alerts.length > 0 || winText) && (
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
              <span className="ml-auto text-slate-500 text-xs shrink-0">→</span>
            </Link>
          ))}
          {winText && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 border max-w-2xl bg-green-500/8 border-green-500/20">
              <span className="text-green-400 shrink-0">★</span>
              <span className="text-sm text-green-300">{t.winPrefix} {winText}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Ring + streak header ─────────────────────────────────────────── */}
      <div id="actions" className="bg-navy-800 rounded-xl border border-navy-700 px-5 sm:px-6 py-5 flex items-center gap-4 sm:gap-6 scroll-mt-6 flex-wrap">
        <ProgressRing done={done} total={total} />
        <div className="flex-1 min-w-[180px]">
          <p className="text-white text-base font-semibold">
            {complete ? t.weekComplete : t.weekProgress(done, total)}
          </p>
          <p className="text-slate-400 text-sm mt-0.5">
            {complete ? t.weekCompleteSub : t.weekProgressSub}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className={streak > 0 ? 'text-mustard' : 'text-slate-500'}>🔥</span>
            <p className="text-white text-2xl font-bold tabular-nums">{streak}</p>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">{t.streak} · {t.best} {best}</p>
        </div>
      </div>

      {/* ── This week's actions — compact rows, expand on tap ────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">{t.actionsTitle}</p>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
          {actions.map(a => {
            const isDone = week.actions.includes(a.priority)
            const isOpen = openAction === a.priority
            const catLabel = lang === 'sv' ? (CATEGORY_SV[a.category] ?? a.category) : a.category
            const title  = lang === 'sv' ? a.titleSv        : a.title
            const desc   = lang === 'sv' ? a.descriptionSv  : a.description
            const impact = lang === 'sv' ? a.impactSv       : a.impact
            const time   = lang === 'sv' ? a.timeEstimateSv : a.timeEstimate
            return (
              <div key={a.priority}>
                <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleAction(a.priority, title)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isDone
                        ? 'bg-green-500 border-green-500 text-navy-950'
                        : 'border-navy-600 hover:border-mustard'
                    }`}
                  >
                    {isDone && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Title row — click to expand */}
                  <button
                    onClick={() => setOpenAction(isOpen ? null : a.priority)}
                    className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 text-left"
                  >
                    <span className={`text-sm font-medium truncate ${isDone ? 'text-slate-500 line-through' : 'text-white'}`}>
                      {title}
                    </span>
                    <span className={`hidden sm:inline-flex shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[a.category] ?? 'text-slate-400 bg-navy-700 border-navy-600'}`}>
                      {catLabel}
                    </span>
                    <span className="shrink-0 text-slate-500 text-xs ml-auto">{time}</span>
                    <svg
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Expanded detail */}
                {isOpen && !isDone && (
                  <div className="px-4 sm:px-5 pb-4 pl-[52px] sm:pl-[60px]">
                    <p className="text-slate-300 text-sm leading-relaxed">{desc}</p>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                      <span className="text-green-400/80 font-medium">{t.whyItMatters} </span>{impact}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Weekly habits ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t.habitsTitle}</p>
          <span className="text-xs text-slate-500">{t.habitsSub}</span>
        </div>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
          {HABITS.map(h => {
            const isDone = week.habits.includes(h.id)
            const label  = lang === 'sv' ? h.labelSv ?? h.label : h.labelEn ?? h.label
            const detail = lang === 'sv' ? h.detailSv ?? h.detail : h.detailEn ?? h.detail
            return (
              <button
                key={h.id}
                onClick={() => toggleHabit(h.id)}
                className="w-full flex items-center gap-4 px-4 sm:px-5 py-3.5 text-left hover:bg-navy-700/20 transition-colors"
              >
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isDone ? 'bg-green-500 border-green-500 text-navy-950' : 'border-navy-600'
                }`}>
                  {isDone && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDone ? 'text-slate-500 line-through' : 'text-white'}`}>{label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{detail}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── This week vs last week ───────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">{t.wowTitle}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {t.wow.map((w, i) => {
            const n = WOW_NUMBERS[i]
            const label = i === 2 ? ord.frånAnnons : w.label
            const delta = Math.round((n.curr - n.prev) / n.prev * 100)
            return (
              <Link key={i} href={w.href} className="bg-navy-800 rounded-xl p-4 border border-navy-700 hover:border-navy-600 transition-colors">
                <p className="text-slate-400 text-xs mb-2 leading-tight">{label}</p>
                <p className="text-white text-xl font-bold tabular-nums">{n.curr.toLocaleString('sv-SE')}</p>
                <p className="text-slate-500 text-xs mt-0.5">{n.prev.toLocaleString('sv-SE')} {t.lastWeek}</p>
                <p className={`text-xs mt-2 font-medium ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {delta >= 0 ? '↑' : '↓'}{Math.abs(delta)}% {t.vsLastWeek}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Bokningarna, mitt i marknadsföringen ─────────────────────────────
          The loop the platform promises: the sections above say what the
          marketing brought in, this says what it booked in kronor. */}
      {bookingMode && <BokningarHemSection />}

      {/* ── Channel row ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">{t.channelsTitle}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {t.channels.map((c, i) => {
            const n = CHANNEL_NUMBERS[i]
            const metric = bookingMode && i === 2 ? '10×' : n.metric
            const unit   = bookingMode && i === 2 ? t.adsBookingUnit : c.unit
            const positive = n.lowerBetter ? n.deltaPct < 0 : n.deltaPct > 0
            return (
              <Link
                key={i}
                href={c.href}
                className="bg-navy-800 rounded-xl p-4 border border-navy-700 hover:border-navy-600 transition-colors"
              >
                <p className="text-slate-400 text-xs mb-2 leading-tight">{c.label}</p>
                <p className="text-white text-xl font-bold tabular-nums">{metric}</p>
                <p className="text-slate-500 text-xs mt-0.5">{unit}</p>
                <p className={`text-xs mt-2 font-medium ${positive ? 'text-green-400' : 'text-red-400'}`}>
                  {n.deltaPct > 0 ? '↑' : '↓'}{Math.abs(n.deltaPct)}% {t.vsLastMonth}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Wins — collapsed by default ──────────────────────────────────── */}
      <div>
        <button
          onClick={() => setShowWins(v => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${showWins ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {t.winsTitle} ({wins.length})
        </button>

        {showWins && (
          <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700 mt-3">
            {wins.map((w, i) => (
              <div key={i} className="px-4 sm:px-5 py-3.5 flex items-center gap-4">
                <span className="text-green-400 shrink-0">✓</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-sm">{w.text}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{w.week}</p>
                </div>
                {w.metric ? (
                  <span className="shrink-0 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                    {w.metric}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-slate-500">{t.winsEffect}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
