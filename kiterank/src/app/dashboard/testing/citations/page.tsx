'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { HelpButton } from '@/components/dashboard/HelpButton'
import { Tooltip } from '@/components/Tooltip'
import { ExternalLink } from '@/components/ExternalLink'

type CitationStatus = 'correct' | 'inconsistent' | 'missing'

type Citation = {
  id:        string
  directory: string
  category:  'global' | 'swedish'
  status:    CitationStatus
  issues?:   string[]
  url?:      string
}

// Mock data: a Swedish plumber with partial listing coverage
// In production this would be pulled from DataForSEO's citation building API
const MOCK_CITATIONS: Citation[] = [
  // Global — mostly present, some issues
  { id: 'gbp',         directory: 'Google Business Profile', category: 'global',  status: 'correct',       url: 'https://g.co/kgs/example'           },
  { id: 'bing',        directory: 'Bing Places',             category: 'global',  status: 'inconsistent',  issues: ['Address differs: "Hägerstensvägen 132" vs "Hägerstensv. 132"'], url: 'https://bingplaces.com' },
  { id: 'apple',       directory: 'Apple Maps',              category: 'global',  status: 'missing'                                                    },
  { id: 'facebook',    directory: 'Facebook',                category: 'global',  status: 'correct',       url: 'https://facebook.com/example'        },
  { id: 'foursquare',  directory: 'Foursquare',              category: 'global',  status: 'inconsistent',  issues: ['Phone number missing']           },
  { id: 'tripadvisor', directory: 'TripAdvisor',             category: 'global',  status: 'missing'                                                    },
  { id: 'yelp',        directory: 'Yelp',                    category: 'global',  status: 'missing'                                                    },
  // Swedish directories
  { id: 'hitta',       directory: 'Hitta.se',                category: 'swedish', status: 'correct',       url: 'https://www.hitta.se/example'        },
  { id: 'eniro',       directory: 'Eniro',                   category: 'swedish', status: 'inconsistent',  issues: ['Business name differs: missing "AB"', 'Website URL missing'] },
  { id: 'ratsit',      directory: 'Ratsit',                  category: 'swedish', status: 'correct',       url: 'https://www.ratsit.se/example'       },
  { id: 'allabolag',   directory: 'Allabolag',               category: 'swedish', status: 'correct',       url: 'https://www.allabolag.se/example'    },
  { id: 'gulasidorna', directory: 'Gulasidorna',             category: 'swedish', status: 'missing'                                                    },
  { id: '118100',      directory: '118 100',                 category: 'swedish', status: 'inconsistent',  issues: ['Old phone number on file']       },
  { id: 'merinfo',     directory: 'Merinfo',                 category: 'swedish', status: 'correct',       url: 'https://www.merinfo.se/example'      },
  { id: 'kompass',     directory: 'Kompass',                 category: 'swedish', status: 'missing'                                                    },
]

const STATUS_CONFIG: Record<CitationStatus, {
  labelSv: string; labelEn: string; tipSv: string; tipEn: string; icon: string; textColor: string; bg: string; border: string
}> = {
  correct: {
    labelSv: 'Korrekt listad', labelEn: 'Listed correctly',
    tipSv: 'Katalogen visar rätt namn, adress och telefonnummer. Inget behöver göras. Klicka på rutan för att bara visa dessa kataloger.',
    tipEn: 'The directory shows the correct name, address, and phone number. Nothing to do here. Click the card to show only these directories.',
    icon: '✓', textColor: 'text-green-400', bg: 'bg-green-500/10',   border: 'border-green-500/20',
  },
  inconsistent: {
    labelSv: 'Stämmer inte', labelEn: 'Inconsistent',
    tipSv: 'Du finns i katalogen, men någon uppgift avviker — till exempel ett gammalt telefonnummer. Dessa är viktigast att rätta. Klicka på rutan för att se vilka.',
    tipEn: 'You are listed, but some detail differs — for example an old phone number. These matter most to fix. Click the card to see which ones.',
    icon: '⚠', textColor: 'text-mustard', bg: 'bg-mustard/10', border: 'border-mustard/20',
  },
  missing: {
    labelSv: 'Saknas', labelEn: 'Not found',
    tipSv: 'Du finns inte i katalogen alls — en missad chans att synas. Klicka på rutan för att se var du saknas.',
    tipEn: 'You are not listed in the directory at all — a missed chance to be found. Click the card to see where you are missing.',
    icon: '✗', textColor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20',
  },
}

