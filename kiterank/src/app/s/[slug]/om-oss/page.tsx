import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublishedSite, sectionHasPage, sectionPageName, sectionPageExtra } from '../site-data'
import { ArticleNav, F, isDark } from '../artiklar/chrome'
import { siteFontVars, SiteFontFace } from '@/components/SiteFont'
import { BlocksBody } from '@/components/ArticleBody'
import { SectionPageBody } from '@/components/SectionPageBody'

/*
 * The about page — its own address, its own search result. "om oss" and
 * brand-name searches deserve a page whose title and content answer exactly
 * that, instead of pointing at an anchor in the middle of the start page.
 * The story, the people and the pictures live here at full length.
 */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site || !sectionHasPage(site, 'about')) return {}

  const { content } = site
  const where = content.address ? ` | ${content.address}` : ''
  const description = content.aboutBody.length > 155
    ? content.aboutBody.slice(0, 154).trimEnd() + '…'
    : content.aboutBody

  return {
    title: `${sectionPageName(site, 'about')} — ${content.businessName}${where}`,
    description,
    alternates: { canonical: `/s/${site.slug}/om-oss` },
  }
}

export default async function AboutPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site || !sectionHasPage(site, 'about')) notFound()
  // Old address after a rename — send Google and visitors to the current one
  if (site.slug !== slug) permanentRedirect(`/s/${site.slug}/om-oss`)

  const c = site.template.colors
  const { content } = site
  const extra = sectionPageExtra(site, 'about')

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'AboutPage',
    name:        `${sectionPageName(site, 'about')} — ${content.businessName}`,
    description: content.aboutBody,
    mainEntity: {
      '@type':   'LocalBusiness',
      name:       content.businessName,
      telephone:  content.phone,
      address:  { '@type': 'PostalAddress', streetAddress: content.address, addressCountry: 'SE' },
    },
  }

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F, ...siteFontVars(content) }}>
      <SiteFontFace content={content} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ArticleNav site={site} />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px 96px' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: c.h, letterSpacing: -1, lineHeight: 1.15, marginBottom: 24 }}>
          {sectionPageName(site, 'about')}
        </h1>

        {/* The story and the team — same component the editor previews with */}
        <SectionPageBody id="about" c={c} content={content} siteRoot={`/s/${site.slug}`} industry={site.industry} />

        {/* The extra content the customer stacked onto this page */}
        {extra.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <BlocksBody blocks={extra} c={c} altFallback={content.businessName} />
          </div>
        )}

        <a
          href={content.bookingUrl || `/s/${site.slug}`}
          style={{ display: 'inline-block', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
        >
          {content.ctaText || 'Boka tid'}
        </a>
      </main>
    </div>
  )
}
