'use client'
import { useEffect, useState } from 'react'
import { type AdsData } from './types'
import { KeywordPerformanceList } from './KeywordsTabTest2'
import { type SelectedKeyword } from './KeywordGeneratorPanel'
import { type KeywordIdea } from '@/app/api/ads/keyword-ideas/route'
import { fmtMicros } from './helpers'
import { Tooltip } from '@/components/Tooltip'
import { useLang } from '@/components/LanguageProvider'

/*
 * The keywords tab, restricted to what Google reports.
 *
 * The three sections stay and do the same things — block a search, inspect a
 * keyword, add a suggestion to a campaign. What changed is where the numbers
 * and the judgements come from.
 *
 * The search-term panel no longer calls anything wasted. Google labels nothing
 * that way; the old rule was ours, and it had no floor, so a search with three
 * clicks and no conversion sat in the list with a Block button next to it.
 * Three clicks is not evidence — and blocking writes a real exclusion into the
 * customer's live Google Ads account. The list below it already refused to
 * judge a keyword under twenty clicks; the panel above it did not. Now both
 * use the same floor: everything Google reports is shown, but the button only
 * appears once there are enough clicks for the zero to mean something.
 *
 * The keyword list keeps every figure it had — they were Google's already —
 * minus the closing sentence, which was our diagnosis. Conversion rate now
 * comes from Google's own field rather than our division.
 *
 * The suggestions are Google's Keyword Planner ideas, seeded from the account
 * and the site, with Google's search volume, competition and top-of-page bid.
 * They used to be three phrases written into the source.
 */

/* Google's own list refuses to judge a keyword under this many clicks, and so
 * does the search-term panel now. Twenty clicks with no conversion is a
 * finding; three is a Tuesday. */
const MIN_CLICKS_TO_JUDGE = 20

const T = {
  sv: {
    termsTitle:   'Sökningar utan konverteringar',
    termsSub:     'Blockerar du en sökning slutar dina annonser visas för den. Spärren läggs in i ditt Google Ads-konto direkt.',
    termsTotal:   (spend: string) => `${spend} på sökningar som inte gett någon konvertering`,
    termsTip:     'Sökordsrapporten från Google — de faktiska sökningar som utlöst dina annonser, med kostnad och antal konverteringar per sökning.',
    clicks:       'klick',
    conversions:  'konverteringar',
    block:        'Blockera sökningen',
    blocking:     'Blockerar…',
    blocked:      'Blockerad ✓',
    failed:       'Misslyckades',
    collecting:   (n: number) => `Samlar data — ${n} klick`,
    collectTip:   `Under ${MIN_CLICKS_TO_JUDGE} klick säger noll konverteringar ingenting. Sökningen visas för att Google rapporterar den, men det finns inte underlag att stänga av den än.`,
    alreadyTitle: (n: number) => `${n} sökning${n === 1 ? '' : 'ar'} redan blockerad${n === 1 ? '' : 'e'}`,
    noTracking:   'Google rapporterar inga konverteringar för kontot',
    noTrackSub:   'Utan konverteringsmätning vet Google inte vad som händer efter klicket. Då betyder noll konverteringar bara att ingenting mäts, och det vore fel att stänga av sökningar på den grunden. Mätningen sätts upp i Google Ads.',
    perfTitle:    'Sökordens resultat',
    perfSub:      'Klicka på ett sökord för alla siffror Google rapporterar',
    gapsTitle:    'Sökord du inte bjuder på',
    gapsSub:      'Googles egna sökordsförslag för ditt konto — med sökvolym, konkurrens och vad topplaceringen brukar kosta',
    gapsLoading:  'Hämtar förslag från Google…',
    gapsEmpty:    'Google har inga förslag utöver de sökord du redan har.',
    searchesMo:   'sökningar/mån',
    competition:  'konkurrens',
    topBid:       'topplacering ca',
    perClick:     '/klick',
    add:          'Lägg till i kampanj',
  },
  en: {
    termsTitle:   'Searches with no conversions',
    termsSub:     'Blocking a search stops your ads showing for it. The exclusion is written into your Google Ads account straight away.',
    termsTotal:   (spend: string) => `${spend} on searches that produced no conversions`,
    termsTip:     'The search terms report from Google — the actual searches that triggered your ads, with cost and conversions for each.',
    clicks:       'clicks',
    conversions:  'conversions',
    block:        'Block this search',
    blocking:     'Blocking…',
    blocked:      'Blocked ✓',
    failed:       'Failed',
    collecting:   (n: number) => `Collecting data — ${n} clicks`,
    collectTip:   `Under ${MIN_CLICKS_TO_JUDGE} clicks, zero conversions says nothing. The search is listed because Google reports it, but there is not enough to switch it off yet.`,
    alreadyTitle: (n: number) => `${n} search${n === 1 ? '' : 'es'} already blocked`,
    noTracking:   'Google reports no conversions for this account',
    noTrackSub:   'Without conversion tracking Google does not know what happens after the click. Zero conversions then means only that nothing is being measured, and switching searches off on that basis would be wrong. Tracking is set up inside Google Ads.',
    perfTitle:    'Keyword performance',
    perfSub:      'Click any keyword for every figure Google reports',
    gapsTitle:    'Keywords you’re not bidding on',
    gapsSub:      'Google’s own keyword ideas for your account — with search volume, competition and what the top spot usually costs',
    gapsLoading:  'Fetching suggestions from Google…',
    gapsEmpty:    'Google has no suggestions beyond the keywords you already have.',
    searchesMo:   'searches/mo',
    competition:  'competition',
    topBid:       'top spot approx.',
    perClick:     '/click',
    add:          'Add to campaign',
  },
}

