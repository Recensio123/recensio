import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, fetchReviews, fetchLocationCategory, fetchPerformance, fetchSCSites, fetchSCQueries, fetchSCDagar, väljSCSajt, fetchAdsCustomers, fetchAdsCampaigns, fetchAdsKeywords, fetchGA4Properties, fetchGA4Stream, väljGA4Property, fetchGA4Report, type GA4Window } from '@/lib/google'
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

    /* The category rides along with the review sync rather than getting its
       own schedule — it changes about as often as the business name, and one
       call a day is plenty. A failure here must not lose the reviews. */
    try {
      const category = await fetchLocationCategory(token, conn.gbp_location_id)
      if (category) {
        await admin.from('google_connections').update({
          gbp_primary_category_id:    category.id,
          gbp_primary_category_label: category.label,
        }).eq('company_id', companyId)
      }
    } catch { /* category is a nice-to-have; reviews are the point */ }

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

  /*
   * Vilket annonskonto.
   *
   * Tog tidigare det första i listan, en gång, för alltid. Har salongen haft
   * en byrå ligger byråns konton ofta kvar i deras åtkomst, och då hämtade vi
   * någon annans annonssiffror — utan att något såg fel ut.
   *
   * Nu väljs bara när valet är entydigt. Google ger ingen adress eller något
   * annat att matcha på här, till skillnad från GA4-propertyn, så flera konton
   * går inte att skilja åt härifrån. Då är det bättre att inte hämta något:
   * en tom vy leder till en fråga, fel siffror leder till fel beslut.
   *
   * Kvar att bygga: ett val i panelen för den som har flera. Tills dess är den
   * kunden osynlig i annonsvyn i stället för felaktigt beskriven.
   */
  let customerId = conn.ads_customer_id
  try {
    const customers = await fetchAdsCustomers(token)
    if (!customers.length) return false

    /* Ett sparat konto som inte längre finns i åtkomsten är inte längre
       giltigt — då väljs om i stället för att fortsätta fråga efter det. */
    if (customerId && !customers.includes(customerId)) customerId = null

    if (!customerId && customers.length === 1) {
      customerId = customers[0]
      await admin
        .from('google_connections')
        .update({ ads_customer_id: customerId })
        .eq('company_id', companyId)
    }
  } catch {
    /* Listan kunde inte hämtas. Ett redan sparat konto duger. */
  }

  if (!customerId) return false

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
/**
 * Adresserna salongens sajt faktiskt svarar på.
 *
 * Både den egna domänen och vår tillfälliga, eftersom en property kan ha
 * skapats när sajten låg hos oss och sedan behållits efter domänbytet.
 */
async function sajtensAdresser(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<string[]> {
  const adresser: string[] = []
  try {
    const { data: company } = await admin
      .from('companies').select('slug').eq('id', companyId).maybeSingle()
    if (company?.slug) adresser.push(`kiterank.se/s/${company.slug}`)
  } catch { /* saknad rad är inget fel här */ }
  try {
    const { data: doms } = await admin
      .from('custom_domains')
      .select('domain')
      .eq('company_id', companyId)
      .not('verified_at', 'is', null)
    for (const d of doms ?? []) adresser.push(d.domain as string)
  } catch { /* custom_domains inte migrerad */ }
  return adresser
}

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

  /*
   * Vilken property, och vilken mätström.
   *
   * Frågan ställs varje synk och inte bara första gången. Tre skäl, och alla
   * tre ger fel som inte syns någonstans förrän någon undrar varför graferna
   * är platta:
   *
   *   En salong kopplar Google innan propertyn har någon webbström — ofta
   *   innan propertyn finns. Frågade vi bara den gången fick sajten aldrig
   *   någon tagg, och ingenting sa till.
   *
   *   Strömmar byts ut. Ett sparat id kan peka på en ström som inte längre tar
   *   emot. Sidan laddar, taggen kör, datan når ingen.
   *
   *   Och den första propertyn i listan är inte nödvändigtvis salongens. En
   *   som haft en byrå har ofta flera liggande. Adressen får avgöra i stället
   *   för ordningen — se väljGA4Property.
   *
   * Kostnaden är ett par API-anrop per kund och dygn.
   */
  let propertyId = conn.ga4_property_id
  try {
    const properties = await fetchGA4Properties(token)
    if (properties.length) {
      const strömmar = await Promise.all(properties.map(p => fetchGA4Stream(token, p)))
      const vald     = väljGA4Property(strömmar, await sajtensAdresser(admin, companyId), propertyId)

      if (vald) {
        propertyId = vald.propertyId
        const patch: Record<string, string> = { ga4_property_id: vald.propertyId }
        if (vald.measurementId) patch.ga4_measurement_id = vald.measurementId
        try {
          await admin.from('google_connections').update(patch).eq('company_id', companyId)
        } catch {
          /* ga4_measurement_id inte migrerad ännu — propertyn ska sparas ändå. */
          await admin
            .from('google_connections')
            .update({ ga4_property_id: vald.propertyId })
            .eq('company_id', companyId)
        }
      }
    }
  } catch { /* Adminanropet kan fela; en redan sparad property duger då. */ }

  if (!propertyId) return false

  try {
    /* One row per window. The dashboard's selector switches between them, so a
       week has to be a week Google measured rather than a month divided by 4.3
       in the browser. Three reports, fetched together. */
    const windows: GA4Window[] = ['Weekly', 'Monthly', 'Yearly']
    const reports = await Promise.all(
      windows.map(w => fetchGA4Report(token, propertyId, w)),
    )

    await admin.from('ga4_snapshots').insert(
      reports.map((report, i) => ({
        company_id:           companyId,
        period:               windows[i],
        sessions:             report.sessions,
        users:                report.users,
        new_users:            report.newUsers,
        engagement_rate:      report.engagementRate,
        avg_session_duration: report.avgSessionDuration,
        conversions:          report.conversions,
        traffic_sources:      report.sources,
        // Our domain-based sub-classifier on top of GA4's channel group. GA4
        // handles all non-referral traffic accurately; we only enrich Referral
        // entries with richer labels (Review Site, Community, Directory etc.).
        incoming_sources:     report.incomingSources.map(s => ({
          source:   s.source,
          medium:   s.medium,
          category: categoriseSource(s.source, s.channelGroup),
          sessions: s.sessions,
        })),
        geo_sources:          report.geoSources,
        top_pages:            report.topPages,

        /* The five the tabs read and the sync never filled. Age and gender come
           back empty whenever Google's sample is too small, which is the normal
           case for a neighbourhood salon — the panel says so rather than
           drawing a bar out of three people. */
        device_mobile:        report.devices.mobile,
        device_desktop:       report.devices.desktop,
        device_tablet:        report.devices.tablet,
        demo_age:             report.ageBrackets,
        demo_gender:          report.genders,
        traffic_by_hour:      report.byHour,
        traffic_by_day:       report.byDay,
        pages:                report.pages,
      })),
    )

    return true
  } catch {
    return false
  }
}

