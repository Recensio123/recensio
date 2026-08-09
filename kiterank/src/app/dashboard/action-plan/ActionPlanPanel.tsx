'use client'
import { useState, useEffect } from 'react'
import type { Action } from '@/app/api/ai/action-plan/route'

const CATEGORY_COLORS: Record<string, string> = {
  Reviews:   'text-green-400 bg-green-500/10 border-green-500/20',
  SEO:       'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Ads:       'text-red-400 bg-red-500/10 border-red-500/20',
  Photos:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Analytics: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  GBP:       'text-mustard bg-mustard/10 border-mustard/20',
}

export const MOCK_ACTIONS: (Action & { titleSv: string; descriptionSv: string; impactSv: string; timeEstimateSv: string })[] = [
  {
    priority:     1,
    category:     'Reviews',
    title:        'Reply to all unanswered reviews this week',
    description:  'Go to your Google profile and write a personal reply to every review that has not been answered yet. Thank happy customers by name and address any concerns in the critical ones.',
    impact:       'Responding to reviews improves your local ranking signal and shows potential customers you are attentive. Businesses that reply to 90%+ of reviews typically see a 0.2–0.5 star rating improvement within 90 days.',
    timeEstimate: '30 minutes',
    titleSv:        'Svara på alla obesvarade recensioner den här veckan',
    descriptionSv:  'Gå till din Google-profil och skriv ett personligt svar på varje recension som inte fått svar. Tacka nöjda kunder vid namn och bemöt kritiken i de negativa konkret.',
    impactSv:       'Att svara på recensioner stärker din lokala ranking och visar nya kunder att du bryr dig. Företag som svarar på 90 %+ av sina recensioner ser ofta 0,2–0,5 stjärnor högre betyg inom 90 dagar.',
    timeEstimateSv: '30 minuter',
  },
  {
    priority:     2,
    category:     'SEO',
    title:        'Rewrite your homepage title so more people click',
    description:  'Your homepage ranks #2 for your main search but far fewer people click it than normal at that position. Rewrite the page title with your city and something that sets you apart — e.g. "Frisör Södermalm — Boka online idag | Studio Söder".',
    impact:       'A better title at position 2 could multiply your clicks without any ranking change — the single highest-leverage move available right now.',
    timeEstimate: '1 hour',
    titleSv:        'Skriv om hemsidans titel så fler klickar',
    descriptionSv:  'Din hemsida ligger på plats 2 för din viktigaste sökning, men får långt färre klick än normalt för den placeringen. Skriv om sidtiteln med din stadsdel och något som sticker ut — t.ex. "Frisör Södermalm — Boka online idag | Studio Söder".',
    impactSv:       'En bättre titel på plats 2 kan mångdubbla dina klick utan att rankingen ändras — den enskilt mest lönsamma åtgärden just nu.',
    timeEstimateSv: '1 timme',
  },
  {
    priority:     3,
    category:     'Ads',
    title:        'Pause the ad keywords that bring no bookings',
    description:  'Two keywords have spent over 700 kr combined without a single booking. Open the Ads page, find them in the list, and pause them.',
    impact:       'Stops the waste immediately and moves your budget to the searches that actually bring customers.',
    timeEstimate: '15 minutes',
    titleSv:        'Pausa annonssökorden som inte ger bokningar',
    descriptionSv:  'Två sökord har kostat över 700 kr tillsammans utan en enda bokning. Öppna Annonser, hitta dem i listan och pausa dem.',
    impactSv:       'Stoppar slöseriet direkt och flyttar budgeten till sökningarna som faktiskt ger kunder.',
    timeEstimateSv: '15 minuter',
  },
  {
    priority:     4,
    category:     'Photos',
    title:        'Add salon interior and team photos to your Google profile',
    description:  'Your profile is missing interior and team photos — two of the most-viewed categories. Take 3–5 photos of the salon and the team at work and upload them from the Photos tab.',
    impact:       'Listings with complete photo sets get up to 42% more direction requests and 35% more website clicks than profiles without.',
    timeEstimate: '1–2 hours',
    titleSv:        'Lägg upp foton på salongen och teamet på din Google-profil',
    descriptionSv:  'Din profil saknar interiör- och teamfoton — två av de mest visade kategorierna. Ta 3–5 bilder på salongen och teamet i arbete och ladda upp dem från Foton-fliken.',
    impactSv:       'Profiler med kompletta fotouppsättningar får upp till 42 % fler vägbeskrivningar och 35 % fler klick till hemsidan.',
    timeEstimateSv: '1–2 timmar',
  },
  {
    priority:     5,
    category:     'SEO',
    title:        'Create a page for your most-searched missing treatment',
    description:  'People search for a treatment you offer 1 000+ times a month, but you have no page for it and sit beyond position 30. Create a dedicated page with a clear headline, description, prices, and a booking button.',
    impact:       'A dedicated page can reach page 1 within 2–3 months, capturing customers who currently book with competitors.',
    timeEstimate: '2–3 hours',
    titleSv:        'Skapa en sida för din mest sökta saknade behandling',
    descriptionSv:  'Folk söker på en behandling du erbjuder över 1 000 gånger i månaden, men du har ingen sida för den och ligger bortom plats 30. Skapa en egen sida med tydlig rubrik, beskrivning, priser och en bokningsknapp.',
    impactSv:       'En egen sida kan nå sida 1 inom 2–3 månader och fånga kunder som idag bokar hos konkurrenterna.',
    timeEstimateSv: '2–3 timmar',
  },
]

