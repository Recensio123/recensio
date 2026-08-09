'use client'
import { useState, useEffect } from 'react'
import { Tooltip }             from '@/components/Tooltip'
import { useLang }             from '@/components/LanguageProvider'
import { SeasonalCalendar }    from './SeasonalCalendar'
import type { Query }          from './KeywordTable'
import type { KeywordIdea }    from '@/app/api/ads/keyword-ideas/route'

type Tab = 'target' | 'growing' | 'seasonal' | 'watchlist'

const T = {
  sv: {
    volumeTip:     'Hur många som söker på frasen varje månad. Hög volym betyder fler möjliga besökare — men ofta också fler konkurrenter.',
    difficultyTip: 'Hur svårt det är att nå sida 1 för frasen. Låg svårighet är den enklaste startpunkten.',
    perMonthTip:   'Genomsnittligt antal sökningar per månad det senaste året.',
    yoyTip:        'Hur mycket sökvolymen ändrats jämfört med samma period förra året. Plus betyder växande efterfrågan.',
    compTip:       'Hur många andra som konkurrerar om frasen. Lätt att ranka betyder att en bra, vanlig sida ofta räcker.',
  },
  en: {
    volumeTip:     'How many people search this phrase each month. High volume means more potential visitors — but often more competitors too.',
    difficultyTip: 'How hard it is to reach page 1 for this phrase. Low difficulty is the easiest place to start.',
    perMonthTip:   'Average number of searches per month over the last year.',
    yoyTip:        'How much search volume has changed versus the same period last year. Plus means growing demand.',
    compTip:       'How many others compete for this phrase. Easy to rank means a solid, ordinary page is often enough.',
  },
}

const TABS: { id: Tab; label: { sv: string; en: string }; description: { sv: string; en: string } }[] = [
  {
    id: 'target',
    label:       { sv: 'Satsa på härnäst', en: 'Target next' },
    description: {
      sv: 'Sökord som är värda att lägga till på din hemsida och Google-profil just nu',
      en: 'Keywords worth adding to your website and Google profile right now',
    },
  },
  {
    id: 'growing',
    label:       { sv: 'Växande', en: 'Growing' },
    description: {
      sv: 'Sökord som söks mer än förra året — efterfrågan ökar',
      en: 'Keywords getting more searches than last year — demand is building',
    },
  },
  {
    id: 'seasonal',
    label:       { sv: 'Säsong', en: 'Seasonal' },
    description: {
      sv: 'Kommande söktoppar baserat på årsmönster för din verksamhet',
      en: 'Upcoming search peaks based on year-on-year patterns for your business',
    },
  },
  {
    id: 'watchlist',
    label:       { sv: 'Min bevakningslista', en: 'My watchlist' },
    description: {
      sv: 'Sökord du följer — se hur efterfrågan ändras månad för månad, oavsett om du rankar för dem eller inte',
      en: 'Keywords you follow — see how demand changes month by month, whether you rank for them or not',
    },
  },
]

/* ── Target next ─────────────────────────────────────────────────────────── */

type Suggestion = { keyword: string; rationale: string; volume: string; difficulty: string }

const MOCK_SUGGESTIONS: Suggestion[] = [
  { keyword: 'frisör nära mig',             rationale: 'High intent — the most common way people find a new salon',        volume: 'High',   difficulty: 'Medium' },
  { keyword: 'balayage södermalm',          rationale: 'High-value colour treatment with strong booking intent',           volume: 'Medium', difficulty: 'Low'    },
  { keyword: 'drop in frisör stockholm',    rationale: 'Same-day availability searches convert exceptionally well',        volume: 'Medium', difficulty: 'Low'    },
  { keyword: 'keratinbehandling stockholm', rationale: 'Premium treatment keyword — high price point per booking',         volume: 'Medium', difficulty: 'Medium' },
  { keyword: 'barnklippning södermalm',     rationale: 'Family bookings bring repeat visits across the whole household',   volume: 'Medium', difficulty: 'Low'    },
]

