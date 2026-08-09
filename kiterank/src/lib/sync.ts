import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, fetchReviews, fetchPerformance, fetchSCSites, fetchSCQueries, fetchAdsCustomers, fetchAdsCampaigns, fetchAdsKeywords, fetchGA4Properties, fetchGA4Report } from '@/lib/google'
import { categoriseSource } from '@/lib/categorise-source'

const starMap: Record<string, number> = { FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 }

export function calcScores(data: {
  rating: number
  reviewCount: number
  reviewsResponded: number
  postsLast30: number
  photosCount: number
  impressions: number
  websiteClicks: number
  directionRequests: number
}) {
  const reputation = Math.min(100, Math.round(
    (data.rating / 5) * 40 +
    Math.min(data.reviewCount / 200, 1) * 40 +
    (data.reviewsResponded / Math.max(data.reviewCount, 1)) * 20
  ))
  const visibility = Math.min(100, Math.round(Math.min(data.impressions / 5000, 1) * 100))
  const engagement = Math.min(100, Math.round(
    Math.min(data.directionRequests / 100, 1) * 50 +
    Math.min(data.websiteClicks / 200, 1) * 50
  ))
  const content = Math.min(100, Math.round(
    Math.min(data.postsLast30 / 4, 1) * 60 +
    Math.min(data.photosCount / 30, 1) * 40
  ))
  const conversion = data.impressions > 0
    ? Math.min(100, Math.round(((data.websiteClicks + data.directionRequests) / data.impressions) * 1000))
    : 0
  const overall = Math.round((reputation + visibility + engagement + content + conversion) / 5)
  return { overall, reputation, visibility, engagement, content, conversion }
}

// Syncs reviews for a single company. Returns updated review stats or null on failure.
export async function syncReviews(companyId: string) {
  const admin = createAdminClient()

  const { data: conn } = await admin
    .from('google_connections')
    .select('*')
    .eq('company_id', companyId)
    .single()
  if (!conn?.gbp_location_id) return null

  const token = await getValidToken(companyId)
  if (!token) return null

  try {
    const reviews = await fetchReviews(token, conn.gbp_location_id)
    const reviewCount      = reviews.length
    const reviewsResponded = reviews.filter((r: any) => r.reviewReply).length
    const total = reviews.reduce((sum: number, r: any) => sum + (starMap[r.starRating] ?? 0), 0)
    const rating = reviewCount > 0 ? Math.round((total / reviewCount) * 10) / 10 : 0

    if (reviews.length) {
      await admin.from('gbp_reviews').upsert(
        reviews
          .filter((r: any) => starMap[r.starRating])
          .map((r: any) => ({
            company_id:   companyId,
            review_id:    r.reviewId ?? r.name,
            author:       r.reviewer?.displayName ?? 'Anonym',
            rating:       starMap[r.starRating],
            text:         r.comment ?? null,
            published_at: r.createTime ?? null,
            reply:        r.reviewReply?.comment ?? null,
            synced_at:    new Date().toISOString(),
          })),
        { onConflict: 'company_id,review_id' }
      )
    }

    return { reviewCount, reviewsResponded, rating }
  } catch {
    return null
  }
}

// Syncs performance metrics for a single company. Returns perf data or null on failure.
export async function syncPerformance(companyId: string) {
  const admin = createAdminClient()

  const { data: conn } = await admin
    .from('google_connections')
    .select('*')
    .eq('company_id', companyId)
    .single()
  if (!conn?.gbp_location_id) return null

  const token = await getValidToken(companyId)
  if (!token) return null

  try {
    return await fetchPerformance(token, conn.gbp_location_id)
  } catch {
    return null
  }
}

// Saves a snapshot + benchmark scores for a company using provided data.
export async function saveSnapshot(companyId: string, data: {
  rating?: number | null
  reviewCount?: number | null
  reviewsResponded?: number | null
  impressions?: number | null
  websiteClicks?: number | null
  directionRequests?: number | null
}) {
  const admin = createAdminClient()

  const { data: snapshot, error } = await admin
    .from('gbp_snapshots')
    .insert({
      company_id:               companyId,
      rating:                   data.rating                   ?? null,
      review_count:             data.reviewCount              ?? null,
      reviews_responded:        data.reviewsResponded         ?? null,
      impressions_last_30_days: data.impressions              ?? null,
      website_clicks:           data.websiteClicks            ?? null,
      direction_requests:       data.directionRequests        ?? null,
    })
    .select('id')
    .single()

  if (error || !snapshot) return null

  const scores = calcScores({
    rating:            data.rating            ?? 0,
    reviewCount:       data.reviewCount       ?? 0,
    reviewsResponded:  data.reviewsResponded  ?? 0,
    postsLast30:       0,
    photosCount:       0,
    impressions:       data.impressions       ?? 0,
    websiteClicks:     data.websiteClicks     ?? 0,
    directionRequests: data.directionRequests ?? 0,
  })

  await admin.from('benchmark_scores').insert({
    company_id:       companyId,
    snapshot_id:      snapshot.id,
    overall_score:    scores.overall,
    reputation_score: scores.reputation,
    visibility_score: scores.visibility,
    engagement_score: scores.engagement,
    content_score:    scores.content,
    conversion_score: scores.conversion,
  })

  return scores
}

