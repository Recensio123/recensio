'use client'
import { type Source, type Rating } from './types'
import { DONUT_COLORS, DONUT_PALETTE } from './constants'

// ── Donut ─────────────────────────────────────────────────────────────────────

function donutSegmentPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number
): string {
  const x1 = cx + outerR * Math.cos(startAngle), y1 = cy + outerR * Math.sin(startAngle)
  const x2 = cx + outerR * Math.cos(endAngle),   y2 = cy + outerR * Math.sin(endAngle)
  const x3 = cx + innerR * Math.cos(endAngle),   y3 = cy + innerR * Math.sin(endAngle)
  const x4 = cx + innerR * Math.cos(startAngle), y4 = cy + innerR * Math.sin(startAngle)
  const large = endAngle - startAngle > Math.PI ? 1 : 0
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ')
}

export function DonutChart({ segments }: { segments: { label: string; value: number }[] }) {
  const size = 140, cx = 70, cy = 70, outerR = 56, innerR = 36
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  let angle = -Math.PI / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const span  = (seg.value / total) * 2 * Math.PI
        const end   = angle + span - 0.02
        const path  = donutSegmentPath(cx, cy, outerR, innerR, angle, end)
        const color = DONUT_COLORS[seg.label] ?? DONUT_PALETTE[i % DONUT_PALETTE.length]
        angle += span
        return <path key={i} d={path} fill={color} />
      })}
      <text x={cx} y={cy - 6}  textAnchor="middle" fill="white"  fontSize="18" fontWeight="700">{total.toLocaleString('sv-SE')}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" fontSize="9">sessions</text>
    </svg>
  )
}

// ── Trend line (single) ────────────────────────────────────────────────────────

export function TrendLineChart({ values, months }: { values: number[]; months: string[] }) {
  const w = 260, h = 110, padL = 8, padR = 8, padT = 8, padB = 24
  const max = Math.max(...values) * 1.1
  const min = Math.min(...values) * 0.9
  const range = max - min || 1

  const pts = values.map((v, i) => {
    const x = padL + (i / (values.length - 1)) * (w - padL - padR)
    const y = padT + (1 - (v - min) / range) * (h - padT - padB)
    return [x, y] as [number, number]
  })

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const areaPath = linePath +
    ` L ${pts[pts.length - 1][0].toFixed(1)} ${(h - padB).toFixed(1)}` +
    ` L ${pts[0][0].toFixed(1)} ${(h - padB).toFixed(1)} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(t => {
        const y = padT + t * (h - padT - padB)
        return <line key={t} x1={padL} y1={y.toFixed(1)} x2={w - padR} y2={y.toFixed(1)} stroke="#1e2d40" strokeWidth="1" />
      })}
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill="#4ade80" />
      ))}
      {months.map((m, i) => {
        const x = padL + (i / (values.length - 1)) * (w - padL - padR)
        return <text key={i} x={x.toFixed(1)} y={h - 6} textAnchor="middle" fill="#64748b" fontSize="9">{m}</text>
      })}
    </svg>
  )
}

// ── Visits over time (full-width) ─────────────────────────────────────────────

export type CompetitorLine = { name: string; values: number[]; color: string }

export function VisitsOverTimeChart({
  values,
  labels,
  competitors,
}: {
  values:       number[]
  labels:       string[]
  competitors?: CompetitorLine[]
}) {
  const w = 720, h = 180
  const padL = 44, padR = 12, padT = 12, padB = 28
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  const allVals  = [...values, ...(competitors ?? []).flatMap(c => c.values)]
  const dataMin  = Math.min(...allVals)
  const dataMax  = Math.max(...allVals)
  const range    = dataMax - dataMin || 1
  const step     = range <= 100 ? 25 : range <= 500 ? 100 : 200
  const minTick  = Math.floor(dataMin / step) * step
  const maxTick  = Math.ceil(dataMax  / step) * step
  const ticks: number[] = []
  for (let v = minTick; v <= maxTick; v += step) ticks.push(v)
  const tickRange = maxTick - minTick || 1

  const xScale = (i: number, len: number) => padL + (i / (len - 1)) * chartW
  const yScale = (v: number) => padT + (1 - (v - minTick) / tickRange) * chartH

  const pts      = values.map((v, i) => [xScale(i, values.length), yScale(v)] as [number, number])
  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${(padT + chartH).toFixed(1)} L ${pts[0][0].toFixed(1)} ${(padT + chartH).toFixed(1)} Z`
  const fmtVal   = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0"    />
        </linearGradient>
      </defs>
      {ticks.map(t => {
        const y = yScale(t)
        return (
          <g key={t}>
            <line x1={padL} y1={y.toFixed(1)} x2={w - padR} y2={y.toFixed(1)} stroke="#1e2d40" strokeWidth="1" />
            <text x={(padL - 6).toFixed(1)} y={(y + 4).toFixed(1)} textAnchor="end" fill="#475569" fontSize="10">{fmtVal(t)}</text>
          </g>
        )
      })}
      <path d={areaPath} fill="url(#visGrad)" />
      <path d={linePath} fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill="#4ade80" />
      ))}
      {/* Competitor lines — dashed */}
      {competitors?.map(comp => {
        if (comp.values.length < 2) return null
        const cPts  = comp.values.map((v, i) => [xScale(i, comp.values.length), yScale(v)] as [number, number])
        const cLine = cPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
        return (
          <g key={comp.name}>
            <path d={cLine} fill="none" stroke={comp.color} strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            {cPts.map(([x, y], j) => (
              <circle key={j} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.5" fill={comp.color} opacity="0.7" />
            ))}
          </g>
        )
      })}
      {labels.map((label, i) => (
        <text key={i} x={xScale(i, values.length).toFixed(1)} y={h - 6} textAnchor="middle" fill="#475569" fontSize="10">{label}</text>
      ))}
    </svg>
  )
}

