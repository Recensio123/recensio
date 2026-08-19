import { DataForSEODashboard } from './DataForSEODashboard'

const mockBacklinks = {
  total: 847, totalChange: 23,
  referringDomains: 124, referringDomainsChange: 4,
  domainRating: 18, domainRatingChange: 1,
  newThisMonth: 31, lostThisMonth: 8,
  topDomains: [
    { domain: 'trustpilot.com', backlinks: 47, dr: 92, firstSeen: 'Mar 2024' },
    { domain: 'hitta.se',       backlinks: 12, dr: 55, firstSeen: 'Aug 2023' },
    { domain: 'eniro.se',       backlinks: 8,  dr: 51, firstSeen: 'Aug 2023' },
    { domain: 'reco.se',        backlinks: 6,  dr: 48, firstSeen: 'Jan 2024' },
    { domain: 'google.com',     backlinks: 4,  dr: 98, firstSeen: 'Jun 2024' },
    { domain: 'yelp.com',       backlinks: 3,  dr: 89, firstSeen: 'Feb 2024' },
  ],
}

const mockSerpFeatures = {
  tracked: 10,
  features: [
    { name: 'Local Pack',       count: 8, description: 'Google Maps results appear for this keyword' },
    { name: 'People Also Ask',  count: 6, description: 'Expandable question boxes appear in the results' },
    { name: 'Images',           count: 4, description: 'Image carousel appears in the results' },
    { name: 'AI Overview',      count: 3, description: 'Google AI summary appears above organic results' },
    { name: 'Featured Snippet', count: 2, description: 'A highlighted answer box appears at position zero' },
    { name: 'Knowledge Panel',  count: 1, description: 'An info panel about your business appears on the right' },
  ],
}

const mockCompetitors = [
  { domain: 'rorjansen.se',        sharedKeywords: 42, rankingAboveYou: 28, uniqueKeywords: 18, estimatedTraffic: 2800 },
  { domain: 'plumb24stockholm.se', sharedKeywords: 31, rankingAboveYou: 19, uniqueKeywords: 14, estimatedTraffic: 1900 },
  { domain: 'joursrorservice.se',  sharedKeywords: 28, rankingAboveYou: 16, uniqueKeywords: 22, estimatedTraffic: 1600 },
]

const mockKeywordGaps = [
  { keyword: 'jour rörfirma stockholm', volume: 1200, difficulty: 58, bestCompetitorPos: 2 },
  { keyword: 'byta varmvattenberedare', volume: 720,  difficulty: 38, bestCompetitorPos: 4 },
  { keyword: 'rörläggare stockholm',    volume: 590,  difficulty: 51, bestCompetitorPos: 3 },
  { keyword: 'avloppsrensning hemma',   volume: 480,  difficulty: 29, bestCompetitorPos: 7 },
  { keyword: 'vvs jour stockholm',      volume: 880,  difficulty: 44, bestCompetitorPos: 5 },
]

const mockLocalPack = {
  totalKeywords: 5,
  keywords: [
    {
      keyword: 'rörmokarelstockholm',
      yourPosition: 2,
      pack: [
        { name: 'Rörmokaren AB',    position: 1, rating: 4.8, reviews: 124 },
        { name: 'Linus VVS',        position: 2, rating: 4.7, reviews: 31  },
        { name: 'VVS Jour 24',      position: 3, rating: 4.6, reviews: 89  },
      ],
    },
    {
      keyword: 'jour rörfirma stockholm',
      yourPosition: null,
      pack: [
        { name: 'VVS Jour 24',      position: 1, rating: 4.6, reviews: 89  },
        { name: 'Rörmokaren AB',    position: 2, rating: 4.8, reviews: 124 },
        { name: 'Kungsholmen VVS',  position: 3, rating: 4.5, reviews: 67  },
      ],
    },
    {
      keyword: 'byta varmvattenberedare stockholm',
      yourPosition: 3,
      pack: [
        { name: 'Kungsholmen VVS',  position: 1, rating: 4.5, reviews: 67  },
        { name: 'VVS Jour 24',      position: 2, rating: 4.6, reviews: 89  },
        { name: 'Linus VVS',        position: 3, rating: 4.7, reviews: 31  },
      ],
    },
    {
      keyword: 'avloppsrensning stockholm',
      yourPosition: null,
      pack: [
        { name: 'Rörmokaren AB',    position: 1, rating: 4.8, reviews: 124 },
        { name: 'DrainPro',         position: 2, rating: 4.3, reviews: 41  },
        { name: 'Kungsholmen VVS',  position: 3, rating: 4.5, reviews: 67  },
      ],
    },
    {
      keyword: 'vvs jour stockholm',
      yourPosition: null,
      pack: [
        { name: 'VVS Jour 24',      position: 1, rating: 4.6, reviews: 89  },
        { name: 'Rörmokaren AB',    position: 2, rating: 4.8, reviews: 124 },
        { name: 'DrainPro',         position: 3, rating: 4.3, reviews: 41  },
      ],
    },
  ],
  topCompetitors: [
    { name: 'Rörmokaren AB',   appearances: 4, avgPosition: 1.5, rating: 4.8, reviews: 124 },
    { name: 'VVS Jour 24',     appearances: 4, avgPosition: 1.8, rating: 4.6, reviews: 89  },
    { name: 'Kungsholmen VVS', appearances: 3, avgPosition: 2.3, rating: 4.5, reviews: 67  },
    { name: 'DrainPro',        appearances: 2, avgPosition: 2.5, rating: 4.3, reviews: 41  },
  ],
}

export default function DataForSEOPage() {
  return (
    <div className="px-8 py-6 space-y-6">
      <DataForSEODashboard
        backlinks={mockBacklinks}
        serpFeatures={mockSerpFeatures}
        competitors={mockCompetitors}
        keywordGaps={mockKeywordGaps}
        localPack={mockLocalPack}
      />
    </div>
  )
}
