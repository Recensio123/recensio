import { createAdminClient } from '@/lib/supabase/admin'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ')

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type:    'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

// Uses admin client so it works in both server components and cron routes (no cookies needed).
export async function getValidToken(companyId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: conn } = await admin
    .from('google_connections')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (!conn) return null

  const expiresAt = new Date(conn.token_expires_at).getTime()
  if (Date.now() + 5 * 60 * 1000 < expiresAt) return conn.access_token

  const { access_token, expires_in } = await refreshAccessToken(conn.refresh_token)
  await admin
    .from('google_connections')
    .update({
      access_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    })
    .eq('company_id', companyId)

  return access_token
}

// ── GBP API ──────────────────────────────────────────────────────────────────

export async function fetchAccounts(token: string): Promise<{ name: string; accountName: string }[]> {
  const res = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Accounts: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.accounts ?? []
}

export type GBPLocation = {
  name:       string
  title:      string
  websiteUri?: string
  categories?: {
    primaryCategory?: {
      displayName: string
      name:        string   // e.g. "gcid:plumber"
    }
  }
  storefrontAddress?: {
    regionCode?:         string   // "SE"
    administrativeArea?: string   // "Stockholms Lan"
    locality?:           string   // "Stockholm"
    sublocality?:        string   // "Hägersten"
    postalCode?:         string   // "12660"
    addressLines?:       string[] // ["Hägerstensvägen 132"]
  }
}

export async function fetchLocations(token: string, accountName: string): Promise<GBPLocation[]> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,websiteUri,categories`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Locations: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.locations ?? []
}

export async function fetchReviews(token: string, locationName: string): Promise<any[]> {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.reviews ?? []
}

type PerformanceSummary = {
  impressions: number
  websiteClicks: number
  directionRequests: number
  callClicks: number
}

export async function fetchPerformance(token: string, locationName: string): Promise<PerformanceSummary> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const toDateObj = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() })

  const res = await fetch(
    `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyMetrics: [
          'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
          'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
          'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
          'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
          'CALL_CLICKS',
          'WEBSITE_CLICKS',
          'BUSINESS_DIRECTION_REQUESTS',
        ],
        dailyRange: { startDate: toDateObj(start), endDate: toDateObj(end) },
      }),
    }
  )

  const empty = { impressions: 0, websiteClicks: 0, directionRequests: 0, callClicks: 0 }
  if (!res.ok) return empty

  const data = await res.json()
  const result = { ...empty }

  for (const series of data.multiDailyMetricTimeSeries ?? []) {
    const metric: string = series.dailyMetricTimeSeries?.dailyMetric ?? ''
    const total: number = (series.dailyMetricTimeSeries?.timedValues ?? [])
      .reduce((sum: number, v: any) => sum + Number(v.value ?? 0), 0)
    if (metric.includes('IMPRESSIONS'))           result.impressions       += total
    if (metric === 'WEBSITE_CLICKS')              result.websiteClicks      = total
    if (metric === 'BUSINESS_DIRECTION_REQUESTS') result.directionRequests  = total
    if (metric === 'CALL_CLICKS')                 result.callClicks         = total
  }

  return result
}

export async function replyToReview(token: string, reviewName: string, comment: string) {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    }
  )
  if (!res.ok) throw new Error(`Reply failed: ${await res.text()}`)
  return res.json()
}

export type MediaItem = {
  name:         string
  mediaFormat:  string
  category:     string
  googleUrl:    string
  thumbnailUrl: string
  createTime:   string
  viewCount:    number
  source:       'OWNER' | 'CUSTOMER'   // mediaSourceType from GBP API
}

export async function fetchMediaItems(token: string, locationName: string): Promise<MediaItem[]> {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/media?pageSize=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Media: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return (data.mediaItems ?? []).map((m: any) => ({
    name:         m.name ?? '',
    mediaFormat:  m.mediaFormat ?? 'PHOTO',
    category:     m.locationAssociation?.category ?? 'ADDITIONAL',
    googleUrl:    m.googleUrl ?? '',
    thumbnailUrl: m.thumbnailUrl ?? '',
    createTime:   m.createTime ?? '',
    viewCount:    Number(m.insights?.viewCount ?? 0),
    source:       (m.mediaSourceType === 'CUSTOMER_MEDIA' ? 'CUSTOMER' : 'OWNER') as 'OWNER' | 'CUSTOMER',
  }))
}

