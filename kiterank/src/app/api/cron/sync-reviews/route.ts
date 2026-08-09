import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncReviews, syncPerformance, saveSnapshot } from '@/lib/sync'

// Called by Vercel cron every 15 minutes.
// Syncs reviews for all connected companies.
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
      const reviews = await syncReviews(company_id)
      if (!reviews) return

      // For the review cron, keep the latest performance data from the last snapshot
      const { data: last } = await admin
        .from('gbp_snapshots')
        .select('impressions_last_30_days, website_clicks, direction_requests')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      await saveSnapshot(company_id, {
        rating:            reviews.rating,
        reviewCount:       reviews.reviewCount,
        reviewsResponded:  reviews.reviewsResponded,
        impressions:       last?.impressions_last_30_days,
        websiteClicks:     last?.website_clicks,
        directionRequests: last?.direction_requests,
      })
    })
  )

  const synced = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ synced, total: connections.length })
}
