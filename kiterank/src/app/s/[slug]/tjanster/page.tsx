import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ServicePage } from '@/app/preview/[templateId]/tjanster/ServicePage'
import { getPublishedSite, pricelistIsExternal } from '../site-data'

/*
 * The published services & prices page. Prices on the page is the single
 * biggest booking factor for a salon site, and for search this page carries
 * every service name — the exact phrases people type in.
 */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) return {}

  const { content } = site
  const where = content.address ? ` i ${content.address}` : ''
  return {
    title: `Tjänster & priser — ${content.businessName}${where}`,
    description: `Alla behandlingar och priser hos ${content.businessName}. Boka din tid online.`,
    alternates: { canonical: `/s/${site.slug}/tjanster` },
  }
}

export default async function PublishedServicesPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) notFound()

  // Price list lives on the booking page — no second version of it here
  if (pricelistIsExternal(site)) redirect(`/s/${site.slug}`)

  return (
    <ServicePage
      template={site.template}
      industry={site.industry}
      content={site.content}
      basePath={`/s/${site.slug}`}
    />
  )
}
