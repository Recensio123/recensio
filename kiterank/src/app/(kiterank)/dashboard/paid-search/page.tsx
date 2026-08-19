import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PaidSearchDashboard } from './PaidSearchDashboard'
import { type AdsData }        from './types'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { VISA_EXEMPEL } from '@/lib/datalage'

const now          = new Date()
const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
const daysPassed   = now.getDate()

const mockData: AdsData = {
  currency:            'SEK',
  totalSpendMicros:    3_200_000_000,
  totalClicks:         312,
  totalImpressions:    38_000,
  totalConversions:    27,

  // Budget pacing
  monthlyBudgetMicros: 5_000_000_000,
  spentToDateMicros:   3_200_000_000,
  daysInMonth,
  daysPassed,

  // Impression share — metrics.search_impression_share et al.
  searchImpressionShare:     42,
  impressionShareLostBudget: 28,
  impressionShareLostRank:   30,

  // Monthly spend trend — last 6 months
  spendTrend: Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const spendValues = [2_800_000_000, 3_100_000_000, 2_900_000_000, 3_400_000_000, 3_800_000_000, 3_200_000_000]
    return {
      month:       d.toLocaleDateString('en-GB', { month: 'short' }),
      spendMicros: spendValues[i],
    }
  }),

  // metrics.cost_per_conversion — Google's own figure, not spend ÷ conversions
  costPerConversionMicros: 118_500_000,

  // segments.week — last 8 weeks, the same query that returns the months above
  spendTrendWeekly: Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (7 - i) * 7)
    const spendValues = [620_000_000, 710_000_000, 680_000_000, 750_000_000, 720_000_000, 790_000_000, 760_000_000, 740_000_000]
    return {
      month:       d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
      spendMicros: spendValues[i],
    }
  }),

  // segments.year — Ads keeps the account's full history
  spendTrendYearly: Array.from({ length: 3 }, (_, i) => ({
    month:       String(now.getFullYear() - 2 + i),
    spendMicros: [21_400_000_000, 30_200_000_000, 38_700_000_000][i],
  })),

  campaigns: [
    { campaignId: '11111001', budgetId: '21111001', name: 'Emergency Services', status: 'Enabled', dailyBudgetMicros: 150_000_000, spendMicros: 1_240_000_000, clicks: 87,  impressions: 4_200,  conversions: 11, avgCpcMicros: 14_250_000 },
    { campaignId: '11111002', budgetId: '21111002', name: 'Boiler Installation', status: 'Enabled', dailyBudgetMicros: 100_000_000, spendMicros:  890_000_000, clicks: 62,  impressions: 3_100,  conversions:  7, avgCpcMicros: 14_350_000 },
    { campaignId: '11111003', budgetId: '21111003', name: 'Brand',               status: 'Enabled', dailyBudgetMicros:  50_000_000, spendMicros:  450_000_000, clicks: 142, impressions: 1_840,  conversions:  8, avgCpcMicros:  3_170_000 },
    { campaignId: '11111004', budgetId: '21111004', name: 'Display Remarketing', status: 'Enabled', dailyBudgetMicros:  50_000_000, spendMicros:  450_000_000, clicks: 41,  impressions: 28_000, conversions:  1, avgCpcMicros: 10_980_000 },
    { campaignId: '11111005', budgetId: '21111005', name: 'Competitor terms',    status: 'Paused',  dailyBudgetMicros:  20_000_000, spendMicros:  170_000_000, clicks: 12,  impressions:   980,  conversions:  0, avgCpcMicros: 14_170_000 },
  ],

  keywords: [
    // Emergency Services (11111001) — Active
    { keyword: 'emergency plumber stockholm',   matchType: 'Exact',  status: 'Active', campaignId: '11111001', clicks: 42, impressions:   880, ctr: 0.048, avgCpcMicros: 18_000_000, conversions: 8, conversionRate: 0.1905, spendMicros:  756_000_000, isWasted: false, qualityScore: 8, expectedCtr: 'above_average', adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: '24 hour plumber stockholm',     matchType: 'Phrase', status: 'Active', campaignId: '11111001', clicks: 17, impressions:   290, ctr: 0.059, avgCpcMicros: 15_000_000, conversions: 4, conversionRate: 0.2353, spendMicros:  255_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',        adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'plumber stockholm',             matchType: 'Broad',  status: 'Active', campaignId: '11111001', clicks: 22, impressions: 2_400, ctr: 0.009, avgCpcMicros: 32_000_000, conversions: 0, spendMicros:  704_000_000, isWasted: true,  qualityScore: 4, expectedCtr: 'below_average',  adRelevance: 'average',       landingPageExp: 'below_average' },
    // Boiler Installation (11111002) — Active
    { keyword: 'boiler installation stockholm', matchType: 'Phrase', status: 'Active', campaignId: '11111002', clicks: 21, impressions:   310, ctr: 0.068, avgCpcMicros: 16_000_000, conversions: 5, conversionRate: 0.2381, spendMicros:  336_000_000, isWasted: false, qualityScore: 7, expectedCtr: 'above_average', adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'same day plumber stockholm',    matchType: 'Exact',  status: 'Active', campaignId: '11111002', clicks: 28, impressions:   420, ctr: 0.067, avgCpcMicros: 14_000_000, conversions: 6, conversionRate: 0.2143, spendMicros:  392_000_000, isWasted: false, qualityScore: 7, expectedCtr: 'above_average', adRelevance: 'average',       landingPageExp: 'above_average' },
    { keyword: 'frisör stockholm',              matchType: 'Broad',  status: 'Active', campaignId: '11111002', clicks:  5, impressions: 8_800, ctr: 0.001, avgCpcMicros:  4_000_000, conversions: 0, spendMicros:   20_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average',  adRelevance: 'below_average', landingPageExp: 'below_average' },
    // Display Remarketing (11111004) — Active
    { keyword: 'plumber price',                 matchType: 'Broad',  status: 'Active', campaignId: '11111004', clicks:  8, impressions: 1_200, ctr: 0.007, avgCpcMicros:  9_000_000, conversions: 0, spendMicros:   72_000_000, isWasted: true,  qualityScore: 5, expectedCtr: 'average',        adRelevance: 'average',       landingPageExp: 'below_average' },
    // Active — additional keywords
    { keyword: 'blocked drain stockholm',       matchType: 'Exact',  status: 'Active', campaignId: '11111001', clicks: 19, impressions:   410, ctr: 0.046, avgCpcMicros: 16_000_000, conversions: 3, conversionRate: 0.1579, spendMicros:  304_000_000, isWasted: false, qualityScore: 7, expectedCtr: 'above_average', adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'radiator installation',         matchType: 'Phrase', status: 'Active', campaignId: '11111002', clicks: 11, impressions:   220, ctr: 0.050, avgCpcMicros: 15_000_000, conversions: 2, conversionRate: 0.1818, spendMicros:  165_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',       adRelevance: 'average',       landingPageExp: 'average'       },
    { keyword: 'pipe repair stockholm',         matchType: 'Phrase', status: 'Active', campaignId: '11111001', clicks: 16, impressions:   340, ctr: 0.047, avgCpcMicros: 14_000_000, conversions: 2, conversionRate: 0.1250, spendMicros:  224_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',       adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'water heater repair stockholm', matchType: 'Exact',  status: 'Active', campaignId: '11111002', clicks:  7, impressions:   190, ctr: 0.037, avgCpcMicros: 16_000_000, conversions: 1, conversionRate: 0.1429, spendMicros:  112_000_000, isWasted: false, qualityScore: 5, expectedCtr: 'average',       adRelevance: 'average',       landingPageExp: 'average'       },
    { keyword: 'underfloor heating service',    matchType: 'Broad',  status: 'Active', campaignId: '11111002', clicks:  4, impressions: 1_800, ctr: 0.002, avgCpcMicros:  9_000_000, conversions: 0, spendMicros:   36_000_000, isWasted: true,  qualityScore: 4, expectedCtr: 'below_average', adRelevance: 'average',       landingPageExp: 'below_average' },
    { keyword: 'vvs stockholm',                 matchType: 'Broad',  status: 'Active', campaignId: '11111001', clicks:  6, impressions: 2_200, ctr: 0.003, avgCpcMicros: 10_000_000, conversions: 0, spendMicros:   60_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average', adRelevance: 'below_average', landingPageExp: 'below_average' },
    // Paused keywords — individual keywords paused within active campaigns
    { keyword: 'plumber near me',               matchType: 'Phrase', status: 'Paused', campaignId: '11111001', clicks: 31, impressions: 3_100, ctr: 0.010, avgCpcMicros: 13_000_000, conversions: 2, conversionRate: 0.0645, spendMicros:  403_000_000, isWasted: false, qualityScore: 5, expectedCtr: 'average',       adRelevance: 'average',       landingPageExp: 'average'       },
    { keyword: 'bathroom renovation stockholm', matchType: 'Broad',  status: 'Paused', campaignId: '11111001', clicks: 14, impressions: 1_200, ctr: 0.012, avgCpcMicros: 11_000_000, conversions: 0, spendMicros:  154_000_000, isWasted: true,  qualityScore: 4, expectedCtr: 'below_average', adRelevance: 'average',       landingPageExp: 'below_average' },
    { keyword: 'leak detection stockholm',      matchType: 'Exact',  status: 'Paused', campaignId: '11111002', clicks:  9, impressions:   310, ctr: 0.029, avgCpcMicros: 12_000_000, conversions: 1, conversionRate: 0.1111, spendMicros:  108_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',       adRelevance: 'above_average', landingPageExp: 'average'       },
    // Competitor terms campaign (11111005 — campaign itself is Paused)
    { keyword: 'rörmokargruppen stockholm',     matchType: 'Exact',  status: 'Paused', campaignId: '11111005', clicks: 12, impressions:   980, ctr: 0.012, avgCpcMicros: 14_170_000, conversions: 0, spendMicros:  170_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average', adRelevance: 'below_average', landingPageExp: 'below_average' },
    { keyword: 'johanssons vvs stockholm',      matchType: 'Phrase', status: 'Paused', campaignId: '11111005', clicks:  8, impressions:   640, ctr: 0.013, avgCpcMicros: 12_000_000, conversions: 0, spendMicros:   96_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average', adRelevance: 'below_average', landingPageExp: 'below_average' },
    { keyword: 'vvs expressen',                 matchType: 'Exact',  status: 'Paused', campaignId: '11111005', clicks:  5, impressions:   390, ctr: 0.013, avgCpcMicros: 11_000_000, conversions: 0, spendMicros:   55_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average', adRelevance: 'below_average', landingPageExp: 'below_average' },
    { keyword: 'stockholm rörmokeri',           matchType: 'Broad',  status: 'Paused', campaignId: '11111005', clicks:  3, impressions:   280, ctr: 0.011, avgCpcMicros: 10_000_000, conversions: 0, spendMicros:   30_000_000, isWasted: false, qualityScore: 4, expectedCtr: 'average',       adRelevance: 'below_average', landingPageExp: 'below_average' },
    { keyword: 'snabb rörmokare',               matchType: 'Phrase', status: 'Paused', campaignId: '11111001', clicks: 22, impressions:   480, ctr: 0.046, avgCpcMicros: 13_000_000, conversions: 3, conversionRate: 0.1364, spendMicros:  286_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',       adRelevance: 'average',       landingPageExp: 'average'       },
    { keyword: 'vattenläcka hjälp',             matchType: 'Exact',  status: 'Paused', campaignId: '11111001', clicks: 18, impressions:   320, ctr: 0.056, avgCpcMicros: 17_000_000, conversions: 4, conversionRate: 0.2222, spendMicros:  306_000_000, isWasted: false, qualityScore: 7, expectedCtr: 'above_average', adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'installation varmvattenberedare', matchType: 'Broad', status: 'Paused', campaignId: '11111002', clicks:  6, impressions: 1_100, ctr: 0.005, avgCpcMicros:  8_000_000, conversions: 0, spendMicros:   48_000_000, isWasted: true,  qualityScore: 4, expectedCtr: 'below_average', adRelevance: 'average',       landingPageExp: 'below_average' },
  ],

  // Search terms report — actual queries that triggered ads
  searchTerms: [
    // Converting
    { query: 'emergency plumber near me stockholm', clicks: 18, impressions: 340, conversions: 4, spendMicros: 324_000_000, isWasted: false },
    { query: 'plumber available now',               clicks: 12, impressions: 210, conversions: 3, spendMicros: 216_000_000, isWasted: false },
    { query: 'burst pipe repair stockholm',         clicks:  8, impressions: 180, conversions: 2, spendMicros: 144_000_000, isWasted: false },
    // Wasted — enough clicks to be conclusive
    { query: 'cheap plumber stockholm',             clicks: 26, impressions: 490, conversions: 0, spendMicros: 338_000_000, isWasted: true },
    { query: 'how to fix leaking pipe yourself',    clicks: 22, impressions: 580, conversions: 0, spendMicros: 176_000_000, isWasted: true },
    // Still collecting data — too early to judge
    { query: 'plumber salary sweden',               clicks:  3, impressions: 890, conversions: 0, spendMicros:  54_000_000, isWasted: true },
    { query: 'plumber apprenticeship stockholm',    clicks:  4, impressions: 620, conversions: 0, spendMicros:  36_000_000, isWasted: true },
  ],

  // Negative keywords already blocking irrelevant traffic
  negativeKeywords: [
    'plumber job', 'plumber apprenticeship', 'plumber course', 'plumber training',
    'plumber salary', 'become a plumber', 'DIY plumbing', 'plumber tools',
    'plumber supply', 'plumber qualification', 'plumber uniform',
  ],

  // High-intent gaps — not yet in the account
  recommendedKeywords: [
    { keyword: 'water heater repair stockholm',      impressionsPerMonth: 420, avgCpcMicros: 16_000_000 },
    { keyword: 'blocked drain emergency stockholm',  impressionsPerMonth: 310, avgCpcMicros: 14_000_000 },
    { keyword: 'underfloor heating installation',    impressionsPerMonth: 280, avgCpcMicros: 13_000_000 },
  ],

  ads: [
    {
      adId:      'customers/1234567890/adGroupAds/111110~222221',
      campaign:  'Emergency Services',
      headlines: [
        { text: 'Emergency Plumber Stockholm',  performance: 'Best'     },
        { text: '24/7 Available — Call Now',    performance: 'Best'     },
        { text: 'Fast Response Guaranteed',     performance: 'Good'     },
      ],
      descriptions: [
        { text: 'Burst pipe? Blocked drain? Get same-day service from a certified Stockholm plumber.', performance: 'Best' },
        { text: 'Qualified engineers available now. No call-out fee. Free quote. All work guaranteed.', performance: 'Good' },
      ],
      impressions: 4_200,
      clicks:      87,
      ctr:         0.021,
      conversions: 11,
      adStrength:  'Excellent',
    },
    {
      adId:      'customers/1234567890/adGroupAds/111120~222231',
      campaign:  'Boiler Installation',
      headlines: [
        { text: 'Boiler Installation Stockholm', performance: 'Good'     },
        { text: 'Fixed Price — No Surprises',    performance: 'Best'     },
        { text: 'Certified Gas Engineers',       performance: 'Learning' },
      ],
      descriptions: [
        { text: 'New boiler fitted in one day. Trusted by 500+ Stockholm homeowners.',       performance: 'Good'     },
        { text: 'Free quote today. Finance available. All work guaranteed for 2 years.',     performance: 'Learning' },
      ],
      impressions: 3_100,
      clicks:      62,
      ctr:         0.020,
      conversions: 7,
      adStrength:  'Good',
    },
    {
      adId:      'customers/1234567890/adGroupAds/111130~222241',
      campaign:  'Display Remarketing',
      headlines: [
        { text: 'Still Need a Plumber?',        performance: 'Low' },
        { text: 'We Are Ready When You Are',    performance: 'Low' },
      ],
      descriptions: [
        { text: 'Book your appointment today. Fast service across Stockholm.', performance: 'Low' },
      ],
      impressions: 28_000,
      clicks:      41,
      ctr:         0.001,
      conversions: 1,
      adStrength:  'Poor',
    },
  ],

  // Auction insights — ad_group_ad_asset_view competitor data
  auctionInsights: [
    { competitor: 'stockholmsrörmokaren.se', impressionShare: 61, overlapRate: 48, positionAboveRate: 38 },
    { competitor: 'johanssons-vvs.se',       impressionShare: 44, overlapRate: 31, positionAboveRate: 22 },
    { competitor: 'vvsexpressen.se',          impressionShare: 38, overlapRate: 27, positionAboveRate: 19 },
    { competitor: 'vvs-stockholm.se',         impressionShare: 29, overlapRate: 18, positionAboveRate: 14 },
  ],

  // Ad extensions — Google Ads assets resource
  optimizationScore: 74,

  prevPeriod: {
    spendMicros:  2_950_000_000,
    clicks:       278,
    impressions:  34_200,
    conversions:  22,
  },

  sitelinks: [
    { title: 'Emergency Plumber',  description: 'Available 24/7 for urgent callouts', url: 'https://example.com/emergency'  },
    { title: 'Book Online',        description: 'Fast quotes in under 2 minutes',      url: 'https://example.com/book'       },
    { title: 'Our Services',       description: 'Plumbing, heating and drainage',      url: 'https://example.com/services'   },
    { title: 'About Us',           description: 'Certified engineers, since 2005',     url: 'https://example.com/about'      },
  ],

  adExtensions: [
    { type: 'Call',               active: true,  detail: '+46 8 123 456 78', description: 'Your phone number shown alongside the ad — one tap to call directly from search results.'         },
    { type: 'Sitelinks',          active: true,  detail: '4 sitelinks',      description: 'Additional links to specific pages, shown beneath the main ad text.'                             },
    { type: 'Callouts',           active: false,                             description: 'Short selling points like "Free quotes" or "No call-out fee" added below the ad.'               },
    { type: 'Location',           active: false,                             description: 'Your business address displayed in the ad — helps nearby customers find and trust you.'          },
    { type: 'Structured snippets',active: false,                             description: 'A list of specific services you offer, shown as a structured line beneath the ad text.'          },
    { type: 'Lead form',          active: false,                             description: 'A contact form built into the ad — visitors can enquire without visiting your website.'          },
  ],
}

export default async function PaidSearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin.from('companies').select('id, name, industry, city, country, website').eq('user_id', user.id).single()
    : { data: null }

  const { data: campaigns } = company
    ? await admin.from('ads_campaigns').select('*').eq('company_id', company.id).order('spend_micros', { ascending: false })
    : { data: null }

  /* The local ad preview renders from the Google Business Profile, so its
   * figures come from the latest profile snapshot rather than from Ads. No
   * snapshot means no rating to show — the card says so instead of inventing
   * one. The location asset is filled from the same profile, so that card may
   * only claim a connection when one genuinely exists. */
  const { data: snap } = company
    ? await admin.from('gbp_snapshots')
        .select('rating, review_count')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  const { data: conn } = company
    ? await admin.from('google_connections').select('gbp_location_id').eq('company_id', company.id).maybeSingle()
    : { data: null }
  const gbpConnected = !!conn?.gbp_location_id

  const profile = {
    name:    company?.name ?? 'Ditt företag',
    city:    company?.city    ?? undefined,
    website: company?.website ?? undefined,
    rating:  snap?.rating       ?? undefined,
    reviews: snap?.review_count ?? undefined,
  }
  const isLive     = !VISA_EXEMPEL && !!campaigns?.length

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6">
      <PageHeader
        titleSv="Annonser"
        titleEn="Google Ads"
        subSv="Vad annonserna kostar och vad de ger tillbaka"
        subEn="What your ads cost and what they bring back"
        sample={!isLive}
      />

      <PaidSearchDashboard
        data={mockData}
        companyIndustry={company?.industry ?? undefined}
        companyCity={company?.city     ?? undefined}
        companyCountry={company?.country   ?? undefined}
        gbpConnected={gbpConnected}
        profile={profile}
      />
    </div>
  )
}
