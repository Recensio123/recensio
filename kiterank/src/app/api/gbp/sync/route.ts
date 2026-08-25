import { NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { syncReviews, syncPerformance, saveSnapshot } from '@/lib/sync'

export async function POST() {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const company = { id: c.id }
const [reviews, perf] = await Promise.all([
    syncReviews(company.id),
    syncPerformance(company.id),
  ])

  const scores = await saveSnapshot(company.id, {
    rating:            reviews?.rating,
    reviewCount:       reviews?.reviewCount,
    reviewsResponded:  reviews?.reviewsResponded,
    impressions:       perf?.impressions,
    websiteClicks:     perf?.websiteClicks,
    directionRequests: perf?.directionRequests,
  })

  return NextResponse.json({ success: true, scores })
}
