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

/*
 * Öppettiderna som Google lämnar dem: en period per dag och intervall, med
 * klockslag uppdelat i timme och minut. En salong som har lunchstängt får två
 * perioder på samma dag, och en som har öppet över midnatt får en period vars
 * stängning ligger på nästa dags kod. Formen är alltså inte "en rad per dag"
 * hur gärna man än vill att den ska vara det.
 */
export type GBPPeriod = {
  openDay?:   string   // "MONDAY"
  closeDay?:  string
  openTime?:  { hours?: number; minutes?: number }
  closeTime?: { hours?: number; minutes?: number }
}

export type GBPLocation = {
  name:       string
  title:      string
  websiteUri?: string
  /* Numret som står på profilen. Det primära först; de övriga är sådant som en
     andra linje eller ett mobilnummer, och vilket av dem som är rätt att visa
     på hemsidan vet bara salongen. */
  phoneNumbers?: {
    primaryPhone?:     string
    additionalPhones?: string[]
  }
  regularHours?: { periods?: GBPPeriod[] }
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
    /* Telefon och öppettider ligger i samma svar och kostar ingenting extra
       att be om. De är dessutom precis de två uppgifter en nybyggd hemsida
       saknar och som är tråkigast att skriva in för hand. */
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,websiteUri,categories,phoneNumbers,regularHours`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Locations: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.locations ?? []
}

/**
 * The primary category on a single Business Profile location.
 *
 * It is what decides which category searches the business can surface for in
 * Maps, and it is the one field about the profile we never stored. Returned as
 * Google's stable id plus the label they showed, so a display rename on their
 * side cannot quietly change what we compare against.
 */
export async function fetchLocationCategory(
  token: string,
  locationName: string,
): Promise<{ id: string; label: string } | null> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=categories`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return null
  const data = await res.json()
  const c = data.categories?.primaryCategory
  return c?.name ? { id: c.name, label: c.displayName ?? c.name } : null
}

/**
 * Google's own category list for a market.
 *
 * Fetched rather than hardcoded: the list is Google's, it differs per country
 * and language, and a category id we cannot find in it is one we must not act
 * on. Callers pass what they are looking for so the reply stays small.
 */
export async function fetchGoogleCategories(
  token: string,
  { regionCode = 'SE', languageCode = 'sv', filter }: { regionCode?: string; languageCode?: string; filter?: string } = {},
): Promise<{ id: string; label: string }[]> {
  const params = new URLSearchParams({
    regionCode, languageCode, view: 'BASIC', pageSize: '100',
    ...(filter ? { filter: `displayName=${filter}` } : {}),
  })
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/categories?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.categories ?? [])
    .filter((c: { name?: string }) => c.name)
    .map((c: { name: string; displayName?: string }) => ({ id: c.name, label: c.displayName ?? c.name }))
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

const SC_BASE = 'https://www.googleapis.com/webmasters/v3/sites'

const scDatum = (d: Date) => d.toISOString().split('T')[0]

