'use client'
import { useEffect, useState } from 'react'

/* The panel's form controls, shared by every section of the editor. */

/** True below the width where panel and preview no longer fit side by side.
 *  The editor then shows one of them at a time behind a toggle. */
export function useNarrow(breakpoint = 900) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [breakpoint])
  return narrow
}

export const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'

export const inputStyle = {
  width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: F,
  borderRadius: 8, border: '1px solid #334155', background: '#1e293b',
  color: '#f1f5f9', resize: 'vertical' as const,
}

export function Field({ label, value, onChange, multiline, placeholder, max, rows }: {
  label: string; value: string; onChange: (v: string) => void
  multiline?: boolean; placeholder?: string; rows?: number
  /** Hard cap so long texts can't break the page layout. */
  max?: number
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 5 }}>
        <label style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F }}>{label}</label>
        {max != null && (
          <span style={{ fontSize: 11, fontFamily: F, color: value.length >= max ? '#f87171' : '#64748b' }}>
            {value.length}/{max}
          </span>
        )}
      </div>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows ?? 3} style={inputStyle} placeholder={placeholder} maxLength={max} />
        : <input value={value} onChange={e => onChange(e.target.value)} style={inputStyle} placeholder={placeholder} maxLength={max} />}
    </div>
  )
}
