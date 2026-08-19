import { type SiteContent } from '@/components/site/PreviewSite'
import { TRADES } from '@/lib/trades'
import { socialLinks } from '@/lib/siteSocial'

/*
 * One business, described from several pages.
 *
 * Every page used to declare its own company. The home page said HairSalon
 * with an address, opening hours and the full price list; a service page said
 * `provider: LocalBusiness` with a name and a phone number; About and Contact
 * each had a third and fourth variant. Nothing tied them together, so what
 * Google could see was not one business described four ways but four loosely
 * related nodes — and the thin ones undercut the complete one.
 *
 * The fix is the one linked data was built for: the business gets a stable
 * `@id`, the home page carries the whole node, and every other page states
 * only what is its own and points at the business by `@id`. Add a page and the
 * same entity grows; it never gets restated in a weaker form.
 *
 * Keeping it in one module is half the point. Four hand-written objects in
 * four files is what let them drift apart.
 */

/*
 * The type each trade is described as.
 *
 * The rule is one line: the most specific type that exists, and the sector
 * parent when none does — never the bare LocalBusiness, which says only that
 * the business has an address.
 *
 * Schema.org's HealthAndBeautyBusiness branch has exactly six children —
 * BeautySalon, DaySpa, HairSalon, HealthClub, NailSalon, TattooParlor. A hair
 * salon and a nail salon land on their own type. A massage salon has no type
 * at all in the vocabulary and lands on the parent, which is the ceiling of
 * what schema.org offers rather than a compromise.
 *
 * The one thing the trade cannot decide is the branch. Massage, foot care and
 * skin care are wellness in one salon and treatment in the next, and the two
 * belong under different parents. So trades that straddle it carry `askCare`,
 * the customer answers once during setup, and that answer is what arrives here
 * as `care`.
 *
 * None of this is the lever that decides local ranking — the category shown in
 * Maps comes from the Google Business Profile. It is what makes the site
 * legible, and it costs nothing to get right.
 */
const BEAUTY_PARENT = 'HealthAndBeautyBusiness'
const CARE_PARENT   = 'MedicalBusiness'

export type CareAnswer = 'wellness' | 'care'

