import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PaidSearchDashboardTest2 } from './PaidSearchDashboardTest2'
import { type AdsData }        from './types'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { dataläge, harSiffror } from '@/lib/datalage'
import { visaExempel } from '@/lib/datalage.server'
import { TomtLage } from '@/components/dashboard/TomtLage'

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
    { campaignId: '11111001', budgetId: '21111001', name: 'Färg & slingor', status: 'Enabled', dailyBudgetMicros: 150_000_000, spendMicros: 1_240_000_000, clicks: 87,  impressions: 4_200,  conversions: 11, avgCpcMicros: 14_250_000 },
    { campaignId: '11111002', budgetId: '21111002', name: 'Klippning', status: 'Enabled', dailyBudgetMicros: 100_000_000, spendMicros:  890_000_000, clicks: 62,  impressions: 3_100,  conversions:  7, avgCpcMicros: 14_350_000 },
    { campaignId: '11111003', budgetId: '21111003', name: 'Brand',               status: 'Enabled', dailyBudgetMicros:  50_000_000, spendMicros:  450_000_000, clicks: 142, impressions: 1_840,  conversions:  8, avgCpcMicros:  3_170_000 },
    { campaignId: '11111004', budgetId: '21111004', name: 'Återannonsering', status: 'Enabled', dailyBudgetMicros:  50_000_000, spendMicros:  450_000_000, clicks: 41,  impressions: 28_000, conversions:  1, avgCpcMicros: 10_980_000 },
    { campaignId: '11111005', budgetId: '21111005', name: 'Konkurrentord',    status: 'Paused',  dailyBudgetMicros:  20_000_000, spendMicros:  170_000_000, clicks: 12,  impressions:   980,  conversions:  0, avgCpcMicros: 14_170_000 },
  ],

  keywords: [
    // Färg & slingor (11111001) — Active
    { keyword: 'balayage stockholm',   matchType: 'Exact',  status: 'Active', campaignId: '11111001', clicks: 42, impressions:   880, ctr: 0.048, avgCpcMicros: 18_000_000, conversions: 8, conversionRate: 0.1905, spendMicros:  756_000_000, isWasted: false, qualityScore: 8, expectedCtr: 'above_average', adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'drop in frisör södermalm',     matchType: 'Phrase', status: 'Active', campaignId: '11111001', clicks: 17, impressions:   290, ctr: 0.059, avgCpcMicros: 15_000_000, conversions: 4, conversionRate: 0.2353, spendMicros:  255_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',        adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'frisör stockholm',             matchType: 'Broad',  status: 'Active', campaignId: '11111001', clicks: 22, impressions: 2_400, ctr: 0.009, avgCpcMicros: 32_000_000, conversions: 0, spendMicros:  704_000_000, isWasted: true,  qualityScore: 4, expectedCtr: 'below_average',  adRelevance: 'average',       landingPageExp: 'below_average' },
    // Klippning (11111002) — Active
    { keyword: 'klippning södermalm', matchType: 'Phrase', status: 'Active', campaignId: '11111002', clicks: 21, impressions:   310, ctr: 0.068, avgCpcMicros: 16_000_000, conversions: 5, conversionRate: 0.2381, spendMicros:  336_000_000, isWasted: false, qualityScore: 7, expectedCtr: 'above_average', adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'frisör södermalm boka',    matchType: 'Exact',  status: 'Active', campaignId: '11111002', clicks: 28, impressions:   420, ctr: 0.067, avgCpcMicros: 14_000_000, conversions: 6, conversionRate: 0.2143, spendMicros:  392_000_000, isWasted: false, qualityScore: 7, expectedCtr: 'above_average', adRelevance: 'average',       landingPageExp: 'above_average' },
    { keyword: 'frisör stockholm',              matchType: 'Broad',  status: 'Active', campaignId: '11111002', clicks:  5, impressions: 8_800, ctr: 0.001, avgCpcMicros:  4_000_000, conversions: 0, spendMicros:   20_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average',  adRelevance: 'below_average', landingPageExp: 'below_average' },
    // Återannonsering (11111004) — Active
    { keyword: 'frisör pris',                 matchType: 'Broad',  status: 'Active', campaignId: '11111004', clicks:  8, impressions: 1_200, ctr: 0.007, avgCpcMicros:  9_000_000, conversions: 0, spendMicros:   72_000_000, isWasted: true,  qualityScore: 5, expectedCtr: 'average',        adRelevance: 'average',       landingPageExp: 'below_average' },
    // Active — additional keywords
    { keyword: 'bruduppsättning södermalm',       matchType: 'Exact',  status: 'Active', campaignId: '11111001', clicks: 19, impressions:   410, ctr: 0.046, avgCpcMicros: 16_000_000, conversions: 3, conversionRate: 0.1579, spendMicros:  304_000_000, isWasted: false, qualityScore: 7, expectedCtr: 'above_average', adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'slingor helhuvud',         matchType: 'Phrase', status: 'Active', campaignId: '11111002', clicks: 11, impressions:   220, ctr: 0.050, avgCpcMicros: 15_000_000, conversions: 2, conversionRate: 0.1818, spendMicros:  165_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',       adRelevance: 'average',       landingPageExp: 'average'       },
    { keyword: 'herrklippning södermalm',         matchType: 'Phrase', status: 'Active', campaignId: '11111001', clicks: 16, impressions:   340, ctr: 0.047, avgCpcMicros: 14_000_000, conversions: 2, conversionRate: 0.1250, spendMicros:  224_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',       adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'keratinbehandling stockholm', matchType: 'Exact',  status: 'Active', campaignId: '11111002', clicks:  7, impressions:   190, ctr: 0.037, avgCpcMicros: 16_000_000, conversions: 1, conversionRate: 0.1429, spendMicros:  112_000_000, isWasted: false, qualityScore: 5, expectedCtr: 'average',       adRelevance: 'average',       landingPageExp: 'average'       },
    { keyword: 'hårvårdsprodukter köpa',    matchType: 'Broad',  status: 'Active', campaignId: '11111002', clicks:  4, impressions: 1_800, ctr: 0.002, avgCpcMicros:  9_000_000, conversions: 0, spendMicros:   36_000_000, isWasted: true,  qualityScore: 4, expectedCtr: 'below_average', adRelevance: 'average',       landingPageExp: 'below_average' },
    { keyword: 'salong stockholm',                 matchType: 'Broad',  status: 'Active', campaignId: '11111001', clicks:  6, impressions: 2_200, ctr: 0.003, avgCpcMicros: 10_000_000, conversions: 0, spendMicros:   60_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average', adRelevance: 'below_average', landingPageExp: 'below_average' },
    // Paused keywords — individual keywords paused within active campaigns
    { keyword: 'frisör nära mig',               matchType: 'Phrase', status: 'Paused', campaignId: '11111001', clicks: 31, impressions: 3_100, ctr: 0.010, avgCpcMicros: 13_000_000, conversions: 2, conversionRate: 0.0645, spendMicros:  403_000_000, isWasted: false, qualityScore: 5, expectedCtr: 'average',       adRelevance: 'average',       landingPageExp: 'average'       },
    { keyword: 'hårtransplantation stockholm', matchType: 'Broad',  status: 'Paused', campaignId: '11111001', clicks: 14, impressions: 1_200, ctr: 0.012, avgCpcMicros: 11_000_000, conversions: 0, spendMicros:  154_000_000, isWasted: true,  qualityScore: 4, expectedCtr: 'below_average', adRelevance: 'average',       landingPageExp: 'below_average' },
    { keyword: 'toning södermalm',      matchType: 'Exact',  status: 'Paused', campaignId: '11111002', clicks:  9, impressions:   310, ctr: 0.029, avgCpcMicros: 12_000_000, conversions: 1, conversionRate: 0.1111, spendMicros:  108_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',       adRelevance: 'above_average', landingPageExp: 'average'       },
    // Konkurrentord campaign (11111005 — campaign itself is Paused)
    { keyword: 'hairstudio söder stockholm',     matchType: 'Exact',  status: 'Paused', campaignId: '11111005', clicks: 12, impressions:   980, ctr: 0.012, avgCpcMicros: 14_170_000, conversions: 0, spendMicros:  170_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average', adRelevance: 'below_average', landingPageExp: 'below_average' },
    { keyword: 'salong nordin södermalm',      matchType: 'Phrase', status: 'Paused', campaignId: '11111005', clicks:  8, impressions:   640, ctr: 0.013, avgCpcMicros: 12_000_000, conversions: 0, spendMicros:   96_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average', adRelevance: 'below_average', landingPageExp: 'below_average' },
    { keyword: 'klippoteket söder',                 matchType: 'Exact',  status: 'Paused', campaignId: '11111005', clicks:  5, impressions:   390, ctr: 0.013, avgCpcMicros: 11_000_000, conversions: 0, spendMicros:   55_000_000, isWasted: true,  qualityScore: 3, expectedCtr: 'below_average', adRelevance: 'below_average', landingPageExp: 'below_average' },
    { keyword: 'frisörer på södermalm',           matchType: 'Broad',  status: 'Paused', campaignId: '11111005', clicks:  3, impressions:   280, ctr: 0.011, avgCpcMicros: 10_000_000, conversions: 0, spendMicros:   30_000_000, isWasted: false, qualityScore: 4, expectedCtr: 'average',       adRelevance: 'below_average', landingPageExp: 'below_average' },
    { keyword: 'frisör utan bokning',               matchType: 'Phrase', status: 'Paused', campaignId: '11111001', clicks: 22, impressions:   480, ctr: 0.046, avgCpcMicros: 13_000_000, conversions: 3, conversionRate: 0.1364, spendMicros:  286_000_000, isWasted: false, qualityScore: 6, expectedCtr: 'average',       adRelevance: 'average',       landingPageExp: 'average'       },
    { keyword: 'akut frisörtid',             matchType: 'Exact',  status: 'Paused', campaignId: '11111001', clicks: 18, impressions:   320, ctr: 0.056, avgCpcMicros: 17_000_000, conversions: 4, conversionRate: 0.2222, spendMicros:  306_000_000, isWasted: false, qualityScore: 7, expectedCtr: 'above_average', adRelevance: 'above_average', landingPageExp: 'average'       },
    { keyword: 'hårförlängning stockholm', matchType: 'Broad', status: 'Paused', campaignId: '11111002', clicks:  6, impressions: 1_100, ctr: 0.005, avgCpcMicros:  8_000_000, conversions: 0, spendMicros:   48_000_000, isWasted: true,  qualityScore: 4, expectedCtr: 'below_average', adRelevance: 'average',       landingPageExp: 'below_average' },
  ],

  // Search terms report — actual queries that triggered ads
  searchTerms: [
    // Converting
    { query: 'balayage södermalm boka', clicks: 18, impressions: 340, conversions: 4, spendMicros: 324_000_000, isWasted: false },
    { query: 'frisör ledig tid idag',               clicks: 12, impressions: 210, conversions: 3, spendMicros: 216_000_000, isWasted: false },
    { query: 'slingor södermalm pris',         clicks:  8, impressions: 180, conversions: 2, spendMicros: 144_000_000, isWasted: false },
    // Wasted — enough clicks to be conclusive
    { query: 'billig frisör stockholm',             clicks: 26, impressions: 490, conversions: 0, spendMicros: 338_000_000, isWasted: true },
    { query: 'färga håret själv hemma',    clicks: 22, impressions: 580, conversions: 0, spendMicros: 176_000_000, isWasted: true },
    // Still collecting data — too early to judge
    { query: 'frisörlön sverige',               clicks:  3, impressions: 890, conversions: 0, spendMicros:  54_000_000, isWasted: true },
    { query: 'frisörutbildning stockholm',    clicks:  4, impressions: 620, conversions: 0, spendMicros:  36_000_000, isWasted: true },
  ],

  // Negative keywords already blocking irrelevant traffic
  negativeKeywords: [
    'frisörjobb', 'frisörlärling', 'frisörkurs', 'frisörskola',
    'frisörlön', 'bli frisör', 'klippa själv', 'frisörsax köpa',
    'grossist hårprodukter', 'frisörexamen', 'frisörkläder',
  ],

  // High-intent gaps — not yet in the account
  recommendedKeywords: [
    { keyword: 'keratinbehandling stockholm',      impressionsPerMonth: 420, avgCpcMicros: 16_000_000 },
    { keyword: 'bruduppsättning stockholm',  impressionsPerMonth: 310, avgCpcMicros: 14_000_000 },
    { keyword: 'hårförlängning södermalm',    impressionsPerMonth: 280, avgCpcMicros: 13_000_000 },
  ],

  ads: [
    {
      adId:      'customers/1234567890/adGroupAds/111110~222221',
      campaign:  'Färg & slingor',
      headlines: [
        { text: 'Balayage på Södermalm',  performance: 'Best'     },
        { text: 'Boka online — dygnet runt',    performance: 'Best'     },
        { text: 'Ledig tid redan i veckan',     performance: 'Good'     },
      ],
      descriptions: [
        { text: 'Balayage, slingor och toning av färgspecialist. Boka online, se lediga tider direkt.', performance: 'Best' },
        { text: 'Konsultation ingår före varje färgning. Utbildade färgspecialister på Södermalm.', performance: 'Good' },
      ],
      impressions: 4_200,
      clicks:      87,
      ctr:         0.021,
      conversions: 11,
      adStrength:  'Excellent',
    },
    {
      adId:      'customers/1234567890/adGroupAds/111120~222231',
      campaign:  'Klippning',
      headlines: [
        { text: 'Klippning Stockholm', performance: 'Good'     },
        { text: 'Fast pris — inga tillägg',    performance: 'Best'     },
        { text: 'Erfarna frisörer',       performance: 'Learning' },
      ],
      descriptions: [
        { text: 'Klippning från 450 kr. Boka online och välj din frisör själv.',       performance: 'Good'     },
        { text: 'Öppet till 19 på vardagar. Lördagar 10–17. Mitt på Södermalm.',     performance: 'Learning' },
      ],
      impressions: 3_100,
      clicks:      62,
      ctr:         0.020,
      conversions: 7,
      adStrength:  'Good',
    },
    {
      adId:      'customers/1234567890/adGroupAds/111130~222241',
      campaign:  'Återannonsering',
      headlines: [
        { text: 'Fortfarande sugen på ny färg?',        performance: 'Low' },
        { text: 'Vi har tider kvar den här veckan',    performance: 'Low' },
      ],
      descriptions: [
        { text: 'Boka din tid på Studio Söder. Lediga tider varje vecka.', performance: 'Low' },
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
    { competitor: 'salongnordin.se',    impressionShare: 61, overlapRate: 48, positionAboveRate: 38 },
    { competitor: 'hairstudiosoder.se', impressionShare: 44, overlapRate: 31, positionAboveRate: 22 },
    { competitor: 'klippoteket.se',     impressionShare: 38, overlapRate: 27, positionAboveRate: 19 },
    { competitor: 'frisorsodermalm.se', impressionShare: 29, overlapRate: 18, positionAboveRate: 14 },
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
    { title: 'Balayage',    description: 'Färgspecialist, konsultation ingår',   url: 'https://studiosoder.se/tjanster/balayage' },
    { title: 'Boka online', description: 'Se lediga tider direkt',              url: 'https://studiosoder.se/boka'              },
    { title: 'Prislista',   description: 'Klippning, färg och behandlingar',    url: 'https://studiosoder.se/tjanster'          },
    { title: 'Om oss',      description: 'Tre frisörer på Södermalm sedan 2016', url: 'https://studiosoder.se/om-oss'           },
  ],

  adExtensions: [
    { type: 'Call',               active: true,  detail: '070 123 45 67', description: 'Your phone number shown alongside the ad — one tap to call directly from search results.'         },
    { type: 'Sitelinks',          active: true,  detail: '4 sitelinks',      description: 'Additional links to specific pages, shown beneath the main ad text.'                             },
    { type: 'Callouts',           active: false,                             description: 'Short selling points like "Boka online" eller "Öppet till 19" added below the ad.'               },
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
    ? await admin.from('google_connections').select('gbp_location_id, ads_customer_id').eq('company_id', company.id).maybeSingle()
    : { data: null }
  const gbpConnected = !!conn?.gbp_location_id

  const profile = {
    name:    company?.name ?? 'Ditt företag',
    city:    company?.city    ?? undefined,
    website: company?.website ?? undefined,
    rating:  snap?.rating       ?? undefined,
    reviews: snap?.review_count ?? undefined,
  }
  /* Utan annonskonto och utan kampanjer visas ingenting. Att fylla vyn med
     påhittade kampanjer för den som inte annonserar är att beskriva en
     verksamhet som inte finns. */
  const läge   = dataläge({ kopplat: !!conn?.ads_customer_id, harData: !!campaigns?.length, exempel: await visaExempel() })
  const isLive     = läge === 'egen'

  /* Rubriken står kvar även när det inte finns något att visa. En flik som
     tappar sitt namn ser trasig ut; en som behåller det ser tom ut, vilket
     är sanningen. */
  if (!harSiffror(läge)) return (
    <div className="px-4 sm:px-8 py-6 space-y-6">
      <PageHeader
        titleSv="Annonser"
        titleEn="Google Ads"
        subSv="Vad annonserna kostar och vad de ger tillbaka"
        subEn="What your ads cost and what they bring back"
      />
      <TomtLage källa="ads" läge={läge} />
    </div>
  )

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6">
      <PageHeader
        titleSv="Annonser"
        titleEn="Google Ads"
        subSv="Vad annonserna kostar och vad de ger tillbaka"
        subEn="What your ads cost and what they bring back"
        sample={!isLive}
      />

      <PaidSearchDashboardTest2
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
