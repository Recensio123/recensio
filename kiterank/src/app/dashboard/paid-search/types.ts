export type AdStrength           = 'Excellent' | 'Good' | 'Average' | 'Poor'
export type CampaignStatus       = 'Enabled'   | 'Paused'
export type AdsTab               = 'overview'  | 'keywords' | 'ads'
export type MatchType            = 'Broad'     | 'Phrase'   | 'Exact'
export type AssetPerformance     = 'Best' | 'Good' | 'Low' | 'Learning'
// Google Ads QualityScoreBucket — search_predicted_ctr / creative_quality_score / post_click_quality_score
export type QualityScoreComponent = 'above_average' | 'average' | 'below_average' | 'unknown'

export type AdScheduleBlock = {
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  startHour: number   // 0, 6, 12, or 18
  endHour:   number   // 6, 12, 18, or 24
}

export type AdsCampaign = {
  campaignId:        string          // Google Ads campaign ID — needed for pause/enable
  budgetId:          string          // Campaign budget ID — needed for budget edits
  name:              string
  status:            CampaignStatus
  dailyBudgetMicros: number          // Daily budget in micros
  spendMicros:       number
  clicks:            number
  impressions:       number
  conversions:       number
  avgCpcMicros:      number
  schedule?:         AdScheduleBlock[]  // undefined = 24/7 (no restrictions)
}

export type KeywordStatus = 'Active' | 'Paused'

export type AdsKeyword = {
  keyword:       string
  matchType:     MatchType     // Google Ads keyword.match_type
  status?:       KeywordStatus // Google Ads keyword status — defaults to Active when absent
  campaignId?:   string        // parent campaign — used to filter on campaign detail view
  clicks:        number
  impressions:   number
  ctr:           number
  avgCpcMicros:  number
  conversions:   number
  /* metrics.conversions_from_interactions_rate — Google's own conversion rate.
     Dividing conversions by clicks ourselves lands close but not identical,
     because Google counts a conversion against the day of the click. */
  conversionRate?: number
  spendMicros:   number
  isWasted:       boolean
  qualityScore?:  number                // Google Ads QualityScoreInfo.quality_score — 1–10
  // The 3 sub-scores that make up qualityScore — each rated above_average / average / below_average
  expectedCtr?:   QualityScoreComponent // quality_info.search_predicted_ctr
  adRelevance?:   QualityScoreComponent // quality_info.creative_quality_score
  landingPageExp?: QualityScoreComponent // quality_info.post_click_quality_score
}

export type AdsSearchTerm = {
  query:       string
  clicks:      number
  impressions: number
  conversions: number
  spendMicros: number
  isWasted:    boolean
}

export type AdsRecommendedKeyword = {
  keyword:             string
  impressionsPerMonth: number
  avgCpcMicros:        number
}

export type KeywordSuggestion = {
  keyword:    string
  matchType:  'Exact' | 'Phrase'
  category:   string
  cpcDisplay: string    // e.g. "180–250 SEK/click" — human readable
  cpcMicros:  number    // estimated CPC in micros for campaign builder
  reason:     string    // one-line explanation aimed at a non-expert
  priority:   'High' | 'Medium'
}

// Per-asset label from ad_group_ad_asset_view — shows which headlines Google favours
export type AdAsset = {
  text:        string
  performance: AssetPerformance
}

export type AdsAd = {
  adId:         string        // adGroupAd resource name: 'customers/{cid}/adGroupAds/{adGroupId}~{adId}'
  campaign:     string
  headlines:    AdAsset[]     // up to 15 headlines — Google rates each
  descriptions: AdAsset[]     // up to 4 descriptions — Google rates each
  impressions:  number
  clicks:       number
  ctr:          number
  conversions:  number
  adStrength:   AdStrength    // Google Ads responsive_search_ad_info.ad_strength
}

// Auction insights — metrics.search_impression_share per competitor domain
export type AuctionInsight = {
  competitor:        string   // domain or brand name
  impressionShare:   number   // 0–100: % of eligible auctions they appeared in
  overlapRate:       number   // 0–100: % of your impressions they also appeared in
  positionAboveRate: number   // 0–100: when both showed, % they appeared above you
}

// Ad assets (extensions) — shows which are active and which are missing
export type AdExtension = {
  type:        string
  active:      boolean
  detail?:     string   // e.g. phone number, sitelink count
  description: string   // plain-language explanation for a rookie
}

// Structured sitelink — pulled from CustomerAsset / CampaignAsset (sitelink_asset)
export type AdSitelink = {
  title:       string   // sitelink_asset.link_text — max 25 chars
  description: string   // sitelink_asset.description1 — max 35 chars
  url:         string   // sitelink_asset.final_urls[0]
}

// Structured snippet — pulled from structured_snippet_asset
export type AdSnippet = {
  header: string    // e.g. "Services"
  values: string[]  // up to 10 items
}

// Passed from the campaigns list to the edit panel
export type EditCampaignData = {
  campaign: AdsCampaign
  keywords: AdsKeyword[]
  ad?:      AdsAd
}

export type AdsData = {
  currency:                   string
  // Account-level KPIs
  totalSpendMicros:           number
  totalClicks:                number
  totalImpressions:           number
  totalConversions:           number
  // Budget pacing — derived from campaign_budget.amount_micros + metrics.cost_micros
  monthlyBudgetMicros:        number
  spentToDateMicros:          number
  daysInMonth:                number
  daysPassed:                 number
  // Impression share — metrics.search_impression_share et al.
  searchImpressionShare:      number   // 0–100
  impressionShareLostBudget:  number   // 0–100
  impressionShareLostRank:    number   // 0–100
  // Spend trend — last 6 months
  spendTrend:                 { month: string; spendMicros: number }[]
  // Collections
  campaigns:                  AdsCampaign[]
  keywords:                   AdsKeyword[]
  searchTerms:                AdsSearchTerm[]
  recommendedKeywords:        AdsRecommendedKeyword[]
  negativeKeywords:           string[]
  ads:                        AdsAd[]
  auctionInsights:            AuctionInsight[]
  adExtensions:               AdExtension[]
  sitelinks:                  AdSitelink[]
  snippet?:                   AdSnippet      // undefined = not yet configured
  // Account health
  optimizationScore:          number   // 0–100: customer.optimization_score from Ads API
  // Previous period (last full month) for delta calculations
  prevPeriod: {
    spendMicros:  number
    clicks:       number
    impressions:  number
    conversions:  number
  }

  /* ── Reported by Google, added for the Google-only overview ────────────────
   * Optional so the existing modes keep working untouched.
   *
   * cost_per_conversion is Google's own figure. Dividing spend by conversions
   * ourselves lands close but not identical — Google counts conversions by the
   * time of the click, not the time of the conversion — and a number that
   * disagrees with what the customer sees inside Google Ads makes us look
   * wrong, not precise.
   *
   * The weekly and yearly spend series are segments.week and segments.year on
   * the same query that already returns segments.month. */
  costPerConversionMicros?: number
  spendTrendWeekly?:        { month: string; spendMicros: number }[]
  spendTrendYearly?:        { month: string; spendMicros: number }[]
}
