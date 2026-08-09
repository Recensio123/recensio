'use client'
import { Tooltip } from '@/components/Tooltip'
import { useLang } from '@/components/LanguageProvider'
import { HelpButton } from '@/components/dashboard/HelpButton'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlatformKey = 'chatgpt' | 'perplexity' | 'gemini' | 'aiOverview'

interface PlatformResult {
  mentioned:  boolean
  position:   number | null
  snippet?:   string     // excerpt from the AI response where business appeared
  citations?: string[]   // source URLs cited (Perplexity + Gemini natively; AI Overviews via DataForSEO)
}

export interface AIPromptResult {
  prompt:     string
  chatgpt:    PlatformResult
  perplexity: PlatformResult
  gemini:     PlatformResult
  aiOverview: PlatformResult
}

export interface AICompetitor {
  name:       string
  chatgpt:    number
  perplexity: number
  gemini:     number
  aiOverview: number
}

export interface WeeklyTrendPoint {
  week:       string
  chatgpt:    number
  perplexity: number
  gemini:     number
  aiOverview: number
}

export interface AIVisibilityData {
  totalPrompts: number
  results:      AIPromptResult[]
  competitors:  AICompetitor[]
  weeklyTrend:  WeeklyTrendPoint[]
}

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS: { key: PlatformKey; name: string; color: string; descSv: string; descEn: string }[] = [
  {
    key: 'chatgpt', name: 'ChatGPT', color: '#10a37f',
    descSv: "OpenAI:s assistent — används ofta för frågor som 'vem är bäst på X nära Y'",
    descEn: "OpenAI's assistant — widely used for 'who is the best X near Y' recommendations",
  },
  {
    key: 'perplexity', name: 'Perplexity', color: '#20b2aa',
    descSv: 'Sökfokuserad AI som visar sina källor, används allt mer för att hitta lokala tjänster',
    descEn: 'Search-focused AI that cites sources, increasingly used for local service queries',
  },
  {
    key: 'gemini', name: 'Gemini', color: '#8b5cf6',
    descSv: 'Googles AI-assistent, inbyggd i Google-sök och Android',
    descEn: "Google's AI assistant, integrated into Search and Android",
  },
  {
    key: 'aiOverview', name: 'AI Overviews', color: '#4285f4',
    descSv: 'Googles AI-sammanfattningar som visas överst i sökresultaten för många sökningar',
    descEn: "Google's AI-generated summaries shown above organic results for many searches",
  },
]

function getPlatformVal(obj: AICompetitor, key: PlatformKey): number {
  if (key === 'chatgpt')    return obj.chatgpt
  if (key === 'perplexity') return obj.perplexity
  if (key === 'gemini')     return obj.gemini
  return obj.aiOverview
}

// ─── Strings ──────────────────────────────────────────────────────────────────