/** Ett anrop till searchAnalytics, med den uppdelning anroparen ber om. */
async function scFråga(
  token: string, siteUrl: string, dimension: 'query' | 'date', days: number, rowLimit: number,
): Promise<Record<string, unknown>[]> {
  const end   = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  const res = await fetch(
    `${SC_BASE}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate:  scDatum(start),
        endDate:    scDatum(end),
        dimensions: [dimension],
        rowLimit,
      }),
    }
  )
  if (!res.ok) throw new Error(`SC ${dimension}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return (data.rows ?? []) as Record<string, unknown>[]
}

export async function fetchSCQueries(token: string, siteUrl: string, days = 28): Promise<SCQuery[]> {
  const rows = await scFråga(token, siteUrl, 'query', days, 500)
  return rows.map(row => ({
    query:       (row.keys as string[])[0],
    clicks:      Number(row.clicks),
    impressions: Number(row.impressions),
    ctr:         Number(row.ctr),
    position:    Math.round(Number(row.position) * 10) / 10,
  }))
}

export type SCDag = {
  /** YYYY-MM-DD, dagen Google räknar på. */
  date:        string
  clicks:      number
  impressions: number
  position:    number
}

/**
 * Samma fönster, uppdelat per dygn i stället för per sökord.
 *
 * Det här är vad trendgrafen ritas ur. Hämtas varje synk för hela fönstret och
 * inte bara för gårdagen, av två skäl: Google efterjusterar de senaste dygnens
 * siffror i ett par dagar, och en natt då synken inte kördes lagas av sig själv
 * nästa gång i stället för att bli ett hål i kurvan för alltid.
 */
export async function fetchSCDagar(token: string, siteUrl: string, days = 28): Promise<SCDag[]> {
  const rows = await scFråga(token, siteUrl, 'date', days, 1000)
  return rows.map(row => ({
    date:        (row.keys as string[])[0],
    clicks:      Number(row.clicks),
    impressions: Number(row.impressions),
    position:    Math.round(Number(row.position) * 10) / 10,
  }))
}

/**
 * Vilken av kundens verifierade properties som är deras sajt.
 *
 * Samma fälla som annonskontot hade: `sites[0]` tar första bästa, och en salong
 * som haft en byrå har ofta byråns properties kvar i sin åtkomst. Då mätte vi
 * någon annans sajt utan att något såg fel ut.
 *
 * Skillnaden mot annonskontot är att här finns något att matcha på. En property
 * ÄR en adress, och vi vet vilka adresser salongens sajt svarar på. Matchar en
 * av dem är valet gjort. Matchar ingen, och det finns flera att välja mellan,
 * väljs ingen alls — en tom vy leder till en fråga, fel siffror leder till fel
 * beslut.
 *
 * `sc-domain:exempel.se` är Googles form för en hel domän; `https://exempel.se/`
 * för ett prefix. Båda är samma sajt för oss, så bara värdnamnet jämförs.
 */
export function väljSCSajt(sites: string[], adresser: string[], sparad?: string | null): string | null {
  if (sparad && sites.includes(sparad)) return sparad
  if (!sites.length) return null

  const värd = (s: string): string => {
    const utan = s.startsWith('sc-domain:') ? s.slice('sc-domain:'.length) : s
    try {
      return new URL(utan.includes('://') ? utan : `https://${utan}`).hostname.replace(/^www\./, '')
    } catch {
      return utan.replace(/^www\./, '').replace(/\/$/, '')
    }
  }

  const mina = new Set(adresser.map(a => värd(a)))
  /* Domänproperties först: de täcker både www och undersidor, och är det
     Google själv rekommenderar. */
  const träffar = sites.filter(s => mina.has(värd(s)))
  const domän   = träffar.find(s => s.startsWith('sc-domain:'))
  if (domän) return domän
  if (träffar.length) return träffar[0]

  /* Ingen träff. Bara när det inte finns något att välja mellan är gissningen
     ofarlig. */
  return sites.length === 1 ? sites[0] : null
}

// ── Google Analytics 4 API ───────────────────────────────────────────────────

/**
 * En GA4-property och den webbström som mäter en sajt i den.
 *
 * `url` är strömmens egen uppgift om vilken adress den mäter. Det är den som
 * gör det möjligt att välja rätt property åt en salong som har flera — utan
 * den finns bara ordningen i listan att gå på, och den betyder ingenting.
 */
export type GA4Ström = {
  propertyId:    string
  measurementId: string | null
  url:           string | null
}

/**
 * Mätströmmens id — det som börjar med G- och som taggen på sajten behöver —
 * tillsammans med adressen strömmen säger sig mäta.
 *
 * Property-id:t räcker för att läsa rapporter men inte för att mäta. Strömmens
 * id står i propertyns dataStreams, och hämtas härifrån så ingen salong ska
 * behöva leta rätt på det i Googles gränssnitt. En property kan ha flera
 * strömmar — appar, flera sajter — så webbströmmen plockas ut uttryckligen.
 *
 * Null när något inte går: en sajt utan tagg är sämre än en med, men ett kast
 * här skulle stoppa hela synkningen av data som redan fungerar.
 */
export async function fetchGA4Stream(
  token: string,
  propertyId: string,
): Promise<GA4Ström> {
  const tom: GA4Ström = { propertyId, measurementId: null, url: null }
  try {
    const res = await fetch(
      `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return tom
    const data = await res.json()
    for (const stream of data.dataStreams ?? []) {
      const web = stream?.webStreamData
      const id  = web?.measurementId
      if (typeof id === 'string' && id.startsWith('G-')) {
        return {
          propertyId,
          measurementId: id,
          url: typeof web?.defaultUri === 'string' ? web.defaultUri : null,
        }
      }
    }
    return tom
  } catch {
    return tom
  }
}

/** Bar värdnamn, gemener, utan www — den form två adresser går att jämföra i. */
function värd(adress: string): string {
  return adress
    .trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.$/, '')
}

/**
 * Vilken property som mäter den här salongens sajt.
 *
 * Tidigare togs helt enkelt den första i listan. Det fungerar för den som har
 * exakt en, och det är fel för alla andra — en salong som haft en byrå har ofta
 * flera properties liggande, och den första kan lika gärna mäta byråns egen
 * sajt eller en tidigare kunds. Då läser vi någon annans siffror och salongen
 * fattar beslut på dem, utan att något ser trasigt ut.
 *
 * Så adressen får avgöra. Matchar ingen ström någon av salongens adresser
 * väljs ingenting alls, om det inte bara finns en enda att välja på. Att inte
 * mäta är ett synligt problem; att mäta fel är ett osynligt.
 */
export function väljGA4Property(
  strömmar: GA4Ström[],
  domäner:  string[],
  nuvarande: string | null,
): GA4Ström | null {
  if (!strömmar.length) return null

  const mina = new Set(domäner.map(värd).filter(Boolean))
  const träff = strömmar.find(s => s.url && mina.has(värd(s.url)))
  if (träff) return träff

  /* Ingen adressträff. Då är den redan valda bättre än ett nytt gissat val —
     byter vi property mellan synkningar hoppar all historik i graferna. */
  const kvar = strömmar.find(s => s.propertyId === nuvarande)
  if (kvar) return kvar

  /* Finns bara en går det inte att välja fel. */
  return strömmar.length === 1 ? strömmar[0] : null
}

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

  /* Everything below was mock-only until now. The tabs read these fields and
     the sync never filled them, so a live account was shown example figures
     for device, age, gender, times of day and the page list. All are measured
     over the same window as the rest of the report. */
  devices:     { mobile: number; desktop: number; tablet: number }   // share, 0–100
  ageBrackets: { label: string; sessions: number }[]
  genders:     { label: string; sessions: number }[]
  byHour:      number[]   // 24 values, index = hour
  byDay:       number[]   // 7 values, index 0 = Sunday
  pages: {
    path:           string
    sessions:       number
    engagementRate: number
    avgDuration:    number
  }[]
}

/*
 * The three windows the dashboard's period selector switches between.
 *
 * Rolling rather than calendar: a salon owner who opens the page on a Monday
 * morning would otherwise see one day of data under "this week" and think the
 * bottom had fallen out. Seven rolling days are always comparable with the
 * seven before them.
 *
 * Every window ends yesterday. Analytics keeps collecting through the current
 * day, so including today makes every figure quietly too low and every
 * comparison against it wrong.
 */
export const GA4_WINDOWS = {
  Weekly:  { startDate: '7daysAgo',   endDate: 'yesterday' },
  Monthly: { startDate: '30daysAgo',  endDate: 'yesterday' },
  Yearly:  { startDate: '365daysAgo', endDate: 'yesterday' },
} as const

export type GA4Window = keyof typeof GA4_WINDOWS

export async function fetchGA4Report(
  token: string,
  propertyId: string,
  window: GA4Window = 'Monthly',
): Promise<GA4Report> {
  const range = GA4_WINDOWS[window]
  const [
    summaryData, sourcesData, incomingData, geoData, pagesData,
    deviceData, ageData, genderData, hourData, dayData, pageListData,
  ] = await Promise.all([
    // Overall summary metrics
    runGA4Report(token, propertyId, {
      dateRanges: [range],
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
      dateRanges: [range],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
    // Incoming sources: individual domains with GA4's channel group attached
    // We use sessionDefaultChannelGroup here so our categoriser can trust GA4's
    // classification and only sub-classify Referral traffic via domain lookup.
    runGA4Report(token, propertyId, {
      dateRanges: [range],
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
      dateRanges: [range],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
    // Top pages
    runGA4Report(token, propertyId, {
      dateRanges: [range],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'sessions' }, { name: 'engagementRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
    // What they browse on
    runGA4Report(token, propertyId, {
      dateRanges: [range],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
    }),
    /* Age and gender come from Google Signals and cover signed-in visitors
       only. For a neighbourhood salon that is a thin slice, and Google
       withholds the split entirely when the sample is too small — an empty
       answer is normal here, and the panel says so rather than inventing one. */
    runGA4Report(token, propertyId, {
      dateRanges: [range],
      dimensions: [{ name: 'userAgeBracket' }],
      metrics: [{ name: 'sessions' }],
    }).catch(() => ({ rows: [] })),
    runGA4Report(token, propertyId, {
      dateRanges: [range],
      dimensions: [{ name: 'userGender' }],
      metrics: [{ name: 'sessions' }],
    }).catch(() => ({ rows: [] })),
    // When the visits arrive
    runGA4Report(token, propertyId, {
      dateRanges: [range],
      dimensions: [{ name: 'hour' }],
      metrics: [{ name: 'sessions' }],
    }),
    runGA4Report(token, propertyId, {
      dateRanges: [range],
      dimensions: [{ name: 'dayOfWeek' }],
      metrics: [{ name: 'sessions' }],
    }),
    // The page list behind "Dina sidor" — deeper than topPages above
    runGA4Report(token, propertyId, {
      dateRanges: [range],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 50,
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

    devices:     deviceShares(deviceData),
    ageBrackets: buckets(ageData),
    genders:     buckets(genderData),
    /* Google indexes the hour 0–23 and the weekday 0–6 with Sunday first, the
       same order the card draws them in. A slot with no visits is missing from
       the answer rather than zero, so the series is built from a zeroed array
       instead of the rows' order. */
    byHour: slots(hourData, 24),
    byDay:  slots(dayData, 7),
    pages: ((pageListData.rows ?? []) as GA4Row[]).map(r => ({
      path:           dim(r) || '/',
      sessions:       num(r, 0),
      engagementRate: num(r, 1),
      avgDuration:    Math.round(Number(r.metricValues?.[2]?.value ?? 0)),
    })),
  }
}

/* The shape every runReport answer comes back in. Typed once so the helpers
   below do not each reach into an untyped blob. */
type GA4Row      = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }
type GA4Response = { rows?: GA4Row[] }

const dim = (r: GA4Row, i = 0) => r.dimensionValues?.[i]?.value ?? ''
const num = (r: GA4Row, i = 0) => Number(r.metricValues?.[i]?.value ?? 0)

/** Device split as whole percentages that add to 100. */
function deviceShares(data: GA4Response): { mobile: number; desktop: number; tablet: number } {
  const rows = data?.rows ?? []
  const get  = (name: string) => {
    const row = rows.find(r => dim(r) === name)
    return row ? num(row) : 0
  }
  const mobile = get('mobile'), desktop = get('desktop'), tablet = get('tablet')
  const total  = mobile + desktop + tablet
  if (!total) return { mobile: 0, desktop: 0, tablet: 0 }
  return {
    mobile:  Math.round((mobile  / total) * 100),
    desktop: Math.round((desktop / total) * 100),
    tablet:  Math.round((tablet  / total) * 100),
  }
}

/** A labelled distribution, dropping the buckets Google returns as unknown. */
function buckets(data: GA4Response): { label: string; sessions: number }[] {
  return (data?.rows ?? [])
    .map(r => ({ label: dim(r), sessions: num(r) }))
    .filter(b => b.label && b.label.toLowerCase() !== 'unknown' && b.sessions > 0)
}

/** A fixed-length series indexed by the dimension's own number. */
function slots(data: GA4Response, length: number): number[] {
  const out = new Array<number>(length).fill(0)
  for (const r of (data?.rows ?? [])) {
    const i = Number(dim(r))
    if (Number.isInteger(i) && i >= 0 && i < length) out[i] = num(r)
  }
  return out
}
