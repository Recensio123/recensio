import { notFound, redirect, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ServicePage } from '@/app/preview/[templateId]/tjanster/ServicePage'
import { getPublishedSite, pricelistIsExternal, sectionHasPage, sectionPageName, sectionPageExtra } from '../site-data'
import { BlocksBody } from '@/components/ArticleBody'

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
    alternates: { canonical: `/s/${site.slug}/tjanster` },
  }
}

export default async function PublishedServicesPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  // Own page switched off — the price list lives only on the start page
  if (!site || !sectionHasPage(site, 'pricelist')) notFound()
  // Old address after a rename — send Google and visitors to the current one
  if (site.slug !== slug) permanentRedirect(`/s/${site.slug}/tjanster`)

  // Price list lives on the booking page — no second version of it here
  if (pricelistIsExternal(site)) redirect(`/s/${site.slug}`)

  const extra = sectionPageExtra(site, 'pricelist')
  return (
    <div style={{ background: site.template.colors.bg }}>
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
    </div>
  )
}
