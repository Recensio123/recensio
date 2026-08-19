/*
 * Own pages for the site's sections.
 *
 * Every big section — the price list, about & team, the gallery, reviews and
 * articles — can live in one of two modes: only as a section on the start
 * page, or additionally as a page of its own. An own page gets a button in
 * the menu, a "läs mer" link on the start-page section, a name the customer
 * chooses (which is also the menu label), and room for more content: extra
 * headings, text and photo groups below the section's own content.
 *
 * Everything here works on a slim slice of the site content, so both the
 * editor and the public pages can share it without importing each other.
 */

import { publishedArticles, type Article, type ArticleBlock } from './articles'
import { EXAMPLE_IMAGES } from './exampleContent'
import { siteLabel, type LabelKey } from './siteLabels'

/* Only the sections whose content is written material get a page of their own.
   Photos and reviews are shown, not read — a visitor scrolls past them on the
   start page and is done, so a separate page for them earns nothing. */
export type SectionPageId = 'pricelist' | 'about' | 'blog' | 'contact'

export type SectionPage = {
  /** Own page on/off. Unset falls back to the section's default. */
  enabled?: boolean
  /** The customer's name for the page — also the menu label and the h1. */
  title?: string
  /** Extra content below the section's own content: headings, text, photos. */
  blocks?: ArticleBlock[]
}

type ContentSlice = {
  labels?:          Record<string, string>
  sectionPages?:    Partial<Record<SectionPageId, SectionPage>>
  siteFeatures?:    Record<string, boolean>
  /* What each page has to show. A page with nothing on it is worse than no
     page at all — for the visitor and for how the site is judged in search. */
  gallery_images?:  string[]
  gallery_alts?:    string[]
  featured_reviews?: unknown[]
  articles?:        Article[]
}

/* Which sections are visible at all — an own page never exists for a section
   the customer has switched off entirely. */
export const FEATURES_DEFAULT: Record<string, boolean> = {
  booking: true, pricelist: true, gallery: true, contact: true, blog: false, reviews: true, about: true,
}

/*
 * Menyns ordning, och därmed panelens och sidfotens.
 *
 * Prislistan först: det är vad de flesta besökare kom för. Artiklarna före Om
 * oss, eftersom de är sidorna som svarar på det någon sökte — och en länk högre
 * upp i menyn räknas tyngre internt än en längre ner. Om oss är en
 * förtroendesida man söker upp, inte en man söker efter. Kontakt sist, där folk
 * är van att leta efter den.
 */
export const SECTION_PAGE_IDS: SectionPageId[] = ['pricelist', 'blog', 'about', 'contact']

/* The start page is the taster — a few photos, the top of the price list, the
   short version of who you are — and each own page is the whole thing. That is
   also how a local site earns its search results: one page per topic, each
   answering the phrase someone typed, instead of one long page trying to
   answer them all. Photos and reviews stay on the start page: they are the
   proof beside the text, not a topic anyone searches for on its own. */
export const SECTION_PAGES: Record<SectionPageId, { path: string; labelKey: LabelKey; defaultEnabled: boolean }> = {
  pricelist: { path: 'tjanster',    labelKey: 'navServices',    defaultEnabled: true },
  about:     { path: 'om-oss',      labelKey: 'aboutPageTitle', defaultEnabled: true },
  blog:      { path: 'artiklar',    labelKey: 'navArticles',    defaultEnabled: true },
  /* Kontaktuppgifterna står kvar på startsidan även när sidan finns — de är det
     besökaren letar efter mest, och att kräva ett klick för ett telefonnummer
     är att lägga ett steg mellan kunden och samtalet. Den egna sidan ger kartan
     och den längre texten plats. */
  contact:   { path: 'kontakt',     labelKey: 'contactTitle',   defaultEnabled: true },
}

export function sectionPageOf(content: ContentSlice, id: SectionPageId): SectionPage {
  return content.sectionPages?.[id] ?? {}
}

/** Is the section itself shown? (The on/off switch on the section panel.) */
export function sectionIsOn(content: ContentSlice, id: SectionPageId): boolean {
  return content.siteFeatures?.[id] ?? FEATURES_DEFAULT[id]
}

/** Has the section anything of its own to put on a page? Articles are material
 *  the customer supplies — until the first one is published, a page for them
 *  would be an empty room with a sign on the door. The price list, the about
 *  text and the team are always there, so those pages always hold up. */
export function sectionHasMaterial(content: ContentSlice, id: SectionPageId): boolean {
  if (id === 'blog') return publishedArticles(content.articles).length > 0
  return true
}