// Swedish display text for the mock suggestions (mock data itself stays untouched)
const RATIONALE_SV: Record<string, string> = {
  'frisör nära mig':             'Hög köpvilja — det vanligaste sättet folk hittar en ny salong',
  'balayage södermalm':          'Värdefull färgbehandling med stark bokningsvilja',
  'drop in frisör stockholm':    'Sökningar på tid samma dag leder ofta direkt till bokning',
  'keratinbehandling stockholm': 'Premiumbehandling — högt pris per bokning',
  'barnklippning södermalm':     'Familjebokningar ger återkommande besök från hela hushållet',
}

const LEVEL_SV: Record<string, string> = { High: 'Hög', Medium: 'Medel', Low: 'Låg' }

function TargetTab() {
  const { lang } = useLang()
  const [loading,     setLoading]     = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS)

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/ai/keywords', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.suggestions?.length) setSuggestions(data.suggestions)
    } catch { /* keep mock */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-navy-900 rounded-xl p-4 border border-navy-700">
          <div className="h-4 w-1/3 bg-navy-700 rounded animate-pulse mb-2" />
          <div className="h-3 w-2/3 bg-navy-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <div key={i} className="bg-navy-900 rounded-xl px-4 py-3.5 border border-navy-700 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-white text-sm font-medium">{s.keyword}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {lang === 'sv' ? RATIONALE_SV[s.keyword] ?? s.rationale : s.rationale}
            </p>
          </div>
          <div className="shrink-0 text-right space-y-0.5">
            <Tooltip text={T[lang].volumeTip}>
              <p className="text-xs text-slate-400 cursor-default">
                {lang === 'sv' ? 'Volym' : 'Vol'}{' '}
                <span className="text-white">{lang === 'sv' ? LEVEL_SV[s.volume] ?? s.volume : s.volume}</span>
              </p>
            </Tooltip>
            <Tooltip text={T[lang].difficultyTip}>
              <p className="text-xs text-slate-400 cursor-default">
                {lang === 'sv' ? 'Svårighet' : 'Diff'}{' '}
                <span className="text-white">{lang === 'sv' ? LEVEL_SV[s.difficulty] ?? s.difficulty : s.difficulty}</span>
              </p>
            </Tooltip>
          </div>
        </div>
      ))}
      <button onClick={load} className="text-xs text-slate-500 hover:text-slate-300 transition-colors pt-1">
        {lang === 'sv' ? 'Uppdatera förslag' : 'Refresh suggestions'}
      </button>
    </div>
  )
}

/* ── Shared bits ─────────────────────────────────────────────────────────── */

function VolumeSparkline({ values }: { values: number[] }) {
  if (!values.length) return null
  const W = 56, H = 22, PAD = 1
  const min = Math.min(...values), max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const x = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const growing = values[values.length - 1] > values[0]
  const stroke  = growing ? '#4ade80' : '#f87171'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible shrink-0">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2" fill={stroke} />
    </svg>
  )
}

