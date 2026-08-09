'use client'
import { useState } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang } from '@/components/LanguageProvider'

const MOCK_KEYWORDS: { label: string; grid: number[] }[] = [
  {
    label: 'frisör södermalm',
    grid: [
      14,  9, 11,  8,  6,  9, 12,
       8,  5,  3,  2,  3,  6, 10,
       7,  3,  2,  1,  2,  4,  8,
       9,  4,  1,  1,  1,  5,  9,
       8,  3,  2,  1,  2,  4,  7,
      10,  6,  4,  3,  4,  7, 11,
      13, 10,  8,  7,  8, 10, 14,
    ],
  },
  {
    label: 'frisör stockholm',
    grid: [
       0,  0, 19, 16, 14, 18,  0,
       0, 17, 12,  9, 10, 14,  0,
      18, 11,  7,  5,  6,  9, 16,
      15,  9,  5,  4,  5,  8, 14,
      17, 11,  7,  5,  6,  9, 16,
       0, 14, 11,  8, 10, 13,  0,
       0,  0, 18, 15, 13, 17,  0,
    ],
  },
  {
    label: 'balayage stockholm',
    grid: [
       0,  0,  0, 19, 17,  0,  0,
       0, 18, 13,  8,  9, 16,  0,
       0, 11,  6,  3,  4,  8,  0,
      18,  8,  3,  2,  3,  7, 17,
       0, 11,  6,  3,  4,  8,  0,
       0, 17, 13,  8, 10, 15,  0,
       0,  0,  0, 18, 16,  0,  0,
    ],
  },
]

const T = {
  sv: {
    top3:        'Topp 3',
    top3Tip:     'Antal rutor av 49 där du ligger bland de tre översta i Maps-resultaten — där de flesta klicken hamnar.',
    top10:       'Topp 10',
    top10Tip:    'Antal rutor där du visas bland de tio översta. Du syns, men inte i toppen.',
    notRanked:   'Syns inte',
    notRankedTip: 'Antal rutor där du inte finns bland de 20 första resultaten. Här är du i praktiken osynlig.',
    rankingsFor: 'Placeringar för',
    notInTop20:  'Inte bland topp 20',
    rankTitle:   (r: number) => `Plats #${r}`,
    compass:     { n: 'N', w: 'V', e: 'Ö', s: 'S' },
    centreNote:  'Rutan i mitten (vit ring) = din adress. Varje ruta ≈ 1 km².',
    rankLegend:  'Plats:',
    none:        'Ingen',
    footer:      'Livedata kräver en DataForSEO-koppling. Skanningar körs varje vecka över ett 7×7-rutnät (49 punkter) runt din adress.',
  },
  en: {
    top3:        'Top 3',
    top3Tip:     'Number of cells out of 49 where you rank in the top 3 Maps results — where most clicks go.',
    top10:       'Top 10',
    top10Tip:    'Number of cells where you appear in the top 10. Visible, but not at the top.',
    notRanked:   'Not ranked',
    notRankedTip: 'Number of cells where you are not in the first 20 results. You are effectively invisible here.',
    rankingsFor: 'Rankings for',
    notInTop20:  'Not ranked in top 20',
    rankTitle:   (r: number) => `Rank #${r}`,
    compass:     { n: 'N', w: 'W', e: 'E', s: 'S' },
    centreNote:  'Centre cell (white ring) = your address. Each cell ≈ 1 km².',
    rankLegend:  'Rank:',
    none:        'None',
    footer:      'Live grid data requires a DataForSEO connection. Scans run weekly across a 7×7 grid (49 points) around your address.',
  },
}

function rankColor(rank: number): { bg: string; text: string } {
  if (rank === 0)  return { bg: 'bg-navy-700',      text: 'text-slate-600'  }
  if (rank <= 3)   return { bg: 'bg-green-600',     text: 'text-white'      }
  if (rank <= 7)   return { bg: 'bg-green-500/50',  text: 'text-green-100'  }
  if (rank <= 10)  return { bg: 'bg-mustard/60',    text: 'text-navy-950'   }
  if (rank <= 15)  return { bg: 'bg-orange-500/50', text: 'text-orange-100' }
  return                  { bg: 'bg-red-600/50',    text: 'text-red-100'    }
}

