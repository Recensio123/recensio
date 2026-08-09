import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublishedSite, articlesOf, articleSummary, formatArticleDate } from '../site-data'
import { ArticleNav, F, isDark } from './chrome'
import { siteLabel } from '@/lib/siteLabels'
import { siteFontVars, SiteFontFace } from '@/components/SiteFont'

/*
 * Every article the salon has published, newest first. This is the page that
 * keeps growing — the one reason a visitor who isn't booking today has to
 * come back, and the hub Google follows to find each individual article.
 */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) return {}

  const where = site.content.address ? ` i ${site.content.address}` : ''
  return {
    title: `${siteLabel(site.content.labels, 'articlesPageTitle')} — ${site.content.businessName}`,
    description: `Nyheter, tips och inspiration från ${site.content.businessName}${where}.`,
    alternates: { canonical: `/s/${site.slug}/artiklar` },
  }
}

export default async function ArticleListPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) notFound()

  const articles = articlesOf(site)
  const c = site.template.colors
  const base    = `/s/${site.slug}`
  const fgSub   = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F, ...siteFontVars(site.content) }}>
      <SiteFontFace content={site.content} />
      <ArticleNav site={site} />

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '72px 24px 96px' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: c.h, letterSpacing: -1, marginBottom: 12 }}>
          {siteLabel(site.content.labels, 'articlesPageTitle')}
        </h1>
        <p style={{ fontSize: 16, color: fgSub, marginBottom: 48 }}>
          Från {site.content.businessName}
        </p>

        {articles.length === 0 ? (
          <p style={{ fontSize: 16, color: fgSub }}>{siteLabel(site.content.labels, 'noArticles')}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {articles.map(a => (
              <a
                key={a.id}
                href={`${base}/artiklar/${a.slug}`}
                style={{ display: 'block', border: `1px solid ${divider}`, borderRadius: 12, overflow: 'hidden', textDecoration: 'none' }}
              >
                {a.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover} alt={a.coverAlt || a.title} loading="lazy" style={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: '18px 20px 22px' }}>
                  {a.date && (
                    <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                      {formatArticleDate(a.date)}
                    </p>
                  )}
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: c.h, lineHeight: 1.3, marginBottom: 8 }}>{a.title}</h2>
                  <p style={{ fontSize: 14, color: fgSub, lineHeight: 1.6 }}>{articleSummary(a, 140)}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
