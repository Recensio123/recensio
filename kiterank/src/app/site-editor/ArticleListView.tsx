'use client'
import type { SitePage, Article, SiteConfig } from './SiteEditor'

export function ArticleListView({ page, config, onNavigateArticle, onAddArticle, onRemoveArticle }: {
  page:              SitePage
  config:            SiteConfig
  onNavigateArticle: (id: string) => void
  onAddArticle:      () => void
  onRemoveArticle:   (id: string) => void
}) {
  const p = config.primaryColor

  return (
    <div style={{ minHeight: '100%', background: '#fafafa' }}>

      {/* ── Page header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '48px 64px 36px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: p, fontFamily: 'system-ui', marginBottom: '10px', fontWeight: 600 }}>
              {config.brandName}
            </p>
            <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#0f0f0f', lineHeight: 1.1, fontFamily: 'system-ui', margin: 0 }}>
              {page.name}
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '10px', fontFamily: 'system-ui' }}>
              {page.articles.length} {page.articles.length === 1 ? 'article' : 'articles'}
            </p>
          </div>
          <button
            onClick={onAddArticle}
            style={{
              background: p, color: '#fff', padding: '10px 20px', borderRadius: '8px',
              border: 'none', fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            + New article
          </button>
        </div>
      </div>

      {/* ── Article list ── */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 64px 80px' }}>
        {page.articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontFamily: 'system-ui' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px', opacity: 0.3 }}>✍️</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#6b7280' }}>No articles yet</p>
            <p style={{ fontSize: '14px', marginTop: '6px' }}>Click "New article" to write your first post.</p>
          </div>
        ) : (
          <div>
            {page.articles.map((article, i) => (
              <ArticleRow
                key={article.id}
                article={article}
                primaryColor={p}
                isLast={i === page.articles.length - 1}
                onClick={() => onNavigateArticle(article.id)}
                onRemove={() => onRemoveArticle(article.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ArticleRow({ article, primaryColor, isLast, onClick, onRemove }: {
  article:      Article
  primaryColor: string
  isLast:       boolean
  onClick:      () => void
  onRemove:     () => void
}) {
  const blockCount = article.blocks.length
  const readTime   = Math.max(1, Math.round(blockCount * 0.5))

  return (
    <div
      className="group/art"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '20px',
        alignItems: 'start',
        padding: '28px 0',
        borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
      }}
    >
      {/* Clickable content area */}
      <div style={{ cursor: 'pointer' }} onClick={onClick}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <span style={{
            fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#9ca3af', fontFamily: 'system-ui', fontWeight: 500,
          }}>
            {article.publishedAt}
          </span>
          {blockCount > 0 && (
            <span style={{ color: '#d1d5db', fontSize: '10px' }}>·</span>
          )}
          {blockCount > 0 && (
            <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'system-ui' }}>
              {readTime} min read
            </span>
          )}
          {blockCount === 0 && (
            <span style={{
              fontSize: '10px', fontFamily: 'system-ui', color: '#f59e0b',
              background: '#fef3c7', padding: '1px 8px', borderRadius: '100px',
            }}>Draft</span>
          )}
        </div>

        <h2
          style={{
            fontSize: '20px', fontWeight: 700, color: '#0f0f0f',
            fontFamily: 'system-ui', lineHeight: 1.3, marginBottom: '8px',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = primaryColor)}
          onMouseOut={e => (e.currentTarget.style.color = '#0f0f0f')}
        >
          {article.title}
        </h2>

        <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'system-ui', lineHeight: 1.65, marginBottom: '12px' }}>
          {article.excerpt}
        </p>

        <span style={{
          fontSize: '12px', color: primaryColor, fontFamily: 'system-ui',
          fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          Edit article →
        </span>
      </div>

      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="opacity-0 group-hover/art:opacity-100 transition-opacity"
        style={{
          background: '#fee2e2', color: '#ef4444', border: 'none',
          width: '28px', height: '28px', borderRadius: '50%',
          cursor: 'pointer', fontSize: '16px', flexShrink: 0, marginTop: '2px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >×</button>
    </div>
  )
}
