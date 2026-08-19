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
  contactTitle:      'Kontakta oss',
  /* The contact page's own opening line. Deliberately its own text and not a
     copy of the "Hitta hit" paragraph in the Om oss page: the two sit on
     different pages, say different things, and editing one must never move
     the other. */
  contactIntro:      'Välkommen in. Här hittar du våra öppettider, vägen hit och hur du enklast når oss.',
  hoursTitle:        'Öppettider',
  followTitle:       'Följ oss',
  followMore:        'Mer av vårt arbete:',
  directions:        'Hitta hit →',
  pricePage:         'Tjänster & priser',
  /* Prissidans egna ord. De stod tidigare som textsträngar rakt i
     ServicePage, vilket gjorde dem omöjliga att ändra — och en sajt på
     engelska fick svensk text mitt på prissidan. */
  pricePageIntro:    'Alla våra tjänster med tid och pris.',
  ctaBandBody:       'Kontakta oss eller boka direkt online — vi svarar snabbt.',
  backToStart:       'Tillbaka till startsidan',
  aboutPageTitle:    'Om oss',
  priceLabel:        'Pris',
  durationLabel:     'Tid',
  noArticles:        'Inga artiklar publicerade ännu.',
  readMore:          'Läs mer →',
} as const

export type LabelKey = keyof typeof SITE_LABELS

/** What each one is called when the customer edits it on the page. */
export const LABEL_NAMES: Record<LabelKey, string> = {
  galleryKicker:     'Liten rubrik över galleriet',
  galleryTitle:      'Rubrik över galleriet',
  articlesKicker:    'Liten rubrik över artiklarna',
  articlesTitle:     'Rubrik över artiklarna',
  articlesAll:       'Länken till alla artiklar',
  articlesPageTitle: 'Rubrik på artikelsidan',
  articlesBack:      'Länken tillbaka i en artikel',
  articlesMore:      'Rubrik över fler artiklar',
  teamTitle:         'Rubrik över teamet',
  reviewsKicker:     'Liten rubrik över omdömena',
  reviewsTitle:      'Rubrik över omdömena',
  navServices:       'Menyknappen Tjänster',
  navArticles:       'Menyknappen Artiklar',
  contactTitle:      'Rubrik över kontaktuppgifterna',
  contactIntro:      'Texten överst på kontaktsidan',
  hoursTitle:        'Rubrik över öppettiderna',
  followTitle:       'Rubrik över sociala medier',
  followMore:        'Texten före länkarna under galleriet',
  directions:        'Länken till kartan',
  pricePage:         'Rubrik på prissidan',
  pricePageIntro:    'Texten under rubriken (adressen läggs till automatiskt)',
  ctaBandBody:       'Texten i bokningsbandet',
  backToStart:       'Länken tillbaka till startsidan',
  aboutPageTitle:    'Rubrik på Om oss-sidan',
  priceLabel:        'Ordet för pris',
  durationLabel:     'Ordet för tidsåtgång',
  noArticles:        'Texten när inget är publicerat',
  readMore:          'Läs mer-länken',
}

/*
 * The wording that reaches a visitor.
 *
 * Three states, not two. A key that was never touched falls back to our
 * Swedish default — that is what makes a new site readable out of the box. A
 * key the customer has written stands as written. And a key they have cleared
 * stays cleared: an emptied heading is a decision, and falling back to our
 * wording would quietly overrule it.
 *
 * Callers must therefore treat an empty answer as "render nothing here",
 * element and margins included — a heading that leaves its gap behind has not
 * been removed.
 */
export function siteLabel(labels: Record<string, string> | undefined, key: LabelKey): string {
  const own = labels?.[key]
  return own === undefined ? SITE_LABELS[key] : own.trim()
}
