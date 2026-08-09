/*
 * Every heading and link text the site renders on its own — not written by
 * the customer as content, but still visible to their visitors. Each has a
 * Swedish default and can be overridden in the editor, which is what lets a
 * customer run their site in French, English or anything else.
 *
 * One rule protects the whole surface: no string in a section component may
 * be a bare literal — it reads from here, so it is editable by definition.
 */

export const SITE_LABELS = {
  galleryKicker:     'Vårt arbete',
  galleryTitle:      'Bildgalleri',
  articlesKicker:    'Från oss',
  articlesTitle:     'Senaste artiklarna',
  articlesAll:       'Läs alla artiklar →',
  articlesPageTitle: 'Artiklar & tips',
  articlesBack:      '← Alla artiklar',
  articlesMore:      'Fler artiklar',
  teamTitle:         'Teamet',
  reviewsKicker:     'Omdömen',
  reviewsTitle:      'Vad kunderna säger',
  navServices:       'Tjänster',
  navArticles:       'Artiklar',
  contactTitle:      'Kontakt',
  hoursTitle:        'Öppettider',
  followTitle:       'Följ oss',
  directions:        'Hitta hit →',
  pricePage:         'Tjänster & priser',
  priceLabel:        'Pris',
  durationLabel:     'Tid',
  noArticles:        'Inga artiklar publicerade ännu.',
} as const

export type LabelKey = keyof typeof SITE_LABELS

/** The customer's wording if they wrote one, the default otherwise. */
export function siteLabel(labels: Record<string, string> | undefined, key: LabelKey): string {
  return labels?.[key]?.trim() || SITE_LABELS[key]
}
