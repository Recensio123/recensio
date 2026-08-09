'use client'
import { type AdsData } from './types'
import { PaidSearchDashboardTest2 } from './PaidSearchDashboardTest2'

/* Growth/Pro are gone — every mode gets the merged dashboard. The file stays
   as the route's entry point so the page import is untouched. */

type Props = {
  data:             AdsData
  companyIndustry?: string
  companyCity?:     string
  companyCountry?:  string
}

export function PaidSearchDashboard({ data, companyIndustry, companyCity, companyCountry }: Props) {
  return (
    <PaidSearchDashboardTest2
      data={data}
      companyIndustry={companyIndustry}
      companyCity={companyCity}
      companyCountry={companyCountry}
    />
  )
}
