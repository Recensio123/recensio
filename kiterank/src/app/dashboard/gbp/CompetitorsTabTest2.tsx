'use client'
import { Tooltip } from '@/components/Tooltip'
import { useLang } from '@/components/LanguageProvider'

/*
 * Competitors — the weekly pulse on the salons around you.
 * Data shape mirrors what the DataForSEO Google Maps SERP + Business Data APIs
 * return (rating, review count, photos, local-pack position per keyword).
 * Mock until the DataForSEO account is connected; scans run weekly server-side
 * and pages read cached snapshots, so browsing never costs API calls.
 */

type Competitor = {
  name:            string
  distance:        string   // walking distance — how a salon owner thinks
  rating:          number
  reviews:         number
  newReviews:      number   // this month
  prevNewReviews:  number   // last month
  photos:          number
  inPack:          boolean  // in the local 3-pack for the main keyword
}

const YOU: Competitor = {
  name: 'You', distance: '', rating: 4.2, reviews: 47, newReviews: 3, prevNewReviews: 5, photos: 8, inPack: true,
}

const MOCK_COMPETITORS: Competitor[] = [
  { name: 'Salong Nikita',      distance: '250 m', rating: 4.8, reviews: 214, newReviews: 12, prevNewReviews: 9,  photos: 86, inPack: true  },
  { name: 'Hår & Harmoni',      distance: '400 m', rating: 4.6, reviews: 128, newReviews: 6,  prevNewReviews: 7,  photos: 44, inPack: true  },
  { name: 'Studio Klippoteket', distance: '550 m', rating: 4.3, reviews: 89,  newReviews: 2,  prevNewReviews: 3,  photos: 31, inPack: false },
  { name: 'Beauty by Linn',     distance: '700 m', rating: 4.9, reviews: 63,  newReviews: 8,  prevNewReviews: 4,  photos: 52, inPack: false },
  { name: 'Barberare Söder',    distance: '850 m', rating: 4.1, reviews: 156, newReviews: 1,  prevNewReviews: 2,  photos: 19, inPack: false },
]

// The local 3-pack for the main keyword right now — one Maps search returns this
const MOCK_PACK = {
  keyword: 'frisör södermalm',
  spots: [
    { pos: 1, name: 'Salong Nikita', isYou: false },
    { pos: 2, name: 'You',           isYou: true  },
    { pos: 3, name: 'Hår & Harmoni', isYou: false },
  ],
}

