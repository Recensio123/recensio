'use client'
import { useState } from 'react'
import { type AdsData, type AdsKeyword, type AdsCampaign, type QualityScoreComponent, type KeywordStatus } from './types'
import { fmtMicros } from './helpers'
import { type SelectedKeyword } from './KeywordGeneratorPanel'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'

// Minimum clicks before we draw any conclusion about a keyword's performance.
// Below this, there simply isn't enough data — flag it as "Testing", not broken.
const MIN_CLICKS_TO_JUDGE = 20

// Tooltip texts for labels and badges a rookie could misread
const T: Record<string, { sv: string; en: string }> = {
  colKeyword: {
    sv: 'Orden du betalar för att synas på. Grön prick betyder att sökordet ger kunder, grå att det fortfarande testas, röd att det kostar utan resultat.',
    en: 'The words you pay to show up for. A green dot means the keyword brings customers, grey that it is still testing, red that it costs without results.',
  },
  colSpend: {
    sv: 'Vad sökordet kostat denna månad. Listan sorteras på kostnad — de dyraste ligger överst.',
    en: 'What the keyword has cost this month. The list is sorted by spend — the most expensive sit at the top.',
  },
  colResults: {
    sv: 'Vad kostnaden gav: antal kunder och pris per kund, eller en varning när pengarna inte gett något tillbaka.',
    en: 'What the spend produced: number of customers and cost per customer, or a warning when the money returned nothing.',
  },
  matchType: {
    sv: 'Matchningstypen styr hur brett sökordet fångar sökningar. Exakt visas bara vid nästan identiska sökningar — fras och bred fångar fler varianter.',
    en: 'The match type controls how broadly the keyword catches searches. Exact only shows for near-identical searches — phrase and broad catch more variations.',
  },
  filterActive: {
    sv: 'Sökord som bjuder på visningar just nu och kan kosta pengar.',
    en: 'Keywords currently bidding for impressions and able to spend money.',
  },
  filterPaused: {
    sv: 'Sökord som ligger kvar i kontot men inte visas och inte kostar något.',
    en: 'Keywords still in the account but not showing and not spending anything.',
  },
  wastedTotal: {
    sv: 'Sökningar där dina annonser fått klick utan att en enda person blev kund. Blockera dem så går budgeten till sökningar som fungerar.',
    en: 'Searches where your ads got clicks without a single person becoming a customer. Block them so the budget goes to searches that work.',
  },
  gapStats: {
    sv: 'Ungefär hur många som söker på detta per månad och vad ett klick väntas kosta.',
    en: 'Roughly how many people search for this per month and what one click is expected to cost.',
  },
}

/* ── Keyword expand panel ──────────────────────────────────────────────────── */

const QS_LABELS: Record<QualityScoreComponent, { sv: string; en: string; color: string; dot: string }> = {
  above_average: { sv: 'Över genomsnittet',  en: 'Above average',   color: 'text-green-400',  dot: 'bg-green-400'  },
  average:       { sv: 'Genomsnitt',         en: 'Average',         color: 'text-yellow-400', dot: 'bg-yellow-400' },
  below_average: { sv: 'Under genomsnittet', en: 'Below average',   color: 'text-red-400',    dot: 'bg-red-400'    },
  unknown:       { sv: 'För lite data',      en: 'Not enough data', color: 'text-slate-500',  dot: 'bg-slate-600'  },
}

function QsRow({
  label,
  value,
  hint,
}: {
  label: string
  value: QualityScoreComponent
  hint:  string
}) {
  const { lang } = useLang()
  const v = QS_LABELS[value]
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-navy-700/40 last:border-0">
      <div>
        <p className="text-xs font-medium text-white">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-tight">{hint}</p>
      </div>
      <span className={`flex items-center gap-1.5 text-xs font-semibold shrink-0 mt-0.5 ${v.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${v.dot}`} />
        {lang === 'sv' ? v.sv : v.en}
      </span>
    </div>
  )
}

