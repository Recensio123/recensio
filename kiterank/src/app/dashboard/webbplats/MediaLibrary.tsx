'use client'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { uploadImage } from '@/lib/uploadImage'
import { F } from './fields'

/*
 * Dina bilder — upload once, use everywhere.
 *
 * The panel asks for pictures in half a dozen places, and before this every
 * place was its own upload: the same photo pushed through the same dialog
 * again and again. Now every "choose a picture" spot opens the same little
 * library — everything the customer has ever uploaded, plus the button to add
 * more. Uploading stays exactly as easy; reusing becomes one click.
 *
 * The library is a list of URLs stored in the site content, seeded from every
 * picture already in use — so existing customers see their images here from
 * day one without any migration.
 */

type MediaCtx = {
  /** Open the library and let the customer pick or upload. Null = cancelled. */
  pickImage: () => Promise<string | null>
  /** Report an upload made outside the modal, so it lands in the library too. */
  addUpload: (url: string) => void
}

const MediaContext = createContext<MediaCtx | null>(null)

/** Null outside the panel — callers fall back to a plain upload input. */
export function useMedia(): MediaCtx | null {
  return useContext(MediaContext)
}

export function MediaProvider({ library, onAdd, controlRef, children }: {
  /** Every picture the customer has to choose from, newest last. */
  library: string[]
  /** Called with the URL of each fresh upload so it persists in the library. */
  onAdd:    (url: string) => void
  /** Lets the component that renders the provider open the picker too — it
   *  sits above the context and cannot use the hook. */
  controlRef?: { current: { pickImage: () => Promise<string | null> } | null }
  children: ReactNode
}) {
  const [open,  setOpen]  = useState(false)
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')
  const resolver = useRef<((url: string | null) => void) | null>(null)

  function pickImage(): Promise<string | null> {
    setError('')
    setOpen(true)
    return new Promise(resolve => { resolver.current = resolve })
  }

  function settle(url: string | null) {
    setOpen(false)
    resolver.current?.(url)
    resolver.current = null
  }

  /* Handed out after render — the component that renders this provider sits
     above the context and would otherwise have no way to open the picker. */
  useEffect(() => {
    if (!controlRef) return
    controlRef.current = { pickImage }
    return () => { controlRef.current = null }
  })

  return (
    <MediaContext.Provider value={{ pickImage, addUpload: onAdd }}>
      {children}

      {open && (
        <div
          onClick={() => settle(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 14, padding: 18, width: 'min(560px, 100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <p style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#f1f5f9', fontFamily: F, margin: 0 }}>Dina bilder</p>
              <button onClick={() => settle(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: F }}>
                Avbryt
              </button>
            </div>

            {library.length > 0 ? (
              <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                {library.map(url => (
                  <button
                    key={url}
                    onClick={() => settle(url)}
                    title="Använd den här bilden"
                    style={{ padding: 0, border: '1px solid #334155', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#1e293b', aspectRatio: '4/3' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#64748b', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
                Här samlas allt du laddar upp, så att du kan använda samma bild på flera ställen utan att ladda upp den igen.
              </p>
            )}

            {error && <p style={{ fontSize: 12, color: '#f87171', fontFamily: F, margin: 0 }}>{error}</p>}

            <label style={{
              display: 'block', textAlign: 'center', border: '1px dashed #334155', borderRadius: 8,
              padding: '11px 16px', fontSize: 13, color: '#eab308', cursor: 'pointer', fontFamily: F,
            }}>
              {busy ? 'Laddar upp…' : '+ Ladda upp ny bild'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={busy} onChange={async e => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                setError(''); setBusy(true)
                try {
                  const url = await uploadImage(file)
                  onAdd(url)
                  settle(url)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Uppladdningen misslyckades')
                } finally {
                  setBusy(false)
                }
              }} />
            </label>
          </div>
        </div>
      )}
    </MediaContext.Provider>
  )
}
