'use client'
import { useState } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang } from '@/components/LanguageProvider'
import { type AnalyticsData, type PageData } from './types'
import { Sparkline } from './charts'
import { expectedCTR, fmtDuration } from './helpers'

type VisibilityTier = { label: string; count: number; color: string }

// ── Flag detail types ─────────────────────────────────────────────────────────
type FlagInfo = {
  page:      PageData
  flags: {
    id:       'notclicked' | 'losing' | 'demand' | 'competing'
    label:    string
    color:    string
    what:     string
    numbers:  { label: string; value: string; color?: string }[]
    fix:      string
  }[]
}

const FLAG_STYLE: Record<string, string> = {
  notclicked: 'text-red-400    bg-red-500/10    border-red-500/20',
  losing:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
  demand:     'text-blue-400   bg-blue-500/10   border-blue-500/20',
  competing:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
}

const T = {
  sv: {
    topSearch:        'Toppsökning:',
    howToFix:         'Så fixar du det:',
    flagNotClicked:   'Setts men inte klickats',
    flagLosing:       'Tappar besökare',
    flagDemand:       'Hög efterfrågan',
    flagCompeting:    'Två sidor konkurrerar',
    flagNotClickedTip: 'Sidan syns i Google men får färre klick än normalt. Klicka på raden för att se varför och vad du kan göra.',
    flagLosingTip:    'Sidan har tappat besökare de senaste månaderna. Klicka på raden för siffror och åtgärd.',
    flagDemandTip:    'Många söker på ämnet men sidan syns inte på sida 1 än. Klicka på raden för siffror och åtgärd.',
    flagCompetingTip: 'Två av dina sidor tävlar om samma sökning och sänker varandra. Klicka på raden för detaljer.',
    // Flag modal content
    notClickedWhat:   (pos: number) => `Den här sidan syns på sida 1 på Google, men mycket färre klickar på den än vad som är normalt på plats #${pos}. Vanligaste orsaken är en sidtitel eller beskrivning som inte sticker ut i sökresultaten.`,
    nSeenPerMonth:    'Visningar per månad',
    nNormalCtr:       'Normal klickfrekvens här',
    nYourCtr:         'Din klickfrekvens',
    nMissedClicks:    'Missade klick / månad',
    notClickedFix:    'Skriv om sidtiteln och metabeskrivningen så att de sticker ut — nämn din tjänst, din stad och något som skiljer dig från andra (samma dag-service, fasta priser). Du ändrar detta i din hemsideredigerare eller i SEO-inställningarna.',
    losingWhat:       (drop: number) => `Trafiken till den här sidan har minskat ${drop} % de senaste månaderna. Sidor tappar mark över tid när konkurrenter publicerar färskare innehåll — Google gynnar sidor som hålls uppdaterade.`,
    nTrafficDrop:     'Trafiktapp',
    nVisits30:        'Besök senaste 30 dagarna',
    losingFix:        'Fräscha upp sidan: uppdatera priser och datum, lägg till ett aktuellt exempel eller foton och bygg ut tunna avsnitt. Även små uppdateringar visar Google att sidan sköts om.',
    demandWhat:       (n: string) => `Folk söker på det här ämnet ${n} gånger i månaden, men sidan är inte på sida 1 än — så nästan inget av det når dig. Det här är din största outnyttjade sida.`,
    nSearchesPerMo:   'Sökningar per månad',
    nCurrentPos:      'Nuvarande plats',
    notRanked:        'Inte rankad',
    demandFix:        'Gör sidan till det bästa svaret på sökningen: täck ämnet grundligare än konkurrenterna, nämn din stad på ett naturligt sätt och länka till sidan från dina andra sidor.',
    competingWhat:    (n: number, kw: string, paths: string) => `${n} av dina sidor siktar på samma sökning ("${kw}"): ${paths}. När dina egna sidor konkurrerar delar Google upp rankingen mellan dem och båda hamnar lägre.`,
    competingFix:     'Välj den starkaste sidan som huvudsida och slå antingen ihop de andra med den, eller rikta om dem mot en annan, mer specifik sökning. En tydlig sida slår två som konkurrerar.',
    // KPI cards
    kPagesTracked:    'Spårade sidor',
    kPagesTrackedTip: 'Antal sidor på din hemsida som Google känner till och som följs här.',
    kInGoogle:        'i Google',
    kOnPage1:         'På sida 1',
    kOnPage1Tip:      'Hur många av dina sidor som visas bland de tio första resultaten på Google. Där sker nästan alla klick.',
    kPositions:       'plats 1–10',
    kAvgPosition:     'Snittplacering',
    kAvgPositionTip:  'Genomsnittlig plats i Googles sökresultat över alla dina sidor. Lägre siffra är bättre.',
    kAcrossAll:       'över alla sidor',
    kTimesSeen:       'Visningar',
    kTimesSeenTip:    'Hur många gånger dina sidor visades i Googles sökresultat denna månad.',
    kInGoogleMonth:   'i Google denna månad',
    kClicks:          'Klick/mån totalt',
    kClicksTip:       'Hur många som klickade sig till din hemsida från Googles sökresultat denna månad.',
    kClickRate:       (r: string) => `${r} % klickfrekvens`,
    kFromSearch:      'från Google-sök',
    kThisWeek:        'denna vecka',
    // Pages table
    hPage:            'Sida',
    hPageTip:         'Sidans adress och den vanligaste sökningen som tar folk dit från Google. Sidor med en färgad flagga har något värt att agera på — klicka på raden för en enkel förklaring.',
    hTrend:           'Trend',
    hTrendTip:        'Besökstrend de senaste 6 veckorna.',
    hVisits:          'Besök',
    hVisitsTip:       'Besök som startade på den här sidan de senaste 30 dagarna.',
    hRank:            'Plats',
    hRankTip:         'Genomsnittlig Google-placering. Pilen visar förändring sedan förra veckan.',
    hTimesSeen:       'Visningar',
    hTimesSeenTip:    'Antal gånger sidan visades i Googles sökresultat denna månad.',
    hEngaged:         'Engagerade',
    hEngagedTip:      'Andel besökare som stannade minst 10 sekunder eller såg mer än en sida.',
    hCtr:             'Klickfrekvens',
    hCtrTip:          'Andel av de som såg sidan i Google som klickade på den. Grönt = över snittet för placeringen. Rött = under.',
    // Sidebar
    rankChanges:      'Rankförändringar denna vecka',
    rankChangesTip:   'Sidor som klättrat eller tappat i Googles sökresultat sedan förra veckan.',
    improved:         'Förbättrade',
    dropped:          'Tappade',
    searchVisibility: 'Synlighet i sök',
    searchVisibilityTip: 'Hur dina sidor fördelar sig i Googles sökresultat — från topp 3 till syns inte än.',
    tierTop3:         'Topp 3',
    tierPage1:        'Sida 1',
    tierPage2:        'Sida 2',
    tierNotVisible:   'Syns inte än',
    pagesTracked:     (n: number) => `${n} sidor spårade i Google`,
    // Opportunities
    improveTitle:     'Förbättra dina placeringar',
    improveTitleTip:  'Sidor som är nära en bättre placering, och hur många extra klick per månad det kan ge.',
    oPage:            'Sida',
    oTopQuery:        'Toppsökning',
    oCurrentRank:     'Nuvarande plats',
    oCurrentRankTip:  'Nuvarande genomsnittlig placering på Google.',
    oExtraClicks:     'Extra klick/mån',
    oExtraClicksTip:  'Extra klick per månad om sidan når målplaceringen.',
    oGoal:            'Mål',
    oGoalTip:         'Målplacering — sida 1 för sidor på sida 2, topp 3 för sidor på sida 1.',
    oPerMo:           '/mån',
    oToTop3:          '→ #3',
    oToPage1:         '→ sida 1',
    // Content gaps
    gapsTitle:        'Sidor värda att skapa',
    gapsTitleTip:     'Sökningar många gör där du inte har en egen sida än. En ny sida om ämnet kan fånga den trafiken.',
    searchesPerMo:    'sökningar/mån',
  },
  en: {
    topSearch:        'Top search:',
    howToFix:         'How to fix:',
    flagNotClicked:   'Seen but not clicked',
    flagLosing:       'Losing visitors',
    flagDemand:       'High demand',
    flagCompeting:    'Two pages competing',
    flagNotClickedTip: 'This page shows up in Google but gets fewer clicks than normal. Click the row to see why and what to do.',
    flagLosingTip:    'This page has been losing visitors over the last few months. Click the row for numbers and a fix.',
    flagDemandTip:    'Many people search for this topic but the page is not on page 1 yet. Click the row for numbers and a fix.',
    flagCompetingTip: 'Two of your pages compete for the same search and hold each other down. Click the row for details.',
    notClickedWhat:   (pos: number) => `This page shows up on page 1 of Google, but far fewer people click it than is normal at position #${pos}. The most common cause is a page title or description that doesn't stand out in the search results.`,
    nSeenPerMonth:    'Times seen per month',
    nNormalCtr:       'Normal click rate here',
    nYourCtr:         'Your click rate',
    nMissedClicks:    'Missed clicks / month',
    notClickedFix:    'Rewrite the page title and meta description so they stand out — mention your service, your city, and something that sets you apart (same-day service, fixed prices). You change these in your website editor or SEO settings.',
    losingWhat:       (drop: number) => `Traffic to this page has dropped ${drop}% over the last few months. Pages lose ground over time when competitors publish fresher content — Google favours pages that stay up to date.`,
    nTrafficDrop:     'Traffic drop',
    nVisits30:        'Visits last 30 days',
    losingFix:        'Refresh the page: update prices and dates, add a recent example or photos, and expand any thin sections. Even small updates signal to Google that the page is being maintained.',
    demandWhat:       (n: string) => `People search for this topic ${n} times a month, but the page isn't on page 1 yet — so almost none of that demand reaches you. This is your biggest untapped page.`,
    nSearchesPerMo:   'Searches per month',
    nCurrentPos:      'Current position',
    notRanked:        'Not ranked',
    demandFix:        'Make this page the best answer for the search: cover the topic more thoroughly than competitors, include your city naturally, and link to it from your other pages.',
    competingWhat:    (n: number, kw: string, paths: string) => `${n} of your pages target the same search ("${kw}"): ${paths}. When your own pages compete, Google splits the ranking between them and both end up lower.`,
    competingFix:     'Pick the strongest page as the main one and either merge the others into it, or refocus them on a different, more specific search. One clear page beats two competing ones.',
    kPagesTracked:    'Pages tracked',
    kPagesTrackedTip: 'The number of pages on your website that Google knows about and that are tracked here.',
    kInGoogle:        'in Google',
    kOnPage1:         'On page 1',
    kOnPage1Tip:      'How many of your pages appear among the first ten results on Google. That is where almost all clicks happen.',
    kPositions:       'positions 1–10',
    kAvgPosition:     'Avg. position',
    kAvgPositionTip:  'The average Google ranking position across all your pages. Lower is better.',
    kAcrossAll:       'across all pages',
    kTimesSeen:       'Times seen',
    kTimesSeenTip:    'How many times your pages appeared in Google search results this month.',
    kInGoogleMonth:   'in Google this month',
    kClicks:          'Total clicks/mo',
    kClicksTip:       'How many people clicked through to your website from Google search results this month.',
    kClickRate:       (r: string) => `${r}% click rate`,
    kFromSearch:      'from Google Search',
    kThisWeek:        'this week',
    hPage:            'Page',
    hPageTip:         'The page address and the top search query bringing people to it from Google. Pages with a coloured flag have something worth acting on — click the row for a plain-language explanation.',
    hTrend:           'Trend',
    hTrendTip:        'Visit trend over the last 6 weeks.',
    hVisits:          'Visits',
    hVisitsTip:       'Visits started on this page in the last 30 days.',
    hRank:            'Rank',
    hRankTip:         'Average Google position. Arrow shows rank change since last week.',
    hTimesSeen:       'Times seen',
    hTimesSeenTip:    'Times this page appeared in Google search results this month.',
    hEngaged:         'Engaged',
    hEngagedTip:      'Share of visitors who stayed 10+ seconds or viewed more than one page.',
    hCtr:             'Click rate',
    hCtrTip:          'Share of the people who saw this page in Google that clicked it. Green = above average for the position. Red = below.',
    rankChanges:      'Rank changes this week',
    rankChangesTip:   'Pages that climbed or dropped in Google search results since last week.',
    improved:         'Improved',
    dropped:          'Dropped',
    searchVisibility: 'Search visibility',
    searchVisibilityTip: 'How your pages are distributed in Google search results — from top 3 to not visible yet.',
    tierTop3:         'Top 3',
    tierPage1:        'Page 1',
    tierPage2:        'Page 2',
    tierNotVisible:   'Not visible yet',
    pagesTracked:     (n: number) => `${n} pages tracked in Google`,
    improveTitle:     'Improve your rankings',
    improveTitleTip:  'Pages that are close to a better position, and how many extra clicks per month that could bring.',
    oPage:            'Page',
    oTopQuery:        'Top query',
    oCurrentRank:     'Current rank',
    oCurrentRankTip:  'Current average Google ranking position.',
    oExtraClicks:     'Extra clicks/mo',
    oExtraClicksTip:  'Extra clicks per month if this page reaches the goal position.',
    oGoal:            'Goal',
    oGoalTip:         'Target position — page 1 for page 2 pages, top 3 for page 1 pages.',
    oPerMo:           '/mo',
    oToTop3:          '→ #3',
    oToPage1:         '→ page 1',
    gapsTitle:        'Pages worth creating',
    gapsTitleTip:     'Searches many people make where you have no page yet. A new page on the topic can capture that traffic.',
    searchesPerMo:    'searches/mo',
  },
}

