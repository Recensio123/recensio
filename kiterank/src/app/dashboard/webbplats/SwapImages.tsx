'use client'
import type { ReactNode } from 'react'
import { F } from './fields'

/*
 * Byt ut exempelbilderna — the assembly line.
 *
 * Every placeholder we shipped, in one list, each with the button that
 * replaces it. Before this the customer had to hunt: open an article, find
 * the picture, swap it, go back, open the next. Twenty-three times. That is
 * the job that decides whether a site ever stops looking like a template, so
 * it deserves to be the easiest thing in the panel rather than the dullest.
 */

export type Placeholder = {
  /** Stable identity for the slot, so replacing one does not disturb the rest. */
  key:     string
  /** Where it sits, in the customer's words: "Artikel: Vårens färger". */
  where:   string
  /** What it is inside that place: "Huvudbild", "Bild 2 i texten". */
  what:    string
  src:     string
  replace: (url: string) => void
}

export function SwapImages({ items, onPick, onClose }: {
  items:   Placeholder[]
  /** Opens the picture library; resolves with the chosen image. */
  onPick:  () => Promise<string | null>
  onClose: () => void
}): ReactNode {
  const done = items.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '20px 28px 60px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <button onClick={onClose} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: F, padding: 0 }}>
          ← Tillbaka till sidan
        </button>

        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', fontFamily: F, margin: '0 0 6px' }}>
            Byt ut exempelbilderna
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
            {done
              ? 'Klart — varje bild på sidan är din egen.'
              : `${items.length} ${items.length === 1 ? 'bild' : 'bilder'} kvar. De här är våra platshållare; dina egna foton är det som får någon att boka.`}
          </p>
        </div>

        {done ? (
          <button
            onClick={onClose}
            style={{ alignSelf: 'flex-start', background: '#eab308', color: '#0f172a', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F }}
          >
            Tillbaka till sidan
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid #1e293b', borderRadius: 10, padding: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" style={{ width: 84, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#e2e8f0', fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.where}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: F, marginTop: 2 }}>{item.what}</span>
                </span>
                <button
                  onClick={async () => { const url = await onPick(); if (url) item.replace(url) }}
                  style={{
                    background: '#eab308', color: '#0f172a', border: 'none', borderRadius: 8,
                    padding: '9px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap',
                  }}
                >
                  Välj ersättning →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