const T = {
  sv: {
    healthScore:      'Hälsopoäng',
    healthTooltip:    'Andelen kontrollerade kataloger där dina uppgifter är helt korrekta. 100 % betyder att namn, adress och telefonnummer stämmer överallt.',
    dirsChecked:      (n: number) => `${n} kataloger kontrollerade`,
    inconsistent:     (n: number) => `${n} ${n === 1 ? 'uppgift stämmer inte' : 'uppgifter stämmer inte'}`,
    inconsistentBody: 'Google jämför dina företagsuppgifter mellan olika kataloger. När de inte stämmer överens litar Google mindre på din profil, och du kan hamna längre ner i sökresultaten. Rätta uppgifterna så syns du bättre på Google Maps.',
    globalDirs:       'Globala kataloger',
    swedishDirs:      'Svenska kataloger',
    footerNote:       'Löpande bevakning av kataloger kräver en DataForSEO-koppling. Uppgifterna ovan är en engångskontroll.',
  },
  en: {
    healthScore:      'Health score',
    healthTooltip:    'The share of checked directories where your details are fully correct. 100% means your name, address, and phone number match everywhere.',
    dirsChecked:      (n: number) => `${n} directories checked`,
    inconsistent:     (n: number) => `${n} inconsistent listing${n === 1 ? '' : 's'}`,
    inconsistentBody: "Google cross-checks your business details across directories. When they don't match, it reduces confidence in your listing and can lower your local search rank. Fix any inconsistencies to improve your Google Maps position.",
    globalDirs:       'Global directories',
    swedishDirs:      'Swedish directories',
    footerNote:       'Live citation monitoring requires a DataForSEO connection. Data above is a one-time audit snapshot.',
  },
}

export default function CitationHealthPage() {
  const { lang } = useLang()
  const L = T[lang]
  const [filter, setFilter] = useState<CitationStatus | 'all'>('all')

  const counts = {
    correct:      MOCK_CITATIONS.filter(c => c.status === 'correct').length,
    inconsistent: MOCK_CITATIONS.filter(c => c.status === 'inconsistent').length,
    missing:      MOCK_CITATIONS.filter(c => c.status === 'missing').length,
  }

  const filtered = MOCK_CITATIONS.filter(c => filter === 'all' || c.status === filter)
  const global  = filtered.filter(c => c.category === 'global')
  const swedish = filtered.filter(c => c.category === 'swedish')

  const healthPct = Math.round((counts.correct / MOCK_CITATIONS.length) * 100)

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6 max-w-3xl">

      {/* Header */}
      <PageHeader
        titleSv="Katalogkoll"
        titleEn="Citation health"
        subSv="Ditt företagsnamn, din adress och ditt telefonnummer i kataloger runt om på nätet. När uppgifterna inte stämmer överens syns du sämre på Google."
        subEn="Your business name, address, and phone number across the top directories. Inconsistent data hurts local rankings."
        sample
      >
        <HelpButton topic="katalogkoll" />
      </PageHeader>

      {/* Score + stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tooltip text={L.healthTooltip}>
          <div className="bg-navy-800 rounded-xl border border-navy-700 px-4 py-4 col-span-1 cursor-default">
            <p className="text-slate-500 text-xs mb-1">{L.healthScore}</p>
            <p className={`text-3xl font-bold tabular-nums ${healthPct >= 70 ? 'text-green-400' : healthPct >= 40 ? 'text-mustard' : 'text-red-400'}`}>
              {healthPct}%
            </p>
            <p className="text-slate-500 text-xs mt-1">{L.dirsChecked(MOCK_CITATIONS.length)}</p>
          </div>
        </Tooltip>
        {(['correct', 'inconsistent', 'missing'] as CitationStatus[]).map(s => {
          const cfg = STATUS_CONFIG[s]
          return (
            <Tooltip key={s} text={lang === 'sv' ? cfg.tipSv : cfg.tipEn}>
              <div className={`rounded-xl border px-4 py-4 cursor-pointer transition-opacity ${cfg.bg} ${cfg.border} ${filter === s ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                onClick={() => setFilter(filter === s ? 'all' : s)}>
                <p className={`text-xs font-medium mb-1 ${cfg.textColor}`}>{lang === 'sv' ? cfg.labelSv : cfg.labelEn}</p>
                <p className={`text-3xl font-bold tabular-nums ${cfg.textColor}`}>{counts[s]}</p>
              </div>
            </Tooltip>
          )
        })}
      </div>

      {/* What is a citation */}
      {counts.inconsistent > 0 && (
        <div className="bg-mustard/8 border border-mustard/20 rounded-xl px-5 py-4">
          <p className="text-mustard text-sm font-medium">{L.inconsistent(counts.inconsistent)}</p>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            {L.inconsistentBody}
          </p>
        </div>
      )}

      {/* Directory list */}
      {[
        { label: L.globalDirs, items: global },
        { label: L.swedishDirs, items: swedish },
      ].map(({ label, items }) => items.length > 0 && (
        <div key={label} className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {items.map(citation => {
            const cfg = STATUS_CONFIG[citation.status]
            return (
              <div key={citation.id} className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-3.5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">{citation.directory}</p>
                    {citation.url && (
                      <ExternalLink href={citation.url}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors">↗</ExternalLink>
                    )}
                  </div>
                  {citation.issues && citation.issues.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {citation.issues.map((issue, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className="text-mustard mt-0.5 shrink-0">·</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full border ${cfg.textColor} ${cfg.bg} ${cfg.border}`}>
                  {cfg.icon} {lang === 'sv' ? cfg.labelSv : cfg.labelEn}
                </span>
              </div>
            )
          })}
        </div>
      ))}

      {/* DataForSEO note */}
      <p className="text-slate-500 text-xs border-t border-navy-700 pt-4">
        {L.footerNote}
      </p>

    </div>
  )
}
