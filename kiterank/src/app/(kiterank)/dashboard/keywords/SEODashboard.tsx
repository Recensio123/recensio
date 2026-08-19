'use client'
import { type Query } from './KeywordTable'
import { type TrendPoint } from './TrendChart'
import { SEODashboardTest2 } from './SEODashboardTest2'

/* Growth/Pro are gone — every mode gets the merged dashboard. The file stays
   as the route's entry point so the page import is untouched. */

type PrevData = { clicks: number; impressions: number; avgPosition: number }

type PaidData = {
  spend:     number
  spendPrev: number
  sessions:  number
  keywords:  number
}

export function SEODashboard({ queries, trend, prev, isLive, paid = null }: {
  queries:       Query[]
  trend:         TrendPoint[]
  prev:          PrevData
  isLive:        boolean
  paid?:         PaidData | null
}) {
  return <SEODashboardTest2 queries={queries} trend={trend} prev={prev} isLive={isLive} paid={paid} />
}
