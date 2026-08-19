'use client'
import type { ReactNode } from 'react'
import type { Template } from '@/lib/templates'
import type { ArticleBlock } from '@/lib/articles'
import type { SiteContent } from '@/components/site/PreviewSite'
import type { SectionPageId } from '@/lib/sectionPages'
import { BlocksBody } from '@/components/ArticleBody'
import { SectionPageBody } from '@/components/SectionPageBody'
import { BlocksEditor } from './BlocksEditor'
import { F, useNarrow } from './fields'

/*
 * Editing one of the site's own pages — the gallery page, the about page and
 * the rest.
 *
 * Same shape as the article workspace, and for the same reason: a 400px panel
 * column is the wrong place to write paragraphs and place photos. The page
 * gets the whole screen, with what it will look like standing next to it.
 *
 * What the customer sees here is only their own additions — the section
 * itself (the photos, the price list, the reviews) is already edited in the
 * panel and sits above this on the finished page. Saying that plainly beats
 * showing an empty frame they think they have to fill.
 */

export function PageWorkspace({
  id, pageName, placeholder, sectionSummary, blocks, template, content, suggestion, industry, team,
  onBlocksChange, onClose,
}: {
  id:              SectionPageId
  pageName:        string
  /** The name the page falls back to when the customer hasn't chosen one. */
  placeholder:     string
  /** One line naming what the section already puts at the top of the page. */
  sectionSummary:  string
  blocks:          ArticleBlock[]
  template:        Template
  /** The whole site's content — the page carries the section's own material
   *  (photos, price list, reviews, the about text) over by itself. */
  content:         SiteContent
  /** The filled-in starting point the page shows until the customer writes
   *  their own. Taking it over turns it into editable blocks. */
  suggestion:      ArticleBlock[]
  industry?:       string
  /** Editing that belongs to this page rather than to the panel — the team
   *  on the about page. Rendered above the extra-content editor. */
  team?:           ReactNode
  onBlocksChange:  (next: ArticleBlock[]) => void
  onClose:         () => void
}) {
  const c = template.colors
  const narrow = useNarrow()
  const showWrite  = !narrow
  const showRender = !narrow

  const title   = pageName.trim() || placeholder
  /* Has the customer written anything of their own here yet? Until they have,
     the page still shows the filled-in starting point — theirs replaces it. */
  const written = blocks.length > 0
  const shown   = written ? blocks : suggestion

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Writing ── */}
        <div style={{ flex: narrow ? '1 1 100%' : '1 1 55%', minWidth: narrow ? 0 : 380, overflowY: 'auto', borderRight: narrow ? 'none' : '1px solid #1e293b' }}>
          <div style={{ maxWidth: 660, margin: '0 auto', padding: '20px 28px 60px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            <button onClick={onClose} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: F, padding: 0 }}>
              ← Tillbaka till sidan
            </button>

            {/* The name lives in the Meny panel, where every menu button is
                named at once — two places to change the same word is how a
                customer ends up unsure which one counts. */}
            <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
              Sidan heter <strong style={{ color: '#e2e8f0' }}>{title}</strong> — byt namn under Meny i panelen.
            </p>

            {/* What is already on the page without them doing anything. The
                preview beside this shows it for real, so the sentence only has
                to point at it — not ask them to imagine it. */}
            <div style={{ border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px', background: '#0f172a' }}>
              <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
                Sidan tar med sig {sectionSummary} automatiskt — du ser hela sidan färdig till höger.
                {written
                  ? ' Nedanför ändrar du texten du lagt till.'
                  : ' Texten under är ifylld åt dig. Vill du skriva om den med dina egna ord klickar du nedan.'}
              </p>
            </div>

            {/* The team belongs to this page, so it is edited on this page —
                beside a preview that actually shows the faces. */}
            {team}

            {/* Nothing written yet: the page is not empty, so the offer is to
                take over the words that are already on it — not to start from
                a blank page, which is where these pages usually die. */}
            {!written ? (
              <button
                onClick={() => onBlocksChange(suggestion)}
                style={{
                  alignSelf: 'flex-start', background: '#eab308', color: '#0f172a', border: 'none',
                  borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                }}
              >
                Skriv om texten med egna ord
              </button>
            ) : (
              <BlocksEditor blocks={blocks} onChange={onBlocksChange} />
            )}
          </div>
        </div>

        {/* ── The page, as it will look ── */}
        {showRender && (
          <div className="kr-page-preview" style={{ flex: '1 1 45%', minWidth: narrow ? 0 : 320, overflowY: 'auto', overflowX: 'hidden', background: c.bg, display: showWrite ? 'block' : 'none' }}>
            {/* The sections are built for a full-width page; in a half-screen
                column they fall back to the same single column a phone gets,
                so nothing is cut off in the preview. */}
            <style>{`
              .kr-page-preview [data-grid] { grid-template-columns: 1fr !important; }
              .kr-page-preview section { padding-left: 6% !important; padding-right: 6% !important; }
              .kr-page-preview img { max-width: 100%; }
            `}</style>
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px 80px' }}>
              <h1 style={{ fontSize: 40, fontWeight: 800, color: c.h, letterSpacing: -1, lineHeight: 1.15, marginBottom: 24, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
                {title}
              </h1>
              {/* The section's own material, rendered by the same component the
                  published page uses — the preview can't promise something the
                  live page won't deliver */}
              <SectionPageBody id={id} c={c} content={content} industry={industry} />
              <BlocksBody blocks={shown} c={c} altFallback={title} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
