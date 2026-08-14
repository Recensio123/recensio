'use client'
import { useState, useMemo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang, type Lang } from '@/components/LanguageProvider'
import type { Period } from '@/components/dashboard/PeriodSelector'
import { useCoverage, coveredValue, type Coverage } from '@/components/DataCoverageProvider'
import { CoverageNote } from '@/components/dashboard/CoverageNote'
import type { Query } from './KeywordTable'

/*
 * Search Console's own table, and nothing else.
 *
 * Everything here is a figure Google returned: the phrase as it was typed,
 * clicks, impressions, click rate, average position. We round, we format, we
 * translate a position into its results page — no ranking of our own, no
 * thresholds, no verdicts.
 *
 * What was removed, and why. The status column ("Snabb vinst", "Behöver
 * arbete") was our judgement wearing the table's clothing, and the click rate
 * it judged against came from a curve written into the code — a plausible
 * number that Google never said. Sitting inside a data table it read as
 * measurement. The three sort tabs were the same problem one level up: they
 * decided for the salon which end of the list mattered.
 *
 * Sorting now belongs to whoever is reading. Every column sorts both ways;
 * the default is clicks, highest first, because that is Search Console's own
 * default and inheriting it is one fewer opinion of ours.
 *
 * Judgement has not gone away — it lives next door in "Satsa på härnäst",
 * where it is visibly ours.
 */
export type SortCol = 'query' | 'position' | 'change' | 'clicks' | 'impressions' | 'ctr'
export type TableSort = { col: SortCol; dir: 'asc' | 'desc' }

export const DEFAULT_SORT: TableSort = { col: 'clicks', dir: 'desc' }

/* Numbers open on their largest value, text opens A–Ö, and position opens at
   the top of Google — mechanical defaults, so one click means one thing. */
const FIRST_DIR: Record<SortCol, 'asc' | 'desc'> = {
  query: 'asc', position: 'asc', change: 'desc', clicks: 'desc', impressions: 'desc', ctr: 'desc',
}

/* ─── Period scaling ───────────────────────────────────────────────────────────
   Mock data is monthly at the source. Flow metrics (clicks, impressions) scale
   with the selected period: weekly ≈ monthly / 4.3, yearly ≈ monthly × 12.
   State metrics (position, position change) never scale. CTR is a ratio and
   stays the same. All factors are fixed and deterministic — no randomness in
   render. On a live account the period is a date range sent to Google, and
   none of this scaling applies. */
const FLOW_FACTOR: Record<Period, number> = { Weekly: 1 / 4.3, Monthly: 1, Yearly: 12 }
// Delta-% vs previous period should differ plausibly per period: WoW swings are
// smaller/noisier, YoY reflects cumulative growth. Fixed per-row wobble keeps
// rows from all showing identical adjustments.
const CHANGE_FACTOR: Record<Period, number> = { Weekly: 0.45, Monthly: 1, Yearly: 2.6 }
const CHANGE_WOBBLE = [1.15, 0.85, 1.05, 0.9, 1.1, 0.95]

type DisplayFlow = { clicks: number; impressions: number; clicksChange?: number }

function adjustPeriodChange(change: number | undefined, i: number, period: Period): number | undefined {
  if (change === undefined || change === 0 || period === 'Monthly') return change
  const v = Math.round(change * CHANGE_FACTOR[period] * CHANGE_WOBBLE[i % CHANGE_WOBBLE.length])
  return v === 0 ? (change > 0 ? 1 : -1) : v
}

/* Flow figures are period-scaled, then trimmed to the days our Search Console
   record actually reaches back to. A yearly total assumes 365 days of
   measurement; on a property registered last week the honest figure is the
   part we measured. Position and CTR are untouched — they are state. */
function displayFlowFor(q: Query, i: number, period: Period, coverage: Coverage): DisplayFlow {
  const f = FLOW_FACTOR[period]
  return {
    clicks:       coveredValue(Math.round(q.clicks * f), coverage),
    impressions:  coveredValue(Math.round(q.impressions * f), coverage),
    clicksChange: adjustPeriodChange(q.clicksChange, i, period),
  }
}