function getWeekKey() {
  const now    = new Date()
  const day    = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return `kiterank_done_${monday.toISOString().split('T')[0]}`
}

export function ActionPlanPanel() {
  const [loading, setLoading] = useState(false)
  const [actions, setActions] = useState<Action[]>(MOCK_ACTIONS)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState<Set<number>>(new Set())

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getWeekKey())
      if (stored) setDone(new Set(JSON.parse(stored)))
    } catch {}
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/action-plan', { method: 'POST' })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      if (data.actions?.length) setActions(data.actions)
    } catch {
      setError('Could not refresh. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function markDone(priority: number) {
    setDone(prev => {
      const next = new Set(prev).add(priority)
      try { localStorage.setItem(getWeekKey(), JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  const allDone = actions.length > 0 && actions.every(a => done.has(a.priority))

  if (allDone) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-8 py-10 text-center space-y-2">
        <p className="text-green-400 text-lg font-semibold">All done this week</p>
        <p className="text-slate-400 text-sm">New priorities will appear on Monday. Come back then to see what to focus on next.</p>
        <button
          onClick={load}
          disabled={loading}
          className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh early'}
        </button>
      </div>
    )
  }

  return (
    <div>
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {/* 2-column grid — each card gets ~half the available width, keeping text readable */}
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => {
          const isDone = done.has(action.priority)
          return (
            <div
              key={action.priority}
              className={`bg-navy-800 rounded-2xl border border-navy-700 p-5 transition-opacity flex flex-col ${isDone ? 'opacity-40' : ''}`}
            >
              <div className="flex items-start gap-4">

                {/* Priority badge */}
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDone ? 'bg-green-500/20' : 'bg-mustard/15'
                }`}>
                  {isDone
                    ? <span className="text-green-400 text-lg">✓</span>
                    : <span className="text-mustard font-bold text-sm">#{action.priority}</span>
                  }
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Category + time */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs border px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[action.category] ?? 'text-slate-400 bg-navy-700 border-navy-600'}`}>
                      {action.category}
                    </span>
                    <span className="text-slate-500 text-xs">⏱ {action.timeEstimate}</span>
                  </div>

                  {/* Title */}
                  <p className={`text-white font-semibold text-sm leading-snug ${isDone ? 'line-through text-slate-500' : ''}`}>
                    {action.title}
                  </p>

                  {!isDone && (
                    <>
                      <p className="text-slate-400 text-sm leading-relaxed">{action.description}</p>
                      <div className="bg-navy-700/60 rounded-lg px-3 py-2.5">
                        <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Expected impact</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{action.impact}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!isDone && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => markDone(action.priority)}
                    className="text-xs text-slate-600 hover:text-green-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-green-500/10"
                  >
                    Mark as done
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
