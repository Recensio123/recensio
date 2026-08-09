'use client'
import { type FacebookData } from './SocialDashboard'

const MONTH_LABELS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']

function FollowerLineChart({ values }: { values: number[] }) {
  const min   = Math.min(...values)
  const max   = Math.max(...values)
  const range = max - min || 1
  const W = 400, H = 80, padX = 10, padY = 8

  const pts = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * (W - padX * 2)
    const y = padY + (1 - (v - min) / range) * (H - padY * 2)
    return { x, y }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" aria-hidden="true">
      <polyline
        points={pts.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#f0b429"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#f0b429" />
      ))}
      {MONTH_LABELS.map((label, i) => {
        const x = padX + (i / (values.length - 1)) * (W - padX * 2)
        return (
          <text key={label} x={x} y={H + 14} textAnchor="middle" fontSize={9} fill="#64748b">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub: string; positive?: boolean }) {
  const subColor = positive === undefined ? 'text-slate-400' : positive ? 'text-green-400' : 'text-red-400'
  return (
    <div className="bg-navy-800 rounded-xl p-4 border border-navy-700 flex flex-col gap-1">
      <p className="text-slate-500 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white text-xl font-bold leading-tight">{value}</p>
      <p className={`text-xs font-medium ${subColor}`}>{sub}</p>
    </div>
  )
}

/** 24-bar "best time to post" chart — mustard highlight on peak hour */
function HourActivityChart({ values }: { values: number[] }) {
  const max    = Math.max(...values, 1)
  const peakH  = values.indexOf(max)
  const barW   = 14
  const gap    = 4
  const H      = 60
  const padX   = 4
  const totalW = padX * 2 + 24 * (barW + gap) - gap
  const LABELS = [0, 6, 12, 18, 23]

  return (
    <svg viewBox={`0 0 ${totalW} ${H + 18}`} className="w-full" aria-hidden="true">
      {values.map((v, i) => {
        const barH  = Math.max(3, (v / max) * H)
        const x     = padX + i * (barW + gap)
        const y     = H - barH
        const isPeak = i === peakH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH}
              rx={2}
              fill={isPeak ? '#f0b429' : 'rgba(240,180,41,0.2)'}
            />
            {LABELS.includes(i) && (
              <text x={x + barW / 2} y={H + 13} textAnchor="middle" fontSize={8} fill="#64748b">
                {i === 0 ? '12am' : i === 12 ? '12pm' : i < 12 ? `${i}am` : `${i - 12}pm`}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

const RANK_COLORS = ['#f0b429', '#94a3b8', '#cd7c3a'] // gold, silver, bronze

export function FacebookTab({ data }: { data: FacebookData }) {
  const maxReach    = Math.max(...data.recentPosts.map(p => p.reach), 1)
  const topSorted   = [...data.topPosts].sort((a, b) => b.reach - a.reach)
  const topMaxReach = Math.max(...topSorted.map(p => p.reach), 1)

  function fmtDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  }

  function fmtChange(n: number) {
    const color = n >= 0 ? 'text-green-400' : 'text-red-400'
    return <span className={`text-xs font-medium ${color}`}>{n > 0 ? '+' : ''}{n}%</span>
  }

  const peakHour    = data.followersOnlineByHour.indexOf(Math.max(...data.followersOnlineByHour))
  const peakLabel   = peakHour === 0 ? '12am' : peakHour === 12 ? '12pm' : peakHour < 12 ? `${peakHour}am` : `${peakHour - 12}pm`

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Followers"
          value={data.followers.toLocaleString('sv-SE')}
          sub={`+${data.followersGrowth} this month`}
          positive={true}
        />
        <StatCard
          label="Page views"
          value={data.pageViews.toLocaleString('sv-SE')}
          sub={`${data.pageViewsChange > 0 ? '+' : ''}${data.pageViewsChange}% MoM`}
          positive={data.pageViewsChange >= 0}
        />
        <StatCard
          label="Post reach"
          value={data.reach.toLocaleString('sv-SE')}
          sub={`${data.reachChange > 0 ? '+' : ''}${data.reachChange}% MoM`}
          positive={data.reachChange >= 0}
        />
        <StatCard
          label="Rating"
          value={`${data.rating} ★`}
          sub={`${data.reviewCount} reviews`}
        />
      </div>

      {/* CTA performance */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          Call-to-action clicks — last 30 days
        </p>
        <div className="grid grid-cols-3 gap-3">
          {/* Website */}
          <div className="flex flex-col gap-0.5">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Website</p>
            <p className="text-white text-xl font-bold leading-tight">{data.websiteClicks}</p>
            <p className="text-xs">{fmtChange(data.websiteClicksChange)} <span className="text-slate-500">MoM</span></p>
          </div>
          {/* Calls */}
          <div className="flex flex-col gap-0.5">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Calls</p>
            <p className="text-white text-xl font-bold leading-tight">{data.callClicks}</p>
            <p className="text-xs">{fmtChange(data.callClicksChange)} <span className="text-slate-500">MoM</span></p>
          </div>
          {/* Directions */}
          <div className="flex flex-col gap-0.5">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Directions</p>
            <p className="text-white text-xl font-bold leading-tight">{data.directionsClicks}</p>
            <p className="text-xs">{fmtChange(data.directionsClicksChange)} <span className="text-slate-500">MoM</span></p>
          </div>
        </div>
      </div>

      {/* Follower growth chart + best time to post — side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Follower growth */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Follower growth</p>
            <div className="text-right">
              <span className="text-white text-lg font-bold">{data.followers.toLocaleString('sv-SE')}</span>
              <span className="text-green-400 text-xs font-medium ml-2">+{data.followersGrowth} this month</span>
            </div>
          </div>
          <FollowerLineChart values={data.followerTrend} />
        </div>

        {/* Best time to post */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">When followers are online</p>
            <span className="text-xs text-mustard font-medium">Peak {peakLabel}</span>
          </div>
          <HourActivityChart values={data.followersOnlineByHour} />
        </div>
      </div>

      {/* Audience location */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Audience location</p>
        <div className="space-y-2.5">
          {data.audienceCities.map(({ city, pct }) => (
            <div key={city} className="flex items-center gap-3">
              <span className="text-slate-300 text-sm w-28 shrink-0">{city}</span>
              <div className="flex-1 bg-navy-700 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-mustard/50 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-slate-400 text-xs tabular-nums w-8 text-right">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top posts — 90 days */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Top posts — last 90 days</p>
          <span className="text-xs text-slate-500">Ranked by reach</span>
        </div>
        <div className="grid grid-cols-[28px_1fr_80px_120px_64px_64px_64px_72px] gap-3 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
          <span></span>
          <span>Post</span>
          <span>Date</span>
          <span>Reach</span>
          <span className="text-right">Reactions</span>
          <span className="text-right">Comments</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Eng. rate</span>
        </div>
        <div className="divide-y divide-navy-700">
          {topSorted.map((post, i) => {
            const barPct      = Math.round((post.reach / topMaxReach) * 100)
            const engagements = post.reactions + post.comments + post.shares
            const engRate     = post.reach > 0 ? ((engagements / post.reach) * 100).toFixed(1) : '—'
            const rankColor   = RANK_COLORS[i] ?? '#475569'
            return (
              <div key={i} className="grid grid-cols-[28px_1fr_80px_120px_64px_64px_64px_72px] gap-3 px-5 py-3 items-center">
                <span className="text-xs font-bold tabular-nums" style={{ color: rankColor }}>#{i + 1}</span>
                <span className="text-slate-300 text-sm truncate" title={post.text}>{post.text}</span>
                <span className="text-slate-400 text-xs">{fmtDate(post.date)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-medium tabular-nums w-10 shrink-0">{post.reach.toLocaleString('sv-SE')}</span>
                  <div className="flex-1 bg-navy-700 rounded-full h-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: `${rankColor}66` }} />
                  </div>
                </div>
                <span className="text-slate-300 text-xs text-right tabular-nums">{post.reactions}</span>
                <span className="text-slate-300 text-xs text-right tabular-nums">{post.comments}</span>
                <span className="text-slate-300 text-xs text-right tabular-nums">{post.shares}</span>
                <span className="text-slate-400 text-xs text-right tabular-nums">{engRate}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent posts table */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 border-b border-navy-700">
          Recent posts
        </p>
        <div className="grid grid-cols-[1fr_80px_120px_64px_64px_64px_72px] gap-3 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
          <span>Post</span>
          <span>Date</span>
          <span>Reach</span>
          <span className="text-right">Reactions</span>
          <span className="text-right">Comments</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Eng. rate</span>
        </div>
        <div className="divide-y divide-navy-700">
          {data.recentPosts.map((post, i) => {
            const barPct      = Math.round((post.reach / maxReach) * 100)
            const engagements = post.reactions + post.comments + post.shares
            const engRate     = post.reach > 0 ? ((engagements / post.reach) * 100).toFixed(1) : '—'
            return (
              <div key={i} className="grid grid-cols-[1fr_80px_120px_64px_64px_64px_72px] gap-3 px-5 py-3 items-center">
                <span className="text-slate-300 text-sm truncate" title={post.text}>{post.text}</span>
                <span className="text-slate-400 text-xs">{fmtDate(post.date)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-medium tabular-nums w-10 shrink-0">{post.reach.toLocaleString('sv-SE')}</span>
                  <div className="flex-1 bg-navy-700 rounded-full h-1 overflow-hidden">
                    <div className="h-full bg-mustard/40 rounded-full" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
                <span className="text-slate-300 text-xs text-right tabular-nums">{post.reactions}</span>
                <span className="text-slate-300 text-xs text-right tabular-nums">{post.comments}</span>
                <span className="text-slate-300 text-xs text-right tabular-nums">{post.shares}</span>
                <span className="text-slate-400 text-xs text-right tabular-nums">{engRate}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