const T = {
  sv: {
    you:            'Du',
    headline:       (name: string, theirs: number, yours: number) => (
      <>
        <span className="text-white font-medium">{name}</span> fick{' '}
        <span className="text-mustard font-bold">{theirs} nya recensioner</span> denna månad — du fick {yours}.
      </>
    ),
    headlineNote:   ' Recensioner är den största faktorn för vem som visas först på Google Maps.',
    packChange:     'Du klättrade från plats 3 till plats 2 — Hår & Harmoni tappade en plats.',
    packTooltip:    'De tre företag Google visar på kartan när någon söker på detta — det är här de flesta kunder klickar. Följs upp varje vecka.',
    packTitle:      'Vilka Google visar först',
    whenSearching:  'när folk söker',
    raceTooltip:    'Nya Google-recensioner den här månaden — du jämfört med salongerna omkring dig. Den salong som samlar recensioner snabbast brukar klättra i kartresultaten.',
    raceTitle:      'Recensionsracet denna månad',
    faster:         '↑ ökar',
    slower:         '↓ minskar',
    same:           '→ samma',
    trendTip:       'Takten jämfört med förra månaden — om företaget samlar nya recensioner snabbare eller långsammare än då.',
    colDistanceTip: 'Avståndet från din adress. Ju närmare, desto mer tävlar ni om samma kunder.',
    raceTip:        'Be varje nöjd kund om en recension — din recensionslänk finns klar under fliken Recensioner.',
    aroundTooltip:  'Salongerna i närheten som konkurrerar om samma sökningar, uppdateras varje vecka. Avståndet räknas från din adress.',
    aroundTitle:    'Salongerna omkring dig',
    colSalon:       'Salong',
    colDistance:    'Avstånd',
    colRating:      'Betyg',
    colRatingTip:   'Deras genomsnittliga stjärnbetyg på Google.',
    colReviews:     'Recensioner',
    colReviewsTip:  'Deras totala antal Google-recensioner.',
    colPhotos:      'Foton',
    colPhotosTip:   'Hur många foton de har på sin Google-profil.',
    colPack:        'På kartan',
    colPackTip:     'Om de just nu visas bland de tre första kartresultaten för din viktigaste sökning.',
    top3:           'Topp 3',
    footer:         'Uppdateras varje vecka från Google Maps. Livedata aktiveras när datakopplingen är på plats.',
  },
  en: {
    you:            'You',
    headline:       (name: string, theirs: number, yours: number) => (
      <>
        <span className="text-white font-medium">{name}</span> got{' '}
        <span className="text-mustard font-bold">{theirs} new reviews</span> this month — you got {yours}.
      </>
    ),
    headlineNote:   ' Reviews are the biggest factor in who shows up first on Google Maps.',
    packChange:     'You moved up from #3 to #2 — Hår & Harmoni dropped one spot.',
    packTooltip:    'The three businesses Google shows on the map when someone searches for this — where most customers click. Tracked weekly.',
    packTitle:      'Who Google shows first',
    whenSearching:  'when people search',
    raceTooltip:    'New Google reviews gathered this month — you versus the salons around you. The salon that collects reviews fastest tends to climb the map results.',
    raceTitle:      'The review race this month',
    faster:         '↑ faster',
    slower:         '↓ slower',
    same:           '→ same',
    trendTip:       'Pace versus last month — whether the business is collecting new reviews faster or slower than before.',
    colDistanceTip: 'Distance from your address. The closer they are, the more you compete for the same customers.',
    raceTip:        'Ask every happy customer for a review — your review link is ready on the Reviews tab.',
    aroundTooltip:  'The nearby salons competing for the same searches, refreshed weekly. Distance is from your address.',
    aroundTitle:    'The salons around you',
    colSalon:       'Salon',
    colDistance:    'Distance',
    colRating:      'Rating',
    colRatingTip:   'Their average star rating on Google.',
    colReviews:     'Reviews',
    colReviewsTip:  'Their total number of Google reviews.',
    colPhotos:      'Photos',
    colPhotosTip:   'How many photos they have on their Google listing.',
    colPack:        'On the map',
    colPackTip:     'Whether they currently appear in the top 3 map results for your main search.',
    top3:           'Top 3',
    footer:         'Updated weekly from Google Maps. Live tracking activates when the data connection is set up.',
  },
}

