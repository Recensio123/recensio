'use client'
import { useState, useMemo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang, type Lang } from '@/components/LanguageProvider'
import type { Period } from '@/components/dashboard/PeriodSelector'
import { useCoverage, coveredValue, type Coverage } from '@/components/DataCoverageProvider'
import { CoverageNote } from '@/components/dashboard/CoverageNote'
import type { Query } from './KeywordTable'

export type TableTab = 'all' | 'top3' | 'quickwins' | 'needswork' | 'lowctr'
type TagId = 'top3' | 'quickwin' | 'needswork' | 'lowctr'

/* ─── Period scaling ───────────────────────────────────────────────────────────
   Mock data is monthly at the source. Flow metrics (clicks, impressions) scale
   with the selected period: weekly ≈ monthly / 4.3, yearly ≈ monthly × 12.
   State metrics (position, position change, status tags, tab counts) never
   scale, so tags/filters/counts are always computed from the original monthly
   values. CTR is a ratio and stays the same. All factors are fixed and
   deterministic — no randomness in render. */
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
   part we measured. Position, tags and CTR are untouched — they are state. */
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
    tabs: {
      all:       'Alla',
      top3:      'Topp 3',
      quickwins: 'Snabba vinster',
      needswork: 'Behöver arbete',
      lowctr:    'Setts men inte klickats',
    } as Record<TableTab, string>,
    tags: {
      top3:      'Topp 3',
      quickwin:  'Snabb vinst',
      needswork: 'Behöver arbete',
      lowctr:    'Får inga klick',
    } as Record<TagId, string>,
    page1: 'Sida 1', page2: 'Sida 2', page3plus: 'Sida 3+',
    colKeyword:     'Sökord',
    colKeywordTip:  'Den exakta frasen någon skrev in på Google. Klicka på en rad för en full genomgång.',
    colPosition:    'Plats',
    colPositionTip: 'Var du rankar på Google och vilken resultatsida det motsvarar. Plats 1 är allra högst upp. Den lilla pilen visar månadens förändring.',
    colClicks:      'Klick',
    colClicksTip:   'Hur många gånger någon klickade sig till din hemsida från det här sökresultatet förra månaden.',
    colSeen:        'Visningar',
    colSeenTip:     'Hur många gånger din sida visades i sökresultaten för den här frasen, oavsett om någon klickade eller inte.',
    colCtr:         'Andel klick',
    colCtrTip:      'Hur stor andel av dem som såg dig som faktiskt klickade sig vidare till din sida.',
    colStatus:      'Status',
    colStatusTip:   'En snabb etikett som visar vad sökordet behöver. Håll muspekaren över en etikett för förklaring — eller klicka på raden för hela genomgången.',
    tagTips: {
      top3:      'Du ligger bland de tre översta resultaten, dit de flesta klicken går. Håll sidan uppdaterad.',
      quickwin:  'Plats 4–15 — nära toppen. En liten förbättring kan ge många fler besökare.',
      needswork: 'Plats 21 eller längre bak. Kräver riktat arbete med innehållet för att nå sida 1.',
      lowctr:    'Du syns på sida 1 men får ovanligt få klick. Oftast beror det på en svag sidtitel.',
    } as Record<TagId, string>,
    emptyState:     'Inga sökord i den här kategorin.',
    prev: 'Föregående', next: 'Nästa',
    // Modal
    mPosition:    'Plats',
    mThisMonth:   { Weekly: 'denna vecka', Monthly: 'denna månad', Yearly: 'i år' } as Record<Period, string>,
    mOnGoogle:    (page: string) => `${page} på Google`,
    mClicks:      { Weekly: 'Klick per vecka', Monthly: 'Klick per månad', Yearly: 'Klick per år' } as Record<Period, string>,
    mVsLastMonth: { Weekly: 'mot förra veckan', Monthly: 'mot förra månaden', Yearly: 'mot förra året' } as Record<Period, string>,
    mCtr:         'Andel klick',
    mExpected:    (pct: string) => `Förväntat ${pct}%`,
    top3Text:     'Det här sökordet går bra. Du ligger bland de 3 översta resultaten — dit över 60 % av alla klick går. Håll sidan uppdaterad och håll koll på om placeringen sjunker.',
    seenPerMonth: { Weekly: 'Visningar per vecka', Monthly: 'Visningar per månad', Yearly: 'Visningar per år' } as Record<Period, string>,
    posThisMonth: { Weekly: 'Plats denna vecka', Monthly: 'Plats denna månad', Yearly: 'Plats i år' } as Record<Period, string>,
    unitShort:    { Weekly: 'vecka', Monthly: 'mån', Yearly: 'år' } as Record<Period, string>,
    freq:         { Weekly: 'i veckan', Monthly: 'i månaden', Yearly: 'per år' } as Record<Period, string>,
    every:        { Weekly: 'varje vecka', Monthly: 'varje månad', Yearly: 'varje år' } as Record<Period, string>,
    spots:        (n: number) => `${n} plats${n === 1 ? '' : 'er'}`,
    quickwinText: (pos: number) =>
      `Du visas redan nära toppen av Google för den här sökningen. Plats #${pos} är strax utanför där de flesta klicken hamnar — de 3 översta resultaten får runt 60 % av alla klick. En liten förbättring i placering kan ge betydligt fler besökare utan att du betalar för annonser.`,
    estGain:      'Möjlig ökning om topp 3',
    estGainVal:   (n: number, unit: string) => `~+${n} klick/${unit}`,
    toClimb:      'Platser att klättra',
    toClimbVal:   (n: number) => `${n} plats${n === 1 ? '' : 'er'} till topp 3`,
    howTo:        'Så förbättrar du det',
    tips: [
      'Gör sidan mer utförlig än de som ligger före dig — gå djupare in på ämnet, svara på följdfrågor och lägg till exempel.',
      'Länka till den här sidan från andra relevanta sidor på din hemsida. Varje länk visar Google att sidan är viktig.',
      'Kontrollera att sökordet finns med i sidans titel, i huvudrubriken och på ett naturligt sätt i första stycket.',
    ],
    needsworkText: (page: number, impressions: string, clicks: number, freq: string) =>
      `Det här sökordet ligger på sida ${page} eller längre bak — nästan ingen bläddrar så långt. Med ${impressions} sökningar ${freq} men bara ${clicks} klick till dig syns du utan att få besökare. Det behövs riktat arbete med innehåll eller teknisk SEO för att nå sida 1.`,
    yourClicks:   { Weekly: 'Dina klick per vecka', Monthly: 'Dina klick per månad', Yearly: 'Dina klick per år' } as Record<Period, string>,
    lowctrText:   (pos: number, expPct: string, ctrPct: string, missed: number, every: string) =>
      `Du ligger på sida 1 för den här sökningen men får klart färre klick än vad som är normalt för plats #${pos}. En normal andel klick här vore runt ${expPct} % — din är ${ctrPct} %. Det är ungefär ${missed} missade klick ${every}. Vanligaste orsaken är en svag sidtitel eller sidbeskrivning som inte sticker ut i sökresultaten.`,
    expClicksAt:   'Förväntade klick på platsen',
    perMonth:      (n: number, unit: string) => `~${n}/${unit}`,
    actualClicks:  'Dina faktiska klick',
    actualClicksVal: (n: number, unit: string) => `${n}/${unit}`,
    missedPerMonth: { Weekly: 'Missade klick / vecka', Monthly: 'Missade klick / månad', Yearly: 'Missade klick / år' } as Record<Period, string>,
    posChange:     'Förändring i plats',
  },
  en: {
    tabs: {
      all:       'All',
      top3:      'Top 3',
      quickwins: 'Quick wins',
      needswork: 'Needs work',
      lowctr:    'Seen but not clicked',
    } as Record<TableTab, string>,
    tags: {
      top3:      'Top 3',
      quickwin:  'Quick win',
      needswork: 'Needs work',
      lowctr:    'Not clicked',
    } as Record<TagId, string>,
    page1: 'Page 1', page2: 'Page 2', page3plus: 'Page 3+',
    colKeyword:     'Keyword',
    colKeywordTip:  'The exact phrase someone typed into Google. Click any row for a full breakdown.',
    colPosition:    'Position',
    colPositionTip: "Where you rank on Google and which results page that puts you on. Position 1 is the very top. The small arrow shows this month's change.",
    colClicks:      'Clicks',
    colClicksTip:   'How many times someone clicked your website from this search result last month.',
    colSeen:        'Times seen',
    colSeenTip:     'How many times your site appeared in search results for this phrase, whether clicked or not.',
    colCtr:         'Click rate',
    colCtrTip:      'What percentage of the people who saw you actually clicked through to your site.',
    colStatus:      'Status',
    colStatusTip:   'A quick label showing what the keyword needs. Hover a tag for an explanation — or click the row for the full breakdown.',
    tagTips: {
      top3:      'You are in the top 3 results, where most clicks go. Keep the page well-maintained.',
      quickwin:  'Position 4–15 — close to the top. A small improvement can bring many more visitors.',
      needswork: 'Position 21 or deeper. Needs dedicated content work to reach page 1.',
      lowctr:    'You appear on page 1 but get unusually few clicks. Usually caused by a weak page title.',
    } as Record<TagId, string>,
    emptyState:     'No keywords in this category.',
    prev: 'Prev', next: 'Next',
    // Modal
    mPosition:    'Position',
    mThisMonth:   { Weekly: 'this week', Monthly: 'this month', Yearly: 'this year' } as Record<Period, string>,
    mOnGoogle:    (page: string) => `${page} on Google`,
    mClicks:      { Weekly: 'Weekly clicks', Monthly: 'Monthly clicks', Yearly: 'Yearly clicks' } as Record<Period, string>,
    mVsLastMonth: { Weekly: 'vs last week', Monthly: 'vs last month', Yearly: 'vs last year' } as Record<Period, string>,
    mCtr:         'Click rate',
    mExpected:    (pct: string) => `Expected ${pct}%`,
    top3Text:     "This keyword is performing well. You're in the top 3 results — where over 60% of all search clicks go. Keep the page well-maintained and monitor for any position drops.",
    seenPerMonth: { Weekly: 'Times seen per week', Monthly: 'Times seen per month', Yearly: 'Times seen per year' } as Record<Period, string>,
    posThisMonth: { Weekly: 'Position this week', Monthly: 'Position this month', Yearly: 'Position this year' } as Record<Period, string>,
    unitShort:    { Weekly: 'wk', Monthly: 'mo', Yearly: 'yr' } as Record<Period, string>,
    freq:         { Weekly: 'weekly', Monthly: 'monthly', Yearly: 'yearly' } as Record<Period, string>,
    every:        { Weekly: 'every week', Monthly: 'every month', Yearly: 'every year' } as Record<Period, string>,
    spots:        (n: number) => `${n} spot${n === 1 ? '' : 's'}`,
    quickwinText: (pos: number) =>
      `You already appear near the top of Google for this search. Position #${pos} is just outside where most traffic goes — the top 3 results capture around 60% of all clicks. A relatively small improvement in ranking could bring significantly more visitors without any ad spend.`,
    estGain:      'Estimated gain if top 3',
    estGainVal:   (n: number, unit: string) => `~+${n} clicks/${unit}`,
    toClimb:      'Positions to climb',
    toClimbVal:   (n: number) => `${n} spot${n === 1 ? '' : 's'} to top 3`,
    howTo:        'How to improve it',
    tips: [
      'Make the page more thorough than what currently ranks above you — cover the topic in more depth, answer follow-up questions, and add examples.',
      'Add internal links to this page from other relevant pages on your site. Each link signals to Google that this page is important.',
      'Check that the keyword appears in the page title, the main heading, and naturally in the first paragraph.',
    ],
    needsworkText: (page: number, impressions: string, clicks: number, freq: string) =>
      `This keyword is buried on page ${page} or deeper — almost nobody scrolls that far. With ${impressions} ${freq} searches but only ${clicks} click${clicks !== 1 ? 's' : ''} reaching you, it's generating visibility but virtually no traffic. This needs a dedicated content or technical SEO effort to move onto page 1.`,
    yourClicks:   { Weekly: 'Your weekly clicks', Monthly: 'Your monthly clicks', Yearly: 'Your yearly clicks' } as Record<Period, string>,
    lowctrText:   (pos: number, expPct: string, ctrPct: string, missed: number, every: string) =>
      `You're ranking on page 1 for this term but your click rate is well below what's typical at position #${pos}. A normal click rate here would be around ${expPct}% — yours is ${ctrPct}%. That's roughly ${missed} missed click${missed !== 1 ? 's' : ''} ${every}. The most common cause is a weak page title or meta description that doesn't stand out in the search results.`,
    expClicksAt:   'Expected clicks at position',
    perMonth:      (n: number, unit: string) => `~${n}/${unit}`,
    actualClicks:  'Your actual clicks',
    actualClicksVal: (n: number, unit: string) => `${n}/${unit}`,
    missedPerMonth: { Weekly: 'Missed clicks / week', Monthly: 'Missed clicks / month', Yearly: 'Missed clicks / year' } as Record<Period, string>,
    posChange:     'Position change',
  },
}

