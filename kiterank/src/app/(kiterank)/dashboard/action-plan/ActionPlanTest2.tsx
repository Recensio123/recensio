'use client'
import { useState, useEffect, useCallback } from 'react'
import { MOCK_ACTIONS } from './ActionPlanPanel'

/*
 * Test2 Action Plan — the core loop:
 *   1. Weekly progress ring        (actions + habits fill one ring)
 *   2. Week streak                 (consecutive fully-completed weeks)
 *   3. Two lanes                   (this week's actions + weekly habits)
 *   4. Wins log                    (completions tied to real metric changes)
 * The monthly calendar is gone — the habits lane replaces it.
 */

const CATEGORY_COLORS: Record<string, string> = {
  Reviews:   'text-green-400 bg-green-500/10 border-green-500/20',
  SEO:       'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Ads:       'text-red-400 bg-red-500/10 border-red-500/20',
  Photos:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Analytics: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  GBP:       'text-mustard bg-mustard/10 border-mustard/20',
}

// Weekly habits — replaces the recurring-task calendars. Same idea, but a
// checklist answers "did I do it?" instead of a grid showing when it was planned.
// Note: posting is deliberately NOT a weekly habit — posts are a minor ranking
// factor; reviews are the highest-yield weekly work. Posting is nudged monthly
// on the Posts tab, triggered by the seasonal engine.
export const HABITS: { id: string; label: string; detail: string; labelSv: string; detailSv: string; labelEn: string; detailEn: string }[] = [
  { id: 'ask',     label: 'Ask a happy customer for a review', detail: 'Two minutes — your review link is ready on the Reviews tab',
    labelSv: 'Be en nöjd kund om en recension', detailSv: 'Två minuter — din recensionslänk ligger klar under Recensioner',
    labelEn: 'Ask a happy customer for a review', detailEn: 'Two minutes — your review link is ready on the Reviews tab' },
  { id: 'reviews', label: 'Reply to new reviews',              detail: 'Keep the response rate up',
    labelSv: 'Svara på nya recensioner',        detailSv: 'Håll svarsfrekvensen uppe',
    labelEn: 'Reply to new reviews',            detailEn: 'Keep the response rate up' },
  { id: 'photo',   label: 'Add a photo',                       detail: 'A quick before/after shot works great',
    labelSv: 'Lägg upp ett foto',               detailSv: 'En snabb före/efter-bild funkar utmärkt',
    labelEn: 'Add a photo',                     detailEn: 'A quick before/after shot works great' },
  { id: 'spend',   label: 'Check your ad spend',               detail: 'One minute — catch waste early',
    labelSv: 'Kolla din annonskostnad',         detailSv: 'En minut — fånga slöseri tidigt',
    labelEn: 'Check your ad spend',             detailEn: 'One minute — catch waste early' },
]

// Seeded history — becomes real data once completions persist to the backend
export const MOCK_STREAK = { current: 3, best: 5 }

export const MOCK_WINS: { week: string; text: string; metric?: string }[] = [
  { week: 'Last week',    text: 'Replied to 8 reviews',            metric: 'rating 4.1 → 4.2' },
  { week: '2 weeks ago',  text: 'Added 5 photos to your profile',  metric: 'profile views +11%' },
  { week: '2 weeks ago',  text: 'Published 2 posts',               metric: 'seen 640 times' },
  { week: '3 weeks ago',  text: 'Paused 2 wasted ad keywords',     metric: 'saved ~700 SEK/month' },
]

export function getWeekKey() {
  const now    = new Date()
  const day    = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return `kiterank_ap2_${monday.toISOString().split('T')[0]}`
}

type WeekState = { actions: number[]; habits: string[] }

export function loadWeek(): WeekState {
  if (typeof window === 'undefined') return { actions: [], habits: [] }
  try {
    const raw = localStorage.getItem(getWeekKey())
    if (raw) return JSON.parse(raw)
  } catch { /* fall through */ }
  return { actions: [], habits: [] }
}

export function saveWeek(state: WeekState, total: number) {
  localStorage.setItem(getWeekKey(), JSON.stringify(state))
  // Let the sidebar ring update live
  const done = state.actions.length + state.habits.length
  localStorage.setItem('kiterank_ap_progress', JSON.stringify({ done, total }))
  window.dispatchEvent(new CustomEvent('kiterank-ap-progress', { detail: { done, total } }))
}