const T = {
  sv: {
    title:            'AI-synlighet',
    subtitle:         'Blir ditt företag rekommenderat när folk frågar AI-tjänster om hjälp?',
    sample:           'Exempeldata',
    promptsMentioned: 'frågor nämnde dig',
    mentionedTooltip: (name: string, total: number) => `Vi testar ${total} vanliga sökfrågor varje vecka. Siffran visar i hur många av dem ${name} nämnde ditt företag i sitt svar.`,
    avgPosition:      (p: string) => `snittplats #${p}`,
    avgPosTooltip:    'När du nämns får du en plats i tjänstens lista med förslag. Detta är din genomsnittliga plats — plats 1 är bäst.',
    notMentioned:     'nämns inte',
    sovTitle:         'Så syns du jämfört med konkurrenterna',
    sovTooltip:       'Hur ofta varje företag dyker upp i alla testade frågor och alla AI-tjänster tillsammans. Totalt antal platser = antal frågor × 4 tjänster.',
    totalChecks:      (n: number) => `${n} kontroller totalt`,
    business:         'Företag',
    shareOfVoice:     'Andel av utrymmet',
    you:              'du',
    promptsTitle:     'Fråga för fråga',
    promptsTooltip:   'Varje rad är en sökfråga som testas varje vecka i alla fyra tjänsterna. En bock med en siffra betyder att ditt företag nämndes i svaret, på den platsen.',
    promptsTested:    (n: number) => `${n} frågor testas varje vecka`,
    searchPrompt:     'Sökfråga',
    totalMentions:    'Antal omnämnanden',
    excerptsTitle:    'Vad AI säger om dig',
    excerptsTooltip:  'Exakt så här skrev varje AI-tjänst när den rekommenderade ditt företag. Det visar hur AI beskriver dig — vilket speglar vad de plockar upp från dina recensioner, din hemsida och dina kataloger.',
    sourcesTitle:     'Vilka källor AI läser',
    sourcesTooltip:   'Webbplatserna varje AI-tjänst hämtar sin information från när den ger rekommendationer. Det är de profilerna du behöver hålla korrekta och uppdaterade — citerar en tjänst inte en källa, så läser den inte den.',
    citation:         (n: number) => `${n} ${n === 1 ? 'källhänvisning' : 'källhänvisningar'}`,
    sourcesNote:      'Håll dessa profiler uppdaterade — gammal information på källorna påverkar direkt hur AI-tjänsterna beskriver ditt företag.',
    trendTitle:       'Omnämnanden — senaste 8 veckorna',
    trendTooltip:     'Hur många av dina bevakade frågor varje AI-tjänst nämnde ditt företag i, vecka för vecka. En stigande kurva betyder att AI-tjänsterna rekommenderar dig allt oftare.',
  },
  en: {
    title:            'AI Search Visibility',
    subtitle:         'Does your business get recommended when people ask AI assistants for a service?',
    sample:           'Sample data',
    promptsMentioned: 'prompts mentioned you',
    mentionedTooltip: (name: string, total: number) => `We test ${total} common search prompts every week. The number shows how many of them ${name} mentioned your business in.`,
    avgPosition:      (p: string) => `avg. position #${p}`,
    avgPosTooltip:    'When mentioned, your business gets a position in the list of suggestions. This is your average — position 1 is best.',
    notMentioned:     'not mentioned',
    sovTitle:         'Competitor share of voice',
    sovTooltip:       'How often each business appears across all tested prompts and all AI platforms combined. Total slots = number of prompts × 4 platforms.',
    totalChecks:      (n: number) => `${n} total checks`,
    business:         'Business',
    shareOfVoice:     'Share of voice',
    you:              'you',
    promptsTitle:     'Prompt breakdown',
    promptsTooltip:   "Each row is a search prompt tested weekly across all four platforms. A tick with a number means your business appeared in that AI's response at that position.",
    promptsTested:    (n: number) => `${n} prompts tested weekly`,
    searchPrompt:     'Search prompt',
    totalMentions:    'Total mentions',
    excerptsTitle:    'What AI says about you',
    excerptsTooltip:  'The actual words each AI used when recommending your business — pulled directly from the response. This shows how AI engines describe you, which reflects what signals they are picking up from your reviews, website, and listings.',
    sourcesTitle:     'What sources AI is reading',
    sourcesTooltip:   "The websites each AI platform cites when forming its recommendations. These are the profiles you need to keep accurate and up to date — if a platform doesn't cite a source, it isn't reading it.",
    citation:         (n: number) => `${n} ${n === 1 ? 'citation' : 'citations'}`,
    sourcesNote:      'Keep these profiles updated — outdated information on cited sources directly affects how AI engines describe your business.',
    trendTitle:       'Mention trend — last 8 weeks',
    trendTooltip:     'How many of your tracked prompts each AI platform mentioned your business for, week by week. An upward trend means AI engines are increasingly recommending you.',
  },
}

// ─── Trend chart ──────────────────────────────────────────────────────────────

