'use client'
import { type AnalyticsData } from './types'
import { AnalyticsDashboardTest2 } from './AnalyticsDashboardTest2'

/* Growth/Pro are gone — every mode gets the merged dashboard. The file stays
   as the route's entry point so the page import is untouched. */
export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  return <AnalyticsDashboardTest2 data={data} />
}
