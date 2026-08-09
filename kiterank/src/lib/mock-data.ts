export const mockSnapshot = {
  company_name: 'Your Business',
  industry: 'plumber',
  city: 'Stockholm',
  geo: 'SE',
  rating: 4.2,
  review_count: 38,
  reviews_responded: 14,
  last_post_date: '2026-04-08',
  posts_last_30_days: 1,
  photos_count: 12,
  impressions_last_30_days: 1840,
  searches_last_30_days: 420,
  direction_requests: 34,
  website_clicks: 67,
  search_queries: [
    { query: 'plumber near me', impressions: 210 },
    { query: 'emergency plumber stockholm', impressions: 145 },
    { query: 'burst pipe repair', impressions: 89 },
    { query: 'boiler installation stockholm', impressions: 54 },
    { query: 'drain unblocking', impressions: 41 },
  ],
}

export const mockKeywordInsights = {
  trends: [
    { keyword: 'plumber stockholm', trend: 22, peakMonth: 8, currentInterest: 74, rising: true, declining: false },
    { keyword: 'emergency plumber', trend: 41, peakMonth: 11, currentInterest: 88, rising: true, declining: false },
    { keyword: 'boiler installation', trend: -8, peakMonth: 9, currentInterest: 45, rising: false, declining: false },
    { keyword: 'drain unblocking', trend: 18, peakMonth: 3, currentInterest: 52, rising: true, declining: false },
    { keyword: 'pipe repair stockholm', trend: -19, peakMonth: 1, currentInterest: 31, rising: false, declining: true },
  ],
  risingQueries: [
    { query: 'same day plumber stockholm', growth: 350 },
    { query: 'plumber price per hour stockholm', growth: 280 },
    { query: 'bathroom renovation plumber', growth: 210 },
    { query: 'plumber reviews stockholm', growth: 175 },
    { query: 'certified plumber near me', growth: 140 },
    { query: 'plumber weekends stockholm', growth: 120 },
  ],
}

export const mockBenchmarks = {
  overall_score: 54,
  reputation_score: 48,
  visibility_score: 61,
  engagement_score: 40,
  content_score: 35,
  conversion_score: 72,
  top_performer_avg: 83,
}

export const mockActions: Array<{
  priority: number
  title: string
  description: string
  template: string | null
  impact: 'high' | 'medium' | 'low'
}> = [
  {
    priority: 1,
    title: 'Get 12 more Google reviews this month',
    description: 'You have 38 reviews. Top performers in your category average 180+. Send a review request to your last 20 customers — here\'s a message you can copy.',
    template: 'Hi [Name], thanks for choosing us! We\'d really appreciate it if you could leave us a quick Google review — it helps other local customers find us. Here\'s the link: [your GBP link]',
    impact: 'high',
  },
  {
    priority: 2,
    title: 'Post a Google Business update today',
    description: 'Your last post was 47 days ago. Top performers post weekly. Google rewards active profiles with better visibility in Maps.',
    template: null,
    impact: 'high',
  },
  {
    priority: 3,
    title: 'Respond to your 24 unanswered reviews',
    description: 'You\'ve responded to 14 of 38 reviews (37%). Top performers respond to 100%. Responding signals to Google that you\'re an active, trustworthy business.',
    template: null,
    impact: 'medium',
  },
]
