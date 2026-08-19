import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, fetchMediaItems, type MediaItem } from '@/lib/google'
import { PhotoUploadButton } from './PhotoUploadButton'
import { Tooltip } from '@/components/Tooltip'
import { VISA_EXEMPEL } from '@/lib/datalage'

type CategoryDef = {
  id: string
  label: string
  description: string
  icon: string
  priority: 'Required' | 'Highly recommended' | 'Recommended'
}

const CATEGORIES: CategoryDef[] = [
  { id: 'COVER',      label: 'Cover photo',  description: 'The first photo people see on your profile',          icon: '🖼',  priority: 'Required' },
  { id: 'PROFILE',    label: 'Logo',         description: 'Your business logo or profile image',                  icon: '◎',  priority: 'Required' },
  { id: 'EXTERIOR',   label: 'Exterior',     description: 'Your building from the outside so people can find you', icon: '🏢',  priority: 'Highly recommended' },
  { id: 'INTERIOR',   label: 'Interior',     description: 'Inside your premises — builds trust and sets expectations', icon: '🪑', priority: 'Highly recommended' },
  { id: 'AT_WORK',    label: 'Team at work', description: 'Your team doing what they do — humanises your business', icon: '👷', priority: 'Highly recommended' },
  { id: 'PRODUCT',    label: 'Work/products', description: 'Examples of your work, services or products',         icon: '🔧',  priority: 'Recommended' },
]

const MOCK_ITEMS: MediaItem[] = [
  { name: 'mock/1', mediaFormat: 'PHOTO', category: 'COVER',    googleUrl: '', thumbnailUrl: '', createTime: '', viewCount: 312, source: 'OWNER' },
  { name: 'mock/2', mediaFormat: 'PHOTO', category: 'EXTERIOR', googleUrl: '', thumbnailUrl: '', createTime: '', viewCount: 198, source: 'OWNER' },
]

export default async function PhotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin.from('companies').select('id, name').eq('user_id', user.id).single()
    : { data: null }

  const { data: conn } = company
    ? await admin.from('google_connections').select('gbp_location_id, refresh_token').eq('company_id', company.id).single()
    : { data: null }
  let mediaItems: MediaItem[] = []
  let isLive = false

  if (!VISA_EXEMPEL && company && conn?.gbp_location_id && conn?.refresh_token) {
    try {
      const token = await getValidToken(company.id)
      if (token) {
        mediaItems = await fetchMediaItems(token, conn.gbp_location_id)
        isLive = true
      }
    } catch {
      // GBP API not yet approved — use mock
    }
  }

  const displayItems = isLive ? mediaItems : MOCK_ITEMS
  const categoriesPresent = new Set(displayItems.map(m => m.category))
  const totalViews = displayItems.reduce((s, m) => s + m.viewCount, 0)
  const missingCount = CATEGORIES.filter(c => !categoriesPresent.has(c.id)).length
  const missingRequired = CATEGORIES.filter(c => !categoriesPresent.has(c.id) && c.priority === 'Required')

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Photos</h1>
          <p className="text-slate-400 text-sm mt-1">Businesses with photos get 42% more direction requests</p>
        </div>
        <div className="flex items-center gap-3">
          {!isLive && (
            <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
              Sample data
            </span>
          )}
          <PhotoUploadButton />
        </div>
      </div>

      {/* Missing required photos alert */}
      {missingRequired.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-1">
          <p className="text-red-400 text-sm font-medium">Missing required photos</p>
          <p className="text-slate-400 text-xs">
            Your profile is missing: {missingRequired.map(c => c.label).join(', ')}. These are the most important photos and directly affect how your listing appears in search.
          </p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total photos',       tooltip: 'How many photos you currently have on your Google business listing.',                                                                                                          value: displayItems.length },
          { label: 'Photo views',        tooltip: 'How many times people have looked at your photos on Google Search and Google Maps.',                                                                                               value: totalViews.toLocaleString('sv-SE') },
          { label: 'Missing categories', tooltip: 'Types of photos you have not uploaded yet. Adding them helps people understand your business better, and a more complete listing tends to show up higher on Google Maps.', value: missingCount, highlight: missingCount > 0 },
        ].map(m => (
          <div key={m.label} className={`bg-navy-800 rounded-xl p-4 border ${m.highlight ? 'border-amber-500/30' : 'border-navy-700'}`}>
            <Tooltip text={m.tooltip}>
              <p className="text-slate-400 text-xs mb-1 cursor-default">{m.label}</p>
            </Tooltip>
            <p className={`text-2xl font-bold ${m.highlight ? 'text-amber-400' : 'text-white'}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div>
        <Tooltip text="The different types of photos Google recommends for your listing. The ones marked Required are the most important — without them your listing can look incomplete in search results.">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">Photo categories</h2>
        </Tooltip>
        <div className="space-y-2">
          {CATEGORIES.map(cat => {
            const items = displayItems.filter(m => m.category === cat.id)
            const hasPhotos = items.length > 0
            const views = items.reduce((s, m) => s + m.viewCount, 0)

            return (
              <div
                key={cat.id}
                className={`bg-navy-800 rounded-xl p-4 border flex items-center justify-between gap-4 ${
                  hasPhotos ? 'border-navy-700' : 'border-dashed border-navy-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                    hasPhotos ? 'bg-green-500/10' : 'bg-navy-700'
                  }`}>
                    {hasPhotos ? '✓' : cat.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium">{cat.label}</p>
                      <Tooltip text={
                        cat.priority === 'Required'
                          ? 'Google expects this type of photo. Without it your listing may look incomplete in search results.'
                          : cat.priority === 'Highly recommended'
                          ? 'Not required, but strongly recommended. Businesses with these photos tend to get more clicks and more people asking for directions.'
                          : 'A good extra to have. It gives people a better picture of what your business is like.'
                      }>
                        <span className={`text-xs px-1.5 py-0.5 rounded cursor-default ${
                          cat.priority === 'Required'
                            ? 'text-red-400 bg-red-500/10'
                            : cat.priority === 'Highly recommended'
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-slate-500 bg-navy-700'
                        }`}>
                          {cat.priority}
                        </span>
                      </Tooltip>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{cat.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {hasPhotos ? (
                    <>
                      <p className="text-green-400 text-sm font-medium">{items.length} photo{items.length !== 1 ? 's' : ''}</p>
                      {views > 0 && <p className="text-slate-500 text-xs">{views.toLocaleString('sv-SE')} views</p>}
                    </>
                  ) : (
                    <p className="text-slate-600 text-xs">Not added</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tips */}
      <div>
        <h2 className="text-xs font-medium text-mustard uppercase tracking-wider mb-3">Photo best practices</h2>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
          {[
            { tip: 'Use natural lighting', detail: 'Photos taken in natural light get significantly more engagement than dark or flash-heavy shots.' },
            { tip: 'Minimum 720 × 720 px', detail: 'Google recommends photos at least 720px wide. Blurry or low-resolution photos hurt your credibility.' },
            { tip: 'Update regularly',     detail: 'Adding new photos signals to Google that your business is active. Aim for at least 1–2 new photos per month.' },
            { tip: 'Show real people',     detail: 'Photos featuring your actual team outperform stock-style images. Authenticity builds trust.' },
          ].map((t, i) => (
            <div key={i} className="px-5 py-3.5">
              <p className="text-white text-sm font-medium">{t.tip}</p>
              <p className="text-slate-500 text-xs mt-0.5">{t.detail}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
