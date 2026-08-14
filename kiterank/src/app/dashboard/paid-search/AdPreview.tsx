'use client'
import { type AdsAd } from './types'
import { useLang } from '@/components/LanguageProvider'
import Link from 'next/link'

/*
 * What the ad actually looks like, in both places it can appear.
 *
 * The tab used to show only the ingredient list — fifteen headlines, four
 * descriptions, each with a rating — which is what Google Ads shows the
 * advertiser and nothing like what a searcher sees. For a salon the gap is
 * wider still: on a local search the ad that shows is rendered from the Google
 * Business Profile, so the copy being edited below is not the thing on screen.
 *
 * Two previews, because a salon's ad really does appear in two forms and they
 * are persuaded by different things. The local card is won on rating, reviews
 * and photos. The text ad is won on the copy. Both come out of the same
 * campaign and the same budget.
 *
 * The profile card is a rendering of the format, not a measurement: the name,
 * rating and review count are the salon's own, the opening-hours slot is left
 * as a slot because Google's hours are not something we hold.
 */

export type ProfileForAd = {
  name:     string
  city?:    string
  website?: string
  rating?:  number
  reviews?: number
}

const T = {
  sv: {
    heading:     'Så ser din annons ut',
    localTitle:  'I den lokala rutan',
    localSub:    'Det här visas på sökningar som "frisör stockholm", ovanför kartan',
    textTitle:   'Som textannons',
    textSub:     'Det här visas längre ned och på sökningar utan ort, som "balayage pris"',
    sponsored:   'Sponsrad',
    hoursSlot:   'Öppettider från din profil',
    directions:  'Vägbeskrivning',
    call:        'Ring',
    website:     'Webbplats',
    fromProfile: 'Allt i den vänstra rutan kommer från din Google-företagsprofil — namn, kategori, betyg, antal recensioner, adress, öppettider och bilder. Annonstexten du redigerar nedan syns inte där.',
    profileLink: 'Gå till din Google-profil →',
    assembled:   'Google sätter själv ihop tre av dina rubriker och en beskrivning för varje visning. Kombinationen varierar mellan sökare — därför spelar det roll att alla rubriker håller.',
    noAds:       'Ingen aktiv annons att visa ännu.',
    noRating:    'Inget betyg ännu',
  },
  en: {
    heading:     'What your ad looks like',
    localTitle:  'In the local block',
    localSub:    'This is what shows for searches like "hairdresser stockholm", above the map',
    textTitle:   'As a text ad',
    textSub:     'This shows further down, and on searches without a place, like "balayage price"',
    sponsored:   'Sponsored',
    hoursSlot:   'Opening hours from your profile',
    directions:  'Directions',
    call:        'Call',
    website:     'Website',
    fromProfile: 'Everything in the left card comes from your Google Business Profile — name, category, rating, review count, address, opening hours and photos. The ad copy you edit below does not appear there.',
    profileLink: 'Go to your Google profile →',
    assembled:   'Google assembles three of your headlines and one description for every impression. The combination varies between searchers — which is why every headline has to hold up.',
    noAds:       'No running ad to show yet.',
    noRating:    'No rating yet',
  },
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <span className="text-mustard text-xs tracking-tight">
      {'★'.repeat(full)}<span className="text-navy-600">{'★'.repeat(Math.max(0, 5 - full))}</span>
    </span>
  )
}

export function AdPreview({ ads, profile }: { ads: AdsAd[]; profile: ProfileForAd }) {
  const { lang } = useLang()
  const t = T[lang]

  /* The ad Google shows most is the one worth previewing. */
  const ad = [...ads].sort((a, b) => b.impressions - a.impressions)[0]

  const headlines = ad?.headlines.slice(0, 3).map(h => h.text) ?? []
  const desc      = ad?.descriptions[0]?.text ?? ''
  const domain    = profile.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? ''

  return (
    <div>
      <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t.heading}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Local block — rendered from the Google Business Profile */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <p className="text-white text-sm font-medium">{t.localTitle}</p>
          <p className="text-slate-500 text-xs mt-0.5 mb-3">{t.localSub}</p>

          <div className="bg-white rounded-lg p-3.5">
            <p className="text-[11px] font-semibold text-neutral-700">{t.sponsored}</p>
            <p className="text-[15px] text-[#1a0dab] font-medium leading-snug mt-1">{profile.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {profile.rating !== undefined ? (
                <>
                  <span className="text-neutral-800 text-xs font-medium tabular-nums">
                    {profile.rating.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                  <Stars rating={profile.rating} />
                  {profile.reviews !== undefined && (
                    <span className="text-neutral-600 text-xs">({profile.reviews})</span>
                  )}
                </>
              ) : (
                <span className="text-neutral-500 text-xs">{t.noRating}</span>
              )}
            </div>
            <p className="text-neutral-600 text-xs mt-1">
              {profile.city ?? ''}
              {profile.city ? ' · ' : ''}
              <span className="text-neutral-400 italic">{t.hoursSlot}</span>
            </p>
            <div className="flex gap-2 mt-2.5">
              {[t.call, t.directions, t.website].map(label => (
                <span key={label} className="text-[11px] text-[#1a73e8] border border-neutral-300 rounded-full px-2.5 py-1">
                  {label}
                </span>
              ))}
            </div>
          </div>

          <p className="text-slate-500 text-xs mt-3 leading-relaxed">{t.fromProfile}</p>
          <Link href="/dashboard/gbp" className="text-mustard text-xs font-medium hover:underline inline-block mt-1.5">
            {t.profileLink}
          </Link>
        </div>

        {/* Text ad — assembled from the copy below */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <p className="text-white text-sm font-medium">{t.textTitle}</p>
          <p className="text-slate-500 text-xs mt-0.5 mb-3">{t.textSub}</p>

          {ad ? (
            <>
              <div className="bg-white rounded-lg p-3.5">
                <p className="text-[11px] font-semibold text-neutral-700">
                  {t.sponsored}{domain && <span className="font-normal text-neutral-600"> · {domain}</span>}
                </p>
                <p className="text-[17px] text-[#1a0dab] leading-snug mt-1">
                  {headlines.join(' | ')}
                </p>
                <p className="text-neutral-700 text-xs leading-relaxed mt-1">{desc}</p>
              </div>
              <p className="text-slate-500 text-xs mt-3 leading-relaxed">{t.assembled}</p>
            </>
          ) : (
            <p className="text-slate-500 text-sm">{t.noAds}</p>
          )}
        </div>

      </div>
    </div>
  )
}
