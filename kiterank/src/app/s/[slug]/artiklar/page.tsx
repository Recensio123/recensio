import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublishedSite, sectionHasPage, sectionPageExtra } from '../site-data'
import { ArticleNav, F, isDark } from './chrome'
import { siteLabel } from '@/lib/siteLabels'
import { siteFontVars, SiteFontFace } from '@/components/SiteFont'
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
    alternates: { canonical: `/s/${site.slug}/artiklar` },
  }
}

export default async function ArticleListPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (site && site.slug !== slug && sectionHasPage(site, 'blog')) permanentRedirect(`/s/${site.slug}/artiklar`)
  // Own page switched off — the articles show only on the start page
  if (!site || !sectionHasPage(site, 'blog')) notFound()

  const extra = sectionPageExtra(site, 'blog')
  const c     = site.template.colors
  const base  = `/s/${site.slug}`
  const fgSub = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F, ...siteFontVars(site.content) }}>
      <SiteFontFace content={site.content} />
      <ArticleNav site={site} />

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
    </div>
  )
}