// Syncs Google Ads campaigns and keywords for a company.
export async function syncAds(companyId: string): Promise<boolean> {
  const admin = createAdminClient()

  const { data: conn } = await admin
    .from('google_connections')
    .select('ads_customer_id, refresh_token')
    .eq('company_id', companyId)
    .single()

  if (!conn?.refresh_token) return false

  const token = await getValidToken(companyId)
  if (!token) return false

  // Auto-detect customer ID if not stored
  let customerId = conn.ads_customer_id
  if (!customerId) {
    try {
      const customers = await fetchAdsCustomers(token)
      if (!customers.length) return false
      customerId = customers[0]
      await admin
        .from('google_connections')
        .update({ ads_customer_id: customerId })
        .eq('company_id', companyId)
    } catch {
      return false
    }
  }

  try {
    const [campaigns, keywords] = await Promise.all([
      fetchAdsCampaigns(token, customerId),
      fetchAdsKeywords(token, customerId),
    ])

    // Replace existing data with fresh sync
    await Promise.all([
      admin.from('ads_campaigns').delete().eq('company_id', companyId),
      admin.from('ads_keywords').delete().eq('company_id', companyId),
    ])

    if (campaigns.length) {
      await admin.from('ads_campaigns').insert(
        campaigns.map(c => ({
          company_id:    companyId,
          campaign_id:   c.campaignId,
          name:          c.name,
          status:        c.status,
          spend_micros:  c.spendMicros,
          clicks:        c.clicks,
          impressions:   c.impressions,
          ctr:           c.ctr,
          avg_cpc_micros: c.avgCpcMicros,
          conversions:   c.conversions,
        }))
      )
    }

    if (keywords.length) {
      await admin.from('ads_keywords').insert(
        keywords.map(k => ({
          company_id:    companyId,
          keyword:       k.keyword,
          match_type:    k.matchType,
          spend_micros:  k.spendMicros,
          clicks:        k.clicks,
          impressions:   k.impressions,
          ctr:           k.ctr,
          avg_cpc_micros: k.avgCpcMicros,
          conversions:   k.conversions,
          is_wasted:     k.isWasted,
        }))
      )
    }

    return true
  } catch {
    return false
  }
}

// Syncs Google Analytics 4 data for a company.
export async function syncGA4(companyId: string): Promise<boolean> {
  const admin = createAdminClient()

  const { data: conn } = await admin
    .from('google_connections')
    .select('ga4_property_id, refresh_token')
    .eq('company_id', companyId)
    .single()

  if (!conn?.refresh_token) return false

  const token = await getValidToken(companyId)
  if (!token) return false

  // Auto-detect property ID if not stored
  let propertyId = conn.ga4_property_id
  if (!propertyId) {
    try {
      const properties = await fetchGA4Properties(token)
      if (!properties.length) return false
      propertyId = properties[0]
      await admin
        .from('google_connections')
        .update({ ga4_property_id: propertyId })
        .eq('company_id', companyId)
    } catch {
      return false
    }
  }

  try {
    const report = await fetchGA4Report(token, propertyId)

    // Apply our domain-based sub-classifier on top of GA4's channel group.
    // GA4 handles all non-referral traffic accurately. We only enrich Referral
    // entries with richer labels (Review Site, Community, Directory etc.).
    const incomingSources = report.incomingSources.map(s => ({
      source:   s.source,
      medium:   s.medium,
      category: categoriseSource(s.source, s.channelGroup),
      sessions: s.sessions,
    }))

    await admin.from('ga4_snapshots').insert({
      company_id:           companyId,
      sessions:             report.sessions,
      users:                report.users,
      new_users:            report.newUsers,
      engagement_rate:      report.engagementRate,
      avg_session_duration: report.avgSessionDuration,
      conversions:          report.conversions,
      traffic_sources:      report.sources,
      incoming_sources:     incomingSources,
      geo_sources:          report.geoSources,
      top_pages:            report.topPages,
    })

    return true
  } catch {
    return false
  }
}

// Syncs Search Console query data for a company.
// Replaces all existing SC queries with fresh data from the last 28 days.
export async function syncSearchConsole(companyId: string): Promise<number | null> {
  const admin = createAdminClient()

  const { data: conn } = await admin
    .from('google_connections')
    .select('sc_site_url, refresh_token')
    .eq('company_id', companyId)
    .single()

  if (!conn?.refresh_token) return null

  const token = await getValidToken(companyId)
  if (!token) return null

  // Auto-detect site URL if not stored yet
  let siteUrl = conn.sc_site_url
  if (!siteUrl) {
    try {
      const sites = await fetchSCSites(token)
      if (!sites.length) return null
      siteUrl = sites[0]
      await admin
        .from('google_connections')
        .update({ sc_site_url: siteUrl })
        .eq('company_id', companyId)
    } catch {
      return null
    }
  }

  try {
    const queries = await fetchSCQueries(token, siteUrl)
    if (!queries.length) return 0

    // Replace existing rows for this company with fresh data
    await admin.from('search_console_queries').delete().eq('company_id', companyId)

    await admin.from('search_console_queries').insert(
      queries.map(q => ({
        company_id:  companyId,
        query:       q.query,
        clicks:      q.clicks,
        impressions: q.impressions,
        ctr:         q.ctr,
        position:    q.position,
      }))
    )

    return queries.length
  } catch {
    return null
  }
}