/** Does this section have an own page? Requires the section to be on at all. */
export function sectionPageEnabled(content: ContentSlice, id: SectionPageId): boolean {
  if (!sectionIsOn(content, id)) return false
  if (!sectionHasMaterial(content, id)) return false

  /* Ett namn kunden själv tömt betyder att sidan ska bort. Panelen slår om
     reglaget samtidigt, men regeln står här också: en sida utan namn får ingen
     knapp att klicka på och ingen rubrik att öppna med, hur reglaget än råkar
     stå i en rad som sparats innan den kopplingen fanns. */
  if (sectionPageOf(content, id).title === '') return false

  return sectionPageOf(content, id).enabled ?? SECTION_PAGES[id].defaultEnabled
}

/** The page's name — the menu label and the h1. The customer's wording wins. */
export function sectionPageTitle(content: ContentSlice, id: SectionPageId): string {
  return sectionPageOf(content, id).title?.trim() || siteLabel(content.labels, SECTION_PAGES[id].labelKey)
}

/* Words that make the same sentence sound like it was written for this trade
   rather than for "a business". Anything not listed falls back to neutral. */
const TRADE: Record<string, { visit: string; work: string; varies: string }> = {
  salon:      { visit: 'Du bokar tid när det passar dig',      work: 'klippningen eller färgningen', varies: 'hårlängd och hur lång tid det tar' },
  beauty:     { visit: 'Du bokar tid när det passar dig',      work: 'behandlingen',                 varies: 'behandlingens längd' },
  spa:        { visit: 'Du bokar tid när det passar dig',      work: 'behandlingen',                 varies: 'behandlingens längd' },
  fitness:    { visit: 'Du bokar ditt pass när det passar dig', work: 'träningen',                   varies: 'upplägg och antal tillfällen' },
  restaurant: { visit: 'Du bokar bord när det passar dig',     work: 'besöket',                      varies: 'sällskapets storlek' },
  craftsman:  { visit: 'Du hör av dig och beskriver jobbet',   work: 'arbetet',                      varies: 'jobbets omfattning' },
  cleaning:   { visit: 'Du hör av dig och berättar vad du behöver', work: 'städningen',              varies: 'bostadens storlek' },
}
const TRADE_DEFAULT = { visit: 'Du hör av dig när det passar dig', work: 'jobbet', varies: 'uppdragets omfattning' }

type SuggestionSlice = ContentSlice & {
  businessName?: string
  address?:      string
  hours?:        string
  phone?:        string
}

const text    = (t: string): ArticleBlock => ({ type: 'text', text: t })
const heading = (t: string): ArticleBlock => ({ type: 'heading', text: t })

/* A page that opens with nothing on it never gets written — so each one comes
   filled in, built only from what the customer has already told us. Every
   sentence is either their own data or a plain description of how the visit
   works; nothing is claimed on their behalf that could turn out to be untrue.
   The moment they write something themselves, theirs replaces this. */
