'use client'
import { type Query } from './KeywordTable'
import { type TrendPoint } from './TrendChart'
import { SEODashboardTest2 } from './SEODashboardTest2'

/* Growth/Pro are gone — every mode gets the merged dashboard. The file stays
   as the route's entry point so the page import is untouched. */

type PrevData = { clicks: number; impressions: number; avgPosition: number }

interface WeeklyMovers {
  gained:   Array<{ query: string; position: number }>
  lost:     Array<{ query: string; positionPrev: number }>
  improved: Array<{ query: string; position: number; positionPrev: number }>
  dropped:  Array<{ query: string; position: number; positionPrev: number }>
}

type PaidData = {
  spend:     number
  spendPrev: number
  sessions:  number
  keywords:  number
}

export function SEODashboard({ queries, trend, prev, isLive, brandedPct, paid = null, weeklyMovers }: {
  queries:       Query[]
  trend:         TrendPoint[]
  prev:          PrevData
  isLive:        boolean
  brandedPct:    number
  paid?:         PaidData | null
  weeklyMovers?: WeeklyMovers
}) {
  return <SEODashboardTest2 queries={queries} trend={trend} prev={prev} isLive={isLive} brandedPct={brandedPct} paid={paid} weeklyMovers={weeklyMovers} />
}