/**
 * Search Console: sökorden för fönstret, och dygnen bakom dem.
 *
 * Två skrivningar, båda som upsert. Att köra funktionen två gånger ger samma
 * resultat som att köra den en gång, och en natt som missades lagas nästa
 * körning eftersom hela 28-dagarsfönstret hämtas varje gång.
 *
 * Sökorden skrevs tidigare med radera-och-skriv-om. Det höll tabellen ren men
 * utan transaktion runt sig: föll skrivningen efter raderingen stod salongen
 * utan sökord till nästa dygn. Nu skrivs raderna över på plats, och de som
 * inte längre finns kvar hos Google städas bort efteråt — i den ordningen, så
 * det aldrig finns ett ögonblick då tabellen är tom.
 */
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

  /*
   * Vilken property. Frågan ställs varje synk och inte bara första gången —
   * samma skäl som för GA4-propertyn: en sajt kan verifieras efter att kunden
   * kopplade, och en sparad property kan sluta gälla. Valet självt ligger i
   * väljSCSajt, som matchar mot salongens egna adresser i stället för att ta
   * första bästa.
   */
  let siteUrl = conn.sc_site_url
  try {
    const sites = await fetchSCSites(token)
    const vald  = väljSCSajt(sites, await sajtensAdresser(admin, companyId), siteUrl)
    if (vald && vald !== siteUrl) {
      siteUrl = vald
      await admin
        .from('google_connections')
        .update({ sc_site_url: siteUrl })
        .eq('company_id', companyId)
    }
  } catch {
    /* Listan kunde inte hämtas. En redan sparad property duger. */
  }

  if (!siteUrl) return null

  try {
    const [queries, dagar] = await Promise.all([
      fetchSCQueries(token, siteUrl),
      fetchSCDagar(token, siteUrl),
    ])

    /* Dygnsraderna först. De är historiken, och de ska in även en dag då
       sökordslistan råkar komma tom tillbaka. */
    if (dagar.length) {
      await admin.from('search_console_daily').upsert(
        dagar.map(d => ({
          company_id:  companyId,
          date:        d.date,
          clicks:      d.clicks,
          impressions: d.impressions,
          position:    d.position,
          synced_at:   new Date().toISOString(),
        })),
        { onConflict: 'company_id,date' },
      )
    }

    if (!queries.length) return 0

    const nu = new Date().toISOString()
    await admin.from('search_console_queries').upsert(
      queries.map(q => ({
        company_id:  companyId,
        query:       q.query,
        clicks:      q.clicks,
        impressions: q.impressions,
        ctr:         q.ctr,
        position:    q.position,
        synced_at:   nu,
      })),
      { onConflict: 'company_id,query' },
    )

    /* Sökord som inte längre finns i fönstret. De skrevs inte över nyss, så
       deras synced_at är äldre än den här körningens — det är hela testet. */
    await admin
      .from('search_console_queries')
      .delete()
      .eq('company_id', companyId)
      .lt('synced_at', nu)

    return queries.length
  } catch {
    return null
  }
}
