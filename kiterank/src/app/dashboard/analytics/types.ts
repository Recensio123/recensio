export type Period = 'Weekly' | 'Monthly' | 'Yearly'
export type Tab    = 'overview' | 'incoming' | 'channels' | 'audience' | 'pages' | 'health' | 'utm'

export type Source = {
  channel:        string
  sessions:       number
  engagementRate: number
  avgDuration:    number
  conversions:    number
  spend?:         number   // paid channels only — local currency
  wow: number
  mom: number
  yoy: number
  topPage: string
  trend:   number[]
}

export type IncomingSource = {
  source:         string
  medium:         string
  category:       string
  sessions:       number
  engagementRate: number
  avgDuration:    number
  change?:        number | null   // MoM % change; null = new source with no prior-period comparison
}

export type TopPage = {
  path:           string
  sessions:       number
  engagementRate: number
}

export type PageData = {
  path:            string
  sessions:        number
  engagementRate:  number
  avgDuration:     number
  impressions:     number | null
  clicks:          number | null
  position:        number | null
  positionChange:  number | null
  topQuery:        string | null
  trend:           number[]
}

export type GeoSource = {
  name:     string   // country name or city name — GA4 supports both
  flag?:    string   // country flag emoji; omit for city-level (displays 📍)
  sessions: number
}

// GA4 Demographics — requires Google Signals enabled on the GA4 property
export type DemographicBucket = {
  label:    string
  sessions: number
}

export type AnalyticsData = {
  website_url:          string
  sessions:             number
  users:                number
  new_users:            number
  engagement_rate:      number
  avg_session_duration: number
  conversions:          number
  sessions_wow:         number
  users_wow:            number
  engagement_wow:       number
  duration_wow:         number
  conversions_wow:      number
  sessions_mom:         number
  users_mom:            number
  engagement_mom:       number
  duration_mom:         number
  conversions_mom:      number
  sessions_yoy:         number
  users_yoy:            number
  engagement_yoy:       number
  duration_yoy:         number
  conversions_yoy:      number
  sessions_trend_wow:    number[]
  sessions_trend_mom:    number[]
  sessions_trend_yoy:    number[]
  users_trend_wow:       number[]
  users_trend_mom:       number[]
  conversions_trend_wow: number[]
  conversions_trend_mom: number[]
  conversions_trend_yoy: number[]
  device_mobile:  number
  device_desktop: number
  device_tablet:  number
  // Device-split engagement — GA4 with device_category dimension
  desktop_avg_duration:    number
  mobile_avg_duration:     number
  desktop_engagement_rate: number
  mobile_engagement_rate:  number
  // Paid channel spend — pulled from Google Ads, stored in local currency
  paid_spend:            number
  paid_spend_prev:       number
  paid_conversions_prev: number
  traffic_sources:  Source[]
  incoming_sources: IncomingSource[]
  geo_sources:      GeoSource[]
  demo_age:         DemographicBucket[]
  demo_gender:      DemographicBucket[]
  demo_interests:   DemographicBucket[]   // GA4 affinity categories — requires Google Signals
  top_pages:        TopPage[]
  pages:            PageData[]
  content_gaps:     ContentGap[]
  // Time-of-day patterns — GA4 'hour' and 'dayOfWeek' dimensions, available in Phase 6
  traffic_by_hour:  number[]   // 24 values, index = hour 0–23
  traffic_by_day:   number[]   // 7 values, index = 0 (Sun) … 6 (Sat)
}

// Queries that appear in Search Console but the site has no dedicated page for.
// Derived server-side by comparing all SC queries against existing page paths — Phase 2.
export type ContentGap = {
  query:       string
  impressions: number
  clicks:      number
}

export type Rating = 'good' | 'needs-improvement' | 'poor'
export type Vital  = { value: string; rating: Rating }
export type VitalsSet = {
  score: number
  lcp:   Vital
  inp:   Vital
  cls:   Vital
  fcp:   Vital
  ttfb:  Vital
}
export type Opportunity = {
  title:       string
  savingMs:    number
  description: string
}
export type IndexingData = {
  indexed:      number
  errors:       number
  excluded:     number
  mobileIssues: number
  errorPages:    { url: string; reason: string }[]
  excludedPages: { url: string; reason: string }[]
}
