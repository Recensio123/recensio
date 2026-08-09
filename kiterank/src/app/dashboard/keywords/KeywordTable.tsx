'use client'
import { useState } from 'react'
import { Tooltip } from '@/components/Tooltip'

export type Query = {
  query:           string
  clicks:          number
  impressions:     number
  ctr:             number
  position:        number
  clicksChange?:   number   // MoM % change in clicks (positive = up)
  positionChange?: number   // MoM position change (negative = improved)
}

type Tab   = 'all' | 'top3' | 'quickwins' | 'needswork' | 'lowctr'
type TagId = 'top3' | 'quickwin' | 'needswork' | 'lowctr'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',       label: 'All'        },
  { id: 'top3',      label: 'Top 3'      },
  { id: 'quickwins', label: 'Quick wins' },
  { id: 'needswork', label: 'Needs work' },
  { id: 'lowctr',    label: 'Low CTR'   },
]

function expectedCTR(position: number) {
  return 0.28 * Math.pow(0.75, position - 1)
}

function extraClicksIfTop3(position: number, impressions: number) {
  return Math.max(Math.round((0.15 - expectedCTR(position)) * impressions), 0)
}

function fmt(n: number) {
  return n >= 1_000
    ? (n / 1_000).toLocaleString('sv-SE', { maximumFractionDigits: 1 }) + 'k'
    : n.toLocaleString('sv-SE')
}

function getTag(q: Query, avgCTR: number): { id: TagId; label: string; color: string } | null {
  if (q.position <= 3)
    return { id: 'top3',      label: 'Top 3',      color: 'text-white bg-navy-600 border-navy-500'           }
  if (q.position >= 4 && q.position <= 15)
    return { id: 'quickwin',  label: 'Quick win',  color: 'text-green-400 bg-green-500/10 border-green-500/20' }
  if (q.position > 20)
    return { id: 'needswork', label: 'Needs work', color: 'text-mustard bg-mustard/10 border-mustard/20'       }
  if (q.position <= 10 && q.impressions > 30 && q.ctr < avgCTR * 0.5)
    return { id: 'lowctr',    label: 'Low CTR',    color: 'text-red-400 bg-red-500/10 border-red-500/20'       }
  return null
}

/* ─── Stat row helper ──────────────────────────────────────────────────────── */
function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