// ── Stacked device chart (Desktop + Mobile) ───────────────────────────────────

export function StackedDeviceChart({
  desktop, mobile, labels,
}: {
  desktop: number[]
  mobile:  number[]
  labels:  string[]
}) {
  const w = 720, h = 160
  const padL = 44, padR = 12, padT = 12, padB = 28
  const chartW = w - padL - padR
  const chartH = h - padT - padB
  const n      = labels.length

  const totals  = desktop.map((d, i) => d + (mobile[i] ?? 0))
  const dataMax = Math.max(...totals, 1)
  const niceSteps = [50, 100, 200, 500, 1000, 2000]
  const step    = niceSteps.find(s => dataMax / s <= 5) ?? 2000
  const maxTick = Math.ceil(dataMax / step) * step
  const ticks   = Array.from({ length: Math.floor(maxTick / step) + 1 }, (_, i) => i * step)
  const fmtVal  = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)

  const xScale = (i: number) => padL + (i / Math.max(n - 1, 1)) * chartW
  const yScale = (v: number) => padT + (1 - v / maxTick) * chartH
  const yBase  = padT + chartH

  const mPts = mobile.map((v, i)  => [xScale(i), yScale(v)]          as [number, number])
  const tPts = totals.map((v, i)  => [xScale(i), yScale(v)]          as [number, number])

  const mLine    = mPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const tLine    = tPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const mRevPath = [...mPts].reverse().map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  // Mobile: from mobile line down to baseline
  const mArea = `${mLine} L${mPts[n-1][0].toFixed(1)},${yBase.toFixed(1)} L${mPts[0][0].toFixed(1)},${yBase.toFixed(1)} Z`
  // Desktop: top follows total line, bottom follows mobile line (reversed)
  const dArea = `${tLine} ${mRevPath} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="sgMobile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#93c5fd" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="sgDesktop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.30" />
        </linearGradient>
      </defs>
      {ticks.map(t => {
        const y = yScale(t)
        return (
          <g key={t}>
            <line x1={padL} y1={y.toFixed(1)} x2={w - padR} y2={y.toFixed(1)} stroke="#1e2d40" strokeWidth="1" />
            <text x={(padL - 6).toFixed(1)} y={(y + 4).toFixed(1)} textAnchor="end" fill="#475569" fontSize="10">{fmtVal(t)}</text>
          </g>
        )
      })}
      <path d={mArea} fill="url(#sgMobile)" />
      <path d={dArea} fill="url(#sgDesktop)" />
      <path d={tLine} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <path d={mLine} fill="none" stroke="#93c5fd" strokeWidth="1"   strokeLinecap="round" strokeLinejoin="round" opacity="0.5" strokeDasharray="3 2" />
      {labels.map((label, i) => (
        <text key={i} x={xScale(i).toFixed(1)} y={h - 6} textAnchor="middle" fill="#475569" fontSize="10">{label}</text>
      ))}
    </svg>
  )
}

// ── Multi-line channel trend ───────────────────────────────────────────────────

export function ChannelTrendChart({
  sources,
  visibleChannels,
  onToggle,
}: {
  sources:          Source[]
  visibleChannels?: Set<string>
  onToggle?:        (channel: string) => void
}) {
  const w = 560, h = 180
  const padL = 44, padR = 10, padT = 10, padB = 24
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  const visibleSources = visibleChannels ? sources.filter(s => visibleChannels.has(s.channel)) : sources
  const allVals        = visibleSources.flatMap(s => s.trend)
  const dataMax   = Math.max(...allVals, 1)
  const niceSteps = [25, 50, 100, 200, 500, 1000, 2000, 5000]
  const step      = niceSteps.find(n => dataMax / n <= 5) ?? 1000
  const yMax      = Math.ceil(dataMax / step) * step
  const ticks     = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step)

  const xScale  = (i: number, len: number) => padL + (i / Math.max(len - 1, 1)) * chartW
  const yScale  = (v: number)              => padT + (1 - v / yMax) * chartH
  const fmtTick = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)

  const now = new Date()
  const xLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return d.toLocaleDateString('en-GB', { month: 'short' })
  })

  return (
    <div className="flex gap-6 items-start">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="flex-1 min-w-0">
        <defs>
          {sources.map(s => (
            <linearGradient key={s.channel} id={`cg-${s.channel.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={DONUT_COLORS[s.channel] ?? '#64748b'} stopOpacity="0.14" />
              <stop offset="100%" stopColor={DONUT_COLORS[s.channel] ?? '#64748b'} stopOpacity="0"    />
            </linearGradient>
          ))}
        </defs>
        {ticks.map(t => {
          const y = yScale(t)
          return (
            <g key={t}>
              <line x1={padL} y1={y.toFixed(1)} x2={w - padR} y2={y.toFixed(1)} stroke="#1e2d40" strokeWidth="1" />
              <text x={(padL - 6).toFixed(1)} y={(y + 4).toFixed(1)} textAnchor="end" fill="#475569" fontSize="10">
                {fmtTick(t)}
              </text>
            </g>
          )
        })}
        {visibleSources.map(s => {
          if (s.trend.length < 2) return null
          const pts  = s.trend.map((v, i) => [xScale(i, s.trend.length), yScale(v)] as [number, number])
          const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
          const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${(padT + chartH).toFixed(1)} L ${pts[0][0].toFixed(1)} ${(padT + chartH).toFixed(1)} Z`
          return (
            <path key={`area-${s.channel}`} d={area} fill={`url(#cg-${s.channel.replace(/\s+/g, '')})`} />
          )
        })}
        {visibleSources.map(s => {
          if (s.trend.length < 2) return null
          const color = DONUT_COLORS[s.channel] ?? '#64748b'
          const pts   = s.trend.map((v, i) => [xScale(i, s.trend.length), yScale(v)] as [number, number])
          const line  = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
          return (
            <g key={`line-${s.channel}`}>
              <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.5" fill={color} />
              ))}
            </g>
          )
        })}
        {xLabels.map((label, i) => (
          <text key={i} x={xScale(i, 6).toFixed(1)} y={h - 6} textAnchor="middle" fill="#475569" fontSize="10">
            {label}
          </text>
        ))}
      </svg>
      <div className="flex flex-col gap-2 pt-1 shrink-0" style={{ minWidth: '164px' }}>
        {sources.map(s => {
          const color     = DONUT_COLORS[s.channel] ?? '#64748b'
          const isVisible = !visibleChannels || visibleChannels.has(s.channel)
          return (
            <div
              key={s.channel}
              onClick={() => onToggle?.(s.channel)}
              className={`flex items-center justify-between gap-3 rounded px-1 py-0.5 transition-opacity select-none ${
                onToggle ? 'cursor-pointer hover:bg-navy-700/40' : ''
              } ${isVisible ? 'opacity-100' : 'opacity-30'}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg width="18" height="10" viewBox="0 0 18 10" className="shrink-0">
                  <line x1="0" y1="5" x2="18" y2="5" stroke={color} strokeWidth={isVisible ? 2 : 1} strokeLinecap="round" strokeDasharray={isVisible ? undefined : '3 2'} />
                  <circle cx="9" cy="5" r="2.5" fill={isVisible ? color : 'transparent'} stroke={color} strokeWidth="1" />
                </svg>
                <span className="text-slate-400 text-xs truncate">{s.channel}</span>
              </div>
              <span className="text-white text-xs font-semibold tabular-nums shrink-0">
                {s.sessions.toLocaleString('sv-SE')}
              </span>
            </div>
          )
        })}
        {onToggle && visibleChannels && (
          <button
            onClick={() => {
              if (visibleChannels.size < sources.length) {
                sources.filter(s => !visibleChannels.has(s.channel)).forEach(s => onToggle(s.channel))
              } else {
                const top = [...sources].sort((a, b) => b.sessions - a.sessions)[0]
                sources.filter(s => s.channel !== top?.channel).forEach(s => onToggle(s.channel))
              }
            }}
            className="text-[10px] text-slate-600 hover:text-slate-400 text-left px-1 mt-1 transition-colors"
          >
            {visibleChannels.size < sources.length ? 'Show all' : 'Isolate top channel'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

export function Sparkline({ values, positive = true }: { values: number[]; positive?: boolean }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 88, h = 32
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const color = positive ? '#4ade80' : '#f87171'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="opacity-70">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Score ring (PageSpeed) ────────────────────────────────────────────────────

export function ScoreRing({ score, label }: { score: number; label: string }) {
  const r             = 34
  const circumference = 2 * Math.PI * r
  const dashoffset    = circumference * (1 - score / 100)
  const stroke    = score >= 90 ? '#4ade80' : score >= 50 ? '#f0b429' : '#f87171'
  const textColor = score >= 90 ? 'text-green-400' : score >= 50 ? 'text-mustard' : 'text-red-400'
  const badge     = score >= 90 ? 'Good' : score >= 50 ? 'Needs work' : 'Poor'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#1e2d40" strokeWidth="7" />
          <circle
            cx="40" cy="40" r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xl font-bold">{score}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-slate-300 text-sm font-medium">{label}</p>
        <p className={`text-xs font-medium ${textColor}`}>{badge}</p>
      </div>
    </div>
  )
}

// ── Rating badge (Core Web Vitals) ────────────────────────────────────────────

export function RatingBadge({ rating, value }: { rating: Rating; value: string }) {
  const cls =
    rating === 'good'              ? 'text-green-400 bg-green-500/10 border-green-500/20' :
    rating === 'needs-improvement' ? 'text-mustard bg-mustard/10 border-mustard/20'       :
                                     'text-red-400 bg-red-500/10 border-red-500/20'
  return (
    <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded border ${cls}`}>
      {value}
    </span>
  )
}