export function sectionPageSuggestion(content: SuggestionSlice, id: SectionPageId, industry?: string): ArticleBlock[] {
  const t     = TRADE[industry ?? ''] ?? TRADE_DEFAULT
  const name  = content.businessName?.trim() || 'oss'
  const phone = content.phone?.trim()
  const photos = (content.gallery_images ?? [])
    .map((src, i) => ({ src, alt: content.gallery_alts?.[i] ?? '' }))
    .filter(im => im.src?.trim())

  if (id === 'about') {
    /* Their own photographs if they have uploaded any; ours to hold the page
       together until they do. See exampleContent for why. */
    const pics = photos.length ? photos.slice(0, 3) : EXAMPLE_IMAGES.slice(0, 3).map(src => ({ src, alt: '' }))
    return [
      heading('Så går det till hos oss'),
      text(`${t.visit}. Vi börjar med att prata igenom vad du vill ha ut av ${t.work}, så att vi är överens innan vi sätter igång. Du ska aldrig behöva gissa vad som händer härnäst.\n\nDu får veta vad det kostar och ungefär hur lång tid det tar redan från början. Blir det ändringar under vägen säger vi till först — priset ska aldrig vara en överraskning på slutet.`),

      heading('Det här kan du förvänta dig'),
      text(`Vi tar oss tid att lyssna innan vi börjar. Det låter självklart, men det är där de flesta missförstånd uppstår — och det är skillnaden mellan ett resultat du står ut med och ett du är nöjd med.\n\nVi säger också ifrån när vi tror att något inte kommer att bli bra. Hellre en ärlig kvart vid första besöket än en kund som inte kommer tillbaka.`),

      { type: 'images', images: pics },

      heading('Vanliga frågor'),
      text(`Behöver jag boka i förväg? Ja, vi tar helst emot bokade besök så att du slipper vänta. ${phone ? `Ring ${phone} om du vill komma samma dag, så ser vi vad som finns.` : 'Hör av dig om du vill komma samma dag, så ser vi vad som finns.'}\n\nHur betalar jag? Kort och Swish fungerar båda hos oss.\n\nVad händer om jag får förhinder? Hör av dig i god tid så bokar vi om utan kostnad.`),

      ...(content.address?.trim()
        ? [
            heading('Hitta hit'),
            text([
              `Du hittar oss på ${content.address.trim()}.`,
              content.hours?.trim() ? `Öppettider: ${content.hours.trim()}.` : '',
              phone ? `Ring ${phone} om du undrar över något innan du kommer.` : '',
            ].filter(Boolean).join(' ')),
          ]
        : []),
    ]
  }

  if (id === 'blog') {
    return [text(`Här skriver vi om sådant vi får frågor om — tips, nyheter och lite inspiration från ${name}.`)]
  }

  // Price list
  return [
    heading('Bra att veta om priserna'),
    text(`Priserna ovan är utgångspriser och kan variera med ${t.varies}. Du får alltid veta vad det kostar innan vi börjar — inga överraskningar på slutet.`),
    heading('Boka tid'),
    text(phone
      ? `Boka online när det passar dig, eller ring ${phone} så hittar vi en tid tillsammans.`
      : 'Boka online när det passar dig, så hittar vi en tid som fungerar.'),
  ]
}

/** What the page carries below the section itself: the customer's own words
 *  once they have written any, the filled-in starting point until then. */
export function sectionPageBlocks(content: SuggestionSlice, id: SectionPageId, industry?: string): ArticleBlock[] {
  const own = (sectionPageOf(content, id).blocks ?? []).filter(b =>
    b.type === 'images' ? b.images.some(i => i.src) : b.text.trim())
  return own.length ? own : sectionPageSuggestion(content, id, industry)
}

/** Every enabled own page, in menu order — what the nav and footer render. */
export function sectionPageNavItems(content: ContentSlice, siteRoot: string): { id: SectionPageId; label: string; href: string }[] {
  return SECTION_PAGE_IDS
    .filter(id => sectionPageEnabled(content, id))
    .map(id => ({ id, label: sectionPageTitle(content, id), href: `${siteRoot}/${SECTION_PAGES[id].path}` }))
}

type NavSlice = ContentSlice & { pricelistMode?: 'site' | 'booking'; bookingUrl?: string; articles?: Article[] }

/** The buttons a published site's menu and footer show for its own pages.
 *  An external price list points at the booking page; an article page with
 *  nothing published yet stays out of the menu. */
export function sitePageLinks(content: NavSlice, siteRoot: string): { id: SectionPageId; label: string; href: string }[] {
  const external = content.pricelistMode === 'booking' && !!content.bookingUrl?.trim()
  const items = sectionPageNavItems(content, siteRoot)
    .map(p => p.id === 'pricelist' && external ? { ...p, href: content.bookingUrl!.trim() } : p)

  /* Kontakt står alltid i menyn, även utan egen sida — sidfoten ÄR
     kontaktavsnittet, så knappen har alltid någonstans att ta vägen. Utan egen
     sida skrollar den dit i stället, precis som reglaget lovar.
     Läggs den till här och inte hos anroparna kan den inte hamna dubbelt. */
  if (!items.some(p => p.id === 'contact')) {
    items.push({
      id:    'contact',
      label: sectionPageTitle(content, 'contact'),
      href:  `${siteRoot}#kontakt`,
    })
  }

  return items
}

/** Which section a free-text menu word points at — so "Om oss" in the menu
 *  becomes the om oss PAGE when one exists, instead of a scroll anchor. */
export function sectionForNavLabel(label: string): SectionPageId | null {
  const l = label.toLowerCase()
  if (l.includes('om oss') || l === 'om')                          return 'about'
  if (l.includes('artik') || l.includes('blogg') || l.includes('nyhet')) return 'blog'
  if (l.includes('pris') || l.includes('tjänst') || l.includes('meny') ||
      l.includes('behandl') || l.includes('lista') || l.includes('service')) return 'pricelist'
  return null
}