export function CompetitorsTabTest2() {
  const { lang } = useLang()
  const t = T[lang]
  const all = [YOU, ...MOCK_COMPETITORS]
  const maxNewReviews = Math.max(...all.map(c => c.newReviews), 1)

  // The headline signal: who's winning the review race this month
  const fastest      = [...MOCK_COMPETITORS].sort((a, b) => b.newReviews - a.newReviews)[0]
  const behindBy     = fastest.newReviews - YOU.newReviews
  const sorted       = [...MOCK_COMPETITORS].sort((a, b) => b.reviews - a.reviews)

  return (
    <div className="space-y-6">

      {/* ── This week's headline ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="bg-navy-800 rounded-xl border border-mustard/25 px-4 py-3 flex items-center gap-3">
          <span className="text-mustard shrink-0">●</span>
          <p className="flex-1 text-sm text-slate-300">
            {t.headline(fastest.name, fastest.newReviews, YOU.newReviews)}
            {behindBy > 0 && t.headlineNote}
          </p>
        </div>
        <div className="bg-navy-800 rounded-xl border border-green-500/20 px-4 py-3 flex items-center gap-3">
          <span className="text-green-400 shrink-0">↑</span>
          <p className="flex-1 text-sm text-slate-300">{t.packChange}</p>
        </div>
      </div>

      {/* ── The local pack right now ─────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <Tooltip text={t.packTooltip}>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">{t.packTitle}</h2>
          </Tooltip>
          <span className="text-xs text-slate-500">{t.whenSearching} &ldquo;{MOCK_PACK.keyword}&rdquo;</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MOCK_PACK.spots.map(s => (
            <div
              key={s.pos}
              className={`rounded-xl border px-4 py-3.5 flex items-center gap-3 ${
                s.isYou ? 'bg-green-500/8 border-green-500/25' : 'bg-navy-800 border-navy-700'
              }`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                s.isYou ? 'bg-green-500 text-navy-950' : 'bg-navy-700 text-slate-300'
              }`}>
                {s.pos}
              </span>
              <p className={`text-sm font-medium truncate ${s.isYou ? 'text-green-400' : 'text-white'}`}>
                {s.isYou ? t.you : s.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Review race this month ───────────────────────────────────────── */}
      <div>
        <Tooltip text={t.raceTooltip}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">{t.raceTitle}</h2>
        </Tooltip>
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-5 space-y-3">
          {[...all].sort((a, b) => b.newReviews - a.newReviews).map(c => {
            const isYou = c.name === 'You'
            const trend = c.newReviews - c.prevNewReviews
            return (
              <div key={c.name} className="flex items-center gap-3">
                <span className={`w-24 sm:w-32 shrink-0 text-sm truncate ${isYou ? 'text-green-400 font-semibold' : 'text-slate-300'}`}>
                  {isYou ? t.you : c.name}
                </span>
                <div className="flex-1 h-4 bg-navy-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isYou ? 'bg-green-500' : 'bg-navy-600'}`}
                    style={{ width: `${(c.newReviews / maxNewReviews) * 100}%` }}
                  />
                </div>
                <span className={`w-8 text-right text-sm font-bold tabular-nums shrink-0 ${isYou ? 'text-green-400' : 'text-white'}`}>
                  +{c.newReviews}
                </span>
                <Tooltip text={t.trendTip}>
                  <span className={`w-16 text-right text-xs tabular-nums shrink-0 cursor-default ${
                    trend > 0 ? 'text-green-400/70' : trend < 0 ? 'text-red-400/70' : 'text-slate-500'
                  }`}>
                    {trend > 0 ? t.faster : trend < 0 ? t.slower : t.same}
                  </span>
                </Tooltip>
              </div>
            )
          })}
          <p className="text-slate-500 text-xs pt-2 border-t border-navy-700">
            {t.raceTip}
          </p>
        </div>
      </div>

      {/* ── The salons around you ────────────────────────────────────────── */}
      <div>
        <Tooltip text={t.aroundTooltip}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">{t.aroundTitle}</h2>
        </Tooltip>
        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[1fr_70px_90px_90px_70px_90px] gap-3 px-5 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium">
                <span>{t.colSalon}</span>
                <Tooltip text={t.colDistanceTip}><span className="text-right cursor-default">{t.colDistance}</span></Tooltip>
                <Tooltip text={t.colRatingTip}><span className="text-right cursor-default">{t.colRating}</span></Tooltip>
                <Tooltip text={t.colReviewsTip}><span className="text-right cursor-default">{t.colReviews}</span></Tooltip>
                <Tooltip text={t.colPhotosTip}><span className="text-right cursor-default">{t.colPhotos}</span></Tooltip>
                <Tooltip text={t.colPackTip}>
                  <span className="text-right cursor-default">{t.colPack}</span>
                </Tooltip>
              </div>

              {/* Your row first, highlighted */}
              <div className="grid grid-cols-[1fr_70px_90px_90px_70px_90px] gap-3 px-5 py-3.5 items-center bg-green-500/5 border-b border-navy-700">
                <span className="text-green-400 text-sm font-semibold">{t.you}</span>
                <span />
                <span className="text-white text-sm text-right tabular-nums font-medium">{YOU.rating.toFixed(1)} ★</span>
                <span className="text-white text-sm text-right tabular-nums font-medium">{YOU.reviews}</span>
                <span className="text-white text-sm text-right tabular-nums">{YOU.photos}</span>
                <span className="text-right">
                  {YOU.inPack
                    ? <span className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">{t.top3}</span>
                    : <span className="text-slate-600 text-xs">—</span>}
                </span>
              </div>

              <div className="divide-y divide-navy-700">
                {sorted.map(c => {
                  const ratingColor = c.rating > YOU.rating ? 'text-mustard' : 'text-slate-300'
                  return (
                    <div key={c.name} className="grid grid-cols-[1fr_70px_90px_90px_70px_90px] gap-3 px-5 py-3.5 items-center">
                      <span className="text-white text-sm font-medium truncate">{c.name}</span>
                      <span className="text-slate-500 text-xs text-right tabular-nums">{c.distance}</span>
                      <span className={`text-sm text-right tabular-nums ${ratingColor}`}>{c.rating.toFixed(1)} ★</span>
                      <span className="text-slate-300 text-sm text-right tabular-nums">{c.reviews}</span>
                      <span className="text-slate-300 text-sm text-right tabular-nums">{c.photos}</span>
                      <span className="text-right">
                        {c.inPack
                          ? <span className="text-xs font-semibold text-mustard bg-mustard/10 border border-mustard/20 px-2 py-0.5 rounded-full">{t.top3}</span>
                          : <span className="text-slate-600 text-xs">—</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <p className="text-slate-500 text-xs mt-3">
          {t.footer}
        </p>
      </div>

    </div>
  )
}
