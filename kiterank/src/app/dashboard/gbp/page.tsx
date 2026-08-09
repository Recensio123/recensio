import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, fetchMediaItems, type MediaItem } from '@/lib/google'
import { GBPDashboard } from './GBPDashboard'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { type GBPData } from './types'

const now = new Date()

const mockData: GBPData = {
  averageRating:     4.2,
  totalReviews:      47,
  unansweredReviews: 3,

  monthlyViews:      8_400,
  searchViews:       3_780,   // 45% branded / direct
  mapsViews:         4_620,   // 55% discovery via category search
  callClicks:        124,
  directionRequests: 98,
  websiteClicks:     90,
  prevMonthViews:    7_100,
  prevMonthActions:  276,

  daysSincePost: 47,

  recentReviews: [
    { author: 'Anna S.',   rating: 5, text: 'Excellent service, really happy with the result!',      publishedAt: '2026-05-20T09:00:00Z' },
    { author: 'Marcus L.', rating: 3, text: 'Good work but took longer than expected.',              publishedAt: '2026-05-14T14:30:00Z' },
    { author: 'Sofia K.',  rating: 5, text: 'Very professional team. Would definitely recommend.',   publishedAt: '2026-05-08T11:15:00Z' },
  ],

  lastPost: {
    text:        'Spring campaign now live — check out our latest offers and get in touch for a free consultation.',
    publishedAt: '2026-04-10T10:00:00Z',
  },

  mediaItems: [
    { name: 'mock/1', mediaFormat: 'PHOTO', category: 'COVER',    googleUrl: 'https://picsum.photos/seed/gbp1/800/600', thumbnailUrl: 'https://picsum.photos/seed/gbp1/400/300', createTime: '2026-03-12T10:00:00Z', viewCount: 847, source: 'OWNER'    },
    { name: 'mock/2', mediaFormat: 'PHOTO', category: 'EXTERIOR', googleUrl: 'https://picsum.photos/seed/gbp2/800/600', thumbnailUrl: 'https://picsum.photos/seed/gbp2/400/300', createTime: '2026-01-15T14:30:00Z', viewCount: 423, source: 'OWNER'    },
    { name: 'mock/3', mediaFormat: 'PHOTO', category: 'AT_WORK',  googleUrl: 'https://picsum.photos/seed/gbp3/800/600', thumbnailUrl: 'https://picsum.photos/seed/gbp3/400/300', createTime: '2025-12-20T09:15:00Z', viewCount: 312, source: 'OWNER'    },
    { name: 'mock/4', mediaFormat: 'PHOTO', category: 'EXTERIOR', googleUrl: 'https://picsum.photos/seed/gbp4/800/600', thumbnailUrl: 'https://picsum.photos/seed/gbp4/400/300', createTime: '2025-11-10T11:00:00Z', viewCount: 198, source: 'CUSTOMER' },
    { name: 'mock/5', mediaFormat: 'PHOTO', category: 'AT_WORK',  googleUrl: 'https://picsum.photos/seed/gbp5/800/600', thumbnailUrl: 'https://picsum.photos/seed/gbp5/400/300', createTime: '2025-10-05T16:45:00Z', viewCount:  89, source: 'CUSTOMER' },
  ],

  description: '',                   // not yet filled in — hasDescription = false
  phone:       '+46 8 123 456 78',   // already set — hasPhone = true

  regularHours: [
    { openDay: 'MONDAY',    openTime: '08:00', closeDay: 'MONDAY',    closeTime: '17:00' },
    { openDay: 'TUESDAY',   openTime: '08:00', closeDay: 'TUESDAY',   closeTime: '17:00' },
    { openDay: 'WEDNESDAY', openTime: '08:00', closeDay: 'WEDNESDAY', closeTime: '17:00' },
    { openDay: 'THURSDAY',  openTime: '08:00', closeDay: 'THURSDAY',  closeTime: '17:00' },
    { openDay: 'FRIDAY',    openTime: '08:00', closeDay: 'FRIDAY',    closeTime: '17:00' },
    { openDay: 'SATURDAY',  openTime: '09:00', closeDay: 'SATURDAY',  closeTime: '13:00' },
    // Sunday absent = closed
  ],

  services: [],  // empty = hasServices: false (so the audit shows it as missing)

  audit: {
    hasDescription: false,   // not yet filled in — biggest missing item
    hasPhone:       true,
    hasHours:       true,
    hasServices:    false,   // services/menu not listed
    hasAttributes:  false,   // payment methods, accessibility etc. not set
  },

  viewsTrend: Array.from({ length: 6 }, (_, i) => {
    const d           = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const searchVals  = [2_400, 2_600, 2_900, 3_100, 3_600, 3_780]
    const mapsVals    = [3_400, 3_600, 4_200, 4_500, 5_300, 4_620]
    return {
      month:       d.toLocaleDateString('en-GB', { month: 'short' }),
      searchViews: searchVals[i],
      mapsViews:   mapsVals[i],
    }
  }),
}

export default async function GBPPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin.from('companies').select('id, name').eq('user_id', user.id).single()
    : { data: null }

  const { data: conn } = company
    ? await admin.from('google_connections').select('gbp_location_id, refresh_token').eq('company_id', company.id).single()
    : { data: null }

  const FORCE_MOCK = true
  let liveMediaItems: MediaItem[] = []
  let isLive = false

  if (!FORCE_MOCK && company && conn?.gbp_location_id && conn?.refresh_token) {
    try {
      const token = await getValidToken(company.id)
      if (token) {
        liveMediaItems = await fetchMediaItems(token, conn.gbp_location_id)
        isLive = true
      }
    } catch {
      // GBP API not yet approved — fall back to mock
    }
  }

  const data: GBPData = isLive
    ? { ...mockData, mediaItems: liveMediaItems }
    : mockData

  return (
    <div className="px-4 sm:px-8 py-6">
      <div className="mb-6">
        <PageHeader
          titleSv="Din Google-profil"
          titleEn="Google Business Profile"
          subSv="Recensioner, inlägg och foton på din Google-profil"
          subEn="Reviews, posts, and photos on your Google listing"
          sample={!isLive}
        />
      </div>

      <GBPDashboard data={data} />
    </div>
  )
}