// ── Flag detail modal — the rescued advice, one click away ────────────────────
function FlagDetailModal({ info, onClose, topSearchLabel, howToFixLabel }: {
  info:           FlagInfo
  onClose:        () => void
  topSearchLabel: string
  howToFixLabel:  string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-navy-800 rounded-2xl border border-navy-600 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="min-w-0">
            <p className="text-white font-semibold text-base truncate">{info.page.path}</p>
            {info.page.topQuery && <p className="text-slate-500 text-xs mt-1">{topSearchLabel} &ldquo;{info.page.topQuery}&rdquo;</p>}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors ml-4 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* One block per flag */}
        <div className="px-5 pb-5 space-y-4">
          {info.flags.map(f => (
            <div key={f.id} className="rounded-xl border border-navy-700 overflow-hidden">
              <div className="px-4 py-3 bg-navy-900/50 flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${FLAG_STYLE[f.id]}`}>{f.label}</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <p className="text-slate-300 text-sm leading-relaxed">{f.what}</p>
                {f.numbers.length > 0 && (
                  <div className="bg-navy-900 rounded-lg p-3 space-y-1.5">
                    {f.numbers.map((n, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs">{n.label}</span>
                        <span className={`text-xs font-semibold tabular-nums ${n.color ?? 'text-white'}`}>{n.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-slate-400 text-xs leading-relaxed">
                  <span className="text-slate-500 font-medium">{howToFixLabel} </span>{f.fix}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function PagesTabTest2({ data }: { data: AnalyticsData }) {
  const { lang } = useLang()
  const t = T[lang]
  const [selected, setSelected] = useState<FlagInfo | null>(null)
  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString('sv-SE')

  // ── Opportunities ──────────────────────────────────────────────────────────
  const opportunities = data.pages
    .filter(p => p.position !== null && p.position > 3 && p.position <= 20 && p.impressions !== null && p.clicks !== null)
    .map(p => {
      const isPage1      = p.position! <= 10
      const targetCTR    = isPage1 ? 11 : 2.5
      const targetClicks = Math.round((p.impressions! * targetCTR) / 100)
      const uplift       = targetClicks - p.clicks!
      return { ...p, uplift, isPage1 }
    })
    .filter(p => p.uplift > 0)
    .sort((a, b) => b.uplift - a.uplift)

  // ── CTR losers ─────────────────────────────────────────────────────────────
  const ctrLosers = data.pages
    .filter(p => p.position !== null && p.position <= 10 && p.impressions !== null && p.impressions >= 200 && p.clicks !== null)
    .map(p => {
      const actual       = (p.clicks! / p.impressions!) * 100
      const expected     = expectedCTR(p.position!)
      const gap          = expected - actual
      const missedClicks = Math.round((gap / 100) * p.impressions!)
      return { ...p, actual, expected, gap, missedClicks }
    })
    .filter(p => p.gap >= p.expected * 0.25 && p.missedClicks >= 10)
    .sort((a, b) => b.missedClicks - a.missedClicks)

  const ctrLoserByPath = new Map(ctrLosers.map(p => [p.path, p]))

  // ── Rank movers ────────────────────────────────────────────────────────────
  const rankImproved = data.pages
    .filter(p => p.positionChange !== null && p.positionChange > 0 && p.position !== null)
    .sort((a, b) => b.positionChange! - a.positionChange!)
  const rankDropped = data.pages
    .filter(p => p.positionChange !== null && p.positionChange < 0 && p.position !== null)
    .sort((a, b) => a.positionChange! - b.positionChange!)

  // ── Content decay ──────────────────────────────────────────────────────────
  const decayingPages = data.pages
    .filter(p => p.trend.length >= 6)
    .map(p => {
      const firstAvg  = (p.trend[0] + p.trend[1] + p.trend[2]) / 3
      const secondAvg = (p.trend[3] + p.trend[4] + p.trend[5]) / 3
      const dropPct   = firstAvg > 0 ? ((firstAvg - secondAvg) / firstAvg) * 100 : 0
      return { ...p, dropPct }
    })
    .filter(p => p.dropPct >= 15)
    .sort((a, b) => b.dropPct - a.dropPct)

  const decayByPath = new Map(decayingPages.map(p => [p.path, p]))

  // ── Keyword cannibalization ────────────────────────────────────────────────
  const STOP = new Set(['the','a','an','and','or','in','of','for','to','with','your',
    'stockholm','göteborg','malmö','london','york','sweden','sverige'])
  const kwMap: Record<string, typeof data.pages> = {}
  data.pages.forEach(p => {
    if (!p.topQuery) return
    p.topQuery.toLowerCase().split(/\s+/)
      .filter(w => !STOP.has(w) && w.length > 2)
      .forEach(kw => {
        if (!kwMap[kw]) kwMap[kw] = []
        if (!kwMap[kw].find(x => x.path === p.path)) kwMap[kw].push(p)
      })
  })
  const cannibGroups = Object.entries(kwMap)
    .filter(([, pages]) => pages.length >= 2)
    .map(([keyword, pages]) => ({ keyword, pages }))
    .sort((a, b) => b.pages.length - a.pages.length)
    .slice(0, 3)

  // ── Hidden gems ────────────────────────────────────────────────────────────
  const hiddenGems = data.pages
    .filter(p => p.impressions !== null && p.impressions >= 500 && (p.position === null || p.position > 10))
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))

  const hiddenGemPaths = new Set(hiddenGems.map(p => p.path))
  const cannibByPath   = new Map<string, { keyword: string; pages: typeof data.pages }>()
  cannibGroups.forEach(g => g.pages.forEach(p => { if (!cannibByPath.has(p.path)) cannibByPath.set(p.path, g) }))

  // Build the flag detail for a page — the advice content, structured
  function buildFlagInfo(p: PageData): FlagInfo | null {
    const flags: FlagInfo['flags'] = []
    const loser = ctrLoserByPath.get(p.path)
    if (loser) {
      flags.push({
        id:    'notclicked',
        label: t.flagNotClicked,
        color: FLAG_STYLE.notclicked,
        what:  t.notClickedWhat(Math.round(p.position!)),
        numbers: [
          { label: t.nSeenPerMonth, value: fmtNum(p.impressions!) },
          { label: t.nNormalCtr,    value: `~${loser.expected.toFixed(1)}%`, color: 'text-green-400/80' },
          { label: t.nYourCtr,      value: `${loser.actual.toFixed(1)}%`,    color: 'text-red-400' },
          { label: t.nMissedClicks, value: `~${loser.missedClicks}`,          color: 'text-mustard' },
        ],
        fix: t.notClickedFix,
      })
    }
    const decay = decayByPath.get(p.path)
    if (decay) {
      flags.push({
        id:    'losing',
        label: t.flagLosing,
        color: FLAG_STYLE.losing,
        what:  t.losingWhat(Math.round(decay.dropPct)),
        numbers: [
          { label: t.nTrafficDrop, value: `−${Math.round(decay.dropPct)}%`, color: 'text-red-400' },
          { label: t.nVisits30, value: p.sessions.toLocaleString('sv-SE') },
        ],
        fix: t.losingFix,
      })
    }
    if (hiddenGemPaths.has(p.path)) {
      flags.push({
        id:    'demand',
        label: t.flagDemand,
        color: FLAG_STYLE.demand,
        what:  t.demandWhat(fmtNum(p.impressions!)),
        numbers: [
          { label: t.nSearchesPerMo, value: fmtNum(p.impressions!), color: 'text-blue-400' },
          { label: t.nCurrentPos,    value: p.position !== null ? `#${Math.round(p.position)}` : t.notRanked },
        ],
        fix: t.demandFix,
      })
    }
    const cannib = cannibByPath.get(p.path)
    if (cannib) {
      flags.push({
        id:    'competing',
        label: t.flagCompeting,
        color: FLAG_STYLE.competing,
        what:  t.competingWhat(cannib.pages.length, cannib.keyword, cannib.pages.map(x => x.path).join(', ')),
        numbers: cannib.pages.map(x => ({
          label: x.path,
          value: x.position !== null ? `#${Math.round(x.position)}` : '—',
        })),
        fix: t.competingFix,
      })
    }
    return flags.length > 0 ? { page: p, flags } : null
  }

  // ── Visibility tiers ───────────────────────────────────────────────────────
  const visibilityTiers: VisibilityTier[] = [
    { label: t.tierTop3,       color: '#4ade80', count: data.pages.filter(p => p.position !== null && p.position <= 3).length },
    { label: t.tierPage1,      color: '#f0b429', count: data.pages.filter(p => p.position !== null && p.position > 3 && p.position <= 10).length },
    { label: t.tierPage2,      color: '#fb923c', count: data.pages.filter(p => p.position !== null && p.position > 10 && p.position <= 20).length },
    { label: t.tierNotVisible, color: '#334155', count: data.pages.filter(p => p.position === null || p.position > 20).length },
  ]

  // ── KPI stats ──────────────────────────────────────────────────────────────
  const kpiPage1  = data.pages.filter(p => p.position !== null && p.position <= 10).length
  const kpiImpr   = data.pages.reduce((s, p) => s + (p.impressions ?? 0), 0)
  const kpiClicks = data.pages.reduce((s, p) => s + (p.clicks ?? 0), 0)
  const ranked    = data.pages.filter(p => p.position !== null)
  const kpiAvgPos = ranked.length ? ranked.reduce((s, p) => s + p.position!, 0) / ranked.length : null
  const rankedWithChange = ranked.filter(p => p.positionChange !== null)
  const avgPosChange     = rankedWithChange.length
    ? rankedWithChange.reduce((s, p) => s + p.positionChange!, 0) / rankedWithChange.length
    : null

  return (
    <div className="space-y-4">

      {selected && (
        <FlagDetailModal
          info={selected}
          onClose={() => setSelected(null)}
          topSearchLabel={t.topSearch}
          howToFixLabel={t.howToFix}
        />
      )}

      {/* ── Row 1: KPI stats — 5 cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: t.kPagesTracked, tip: t.kPagesTrackedTip, value: String(data.pages.length),                    sub: t.kInGoogle,      arrow: null         },
          { label: t.kOnPage1,      tip: t.kOnPage1Tip,      value: `${kpiPage1} / ${data.pages.length}`,          sub: t.kPositions,     arrow: null         },
          { label: t.kAvgPosition,  tip: t.kAvgPositionTip,  value: kpiAvgPos ? `#${kpiAvgPos.toFixed(1)}` : '—', sub: t.kAcrossAll,     arrow: avgPosChange },
          { label: t.kTimesSeen,    tip: t.kTimesSeenTip,    value: fmtNum(kpiImpr),                               sub: t.kInGoogleMonth, arrow: null        },
          { label: t.kClicks,       tip: t.kClicksTip,       value: fmtNum(kpiClicks),                             sub: kpiClicks > 0 && kpiImpr > 0 ? t.kClickRate(((kpiClicks / kpiImpr) * 100).toFixed(1)) : t.kFromSearch, arrow: null },
        ].map((kpi, i) => (
          <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4">
            <Tooltip text={kpi.tip}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 cursor-default">{kpi.label}</p>
            </Tooltip>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white tabular-nums">{kpi.value}</p>
              {kpi.arrow !== null && kpi.arrow !== 0 && (
                <span className={`text-xs font-bold ${kpi.arrow > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {kpi.arrow > 0 ? '↑' : '↓'} {t.kThisWeek}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 2: Pages table (left) + right sidebar ────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_268px] gap-5 items-start">

        {/* Pages table */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[28px_1fr_88px_72px_88px_76px_62px_64px] gap-3 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
                <span>#</span>
                <Tooltip text={t.hPageTip}>
                  <span className="cursor-default">{t.hPage}</span>
                </Tooltip>
                <Tooltip text={t.hTrendTip}>
                  <span className="cursor-default">{t.hTrend}</span>
                </Tooltip>
                <Tooltip text={t.hVisitsTip}>
                  <span className="text-right cursor-default">{t.hVisits}</span>
                </Tooltip>
                <Tooltip text={t.hRankTip}>
                  <span className="text-right cursor-default">{t.hRank}</span>
                </Tooltip>
                <Tooltip text={t.hTimesSeenTip}>
                  <span className="text-right cursor-default">{t.hTimesSeen}</span>
                </Tooltip>
                <Tooltip text={t.hEngagedTip}>
                  <span className="text-right cursor-default">{t.hEngaged}</span>
                </Tooltip>
                <Tooltip text={t.hCtrTip}>
                  <span className="text-right cursor-default">{t.hCtr}</span>
                </Tooltip>
              </div>
              <div className="divide-y divide-navy-700">
                {data.pages.map((p, i) => {
                  const rankColor = p.position === null ? 'text-slate-500'
                                  : p.position <= 3    ? 'text-green-400'
                                  : p.position <= 10   ? 'text-mustard'
                                  : p.position <= 20   ? 'text-orange-400'
                                  : 'text-red-400'
                  const trendUp   = p.trend.length >= 2 ? p.trend[p.trend.length - 1] >= p.trend[0] : true
                  const actualCTR = (p.clicks !== null && p.impressions !== null && p.impressions > 0)
                                  ? (p.clicks / p.impressions) * 100 : null
                  const expCTR    = p.position !== null ? expectedCTR(p.position) : null
                  const ctrColor  = actualCTR === null || expCTR === null ? 'text-slate-500'
                                  : actualCTR >= expCTR                   ? 'text-green-400'
                                  : actualCTR >= expCTR * 0.75            ? 'text-mustard'
                                  : 'text-red-400'
                  const engColor  = p.engagementRate >= 0.65 ? 'text-green-400'
                                  : p.engagementRate >= 0.45 ? 'text-mustard'
                                  : 'text-red-400'
                  const isLosingCTR   = ctrLoserByPath.has(p.path)
                  const isDropping    = decayByPath.has(p.path)
                  const isHighDemand  = hiddenGemPaths.has(p.path)
                  const hasConflict   = cannibByPath.has(p.path)
                  const hasWarnFlag   = isLosingCTR || isDropping
                  const anyFlag       = hasWarnFlag || isHighDemand || hasConflict
                  const flagInfo      = anyFlag ? buildFlagInfo(p) : null
                  return (
                    <div
                      key={i}
                      onClick={() => flagInfo && setSelected(flagInfo)}
                      className={`grid grid-cols-[28px_1fr_88px_72px_88px_76px_62px_64px] gap-3 px-5 py-3.5 items-center ${hasWarnFlag ? 'bg-red-500/[0.03]' : ''} ${anyFlag ? 'cursor-pointer hover:bg-navy-700/20 transition-colors' : ''}`}
                    >
                      <span className="text-slate-500 text-xs tabular-nums">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <p className="text-white text-sm font-medium truncate">{p.path}</p>
                          {isLosingCTR  && <Tooltip text={t.flagNotClickedTip}><span className="shrink-0 text-xs font-bold text-red-400    bg-red-500/10    border border-red-500/20    px-1.5 py-0.5 rounded-full">{t.flagNotClicked}</span></Tooltip>}
                          {isDropping   && <Tooltip text={t.flagLosingTip}><span className="shrink-0 text-xs font-bold text-orange-400  bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">{t.flagLosing}</span></Tooltip>}
                          {isHighDemand && <Tooltip text={t.flagDemandTip}><span className="shrink-0 text-xs font-bold text-blue-400    bg-blue-500/10   border border-blue-500/20   px-1.5 py-0.5 rounded-full">{t.flagDemand}</span></Tooltip>}
                          {hasConflict  && <Tooltip text={t.flagCompetingTip}><span className="shrink-0 text-xs font-bold text-yellow-400  bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full">{t.flagCompeting}</span></Tooltip>}
                        </div>
                        {p.topQuery && <p className="text-slate-500 text-xs mt-0.5 truncate">&ldquo;{p.topQuery}&rdquo;</p>}
                      </div>
                      <div className="flex items-center">
                        {p.trend.length >= 2
                          ? <Sparkline values={p.trend} positive={trendUp} />
                          : <span className="text-slate-500 text-xs">—</span>}
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm tabular-nums font-medium">{p.sessions.toLocaleString('sv-SE')}</p>
                        <p className="text-slate-500 text-xs tabular-nums">{fmtDuration(p.avgDuration)}</p>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {p.position !== null ? (
                          <>
                            <span className={`text-sm font-semibold tabular-nums ${rankColor}`}>#{Math.round(p.position)}</span>
                            {p.positionChange !== null && p.positionChange !== 0 && (
                              <span className={`text-xs font-medium ${p.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {p.positionChange > 0 ? `↑${p.positionChange}` : `↓${Math.abs(p.positionChange)}`}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </div>
                      <span className="text-slate-300 text-sm text-right tabular-nums">{p.impressions !== null ? fmtNum(p.impressions) : '—'}</span>
                      <span className={`text-sm text-right font-semibold tabular-nums ${engColor}`}>{Math.round(p.engagementRate * 100)}%</span>
                      <span className={`text-sm text-right font-semibold tabular-nums ${ctrColor}`}>{actualCTR !== null ? `${actualCTR.toFixed(1)}%` : '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar: rank changes + visibility */}
        <div className="space-y-4">

          {/* Rank changes */}
          {(rankImproved.length > 0 || rankDropped.length > 0) && (
            <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between">
                <Tooltip text={t.rankChangesTip}>
                  <p className="text-xs font-semibold text-white cursor-default">{t.rankChanges}</p>
                </Tooltip>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${
                  rankImproved.length > rankDropped.length ? 'text-green-400 bg-green-500/10'
                  : rankDropped.length > rankImproved.length ? 'text-red-400 bg-red-500/10'
                  : 'text-slate-400 bg-navy-700'
                }`}>↑{rankImproved.length} / ↓{rankDropped.length}</span>
              </div>
              {rankImproved.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2">{t.improved}</p>
                  {rankImproved.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-slate-300 text-xs truncate">{p.path}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-slate-500 text-xs tabular-nums">#{Math.round(p.position!)}</span>
                        <span className="text-green-400 text-xs font-semibold">↑{p.positionChange}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {rankDropped.length > 0 && (
                <div className={`px-4 py-3 space-y-2 ${rankImproved.length > 0 ? 'border-t border-navy-700' : ''}`}>
                  <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">{t.dropped}</p>
                  {rankDropped.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-slate-300 text-xs truncate">{p.path}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-slate-500 text-xs tabular-nums">#{Math.round(p.position!)}</span>
                        <span className="text-red-400 text-xs font-semibold">↓{Math.abs(p.positionChange!)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search visibility — horizontal bars */}
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
            <Tooltip text={t.searchVisibilityTip}>
              <p className="text-xs font-semibold text-white mb-3 cursor-default">{t.searchVisibility}</p>
            </Tooltip>
            <div className="space-y-2.5">
              {(() => {
                const maxTier = Math.max(...visibilityTiers.map(t => t.count), 1)
                return visibilityTiers.map((tier, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-xs">{tier.label}</span>
                      <span className="text-white text-xs font-semibold tabular-nums">{tier.count}</span>
                    </div>
                    <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(tier.count / maxTier) * 100}%`, backgroundColor: tier.color, opacity: 0.85 }} />
                    </div>
                  </div>
                ))
              })()}
              <p className="text-slate-500 text-xs pt-1">{t.pagesTracked(data.pages.length)}</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Row 4: Rank opportunities — compact table ─────────────────────── */}
      {opportunities.length > 0 && (
        <div>
          <Tooltip text={t.improveTitleTip}>
            <h2 className="text-sm font-semibold text-white mb-3 cursor-default">{t.improveTitle}</h2>
          </Tooltip>
          <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[1fr_120px_100px_120px_80px] gap-4 px-5 py-2.5 border-b border-navy-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>{t.oPage}</span>
                  <span>{t.oTopQuery}</span>
                  <Tooltip text={t.oCurrentRankTip}><span className="cursor-default">{t.oCurrentRank}</span></Tooltip>
                  <Tooltip text={t.oExtraClicksTip}><span className="text-right cursor-default">{t.oExtraClicks}</span></Tooltip>
                  <Tooltip text={t.oGoalTip}><span className="text-right cursor-default">{t.oGoal}</span></Tooltip>
                </div>
                <div className="divide-y divide-navy-700">
                  {opportunities.map((p, i) => {
                    const pos      = p.position!
                    const barCount = p.isPage1 ? 10 : 20
                    const goalPos  = p.isPage1 ? 3 : 10
                    return (
                      <div key={i} className="grid grid-cols-[1fr_120px_100px_120px_80px] gap-4 px-5 py-3.5 items-center">
                        <p className="text-white text-sm font-medium truncate">{p.path}</p>
                        <p className="text-slate-500 text-xs truncate">{p.topQuery ? `"${p.topQuery}"` : '—'}</p>
                        <div>
                          <div className="flex gap-[2px] mb-1">
                            {Array.from({ length: barCount }, (_, idx) => {
                              const segPos = idx + 1
                              return (
                                <div key={segPos} className={`flex-1 h-1.5 rounded-sm ${
                                  segPos === Math.round(pos) ? 'bg-mustard' : segPos <= goalPos ? 'bg-green-500/25' : 'bg-navy-600'
                                }`} />
                              )
                            })}
                          </div>
                          <p className="text-mustard text-xs font-semibold tabular-nums">#{pos.toFixed(1)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 text-base font-bold tabular-nums">+{p.uplift}</span>
                          <span className="text-slate-500 text-xs ml-1">{t.oPerMo}</span>
                        </div>
                        <p className="text-slate-400 text-xs text-right">{p.isPage1 ? t.oToTop3 : t.oToPage1}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 5: Pages worth creating ──────────────────────────────────── */}
      {data.content_gaps && data.content_gaps.length > 0 && (
        <div>
          <Tooltip text={t.gapsTitleTip}>
            <h2 className="text-sm font-semibold text-white mb-3 cursor-default">{t.gapsTitle}</h2>
          </Tooltip>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.content_gaps.map((gap, i) => (
              <div key={i} className="bg-navy-800 rounded-xl border border-navy-700 px-4 py-3.5 flex items-center justify-between gap-3">
                <p className="text-slate-300 text-sm font-medium leading-snug min-w-0 truncate">&ldquo;{gap.query}&rdquo;</p>
                <div className="shrink-0 text-right">
                  <p className="text-blue-400 text-lg font-bold tabular-nums">{fmtNum(gap.impressions)}</p>
                  <p className="text-slate-500 text-xs">{t.searchesPerMo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
