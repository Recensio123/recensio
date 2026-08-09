'use client'
import { useState } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang } from '@/components/LanguageProvider'

export type TrendPoint = { month: string; clicks: number; impressions: number }

const T = {
  sv: {
    defaultTitle: 'Trafiktrend — senaste 6 månaderna',
    titleTip:     'Hur många gånger din hemsida visades i Googles sökresultat (visningar) och hur många av dem som ledde till ett klick under vald period.',
    impressions:  'Visningar',
    impressionsTip: 'Hur många gånger din hemsida dök upp i sökresultaten, oavsett om någon klickade eller inte.',
    clicks:       'Klick',
    clicksTip:    'Hur många gånger någon klickade sig vidare till din hemsida från ett sökresultat.',
    ctr:          'Andel klick',
  },
  en: {
    defaultTitle: 'Traffic trend — last 6 months',
    titleTip:     'How many times your website appeared in Google search results (impressions) and how many of those resulted in a click over the selected period.',
    impressions:  'Impressions',
    impressionsTip: 'How many times your website appeared in search results, whether or not anyone clicked.',
    clicks:       'Clicks',
    clicksTip:    'How many times someone clicked through to your website from a search result.',
    ctr:          'CTR',
  },
}

function delta(curr: number, prev: number) {
  if (!prev) return null
  return Math.round((curr - prev) / prev * 100)
}

function fmt(n: number) {
  return n >= 1_000
    ? (n / 1_000).toLocaleString('sv-SE', { maximumFractionDigits: 1 }) + 'k'
    : n.toLocaleString('sv-SE')
}

