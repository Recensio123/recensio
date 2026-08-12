import type { ServiceCategory } from '@/app/preview/[templateId]/tjanster/services-data'

/*
 * One content pack per salon trade.
 *
 * A pack is everything needed to hand a new customer a finished website: the
 * words their trade uses, a real price list, six articles worth reading, the
 * questions their customers actually ask. The generator in lib/siteTemplates
 * weaves their own answers through it — the pack decides what a site looks
 * like when they tell us nothing, and what vocabulary is used when they do.
 *
 * Nothing in a pack may claim anything about a particular business. It
 * describes the trade — how a visit works, what a treatment involves — never
 * how long someone has been open or how many customers they have.
 */

export type TradeArticle = {
  title:   string
  slug:    string
  excerpt: string
  /** Heading + body, in order. Photos are placed between them by the builder. */
  sections: { h: string; p: string }[]
}

export type TradePack = {
  /** Stable id, also the industry key stored on the company. */
  id:    string
  /** What a customer picking their trade sees. */
  pick:  { label: string; desc: string; icon: string }
  /** The business in a sentence: "Frisörsalong i Södermalm". */
  label: string
  /** What the customer books: "klippningen", "behandlingen". */
  work:  string
  /** What makes the price vary, for the price-page note. */
  varies: string
  heroKicker:  string
  heroHeading: string
  heroBody:    string
  aboutTitle:  string
  aboutBody:   string
  ctaText:     string
  /** Three services lifted onto the start page. */
  featured: { name: string; desc: string; price: string }[]
  /** The full price list — categories with real treatments, times and prices. */
  categories: ServiceCategory[]
  /** How a visit works, as paragraphs on the about page. */
  visit: string[]
  /** What this trade's customers ask before booking. */
  faq: { q: string; a: string }[]
  /** Job titles for the example team, most senior first. */
  teamTitles: string[]
  /** Captions for the example gallery — what the photos would show. */
  galleryAlts: string[]
  /* Six example reviews, so the customer sees what the section looks like
     full rather than empty. These are written by us and marked as examples
     everywhere they appear: they show the layout, they are never presented
     as anyone's real reviews, and they do not go out on a published site.
     The real ones arrive when the customer connects their Google profile. */
  reviews: { author: string; rating: number; text: string }[]
  /** Six articles, written for this trade. */
  articles: TradeArticle[]
}