export async function createMediaItem(token: string, locationName: string, sourceUrl: string, category: string) {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaFormat: 'PHOTO',
        locationAssociation: { category },
        sourceUrl,
      }),
    }
  )
  if (!res.ok) throw new Error(`Create media: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function deleteMediaItem(token: string, mediaName: string) {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${mediaName}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Delete media: ${res.status} ${await res.text()}`)
}

export type PostCTAType = 'LEARN_MORE' | 'SIGN_UP' | 'SHOP' | 'ORDER_ONLINE' | 'BOOK' | 'CALL'

export async function publishPost(
  token: string,
  locationName: string,
  options: { text: string; imageUrl?: string; ctaType?: PostCTAType; ctaUrl?: string }
) {
  const body: Record<string, unknown> = {
    languageCode: 'en',
    summary:      options.text,
    topicType:    'STANDARD',
  }
  if (options.imageUrl) {
    body.media = [{ mediaFormat: 'PHOTO', sourceUrl: options.imageUrl }]
  }
  if (options.ctaType) {
    body.callToAction = { actionType: options.ctaType, url: options.ctaUrl ?? '' }
  }
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  )
  if (!res.ok) throw new Error(`Post failed: ${await res.text()}`)
  return res.json()
}

// ── Search Console API ───────────────────────────────────────────────────────

// ── Google Ads API ───────────────────────────────────────────────────────────

const ADS_BASE = 'https://googleads.googleapis.com/v19'

function adsHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type': 'application/json',
  }
}

