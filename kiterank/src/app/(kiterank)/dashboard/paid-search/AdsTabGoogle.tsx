'use client'
import { type AdsData } from './types'
import {
  RunningAdsList,
  CallCard,
  SitelinksCard,
  CalloutsCard,
  LocationCard,
  SnippetsCard,
  AssetRow,
} from './AdsTabTest2'
import { AdPreview, type ProfileForAd } from './AdPreview'
import { useLang } from '@/components/LanguageProvider'

/*
 * The ads tab, restricted to what Google reports.
 *
 * This tab was already the closest of the three. Ad strength, the per-asset
 * Low/Good/Best rating on every headline, impressions, click rate, clicks and
 * conversions all come from Google, and the editors write straight back to the
 * account. Three things were not Google's:
 *
 * "3 rubriker med lågt betyg — Google undviker dem" drew a conclusion Google
 * did not state. Low-rated assets are served less often, but the number and
 * the word are Google's to give: the line now reports the rating, and the
 * badge's own tooltip explains what it means.
 *
 * "5 saknas — varje tillägg gör din annons större och lättare att klicka på"
 * is a sales claim. The count is a fact; the promise is not.
 *
 * And the asset rows lied about state. Location and structured snippets both
 * opened as switched off no matter what the account held, and the location
 * card asserted a connected Google Business Profile without ever checking —
 * a green tick and a sentence that could be flatly false. Both now read from
 * what Google actually reports.
 *
 * Explanations of what a Google feature *is* stay. A salon owner who has never
 * heard of a structured snippet cannot act on a row that only says "inactive",
 * and describing a feature is not a claim about their results.
 *
 * Two things were then added on top, because the tab was answering the wrong
 * question. It opened with fifteen headlines and their ratings — the view from
 * inside Google Ads — and never showed what a searcher sees. For a salon the
 * ad that shows on a local search is rendered from the Google Business Profile,
 * so the copy underneath is not the thing being judged. The preview shows both
 * forms, and says which fields fill which.
 *
 * And the location asset was one row among six. It is not one of six: without
 * it the ad cannot appear in the local block at all, which is the placement
 * that takes the clicks on a search like "frisör stockholm". It now stands on
 * its own, above the rest, with the two conditions stated.
 */

const T = {
  sv: {
    assets:  'Annonstillägg',
    missing: (n: number, total: number) => `${n} av ${total} är inte uppsatta`,
    leadForm: 'Kontaktformulär',
    placeTitle: 'Adress i annonsen',
    placeWhy:   'Utan adress kopplad kan din annons inte visas i den lokala rutan ovanför kartan — den platsen tar merparten av klicken på sökningar med ort i sig. Adressen hämtas från din Google-företagsprofil.',
  },
  en: {
    assets:  'Ad assets',
    missing: (n: number, total: number) => `${n} of ${total} are not set up`,
    leadForm: 'Lead form',
    placeTitle: 'Address in the ad',
    placeWhy:   'Without a linked address your ad cannot appear in the local block above the map — the placement that takes most of the clicks on searches with a place in them. The address comes from your Google Business Profile.',
  },
}

export function AdsTabGoogle({
  data,
  profile,
  gbpConnected = false,
}: {
  data:          AdsData
  profile:       ProfileForAd
  /** Whether a Google Business Profile is actually linked to this company. */
  gbpConnected?: boolean
}) {
  const { lang } = useLang()
  const t = T[lang]

  const ext = (type: string) => data.adExtensions.find(e => e.type === type)
  const missingCount = data.adExtensions.filter(e => !e.active).length

  return (
    <>
      {/* The location asset decides whether the local card above can show at all */}
      <div>
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t.placeTitle}</h2>
        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <p className="text-slate-400 text-xs leading-relaxed">{t.placeWhy}</p>
          </div>
          <LocationCard initialActive={ext('Location')?.active ?? false} gbpConnected={gbpConnected} />
        </div>
      </div>

      <RunningAdsList ads={data.ads} attributeRating />

      <div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.assets}</h2>
          {missingCount > 0 && (
            <span className="text-xs text-slate-500">
              {t.missing(missingCount, data.adExtensions.length)}
            </span>
          )}
        </div>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700 overflow-hidden">
          <CallCard      initialNumber={ext('Call')?.detail ?? ''} />
          <SitelinksCard initialLinks={data.sitelinks} />
          <CalloutsCard  initialActive={ext('Callouts')?.active ?? false} />
          <SnippetsCard  initialSnippet={data.snippet} />
          <AssetRow title={t.leadForm} active={ext('Lead form')?.active ?? false} optional isOpen={false} />
        </div>
      </div>

      <AdPreview ads={data.ads} profile={profile} />
    </>
  )
}
