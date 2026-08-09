import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncReviews, syncPerformance, saveSnapshot } from '@/lib/sync'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'No company found' }, { status: 404 })

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
