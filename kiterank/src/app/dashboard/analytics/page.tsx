import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SyncButton } from '../connections/SyncButton'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { WebsiteSetupGuide } from './WebsiteSetupGuide'

const mockData = {
  website_url:          'https://www.bbc.com',
  sessions:             1240,
  users:                890,
  new_users:            612,
  engagement_rate:      0.62,
  avg_session_duration: 147,
  conversions:          38,
  // WoW deltas
  sessions_wow:    12,
  users_wow:       8,
  engagement_wow:  3,
  duration_wow:    5,
  conversions_wow: 18,
  // MoM deltas
  sessions_mom:    18,
  users_mom:       14,
  engagement_mom:  5,
  duration_mom:    8,
  conversions_mom: 25,
  // YoY deltas
  sessions_yoy:    34,
  users_yoy:       28,
  engagement_yoy:  12,
  duration_yoy:    15,
  conversions_yoy: 52,
  // Sparklines — WoW: 8 weekly points, MoM: 6 monthly, YoY: 12 monthly
  sessions_trend_wow: [820, 910, 870, 980, 1050, 1020, 1150, 1240],
  sessions_trend_mom: [870, 920, 990, 1050, 1130, 1240],
  sessions_trend_yoy: [700, 720, 760, 800, 840, 880, 920, 960, 1020, 1080, 1160, 1240],
  users_trend_wow:    [590, 640, 620, 710, 760, 740, 830, 890],
  users_trend_mom:    [640, 680, 730, 780, 840, 890],
  conversions_trend_wow: [22, 26, 24, 29, 31, 33, 35, 38],
  conversions_trend_mom: [24, 27, 30, 33, 36, 38],
  conversions_trend_yoy: [14, 16, 18, 20, 22, 24, 26, 28, 31, 34, 36, 38],
  // Devices
  device_mobile:  68,
  device_desktop: 28,
  device_tablet:  4,
  // Device-split engagement — desktop users research more, mobile users are quicker / more transactional
  desktop_avg_duration:    214,   // 3:34
  mobile_avg_duration:     98,    // 1:38
  desktop_engagement_rate: 0.74,
  mobile_engagement_rate:  0.53,
  // Traffic sources with WoW / MoM / YoY + engagement/duration/conversions
  traffic_sources: [
    { channel: 'Organic Search', sessions: 620, engagementRate: 0.74, avgDuration: 198, conversions: 22, wow: 15,  mom: 22,  yoy: 45,  topPage: '/services/plumbing', trend: [540, 562, 578, 591, 608, 620] },
    { channel: 'Direct',         sessions: 298, engagementRate: 0.61, avgDuration: 158, conversions: 8,  wow: 3,   mom: 6,   yoy: 18,  topPage: '/',                  trend: [272, 281, 284, 288, 293, 298] },
    { channel: 'Referral',       sessions: 187, engagementRate: 0.69, avgDuration: 184, conversions: 6,  wow: 8,   mom: 12,  yoy: 25,  topPage: '/contact',           trend: [158, 163, 169, 175, 181, 187] },
    { channel: 'Paid Search',    sessions: 94,  engagementRate: 0.48, avgDuration: 92,  conversions: 12, spend: 1400, wow: 2,   mom: 5,   yoy: 10,  topPage: '/',                  trend: [90,  88,  91,  90,  92,  94]  },
    { channel: 'Organic Social', sessions: 41,  engagementRate: 0.29, avgDuration: 38,  conversions: 0,              wow: -5,  mom: -8,  yoy: -12, topPage: '/about',             trend: [55,  52,  49,  46,  43,  41]  },
    { channel: 'Email',          sessions: 34,  engagementRate: 0.72, avgDuration: 167, conversions: 3,              wow: 12,  mom: 8,   yoy: 22,  topPage: '/contact',           trend: [22,  25,  28,  30,  32,  34]  },
    { channel: 'Display',        sessions: 27,  engagementRate: 0.31, avgDuration: 52,  conversions: 1,  spend: 450,  wow: -3,  mom: 4,   yoy: 15,  topPage: '/',                  trend: [30,  29,  28,  27,  27,  27]  },
    { channel: 'Paid Social',    sessions: 19,  engagementRate: 0.22, avgDuration: 28,  conversions: 0,              wow: -8,  mom: -5,  yoy: 5,   topPage: '/',                  trend: [26,  24,  22,  21,  20,  19]  },
    { channel: 'Gen AI',         sessions: 12,  engagementRate: 0.83, avgDuration: 228, conversions: 2,              wow: 50,  mom: 120, yoy: 0,   topPage: '/services/plumbing', trend: [2,   3,   5,   7,   9,   12]  },
  ],
  incoming_sources: [
    { source: 'google.com',      medium: 'organic',  category: 'Organic Search', sessions: 620, engagementRate: 0.74, avgDuration: 198, change:   3  },
    { source: '(direct)',        medium: '(none)',    category: 'Direct',         sessions: 298, engagementRate: 0.61, avgDuration: 158, change:   2  },
    { source: 'google.com',      medium: 'cpc',      category: 'Paid Search',    sessions: 94,  engagementRate: 0.48, avgDuration: 92,  change:   8  },
    { source: 'reddit.com',      medium: 'referral', category: 'Community',      sessions: 94,  engagementRate: 0.38, avgDuration: 64,  change:  15  },
    { source: 'trustpilot.com',  medium: 'referral', category: 'Review Site',    sessions: 61,  engagementRate: 0.82, avgDuration: 243, change:  12  },
    { source: 'hitta.se',        medium: 'referral', category: 'Directory',      sessions: 32,  engagementRate: 0.66, avgDuration: 171, change:  -2  },
    { source: 'facebook.com',    medium: 'social',   category: 'Social Media',   sessions: 28,  engagementRate: 0.27, avgDuration: 34,  change:  -8  },
    { source: 'instagram.com',   medium: 'social',   category: 'Social Media',   sessions: 13,  engagementRate: 0.23, avgDuration: 28,  change: -15  },
    { source: 'chat.openai.com', medium: 'referral', category: 'Gen AI',         sessions: 8,   engagementRate: 0.87, avgDuration: 241, change: null },
    { source: 'perplexity.ai',   medium: 'referral', category: 'Gen AI',         sessions: 4,   engagementRate: 0.75, avgDuration: 204, change: null },
  ],
  // City-level geo — GA4 'city' dimension, available in Phase 6
  geo_sources: [
    { name: 'Stockholm',  sessions: 892 },
    { name: 'Solna',      sessions: 143 },
    { name: 'Nacka',      sessions: 97  },
    { name: 'Lidingö',    sessions: 65  },
    { name: 'Other',      sessions: 43  },
  ],
  // Demographics — GA4 via Google Signals (must be enabled on the GA4 property)
  demo_age: [
    { label: '18–24', sessions: 50  },
    { label: '25–34', sessions: 224 },
    { label: '35–44', sessions: 348 },
    { label: '45–54', sessions: 311 },
    { label: '55–64', sessions: 199 },
    { label: '65+',   sessions: 112 },
  ],
  demo_gender: [
    { label: 'Male',   sessions: 721 },
    { label: 'Female', sessions: 519 },
  ],
  // GA4 affinity categories via Google Signals — realistic for a home-services company in Stockholm
  demo_interests: [
    { label: 'Home & Garden / Home Improvement',   sessions: 487 },
    { label: 'Real Estate / Property Seekers',      sessions: 312 },
    { label: 'Business / Small Business Owners',    sessions: 289 },
    { label: 'Lifestyle / DIY Enthusiasts',         sessions: 241 },
    { label: 'Finance / Personal Finance',          sessions: 178 },
    { label: 'Other',                               sessions: 983 },
  ],
  // Time patterns — GA4 'hour' and 'dayOfWeek' dimensions, available in Phase 6
  // Represents a plumbing company in Stockholm — morning and after-work peaks, quiet weekends
  traffic_by_hour: [12, 8, 5, 4, 6, 14, 38, 72, 95, 88, 76, 68, 74, 79, 81, 84, 91, 87, 71, 52, 43, 36, 28, 18],
  traffic_by_day:  [82, 198, 212, 221, 215, 187, 125],  // Sun Mon Tue Wed Thu Fri Sat
  // Content gaps — queries from Search Console with no dedicated page on the site.
  // Requires Phase 2 (Search Console integration) to pull live. Mock data represents a plumbing company in Stockholm.
  content_gaps: [
    { query: 'water heater repair stockholm',        impressions: 420, clicks: 3 },
    { query: 'blocked toilet emergency stockholm',   impressions: 310, clicks: 4 },
    { query: 'underfloor heating installation cost', impressions: 340, clicks: 1 },
    { query: 'bathroom renovation plumber',          impressions: 280, clicks: 2 },
    { query: 'burst pipe what to do',                impressions: 230, clicks: 5 },
  ],
  top_pages: [
    { path: '/',                    sessions: 540, engagementRate: 0.58 },
    { path: '/services/plumbing',   sessions: 210, engagementRate: 0.71 },
    { path: '/contact',             sessions: 188, engagementRate: 0.82 },
    { path: '/services/boiler',     sessions: 145, engagementRate: 0.67 },
    { path: '/about',               sessions: 87,  engagementRate: 0.54 },
  ],
  // Paid spend — Google Ads only (Paid Search + Display). Paid Social requires Meta Ads API (not yet integrated).
  paid_spend:            1850,
  paid_spend_prev:       1400,
  paid_conversions_prev: 12,
  // Your pages tab — GA4 landing page + Search Console position/impressions/clicks
  pages: [
    { path: '/',                    sessions: 540, engagementRate: 0.58, avgDuration: 87,  impressions: 2100, clicks: 148, position: 4.2,  positionChange: 0,  topQuery: 'plumber stockholm',            trend: [580, 560, 540, 510, 530, 540] },
    { path: '/services/plumbing',   sessions: 210, engagementRate: 0.71, avgDuration: 198, impressions: 1840, clicks: 132, position: 3.1,  positionChange: 1,  topQuery: 'emergency plumber stockholm',  trend: [170, 180, 185, 195, 205, 210] },
    { path: '/contact',             sessions: 188, engagementRate: 0.82, avgDuration: 234, impressions: 420,  clicks: 41,  position: 8.4,  positionChange: 1,  topQuery: 'plumber price stockholm',       trend: [200, 195, 190, 185, 187, 188] },
    { path: '/services/boiler',     sessions: 145, engagementRate: 0.67, avgDuration: 175, impressions: 960,  clicks: 78,  position: 5.7,  positionChange: -1, topQuery: 'boiler installation stockholm', trend: [160, 155, 148, 142, 143, 145] },
    { path: '/services/drain',      sessions: 64,  engagementRate: 0.74, avgDuration: 188, impressions: 1240, clicks: 58,  position: 6.8,  positionChange: 2,  topQuery: 'drain unblocking stockholm',   trend: [40,  44,  50,  56,  60,  64]  },
    { path: '/about',               sessions: 75,  engagementRate: 0.54, avgDuration: 112, impressions: 310,  clicks: 22,  position: 11.2, positionChange: 0,  topQuery: 'plumber reviews stockholm',     trend: [118, 108, 95,  88,  82,  75]  },
    { path: '/services/heating',    sessions: 21,  engagementRate: 0.63, avgDuration: 162, impressions: 1100, clicks: 9,   position: 14.5, positionChange: 1,  topQuery: 'heating engineer stockholm',    trend: [14,  16,  17,  18,  20,  21]  },
    { path: '/blog/emergency-tips', sessions: 38,  engagementRate: 0.61, avgDuration: 254, impressions: 2800, clicks: 36,  position: 9.1,  positionChange: -2, topQuery: 'emergency plumbing advice',    trend: [55,  50,  47,  43,  40,  38]  },
  ],
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin.from('companies').select('id').eq('user_id', user.id).single()
    : { data: null }

  const { data: snapshot } = company
    ? await admin.from('ga4_snapshots').select('*').eq('company_id', company.id).order('synced_at', { ascending: false }).limit(1).single()
    : { data: null }

  // Without an Analytics property there are no website visits to show — and
  // that is the one gap the customer has to close themselves, so the guide
  // goes here rather than in the onboarding everyone has to pass through.
  const { data: conn } = company
    ? await admin.from('google_connections').select('refresh_token, ga4_property_id').eq('company_id', company.id).single()
    : { data: null }
  const needsSetup = !conn?.ga4_property_id

  const FORCE_MOCK = true
  const isLive = !FORCE_MOCK && !!snapshot
  const data   = isLive ? snapshot : mockData

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6">

      {/* Header */}
      <PageHeader
        titleSv="Hemsida"
        titleEn="Website"
        subSv="Besökare, trafikkällor och hur dina sidor fungerar"
        subEn="Visitors, traffic sources, and how your pages perform"
        sample={!isLive}
      >
        {isLive && (
          <SyncButton lastSynced={snapshot.synced_at ?? null} endpoint="/api/ga4/sync" label="Sync" />
        )}
      </PageHeader>

      {needsSetup && <WebsiteSetupGuide isConnected={!!conn?.refresh_token} />}

      <AnalyticsDashboard data={data as typeof mockData} />

    </div>
  )
}