async function adsQuery(token: string, customerId: string, query: string): Promise<any[]> {
  const res = await fetch(`${ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: 'POST',
    headers: adsHeaders(token),
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Ads query: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.results ?? []
}

export async function fetchAdsCustomers(token: string): Promise<string[]> {
  const res = await fetch(`${ADS_BASE}/customers:listAccessibleCustomers`, {
    headers: adsHeaders(token),
  })
  if (!res.ok) throw new Error(`Ads customers: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return (data.resourceNames ?? []).map((r: string) => r.replace('customers/', ''))
}

export type AdsCampaign = {
  campaignId: string
  name: string
  status: string
  spendMicros: number
  clicks: number
  impressions: number
  ctr: number
  avgCpcMicros: number
  conversions: number
}

export async function fetchAdsCampaigns(token: string, customerId: string): Promise<AdsCampaign[]> {
  const results = await adsQuery(token, customerId, `
    SELECT campaign.id, campaign.name, campaign.status,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.ctr, metrics.average_cpc, metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `)
  return results.map((r: any) => ({
    campaignId:   String(r.campaign?.id ?? ''),
    name:         r.campaign?.name ?? '',
    status:       r.campaign?.status ?? '',
    spendMicros:  Number(r.metrics?.costMicros ?? 0),
    clicks:       Number(r.metrics?.clicks ?? 0),
    impressions:  Number(r.metrics?.impressions ?? 0),
    ctr:          Number(r.metrics?.ctr ?? 0),
    avgCpcMicros: Number(r.metrics?.averageCpc ?? 0),
    conversions:  Number(r.metrics?.conversions ?? 0),
  }))
}

export type AdsKeyword = {
  keyword: string
  matchType: string
  spendMicros: number
  clicks: number
  impressions: number
  ctr: number
  avgCpcMicros: number
  conversions: number
  isWasted: boolean
}

export async function fetchAdsKeywords(token: string, customerId: string): Promise<AdsKeyword[]> {
  const results = await adsQuery(token, customerId, `
    SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.ctr, metrics.average_cpc, metrics.conversions
    FROM keyword_view
    WHERE segments.date DURING LAST_30_DAYS
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 100
  `)
  return results.map((r: any) => {
    const spendMicros  = Number(r.metrics?.costMicros ?? 0)
    const conversions  = Number(r.metrics?.conversions ?? 0)
    return {
      keyword:      r.adGroupCriterion?.keyword?.text ?? '',
      matchType:    r.adGroupCriterion?.keyword?.matchType ?? '',
      spendMicros,
      clicks:       Number(r.metrics?.clicks ?? 0),
      impressions:  Number(r.metrics?.impressions ?? 0),
      ctr:          Number(r.metrics?.ctr ?? 0),
      avgCpcMicros: Number(r.metrics?.averageCpc ?? 0),
      conversions,
      isWasted:     spendMicros > 5_000_000 && conversions === 0,
    }
  })
}

// ── Search Console API ───────────────────────────────────────────────────────

export async function fetchSCSites(token: string): Promise<string[]> {
  const res = await fetch(
    'https://www.googleapis.com/webmasters/v3/sites',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`SC sites: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return (data.siteEntry ?? []).map((s: any) => s.siteUrl as string)
}

export type SCQuery = {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export async function fetchSCQueries(token: string, siteUrl: string, days = 28): Promise<SCQuery[]> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate:  fmt(start),
        endDate:    fmt(end),
        dimensions: ['query'],
        rowLimit:   500,
      }),
    }
  )
  if (!res.ok) throw new Error(`SC queries: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return (data.rows ?? []).map((row: any) => ({
    query:       row.keys[0] as string,
    clicks:      row.clicks      as number,
    impressions: row.impressions as number,
    ctr:         row.ctr         as number,
    position:    Math.round(row.position * 10) / 10,
  }))
}

// ── Google Analytics 4 API ───────────────────────────────────────────────────

export async function fetchGA4Properties(token: string): Promise<string[]> {
  const res = await fetch(
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`GA4 properties: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const properties: string[] = []
  for (const account of data.accountSummaries ?? []) {
    for (const prop of account.propertySummaries ?? []) {
      properties.push((prop.property as string).replace('properties/', ''))
    }
  }
  return properties
}

async function runGA4Report(token: string, propertyId: string, body: object): Promise<any> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) throw new Error(`GA4 report: ${res.status} ${await res.text()}`)
  return res.json()
}

export type GA4Report = {
  sessions: number
  users: number
  newUsers: number
  engagementRate: number
  avgSessionDuration: number
  conversions: number
  sources: { channel: string; sessions: number }[]
  incomingSources: { source: string; medium: string; channelGroup: string; sessions: number }[]
  geoSources: { country: string; sessions: number }[]
  topPages: { path: string; sessions: number; engagementRate: number }[]
}

export async function fetchGA4Report(token: string, propertyId: string): Promise<GA4Report> {
  const [summaryData, sourcesData, incomingData, geoData, pagesData] = await Promise.all([
    // Overall summary metrics
    runGA4Report(token, propertyId, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'conversions' },
      ],
    }),
    // Marketing channels (uses GA4's own sessionDefaultChannelGroup)
    runGA4Report(token, propertyId, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
    // Incoming sources: individual domains with GA4's channel group attached
    // We use sessionDefaultChannelGroup here so our categoriser can trust GA4's
    // classification and only sub-classify Referral traffic via domain lookup.
    runGA4Report(token, propertyId, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'sessionDefaultChannelGroup' },
      ],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20,
    }),
    // Geographic distribution
    runGA4Report(token, propertyId, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
    // Top pages
    runGA4Report(token, propertyId, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'sessions' }, { name: 'engagementRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
  ])

  const row = summaryData.rows?.[0]?.metricValues ?? []

  return {
    sessions:           Number(row[0]?.value ?? 0),
    users:              Number(row[1]?.value ?? 0),
    newUsers:           Number(row[2]?.value ?? 0),
    engagementRate:     Number(row[3]?.value ?? 0),
    avgSessionDuration: Number(row[4]?.value ?? 0),
    conversions:        Number(row[5]?.value ?? 0),
    sources: (sourcesData.rows ?? []).map((r: any) => ({
      channel:  r.dimensionValues?.[0]?.value ?? 'Unknown',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
    })),
    incomingSources: (incomingData.rows ?? []).map((r: any) => ({
      source:       r.dimensionValues?.[0]?.value ?? '(direct)',
      medium:       r.dimensionValues?.[1]?.value ?? '(none)',
      channelGroup: r.dimensionValues?.[2]?.value ?? 'Unassigned',
      sessions:     Number(r.metricValues?.[0]?.value ?? 0),
    })),
    geoSources: (geoData.rows ?? []).map((r: any) => ({
      country:  r.dimensionValues?.[0]?.value ?? 'Unknown',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
    })),
    topPages: (pagesData.rows ?? []).map((r: any) => ({
      path:           r.dimensionValues?.[0]?.value ?? '/',
      sessions:       Number(r.metricValues?.[0]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[1]?.value ?? 0),
    })),
  }
}
