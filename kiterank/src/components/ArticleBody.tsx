'use client'
import type { TemplateColors } from '@/app/onboarding/templates'
import { formatArticleDate, type Article } from '@/lib/articles'

/*
 * An article, rendered.
 *
 * Used by the published page and by the editor's live preview, so what the
 * customer writes against is the page itself — not a drawing of it. Any
 * change to how an article looks happens once, here.
 */

const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'

function isDark(hex: string) {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

export function ArticleBody({ article, c }: { article: Article; c: TemplateColors }) {
  const fgSub = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'

  return (
    <>
      {article.date && (
        <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 12px', fontFamily: F }}>
          {formatArticleDate(article.date)}
        </p>
      )}
      <h1 style={{ fontSize: 40, fontWeight: 800, color: c.h, letterSpacing: -1, lineHeight: 1.15, marginBottom: 20, fontFamily: F }}>
        {article.title || 'Rubrik'}
      </h1>
      {article.excerpt.trim() && (
        <p style={{ fontSize: 19, color: fgSub, lineHeight: 1.7, marginBottom: 36, fontFamily: F }}>{article.excerpt}</p>
      )}

      {article.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover}
          alt={article.coverAlt || article.title}
          style={{ width: '100%', borderRadius: 12, display: 'block', marginBottom: 40 }}
        />
      )}

      {article.blocks.map((block, i) => {
        // Subheadings are what let a long article be skimmed — and what tells
        // Google which question each part of the page answers
        if (block.type === 'heading') {
          if (!block.text.trim()) return null
          return (
            <h2 key={i} style={{ fontSize: 26, fontWeight: 800, color: c.h, letterSpacing: -0.4, lineHeight: 1.3, margin: '12px 0 18px', fontFamily: F }}>
              {block.text}
            </h2>
          )
        }

        if (block.type === 'text') {
          if (!block.text.trim()) return null
          return (
            <div key={i} style={{ marginBottom: 32 }}>
              {block.text.split(/\n{2,}/).map((para, j) => (
                <p key={j} style={{ fontSize: 17, color: fgSub, lineHeight: 1.8, marginBottom: 18, whiteSpace: 'pre-wrap', fontFamily: F }}>
                  {para}
                </p>
              ))}
            </div>
          )
        }

        const images = block.images.filter(im => im.src)
        if (!images.length) return null
        // One photo runs full width; a set lines up so it can be compared at a
        // glance. Row length follows the count so no photo is left orphaned on
        // a row of its own: 2 and 4 pair up, everything else goes three across.
        const cols = images.length === 1 ? 1 : images.length === 2 || images.length === 4 ? 2 : 3
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 36 }}>
            {images.map((im, j) => (
              <figure key={j} style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={im.src}
                  alt={im.alt || article.title}
                  loading="lazy"
                  style={{ width: '100%', borderRadius: 10, display: 'block' }}
                />
                {im.alt?.trim() && (
                  <figcaption style={{ fontSize: 13, color: fgSub, marginTop: 8, lineHeight: 1.5, fontFamily: F }}>{im.alt}</figcaption>
                )}
              </figure>
            ))}
          </div>
        )
      })}
    </>
  )
}
