import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getPublishedSite, articlesOf, articleSummary, articleImages, formatArticleDate,
  type PublishedSite, type Article,
} from '../../site-data'
import { ArticleNav, F, isDark } from '../chrome'
import { ArticleBody } from '@/components/ArticleBody'
import { siteLabel } from '@/lib/siteLabels'
import { siteFontVars, SiteFontFace } from '@/components/SiteFont'

/*
 * One article. Text and photo groups in the order the salon arranged them,
 * so a styling series reads the way it was meant to: a few words, then the
 * pictures that prove them.
 */

type Props = { params: Promise<{ slug: string; artikel: string }> }

async function resolve(p: { slug: string; artikel: string }): Promise<{ site: PublishedSite; article: Article; others: Article[] } | null> {
  const site = await getPublishedSite(p.slug)
  if (!site) return null
  const all = articlesOf(site)
  const article = all.find(a => a.slug === p.artikel)
  if (!article) return null
  return { site, article, others: all.filter(a => a.id !== article.id) }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve(await params)
  if (!r) return {}

  const { site, article } = r
  const description = articleSummary(article)
  const images = articleImages(article).slice(0, 1).map(i => i.src)

  return {
    title: `${article.title} — ${site.content.businessName}`,
    description,
    alternates: { canonical: `/s/${site.slug}/artiklar/${article.slug}` },
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      locale: 'sv_SE',
      ...(images.length ? { images } : {}),
      ...(article.date ? { publishedTime: article.date } : {}),
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const p = await params
  const r = await resolve(p)
  if (!r) notFound()
  // Old address after a rename — send Google and visitors to the current one
  if (r.site.slug !== p.slug) permanentRedirect(`/s/${r.site.slug}/artiklar/${p.artikel}`)

  const { site, article, others } = r
  const c = site.template.colors
  const { content } = site
  const base    = `/s/${site.slug}`
  const fgSub   = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)'

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'BlogPosting',
    headline:    article.title,
    description: articleSummary(article),
    image:       articleImages(article).map(i => i.src),
    ...(article.date ? { datePublished: article.date, dateModified: article.date } : {}),
    author:    { '@type': 'Organization', name: content.businessName },
    publisher: { '@type': 'Organization', name: content.businessName },
  }

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F, ...siteFontVars(content) }}>
      <SiteFontFace content={content} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ArticleNav site={site} />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 96px' }}>
        <a href={`${base}/artiklar`} style={{ fontSize: 13, color: c.a, textDecoration: 'none' }}>{siteLabel(content.labels, 'articlesBack')}</a>

        <div style={{ marginTop: 28 }}>
          <ArticleBody article={article} c={c} />
        </div>

        <a
          href={content.bookingUrl || base}
          style={{ display: 'inline-block', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none', margin: '24px 0 64px' }}
        >
          {content.ctaText || 'Boka tid'}
        </a>

        {others.length > 0 && (
          <section style={{ borderTop: `1px solid ${divider}`, paddingTop: 32 }}>
            <h2 style={{ fontSize: 13, color: fgSub, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 18 }}>
              {siteLabel(content.labels, 'articlesMore')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {others.slice(0, 6).map(o => (
                <a
                  key={o.id}
                  href={`${base}/artiklar/${o.slug}`}
                  style={{ border: `1px solid ${divider}`, borderRadius: 10, padding: '14px 16px', textDecoration: 'none' }}
                >
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: c.h, marginBottom: 4 }}>{o.title}</span>
                  {o.date && <span style={{ display: 'block', fontSize: 12, color: fgSub }}>{formatArticleDate(o.date)}</span>}
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
