'use client'
import { type AdsAd } from './types'
import { useLang } from '@/components/LanguageProvider'
import Link from 'next/link'

/*
 * What the ad actually looks like, in both places it can appear.
 *
 * The tab shows the ingredient list — fifteen headlines, four descriptions,
 * each with a rating — which is what Google Ads shows the advertiser and
 * nothing like what a searcher sees. For a salon the gap is wider still: on a
 * local search the ad that shows is rendered from the Google Business Profile,
 * so the copy being edited above is not the thing on screen.
 *
 * Two previews, because a salon's ad really does appear in two forms and they
 * are won on different things. The local card is won on the photo, the rating
 * and the reviews. The text ad is won on the copy. Same campaign, same budget.
 *
 * The local card is built to the proportions Google uses — a compact, almost
 * square tile with the photo on top — rather than stretched to the width of
 * the page, which made it read as a banner it is not.
 *
 * Where the salon's own profile figures are missing, the card fills in example
 * values and says so on its face. A blank card teaches a first-time advertiser
 * nothing; a card quietly pretending the examples are theirs would be worse.
 */

export type ProfileForAd = {
  name:     string
  city?:    string
  website?: string
  rating?:  number
  reviews?: number
}

/* A complete card, so a salon that has connected nothing yet can still see
   what they are aiming at. Never saved, never presented as measured. */
const EXAMPLE = {
  name:    'Salong Nord',
  city:    'Götgatan 24, Södermalm',
  rating:  4.8,
  reviews: 214,
  hours:   'Öppet · stänger 18:00',
  website: 'salongnord.se',
}

const T = {
  sv: {
    heading:     'Så ser din annons ut',
    localTitle:  'I den lokala rutan',
    localSub:    'Visas på sökningar med ort, ovanför kartan',
    textTitle:   'Som textannons',
    textSub:     'Visas längre ned, och på sökningar utan ort',
    sponsored:   'Sponsrad',
    example:     'Exempel',
    exampleTip:  'Din profil saknar de här uppgifterna ännu, så kortet visas med exempelvärden.',
    photo:       'Bild från din profil',
    directions:  'Vägbeskrivning',
    call:        'Ring',
    fromProfile: 'Hela kortet kommer från din Google-företagsprofil — bild, namn, betyg, recensioner, adress och öppettider. Annonstexten ovan syns inte här.',
    profileLink: 'Gå till din Google-profil →',
    assembled:   'Google sätter ihop tre av dina rubriker och en beskrivning för varje visning, och kombinationen varierar mellan sökare.',
    noAds:       'Ingen aktiv annons att visa ännu.',
  },
  en: {
    heading:     'What your ad looks like',
    localTitle:  'In the local block',
    localSub:    'Shows on searches with a place, above the map',
    textTitle:   'As a text ad',
    textSub:     'Shows further down, and on searches without a place',
    sponsored:   'Sponsored',
    example:     'Example',
    exampleTip:  'Your profile does not hold these details yet, so the card is shown with example values.',
    photo:       'Photo from your profile',
    directions:  'Directions',
    call:        'Call',
    fromProfile: 'The whole card comes from your Google Business Profile — photo, name, rating, reviews, address and opening hours. The ad copy above does not appear here.',
    profileLink: 'Go to your Google profile →',
    assembled:   'Google assembles three of your headlines and one description for every impression, and the combination varies between searchers.',
    noAds:       'No running ad to show yet.',
  },
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <span className="text-[#e7711b] text-[10px] tracking-tight">
      {'★'.repeat(full)}<span className="text-neutral-300">{'★'.repeat(Math.max(0, 5 - full))}</span>
    </span>
  )
}

export function AdPreview({ ads, profile }: { ads: AdsAd[]; profile: ProfileForAd }) {
  const { lang } = useLang()
  const t = T[lang]

  /* One missing figure means the card cannot be drawn from their profile, so
   * the whole card switches to the example rather than mixing the two. */
  const isExample = profile.rating === undefined || profile.reviews === undefined
  const card = isExample
    ? EXAMPLE
    : {
        name:    profile.name,
        city:    profile.city ?? EXAMPLE.city,
        rating:  profile.rating!,
        reviews: profile.reviews!,
        hours:   EXAMPLE.hours,
        website: profile.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? '',
      }

  const ad         = [...ads].sort((a, b) => b.impressions - a.impressions)[0]
  const headlines  = ad?.headlines.slice(0, 3).map(h => h.text) ?? []
  const desc       = ad?.descriptions[0]?.text ?? ''

  return (
    <div>
      <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t.heading}</h2>

      <div className="flex flex-wrap gap-4 items-start">

        {/* Local block — a compact tile, the shape Google actually draws */}
        <div className="w-[248px] shrink-0">
          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-slate-300 text-xs font-medium">{t.localTitle}</p>
            {isExample && (
              <span title={t.exampleTip} className="text-[10px] text-mustard border border-mustard/25 rounded px-1 cursor-default">
                {t.example}
              </span>
            )}
          </div>
          <p className="text-slate-600 text-[11px] -mt-1 mb-2">{t.localSub}</p>

          <div className="bg-white rounded-lg overflow-hidden">
            <div className="h-20 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
              <span className="text-neutral-500 text-[10px]">{t.photo}</span>
            </div>
            <div className="p-2.5">
              <p className="text-[10px] font-semibold text-neutral-700">{t.sponsored}</p>
              <p className="text-[13px] text-[#1a0dab] font-medium leading-snug mt-0.5">{card.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-neutral-800 text-[11px] font-medium tabular-nums">
                  {card.rating.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <Stars rating={card.rating} />
                <span className="text-neutral-600 text-[11px]">({card.reviews})</span>
              </div>
              <p className="text-neutral-600 text-[11px] mt-0.5 leading-tight">{card.city}</p>
              <p className="text-[#188038] text-[11px] leading-tight">{card.hours}</p>
              <div className="flex gap-1.5 mt-2">
                {[t.call, t.directions].map(label => (
                  <span key={label} className="text-[10px] text-[#1a73e8] border border-neutral-300 rounded-full px-2 py-0.5">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-[11px] mt-2 leading-relaxed">{t.fromProfile}</p>
          <Link href="/dashboard/gbp" className="text-mustard text-[11px] font-medium hover:underline inline-block mt-1">
            {t.profileLink}
          </Link>
        </div>

        {/* Text ad — assembled from the copy above */}
        <div className="flex-1 min-w-[280px] max-w-[420px]">
          <p className="text-slate-300 text-xs font-medium">{t.textTitle}</p>
          <p className="text-slate-600 text-[11px] mb-2">{t.textSub}</p>

          {ad ? (
            <>
              <div className="bg-white rounded-lg p-3">
                <p className="text-[10px] font-semibold text-neutral-700">
                  {t.sponsored}
                  {card.website && <span className="font-normal text-neutral-600"> · {card.website}</span>}
                </p>
                <p className="text-[15px] text-[#1a0dab] leading-snug mt-0.5">{headlines.join(' | ')}</p>
                <p className="text-neutral-700 text-[11px] leading-relaxed mt-1">{desc}</p>
              </div>
              <p className="text-slate-500 text-[11px] mt-2 leading-relaxed">{t.assembled}</p>
            </>
          ) : (
            <p className="text-slate-500 text-sm">{t.noAds}</p>
          )}
        </div>

      </div>
    </div>
  )
}
