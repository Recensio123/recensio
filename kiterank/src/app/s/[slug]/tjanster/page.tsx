import { notFound, redirect, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { sitePath, siteAbsUrl } from '@/lib/siteHost'
import { ServicePage } from '@/components/site/ServicePage'
import { getPublishedSite, pricelistIsExternal, sectionHasPage, sectionPageName, sectionPageExtra, servicesOf, redirectToOwnDomain, sitePathOf } from '../site-data'
import { serviceListNode } from '@/lib/siteSchema'
import { BlocksBody } from '@/components/ArticleBody'
import { SitePage } from '../artiklar/chrome'

/*
 * The published services & prices page. Prices on the page is the single
 * biggest booking factor for a salon site, and for search this page carries
 * every service name — the exact phrases people type in.
 */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site || !sectionHasPage(site, 'pricelist')) return {}

  const { content } = site
  const where = content.address ? ` i ${content.address}` : ''
  const custom = site.content.sectionPages?.pricelist?.title?.trim()
  return {
    title: `${custom || 'Tjänster & priser'} — ${content.businessName}${where}`,
    description: `Alla behandlingar och priser hos ${content.businessName}. Boka din tid online.`,
    alternates: { canonical: sitePathOf(site, '/tjanster') },
  }
}

/*
 * Inga adresser är kända när vi bygger — kunderna tillkommer efteråt. Den
 * tomma listan säger just det, och gör samtidigt sidan cachebar: första
 * besökaren på en adress renderar den, alla efter får den färdig. Utan den
 * här raden renderas sidan om vid varje besök, för varje kund, för alltid.
 *
 * Vad som rensar cachen står i site-data: clearSiteCache vid sparning.
 */
export async function generateStaticParams() { return [] }

export default async function PublishedServicesPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  // Own page switched off — the price list lives only on the start page
  if (!site || !sectionHasPage(site, 'pricelist')) notFound()
  redirectToOwnDomain(site, slug, '/tjanster')
  // Old address after a rename — send Google and visitors to the current one
  if (site.matchedBy === 'slug' && site.slug !== slug) permanentRedirect(`/s/${site.slug}/tjanster`)

  // Price list lives on the booking page — no second version of it here
  if (pricelistIsExternal(site)) redirect(`/s/${site.slug}`)

  const extra = sectionPageExtra(site, 'pricelist')

  /* The treatment menu, marked up as the list it is — every entry pointing at
     its own page and at the one business node. This page carried no markup at
     all, which left the most service-heavy page on the site the least legible
     one to a search engine. */
  const schema = serviceListNode({
    services: servicesOf(site),
    slug:     site.slug,
    name:     sectionPageName(site, 'pricelist'),
  })

  return (
    <SitePage site={site} current="pricelist">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ServicePage
        template={site.template}
        industry={site.industry}
        content={site.content}
        basePath={`/s/${site.slug}`}
      />
      {/* The extra content the customer stacked onto this page */}
      {extra.length > 0 && (
        <main style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px 96px' }}>
          <BlocksBody blocks={extra} c={site.template.colors} altFallback={sectionPageName(site, 'pricelist')} />
        </main>
      )}
    </SitePage>
  )
}
