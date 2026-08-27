'use client'
import { useState } from 'react'

/*
 * En kund, och vad som gäller för dem.
 *
 * Uppsägningen är två steg med flit: det är samma sorts beslut som att ta bort
 * en tjänst ur prislistan, fast med hela sajten som insats. Egen knapp och inte
 * webbläsarens dialog, av samma skäl som i panelen — den sväljs tyst i vissa
 * inbäddade webbläsare, och en varning som ibland inte syns är sämre än ingen.
 *
 * Att öppna ett avtal igen behöver inget steg alls. Det är en handling som
 * ingen ångrar.
 */

const F = 'var(--font-brand-sans)'

export function KontoRad({ id, namn, slug, closedAt, avslutat, action, rensa }: {
  id:        string
  namn:      string
  slug:      string
  closedAt:  string | null
  /** Har slutdatumet passerat? Ett datum framåt är uppsägningstid. */
  avslutat:  boolean
  action:    (formData: FormData) => Promise<void>
  /** Tvinga fram sajten på nytt när något ändrats utanför panelen. */
  rensa:     (formData: FormData) => Promise<void>
}) {
  const [öppen,  setÖppen]  = useState(false)
  const [datum,  setDatum]  = useState('')
  const väntar = !!closedAt && !avslutat

  const status = avslutat ? 'Avslutat' : väntar ? 'Avslutas' : 'Aktivt'
  const färg   = avslutat ? '#f87171' : väntar ? '#eab308' : '#4ade80'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px',
    }}>
      <span style={{ flex: 1, minWidth: 200 }}>
        {/* Namnet är vägen till kundens samlade sida. Listan är för svepet;
            allt om en enskild kund — abonnemang, sajt, siffror — bor där. */}
        <a
          href={`/admin/kund/${id}`}
          style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#e2e8f0', fontFamily: F, textDecoration: 'none' }}
        >
          {namn} <span style={{ color: '#475569', fontWeight: 400 }}>→</span>
        </a>
        <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: F, marginTop: 2 }}>
          /s/{slug}
          {closedAt && ` · ${avslutat ? 'avslutades' : 'avslutas'} ${new Date(closedAt).toLocaleDateString('sv-SE')}`}
        </span>
      </span>

      <span style={{ fontSize: 11, fontWeight: 700, color: färg, fontFamily: F, whiteSpace: 'nowrap' }}>
        {status}
      </span>

      <form action={rensa}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" title="Hämtar sidan på nytt — behövs bara när något ändrats utanför panelen" style={knapp('#64748b')}>Uppdatera sajten</button>
      </form>
      {closedAt ? (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="closed" value="false" />
          <button type="submit" style={knapp('#4ade80')}>Öppna avtalet</button>
        </form>
      ) : !öppen ? (
        <button onClick={() => setÖppen(true)} style={knapp('#94a3b8')}>Säg upp…</button>
      ) : (
        <form action={action} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="closed" value="true" />
          <label style={{ fontSize: 11, color: '#64748b', fontFamily: F }}>
            Slutdatum
            <input
              type="date"
              name="date"
              value={datum}
              onChange={e => setDatum(e.target.value)}
              style={{
                marginLeft: 6, background: '#0b1220', color: '#e2e8f0', fontFamily: F, fontSize: 12,
                border: '1px solid #334155', borderRadius: 6, padding: '5px 7px',
              }}
            />
          </label>
          <span style={{ fontSize: 11, color: '#64748b', fontFamily: F }}>
            {datum ? '' : 'tomt = upphör direkt'}
          </span>
          <button type="submit" style={knapp('#f87171')}>Bekräfta uppsägning</button>
          <button type="button" onClick={() => { setÖppen(false); setDatum('') }} style={knapp('#64748b')}>
            Avbryt
          </button>
        </form>
      )}
    </div>
  )
}

const knapp = (färg: string) => ({
  background: 'none' as const,
  border: `1px solid ${färg}40`,
  color: färg,
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: F,
  cursor: 'pointer' as const,
  whiteSpace: 'nowrap' as const,
})
