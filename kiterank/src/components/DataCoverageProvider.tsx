'use client'
import { createContext, useContext, useMemo, useState } from 'react'
import type { Period } from '@/components/dashboard/PeriodSelector'

/**
 * How much history we actually hold per data source.
 *
 * Google does not backfill: Search Console starts logging when the property is
 * registered, and site analytics only exist from the day the tag was installed.
 * A profile that has been live for years arrives with history; a freshly
 * created one arrives empty. So the depth differs per source and per customer,
 * and every comparison on screen has to be checked against it.
 *
 * `startedAt` is the first day we hold data for. Supabase will supply these
 * per company once the daily sync lands; until then they come from the
 * build-time presets below.
 */
export type DataSource = 'gbp' | 'search' | 'ads' | 'website'

export type CoverageState =
  | 'full'                 // period and comparison period both covered
  | 'partial-comparison'   // comparison period only partly covered — a delta here would mislead
  | 'no-comparison'        // period covered, nothing to compare against yet
  | 'since-start'          // the period itself reaches further back than our data

export type Coverage = {
  state:              CoverageState
  startedAt:          Date | null   // null = no data for this source at all
  unlockAt:           Date | null   // the day the comparison becomes complete
  currentCoverage:    number        // 0–1 share of the selected period we hold
  comparisonCoverage: number        // 0–1 share of the preceding period we hold
}

/** A comparison period below this is suppressed rather than shown as a percentage. */
const MIN_COMPARISON_COVERAGE = 0.9

const PERIOD_DAYS: Record<Period, number> = { Weekly: 7, Monthly: 30, Yearly: 365 }

const DAY_MS = 86_400_000

/* ── Build-time presets ──────────────────────────────────────────────────────
   Days of history per source, mirroring the three realistic customer shapes.
   Replaced by real per-company start dates once the sync is in place.        */
export type DepthPreset = 'etablerad' | 'nykund' | 'nystartad'

const PRESETS: Record<DepthPreset, Record<DataSource, number | null>> = {
  // Long-standing customer — everything works, matches the pre-coverage behaviour
  etablerad: { gbp: 1095, search: 1095, ads: 1095, website: 1095 },
  // Just signed: the Google profile and search property have been live for a
  // while, but site analytics was only installed at signup
  nykund:    { gbp: 548, search: 487, ads: 730, website: 12 },
  // Brand-new salon, or a new site built through us — almost nothing yet.
  // Ads starts a few weeks in: signing up and immediately running a campaign
  // is common, and it keeps the trimmed-value case visible on that page.
  // `null` stays supported by the model for a source with no connection.
  nystartad: { gbp: 40, search: 6, ads: 25, website: 5 },
}

type Ctx = {
  preset:    DepthPreset
  setPreset: (p: DepthPreset) => void
  startedAt: Record<DataSource, Date | null>
}

const DataCoverageContext = createContext<Ctx>({
  preset:    'etablerad',
  setPreset: () => {},
  startedAt: { gbp: null, search: null, ads: null, website: null },
})

export function DataCoverageProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<DepthPreset>('etablerad')

  const startedAt = useMemo(() => {
    // Anchor on midnight so the server and the browser agree on the date
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    const days = PRESETS[preset]
    const at = (d: number | null) => (d === null ? null : new Date(midnight.getTime() - d * DAY_MS))
    return {
      gbp:     at(days.gbp),
      search:  at(days.search),
      ads:     at(days.ads),
      website: at(days.website),
    }
  }, [preset])

  return (
    <DataCoverageContext.Provider value={{ preset, setPreset, startedAt }}>
      {children}
    </DataCoverageContext.Provider>
  )
}

/** Work out what we can honestly show for one source over one period. */
export function computeCoverage(startedAt: Date | null, period: Period, now: Date): Coverage {
  const days = PERIOD_DAYS[period]

  if (!startedAt) {
    return { state: 'since-start', startedAt: null, unlockAt: null, currentCoverage: 0, comparisonCoverage: 0 }
  }

  const held    = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS))
  const clamp   = (n: number) => Math.min(1, Math.max(0, n))
  const current = clamp(held / days)
  const compare = clamp((held - days) / days)

  const state: CoverageState =
    current < 0.99                      ? 'since-start'        :
    compare <= 0                        ? 'no-comparison'      :
    compare < MIN_COMPARISON_COVERAGE   ? 'partial-comparison' :
                                          'full'

  return {
    state,
    startedAt,
    unlockAt:           new Date(startedAt.getTime() + 2 * days * DAY_MS),
    currentCoverage:    current,
    comparisonCoverage: compare,
  }
}

/**
 * Coverage for one source over the selected period.
 * `coverage.state === 'full'` means the delta badge is safe to render.
 */
export function useCoverage(source: DataSource, period: Period): Coverage {
  const { startedAt } = useContext(DataCoverageContext)
  return useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return computeCoverage(startedAt[source], period, now)
  }, [startedAt, source, period])
}

/**
 * Trim a period-scaled figure down to the days we actually hold.
 *
 * A yearly total assumes 365 days of measurement. When our record only reaches
 * back 40 days, the honest figure under a "sedan start" heading is the part we
 * measured — not a full year projected from a fraction of it.
 */
export function coveredValue(value: number, coverage: Coverage): number {
  return coverage.state === 'since-start'
    ? Math.round(value * coverage.currentCoverage)
    : value
}

/** Build-time depth switch — read by the sidebar control only. */
export function useDataDepth() {
  const { preset, setPreset } = useContext(DataCoverageContext)
  return { preset, setPreset }
}
