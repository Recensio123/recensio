'use client'
import { Tooltip } from '@/components/Tooltip'
import { useLang, type Lang } from '@/components/LanguageProvider'
import type { Coverage } from '@/components/DataCoverageProvider'
import type { Period } from '@/components/dashboard/PeriodSelector'

const fmtDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

const fmtMonth = (d: Date, lang: Lang) =>
  d.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { month: 'long', year: 'numeric' })

const PREV_PERIOD: Record<Lang, Record<Period, string>> = {
  sv: { Weekly: 'föregående vecka', Monthly: 'föregående månad', Yearly: 'föregående år' },
  en: { Weekly: 'the previous week', Monthly: 'the previous month', Yearly: 'the previous year' },
}

const FULL_PERIOD: Record<Lang, Record<Period, string>> = {
  sv: { Weekly: 'en hel vecka', Monthly: 'en hel månad', Yearly: 'ett helt år' },
  en: { Weekly: 'a full week', Monthly: 'a full month', Yearly: 'a full year' },
}

/**
 * Stands in for the change badge when the comparison behind it is incomplete.
 * Deliberately neutral in colour — missing history is not bad news, and a
 * percentage built on a partial period would read as fact while being wrong.
 */
export function CoverageNote({ coverage, period }: { coverage: Coverage; period: Period }) {
  const { lang } = useLang()
  if (coverage.state === 'full') return null

  const started = coverage.startedAt ? fmtDate(coverage.startedAt, lang) : null
  const unlock  = coverage.unlockAt  ? fmtMonth(coverage.unlockAt,  lang) : null
  const prev    = PREV_PERIOD[lang][period]
  const full    = FULL_PERIOD[lang][period]

  let label: string
  let tip:   string

  if (coverage.state === 'since-start') {
    label = lang === 'sv' ? 'Sedan start' : 'Since we started'
    tip = started
      ? lang === 'sv'
        ? `Vi började mäta ${started}, så det här är inte ${full} ännu. Siffran stämmer — den täcker bara tiden vi mätt.`
        : `We started measuring on ${started}, so this is not ${full} yet. The number is accurate — it just covers the time we have measured.`
      : lang === 'sv'
        ? 'Vi har ingen data för den här källan ännu. Den fylls på så fort kopplingen är igång.'
        : 'We have no data for this source yet. It starts filling up as soon as the connection is live.'
  } else if (coverage.state === 'no-comparison') {
    label = lang === 'sv' ? 'Ingen jämförelse än' : 'No comparison yet'
    tip = lang === 'sv'
      ? `Vi har mätt sedan ${started}, så det finns inget ${prev} att jämföra med.${unlock ? ` Jämförelsen låses upp i ${unlock}.` : ''}`
      : `We have been measuring since ${started}, so there is no data from ${prev} to compare against.${unlock ? ` The comparison unlocks in ${unlock}.` : ''}`
  } else {
    label = lang === 'sv' ? 'Ofullständig jämförelse' : 'Partial comparison'
    const pct = Math.round(coverage.comparisonCoverage * 100)
    tip = lang === 'sv'
      ? `Vi har bara ${pct} % av ${prev} att jämföra mot, så en procentsiffra skulle bli missvisande.${unlock ? ` Full jämförelse från ${unlock}.` : ''}`
      : `We only hold ${pct}% of ${prev} to compare against, so a percentage here would be misleading.${unlock ? ` Full comparison from ${unlock}.` : ''}`
  }

  return (
    <Tooltip text={tip}>
      <span className="inline-flex items-center gap-1 text-xs text-slate-400 border border-navy-600 rounded-full px-2 py-0.5 cursor-default">
        <span className="text-slate-500">—</span>
        {label}
      </span>
    </Tooltip>
  )
}

/**
 * One line of context under a heading or chart, naming the day our record
 * begins so a short axis explains itself.
 */
export function MeasuringSince({ coverage, className = '' }: { coverage: Coverage; className?: string }) {
  const { lang } = useLang()
  if (coverage.state === 'full' || !coverage.startedAt) return null

  const started = fmtDate(coverage.startedAt, lang)
  return (
    <p className={`text-xs text-slate-500 ${className}`}>
      {lang === 'sv'
        ? `Vi har mätt sedan ${started}.`
        : `We have been measuring since ${started}.`}
    </p>
  )
}
