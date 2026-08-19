'use client'
import { useState } from 'react'
import { E } from './Editable'
import type { Article, ContentBlock, BlockType } from './SiteEditor'

const BLOCK_LABELS: Record<BlockType, { short: string; label: string }> = {
  h2:        { short: 'H2', label: 'Heading' },
  h3:        { short: 'H3', label: 'Sub-heading' },
  paragraph: { short: 'P',  label: 'Paragraph' },
  image:     { short: '▣',  label: 'Image' },
}

const BLOCK_DEFAULTS: Record<BlockType, string> = {
  h2:        'New heading',
  h3:        'New sub-heading',
  paragraph: 'Write your article text here...',
  image:     '',
}

// ─── Single block row ─────────────────────────────────────────────────────────
function BlockRow({ block, onChange, onRemove }: {
  block:    ContentBlock
  onChange: (v: string) => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', padding: '4px 0' }}
    >
      {/* Block type label */}
      <span style={{
        position: 'absolute', left: '-64px', top: '50%', transform: 'translateY(-50%)',
        fontSize: '10px', color: '#cbd5e1', fontFamily: 'monospace', fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
        userSelect: 'none', pointerEvents: 'none',
      }}>
        {BLOCK_LABELS[block.type].short}
      </span>

      {/* Delete button */}
      <button onClick={onRemove} title="Remove block" style={{
        position: 'absolute', right: '-32px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer',
        fontSize: '18px', lineHeight: 1, padding: '2px 4px',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
      }}>×</button>

      {/* Content */}
      {block.type === 'h2' && (
        <E value={block.content} onChange={onChange}
          style={{ display: 'block', fontSize: '27px', fontWeight: 700, color: '#111', lineHeight: 1.3, fontFamily: 'system-ui, sans-serif', padding: '6px 0', marginTop: '16px' }} />
      )}
      {block.type === 'h3' && (
        <E value={block.content} onChange={onChange}
          style={{ display: 'block', fontSize: '20px', fontWeight: 600, color: '#222', lineHeight: 1.4, fontFamily: 'system-ui, sans-serif', padding: '4px 0', marginTop: '8px' }} />
      )}
      {block.type === 'paragraph' && (
        <E value={block.content} onChange={onChange} multiline
          style={{ display: 'block', fontSize: '16px', color: '#374151', lineHeight: 1.75, fontFamily: 'system-ui, sans-serif', padding: '2px 0' }} />
      )}
      {block.type === 'image' && (
        <div style={{
          width: '100%', aspectRatio: '16/9', background: '#f1f5f9',
          border: '2px dashed #cbd5e1', borderRadius: '12px', margin: '12px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
          onMouseOver={e => (e.currentTarget.style.borderColor = '#94a3b8')}
          onMouseOut={e => (e.currentTarget.style.borderColor = '#cbd5e1')}
        >
          <span style={{ color: '#94a3b8', fontSize: '14px', fontFamily: 'system-ui', fontWeight: 500 }}>Click to upload image</span>
          <span style={{ color: '#cbd5e1', fontSize: '12px', fontFamily: 'system-ui', marginTop: '4px' }}>JPG or PNG · max 5 MB</span>
        </div>
      )}
    </div>
  )
}

// ─── Article editor ───────────────────────────────────────────────────────────
export function PageEditor({ article, onUpdate }: {
  article:  Article
  onUpdate: (updated: Article) => void
}) {
  function updateBlock(id: string, content: string) {
    onUpdate({ ...article, blocks: article.blocks.map(b => b.id === id ? { ...b, content } : b) })
  }

  function removeBlock(id: string) {
    onUpdate({ ...article, blocks: article.blocks.filter(b => b.id !== id) })
  }

  function addBlock(type: BlockType) {
    onUpdate({
      ...article,
      blocks: [...article.blocks, { id: crypto.randomUUID(), type, content: BLOCK_DEFAULTS[type] }],
    })
  }

  return (
    <div style={{ minHeight: '100%', background: '#fafafa' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 80px 80px 80px' }}>

        {/* Date */}
        <p style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'system-ui', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
          {article.publishedAt}
        </p>

        {/* Article title */}
        <E value={article.title} onChange={title => onUpdate({ ...article, title })}
          style={{ display: 'block', fontSize: '38px', fontWeight: 800, color: '#0f0f0f', lineHeight: 1.15, fontFamily: 'system-ui, sans-serif', marginBottom: '12px' }} />

        {/* Excerpt / summary */}
        <E value={article.excerpt} onChange={excerpt => onUpdate({ ...article, excerpt })} multiline
          style={{ display: 'block', fontSize: '16px', color: '#6b7280', lineHeight: 1.65, fontFamily: 'system-ui, sans-serif', fontStyle: 'italic', marginBottom: '4px' }} />

        <div style={{ height: '1px', background: '#e5e7eb', margin: '24px 0 48px' }} />

        {/* Blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {article.blocks.map(block => (
            <BlockRow
              key={block.id}
              block={block}
              onChange={v => updateBlock(block.id, v)}
              onRemove={() => removeBlock(block.id)}
            />
          ))}
        </div>

        {/* Empty state */}
        {article.blocks.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '15px', fontFamily: 'system-ui', lineHeight: 1.6, margin: '8px 0 32px' }}>
            Add blocks below to write your article. Mix headings, paragraphs and images.
          </p>
        )}

        {/* Add block toolbar */}
        <div style={{
          marginTop: '40px', paddingTop: '24px',
          borderTop: '1px dashed #e5e7eb',
          display: 'flex', gap: '8px', flexWrap: 'wrap',
        }}>
          {(['h2', 'h3', 'paragraph', 'image'] as BlockType[]).map(type => (
            <button key={type} onClick={() => addBlock(type)} style={{
              padding: '7px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
              background: '#fff', color: '#555', fontSize: '13px', fontFamily: 'system-ui',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#111' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#555' }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: '#9ca3af' }}>
                {BLOCK_LABELS[type].short}
              </span>
              {BLOCK_LABELS[type].label}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