export function LocalGridPanel() {
  const { lang } = useLang()
  const t = T[lang]
  const [activeKeyword, setActiveKeyword] = useState(0)
  const { label, grid } = MOCK_KEYWORDS[activeKeyword]

  const top3     = grid.filter(r => r > 0 && r <= 3).length
  const top10    = grid.filter(r => r > 0 && r <= 10).length
  const notFound = grid.filter(r => r === 0).length

  return (
    <div className="space-y-4">

      {/* Keyword pills */}
      <div className="flex gap-2 flex-wrap">
        {MOCK_KEYWORDS.map((kw, i) => (
          <button
            key={kw.label}
            onClick={() => setActiveKeyword(i)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              activeKeyword === i
                ? 'bg-mustard/15 text-mustard border-mustard/30'
                : 'text-slate-400 border-navy-600 hover:border-navy-500 hover:text-white'
            }`}
          >
            {kw.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 max-w-xs">
        <Tooltip text={t.top3Tip}>
          <div className="bg-navy-800 rounded-xl border border-navy-700 px-3 py-2.5 text-center cursor-default">
            <p className="text-green-400 text-xl font-bold tabular-nums">{top3}</p>
            <p className="text-slate-500 text-xs mt-0.5">{t.top3}</p>
          </div>
        </Tooltip>
        <Tooltip text={t.top10Tip}>
          <div className="bg-navy-800 rounded-xl border border-navy-700 px-3 py-2.5 text-center cursor-default">
            <p className="text-mustard text-xl font-bold tabular-nums">{top10}</p>
            <p className="text-slate-500 text-xs mt-0.5">{t.top10}</p>
          </div>
        </Tooltip>
        <Tooltip text={t.notRankedTip}>
          <div className="bg-navy-800 rounded-xl border border-navy-700 px-3 py-2.5 text-center cursor-default">
            <p className="text-slate-400 text-xl font-bold tabular-nums">{notFound}</p>
            <p className="text-slate-500 text-xs mt-0.5">{t.notRanked}</p>
          </div>
        </Tooltip>
      </div>

      {/* Grid */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <p className="text-xs text-slate-500">{t.rankingsFor}</p>
          <span className="text-xs font-semibold text-white bg-navy-700 border border-navy-600 px-2 py-0.5 rounded">{label}</span>
        </div>

        <div className="relative inline-block max-w-full overflow-x-auto">
          <p className="text-xs text-slate-500 text-center mb-1">{t.compass.n}</p>
          <div className="flex gap-0.5">
            <div className="flex items-center pr-1">
              <p className="text-xs text-slate-500" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{t.compass.w}</p>
            </div>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {grid.map((rank, i) => {
                const isCenter = i === 24
                const { bg, text } = rankColor(rank)
                return (
                  <div
                    key={i}
                    title={rank === 0 ? t.notInTop20 : t.rankTitle(rank)}
                    className={`w-9 h-9 flex items-center justify-center rounded text-xs font-bold cursor-default transition-transform hover:scale-110 ${bg} ${text} ${isCenter ? 'ring-2 ring-white ring-offset-1 ring-offset-navy-900' : ''}`}
                  >
                    {rank === 0 ? '—' : rank}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center pl-1">
              <p className="text-xs text-slate-500" style={{ writingMode: 'vertical-rl' }}>{t.compass.e}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center mt-1">{t.compass.s}</p>
        </div>

        <p className="text-slate-500 text-xs mt-2">{t.centreNote}</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-slate-500">{t.rankLegend}</p>
        {[
          { label: '1–3',    bg: 'bg-green-600',     text: 'text-white'      },
          { label: '4–7',    bg: 'bg-green-500/50',  text: 'text-green-100'  },
          { label: '8–10',   bg: 'bg-mustard/60',    text: 'text-navy-950'   },
          { label: '11–15',  bg: 'bg-orange-500/50', text: 'text-orange-100' },
          { label: '16–20',  bg: 'bg-red-600/50',    text: 'text-red-100'    },
          { label: t.none,   bg: 'bg-navy-700',      text: 'text-slate-400'  },
        ].map(({ label: l, bg, text }) => (
          <div key={l} className={`text-xs font-semibold px-2 py-0.5 rounded ${bg} ${text}`}>{l}</div>
        ))}
      </div>

      <p className="text-slate-500 text-xs border-t border-navy-700 pt-3">
        {t.footer}
      </p>

    </div>
  )
}