const T = {
  sv: {
    keywordsWord: 'sökord',
    searchPlaceholder: 'Sök bland dina sökord…',
    page1: 'Sida 1', page2: 'Sida 2', page3plus: 'Sida 3+',
    colKeyword:     'Sökord',
    colKeywordTip:  'Den exakta frasen någon skrev in på Google. Klicka på en rad för alla siffror.',
    colPosition:    'Plats',
    colPositionTip: 'Din genomsnittliga placering i Googles resultat för frasen, avrundad till närmaste hela plats, och vilken resultatsida det motsvarar. Snittet räknas fram av Google själv.',
    colChange:      'Förändring',
    colChangeTip:   'Placeringen nu jämfört med föregående period. Grönt betyder att du klättrat, rött att du tappat. Streck betyder att frasen saknas i den ena perioden.',
    colClicks:      'Klick',
    colClicksTip:   'Hur många gånger någon klickade sig till din hemsida från det här sökresultatet.',
    colSeen:        'Visningar',
    colSeenTip:     'Hur många gånger din sida visades i sökresultaten för frasen, oavsett om någon klickade eller inte.',
    colCtr:         'Andel klick',
    colCtrTip:      'Hur stor andel av dem som såg dig som klickade sig vidare. Googles eget tal.',
    emptyState:     'Inga sökord ännu.',
    emptySearch:    'Ingen sökfras matchar det du skrev.',
    prev: 'Föregående', next: 'Nästa',
    /* Utan den här raden ser en kort lista ut som att ingen söker på dem. */
    footnote: 'Listan visar alla sökfraser Google rapporterar för din sida. Ovanliga sökningar utelämnas av Google av integritetsskäl och kan därför saknas.',
    // Detaljvy
    mPosition:    'Plats',
    mClicks:      { Weekly: 'Klick per vecka', Monthly: 'Klick per månad', Yearly: 'Klick per år' } as Record<Period, string>,
    mVsLastMonth: { Weekly: 'mot förra veckan', Monthly: 'mot förra månaden', Yearly: 'mot förra året' } as Record<Period, string>,
    mCtr:         'Andel klick',
    mThisMonth:   { Weekly: 'denna vecka', Monthly: 'denna månad', Yearly: 'i år' } as Record<Period, string>,
    mOnGoogle:    (page: string) => `${page} på Google`,
    seenPerMonth: { Weekly: 'Visningar per vecka', Monthly: 'Visningar per månad', Yearly: 'Visningar per år' } as Record<Period, string>,
    posChange:    'Förändring i plats',
    spots:        (n: number) => `${n} plats${n === 1 ? '' : 'er'}`,
    source:       'Alla siffror kommer från Google Search Console.',
  },
  en: {
    keywordsWord: 'keywords',
    searchPlaceholder: 'Search your keywords…',
    page1: 'Page 1', page2: 'Page 2', page3plus: 'Page 3+',
    colKeyword:     'Keyword',
    colKeywordTip:  'The exact phrase someone typed into Google. Click any row for every figure.',
    colPosition:    'Position',
    colPositionTip: 'Your average position in Google results for this phrase, rounded to the nearest whole place, and the results page that puts you on. The average is calculated by Google itself.',
    colChange:      'Change',
    colChangeTip:   'Position now versus the previous period. Green means you climbed, red means you slipped. A dash means the phrase is missing from one of the periods.',
    colClicks:      'Clicks',
    colClicksTip:   'How many times someone clicked through to your website from this search result.',
    colSeen:        'Times seen',
    colSeenTip:     'How many times your site appeared in search results for this phrase, whether clicked or not.',
    colCtr:         'Click rate',
    colCtrTip:      "What share of the people who saw you clicked through. Google's own figure.",
    emptyState:     'No keywords yet.',
    emptySearch:    'No phrase matches what you typed.',
    prev: 'Prev', next: 'Next',
    footnote: 'The list shows every search phrase Google reports for your site. Google omits rare searches for privacy reasons, so some may be missing.',
    // Detail view
    mPosition:    'Position',
    mClicks:      { Weekly: 'Weekly clicks', Monthly: 'Monthly clicks', Yearly: 'Yearly clicks' } as Record<Period, string>,
    mVsLastMonth: { Weekly: 'vs last week', Monthly: 'vs last month', Yearly: 'vs last year' } as Record<Period, string>,
    mCtr:         'Click rate',
    mThisMonth:   { Weekly: 'this week', Monthly: 'this month', Yearly: 'this year' } as Record<Period, string>,
    mOnGoogle:    (page: string) => `${page} on Google`,
    seenPerMonth: { Weekly: 'Times seen per week', Monthly: 'Times seen per month', Yearly: 'Times seen per year' } as Record<Period, string>,
    posChange:    'Position change',
    spots:        (n: number) => `${n} spot${n === 1 ? '' : 's'}`,
    source:       'All figures come from Google Search Console.',
  },
}

