'use client'
import { useState } from 'react'

/*
 * Mallarna — arbetssättet, redigerbart.
 *
 * Det här är det som faktiskt är produkten i full service. Kundens siffror har
 * de redan; det de betalar för är metoden som läser dem. Ändrar du en regel
 * här gäller den nästa dokument för varje kund, utan att något byggs om.
 *
 * Ren text i en ruta av samma skäl som avtalen: du ska se exakt vad som skickas
 * till modellen, inte en formaterad tolkning av det.
 */

type Mall = { slug: string; titel: string; beskrivning: string | null; innehall: string; version: string | null }

export function Mallredigerare({ mallar }: { mallar: Mall[] }) {
  const [öppen,    setÖppen]    = useState(mallar[0]?.slug ?? '')
  const [texter,   setTexter]   = useState<Record<string, string>>(
    Object.fromEntries(mallar.map(m => [m.slug, m.innehall])),
  )
  const [sparar,   setSparar]   = useState(false)
  const [besked,   setBesked]   = useState('')

  const vald = mallar.find(m => m.slug === öppen)
  if (!vald) return <p style={{ fontSize: 13, color: '#64748b' }}>Inga mallar upplagda än.</p>

  async function spara() {
    setSparar(true); setBesked('')
    try {
      const res = await fetch('/api/admin/dokumentmall', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug: öppen, innehall: texter[öppen] }),
      })
      setBesked(res.ok ? 'Sparat.' : 'Kunde inte spara.')
    } finally {
      setSparar(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {mallar.map(m => (
          <button
            key={m.slug}
            onClick={() => { setÖppen(m.slug); setBesked('') }}
            style={{
              padding: '7px 13px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
              background: öppen === m.slug ? '#1e293b' : 'transparent',
              border: `1px solid ${öppen === m.slug ? '#334155' : '#1e293b'}`,
              color: öppen === m.slug ? '#f1f5f9' : '#94a3b8',
              fontWeight: öppen === m.slug ? 700 : 500,
            }}
          >
            {m.titel}
          </button>
        ))}
      </div>

      {vald.beskrivning && (
        <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 10px' }}>
          {vald.beskrivning}
        </p>
      )}

      <textarea
        value={texter[öppen] ?? ''}
        onChange={e => setTexter({ ...texter, [öppen]: e.target.value })}
        rows={30}
        style={{
          width: '100%', background: '#0b1220', border: '1px solid #1e293b', borderRadius: 9,
          padding: '12px 14px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7,
          fontFamily: 'var(--font-geist-mono, monospace)', resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
        <button
          onClick={spara}
          disabled={sparar}
          style={{
            padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: '#f0b429', color: '#0b1220', border: '1px solid #f0b429',
            opacity: sparar ? 0.6 : 1,
          }}
        >
          {sparar ? 'Sparar…' : 'Spara mallen'}
        </button>
        {besked && <span style={{ fontSize: 12.5, color: '#f0b429' }}>{besked}</span>}
        {vald.version && <span style={{ fontSize: 12, color: '#475569' }}>version {vald.version}</span>}
      </div>
    </div>
  )
}
