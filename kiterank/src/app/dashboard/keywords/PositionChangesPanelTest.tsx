'use client'
import { useMemo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { useCoverage } from '@/components/DataCoverageProvider'
import { CoverageNote, MeasuringSince } from '@/components/dashboard/CoverageNote'

type Mover = {
  query:        string
  position:     number
  positionPrev: number
}

type Props = {
  improved?: Mover[]
  dropped?:  Mover[]
  period?:   'Weekly' | 'Monthly' | 'Yearly'
}

const MOCK_IMPROVED: Mover[] = [
  { query: 'frisör södermalm',          position: 3,  positionPrev: 8  },
  { query: 'balayage stockholm',        position: 4,  positionPrev: 7  },
  { query: 'frisör hornstull',          position: 2,  positionPrev: 5  },
  { query: 'klippning dam södermalm',   position: 6,  positionPrev: 11 },
]

const MOCK_DROPPED: Mover[] = [
  { query: 'hårfärgning stockholm',     position: 14, positionPrev: 10 },
  { query: 'billig frisör stockholm',   position: 22, positionPrev: 16 },
]

type PeriodKey = NonNullable<Props['period']>

const T = {
  sv: {
    title:    'Vad som ändrats i dina placeringar',
    titleTip: 'Plats är var du visas i Googles resultat — plats 1 är högst upp, så en lägre siffra är bättre. Pilen visar riktningen sedan förra perioden.',
    subtitle: (periodLabel: string) => `Sökord som gått upp eller ner på Google — ${periodLabel}`,
    subtitleStart: 'Placeringsändringar visas så snart vi har en hel period att jämföra mot.',
    empty:    'Inga större förändringar under perioden.',
    onGoogle: (page: string) => `${page} på Google`,
    period: {
      Weekly:  'denna vecka mot förra veckan',
      Monthly: 'denna månad mot förra månaden',
      Yearly:  'i år mot förra året',
    } as Record<PeriodKey, string>,
  },
  en: {
    title:    "What's changed in your rankings",
    titleTip: "Position is where you appear in Google's results — position 1 is the very top, so a lower number is better. The arrow shows the direction since last period.",
    subtitle: (periodLabel: string) => `Keywords that moved up or down on Google — ${periodLabel}`,
    subtitleStart: 'Ranking changes appear as soon as we hold a full period to compare against.',
    empty:    'No significant changes this period.',
    onGoogle: (page: string) => `${page} on Google`,
    period: {
      Weekly:  'this week vs last week',
      Monthly: 'this month vs last month',
      Yearly:  'this year vs last year',
    } as Record<PeriodKey, string>,
  },
}

function movementLabel(prev: number, current: number, lang: Lang) {
  const diff = prev - current  // positive = moved up (lower number = higher on Google)
  if (lang === 'sv') {
    if (diff >= 5)  return { text: `Hoppade upp ${diff} platser`, color: 'text-green-400' }
    if (diff >= 2)  return { text: `Gick upp ${diff} platser`,    color: 'text-green-400' }
    if (diff === 1) return { text: 'Gick upp 1 plats',            color: 'text-green-400' }
    if (diff <= -2) return { text: `Föll ${Math.abs(diff)} platser`, color: 'text-red-400' }
    return                 { text: 'Föll 1 plats',                 color: 'text-red-400' }
  }
  if (diff >= 5)  return { text: `Jumped up ${diff} spots`, color: 'text-green-400' }
  if (diff >= 2)  return { text: `Moved up ${diff} spots`,  color: 'text-green-400' }
  if (diff === 1) return { text: 'Moved up 1 spot',         color: 'text-green-400' }
  if (diff <= -2) return { text: `Dropped ${Math.abs(diff)} spots`, color: 'text-red-400' }
  return                 { text: 'Dropped 1 spot',           color: 'text-red-400' }
}

function pageLabel(rank: number, lang: Lang) {
  if (rank <= 3)  return lang === 'sv' ? 'Topp 3'  : 'Top 3'
  if (rank <= 10) return lang === 'sv' ? 'Sida 1'  : 'Page 1'
  if (rank <= 20) return lang === 'sv' ? 'Sida 2'  : 'Page 2'
  return                 lang === 'sv' ? 'Sida 3+' : 'Page 3+'
}

// Position moves compound over time: a week shows a slice of small nudges,
// a year shows fewer keywords but far bigger cumulative jumps. Only applied
// to the built-in mock data — caller-supplied movers pass through untouched.
// Deterministic factors, no randomness.
const MOVE_SCALE: Record<PeriodKey, number> = { Weekly: 0.4, Monthly: 1, Yearly: 2.5 }

function scaleMover(m: Mover, factor: number): Mover {
  const diff = m.positionPrev - m.position   // positive = improved
  const scaled = Math.sign(diff) * Math.max(1, Math.round(Math.abs(diff) * factor))
  return { ...m, positionPrev: Math.max(1, m.position + scaled) }
}

export function PositionChangesPanelTest({ improved, dropped, period = 'Monthly' }: Props) {
  const { lang } = useLang()
  const t = T[lang]
  const usingMock = improved === undefined && dropped === undefined

  // Every row here is a before → after comparison. Without a fully covered
  // preceding period there is nothing honest to compare against, so the moves
  // are withheld rather than invented.
  const coverage  = useCoverage('search', period)
  const showDelta = coverage.state === 'full'

  const all = useMemo(() => {
    let imp  = improved ?? MOCK_IMPROVED
    let drop = dropped  ?? MOCK_DROPPED
    if (usingMock && period !== 'Monthly') {
      const factor = MOVE_SCALE[period]
      if (period === 'Weekly') {
        // A single week only surfaces the freshest, smallest moves.
        imp  = imp.slice(0, 2).map(m => scaleMover(m, factor))
        drop = drop.slice(0, 1).map(m => scaleMover(m, factor))
      } else {
        imp  = imp.map(m => scaleMover(m, factor))
        drop = drop.map(m => scaleMover(m, factor))
      }
    }
    return [
      ...imp.map(k  => ({ ...k, direction: 'up'   as const })),
      ...drop.map(k => ({ ...k, direction: 'down' as const })),
    ].sort((a, b) => Math.abs(b.positionPrev - b.position) - Math.abs(a.positionPrev - a.position))
  }, [improved, dropped, usingMock, period])

  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-navy-700">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Tooltip text={t.titleTip}>
            <p className="text-white text-sm font-semibold cursor-default">{t.title}</p>
          </Tooltip>
          {!showDelta && <CoverageNote coverage={coverage} period={period} />}
        </div>
        <p className="text-slate-500 text-xs mt-1">
          {showDelta ? t.subtitle(t.period[period]) : t.subtitleStart}
        </p>
      </div>

      {!showDelta ? (
        <div className="px-5 py-8 text-center">
          <MeasuringSince coverage={coverage} />
        </div>
      ) : all.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-slate-500 text-sm">{t.empty}</p>
        </div>
      ) : (
        <div className="divide-y divide-navy-700">
          {all.map((k, i) => {
            const move    = movementLabel(k.positionPrev, k.position, lang)
            const isUp    = k.direction === 'up'
            const nowPage = pageLabel(k.position, lang)

            return (
              <div key={i} className="px-5 py-4 flex items-center gap-4 flex-wrap">

                {/* Direction icon */}
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                  isUp ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <svg className={`w-4 h-4 ${isUp ? 'text-green-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={isUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                  </svg>
                </div>

                {/* Keyword + movement */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">&ldquo;{k.query}&rdquo;</p>
                  <p className={`text-xs mt-0.5 ${move.color}`}>{move.text}</p>
                </div>

                {/* Before → after */}
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs tabular-nums">#{k.positionPrev}</span>
                    <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className={`text-sm font-bold tabular-nums ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      #{k.position}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5 text-right">{t.onGoogle(nowPage)}</p>
                </div>

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