const TAB_IDS: TableTab[] = ['all', 'top3', 'quickwins', 'needswork', 'lowctr']

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

// Positions mean little to a non-marketer — pages are how people actually think
// about Google results, so every position is shown with its page label.
function pageLabel(position: number, lang: Lang) {
  const p = Math.round(position)
  const t = T[lang]
  if (p <= 10) return t.page1
  if (p <= 20) return t.page2
  return t.page3plus
}

function getTag(q: Query, avgCTR: number): { id: TagId; color: string } | null {
  if (q.position <= 3)
    return { id: 'top3',      color: 'text-white bg-navy-600 border-navy-500'             }
  if (q.position >= 4 && q.position <= 15)
    return { id: 'quickwin',  color: 'text-green-400 bg-green-500/10 border-green-500/20' }
  if (q.position > 20)
    return { id: 'needswork', color: 'text-mustard bg-mustard/10 border-mustard/20'       }
  if (q.position <= 10 && q.impressions > 30 && q.ctr < avgCTR * 0.5)
    return { id: 'lowctr',    color: 'text-red-400 bg-red-500/10 border-red-500/20'       }
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
  display: d,
  period,
  avgCTR,
  showDelta,
  onClose,
}: {
  query:     Query
  display:   DisplayFlow
  period:    Period
  avgCTR:    number
  showDelta: boolean
  onClose:   () => void
}) {
  const { lang } = useLang()
  const t = T[lang]
  // Tag is a state metric — always derived from the original monthly values.
  const tag = getTag(q, avgCTR)
  // Flow-derived figures use the period-scaled clicks/impressions so the
  // modal's numbers match the table row that opened it.
  const { expCTR, expClicks, extra, missedClicks } = useMemo(() => {
    const expCTR    = expectedCTR(q.position)
    const expClicks = Math.round(expCTR * d.impressions)
    return {
      expCTR,
      expClicks,
      extra:        extraClicksIfTop3(q.position, d.impressions),
      missedClicks: Math.max(0, expClicks - d.clicks),
    }
  }, [q, d])
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
                {t.tags[tag.id]}
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
              label: t.mPosition,
              value: `#${Math.round(q.position)}`,
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
              value: `${(q.ctr * 100).toFixed(1)}%`,
              sub:   tag?.id === 'lowctr'
                ? <span className="text-red-400">{t.mExpected((expCTR * 100).toFixed(1))}</span>
                : null,
            },
          ] as { label: string; value: string; sub: React.ReactNode }[]).map((m, i) => (
            <div key={i} className={`px-4 py-3 ${i > 0 ? 'border-l border-navy-700' : ''}`}>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{m.label}</p>
              <p className="text-white text-xl font-bold tabular-nums">{m.value}</p>
              {m.sub && <p className="text-xs mt-0.5">{m.sub}</p>}
            </div>
          ))}
        </div>

        {/* Explanation + details */}
        <div className="p-5 space-y-4">

          {tag?.id === 'top3' && (<>
            <p className="text-slate-300 text-sm leading-relaxed">
              {t.top3Text}
            </p>
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label={t.seenPerMonth[period]} value={fmt(d.impressions)} color="text-blue-400" />
              {posDir && (
                <StatRow
                  label={t.posThisMonth[period]}
                  value={`${posDir === 'up' ? '↑' : '↓'} ${t.spots(Math.abs(q.positionChange!))}`}
                  color={posDir === 'up' ? 'text-green-400' : 'text-red-400'}
                />
              )}
            </div>
          </>)}

          {tag?.id === 'quickwin' && (<>
            <p className="text-slate-300 text-sm leading-relaxed">
              {t.quickwinText(Math.round(q.position))}
            </p>
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label={t.seenPerMonth[period]} value={fmt(d.impressions)} color="text-slate-300" />
              {extra > 0 && <StatRow label={t.estGain} value={t.estGainVal(extra, t.unitShort[period])} color="text-green-400" />}
              <StatRow
                label={t.toClimb}
                value={t.toClimbVal(Math.max(0, Math.round(q.position) - 3))}
                color="text-green-400"
              />
            </div>
            <div className="space-y-2">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{t.howTo}</p>
              <ul className="space-y-2">
                {t.tips.map((tip, i) => (
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
              {t.needsworkText(Math.ceil(q.position / 10), fmt(d.impressions), d.clicks, t.freq[period])}
            </p>
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label={t.seenPerMonth[period]} value={fmt(d.impressions)} color="text-slate-300" />
              <StatRow label={t.yourClicks[period]}   value={String(d.clicks)}       color="text-mustard"    />
              <StatRow label={t.mCtr}         value={`${(q.ctr * 100).toFixed(1)}%`} color="text-mustard" />
            </div>
          </>)}

          {tag?.id === 'lowctr' && (<>
            <p className="text-slate-300 text-sm leading-relaxed">
              {t.lowctrText(Math.round(q.position), (expCTR * 100).toFixed(1), (q.ctr * 100).toFixed(1), missedClicks, t.every[period])}
            </p>
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label={t.seenPerMonth[period]}  value={fmt(d.impressions)}            color="text-slate-300"    />
              <StatRow label={t.expClicksAt}   value={t.perMonth(expClicks, t.unitShort[period])}         color="text-green-400/80" />
              <StatRow label={t.actualClicks}  value={t.actualClicksVal(d.clicks, t.unitShort[period])}   color="text-red-400"      />
              {missedClicks > 0 && (
                <StatRow label={t.missedPerMonth[period]} value={`~${missedClicks}`} color="text-mustard" />
              )}
            </div>
          </>)}

          {!tag && (
            <div className="bg-navy-900 rounded-xl p-4 space-y-2">
              <StatRow label={t.seenPerMonth[period]} value={fmt(d.impressions)} color="text-slate-300" />
              <StatRow label={t.mCtr} value={`${(q.ctr * 100).toFixed(1)}%`} color="text-slate-300" />
              {posDir && (
                <StatRow
                  label={t.posChange}
                  value={`${posDir === 'up' ? '↑' : '↓'} ${Math.abs(q.positionChange!)} ${t.mThisMonth[period]}`}
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

/* ─── Main table — controlled filter so KPI cards can jump straight to a view ── */
export function KeywordTableTest2({
  queries,
  activeTab,
  onTabChange,
  period = 'Monthly',
}: {
  queries:     Query[]
  activeTab:   TableTab
  onTabChange: (tab: TableTab) => void
  period?:     Period
}) {
  const { lang } = useLang()
  const t = T[lang]
  const [selected, setSelected] = useState<Query | null>(null)
  const [page,     setPage]     = useState(1)

  // Per-row clicks-change is a period-over-period comparison; positions and
  // status tags are current state and stay visible regardless of coverage.
  const coverage  = useCoverage('search', period)
  const showDelta = coverage.state === 'full'

  const avgCTR = queries.length > 0
    ? queries.reduce((s, q) => s + q.ctr, 0) / queries.length
    : 0

  // Period-scaled flow figures per query, for display only. Tags, tab counts
  // and filtering below always run on the original (monthly) values.
  const flowByQuery = useMemo(
    () => new Map(queries.map((q, i) => [q, displayFlowFor(q, i, period, coverage)])),
    [queries, period, coverage],
  )

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

  function switchTab(tab: TableTab) {
    onTabChange(tab)
    setPage(1)
  }

  return (
    <>
      {selected && (
        <KeywordDetailModal
          query={selected}
          display={flowByQuery.get(selected) ?? displayFlowFor(selected, 0, period, coverage)}
          period={period}
          avgCTR={avgCTR}
          showDelta={showDelta}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex gap-1 bg-navy-900 p-1 rounded-lg w-fit flex-wrap">
          {TAB_IDS.map(id => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === id
                  ? 'bg-navy-700 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.tabs[id]}
              <span className={`ml-1.5 ${activeTab === id ? 'text-slate-400' : 'text-slate-500'}`}>
                {counts[id]}
              </span>
            </button>
          ))}
        </div>
        {/* Explains the missing change figures in the clicks column */}
        <CoverageNote coverage={coverage} period={period} />
      </div>

      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_72px_56px_76px_72px_88px] gap-3 px-4 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
              <Tooltip text={t.colKeywordTip}>
                <span className="cursor-default">{t.colKeyword}</span>
              </Tooltip>
              <Tooltip text={t.colPositionTip}>
                <span className="text-right cursor-default block">{t.colPosition}</span>
              </Tooltip>
              <Tooltip text={t.colClicksTip}>
                <span className="text-right cursor-default block">{t.colClicks}</span>
              </Tooltip>
              <Tooltip text={t.colSeenTip}>
                <span className="text-right cursor-default block">{t.colSeen}</span>
              </Tooltip>
              <Tooltip text={t.colCtrTip}>
                <span className="text-right cursor-default block">{t.colCtr}</span>
              </Tooltip>
              <Tooltip text={t.colStatusTip}>
                <span className="text-right cursor-default block">{t.colStatus}</span>
              </Tooltip>
            </div>

            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                {t.emptyState}
              </div>
            ) : (
              <div className="divide-y divide-navy-700">
                {paginated.map((q, i) => {
                  const d      = flowByQuery.get(q) ?? displayFlowFor(q, i, period, coverage)
                  const tag    = getTag(q, avgCTR)
                  const posDir =
                    q.positionChange !== undefined && q.positionChange !== 0
                      ? q.positionChange < 0 ? 'up' : 'down'
                      : null

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_72px_56px_76px_72px_88px] gap-3 px-4 py-3 items-center hover:bg-navy-700/20 transition-colors cursor-pointer"
                      onClick={() => setSelected(q)}
                    >
                      <span className="text-white text-sm truncate">{q.query}</span>

                      {/* Position + page label + MoM change */}
                      <div className="text-right">
                        <p className="text-xs leading-tight whitespace-nowrap">
                          <span className="text-slate-300 font-mono">#{Math.round(q.position)}</span>
                          {posDir && (
                            <span className={`text-xs tabular-nums ${posDir === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                              {' '}{posDir === 'up' ? '↑' : '↓'}{Math.abs(q.positionChange!)}
                            </span>
                          )}
                        </p>
                        <p className="text-slate-500 text-xs leading-tight whitespace-nowrap">{pageLabel(q.position, lang)}</p>
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
                      <span className="text-slate-300 text-xs text-right tabular-nums">{(q.ctr * 100).toFixed(1)}%</span>

                      <div className="flex justify-end">
                        {tag && (
                          <Tooltip text={t.tagTips[tag.id]}>
                            <span className={`text-xs border px-2 py-0.5 rounded-full whitespace-nowrap ${tag.color}`}>
                              {t.tags[tag.id]}
                            </span>
                          </Tooltip>
                        )}
                      </div>
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
              disabled={page === 1}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t.prev}
            </button>
            <span className="text-slate-500 text-xs tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
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
    </>
  )
}
