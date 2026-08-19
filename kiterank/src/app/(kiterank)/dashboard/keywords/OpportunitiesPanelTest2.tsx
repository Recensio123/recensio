'use client'
import { useState, useEffect } from 'react'
import { useLang }             from '@/components/LanguageProvider'
import { OpportunityCard } from './OpportunityCard'
import type { Suggestion } from '@/app/api/ai/keywords/route'

const T = {
  sv: {
    demand:        'Efterfrågan',
    perMonth:      'mån',
    competition:   'Konkurrens',
    volumeTip:     'Genomsnittligt antal sökningar per månad i hela Sverige på behandlingen. Vi mäter nationellt med flit — Google döljer så små tal som en enskild ort ger — men efterfrågan hos dig följer samma mönster.',
    unmeasured:    'Ej mätt',
    unmeasuredTip: 'Sökvolym kräver en kopplad Google Ads-anslutning. Utan den visar vi hellre ingenting än en gissning.',
    compTip:       'Hur många andra som konkurrerar om behandlingen. Låg konkurrens betyder att en bra, vanlig sida ofta räcker.',
    actionMissing: 'Du syns inte för den här behandlingen än — skriv mer om den på din sida. Din ort känner Google redan till.',
    actionThin:    (pos: number) => `Du syns på plats ${pos} — texten finns men behöver bli utförligare.`,
  },
  en: {
    demand:        'Demand',
    perMonth:      'mo',
    competition:   'Competition',
    volumeTip:     'Average monthly searches across Sweden for this treatment. We measure nationally on purpose — Google hides figures as small as a single town produces — but demand where you are follows the same pattern.',
    unmeasured:    'Not measured',
    unmeasuredTip: 'Search volume needs a connected Google Ads account. Without one we show nothing rather than a guess.',
    compTip:       'How many others compete for this treatment. Low competition means a solid, ordinary page is often enough.',
    actionMissing: 'You do not show up for this treatment yet — write more about it on your site. Google already knows your town.',
    actionThin:    (pos: number) => `You show up at position ${pos} — the text is there but needs more depth.`,
  },
}

const DESCRIPTION = {
  sv: 'Sökord som är värda att lägga till på din hemsida och Google-profil just nu',
  en: 'Keywords worth adding to your website and Google profile right now',
}

/* ── Target next ─────────────────────────────────────────────────────────── */

/* Mirrors what the route returns before any Ads account is connected, so the
   panel has the real shape to render while everything else is example data. */
const MOCK_SUGGESTIONS: Suggestion[] = [
  { keyword: 'balayage',          rationale: 'Värdefull färgbehandling med stark bokningsvilja',        avgVolume: 9_900, competition: 'LOW'    },
  { keyword: 'hårfärgning',       rationale: 'Bred efterfrågan och återkommande kunder — färg växer ut', avgVolume: 14_800, competition: 'MEDIUM', seenPerMonth: 40, position: 34 },
  { keyword: 'keratinbehandling', rationale: 'Premiumbehandling med högt pris per bokning',              avgVolume: 2_900, competition: 'MEDIUM' },
  { keyword: 'drop in frisör',    rationale: 'Sökningar på tid samma dag leder ofta direkt till bokning', avgVolume: 2_400, competition: 'LOW'    },
  { keyword: 'barnklippning',     rationale: 'Familjebokningar ger återkommande besök från hela hushållet', avgVolume: 1_600, competition: 'LOW'  },
]

const COMP_LABEL: Record<'sv' | 'en', Record<'LOW' | 'MEDIUM' | 'HIGH', string>> = {
  sv: { LOW: 'Låg', MEDIUM: 'Medel', HIGH: 'Hård' },
  en: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' },
}


function TargetTab() {
  const { lang } = useLang()
  const [loading,     setLoading]     = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS)

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/ai/keywords', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.suggestions?.length) setSuggestions(data.suggestions)
    } catch { /* keep mock */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-navy-900 rounded-xl p-4 border border-navy-700">
          <div className="h-4 w-1/3 bg-navy-700 rounded animate-pulse mb-2" />
          <div className="h-3 w-2/3 bg-navy-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => {
        /*
         * The advice, not the phrase.
         *
         * Telling a salon to target "hårfärgning södermalm" was the wrong
         * instruction: Google already places them from their address and
         * their Google profile. What decides whether they win the search is
         * whether the site says anything about colour work at all. So the
         * card reports demand, then says which of the two situations they
         * are in — invisible, or present but thin.
         */
        const facts = []
        if (s.avgVolume !== undefined) {
          facts.push({ label: T[lang].demand, value: `${s.avgVolume.toLocaleString('sv-SE')}/${T[lang].perMonth}`, tip: T[lang].volumeTip })
        } else {
          facts.push({ label: T[lang].demand, value: T[lang].unmeasured, tip: T[lang].unmeasuredTip })
        }
        if (s.competition) {
          facts.push({ label: T[lang].competition, value: COMP_LABEL[lang][s.competition], tip: T[lang].compTip })
        }

        const action = s.position === undefined
          ? T[lang].actionMissing
          : T[lang].actionThin(Math.round(s.position))

        return (
          <OpportunityCard
            key={i}
            title={s.keyword}
            subtitle={`${s.rationale} ${action}`}
            facts={facts}
          />
        )
      })}
      <button onClick={load} className="text-xs text-slate-500 hover:text-slate-300 transition-colors pt-1">
        {lang === 'sv' ? 'Uppdatera förslag' : 'Refresh suggestions'}
      </button>
    </div>
  )
}

/*
 * One panel, one question: which keywords are worth going after next.
 *
 * The seasonal calendar that used to sit beside this was hand-written
 * editorial — seventeen fixed events, twelve of which could never apply to a
 * salon, and the five that could said the same thing to every salon in the
 * country. Season is worth showing, but only once it is read out of the
 * keyword volumes rather than typed in by hand.
 *
 * With one thing left there is nothing to switch between, so the tab bar
 * went with it.
 */
export function OpportunitiesPanelTest2() {
  const { lang } = useLang()

  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
      <p className="text-slate-500 text-xs px-5 pt-4">{DESCRIPTION[lang]}</p>
      <div className="p-5 pt-3">
        <TargetTab />
      </div>
    </div>
  )
}
