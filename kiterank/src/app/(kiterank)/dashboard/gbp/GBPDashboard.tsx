'use client'
import { type GBPData } from './types'
import { GBPDashboardTest2 } from './GBPDashboardTest2'

/* Growth/Pro are gone — every mode gets the merged dashboard. The file stays
   as the route's entry point so the page import is untouched. */
export function GBPDashboard({ data }: { data: GBPData }) {
  return <GBPDashboardTest2 data={data} />
}