export function schemaTypeFor(industry?: string, care?: CareAnswer | null): string {
  if (care === 'care') return CARE_PARENT
  /* Matched by exact id — tradePack() falls back to the hair salon for unknown
     ids, which is right for wording and wrong for a claim about the business. */
  const pack = TRADES.find(t => t.id === industry)
  if (!pack) return 'LocalBusiness'
  return pack.schemaType ?? BEAUTY_PARENT
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiterank.se'

/*
 * Absolute addresses for the markup.
 *
 * A page served on the salon's own domain has to name that domain here too.
 * If the identifier and the urls kept pointing at kiterank.se, we would be
 * telling Google that the salon's own site is a copy of a page on ours — which
 * is the one mistake that would cost them exactly what they bought the domain
 * for. The caller passes the address the request came in on; the fallback is
 * only for the template demos, which have no request of their own.
 */
export function siteUrl(slug: string, path = '', base?: string): string {
  return base ? `${base}${path}` : `${APP_URL}/s/${slug}${path}`
}

/** The one name every page uses for the business. */
export function businessId(slug: string, base?: string): string {
  return `${siteUrl(slug, '', base)}#business`
}

/** What a sub-page says instead of describing the company again. */
export function businessRef(slug: string, base?: string) {
  return { '@id': businessId(slug, base) }
}

/** "450 kr" → 450; anything without a number is skipped. */
export function priceOf(s: string): number | null {
  const m = s.replace(/\s/g, '').match(/(\d+)/)
  return m ? Number(m[1]) : null
}

type Service = { slug?: string; name: string; desc: string; price: string }

/**
 * The full business node. Home page only — everywhere else references it.
 *
 * `slug` is optional because the template previews render the same component
 * without being published; those stay anonymous, with no `@id` and no url.
 */
export function businessNode({
  content, industry, slug, care, base,
}: {
  content:   SiteContent
  industry?: string
  slug?:     string
  care?:     CareAnswer | null
  /** The address this page is being served on. */
  base?:     string
}) {
  const services: Service[] = content.services ?? []
  const prices = services.map(s => priceOf(s.price)).filter((p): p is number => p !== null)
  const priceRange = prices.length ? `${Math.min(...prices)}–${Math.max(...prices)} kr` : undefined
  const sameAs = socialLinks(content.social).map(s => s.href)

  return {
    '@context': 'https://schema.org',
    '@type':     schemaTypeFor(industry, care),
    ...(slug ? { '@id': businessId(slug, base), url: siteUrl(slug, '', base) } : {}),
    name:        content.businessName,
    description: content.heroBody,
    telephone:   content.phone,
    /* Bara när den finns. Ett tomt fält i strukturerad data är en uppgift vi
       påstår oss ha om salongen, och den påstår ingenting. */
    ...(content.email?.trim() ? { email: content.email.trim() } : {}),
    address: {
      '@type':        'PostalAddress',
      streetAddress:   content.address,
      addressCountry: 'SE',
    },
    openingHours: content.hours,
    ...(priceRange ? { priceRange } : {}),
    ...(content.logo ? { logo: content.logo } : {}),
    /* The profiles belong on the business itself, not on a page about it —
       this is what lets Google tie the salon's Instagram to the salon. */
    ...(sameAs.length ? { sameAs } : {}),
    ...(services.length ? {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name:    'Tjänster',
        itemListElement: services.map(s => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: s.name, description: s.desc },
          ...(priceOf(s.price) !== null ? { price: priceOf(s.price), priceCurrency: 'SEK' } : {}),
        })),
      },
    } : {}),
  }
}

/** A single treatment, on its own page. */
export function serviceNode({
  service, content, slug, base,
}: {
  service: { slug: string; name: string; desc: string; price: string }
  content: SiteContent
  slug:    string
  base?:   string
}) {
  const price = priceOf(service.price)
  return {
    '@context': 'https://schema.org',
    '@type':    'Service',
    '@id':       `${siteUrl(slug, `/tjanster/${service.slug}`, base)}#service`,
    name:        service.name,
    description: service.desc,
    provider:    businessRef(slug, base),
    ...(content.address ? { areaServed: content.address } : {}),
    ...(price !== null ? {
      offers: {
        '@type':        'Offer',
        price,
        priceCurrency: 'SEK',
        url:            siteUrl(slug, `/tjanster/${service.slug}`, base),
      },
    } : {}),
  }
}

/** The treatment menu — an ordered list pointing at the pages themselves. */
export function serviceListNode({
  services, slug, name, base,
}: {
  services: { slug: string; name: string; desc: string; price: string }[]
  slug:     string
  name:     string
  base?:    string
}) {
  return {
    '@context': 'https://schema.org',
    '@type':    'ItemList',
    name,
    itemListElement: services.map((s, i) => ({
      '@type':   'ListItem',
      position:   i + 1,
      url:        siteUrl(slug, `/tjanster/${s.slug}`, base),
      item: {
        '@type':     'Service',
        '@id':        `${siteUrl(slug, `/tjanster/${s.slug}`, base)}#service`,
        name:         s.name,
        description:  s.desc,
        provider:     businessRef(slug, base),
      },
    })),
  }
}

/** About and Contact describe a page about the business, not a new business. */
export function pageNode({
  type, name, slug, description, sameAs, base,
}: {
  type:         'AboutPage' | 'ContactPage'
  name:         string
  slug:         string
  description?: string
  sameAs?:      string[]
  base?:        string
}) {
  return {
    '@context': 'https://schema.org',
    '@type':     type,
    name,
    ...(description ? { description } : {}),
    mainEntity: {
      ...businessRef(slug, base),
      ...(sameAs?.length ? { sameAs } : {}),
    },
  }
}
