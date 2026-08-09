'use client'
import { useState } from 'react'
import type { Template } from '@/app/onboarding/templates'
import { uploadImage } from '@/lib/uploadImage'
import { ArticleBody } from '@/components/ArticleBody'
import {
  slugifyArticle, formatArticleDate,
  type Article, type ArticleBlock, type ArticleImage,
} from '@/lib/articles'
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
  const [busy,     setBusy]     = useState(0)
  const [error,    setError]    = useState('')
  const [insertAt, setInsertAt] = useState<number | null>(null)
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

  async function withUpload<T>(run: () => Promise<T>) {
    setError('')
    setBusy(n => n + 1)
    try { await run() }
    catch (err) { setError(err instanceof Error ? err.message : 'Uppladdningen misslyckades') }
    finally { setBusy(n => n - 1) }
  }

  function addImages(bi: number, files: File[]) {
    return withUpload(async () => {
      const uploaded = await Promise.all(
        files.slice(0, 12).map(async f => ({ src: await uploadImage(f), alt: '' } as ArticleImage))
      )
      onChange({
        ...article,
        blocks: article.blocks.map((b, i) =>
          i === bi && b.type === 'images' ? { ...b, images: [...b.images, ...uploaded] } : b),
      })
    })
  }

  function setCover(file: File) {
    return withUpload(async () => {
      const src = await uploadImage(file)
      onChange({ ...article, cover: src })
    })
  }

  /** Put a new block at `at` — anywhere between two blocks, or at the end. */
  function addBlock(type: ArticleBlock['type'], at: number = article.blocks.length) {
    const block: ArticleBlock = type === 'images' ? { type: 'images', images: [] } : { type, text: '' }
    const blocks = [...article.blocks]
    blocks.splice(at, 0, block)
    onChange({ ...article, blocks })
    setInsertAt(null)
  }
  function removeBlock(bi: number) {
    onChange({ ...article, blocks: article.blocks.filter((_, i) => i !== bi) })
  }
  function moveBlock(bi: number, dir: -1 | 1) {
    const to = bi + dir
    if (to < 0 || to >= article.blocks.length) return
    const next = [...article.blocks]
    ;[next[bi], next[to]] = [next[to], next[bi]]
    onChange({ ...article, blocks: next })
  }

  const btn = {
    background: 'none', border: '1px dashed #334155', borderRadius: 8,
    padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontFamily: F, color: '#eab308',
  }
  const canPublish = article.title.trim().length > 0

  /* A quiet + between every block. Clicking it asks what to put there, so a
     photo can go in the middle of the text without shuffling anything down. */
  const insertRow = (at: number) => {
    const line   = { flex: 1, height: 1, background: '#1e293b' }
    const choice = {
      background: '#0f172a', border: '1px solid #334155', borderRadius: 7,
      padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: F, color: '#e2e8f0',
    }
    if (insertAt !== at) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
          <span style={line} />
          <button
            onClick={() => setInsertAt(at)}
            title="Lägg till här"
            style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #334155', background: '#0f172a', color: '#64748b', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}
          >+</button>
          <span style={line} />
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: F }}>Lägg till här:</span>
        <button onClick={() => addBlock('heading', at)} style={choice}>Mellanrubrik</button>
        <button onClick={() => addBlock('text',    at)} style={choice}>Text</button>
        <button onClick={() => addBlock('images',  at)} style={choice}>Bilder</button>
        <button onClick={() => setInsertAt(null)} style={{ ...choice, border: 'none', color: '#64748b' }}>Avbryt</button>
      </div>
    )
  }

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

          {error && <p style={{ fontSize: 13, color: '#f87171', fontFamily: F, margin: 0 }}>{error}</p>}

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
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              {article.cover
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={article.cover} alt="" style={{ width: 96, height: 68, objectFit: 'cover', borderRadius: 8 }} />
                : <span style={{ width: 96, height: 68, borderRadius: 8, border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>+</span>}
              <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: F }}>
                {article.cover ? 'Byt huvudbild' : 'Ladda upp huvudbild'}
              </span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) setCover(f)
              }} />
            </label>
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
          {article.blocks.map((block, bi) => (
            <div key={bi}>
            {insertRow(bi)}
            <div style={{ border: '1px solid #1e293b', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ flex: 1, fontSize: 10, color: '#475569', fontFamily: F, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {block.type === 'heading' ? 'Mellanrubrik' : block.type === 'text' ? 'Text' : 'Bilder'}
                </span>
                <button onClick={() => moveBlock(bi, -1)} disabled={bi === 0} title="Flytta upp"
                  style={{ background: 'none', border: 'none', color: bi === 0 ? '#1e293b' : '#64748b', cursor: bi === 0 ? 'default' : 'pointer', fontSize: 15 }}>↑</button>
                <button onClick={() => moveBlock(bi, 1)} disabled={bi === article.blocks.length - 1} title="Flytta ner"
                  style={{ background: 'none', border: 'none', color: bi === article.blocks.length - 1 ? '#1e293b' : '#64748b', cursor: bi === article.blocks.length - 1 ? 'default' : 'pointer', fontSize: 15 }}>↓</button>
                <button onClick={() => removeBlock(bi)} title="Ta bort"
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 17 }}>×</button>
              </div>

              {block.type === 'heading' ? (
                <input
                  value={block.text}
                  onChange={e => {
                    const text = e.target.value
                    onChange({ ...article, blocks: article.blocks.map((b, i) => i === bi && b.type === 'heading' ? { ...b, text } : b) })
                  }}
                  maxLength={80}
                  placeholder="T.ex. Så gör du hemma"
                  style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }}
                />
              ) : block.type === 'text' ? (
                <textarea
                  value={block.text}
                  onChange={e => {
                    const text = e.target.value
                    onChange({ ...article, blocks: article.blocks.map((b, i) => i === bi && b.type === 'text' ? { ...b, text } : b) })
                  }}
                  rows={10}
                  placeholder="Skriv här. Lämna en tom rad mellan styckena."
                  style={{ ...inputStyle, fontSize: 14, lineHeight: 1.7 }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {block.images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                      {block.images.map((im, ii) => (
                        <div key={ii} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <div style={{ position: 'relative' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={im.src} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                            <button
                              onClick={() => onChange({
                                ...article,
                                blocks: article.blocks.map((b, i) => i === bi && b.type === 'images' ? { ...b, images: b.images.filter((_, j) => j !== ii) } : b),
                              })}
                              title="Ta bort bilden"
                              style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(2,6,23,0.8)', color: '#f1f5f9', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                            >×</button>
                          </div>
                          <input
                            value={im.alt}
                            onChange={e => {
                              const alt = e.target.value
                              onChange({
                                ...article,
                                blocks: article.blocks.map((b, i) => i === bi && b.type === 'images'
                                  ? { ...b, images: b.images.map((y, j) => j === ii ? { ...y, alt } : y) } : b),
                              })
                            }}
                            placeholder="Bildtext"
                            maxLength={100}
                            style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <label style={{ ...btn, display: 'block', textAlign: 'center', color: '#94a3b8' }}>
                    {busy > 0 ? 'Laddar upp…' : '+ Lägg till bilder — du kan välja flera på en gång'}
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                      // Copy out before clearing — e.target.files is live, and
                      // resetting value empties the list we are holding
                      const files = Array.from(e.target.files ?? [])
                      e.target.value = ''
                      if (files.length) addImages(bi, files)
                    }} />
                  </label>
                </div>
              )}
            </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => addBlock('heading')} style={btn}>+ Mellanrubrik</button>
            <button onClick={() => addBlock('text')}    style={btn}>+ Text</button>
            <button onClick={() => addBlock('images')}  style={btn}>+ Bilder</button>
          </div>

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
