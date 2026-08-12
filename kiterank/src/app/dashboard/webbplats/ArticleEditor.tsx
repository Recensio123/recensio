'use client'
import { useState } from 'react'
import type { Template } from '@/app/onboarding/templates'
import { ArticleBody } from '@/components/ArticleBody'
import { slugifyArticle, formatArticleDate, type Article } from '@/lib/articles'
import { BlocksEditor } from './BlocksEditor'
import { useMedia } from './MediaLibrary'
import { Field, F, inputStyle, useNarrow } from './fields'

/*
 * Writing an article.
 *
 * The panel lists them; writing one opens its own workspace. A 400px column
 * is right for a phone number and wrong for anything with paragraphs and
 * photo sets in it — so an article gets the whole screen, with the page it
 * will become standing next to it.
 */

/* ── The list, as it appears in the panel ──────────────────────────── */

export function ArticleList({ articles, onEdit, onAdd }: {
  articles: Article[]
  onEdit:   (id: string) => void
  onAdd:    () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {articles.length === 0 && (
        <p style={{ fontSize: 12, color: '#64748b', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
          Varje artikel blir en egen sida som Google kan hitta — bra för sådant kunder söker på
          men som inte är en tjänst, till exempel &quot;sommarens färger&quot; eller &quot;så sköter du blont hår&quot;.
        </p>
      )}

      {articles.map(a => (
        <div
          key={a.id}
          onClick={() => onEdit(a.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #1e293b', borderRadius: 10, padding: 10, cursor: 'pointer' }}
        >
          {a.cover
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={a.cover} alt="" style={{ width: 44, height: 34, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            : <span style={{ width: 44, height: 34, borderRadius: 6, background: '#1e293b', flexShrink: 0 }} />}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, color: '#e2e8f0', fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.title || 'Ny artikel'}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: a.published ? '#4ade80' : '#64748b', fontFamily: F, marginTop: 2 }}>
              {a.published ? `Publicerad ${formatArticleDate(a.date)}` : 'Utkast — syns inte på sidan'}
            </span>
          </span>
          <span style={{ fontSize: 11, color: '#eab308', fontFamily: F, whiteSpace: 'nowrap' }}>Öppna →</span>
        </div>
      ))}

      <button
        onClick={onAdd}
        style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #334155', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: F, color: '#eab308' }}
      >
        + Skriv en ny artikel
      </button>
    </div>
  )
}

/* ── The workspace ─────────────────────────────────────────────────── */

export function ArticleWorkspace({ article, template, onChange, onClose, onDelete }: {
  article:  Article
  template: Template
  onChange: (next: Article) => void
  onClose:  () => void
  onDelete: () => void
}) {
  const media = useMedia()
  const c = template.colors

  /* On a phone, writing and the rendered article take turns */
  const narrow = useNarrow()
  const [pane, setPane] = useState<'edit' | 'preview'>('edit')
  const showWrite   = !narrow || pane === 'edit'
  const showRender  = !narrow || pane === 'preview'

  /* The address stays put once an article is live — renaming a published
     article must not silently break the link Google already knows. */
  function setTitle(title: string) {
    onChange({ ...article, title, slug: article.published ? article.slug : slugifyArticle(title) })
  }


  const canPublish = article.title.trim().length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {narrow && (
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
          {([['edit', 'Skriv'], ['preview', 'Förhandsgranska']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setPane(id)} style={{
              flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, fontFamily: F, border: 'none', cursor: 'pointer',
              background: pane === id ? '#0f172a' : 'transparent',
              color: pane === id ? '#f1f5f9' : '#64748b',
              borderBottom: pane === id ? '2px solid #eab308' : '2px solid transparent',
            }}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

      {/* ── Writing ── */}
      <div style={{ flex: '1 1 55%', minWidth: narrow ? 0 : 380, overflowY: 'auto', borderRight: narrow ? 'none' : '1px solid #1e293b', display: showWrite ? 'block' : 'none' }}>
        <div style={{ maxWidth: 660, margin: '0 auto', padding: '20px 28px 60px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: F, padding: 0 }}>
              ← Tillbaka till sidan
            </button>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: article.published ? '#4ade80' : '#64748b', fontFamily: F }}>
              {article.published ? 'Publicerad' : 'Utkast'}
            </span>
          </div>

          <Field label="Rubrik" value={article.title} onChange={setTitle} max={80} />
          <Field
            label="Ingress — den korta texten som lockar in"
            value={article.excerpt}
            onChange={v => onChange({ ...article, excerpt: v })}
            multiline max={200}
          />

          {/* Cover */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 6px' }}>Huvudbild</p>
            <button
              onClick={async () => { const url = await media?.pickImage(); if (url) onChange({ ...article, cover: url }) }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
            >
              {article.cover
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={article.cover} alt="" style={{ width: 96, height: 68, objectFit: 'cover', borderRadius: 8 }} />
                : <span style={{ width: 96, height: 68, borderRadius: 8, border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>+</span>}
              <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: F }}>
                {article.cover ? 'Byt huvudbild' : 'Välj huvudbild'}
              </span>
            </button>
            {article.cover && (
              <input
                value={article.coverAlt}
                onChange={e => onChange({ ...article, coverAlt: e.target.value })}
                placeholder="Beskriv huvudbilden (för Google)"
                maxLength={100}
                style={{ ...inputStyle, marginTop: 10, fontSize: 12, padding: '7px 10px' }}
              />
            )}
          </div>

          {/* Blocks. Each one has a place to add above it, so text and photos
              can go wherever they belong instead of only at the bottom. */}
          <BlocksEditor blocks={article.blocks} onChange={blocks => onChange({ ...article, blocks })} />

          {/* Publish */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #1e293b', paddingTop: 16 }}>
            <button
              onClick={() => onChange({ ...article, published: !article.published, slug: article.slug || slugifyArticle(article.title) })}
              disabled={!canPublish}
              style={{
                padding: '10px 22px', fontSize: 13, fontWeight: 700, fontFamily: F, borderRadius: 8, border: 'none',
                cursor: canPublish ? 'pointer' : 'not-allowed',
                background: article.published ? '#1e293b' : '#eab308',
                color:      article.published ? '#94a3b8' : '#0f172a',
                opacity:    canPublish ? 1 : 0.5,
              }}
            >
              {article.published ? 'Avpublicera' : 'Publicera'}
            </button>
            <span style={{ flex: 1, fontSize: 12, color: '#64748b', fontFamily: F }}>
              {!canPublish ? 'Ge artikeln en rubrik först'
                : article.published ? 'Syns på din sida — glöm inte Spara' : 'Utkast — bara du ser den'}
            </span>
            <button
              onClick={() => {
                // Deleting is permanent — an article can be hours of writing
                if (confirm(`Artikeln "${article.title || 'Ny artikel'}" tas bort permanent. Säker?`)) onDelete()
              }}
              style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 13, cursor: 'pointer', fontFamily: F }}
            >
              Ta bort artikeln
            </button>
          </div>
        </div>
      </div>

      {/* ── The article, as it will look ── */}
      <div style={{ flex: '1 1 45%', minWidth: narrow ? 0 : 320, overflowY: 'auto', background: c.bg, display: showRender ? 'block' : 'none' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px 80px' }}>
          <ArticleBody article={article} c={c} />
        </div>
      </div>
      </div>
    </div>
  )
}