function fmt(n: number) {
  return n >= 1_000
    ? (n / 1_000).toLocaleString('sv-SE', { maximumFractionDigits: 1 }) + 'k'
    : n.toLocaleString('sv-SE')
}

function fmtPct(ratio: number) {
  return (ratio * 100).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

/* Google reports position to one decimal, being an average rather than a rank.
   A salon reads "plats 3", not "plats 3,2", so the decimal is rounded off —
   2,4 shows as 2 and 2,5 shows as 3. Sorting still runs on Google's full
   figure, so two phrases that both display as 3 keep their true order. */
function fmtPosition(position: number) {
  return String(Math.round(position))
}

// Positions mean little to a non-marketer — pages are how people actually think
// about Google results. Pure arithmetic on Google's own number: 1–10 is page 1.
function pageLabel(position: number, lang: Lang) {
  const p = Math.round(position)
  const t = T[lang]
  if (p <= 10) return t.page1
  if (p <= 20) return t.page2
  return t.page3plus
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

/* ─── Detail view ──────────────────────────────────────────────────────────────
   The same four figures the row shows, with room to breathe. What used to live
   here — an expected click rate, a projected gain from reaching the top three,
   a list of things to go and fix — was advice, and none of it came from
   Google. It belongs in the action plan, not behind a row in a data table. */
function KeywordDetailModal({
  query: q,
  display: d,
  period,
  showDelta,
  onClose,
}: {
  query:     Query
  display:   DisplayFlow
  period:    Period
  showDelta: boolean
  onClose:   () => void
}) {
  const { lang } = useLang()
  const t = T[lang]
  const posDir =
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
          <p className="text-white font-semibold text-base leading-snug">&ldquo;{q.query}&rdquo;</p>
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
              label: t.mPosition,
              value: fmtPosition(q.position),
              sub:   posDir
                ? <span className={posDir === 'up' ? 'text-green-400' : 'text-red-400'}>
                    {posDir === 'up' ? '↑' : '↓'}{Math.abs(q.positionChange!)} {t.mThisMonth[period]}
                  </span>
                : <span className="text-slate-500">{t.mOnGoogle(pageLabel(q.position, lang))}</span>,
            },
            {
              label: t.mClicks[period],
              value: d.clicks.toLocaleString('sv-SE'),
              // Clicks-change is a comparison against the previous period —
              // only honest once we hold that period in full.
              sub:   showDelta && d.clicksChange !== undefined && d.clicksChange !== 0
                ? <span className={d.clicksChange > 0 ? 'text-green-400' : 'text-red-400'}>
                    {d.clicksChange > 0 ? '+' : ''}{d.clicksChange}% {t.mVsLastMonth[period]}
                  </span>
                : null,
            },
            {
              label: t.mCtr,
              value: fmtPct(q.ctr),
              sub:   null,
            },
          ] as { label: string; value: string; sub: React.ReactNode }[]).map((m, i) => (
            <div key={i} className={`px-4 py-3 ${i > 0 ? 'border-l border-navy-700' : ''}`}>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{m.label}</p>
              <p className="text-white text-xl font-bold tabular-nums">{m.value}</p>
              {m.sub && <p className="text-xs mt-0.5">{m.sub}</p>}
            </div>
          ))}
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-navy-900 rounded-xl p-4 space-y-2">
            <StatRow label={t.seenPerMonth[period]} value={fmt(d.impressions)} color="text-slate-300" />
            {posDir && (
              <StatRow
                label={t.posChange}
                value={`${posDir === 'up' ? '↑' : '↓'} ${t.spots(Math.abs(q.positionChange!))}`}
                color={posDir === 'up' ? 'text-green-400' : 'text-red-400'}
              />
            )}
          </div>
          <p className="text-slate-600 text-xs">{t.source}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Sortable column header ───────────────────────────────────────────────── */