function TrendChart({ trend, totalPrompts }: { trend: WeeklyTrendPoint[]; totalPrompts: number }) {
  const W = 580, H = 100, padX = 28, padY = 8
  const n = trend.length
  const xPos = (i: number) => padX + (i / (n - 1)) * (W - padX * 2)
  const yPos = (v: number) => padY + (1 - v / (totalPrompts || 1)) * (H - padY * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" aria-hidden="true">
      {Array.from({ length: totalPrompts + 1 }, (_, v) => (
        <g key={v}>
          <line x1={padX} x2={W - padX} y1={yPos(v)} y2={yPos(v)} stroke="#1e2d3d" strokeWidth={1} />
          <text x={padX - 5} y={yPos(v) + 3.5} textAnchor="end" fontSize={8} fill="#475569">{v}</text>
        </g>
      ))}
      {PLATFORMS.map(p => (
        <polyline
          key={p.key}
          points={trend.map((t, i) => `${xPos(i)},${yPos(t[p.key])}`).join(' ')}
          fill="none" stroke={p.color} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" opacity={0.9}
        />
      ))}
      {trend.map((t, i) => i % 2 === 0 ? (
        <text key={i} x={xPos(i)} y={H + 16} textAnchor="middle" fontSize={8} fill="#64748b">{t.week}</text>
      ) : null)}
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIVisibilityDashboard({ data }: { data: AIVisibilityData }) {
  const { lang } = useLang()
  const L = T[lang]
  const totalSlots = data.totalPrompts * PLATFORMS.length

  // Per-platform summary (you)
  const summaries = PLATFORMS.map(p => {
    const mentioned = data.results.filter(r => r[p.key].mentioned).length
    const positions = data.results.filter(r => r[p.key].mentioned).map(r => r[p.key].position!)
    const avgPos    = positions.length > 0 ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1) : null
    return { ...p, mentioned, avgPos }
  })

  // Competitor table rows — "you" first if tied, competitors sorted by total
  const youRow: AICompetitor & { isYou: boolean; total: number } = {
    name:       lang === 'sv' ? 'Ditt företag' : 'Your business',
    chatgpt:    summaries.find(s => s.key === 'chatgpt')!.mentioned,
    perplexity: summaries.find(s => s.key === 'perplexity')!.mentioned,
    gemini:     summaries.find(s => s.key === 'gemini')!.mentioned,
    aiOverview: summaries.find(s => s.key === 'aiOverview')!.mentioned,
    total:      0,
    isYou:      true,
  }
  youRow.total = youRow.chatgpt + youRow.perplexity + youRow.gemini + youRow.aiOverview

  const compRows = data.competitors
    .map(c => ({
      ...c,
      total: c.chatgpt + c.perplexity + c.gemini + c.aiOverview,
      isYou: false,
    }))
    .sort((a, b) => b.total - a.total)

  const allRows = [youRow, ...compRows].sort((a, b) => b.total - a.total)

  // Response excerpts — all mentions that have a snippet
  const excerpts: { platform: typeof PLATFORMS[0]; prompt: string; snippet: string }[] = []
  data.results.forEach(r => {
    PLATFORMS.forEach(p => {
      const res = r[p.key]
      if (res.mentioned && res.snippet) {
        excerpts.push({ platform: PLATFORMS.find(pl => pl.key === p.key)!, prompt: r.prompt, snippet: res.snippet })
      }
    })
  })

  // Citation sources — aggregated per domain across all prompts and platforms
  const citationsByPlatform: Partial<Record<PlatformKey, Record<string, number>>> = {}
  data.results.forEach(r => {
    PLATFORMS.forEach(p => {
      const citations = r[p.key].citations ?? []
      if (citations.length > 0) {
        if (!citationsByPlatform[p.key]) citationsByPlatform[p.key] = {}
        citations.forEach(url => {
          citationsByPlatform[p.key]![url] = (citationsByPlatform[p.key]![url] ?? 0) + 1
        })
      }
    })
  })
  const platformsWithCitations = PLATFORMS.filter(p => citationsByPlatform[p.key] && Object.keys(citationsByPlatform[p.key]!).length > 0)

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">{L.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{L.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
            {L.sample}
          </span>
          <HelpButton topic="ai-synlighet" />
        </div>
      </div>

      {/* ── Platform summary cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaries.map(p => {
          const pct = Math.round((p.mentioned / data.totalPrompts) * 100)
          return (
            <div key={p.key} className="bg-navy-800 rounded-xl border border-navy-700 p-4">
              <Tooltip text={lang === 'sv' ? p.descSv : p.descEn}>
                <div className="flex items-center gap-2 mb-3 cursor-default">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <p className="text-white text-sm font-semibold">{p.name}</p>
                </div>
              </Tooltip>
              <Tooltip text={L.mentionedTooltip(p.name, data.totalPrompts)}>
                <p className="text-3xl font-bold text-white tabular-nums leading-none cursor-default">
                  {p.mentioned}<span className="text-slate-500 text-lg font-normal"> / {data.totalPrompts}</span>
                </p>
              </Tooltip>
              <p className="text-slate-500 text-xs mt-1">{L.promptsMentioned}</p>
              <div className="mt-3 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color }} />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs font-semibold" style={{ color: pct > 0 ? p.color : '#475569' }}>{pct}%</span>
                {p.avgPos !== null
                  ? (
                    <Tooltip text={L.avgPosTooltip}>
                      <span className="text-slate-500 text-xs cursor-default">{L.avgPosition(p.avgPos)}</span>
                    </Tooltip>
                  )
                  : <span className="text-slate-500 text-xs">{L.notMentioned}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Competitor share of voice ──────────────────────────────────────── */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-3 border-b border-navy-700">
          <Tooltip text={L.sovTooltip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">{L.sovTitle}</p>
          </Tooltip>
          <span className="text-xs text-slate-500">{L.totalChecks(totalSlots)}</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[1fr_80px_80px_80px_80px_140px] gap-3 px-5 py-2.5 border-b border-navy-700">
              <span className="text-xs text-slate-500 font-medium">{L.business}</span>
              {PLATFORMS.map(p => (
                <span key={p.key} className="text-xs font-semibold text-center" style={{ color: p.color }}>{p.name}</span>
              ))}
              <span className="text-xs text-slate-500 font-medium text-right">{L.shareOfVoice}</span>
            </div>
            <div className="divide-y divide-navy-700">
              {allRows.map((row, i) => {
                const pct = Math.round((row.total / totalSlots) * 100)
                return (
                  <div key={i} className={`grid grid-cols-[1fr_80px_80px_80px_80px_140px] gap-3 px-5 py-3 items-center ${row.isYou ? 'bg-mustard/5' : ''}`}>
                    <span className={`text-sm font-medium ${row.isYou ? 'text-mustard' : 'text-white'}`}>
                      {row.name}
                      {row.isYou && <span className="text-xs font-normal text-mustard/50 ml-1.5">{L.you}</span>}
                    </span>
                    {PLATFORMS.map(p => (
                      <span key={p.key} className="text-center text-sm tabular-nums text-slate-300">
                        {getPlatformVal(row, p.key)}
                      </span>
                    ))}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-navy-700 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: row.isYou ? '#f0b429' : '#475569' }} />
                      </div>
                      <span className="text-xs tabular-nums w-8 text-right shrink-0" style={{ color: row.isYou ? '#f0b429' : '#94a3b8' }}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Prompt breakdown ──────────────────────────────────────────────── */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-3 border-b border-navy-700">
          <Tooltip text={L.promptsTooltip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">{L.promptsTitle}</p>
          </Tooltip>
          <span className="text-xs text-slate-500">{L.promptsTested(data.totalPrompts)}</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[1fr_110px_110px_110px_110px] gap-3 px-5 py-2.5 border-b border-navy-700">
              <span className="text-xs text-slate-500 font-medium">{L.searchPrompt}</span>
              {PLATFORMS.map(p => (
                <span key={p.key} className="text-xs font-semibold text-center" style={{ color: p.color }}>{p.name}</span>
              ))}
            </div>
            <div className="divide-y divide-navy-700">
              {data.results.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_110px_110px_110px] gap-3 px-5 py-3 items-center">
                  <span className="text-slate-300 text-sm">&ldquo;{row.prompt}&rdquo;</span>
                  {PLATFORMS.map(p => {
                    const res = row[p.key]
                    return (
                      <div key={p.key} className="flex justify-center">
                        {res.mentioned ? (
                          <Tooltip text={res.snippet ?? ''}>
                            <div className="flex items-center gap-1.5 cursor-default">
                              <span className="font-semibold" style={{ color: p.color }}>✓</span>
                              <span className="text-xs font-bold text-slate-300 tabular-nums">#{res.position}</span>
                              {res.snippet && <span className="text-slate-500 text-xs">›</span>}
                            </div>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-500">✗</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_110px_110px_110px_110px] gap-3 px-5 py-3 border-t border-navy-700 bg-navy-900/60">
              <span className="text-xs text-slate-500 font-medium">{L.totalMentions}</span>
              {summaries.map(p => (
                <div key={p.key} className="flex justify-center">
                  <span className="text-sm font-bold" style={{ color: p.mentioned > 0 ? p.color : '#475569' }}>{p.mentioned}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── What AI says about you ─────────────────────────────────────────── */}
      {excerpts.length > 0 && (
        <div className="space-y-3">
          <Tooltip text={L.excerptsTooltip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">
              {L.excerptsTitle}
            </p>
          </Tooltip>
          <div className="space-y-3">
            {excerpts.map((e, i) => (
              <div key={i} className="bg-navy-800 rounded-xl border border-navy-700 p-4">
                <div className="flex items-center gap-2 flex-wrap mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.platform.color }} />
                  <span className="text-xs font-semibold" style={{ color: e.platform.color }}>{e.platform.name}</span>
                  <span className="text-slate-500 text-xs">·</span>
                  <span className="text-slate-500 text-xs">&ldquo;{e.prompt}&rdquo;</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed border-l-2 pl-3" style={{ borderColor: e.platform.color + '60' }}>
                  {e.snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── What sources AI is reading ─────────────────────────────────────── */}
      {platformsWithCitations.length > 0 && (
        <div className="space-y-3">
          <Tooltip text={L.sourcesTooltip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">
              {L.sourcesTitle}
            </p>
          </Tooltip>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {platformsWithCitations.map(p => {
              const citations = citationsByPlatform[p.key]!
              const sorted    = Object.entries(citations).sort((a, b) => b[1] - a[1])
              return (
                <div key={p.key} className="bg-navy-800 rounded-xl border border-navy-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-semibold" style={{ color: p.color }}>{p.name}</span>
                  </div>
                  <div className="space-y-2">
                    {sorted.map(([domain, count]) => (
                      <div key={domain} className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm font-medium">{domain}</span>
                        <span className="text-slate-500 text-xs tabular-nums">
                          {L.citation(count)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-slate-400 text-xs px-1">
            {L.sourcesNote}
          </p>
        </div>
      )}

      {/* ── Weekly trend ──────────────────────────────────────────────────── */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <Tooltip text={L.trendTooltip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">
              {L.trendTitle}
            </p>
          </Tooltip>
          <div className="flex items-center gap-x-5 gap-y-1 flex-wrap">
            {PLATFORMS.map(p => (
              <div key={p.key} className="flex items-center gap-1.5">
                <span className="inline-block w-3 rounded-full" style={{ height: 2, backgroundColor: p.color }} />
                <span className="text-xs text-slate-400">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
        <TrendChart trend={data.weeklyTrend} totalPrompts={data.totalPrompts} />
      </div>

    </div>
  )
}
