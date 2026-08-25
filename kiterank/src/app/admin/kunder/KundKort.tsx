'use client'
import { useState } from 'react'
import type { Fynd, Allvar } from '@/lib/kundstatus'

/*
 * En kund, hopfälld till en rad.
 *
 * Rubriken räcker för att avgöra om man behöver bry sig; fällan ut ger hela
 * bilden. Skälet till uppdelningen är att en lista där varje kund tar en halv
 * skärm inte är en lista man skannar — och det är just skanning sidan finns
 * för. En kund utan anmärkning ska gå att passera på en halv sekund.
 */

const FÄRG: Record<Allvar, { kant: string; text: string; prick: string; ord: string }> = {
  kritiskt: { kant: 'rgba(239,68,68,0.45)',  text: '#fca5a5', prick: '#ef4444', ord: 'Behöver åtgärd' },
  varning:  { kant: 'rgba(245,158,11,0.40)', text: '#fcd34d', prick: '#f59e0b', ord: 'Värt att titta på' },
  info:     { kant: '#1e293b',               text: '#94a3b8', prick: '#64748b', ord: '' },
}

function datum(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('sv-SE')
}

export function KundKort({
  id, namn, slug, skapad, avslutat, kopplad, fynd, synka,
}: {
  id:       string
  namn:     string
  slug:     string
  skapad:   string | null
  avslutat: boolean
  kopplad:  boolean
  fynd:     Fynd[]
  synka:    (formData: FormData) => Promise<void>
}) {
  const [öppen, setÖppen] = useState(false)

  const kritiska = fynd.filter(f => f.allvar === 'kritiskt').length
  const varningar = fynd.filter(f => f.allvar === 'varning').length
  const värsta: Allvar | null =
    kritiska ? 'kritiskt' : varningar ? 'varning' : fynd.length ? 'info' : null

  const f = värsta ? FÄRG[värsta] : { kant: '#1e293b', text: '#4ade80', prick: '#4ade80', ord: 'Allt fungerar' }

  return (
    <div style={{
      border: `1px solid ${f.kant}`, borderRadius: 12,
      background: avslutat ? '#0b1220' : '#0f172a',
      opacity: avslutat ? 0.62 : 1,
    }}>
      <button
        onClick={() => setÖppen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 15px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span style={{
          width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: f.prick,
        }} />

        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
            {namn}
            {avslutat && (
              <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b', marginLeft: 8 }}>avslutat</span>
            )}
          </span>
          <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 2 }}>
            /{slug} · kund sedan {datum(skapad)} · {kopplad ? 'Google kopplat' : 'ingen Google-koppling'}
          </span>
        </span>

        <span style={{ fontSize: 12, color: f.text, fontWeight: 600, flexShrink: 0, textAlign: 'right' }}>
          {värsta
            ? `${f.ord}${kritiska + varningar > 1 ? ` · ${kritiska + varningar}` : ''}`
            : 'Allt fungerar'}
        </span>
        <span style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>{öppen ? '▲' : '▼'}</span>
      </button>

      {öppen && (
        <div style={{ borderTop: '1px solid #1e293b', padding: '13px 15px' }}>
          {!fynd.length && (
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
              Ingenting att åtgärda. Kopplingarna svarar, sajten har en väg vidare
              och bokningen går att använda.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {fynd.map(x => (
              <div key={x.id} style={{
                borderLeft: `2px solid ${FÄRG[x.allvar].prick}`,
                paddingLeft: 11,
              }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: FÄRG[x.allvar].text }}>
                  {x.rubrik}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 }}>
                  {x.följd}
                </p>
                {/* Vad du gör åt det står avskilt från vad som är fel. De
                    besvarar olika frågor, och den som redan vet vad felet är
                    ska kunna hoppa direkt till andra stycket. */}
                <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#94a3b8', lineHeight: 1.65 }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Gör: </span>
                  {x.åtgärd}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            marginTop: 14, paddingTop: 12, borderTop: '1px solid #1e293b',
          }}>
            {!avslutat && (
              <form action={synka}>
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '7px 13px', borderRadius: 8,
                    border: '1px solid #334155', background: '#1e293b',
                    color: '#e2e8f0', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Synka nu
                </button>
              </form>
            )}
            <a
              href={`/s/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}
            >
              Se sajten →
            </a>
            <a
              href="/admin"
              style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}
            >
              Avtalet →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
