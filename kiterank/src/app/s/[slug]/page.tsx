import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { sitePath, siteAbsUrl } from '@/lib/siteHost'
import { PreviewSite } from '@/components/site/PreviewSite'
import { getPublishedSite, redirectToOwnDomain, sitePathOf, siteAbsUrlOf, siteRootOf } from './site-data'

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
    alternates: { canonical: sitePathOf(site) },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: content.siteLang === 'sv' || !content.siteLang ? 'sv_SE' : content.siteLang,
      ...(share ? { images: [share] } : {}),
    },
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

export default async function PublishedSitePage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) notFound()
  redirectToOwnDomain(site, slug, '')
  // Old address after a rename — send Google and visitors to the current one
  if (site.matchedBy === 'slug' && site.slug !== slug) permanentRedirect(`/s/${site.slug}`)

  return (
    <PreviewSite
      template={site.template}
      industry={site.industry}
      contentOverride={site.content}
      tjansterBase={siteRootOf(site)}
      care={site.care}
      siteBase={siteAbsUrlOf(site)}
    />
  )
}
