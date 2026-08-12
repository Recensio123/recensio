'use client'
import type { TemplateColors } from '@/app/onboarding/templates'
import type { SiteContent } from '@/app/preview/[templateId]/PreviewSite'
import { PricelistSection } from '@/app/preview/[templateId]/PreviewSite'
import { publishedArticles, articleSummary, formatArticleDate } from '@/lib/articles'
import { siteLabel } from '@/lib/siteLabels'
import type { SectionPageId } from '@/lib/sectionPages'

/*
 * What a section's own page carries over from the site by itself.
 *
 * The customer already wrote this once — the about text, the photos, the
 * reviews they picked — so the page brings it along instead of asking for it
 * again. Rendered by one component so the editor's preview and the published
 * page cannot show different things: the customer needs to trust that what
 * they see while editing is what a visitor gets.
 */

const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'

function isDark(hex: string) {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

export function SectionPageBody({ id, c, content, siteRoot, industry }: {
  id:        SectionPageId
  c:         TemplateColors
  content:   SiteContent
  /** The site's root path — article links need it. Absent in the preview. */
  siteRoot?: string
  industry?: string
}) {
  const fgSub   = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)'

  if (id === 'about') {
    const team = content.teamEnabled === false ? [] : (content.team ?? []).filter(m => m.name?.trim())
    return (
      <>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: c.h, letterSpacing: -0.8, lineHeight: 1.2, marginBottom: 24, fontFamily: F }}>
          {content.aboutTitle}
        </h2>
        {content.aboutImage?.trim() && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.aboutImage} alt={content.aboutTitle} style={{ width: '100%', borderRadius: 12, display: 'block', marginBottom: 32 }} />
        )}
        <p style={{ fontSize: 17, color: fgSub, lineHeight: 1.85, marginBottom: 48, whiteSpace: 'pre-wrap', fontFamily: F }}>
          {content.aboutBody}
        </p>
        {team.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 13, color: fgSub, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24, fontFamily: F }}>
              {siteLabel(content.labels, 'teamTitle')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 24 }}>
              {team.map(m => (
                <div key={m.name} style={{ textAlign: 'center' }}>
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt={m.name} style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px', display: 'block' }} />
                  ) : (
                    <div style={{ width: 110, height: 110, borderRadius: '50%', background: c.a + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: c.a, fontSize: 32, fontWeight: 800, fontFamily: F }}>
                      {m.name.charAt(0)}
                    </div>
                  )}
                  <p style={{ fontSize: 15, fontWeight: 700, color: c.h, fontFamily: F }}>{m.name}</p>
                  <p style={{ fontSize: 12, color: fgSub, marginTop: 4, fontFamily: F }}>{m.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </>
    )
  }

  if (id === 'blog') {
    const articles = publishedArticles(content.articles)
    if (!articles.length) {
      return <p style={{ fontSize: 16, color: fgSub, marginBottom: 48, fontFamily: F }}>{siteLabel(content.labels, 'noArticles')}</p>
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, marginBottom: 56 }}>
        {articles.map(a => (
          <a
            key={a.id}
            href={siteRoot ? `${siteRoot}/artiklar/${a.slug}` : undefined}
            style={{ display: 'block', border: `1px solid ${divider}`, borderRadius: 12, overflow: 'hidden', textDecoration: 'none' }}
          >
            {a.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.cover} alt={a.coverAlt || a.title} loading="lazy" style={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'cover', display: 'block' }} />
            )}
            <div style={{ padding: '18px 20px 22px' }}>
              {a.date && (
                <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontFamily: F }}>
                  {formatArticleDate(a.date)}
                </p>
              )}
              <h2 style={{ fontSize: 20, fontWeight: 700, color: c.h, lineHeight: 1.3, marginBottom: 8, fontFamily: F }}>{a.title}</h2>
              <p style={{ fontSize: 14, color: fgSub, lineHeight: 1.6, fontFamily: F }}>{articleSummary(a, 140)}</p>
            </div>
          </a>
        ))}
      </div>
    )
  }

  // The price list, exactly as the start page shows it
  return (
    <div style={{ margin: '0 -24px 24px' }}>
      <PricelistSection c={c} content={content} th={siteRoot ?? ''} industry={industry} />
    </div>
  )
}