/* ─── Detail modal ─────────────────────────────────────────────────────────── */
function KeywordDetailModal({
  query: q,
  avgCTR,
  onClose,
}: {
  query:   Query
  avgCTR:  number
  onClose: () => void
}) {
  const tag          = getTag(q, avgCTR)
  const expCTR       = expectedCTR(q.position)
  const expClicks    = Math.round(expCTR * q.impressions)
  const extra        = extraClicksIfTop3(q.position, q.impressions)
  const missedClicks = Math.max(0, expClicks - q.clicks)
  const posDir       =
    q.positionChange !== undefined && q.positionChange !== 0
      ? q.positionChange < 0 ? 'up' : 'down'
      : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-navy-800 rounded-2xl border border-navy-600 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div>
            <p className="text-white font-semibold text-base leading-snug">&ldquo;{q.query}&rdquo;</p>
            {tag && (
              <span className={`inline-flex mt-2 text-xs border px-2 py-0.5 rounded-full ${tag.color}`}>
                {tag.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors ml-4 mt-0.5 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Metrics strip */}
        <div className="grid grid-cols-3 border-t border-b border-navy-700">
          {([
            {
              label: 'Position',
              value: `#${Math.round(q.position)}`,
              sub:   posDir
                ? <span className={posDir === 'up' ? 'text-green-400' : 'text-red-400'}>
                    {posDir === 'up' ? '↑' : '↓'}{Math.abs(q.positionChange!)} this month
                  </span>
                : null,
            },
            {
              label: 'Monthly clicks',
              value: q.clicks.toLocaleString('sv-SE'),
              sub:   q.clicksChange !== undefined && q.clicksChange !== 0
                ? <span className={q.clicksChange > 0 ? 'text-green-400' : 'text-red-400'}>
                    {q.clicksChange > 0 ? '+' : ''}{q.clicksChange}% vs last month
                  </span>
                : null,
            },
            {
              label: 'CTR',
              value: `${(q.ctr * 100).toFixed(1)}%`,
              sub:   tag?.id === 'lowctr'
                ? <span className="text-red-400">Expected {(expCTR * 100).toFixed(1)}%</span>
                : null,
            },
          ] as { label: string; value: string; sub: React.ReactNode }[]).map((m, i) => (
            <div key={i} className={`px-4 py-3 ${i > 0 ? 'border-l border-navy-700' : ''}`}>
              <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">{m.label}</p>
              <p className="text-white text-xl font-bold tabular-nums">{m.value}</p>
              {m.sub && <p className="text-[10px] mt-0.5">{m.sub}</p>}
            </div>
          ))}
        </div>

        {/* Explanation + details */}
        <div className="p-5 space-y-4">

          {tag?.id === 'top3' && (<>
            <p className="text-slate-300 text-sm leading-relaxed">
              This keyword is performing well. You&apos;re in the top 3 results — where over 60% of all search clicks go.
              Keep the page well-maintained and monitor for any position drops.
            </p>
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label="Monthly impressions" value={fmt(q.impressions)} color="text-blue-400" />
              {posDir && (
                <StatRow
                  label="Position this month"
                  value={`${posDir === 'up' ? '↑' : '↓'} ${Math.abs(q.positionChange!)} spots`}
                  color={posDir === 'up' ? 'text-green-400' : 'text-red-400'}
                />
              )}
            </div>
          </>)}

          {tag?.id === 'quickwin' && (<>
            <p className="text-slate-300 text-sm leading-relaxed">
              You already appear near the top of Google for this search. Position #{Math.round(q.position)} is just outside
              where most traffic goes — the top 3 results capture around 60% of all clicks.
              A relatively small improvement in ranking could bring significantly more visitors without any ad spend.
            </p>
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label="Monthly impressions" value={fmt(q.impressions)} color="text-slate-300" />
              {extra > 0 && <StatRow label="Estimated gain if top 3" value={`~+${extra} clicks/mo`} color="text-green-400" />}
              <StatRow
                label="Positions to climb"
                value={`${Math.max(0, Math.round(q.position) - 3)} spots to top 3`}
                color="text-green-400"
              />
            </div>
            <div className="space-y-2">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">How to improve it</p>
              <ul className="space-y-2">
                {[
                  'Make the page more thorough than what currently ranks above you — cover the topic in more depth, answer follow-up questions, and add examples.',
                  'Add internal links to this page from other relevant pages on your site. Each link signals to Google that this page is important.',
                  'Check that the keyword appears in the page title, the main heading, and naturally in the first paragraph.',
                ].map((tip, i) => (
                  <li key={i} className="flex gap-2.5 text-slate-400 text-xs leading-relaxed">
                    <span className="text-green-400 font-bold mt-0.5 shrink-0">{i + 1}.</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </>)}

          {tag?.id === 'needswork' && (<>
            <p className="text-slate-300 text-sm leading-relaxed">
              This keyword is buried on page {Math.ceil(q.position / 10)} or deeper — almost nobody scrolls that far.
              With {fmt(q.impressions)} monthly searches but only {q.clicks} click{q.clicks !== 1 ? 's' : ''} reaching
              you, it&apos;s generating impressions but virtually no traffic. This needs a dedicated content
              or technical SEO effort to move onto page 1.
            </p>
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label="Monthly impressions" value={fmt(q.impressions)} color="text-slate-300" />
              <StatRow label="Your monthly clicks"  value={String(q.clicks)}       color="text-mustard"    />
              <StatRow label="Click rate (CTR)"     value={`${(q.ctr * 100).toFixed(1)}%`} color="text-mustard" />
            </div>
          </>)}

          {tag?.id === 'lowctr' && (<>
            <p className="text-slate-300 text-sm leading-relaxed">
              You&apos;re ranking on page 1 for this term but your click rate is well below what&apos;s typical
              at position #{Math.round(q.position)}. A normal CTR here would be around {(expCTR * 100).toFixed(1)}% —
              yours is {(q.ctr * 100).toFixed(1)}%. That&apos;s roughly {missedClicks} missed
              click{missedClicks !== 1 ? 's' : ''} every month. The most common cause is a weak page title
              or meta description that doesn&apos;t stand out in the search results.
            </p>
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label="Monthly impressions"          value={fmt(q.impressions)}               color="text-slate-300"    />
              <StatRow label="Expected clicks at position"  value={`~${expClicks}/mo`}               color="text-green-400/80" />
              <StatRow label="Your actual clicks"           value={`${q.clicks}/mo`}                 color="text-red-400"      />
              {missedClicks > 0 && (
                <StatRow label="Missed clicks / month" value={`~${missedClicks}`} color="text-mustard" />
              )}
            </div>
          </>)}

          {!tag && (
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label="Monthly impressions" value={fmt(q.impressions)} color="text-slate-300" />
              <StatRow label="CTR" value={`${(q.ctr * 100).toFixed(1)}%`} color="text-slate-300" />
              {posDir && (
                <StatRow
                  label="Position change"
                  value={`${posDir === 'up' ? '↑' : '↓'} ${Math.abs(q.positionChange!)} this month`}
                  color={posDir === 'up' ? 'text-green-400' : 'text-red-400'}
                />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 10

/* ─── Main table ───────────────────────────────────────────────────────────── */
export function KeywordTable({ queries }: { queries: Query[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [selected,  setSelected]  = useState<Query | null>(null)
  const [page,      setPage]      = useState(1)

  const avgCTR = queries.length > 0
    ? queries.reduce((s, q) => s + q.ctr, 0) / queries.length
    : 0

  const counts = {
    all:       queries.length,
    top3:      queries.filter(q => q.position <= 3).length,
    quickwins: queries.filter(q => q.position >= 4 && q.position <= 15).length,
    needswork: queries.filter(q => q.position > 20).length,
    lowctr:    queries.filter(q => q.position <= 10 && q.impressions > 30 && q.ctr < avgCTR * 0.5).length,
  }

  const filtered = queries.filter(q => {
    if (activeTab === 'top3')      return q.position <= 3
    if (activeTab === 'quickwins') return q.position >= 4 && q.position <= 15
    if (activeTab === 'needswork') return q.position > 20
    if (activeTab === 'lowctr')    return q.position <= 10 && q.impressions > 30 && q.ctr < avgCTR * 0.5
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setPage(1)
  }

  return (
    <>
      {selected && (
        <KeywordDetailModal
          query={selected}
          avgCTR={avgCTR}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="flex gap-1 mb-3 bg-navy-900 p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-navy-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 ${activeTab === tab.id ? 'text-slate-400' : 'text-slate-600'}`}>
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_64px_64px_72px_80px_88px] gap-3 px-4 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
          <Tooltip text="The exact phrase someone typed into Google. Click any row for a full breakdown.">
            <span className="cursor-default">Keyword</span>
          </Tooltip>
          <Tooltip text="Your average position in Google results. Lower is better — position 1 is the very top. The small number below shows this month's change.">
            <span className="text-right cursor-default block">Pos.</span>
          </Tooltip>
          <Tooltip text="How many times someone clicked your website from this search result last month.">
            <span className="text-right cursor-default block">Clicks</span>
          </Tooltip>
          <Tooltip text="How many times your site appeared in search results for this phrase, whether clicked or not.">
            <span className="text-right cursor-default block">Impr.</span>
          </Tooltip>
          <Tooltip text="Click-through rate — what percentage of searches resulted in a click to your site.">
            <span className="text-right cursor-default block">CTR</span>
          </Tooltip>
          <span className="text-right">Status</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">
            No keywords in this category.
          </div>
        ) : (
          <div className="divide-y divide-navy-700">
            {paginated.map((q, i) => {
              const tag    = getTag(q, avgCTR)
              const posDir =
                q.positionChange !== undefined && q.positionChange !== 0
                  ? q.positionChange < 0 ? 'up' : 'down'
                  : null

              return (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_64px_64px_72px_80px_88px] gap-3 px-4 py-3 items-center hover:bg-navy-700/20 transition-colors cursor-pointer"
                  onClick={() => setSelected(q)}
                >
                  <span className="text-white text-sm truncate">{q.query}</span>

                  {/* Position + MoM change */}
                  <div className="text-right">
                    <span className="text-slate-300 text-xs font-mono">#{Math.round(q.position)}</span>
                    {posDir && (
                      <p className={`text-[10px] tabular-nums leading-tight ${posDir === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                        {posDir === 'up' ? '↑' : '↓'}{Math.abs(q.positionChange!)}
                      </p>
                    )}
                  </div>

                  {/* Clicks + MoM change */}
                  <div className="text-right">
                    <span className="text-slate-300 text-xs">{q.clicks}</span>
                    {q.clicksChange !== undefined && q.clicksChange !== 0 && (
                      <p className={`text-[10px] tabular-nums leading-tight ${q.clicksChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {q.clicksChange > 0 ? '+' : ''}{q.clicksChange}%
                      </p>
                    )}
                  </div>

                  <span className="text-slate-300 text-xs text-right tabular-nums">{fmt(q.impressions)}</span>
                  <span className="text-slate-300 text-xs text-right tabular-nums">{(q.ctr * 100).toFixed(1)}%</span>

                  <div className="flex justify-end">
                    {tag && (
                      <span className={`text-xs border px-2 py-0.5 rounded-full whitespace-nowrap ${tag.color}`}>
                        {tag.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Prev
            </button>
            <span className="text-slate-500 text-xs tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