function CompBadge({ c }: { c: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const { lang } = useLang()
  const cfg = {
    LOW:    { label: lang === 'sv' ? 'Lätt att ranka'    : 'Easy to rank', cls: 'text-green-400 bg-green-500/10 border-green-500/20' },
    MEDIUM: { label: lang === 'sv' ? 'Medel'             : 'Medium',       cls: 'text-mustard   bg-mustard/10   border-mustard/20'   },
    HIGH:   { label: lang === 'sv' ? 'Hård konkurrens'   : 'Competitive',  cls: 'text-red-400   bg-red-500/10   border-red-500/20'   },
  }[c]
  return (
    <Tooltip text={T[lang].compTip}>
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border cursor-default ${cfg.cls}`}>
        {cfg.label}
      </span>
    </Tooltip>
  )
}

/* ── Growing keywords ────────────────────────────────────────────────────── */

type GrowFilter = 'all' | 'growing' | 'easy'
const GROW_FILTERS: { id: GrowFilter; label: { sv: string; en: string } }[] = [
  { id: 'all',     label: { sv: 'Alla',            en: 'All'             } },
  { id: 'growing', label: { sv: 'Växer snabbt',    en: 'Growing fast'    } },
  { id: 'easy',    label: { sv: 'Låg konkurrens',  en: 'Low competition' } },
]

function GrowingTab() {
  const { lang } = useLang()
  const [ideas,   setIdeas]   = useState<KeywordIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<GrowFilter>('all')

  useEffect(() => {
    fetch('/api/ads/keyword-ideas')
      .then(r => r.json())
      .then(d => setIdeas(d.ideas ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = ideas.filter(k => {
    if (filter === 'growing') return k.yoyGrowth >= 20
    if (filter === 'easy')    return k.competition === 'LOW'
    return true
  })

  return (
    <div>
      <div className="flex gap-1 mb-3 bg-navy-900/60 p-1 rounded-lg w-fit flex-wrap">
        {GROW_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === f.id ? 'bg-navy-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {f.label[lang]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-navy-900 rounded-xl p-4 border border-navy-700">
              <div className="h-4 w-1/3 bg-navy-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/4 bg-navy-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((k, i) => (
            <div key={i} className="bg-navy-900 rounded-xl border border-navy-700 px-4 py-3.5 flex items-center gap-4 flex-wrap">
              <Tooltip text={T[lang].perMonthTip}>
                <div className="shrink-0 w-14 text-right cursor-default">
                  <p className="text-white text-sm font-bold tabular-nums">
                    {k.avgVolume >= 1000 ? `${(k.avgVolume / 1000).toFixed(1)}k` : k.avgVolume}
                  </p>
                  <p className="text-slate-500 text-xs">{lang === 'sv' ? 'sök/mån' : 'searches/mo'}</p>
                </div>
              </Tooltip>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{k.keyword}</p>
                <div className="mt-0.5"><CompBadge c={k.competition} /></div>
              </div>
              <Tooltip text={T[lang].yoyTip}>
                <div className="shrink-0 w-14 text-right cursor-default">
                  {k.yoyGrowth !== 0 && (
                    <p className={`text-sm font-semibold tabular-nums ${k.yoyGrowth >= 20 ? 'text-green-400' : k.yoyGrowth > 0 ? 'text-green-300' : 'text-red-400'}`}>
                      {k.yoyGrowth > 0 ? '+' : ''}{k.yoyGrowth}%
                    </p>
                  )}
                  <p className="text-slate-500 text-xs">{lang === 'sv' ? 'på 1 år' : 'YoY'}</p>
                </div>
              </Tooltip>
              <VolumeSparkline values={k.monthlyVolume} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── My watchlist (merged in from the old standalone Keyword research panel) ── */

const SEED_KEYWORDS = ['frisör stockholm', 'balayage stockholm', 'klippning pris']

function mockForKeyword(keyword: string): KeywordIdea {
  const h = [...keyword].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 17)
  const base    = 80 + (h % 700)
  const growing = h % 3 !== 0
  const months  = Array.from({ length: 12 }, (_, i) => {
    const seasonal = 0.65 + 0.65 * Math.sin((i - 3) * Math.PI / 6)
    const trend    = growing ? 1 + i * 0.025 : 1 - i * 0.012
    return Math.max(10, Math.round(base * seasonal * trend))
  })
  const comps: Array<'LOW' | 'MEDIUM' | 'HIGH'> = ['LOW', 'MEDIUM', 'HIGH']
  const comp    = comps[h % 3]
  const compIdx = comp === 'LOW' ? 10 + (h % 25) : comp === 'MEDIUM' ? 40 + (h % 25) : 65 + (h % 25)
  return {
    keyword,
    avgVolume:        base,
    monthlyVolume:    months,
    yoyGrowth:        growing ? 12 + (h % 28) : -(6 + (h % 18)),
    competition:      comp,
    competitionIndex: compIdx,
  }
}

function last12MonthLabels(lang: 'sv' | 'en'): string[] {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return d.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { month: 'short' })
  })
}

function VolumeChart({ values, growing }: { values: number[]; growing: boolean }) {
  const { lang } = useLang()
  const labels  = last12MonthLabels(lang)
  const max     = Math.max(...values)
  const avg     = Math.round(values.reduce((s, v) => s + v, 0) / values.length)
  const BAR_H   = 96
  const avgPct  = ((avg / max) * 100).toFixed(1)

  return (
    <div className="mt-4 pt-4 border-t border-navy-700/60">
      <p className="text-slate-500 text-xs mb-4">
        {lang === 'sv' ? 'Sökvolym per månad — senaste 12 månaderna' : 'Monthly search volume — last 12 months'}
      </p>

      <div className="relative flex items-end gap-1">
        <div
          className="absolute left-0 right-0 border-t border-dashed border-slate-600/50 pointer-events-none z-10"
          style={{ bottom: `calc(${avgPct}% + 20px)` }}
        >
          <span className="absolute -top-4 right-0 text-xs text-slate-500">{lang === 'sv' ? 'snitt' : 'avg'}</span>
        </div>

        {values.map((v, i) => {
          const isLast   = i === values.length - 1
          const heightPx = Math.max(6, Math.round((v / max) * BAR_H))
          const isAbove  = v >= avg
          const barColor = isLast
            ? (growing ? 'bg-green-500' : 'bg-mustard')
            : isAbove
              ? (growing ? 'bg-green-500/40' : 'bg-mustard/40')
              : 'bg-navy-600'

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ paddingBottom: 20 }}>
              {(isLast || v === max) && (
                <span className={`text-xs tabular-nums font-semibold ${isLast ? 'text-white' : 'text-slate-500'}`}>
                  {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                </span>
              )}
              <div
                className={`w-full rounded-t-sm transition-all ${barColor}`}
                style={{ height: heightPx }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex gap-1 mt-1">
        {labels.map((lbl, i) => (
          <div key={i} className="flex-1 text-center">
            {(i % 3 === 0 || i === labels.length - 1) && (
              <span className={`text-xs ${i === labels.length - 1 ? 'text-white font-semibold' : 'text-slate-500'}`}>
                {lbl}
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="text-slate-500 text-xs mt-3">
        {lang === 'sv' ? 'I snitt ' : 'Average '}
        <span className="text-white font-medium">
          {avg.toLocaleString('sv-SE')} {lang === 'sv' ? 'sökningar/månad' : 'searches/month'}
        </span>
        {' · '}
        <span className={growing ? 'text-green-400' : 'text-red-400'}>
          {lang === 'sv'
            ? `${growing ? 'Ökar' : 'Minskar'} jämfört med förra året`
            : `${growing ? 'Growing' : 'Declining'} year over year`}
        </span>
      </p>
    </div>
  )
}

function WatchlistTab() {
  const { lang } = useLang()
  const [allIdeas,  setAllIdeas]  = useState<KeywordIdea[]>([])
  const [watchlist, setWatchlist] = useState<KeywordIdea[]>([])
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [adding,    setAdding]    = useState(false)
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/ads/keyword-ideas')
      .then(r => r.json())
      .then(d => {
        const ideas: KeywordIdea[] = d.ideas ?? []
        setAllIdeas(ideas)
        const seeded = SEED_KEYWORDS.map(kw =>
          ideas.find(i => i.keyword.toLowerCase() === kw.toLowerCase()) ?? mockForKeyword(kw)
        )
        setWatchlist(seeded)
      })
      .catch(() => {
        setWatchlist(SEED_KEYWORDS.map(mockForKeyword))
      })
      .finally(() => setLoading(false))
  }, [])

  function addKeyword() {
    const kw = input.trim()
    if (!kw) return
    if (watchlist.some(w => w.keyword.toLowerCase() === kw.toLowerCase())) {
      setInput(''); setAdding(false); return
    }
    const entry = allIdeas.find(i => i.keyword.toLowerCase() === kw.toLowerCase()) ?? mockForKeyword(kw)
    setWatchlist(prev => [...prev, entry])
    setExpanded(entry.keyword)
    setInput(''); setAdding(false)
  }

  function removeKeyword(kw: string, e: React.MouseEvent) {
    e.stopPropagation()
    setWatchlist(prev => prev.filter(w => w.keyword !== kw))
    if (expanded === kw) setExpanded(null)
  }

  return (
    <div>
      {/* Add row */}
      <div className="mb-3">
        {adding ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  addKeyword()
                if (e.key === 'Escape') { setAdding(false); setInput('') }
              }}
              placeholder={lang === 'sv' ? 't.ex. rörmokare norrmalm' : 'e.g. rörmokare norrmalm'}
              className="flex-1 bg-navy-900 border border-navy-600 focus:border-mustard text-white placeholder-slate-500 text-sm rounded-lg px-3 py-2 focus:outline-none"
            />
            <button
              onClick={addKeyword}
              disabled={!input.trim()}
              className="px-4 py-2 bg-mustard hover:bg-mustard/90 disabled:opacity-40 text-navy-950 text-sm font-semibold rounded-lg transition-colors shrink-0"
            >
              {lang === 'sv' ? 'Lägg till' : 'Add'}
            </button>
            <button
              onClick={() => { setAdding(false); setInput('') }}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-navy-700 hover:bg-navy-600 border border-navy-600 px-3 py-1.5 rounded-lg transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {lang === 'sv' ? 'Bevaka sökord' : 'Track keyword'}
          </button>
        )}
      </div>

      {/* Rows */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-16 h-8 bg-navy-700 rounded" />
              <div className="flex-1 h-4 bg-navy-700 rounded" />
              <div className="w-24 h-4 bg-navy-700 rounded" />
            </div>
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 text-sm">
            {lang === 'sv' ? 'Inga sökord bevakas ännu.' : 'No keywords tracked yet.'}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {lang === 'sv'
              ? 'Klicka på ”Bevaka sökord” för att lägga till det första.'
              : 'Click “Track keyword” to add the first one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {watchlist.map((kw) => {
            const isOpen    = expanded === kw.keyword
            const isGrowing = kw.yoyGrowth > 0

            return (
              <div
                key={kw.keyword}
                onClick={() => setExpanded(isOpen ? null : kw.keyword)}
                className={`bg-navy-900 rounded-xl border border-navy-700 px-4 py-3.5 cursor-pointer transition-colors group ${isOpen ? 'bg-navy-700/30' : 'hover:bg-navy-700/20'}`}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <Tooltip text={T[lang].perMonthTip}>
                    <div className="w-16 shrink-0 cursor-default">
                      <p className="text-white text-sm font-bold tabular-nums leading-tight">
                        {kw.avgVolume >= 1000
                          ? `${(kw.avgVolume / 1000).toFixed(1)}k`
                          : kw.avgVolume}
                      </p>
                      <p className="text-slate-500 text-xs">{lang === 'sv' ? 'sök/mån' : 'searches/mo'}</p>
                    </div>
                  </Tooltip>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{kw.keyword}</p>
                    <div className="mt-0.5"><CompBadge c={kw.competition} /></div>
                  </div>

                  <Tooltip text={T[lang].yoyTip}>
                    <div className="shrink-0 text-right cursor-default">
                      <p className={`text-sm font-bold tabular-nums ${isGrowing ? 'text-green-400' : 'text-red-400'}`}>
                        {kw.yoyGrowth > 0 ? '+' : ''}{kw.yoyGrowth}%
                      </p>
                      <p className="text-slate-500 text-xs">{lang === 'sv' ? 'mot förra året' : 'vs last year'}</p>
                    </div>
                  </Tooltip>

                  <button
                    onClick={(e) => removeKeyword(kw.keyword, e)}
                    className="shrink-0 p-1 text-slate-700 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                    title={lang === 'sv' ? 'Ta bort' : 'Remove'}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <svg
                    className={`w-4 h-4 text-slate-600 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isOpen && (
                  <VolumeChart values={kw.monthlyVolume} growing={isGrowing} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Main panel — one home for every keyword you don't rank for yet ───────── */

export function OpportunitiesPanelTest2({ queries }: { queries: Query[] }) {
  const { lang } = useLang()
  const [tab, setTab] = useState<Tab>('target')
  const active = TABS.find(t => t.id === tab)!

  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-navy-700 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-2 sm:px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
              tab === t.id
                ? 'text-white border-mustard'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t.label[lang]}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-slate-500 text-xs px-5 pt-3 pb-0">{active.description[lang]}</p>

      {/* Content */}
      <div className="p-5 pt-3">
        {tab === 'target'    && <TargetTab />}
        {tab === 'growing'   && <GrowingTab />}
        {tab === 'seasonal'  && <SeasonalCalendar queries={queries} />}
        {tab === 'watchlist' && <WatchlistTab />}
      </div>
    </div>
  )
}
