import { type MediaItem } from '@/lib/google'

export type GBPHoursPeriod = {
  openDay:  string  // 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  openTime: string  // '09:00'
  closeDay: string  // same as openDay for normal single-day hours
  closeTime: string // '17:00'
}

export type GBPData = {
  // Profile rating
  averageRating:     number   // e.g. 4.2
  totalReviews:      number
  unansweredReviews: number

  // Monthly insights — GBP Insights API (VIEWS_SEARCH + VIEWS_MAPS, ACTIONS_*)
  monthlyViews:      number   // profile impressions: Search + Maps combined
  searchViews:       number   // VIEWS_SEARCH — people who searched your name/address
  mapsViews:         number   // VIEWS_MAPS   — people who found you via category search
  callClicks:        number   // ACTIONS_PHONE
  directionRequests: number   // ACTIONS_DRIVING_DIRECTIONS
  websiteClicks:     number   // ACTIONS_WEBSITE
  // Previous month — for period-over-period deltas
  prevMonthViews:    number
  prevMonthActions:  number

  // Post freshness
  daysSincePost:     number

  // Photos
  mediaItems:        MediaItem[]

  // Recent reviews for overview preview
  recentReviews: { author: string; rating: number; text: string; publishedAt: string }[]

  // Last post for overview preview
  lastPost: { text: string; publishedAt: string } | null

  // Profile views trend — last 6 months, split by source
  viewsTrend: { month: string; searchViews: number; mapsViews: number }[]

  // Editable profile fields
  description?:   string              // Business description — editable via update-profile API
  phone?:         string              // Primary phone number — editable via update-profile API
  regularHours?:  GBPHoursPeriod[]   // Regular opening hours — editable via update-hours API
  services?:      string[]            // Service names — editable via update-services API

  // Profile completeness audit — pulled from GBP API fields
  audit: {
    hasDescription: boolean   // profile description filled in
    hasPhone:       boolean   // primary phone number set
    hasHours:       boolean   // regular opening hours set
    hasServices:    boolean   // services or menu items listed
    hasAttributes:  boolean   // attributes set (payments, accessibility, etc.)
  }
}
