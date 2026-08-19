'use client'
import { type BookingsByPeriod } from './siteBookings'
import { type AnalyticsData } from './types'
import { AnalyticsDashboardTest2 } from './AnalyticsDashboardTest2'

/* Growth/Pro are gone — every mode gets the merged dashboard. The file stays
   as the route's entry point so the page import is untouched. */
export function AnalyticsDashboard({ data, pageTitles, bookings, periods }: { data: AnalyticsData; pageTitles?: Record<string, string>; bookings?: BookingsByPeriod
  /** One measured snapshot per window on a live account; null on example data. */
  periods?: Record<string, AnalyticsData> | null }) {
  return <AnalyticsDashboardTest2 data={data} pageTitles={pageTitles} bookings={bookings} periods={periods} />
}
