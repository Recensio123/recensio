'use client'
import { useState } from 'react'
import type { ArticleBlock, ArticleImage } from '@/lib/articles'
import { uploadImage } from '@/lib/uploadImage'
import { useMedia } from './MediaLibrary'
import { inputStyle, F } from './fields'

/*
 * The block editor — headings, text and photo groups in any order, with a
 * quiet + between every block so a photo can go in the middle of the text.
 *
 * Grew up inside the article workspace; extracted because a section's own
 * page fills with extra content the exact same way an article does. One
 * editor, learned once, used everywhere.
 */

export function BlocksEditor({ blocks, onChange, compact }: {
  blocks:   ArticleBlock[]
  onChange: (next: ArticleBlock[]) => void
  /** Tighter paddings for use inside a panel section instead of a workspace. */
  compact?: boolean
}) {
  const [busy,     setBusy]     = useState(0)
  const [error,    setError]    = useState('')
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const media = useMedia()

  function pushImages(bi: number, added: ArticleImage[]) {
    onChange(blocks.map((b, i) =>
      i === bi && b.type === 'images' ? { ...b, images: [...b.images, ...added] } : b))
  }

  /* Uploading several at once is the whole point of a photo series, so the
     file input stays — but each upload also lands in Dina bilder, and a
     picture already there is one click away instead of another upload. */
  function addImages(bi: number, files: File[]) {
    setError('')
    setBusy(n => n + 1)
    Promise.all(files.slice(0, 12).map(async f => {
      const src = await uploadImage(f)
      media?.addUpload(src)
      return { src, alt: '' } as ArticleImage
    }))
      .then(uploaded => pushImages(bi, uploaded))
      .catch(err => setError(err instanceof Error ? err.message : 'Uppladdningen misslyckades'))
      .finally(() => setBusy(n => n - 1))
  }

  function addBlock(type: ArticleBlock['type'], at: number = blocks.length) {
    const block: ArticleBlock = type === 'images' ? { type: 'images', images: [] } : { type, text: '' }
    const next = [...blocks]
    next.splice(at, 0, block)
    onChange(next)
    setInsertAt(null)
  }
  function removeBlock(bi: number) {
    onChange(blocks.filter((_, i) => i !== bi))
  }
  function moveBlock(bi: number, dir: -1 | 1) {
    const to = bi + dir
    if (to < 0 || to >= blocks.length) return
    const next = [...blocks]
    ;[next[bi], next[to]] = [next[to], next[bi]]
    onChange(next)
  }

  const btn = {
    background: 'none', border: '1px dashed #334155', borderRadius: 8,
    padding: compact ? '7px 12px' : '9px 16px', fontSize: compact ? 12 : 13,
    cursor: 'pointer', fontFamily: F, color: '#eab308',
  }

  /* A quiet + between every block. Clicking it asks what to put there. */
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
    <>
      {error && <p style={{ fontSize: 13, color: '#f87171', fontFamily: F, margin: 0 }}>{error}</p>}

      {blocks.map((block, bi) => (
        <div key={bi}>
        {insertRow(bi)}
        <div style={{ border: '1px solid #1e293b', borderRadius: 10, padding: compact ? 10 : 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ flex: 1, fontSize: 10, color: '#475569', fontFamily: F, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {block.type === 'heading' ? 'Mellanrubrik' : block.type === 'text' ? 'Text' : 'Bilder'}
            </span>
            <button onClick={() => moveBlock(bi, -1)} disabled={bi === 0} title="Flytta upp"
              style={{ background: 'none', border: 'none', color: bi === 0 ? '#1e293b' : '#64748b', cursor: bi === 0 ? 'default' : 'pointer', fontSize: 15 }}>↑</button>
            <button onClick={() => moveBlock(bi, 1)} disabled={bi === blocks.length - 1} title="Flytta ner"
              style={{ background: 'none', border: 'none', color: bi === blocks.length - 1 ? '#1e293b' : '#64748b', cursor: bi === blocks.length - 1 ? 'default' : 'pointer', fontSize: 15 }}>↓</button>
            <button onClick={() => removeBlock(bi)} title="Ta bort"
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 17 }}>×</button>
          </div>

          {block.type === 'heading' ? (
            <input
              value={block.text}
              onChange={e => {
                const text = e.target.value
                onChange(blocks.map((b, i) => i === bi && b.type === 'heading' ? { ...b, text } : b))
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
                onChange(blocks.map((b, i) => i === bi && b.type === 'text' ? { ...b, text } : b))
              }}
              rows={compact ? 6 : 10}
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
                          onClick={() => onChange(blocks.map((b, i) =>
                            i === bi && b.type === 'images' ? { ...b, images: b.images.filter((_, j) => j !== ii) } : b))}
                          title="Ta bort bilden"
                          style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(2,6,23,0.8)', color: '#f1f5f9', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                        >×</button>
                      </div>
                      <input
                        value={im.alt}
                        onChange={e => {
                          const alt = e.target.value
                          onChange(blocks.map((b, i) => i === bi && b.type === 'images'
                            ? { ...b, images: b.images.map((y, j) => j === ii ? { ...y, alt } : y) } : b))
                        }}
                        placeholder="Bildtext"
                        maxLength={100}
                        style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={async () => { const url = await media?.pickImage(); if (url) pushImages(bi, [{ src: url, alt: '' }]) }}
                  style={{ ...btn, flex: 1, minWidth: 150 }}
                >
                  Välj ur dina bilder
                </button>
                <label style={{ ...btn, flex: 1, minWidth: 150, textAlign: 'center', color: '#94a3b8' }}>
                  {busy > 0 ? 'Laddar upp…' : '+ Ladda upp flera'}
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                    // Copy out before clearing — e.target.files is live, and
                    // resetting value empties the list we are holding
                    const files = Array.from(e.target.files ?? [])
                    e.target.value = ''
                    if (files.length) addImages(bi, files)
                  }} />
                </label>
              </div>
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
    </>
  )
}
