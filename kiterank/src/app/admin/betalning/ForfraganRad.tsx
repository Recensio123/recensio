'use client'
import { useState } from 'react'

/*
 * En uppgraderingsförfrågan med sin avbockning.
 *
 * Raden försvinner ur listan när den bockas av, men finns kvar i databasen.
 * En kund som frågat, fått nej och frågar igen ett halvår senare säger något
 * — och det säger den bara om den första gången inte raderats.
 */

export function ForfraganRad({ id, namn, från, till, skapad }: {
  id:     string
  namn:   string
  från:   string | null
  till:   string
  skapad: string
}) {
  const [läge, setLäge] = useState<'vila' | 'sparar' | 'klar' | 'fel'>('vila')

  async function bocka() {
    setLäge('sparar')
    try {
      const res = await fetch('/api/admin/forfragan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      setLäge('klar')
    } catch {
      setLäge('fel')
    }
  }

  if (läge === 'klar') return null

  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 10,
      flexWrap: 'wrap', margin: '0 0 6px',
    }}>
      <span style={{ fontSize: 13, color: '#cbd5e1' }}>
        <span style={{ fontWeight: 600 }}>{namn}</span>
        {' — '}
        {från ? `${från} → ` : ''}{till}
      </span>
      <span style={{ color: '#64748b', fontSize: 11 }}>
        {new Date(skapad).toLocaleDateString('sv-SE')}
      </span>
      <button
        onClick={bocka}
        disabled={läge === 'sparar'}
        style={{
          padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600,
          fontFamily: 'var(--font-brand-sans)', cursor: 'pointer',
          border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1',
        }}
      >
        {läge === 'sparar' ? 'Sparar…' : 'Hanterad'}
      </button>
      {läge === 'fel' && <span style={{ fontSize: 11, color: '#f87171' }}>gick inte</span>}
    </div>
  )
}
