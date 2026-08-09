'use client'
import { useState } from 'react'

// 7×7 grid. Index 0 = top-left (NW), index 48 = bottom-right (SE).
// Center cell is index 24. Values = Google Maps local pack rank (1–20), 0 = not found.
// Mock data represents a plumber ranking well in Hägersten but visibility fading toward edges.
const MOCK_KEYWORDS: { label: string; grid: number[] }[] = [
  {
    label: 'rörmokare hägersten',
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
    label: 'rörmokare stockholm',
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
    label: 'akut rörmokare',
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

function rankColor(rank: number): { bg: string; text: string } {
  if (rank === 0)            return { bg: 'bg-navy-700',      text: 'text-slate-600'  }
  if (rank <= 3)             return { bg: 'bg-green-600',     text: 'text-white'      }
  if (rank <= 7)             return { bg: 'bg-green-500/50',  text: 'text-green-100'  }
  if (rank <= 10)            return { bg: 'bg-mustard/60',    text: 'text-navy-950'   }
  if (rank <= 15)            return { bg: 'bg-orange-500/50', text: 'text-orange-100' }
  return                            { bg: 'bg-red-600/50',    text: 'text-red-100'    }
}

function rankLabel(rank: number): string {
  return rank === 0 ? '—' : String(rank)
}

export default function LocalGridPage() {
  const [activeKeyword, setActiveKeyword] = useState(0)
  const { label, grid } = MOCK_KEYWORDS[activeKeyword]

  const top3   = grid.filter(r => r > 0 && r <= 3).length
  const top10  = grid.filter(r => r > 0 && r <= 10).length
  const notFound = grid.filter(r => r === 0).length

  return (
    <div className="px-8 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Local search grid</h1>
        <p className="text-slate-400 text-sm mt-1">
          Where you rank on Google Maps across your service area — one cell per neighbourhood
        </p>
      </div>

      {/* Keyword selector */}
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
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <div className="bg-navy-800 rounded-xl border border-navy-700 px-4 py-3 text-center">
          <p className="text-green-400 text-2xl font-bold">{top3}</p>
          <p className="text-slate-500 text-xs mt-0.5">Top 3</p>
        </div>
        <div className="bg-navy-800 rounded-xl border border-navy-700 px-4 py-3 text-center">
          <p className="text-mustard text-2xl font-bold">{top10}</p>
          <p className="text-slate-500 text-xs mt-0.5">Top 10</p>
        </div>
        <div className="bg-navy-800 rounded-xl border border-navy-700 px-4 py-3 text-center">
          <p className="text-slate-400 text-2xl font-bold">{notFound}</p>
          <p className="text-slate-500 text-xs mt-0.5">Not ranked</p>
        </div>
      </div>

      {/* Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500 font-medium">Rank positions for</p>
          <span className="text-xs font-semibold text-white bg-navy-700 border border-navy-600 px-2 py-0.5 rounded">{label}</span>
        </div>

        <div className="relative inline-block">
          {/* North label */}
          <p className="text-[10px] text-slate-600 text-center mb-1">N</p>

          <div className="flex gap-0.5">
            {/* West label */}
            <div className="flex items-center pr-1">
              <p className="text-[10px] text-slate-600" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>W</p>
            </div>

            {/* Grid cells */}
            <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {grid.map((rank, i) => {
                const isCenter = i === 24
                const { bg, text } = rankColor(rank)
                return (
                  <div
                    key={i}
                    title={rank === 0 ? 'Not ranked in top 20' : `Rank #${rank}`}
                    className={`
                      w-10 h-10 flex items-center justify-center rounded text-xs font-bold transition-transform hover:scale-110 cursor-default
                      ${bg} ${text}
                      ${isCenter ? 'ring-2 ring-white ring-offset-1 ring-offset-navy-900' : ''}
                    `}
                  >
                    {rankLabel(rank)}
                  </div>
                )
              })}
            </div>

            {/* East label */}
            <div className="flex items-center pl-1">
              <p className="text-[10px] text-slate-600" style={{ writingMode: 'vertical-rl' }}>E</p>
            </div>
          </div>

          {/* South label */}
          <p className="text-[10px] text-slate-600 text-center mt-1">S</p>
        </div>

        <p className="text-slate-600 text-xs">
          Centre cell (white ring) = your business location. Each cell covers roughly 1 km².
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-slate-500">Rank:</p>
        {[
          { label: '1–3',   bg: 'bg-green-600',     text: 'text-white'      },
          { label: '4–7',   bg: 'bg-green-500/50',  text: 'text-green-100'  },
          { label: '8–10',  bg: 'bg-mustard/60',    text: 'text-navy-950'   },
          { label: '11–15', bg: 'bg-orange-500/50', text: 'text-orange-100' },
          { label: '16–20', bg: 'bg-red-600/50',    text: 'text-red-100'    },
          { label: 'None',  bg: 'bg-navy-700',      text: 'text-slate-600'  },
        ].map(({ label: l, bg, text }) => (
          <div key={l} className={`text-[10px] font-semibold px-2.5 py-1 rounded ${bg} ${text}`}>{l}</div>
        ))}
      </div>

      {/* DataForSEO note */}
      <p className="text-slate-600 text-xs border-t border-navy-700 pt-4">
        Live grid data requires a DataForSEO connection. Each keyword scan covers a 7×7 grid (49 data points) around your business address. Scans refresh weekly.
      </p>

    </div>
  )
}
