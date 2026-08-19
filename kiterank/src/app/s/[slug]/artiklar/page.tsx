import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { sitePath } from '@/lib/siteHost'
import { getPublishedSite, sectionHasPage, sectionPageExtra, redirectToOwnDomain, sitePathOf } from '../site-data'
import { SitePage, isDark } from './chrome'
import { siteLabel } from '@/lib/siteLabels'
import { BlocksBody } from '@/components/ArticleBody'
import { SectionPageBody } from '@/components/SectionPageBody'

/*
 * Every article the salon has published, newest first. This is the page that
 * keeps growing — the one reason a visitor who isn't booking today has to
 * come back, and the hub Google follows to find each individual article.
 */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site || !sectionHasPage(site, 'blog')) return {}

  const where = site.content.address ? ` i ${site.content.address}` : ''
  const custom = site.content.sectionPages?.blog?.title?.trim()
  return {
    title: `${custom || siteLabel(site.content.labels, 'articlesPageTitle')} — ${site.content.businessName}`,
    description: `Nyheter, tips och inspiration från ${site.content.businessName}${where}.`,
    alternates: { canonical: sitePathOf(site, '/artiklar') },
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

export default async function ArticleListPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (site && site.matchedBy === 'slug' && site.slug !== slug && sectionHasPage(site, 'blog')) permanentRedirect(`/s/${site.slug}/artiklar`)
  // Own page switched off — the articles show only on the start page
  if (!site || !sectionHasPage(site, 'blog')) notFound()
  redirectToOwnDomain(site, slug, '/artiklar')

  const extra = sectionPageExtra(site, 'blog')
  const c     = site.template.colors
  const base  = `/s/${site.slug}`
  const fgSub = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'

  return (
    <SitePage site={site} current="blog">

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '72px 24px 96px' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: c.h, letterSpacing: -1, marginBottom: 12 }}>
          {site.content.sectionPages?.blog?.title?.trim() || siteLabel(site.content.labels, 'articlesPageTitle')}
        </h1>
        <p style={{ fontSize: 16, color: fgSub, marginBottom: 48 }}>
          Från {site.content.businessName}
        </p>

        {/* The extra content the customer stacked onto this page */}
        {extra.length > 0 && (
          <div style={{ maxWidth: 760, marginBottom: 48 }}>
            <BlocksBody blocks={extra} c={c} altFallback={site.content.businessName} />
          </div>
        )}

        {/* The articles themselves — same component the editor previews with */}
        <SectionPageBody id="blog" c={c} content={site.content} siteRoot={base} industry={site.industry} />
      </main>
    </SitePage>
  )
}
