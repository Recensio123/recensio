import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncReviews, syncPerformance, saveSnapshot } from '@/lib/sync'

// Called by Vercel cron once per day.
// Syncs performance metrics (impressions, clicks, direction requests) for all companies.
// Google only updates these metrics daily so syncing more often is wasteful.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: connections } = await admin
    .from('google_connections')
    .select('company_id')
    .not('refresh_token', 'is', null)

  if (!connections?.length) return NextResponse.json({ synced: 0 })

  const results = await Promise.allSettled(
    connections.map(async ({ company_id }) => {
      const [reviews, perf] = await Promise.all([
        syncReviews(company_id),
        syncPerformance(company_id),
      ])
      await saveSnapshot(company_id, {
        rating:            reviews?.rating,
        reviewCount:       reviews?.reviewCount,
        reviewsResponded:  reviews?.reviewsResponded,
        impressions:       perf?.impressions,
        websiteClicks:     perf?.websiteClicks,
        directionRequests: perf?.directionRequests,
      })
    })
  )

  const synced = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ synced, total: connections.length })
}