function ColHeader({ col, label, tip, sort, onSort, align = 'right' }: {
  col:    SortCol
  label:  string
  tip:    string
  sort:   TableSort
  onSort: (col: SortCol) => void
  align?: 'left' | 'right'
}) {
  const active = sort.col === col
  return (
    <Tooltip text={tip}>
      <button
        onClick={() => onSort(col)}
        className={`flex items-center gap-1 w-full cursor-pointer transition-colors hover:text-slate-300 ${
          align === 'right' ? 'justify-end' : ''
        } ${active ? 'text-slate-300' : ''}`}
      >
        {label}
        <span className={`text-[9px] leading-none ${active ? 'text-mustard' : 'text-transparent'}`}>
          {active && sort.dir === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </Tooltip>
  )
}

const PAGE_SIZE = 10

/* ─── Main table ───────────────────────────────────────────────────────────── */
export function KeywordTableTest2({
  queries,
  sort,
  onSortChange,
  period = 'Monthly',
}: {
  queries:      Query[]
  sort:         TableSort
  onSortChange: (sort: TableSort) => void
  period?:      Period
}) {
  const { lang } = useLang()
  const t = T[lang]
  const [selected, setSelected] = useState<Query | null>(null)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')

  // Per-row clicks-change is a period-over-period comparison; positions are
  // current state and stay visible regardless of coverage.
  const coverage  = useCoverage('search', period)
  const showDelta = coverage.state === 'full'

  // Period-scaled flow figures per query, for display only.
  const flowByQuery = useMemo(
    () => new Map(queries.map((q, i) => [q, displayFlowFor(q, i, period, coverage)])),
    [queries, period, coverage],
  )

  /* The salon filters, we do not. Nothing is hidden unless something was
   * typed into the box. */
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return needle ? queries.filter(q => q.query.toLowerCase().includes(needle)) : queries
  }, [queries, search])

  /* A phrase Google reported in only one of the two periods has no change to
   * show — it is new, or it is gone. Either way it is not a movement of zero,
   * so it sits at the bottom whichever way the column is turned. */
  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sort.col === 'query')  return a.query.localeCompare(b.query, 'sv') * dir
      if (sort.col === 'change') {
        const ca = a.positionChange, cb = b.positionChange
        if (ca === undefined && cb === undefined) return 0
        if (ca === undefined) return 1
        if (cb === undefined) return -1
        return (ca - cb) * dir
      }
      const av = sort.col === 'clicks' ? a.clicks : sort.col === 'impressions' ? a.impressions : sort.col === 'ctr' ? a.ctr : a.position
      const bv = sort.col === 'clicks' ? b.clicks : sort.col === 'impressions' ? b.impressions : sort.col === 'ctr' ? b.ctr : b.position
      return (av - bv) * dir
    })
  }, [filtered, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  /* Same column twice flips the direction; a new column opens at whichever end
   * of it is normally read first. */
  function toggleSort(col: SortCol) {
    onSortChange(sort.col === col
      ? { col, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: FIRST_DIR[col] })
    setPage(1)
  }

  const cols = 'grid-cols-[1fr_80px_88px_60px_80px_76px]'

  return (
    <>
      {selected && (
        <KeywordDetailModal
          query={selected}
          display={flowByQuery.get(selected) ?? displayFlowFor(selected, 0, period, coverage)}
          period={period}
          showDelta={showDelta}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={t.searchPlaceholder}
            className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 w-56 focus:outline-none focus:border-navy-600"
          />
          <span className="text-xs text-slate-600">{sorted.length} {t.keywordsWord}</span>
        </div>
        {/* Explains the missing change figures in the clicks column */}
        <CoverageNote coverage={coverage} period={period} />
      </div>

      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            {/* Header */}
            <div className={`grid ${cols} gap-3 px-4 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium`}>
              <ColHeader col="query"       label={t.colKeyword}  tip={t.colKeywordTip}  sort={sort} onSort={toggleSort} align="left" />
              <ColHeader col="position"    label={t.colPosition} tip={t.colPositionTip} sort={sort} onSort={toggleSort} />
              <ColHeader col="change"      label={t.colChange}   tip={t.colChangeTip}   sort={sort} onSort={toggleSort} />
              <ColHeader col="clicks"      label={t.colClicks}   tip={t.colClicksTip}   sort={sort} onSort={toggleSort} />
              <ColHeader col="impressions" label={t.colSeen}     tip={t.colSeenTip}     sort={sort} onSort={toggleSort} />
              <ColHeader col="ctr"         label={t.colCtr}      tip={t.colCtrTip}      sort={sort} onSort={toggleSort} />
            </div>

            {sorted.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                {queries.length === 0 ? t.emptyState : t.emptySearch}
              </div>
            ) : (
              <div className="divide-y divide-navy-700">
                {paginated.map((q, i) => {
                  const d      = flowByQuery.get(q) ?? displayFlowFor(q, i, period, coverage)
                  const posDir =
                    q.positionChange !== undefined && q.positionChange !== 0
                      ? q.positionChange < 0 ? 'up' : 'down'
                      : null

                  return (
                    <div
                      key={i}
                      className={`grid ${cols} gap-3 px-4 py-3 items-center hover:bg-navy-700/20 transition-colors cursor-pointer`}
                      onClick={() => setSelected(q)}
                    >
                      <span className="text-white text-sm truncate">{q.query}</span>

                      {/* Position as Google reports it, with the results page it lands on */}
                      <div className="text-right">
                        <p className="text-slate-300 text-xs font-mono leading-tight">{fmtPosition(q.position)}</p>
                        <p className="text-slate-500 text-xs leading-tight whitespace-nowrap">{pageLabel(q.position, lang)}</p>
                      </div>

                      {/* Position now vs the previous period */}
                      <div className="text-right">
                        {posDir ? (
                          <span className={`text-xs tabular-nums ${posDir === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                            {posDir === 'up' ? '↑' : '↓'}{Math.abs(q.positionChange!)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">{q.positionChange === 0 ? '0' : '–'}</span>
                        )}
                      </div>

                      {/* Clicks + change vs previous period */}
                      <div className="text-right">
                        <span className="text-slate-300 text-xs">{d.clicks}</span>
                        {showDelta && d.clicksChange !== undefined && d.clicksChange !== 0 && (
                          <p className={`text-xs tabular-nums leading-tight ${d.clicksChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {d.clicksChange > 0 ? '+' : ''}{d.clicksChange}%
                          </p>
                        )}
                      </div>

                      <span className="text-slate-300 text-xs text-right tabular-nums">{fmt(d.impressions)}</span>
                      <span className="text-slate-300 text-xs text-right tabular-nums">{fmtPct(q.ctr)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t.prev}
            </button>
            <span className="text-slate-500 text-xs tabular-nums">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {t.next}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <p className="text-slate-600 text-xs mt-2 leading-relaxed">{t.footnote}</p>
    </>
  )
}
