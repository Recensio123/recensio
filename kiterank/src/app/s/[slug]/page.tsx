import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PreviewSite } from '@/app/preview/[templateId]/PreviewSite'
import { getPublishedSite } from './site-data'

/*
 * The customer's live website. /s/<slug> is the temporary address every site
 * gets the moment it exists — the own domain points here later. This is the
 * page Google indexes, so the metadata is written for the search result:
 * name, what they do, where — the words a customer actually searches for.
 */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) return {}

  const { content } = site
  // "Studio Söder — Frisörsalong i Stockholm" beats a bare name in results,
  // and the tagline is the customer's own wording for what they do. Anything
  // written in the editor's Google fields overrides the generated version.
  const where = content.address ? ` | ${content.address}` : ''
  const title = content.seo?.title?.trim()
    || `${content.businessName} — ${content.tagline}${where}`
  const description = content.seo?.description?.trim() || content.heroBody

  // Shared on Facebook or Instagram, a page without an image is a blank card.
  // The customer's own picture, in the order it best represents them.
  const share = [
    content.heroImage,
    content.featureImage,
    content.gallery_images?.find(src => src?.trim()),
    content.aboutImage,
    content.logo,
  ].find(src => src?.trim())

  return {
    title,
    description,
    alternates: { canonical: `/s/${site.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: content.siteLang === 'sv' || !content.siteLang ? 'sv_SE' : content.siteLang,
      ...(share ? { images: [share] } : {}),
    },
  }
}

export default async function PublishedSitePage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) notFound()

  return (
    <PreviewSite
      template={site.template}
      industry={site.industry}
      contentOverride={site.content}
      tjansterBase={`/s/${site.slug}`}
    />
  )
}
