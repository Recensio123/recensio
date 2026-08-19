'use client'
import { useMemo, useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import type { Connection, SocialPost, SocialStats, SocialPlatform } from './types'

/*
 * How often you post, and what the posts got back.
 *
 * Three readings, in the order a salon owner asks for them. What each account
 * amounts to right now. How steadily it is being fed. And which individual
 * posts landed.
 *
 * Everything here comes out of the platforms' own numbers: followers and the
 * per-post likes and comments are what Instagram, TikTok and Pinterest report
 * when asked. Posts-per-week is counted from the publish dates on those same
 * posts, not estimated.
 *
 * What is deliberately absent is any curve of growth over time. No platform
 * keeps history for us — an API call answers with the likes a post has right
 * now — so a trend line would have to be invented until we have sat and
 * recorded readings ourselves for a few weeks. The note at the foot says that
 * out loud rather than drawing the line.
 */

const T = {
  sv: {
    example:     'Exempeldata',
    exampleTip:  'Inga konton är kopplade ännu, så siffrorna visar hur vyn ser ut när data börjat komma in. Ingenting här är hämtat från dina konton.',
    accounts:    'Dina konton',
    perMonth:    'senaste 30 dagarna',
    followers:   'Följare',
    posts:       'Inlägg',
    likes:       'Gilla',
    comments:    'Kommentarer',
    cadence:     'Hur ofta du postar',
    cadenceSub:  'inlägg per vecka, senaste fyra veckorna',
    weekAgo:     'v',
    thisWeek:    'Denna vecka',
    postsTitle:  'Dina inlägg',
    postsSub:    'nyast först',
    noPosts:     'Inga inlägg hämtade ännu.',
    saves:       'sparningar',
    historyNote: 'Plattformarna sparar ingen historik — de svarar bara med hur det ser ut just nu. Varje hämtning skrivs ned här, så utveckling över tid går att visa efter några veckor.',
    engagement:  'Reaktioner per inlägg',
    engSub:      'gilla och kommentarer delat på antal inlägg',
    all:         'Alla',
    perPost:     'Per inlägg',
    perPostSub:  'snitt över de inlägg som hämtats',
    avgLikes:    'gilla',
    avgComments: 'kommentarer',
    avgSaves:    'sparningar',
  },
  en: {
    example:     'Sample data',
    exampleTip:  'No accounts are connected yet, so the figures show what the view looks like once data starts arriving. Nothing here is fetched from your accounts.',
    accounts:    'Your accounts',
    perMonth:    'last 30 days',
    followers:   'Followers',
    posts:       'Posts',
    likes:       'Likes',
    comments:    'Comments',
    cadence:     'How often you post',
    cadenceSub:  'posts per week, last four weeks',
    weekAgo:     'w',
    thisWeek:    'This week',
    postsTitle:  'Your posts',
    postsSub:    'newest first',
    noPosts:     'No posts fetched yet.',
    saves:       'saves',
    historyNote: 'The platforms keep no history — they answer only with how things look right now. Every fetch is written down here, so change over time can be shown after a few weeks.',
    engagement:  'Reactions per post',
    engSub:      'likes and comments divided by number of posts',
    all:         'All',
    perPost:     'Per post',
    perPostSub:  'average across the posts fetched',
    avgLikes:    'likes',
    avgComments: 'comments',
    avgSaves:    'saves',
  },
}

const DOT: Record<SocialPlatform, string> = {
  instagram: 'bg-pink-400',
  facebook:  'bg-blue-400',
  tiktok:    'bg-teal-300',
  pinterest: 'bg-red-400',
}

function nf(n: number | undefined, lang: string) {
  return n === undefined ? '—' : n.toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')
}

/* Posts per week for the last four whole weeks, counted from publish dates.
   Week 0 is the running one. Buckets are day-granular, so a server render and
   the hydration that follows it land on the same numbers. */
function weeklyCounts(posts: SocialPost[]): number[] {
  const DAY   = 86_400_000
  const today = Math.floor(Date.now() / DAY)
  const weeks = [0, 0, 0, 0]
  for (const p of posts) {
    const day = Math.floor(Date.parse(p.date) / DAY)
    if (Number.isNaN(day)) continue
    const idx = Math.floor((today - day) / 7)
    if (idx >= 0 && idx < 4) weeks[idx]++
  }
  return weeks
}

function StatCell({ label, value, lang }: { label: string; value?: number; lang: string }) {
  return (
    <div className="text-right min-w-[64px]">
      <p className="text-white text-sm font-semibold tabular-nums">{nf(value, lang)}</p>
      <p className="text-slate-600 text-xs">{label}</p>
    </div>
  )
}

export function StatistikTab({ connections, stats, posts, isExample }: {
  connections: Connection[]
  stats:       SocialStats[]
  posts:       SocialPost[]
  isExample:   boolean
}) {
  const { lang } = useLang()
  const t = T[lang]

  /* Only connected accounts can produce numbers, so only they are on offer
     here — an unconnected platform belongs on the Konton tab, not as an empty
     row in a comparison. Before anything is connected the example stands in for
     all four, so the filter can be seen working. */
  const active = useMemo(() => {
    const connected = connections.filter(c => c.connected)
    return connected.length > 0 ? connected : connections
  }, [connections])

  const [only, setOnly] = useState<SocialPlatform | 'all'>('all')
  /* A platform that gets disconnected while the view is open would otherwise
     leave the filter pointing at nothing. */
  const shown = active.some(c => c.platform === only) ? only : 'all'

  const view       = shown === 'all' ? active : active.filter(c => c.platform === shown)
  const viewIds    = useMemo(() => new Set(view.map(c => c.platform)), [view])
  const viewStats  = useMemo(() => stats.filter(s => viewIds.has(s.platform)), [stats, viewIds])
  const viewPosts  = useMemo(() => posts.filter(p => viewIds.has(p.platform)), [posts, viewIds])

  const byPlatform = useMemo(() => new Map(stats.map(s => [s.platform, s])), [stats])
  const label      = useMemo(
    () => new Map(connections.map(c => [c.platform, c.label])),
    [connections],
  )

  const weeks    = useMemo(() => weeklyCounts(viewPosts), [viewPosts])
  const weekMax  = Math.max(...weeks, 1)
  const sorted   = useMemo(
    () => [...viewPosts].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [viewPosts],
  )

  /* Comparing one platform against itself says nothing, so the comparison card
     gives way to that platform's own per-post averages. */
  const comparing = shown === 'all' && active.length > 1

  const avg = useMemo(() => {
    if (viewPosts.length === 0) return null
    const sum = (pick: (p: SocialPost) => number | undefined) =>
      viewPosts.reduce((n, p) => n + (pick(p) ?? 0), 0) / viewPosts.length
    const anySaves = viewPosts.some(p => p.saves !== undefined)
    return {
      likes:    sum(p => p.likes),
      comments: sum(p => p.comments),
      saves:    anySaves ? sum(p => p.saves) : undefined,
    }
  }, [viewPosts])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Alla first, then one chip per account. */}
        {([{ id: 'all' as const, label: t.all }, ...active.map(c => ({ id: c.platform, label: c.label }))]).map(o => (
          <button
            key={o.id}
            onClick={() => setOnly(o.id)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              shown === o.id
                ? 'bg-navy-700 border-navy-600 text-white font-medium'
                : 'bg-navy-800 border-navy-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {o.id !== 'all' && (
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${DOT[o.id]}`} />
            )}
            {o.label}
          </button>
        ))}

        {isExample && (
          <Tooltip text={t.exampleTip}>
            <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-2 py-1 rounded font-medium cursor-default inline-block ml-1">
              {t.example}
            </span>
          </Tooltip>
        )}
      </div>

      {/* ── What each account amounts to ──────────────────────────────────── */}
      <section>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.accounts}</h2>
          <span className="text-xs text-slate-600">{t.perMonth}</span>
        </div>

        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700 overflow-x-auto">
          {view.map(c => {
            const s = byPlatform.get(c.platform)
            return (
              <div key={c.platform} className="px-4 py-3 flex items-center gap-4 min-w-[520px]">
                <span className="flex-1 flex items-center gap-2 text-slate-300 text-sm">
                  <span className={`w-1.5 h-1.5 rounded-full ${DOT[c.platform]}`} />
                  {c.label}
                </span>
                <StatCell label={t.followers} value={s?.followers}   lang={lang} />
                <StatCell label={t.posts}     value={s?.posts30d}    lang={lang} />
                <StatCell label={t.likes}     value={s?.likes30d}    lang={lang} />
                <StatCell label={t.comments}  value={s?.comments30d} lang={lang} />
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Cadence and payoff, side by side ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.cadence}</h2>
          <p className="text-slate-600 text-xs mt-0.5">{t.cadenceSub}</p>

          {/* Newest week on the right, the way a calendar reads. */}
          <div className="flex items-end gap-3 h-28 mt-5">
            {[3, 2, 1, 0].map(i => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-slate-400 text-xs tabular-nums">{weeks[i]}</span>
                <div
                  className={`w-full rounded-t ${i === 0 ? 'bg-mustard' : 'bg-navy-600'}`}
                  style={{ height: `${Math.max((weeks[i] / weekMax) * 76, 3)}px` }}
                />
                <span className="text-slate-600 text-xs">
                  {i === 0 ? t.thisWeek.split(' ')[0] : `-${i}${t.weekAgo}`}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {comparing ? t.engagement : t.perPost}
          </h2>
          <p className="text-slate-600 text-xs mt-0.5">{comparing ? t.engSub : t.perPostSub}</p>

          {comparing ? (
            <div className="mt-4 space-y-2.5">
              {active.map(c => {
                const s   = byPlatform.get(c.platform)
                const n   = s?.posts30d ?? 0
                const per = n > 0 ? ((s?.likes30d ?? 0) + (s?.comments30d ?? 0)) / n : undefined
                const max = Math.max(
                  ...viewStats.map(x => (x.posts30d ? ((x.likes30d ?? 0) + (x.comments30d ?? 0)) / x.posts30d : 0)),
                  1,
                )
                return (
                  <div key={c.platform} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs w-20 shrink-0">{c.label}</span>
                    <div className="flex-1 h-2 bg-navy-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${DOT[c.platform]}`}
                        style={{ width: `${per === undefined ? 0 : (per / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-white text-xs font-semibold tabular-nums w-10 text-right">
                      {per === undefined ? '—' : Math.round(per)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 flex items-end gap-8">
              {[
                { label: t.avgLikes,    value: avg?.likes },
                { label: t.avgComments, value: avg?.comments },
                ...(avg?.saves !== undefined ? [{ label: t.avgSaves, value: avg.saves }] : []),
              ].map(x => (
                <div key={x.label}>
                  <p className="text-white text-2xl font-semibold tabular-nums">
                    {x.value === undefined ? '—' : Math.round(x.value)}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">{x.label}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── The posts themselves ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.postsTitle}</h2>
          <span className="text-xs text-slate-600">{t.postsSub}</span>
        </div>

        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
          {sorted.length === 0 && (
            <p className="px-4 py-6 text-slate-500 text-sm">{t.noPosts}</p>
          )}
          {sorted.map((p, i) => (
            <div key={`${p.platform}-${p.date}-${i}`} className="px-4 py-3 flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <p className="text-slate-200 text-sm leading-snug">{p.text}</p>
                <p className="text-slate-600 text-xs mt-1 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${DOT[p.platform]}`} />
                  {label.get(p.platform) ?? p.platform} · {p.kind} ·{' '}
                  {new Date(p.date).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="flex items-center gap-5 shrink-0 pt-0.5">
                <StatCell label={t.likes}    value={p.likes}    lang={lang} />
                <StatCell label={t.comments} value={p.comments} lang={lang} />
                <StatCell label={t.saves}    value={p.saves}    lang={lang} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-slate-600 text-xs max-w-2xl leading-relaxed">{t.historyNote}</p>
    </div>
  )
}