const COMP_LABEL: Record<'sv' | 'en', Record<'LOW' | 'MEDIUM' | 'HIGH', string>> = {
  sv: { LOW: 'låg', MEDIUM: 'medel', HIGH: 'hög' },
  en: { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' },
}

/* ── Search terms Google reports no conversions for ────────────────────────── */

function SearchTermsGoogle({ data }: { data: AdsData }) {
  const { lang } = useLang()
  const t = T[lang]

  const [blocking, setBlocking] = useState<Set<string>>(new Set())
  const [blocked,  setBlocked]  = useState<Set<string>>(new Set())
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  /* Selected from Google's own numbers: cost above zero, conversions at zero.
   * No threshold of ours decides who is on the list — only who gets a button. */
  const terms = data.searchTerms
    .filter(s => s.conversions === 0 && s.spendMicros > 0)
    .sort((a, b) => b.spendMicros - a.spendMicros)

  if (data.totalConversions === 0) {
    return (
      <div className="bg-navy-800 rounded-xl border border-navy-600 px-4 py-3 flex items-start gap-3">
        <span className="text-slate-400 shrink-0 mt-0.5">●</span>
        <div>
          <p className="text-sm text-slate-300">{t.noTracking}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.noTrackSub}</p>
        </div>
      </div>
    )
  }

  if (terms.length === 0) return null

  const total = terms.reduce((s, x) => s + x.spendMicros, 0)

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
      if (!res.ok) throw new Error(json.error ?? t.failed)
      setBlocked(s => new Set(s).add(query))
    } catch (err) {
      setErrors(e => ({ ...e, [query]: err instanceof Error ? err.message : t.failed }))
    } finally {
      setBlocking(s => { const n = new Set(s); n.delete(query); return n })
    }
  }

  return (
    <div id="search-terms-google" className="scroll-mt-6">
      <div className="flex items-baseline gap-2 mb-3 flex-wrap">
        <h2 className="text-sm font-semibold text-white">{t.termsTitle}</h2>
        <span className="text-xs text-slate-500">{t.termsSub}</span>
      </div>

      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-navy-700 bg-navy-900/40">
          <Tooltip text={t.termsTip}>
            <p className="text-sm text-slate-300 cursor-default">
              <span className="text-mustard font-bold">{fmtMicros(total, data.currency)}</span>{' '}
              {t.termsTotal('').trim()}
            </p>
          </Tooltip>
        </div>

        <div className="divide-y divide-navy-700/40">
          {terms.map((s, i) => {
            const isBlocked  = blocked.has(s.query)
            const isBlocking = blocking.has(s.query)
            const conclusive = s.clicks >= MIN_CLICKS_TO_JUDGE
            return (
              <div key={i} className={`px-4 py-3 flex items-center gap-4 ${isBlocked ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-white truncate ${isBlocked ? 'line-through' : ''}`}>
                    &ldquo;{s.query}&rdquo;
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.clicks} {t.clicks} · {fmtMicros(s.spendMicros, data.currency)} · 0 {t.conversions}
                  </p>
                  {errors[s.query] && <p className="text-xs text-red-400 mt-1">{errors[s.query]}</p>}
                </div>

                {isBlocked ? (
                  <span className="shrink-0 text-xs text-green-400 font-medium">{t.blocked}</span>
                ) : conclusive ? (
                  <button
                    onClick={() => blockTerm(s.query)}
                    disabled={isBlocking}
                    className="shrink-0 text-xs font-semibold text-slate-200 bg-navy-700 hover:bg-navy-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {isBlocking ? t.blocking : t.block}
                  </button>
                ) : (
                  <Tooltip text={t.collectTip}>
                    <span className="shrink-0 text-xs text-slate-600 cursor-default">{t.collecting(s.clicks)}</span>
                  </Tooltip>
                )}
              </div>
            )
          })}
        </div>

        {data.negativeKeywords.length > 0 && (
          <div className="px-4 py-2.5 border-t border-navy-700 bg-navy-900/40">
            <p className="text-xs text-slate-600">{t.alreadyTitle(data.negativeKeywords.length)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Google's own keyword ideas ────────────────────────────────────────────── */

function KeywordIdeasGoogle({
  data,
  onAddToCampaign,
}: {
  data:            AdsData
  onAddToCampaign: (keywords: SelectedKeyword[]) => void
}) {
  const { lang } = useLang()
  const t = T[lang]
  const [ideas, setIdeas] = useState<KeywordIdea[] | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/ads/keyword-ideas')
      .then(r => r.json())
      .then(j => { if (alive) setIdeas(j.ideas ?? []) })
      .catch(() => { if (alive) setIdeas([]) })
    return () => { alive = false }
  }, [])

  /* Anything already in the account is not a gap. Plain matching on Google's
   * own keyword text — no scoring, no ranking of ours. */
  const owned = new Set(data.keywords.map(k => k.keyword.toLowerCase()))
  const gaps  = (ideas ?? []).filter(i => !owned.has(i.keyword.toLowerCase())).slice(0, 6)

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3 flex-wrap">
        <h2 className="text-sm font-semibold text-white">{t.gapsTitle}</h2>
        <span className="text-xs text-slate-500">{t.gapsSub}</span>
      </div>

      {ideas === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-4">
              <div className="h-4 w-1/3 bg-navy-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-2/3 bg-navy-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : gaps.length === 0 ? (
        <p className="text-slate-500 text-sm">{t.gapsEmpty}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {gaps.map((k, i) => (
            <div key={i} className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{k.keyword}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {k.avgVolume.toLocaleString('sv-SE')} {t.searchesMo}
                  {' · '}{t.competition} {COMP_LABEL[lang][k.competition]}
                  {k.topOfPageBidMicros > 0 && (
                    <> · {t.topBid} {fmtMicros(k.topOfPageBidMicros, data.currency)}{t.perClick}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => onAddToCampaign([{
                  text:      k.keyword,
                  matchType: 'Exact',
                  cpcMicros: k.topOfPageBidMicros,
                }])}
                className="shrink-0 text-xs font-semibold text-mustard border border-mustard/25 bg-mustard/8 hover:bg-mustard/15 px-3 py-1.5 rounded-lg transition-colors"
              >
                {t.add}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── The tab ───────────────────────────────────────────────────────────────── */

export function KeywordsTabGoogle({
  data,
  onAddToCampaign,
}: {
  data:            AdsData
  onAddToCampaign: (keywords: SelectedKeyword[]) => void
}) {
  const { lang } = useLang()
  const t = T[lang]

  return (
    <div className="space-y-8">
      <SearchTermsGoogle data={data} />

      <div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-white">{t.perfTitle}</h2>
          <span className="text-xs text-slate-500">{t.perfSub}</span>
        </div>
        <KeywordPerformanceList
          keywords={data.keywords}
          campaigns={data.campaigns}
          currency={data.currency}
          showDiagnosis={false}
        />
      </div>

      <KeywordIdeasGoogle data={data} onAddToCampaign={onAddToCampaign} />
    </div>
  )
}
