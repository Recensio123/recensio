import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { sitePath, siteAbsUrl } from '@/lib/siteHost'
import { BookButton } from '@/components/site/PreviewSite'
import { getPublishedSite, sectionHasPage, sectionPageName, sectionPageExtra, redirectToOwnDomain, sitePathOf, siteAbsUrlOf } from '../site-data'
import { SitePage, isDark } from '../artiklar/chrome'
import { pageNode } from '@/lib/siteSchema'
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
    alternates: { canonical: sitePathOf(site, '/om-oss') },
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

export default async function AboutPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site || !sectionHasPage(site, 'about')) notFound()
  redirectToOwnDomain(site, slug, '/om-oss')
  // Old address after a rename — send Google and visitors to the current one
  if (site.matchedBy === 'slug' && site.slug !== slug) permanentRedirect(`/s/${site.slug}/om-oss`)

  const c = site.template.colors
  const { content } = site
  const extra = sectionPageExtra(site, 'about')

  const schema = pageNode({
    type:        'AboutPage',
    name:        `${sectionPageName(site, 'about')} — ${content.businessName}`,
    description: content.aboutBody,
    slug:        site.slug,
    base:        siteAbsUrlOf(site),
  })

  return (
    <SitePage site={site} current="about">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

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

        {/* No map here. It takes a third of the screen and pushes the booking
            button below the fold on the one page a visitor reads to decide
            whether to come at all. The map lives on Kontakt, which is where
            someone goes once they have already decided. */}

        <BookButton content={content} style={{ display: 'inline-block', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none' }} />
      </main>
    </SitePage>
  )
}