function DeltaBadge({ pct, lowerIsBetter = false }: { pct: number | null; lowerIsBetter?: boolean }) {
  if (pct === null) return null
  const positive = lowerIsBetter ? pct < 0 : pct > 0
  return (
    <span className={`text-xs font-semibold ml-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
      {pct > 0 ? '↑' : '↓'}{Math.abs(pct)}%
    </span>
  )
}

function HoverCard({
  point,
  prev,
  align,
}: {
  point: TrendPoint
  prev?: TrendPoint
  align: 'left' | 'center' | 'right'
}) {
  const { lang } = useLang()
  const t = T[lang]
  const ctr          = point.impressions > 0 ? (point.clicks / point.impressions * 100) : 0
  const imprDelta    = prev ? delta(point.impressions, prev.impressions) : null
  const clicksDelta  = prev ? delta(point.clicks,      prev.clicks)      : null
  const prevCtr      = prev && prev.impressions > 0 ? (prev.clicks / prev.impressions * 100) : null
  const ctrDelta     = prevCtr !== null ? delta(ctr, prevCtr) : null

  const alignClass =
    align === 'left'  ? 'left-0'                          :
    align === 'right' ? 'right-0'                         :
    'left-1/2 -translate-x-1/2'

  return (
    <div className={`absolute bottom-full mb-2.5 z-50 pointer-events-none ${alignClass}`}>
      <div className="bg-navy-950 border border-navy-600 rounded-xl px-3 py-2.5 shadow-2xl w-44">
        <p className="text-white text-xs font-semibold mb-2.5">{point.month}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">{t.impressions}</span>
            <span className="text-blue-400 text-xs font-semibold tabular-nums">
              {fmt(point.impressions)}
              <DeltaBadge pct={imprDelta} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">{t.clicks}</span>
            <span className="text-mustard text-xs font-semibold tabular-nums">
              {fmt(point.clicks)}
              <DeltaBadge pct={clicksDelta} />
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-navy-700 pt-1.5 mt-1.5">
            <span className="text-slate-500 text-xs">{t.ctr}</span>
            <span className="text-slate-300 text-xs font-semibold tabular-nums">
              {ctr.toFixed(1)}%
              <DeltaBadge pct={ctrDelta} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SEOTrendChart({
  trend,
  title,
}: {
  trend:  TrendPoint[]
  title?: string
}) {
  const { lang } = useLang()
  const t = T[lang]
  const heading = title ?? t.defaultTitle

  const [hoveredIdx,     setHoveredIdx]     = useState<number | null>(null)
  const [hoveredSection, setHoveredSection] = useState<'impressions' | 'clicks' | null>(null)

  const maxImpr   = Math.max(...trend.map(v => v.impressions), 1)
  const maxClicks = Math.max(...trend.map(v => v.clicks),      1)
  const MAX_H     = 56
  // A record too short to fill the series leaves one or two buckets — without
  // a cap a lone bar stretches across the whole card and reads as a full chart.
  const barWidth  = trend.length < 3 ? 'max-w-[96px]' : ''

  function enter(i: number, section: 'impressions' | 'clicks') {
    setHoveredIdx(i)
    setHoveredSection(section)
  }
  function leave() {
    setHoveredIdx(null)
    setHoveredSection(null)
  }

  // Align tooltip to avoid overflow on first/last bars
  function align(i: number): 'left' | 'center' | 'right' {
    if (i === 0)                 return 'left'
    if (i === trend.length - 1) return 'right'
    return 'center'
  }

  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
      <Tooltip text={t.titleTip}>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-5 cursor-default">
          {heading}
        </p>
      </Tooltip>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

        {/* Impressions */}
        <div>
          <Tooltip text={t.impressionsTip}>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 cursor-default">{t.impressions}</p>
          </Tooltip>
          <div className="flex items-end gap-2 h-20">
            {trend.map((v, i) => {
              const h          = Math.round((v.impressions / maxImpr) * MAX_H) + 4
              const isHovered  = hoveredIdx === i
              const isActive   = i === trend.length - 1
              const kVal       = fmt(v.impressions)
              return (
                <div
                  key={i}
                  className={`flex-1 flex flex-col items-center gap-1.5 relative cursor-default ${barWidth}`}
                  onMouseEnter={() => enter(i, 'impressions')}
                  onMouseLeave={leave}
                >
                  {isHovered && hoveredSection === 'impressions' && (
                    <HoverCard point={v} prev={trend[i - 1]} align={align(i)} />
                  )}
                  <span className={`text-xs tabular-nums transition-colors ${
                    isHovered || isActive ? 'text-blue-400' : 'text-slate-500'
                  }`}>
                    {kVal}
                  </span>
                  <div className="flex-1 flex items-end w-full">
                    <div
                      className={`w-full rounded-sm transition-all ${
                        isHovered ? 'bg-blue-400' :
                        isActive  ? 'bg-blue-400/80' :
                        hoveredIdx !== null && hoveredIdx !== i ? 'bg-blue-500/15' :
                        'bg-blue-500/30'
                      }`}
                      style={{ height: `${h}px` }}
                    />
                  </div>
                  <span className={`text-xs transition-colors ${
                    isHovered || isActive ? 'text-blue-400' : 'text-slate-500'
                  }`}>
                    {v.month}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Clicks */}
        <div>
          <Tooltip text={t.clicksTip}>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 cursor-default">{t.clicks}</p>
          </Tooltip>
          <div className="flex items-end gap-2 h-20">
            {trend.map((v, i) => {
              const h         = Math.round((v.clicks / maxClicks) * MAX_H) + 4
              const isHovered = hoveredIdx === i
              const isActive  = i === trend.length - 1
              return (
                <div
                  key={i}
                  className={`flex-1 flex flex-col items-center gap-1.5 relative cursor-default ${barWidth}`}
                  onMouseEnter={() => enter(i, 'clicks')}
                  onMouseLeave={leave}
                >
                  {isHovered && hoveredSection === 'clicks' && (
                    <HoverCard point={v} prev={trend[i - 1]} align={align(i)} />
                  )}
                  <span className={`text-xs tabular-nums transition-colors ${
                    isHovered || isActive ? 'text-mustard' : 'text-slate-500'
                  }`}>
                    {v.clicks}
                  </span>
                  <div className="flex-1 flex items-end w-full">
                    <div
                      className={`w-full rounded-sm transition-all ${
                        isHovered ? 'bg-mustard' :
                        isActive  ? 'bg-mustard' :
                        hoveredIdx !== null && hoveredIdx !== i ? 'bg-mustard/15' :
                        'bg-mustard/30'
                      }`}
                      style={{ height: `${h}px` }}
                    />
                  </div>
                  <span className={`text-xs transition-colors ${
                    isHovered || isActive ? 'text-mustard' : 'text-slate-500'
                  }`}>
                    {v.month}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
