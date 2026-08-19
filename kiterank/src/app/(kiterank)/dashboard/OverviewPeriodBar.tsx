'use client'
import { useState } from 'react'
import { PeriodSelector, type Period } from '@/components/dashboard/PeriodSelector'

export function OverviewPeriodBar() {
  const [period, setPeriod] = useState<Period>('Monthly')
  return <PeriodSelector period={period} onChange={setPeriod} />
}