function KeywordDetail({
  k,
  currency,
  campaign,
}: {
  k:        AdsKeyword
  currency: string
  campaign: AdsCampaign | undefined
}) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const convRate = k.clicks > 0 ? (k.conversions / k.clicks) * 100 : 0
  const qs       = k.qualityScore
  const hasQsSub = k.expectedCtr || k.adRelevance || k.landingPageExp

  const isTesting = k.conversions === 0 && k.clicks < MIN_CLICKS_TO_JUDGE

  // One-line diagnosis — withheld until there's enough data to mean something
  let diagnosis: { text: string; tone: 'warn' | 'good' | 'neutral' } | null = null
  if (isTesting) {
    diagnosis = {
      text: sv
        ? `Bara ${k.clicks} klick hittills — för lite data för att dra några slutsatser. Låt det rulla ett tag till innan du ändrar något.`
        : `Only ${k.clicks} click${k.clicks !== 1 ? 's' : ''} so far — not enough data to draw any conclusions. Let it run a bit longer before making changes.`,
      tone: 'neutral',
    }
  } else if (k.conversions === 0 && k.clicks >= MIN_CLICKS_TO_JUDGE && k.impressions >= 200 && k.ctr < 0.02) {
    diagnosis = {
      text: sv
        ? 'Få som ser annonsen klickar på den — annonstexten kanske inte matchar det folk söker efter.'
        : 'Few people who see this ad are clicking — the ad copy may not match what they\'re searching for.',
      tone: 'warn',
    }
  } else if (k.conversions === 0 && k.clicks >= MIN_CLICKS_TO_JUDGE && qs !== undefined && qs <= 4) {
    diagnosis = {
      text: sv
        ? `Google ger sökordet ${qs}/10 — ett lågt betyg höjer din kostnad per klick och gör att annonsen visas mer sällan.`
        : `Google rates this keyword ${qs}/10 — a low score increases your cost per click and limits how often the ad appears.`,
      tone: 'warn',
    }
  } else if (k.conversions === 0 && k.clicks >= MIN_CLICKS_TO_JUDGE) {
    diagnosis = {
      text: sv
        ? 'Folk klickar men ingen blir kund — kolla att sidan de landar på matchar det sökordet lovar.'
        : 'People are clicking but nothing converts — check that the landing page matches what this keyword promises.',
      tone: 'warn',
    }
  } else if (k.conversions > 0 && qs !== undefined && qs >= 7) {
    diagnosis = {
      text: sv
        ? `Google ger sökordet ${qs}/10 — ett högt betyg håller klickkostnaden nere och ger annonsen bättre placering.`
        : `Google rates this keyword ${qs}/10 — a high score keeps click costs lower and improves ad placement.`,
      tone: 'good',
    }
  } else if (k.conversions > 0) {
    diagnosis = {
      text: sv
        ? `Konverterar till ${convRate.toFixed(1)}% — ${convRate >= 5 ? 'ett starkt resultat för ett sökord.' : 'det finns utrymme att förbättra landningssidan så fler klick blir kunder.'}`
        : `Converting at ${convRate.toFixed(1)}% — ${convRate >= 5 ? 'strong result for a search keyword.' : 'there\'s room to improve the landing page to turn more clicks into customers.'}`,
      tone: convRate >= 5 ? 'good' : 'neutral',
    }
  }

  const statCols: { label: string; value: string; sub?: string }[] = [
    {
      label: sv ? 'Visningar' : 'Times shown',
      value: k.impressions.toLocaleString('sv-SE'),
      sub:   sv ? 'Gånger annonsen visades' : 'Ad impressions',
    },
    {
      label: sv ? 'Klickfrekvens' : 'Click rate',
      value: k.impressions > 0 ? (k.ctr * 100).toFixed(1) + '%' : '—',
      sub:   sv ? 'Av de som såg annonsen' : 'Of those who saw the ad',
    },
    {
      label: sv ? 'Snittkostnad per klick' : 'Avg cost / click',
      value: fmtMicros(k.avgCpcMicros, currency),
      sub:   sv ? 'Vad du betalade per klick' : 'What you paid per click',
    },
    ...(k.conversions > 0
      ? [{
          label: sv ? 'Konverteringsgrad' : 'Conversion rate',
          value: k.clicks > 0 ? convRate.toFixed(1) + '%' : '—',
          sub:   sv ? 'Klick som blev kunder' : 'Clicks that became customers',
        }]
      : [{
          label: sv ? 'Kvalitetspoäng' : 'Quality score',
          value: qs !== undefined ? `${qs} / 10` : '—',
          sub:   qs === undefined
            ? (sv ? 'För lite data' : 'Not enough data')
            : qs >= 7
              ? (sv ? 'Bra — lägre klickkostnad' : 'Good — lower click costs')
              : qs >= 5
                ? (sv ? 'Genomsnitt' : 'Average')
                : (sv ? 'Lågt — höjer din klickkostnad' : 'Low — raises your click costs'),
        }]
    ),
  ]

  return (
    <div className="px-4 pb-4 pt-1 bg-navy-900/40 border-b border-navy-700/40">
      <div className="rounded-xl border border-navy-700 bg-navy-900/60 overflow-hidden">

        {/* Top 4 stats */}
        <div className="grid divide-x divide-navy-700/50" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {statCols.map((s, i) => (
            <div key={i} className="px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-base font-bold text-white tabular-nums leading-none">{s.value}</p>
              {s.sub && <p className="text-xs text-slate-500 mt-1 leading-tight">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Quality score breakdown */}
        {hasQsSub && (
          <div className="border-t border-navy-700/50">
            <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {sv
                  ? `Därför ger Google sökordet ${qs !== undefined ? `${qs}/10` : 'sitt betyg'}`
                  : `Why Google rates this keyword ${qs !== undefined ? `${qs}/10` : ''}`}
              </p>
              {qs !== undefined && (
                <span className={`text-sm font-bold tabular-nums ${
                  qs >= 7 ? 'text-green-400' : qs >= 5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {qs} / 10
                </span>
              )}
            </div>
            <div className="px-4 pb-1">
              {k.expectedCtr && (
                <QsRow
                  label={sv ? 'Kommer folk klicka på din annons?' : 'Will people click your ad?'}
                  value={k.expectedCtr}
                  hint={sv
                    ? 'Googles bedömning av hur ofta folk klickar på din annons jämfört med konkurrenter som visas för samma sökning.'
                    : "Google's prediction of how often people click your ad vs competitors showing up for the same search."}
                />
              )}
              {k.adRelevance && (
                <QsRow
                  label={sv ? 'Matchar din annons sökningen?' : 'Does your ad match the search?'}
                  value={k.adRelevance}
                  hint={sv
                    ? 'Hur väl din annonstext matchar det någon skrev in på Google. Dålig matchning höjer kostnaden.'
                    : 'How closely your ad copy matches what someone typed into Google. Mismatches push up costs.'}
                />
              )}
              {k.landingPageExp && (
                <QsRow
                  label={sv ? 'Är din landningssida relevant?' : 'Is your landing page relevant?'}
                  value={k.landingPageExp}
                  hint={sv
                    ? 'Hur användbar och relevant Google tycker att sidan är som folk landar på efter klicket. Irrelevanta sidor sänker betyget.'
                    : 'How useful and relevant Google considers the page people land on after clicking. Irrelevant pages lower your score.'}
                />
              )}
            </div>
          </div>
        )}

        {/* Campaign + diagnosis */}
        <div className="px-4 py-3 border-t border-navy-700/50 flex items-start justify-between gap-6">
          {campaign && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              {sv ? 'Kampanj:' : 'Campaign:'} <span className="text-slate-300 font-medium ml-0.5">{campaign.name}</span>
            </span>
          )}
          {diagnosis && (
            <p className={`text-xs leading-relaxed shrink-0 max-w-sm ${campaign ? 'text-right' : ''} ${
              diagnosis.tone === 'warn'  ? 'text-yellow-400/80' :
              diagnosis.tone === 'good'  ? 'text-green-400/80'  :
                                           'text-slate-400'
            }`}>
              {diagnosis.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Keyword performance list ──────────────────────────────────────────────── */

const PAGE_SIZE = 10

type KwFilter = KeywordStatus

function KeywordPerformanceList({
  keywords,
  campaigns,
  currency,
}: {
  keywords:  AdsKeyword[]
  campaigns: AdsCampaign[]
  currency:  string
}) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filter,   setFilter]   = useState<KwFilter>('Active')
  const [page,     setPage]     = useState(1)

  const activeCount = keywords.filter(k => (k.status ?? 'Active') === 'Active').length
  const pausedCount = keywords.filter(k => (k.status ?? 'Active') === 'Paused').length

  const filtered = [...keywords]
    .filter(k => (k.status ?? 'Active') === filter)
    .sort((a, b) => b.spendMicros - a.spendMicros)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function switchFilter(f: KwFilter) {
    setFilter(f)
    setPage(1)
    setExpanded(null)
  }

  function switchPage(p: number) {
    setPage(p)
    setExpanded(null)
  }

  return (
    <div className="space-y-3">
      {/* Filter toggle */}
      <div className="flex items-center gap-1.5">
        {(['Active', 'Paused'] as KwFilter[]).map(f => {
          const count = f === 'Active' ? activeCount : pausedCount
          const active = filter === f
          const label = sv ? (f === 'Active' ? 'Aktiva' : 'Pausade') : f
          const tip   = f === 'Active' ? T.filterActive : T.filterPaused
          return (
            <Tooltip key={f} text={sv ? tip.sv : tip.en}>
            <button
              onClick={() => switchFilter(f)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                active
                  ? 'bg-navy-700 border-navy-600 text-white'
                  : 'bg-transparent border-navy-700/50 text-slate-500 hover:text-slate-300 hover:border-navy-600'
              }`}
            >
              {label}
              <span className={`text-xs px-1 py-0.5 rounded font-semibold tabular-nums ${
                active ? 'bg-navy-600 text-slate-300' : 'bg-navy-800 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
            </Tooltip>
          )
        })}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">

            {/* Column headers */}
            <div className="grid px-4 py-2.5 border-b border-navy-700 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                 style={{ gridTemplateColumns: '1fr 130px 200px 24px' }}>
              <Tooltip text={sv ? T.colKeyword.sv : T.colKeyword.en}>
                <span className="cursor-default">{sv ? 'Sökord' : 'Keyword'}</span>
              </Tooltip>
              <Tooltip text={sv ? T.colSpend.sv : T.colSpend.en}>
                <span className="text-right cursor-default">{sv ? 'Annonskostnad' : 'Ad spend'}</span>
              </Tooltip>
              <Tooltip text={sv ? T.colResults.sv : T.colResults.en}>
                <span className="text-right cursor-default">{sv ? 'Resultat' : 'Results'}</span>
              </Tooltip>
              <span />
            </div>

            {paginated.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-slate-500 text-sm">
                  {sv
                    ? `Inga ${filter === 'Active' ? 'aktiva' : 'pausade'} sökord hittades.`
                    : `No ${filter.toLowerCase()} keywords found.`}
                </p>
              </div>
            ) : paginated.map((k, i) => {
              const globalIdx = (page - 1) * PAGE_SIZE + i
              const good      = k.conversions > 0
              const isTesting = !good && k.clicks < MIN_CLICKS_TO_JUDGE
              const cpl       = good ? fmtMicros(k.spendMicros / k.conversions, currency) : null
              const isOpen    = expanded === globalIdx
              const camp      = campaigns.find(c => c.campaignId === k.campaignId)

              return (
                <div key={globalIdx} className="border-b border-navy-700/40 last:border-0">

                  {/* Main row — click to expand */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : globalIdx)}
                    className="w-full text-left hover:bg-navy-700/20 transition-colors"
                  >
                    <div className="grid items-center px-4 py-3.5"
                         style={{ gridTemplateColumns: '1fr 130px 200px 24px' }}>

                      {/* Keyword + match type */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${good ? 'bg-green-400' : isTesting ? 'bg-slate-500' : 'bg-red-500/60'}`} />
                        <span className="text-sm font-medium text-white truncate">{k.keyword}</span>
                        <Tooltip text={sv ? T.matchType.sv : T.matchType.en}>
                          <span className="text-xs text-slate-500 bg-navy-700 border border-navy-600 px-1.5 py-0.5 rounded shrink-0 cursor-default">
                            {k.matchType}
                          </span>
                        </Tooltip>
                      </div>

                      {/* Spend */}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white tabular-nums">
                          {fmtMicros(k.spendMicros, currency)}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                          {k.clicks} {sv ? 'klick' : `click${k.clicks !== 1 ? 's' : ''}`}
                        </p>
                      </div>

                      {/* Results */}
                      <div className="text-right">
                        {good ? (
                          <>
                            <p className="text-sm font-bold text-green-400 tabular-nums">
                              {k.conversions} {sv ? (k.conversions !== 1 ? 'kunder' : 'kund') : `customer${k.conversions !== 1 ? 's' : ''}`}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                              {cpl} {sv ? 'per kund' : 'per customer'}
                            </p>
                          </>
                        ) : isTesting ? (
                          <>
                            <p className="text-sm font-medium text-slate-500">{sv ? 'Testas' : 'Testing'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {sv
                                ? `${k.clicks} klick — samlar data`
                                : `${k.clicks} click${k.clicks !== 1 ? 's' : ''} — collecting data`}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-red-400/80">{sv ? 'Inga resultat' : 'No results'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {fmtMicros(k.spendMicros, currency)} {sv ? 'utan utdelning' : 'with no return'}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Chevron */}
                      <div className="flex justify-end">
                        <svg
                          className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expand panel */}
                  {isOpen && (
                    <KeywordDetail k={k} currency={currency} campaign={camp} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => switchPage(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg border border-navy-700 hover:border-navy-600 disabled:border-navy-700/30"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {sv ? 'Föregående' : 'Previous'}
          </button>
          <span className="text-xs text-slate-500 tabular-nums">
            {sv ? `Sida ${page} av ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          <button
            onClick={() => switchPage(page + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg border border-navy-700 hover:border-navy-600 disabled:border-navy-700/30"
          >
            {sv ? 'Nästa' : 'Next'}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Searches wasting your budget — one-click blocking ─────────────────────── */

function WastedSearches({ data }: { data: AdsData }) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const [blocking,     setBlocking]     = useState<Set<string>>(new Set())
  const [blocked,      setBlocked]      = useState<Set<string>>(new Set())
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [showBlocked,  setShowBlocked]  = useState(false)

  const failedMsg = sv ? 'Misslyckades' : 'Failed'

  const wastedTerms = data.searchTerms.filter(t => t.isWasted).sort((a, b) => b.spendMicros - a.spendMicros)
  if (wastedTerms.length === 0) return null

  const totalWasted = wastedTerms.reduce((s, t) => s + t.spendMicros, 0)

  async function blockTerm(query: string) {
    setBlocking(s => new Set(s).add(query))
    setErrors(e => ({ ...e, [query]: '' }))
    try {
      const res  = await fetch('/api/ads/add-negative', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: query, matchType: 'BROAD' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? failedMsg)
      setBlocked(s => new Set(s).add(query))
    } catch (err) {
      setErrors(e => ({ ...e, [query]: err instanceof Error ? err.message : failedMsg }))
    } finally {
      setBlocking(s => { const n = new Set(s); n.delete(query); return n })
    }
  }

  return (
    <div id="wasted-searches-t2" className="scroll-mt-6">
      <div className="flex items-baseline gap-2 mb-3 flex-wrap">
        <h2 className="text-sm font-semibold text-white">
          {sv ? 'Sökningar som kostar pengar utan att ge kunder' : 'Searches costing you money with no customers'}
        </h2>
        <span className="text-xs text-slate-500">
          {sv
            ? 'När du blockerar en sökning slutar dina annonser visas för den — budgeten går till sökningar som ger kunder'
            : 'Blocking a search stops your ads showing for it — the budget goes to searches that convert'}
        </span>
      </div>

      <div className="bg-navy-800 rounded-xl border border-red-500/20 overflow-hidden">
        {/* Total */}
        <div className="px-4 py-3 border-b border-navy-700 bg-red-500/5 flex items-center justify-between">
          <Tooltip text={sv ? T.wastedTotal.sv : T.wastedTotal.en}>
            <p className="text-sm text-slate-300 cursor-default">
              {sv ? (
                <><span className="text-red-400 font-bold">{fmtMicros(totalWasted, data.currency)}</span> spenderat på dessa sökningar denna månad — noll kunder</>
              ) : (
                <><span className="text-red-400 font-bold">{fmtMicros(totalWasted, data.currency)}</span> spent on these searches this month — zero customers</>
              )}
            </p>
          </Tooltip>
        </div>

        <div className="divide-y divide-navy-700/40">
          {wastedTerms.map((t, i) => {
            const isBlocked  = blocked.has(t.query)
            const isBlocking = blocking.has(t.query)
            return (
              <div key={i} className={`px-4 py-3 flex items-center gap-4 ${isBlocked ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-white truncate ${isBlocked ? 'line-through' : ''}`}>&ldquo;{t.query}&rdquo;</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sv
                      ? `${t.clicks} klick · ${fmtMicros(t.spendMicros, data.currency)} spenderat · 0 kunder`
                      : `${t.clicks} click${t.clicks !== 1 ? 's' : ''} · ${fmtMicros(t.spendMicros, data.currency)} spent · 0 customers`}
                  </p>
                  {errors[t.query] && <p className="text-red-400 text-xs mt-0.5">{errors[t.query]}</p>}
                </div>
                {isBlocked ? (
                  <span className="shrink-0 text-xs text-green-400 font-medium">{sv ? 'Blockerad ✓' : 'Blocked ✓'}</span>
                ) : (
                  <button
                    onClick={() => blockTerm(t.query)}
                    disabled={isBlocking}
                    className="shrink-0 text-xs font-semibold text-red-400 border border-red-500/25 bg-red-500/8 hover:bg-red-500/15 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {isBlocking
                      ? (sv ? 'Blockerar…' : 'Blocking…')
                      : (sv ? 'Blockera sökningen' : 'Block this search')}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Already blocked — collapsed */}
        {data.negativeKeywords.length > 0 && (
          <div className="border-t border-navy-700">
            <button
              onClick={() => setShowBlocked(v => !v)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span>
                {sv
                  ? `${data.negativeKeywords.length} sökning${data.negativeKeywords.length !== 1 ? 'ar' : ''} redan blockerad${data.negativeKeywords.length !== 1 ? 'e' : ''}`
                  : `${data.negativeKeywords.length} search${data.negativeKeywords.length !== 1 ? 'es' : ''} already blocked`}
              </span>
              <svg className={`w-3.5 h-3.5 transition-transform ${showBlocked ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showBlocked && (
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {data.negativeKeywords.map((kw, i) => (
                  <span key={i} className="text-xs text-slate-500 bg-navy-700 border border-navy-600 px-2 py-0.5 rounded-lg">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main tab ──────────────────────────────────────────────────────────────── */

type Props = {
  data:            AdsData
  onAddToCampaign: (keywords: SelectedKeyword[]) => void
}

export function KeywordsTabTest2({ data, onAddToCampaign }: Props) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const gaps = data.recommendedKeywords

  return (
    <div className="space-y-8">

      {/* ── 1. Searches wasting money — the highest-return action first ──── */}
      <WastedSearches data={data} />

      {/* ── 2. Keyword performance ───────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-white">{sv ? 'Sökordens resultat' : 'Keyword performance'}</h2>
          <span className="text-xs text-slate-500">
            {sv ? 'Klicka på ett sökord för fler detaljer' : 'Click any keyword for a deeper breakdown'}
          </span>
        </div>
        <KeywordPerformanceList
          keywords={data.keywords}
          campaigns={data.campaigns}
          currency={data.currency}
        />
      </div>

      {/* ── 3. Keyword gaps ─────────────────────────────────────────────── */}
      {gaps.length > 0 && (
        <div>
          <div className="flex items-baseline gap-2 mb-3 flex-wrap">
            <h2 className="text-sm font-semibold text-white">
              {sv ? 'Sökord du inte bjuder på' : 'Keywords you’re not bidding on'}
            </h2>
            <span className="text-xs text-slate-500">
              {sv
                ? 'Sökningar med hög köpvilja kopplade till dina tjänster — finns inte i ditt konto ännu'
                : 'High-intent searches related to your services — not yet in your account'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gaps.map((k, i) => (
              <div key={i} className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{k.keyword}</p>
                  <Tooltip text={sv ? T.gapStats.sv : T.gapStats.en}>
                    <p className="text-slate-500 text-xs mt-1 cursor-default">
                      {sv
                        ? `${k.impressionsPerMonth.toLocaleString('sv-SE')} sökningar/månad · ca ${fmtMicros(k.avgCpcMicros, data.currency)}/klick`
                        : `${k.impressionsPerMonth.toLocaleString('sv-SE')} searches/month · est. ${fmtMicros(k.avgCpcMicros, data.currency)}/click`}
                    </p>
                  </Tooltip>
                </div>
                <button
                  onClick={() => onAddToCampaign([{
                    text:      k.keyword,
                    matchType: 'Exact',
                    cpcMicros: k.avgCpcMicros,
                  }])}
                  className="shrink-0 text-xs font-semibold text-mustard border border-mustard/25 bg-mustard/8 hover:bg-mustard/15 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {sv ? 'Lägg till i kampanj' : 'Add to campaign'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
