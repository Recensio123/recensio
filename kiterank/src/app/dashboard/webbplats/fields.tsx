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

export function Field({ label, value, onChange, multiline, placeholder, max, rows, field, marked }: {
  label: string; value: string; onChange: (v: string) => void
  multiline?: boolean; placeholder?: string; rows?: number
  /** Hard cap so long texts can't break the page layout. */
  max?: number
  /** Names this field so a click on the page can point straight at it. */
  field?: string
  /** True when the page click landed on exactly this text. */
  marked?: boolean
}) {
  // Replace the whole border shorthand, never just its colour — React warns
  // (rightly) that mixing the two makes the result order-dependent.
  const style = marked
    ? { ...inputStyle, border: '1px solid #eab308', boxShadow: '0 0 0 3px rgba(234,179,8,0.18)' }
    : inputStyle
  return (
    <div data-panel-field={field} style={{ scrollMarginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: marked ? '#eab308' : '#94a3b8', fontFamily: F }}>{label}</label>
        {/* Says out loud which text on the page this box holds */}
        {marked && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', background: '#eab308', borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
            Vald på sidan
          </span>
        )}
        <span style={{ flex: 1 }} />
        {max != null && (
          <span style={{ fontSize: 11, fontFamily: F, color: value.length >= max ? '#f87171' : '#64748b' }}>
            {value.length}/{max}
          </span>
        )}
      </div>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows ?? 3} style={style} placeholder={placeholder} maxLength={max} />
        : <input value={value} onChange={e => onChange(e.target.value)} style={style} placeholder={placeholder} maxLength={max} />}
    </div>
  )
}