/* ── Progress ring ─────────────────────────────────────────────────────────── */
export function ProgressRing({ done, total, size = 72 }: { done: number; total: number; size?: number }) {
  const r      = (size - 10) / 2
  const c      = 2 * Math.PI * r
  const pct    = total > 0 ? done / total : 0
  const offset = c * (1 - pct)
  const complete = done >= total && total > 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={complete ? '#4ade80' : '#f0b429'} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-500"
      />
      <text x="50%" y="46%" textAnchor="middle" fill="white" fontSize={size / 4.5} fontWeight="700">
        {complete ? '✓' : `${done}/${total}`}
      </text>
      <text x="50%" y="64%" textAnchor="middle" fill="#64748b" fontSize={size / 9}>
        {complete ? 'done' : 'this week'}
      </text>
    </svg>
  )
}

/* ── Main ──────────────────────────────────────────────────────────────────── */
export function ActionPlanTest2() {
  const actions = MOCK_ACTIONS.slice(0, 4)
  const total   = actions.length + HABITS.length

  const [week, setWeek] = useState<WeekState>({ actions: [], habits: [] })
  const [wins, setWins] = useState(MOCK_WINS)

  useEffect(() => { setWeek(loadWeek()) }, [])

  const update = useCallback((next: WeekState) => {
    setWeek(next)
    saveWeek(next, total)
  }, [total])

  function toggleAction(priority: number, title: string) {
    const has  = week.actions.includes(priority)
    const next = { ...week, actions: has ? week.actions.filter(p => p !== priority) : [...week.actions, priority] }
    update(next)
    if (!has) {
      setWins(w => [{ week: 'This week', text: title, metric: undefined }, ...w])
    } else {
      setWins(w => {
        const idx = w.findIndex(x => x.week === 'This week' && x.text === title)
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
  // Current week counts toward the streak once it's fully complete
  const streak   = MOCK_STREAK.current + (complete ? 1 : 0)
  const best     = Math.max(MOCK_STREAK.best, streak)

  return (
    <div className="space-y-8">

      {/* ── Ring + streak header ─────────────────────────────────────────── */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 px-6 py-5 flex items-center gap-6">
        <ProgressRing done={done} total={total} />
        <div className="flex-1">
          <p className="text-white text-base font-semibold">
            {complete
              ? 'Week complete — everything done.'
              : `${done} of ${total} done this week`}
          </p>
          <p className="text-slate-500 text-sm mt-0.5">
            {complete
              ? 'Your marketing got its weekly attention. See you next Monday.'
              : 'Finish the actions and habits below to complete the week.'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className={streak > 0 ? 'text-mustard' : 'text-slate-600'}>🔥</span>
            <p className="text-white text-2xl font-bold tabular-nums">{streak}</p>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">week streak · best {best}</p>
        </div>
      </div>

      {/* ── Lane 1: This week's actions ──────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">This week&apos;s actions</p>
        <div className="space-y-3">
          {actions.map(a => {
            const isDone = week.actions.includes(a.priority)
            return (
              <div
                key={a.priority}
                className={`bg-navy-800 rounded-xl border p-5 transition-all ${
                  isDone ? 'border-green-500/20 opacity-60' : 'border-navy-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleAction(a.priority, a.title)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[a.category] ?? 'text-slate-400 bg-navy-700 border-navy-600'}`}>
                        {a.category}
                      </span>
                      <span className="text-slate-600 text-xs">{a.timeEstimate}</span>
                    </div>
                    <p className={`text-sm font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>{a.title}</p>
                    {!isDone && (
                      <>
                        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{a.description}</p>
                        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                          <span className="text-green-400/80 font-medium">Why it matters: </span>{a.impact}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Lane 2: Weekly habits ────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Weekly habits</p>
          <span className="text-xs text-slate-600">The small things that compound — reset every Monday</span>
        </div>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
          {HABITS.map(h => {
            const isDone = week.habits.includes(h.id)
            return (
              <button
                key={h.id}
                onClick={() => toggleHabit(h.id)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-navy-700/20 transition-colors"
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
                  <p className={`text-sm font-medium ${isDone ? 'text-slate-500 line-through' : 'text-white'}`}>{h.label}</p>
                  <p className="text-slate-600 text-xs mt-0.5">{h.detail}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Wins log ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Your wins</p>
          <span className="text-xs text-slate-600">What your work produced — updated as your data comes in</span>
        </div>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
          {wins.map((w, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4">
              <span className="text-green-400 shrink-0">✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 text-sm">{w.text}</p>
                <p className="text-slate-600 text-xs mt-0.5">{w.week}</p>
              </div>
              {w.metric ? (
                <span className="shrink-0 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                  {w.metric}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-slate-600">effect shows as data updates</span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
