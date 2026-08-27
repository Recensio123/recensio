'use client'
import { useState } from 'react'

/*
 * Knapparna i sidarkivet.
 *
 * Två handlingar med mycket olika vikt. Att spara en kopia kostar ingenting
 * och kan göras hur ofta som helst. Att återställa skriver över något kundens
 * besökare ser just nu — därför två steg, och därför står det i knappen vad
 * som händer i stället för bara "Återställ".
 */

const knapp = {
  padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  fontFamily: 'var(--font-brand-sans)', cursor: 'pointer',
  border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1',
} as const

export function ArkiveraKnapp({ companyId, harSajt }: { companyId: string; harSajt: boolean }) {
  const [läge, setLäge] = useState<'vila' | 'sparar' | 'klar' | 'fel'>('vila')

  async function spara() {
    setLäge('sparar')
    try {
      const res = await fetch('/api/admin/sidarkiv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      if (!res.ok) throw new Error()
      setLäge('klar')
      setTimeout(() => location.reload(), 700)
    } catch {
      setLäge('fel')
    }
  }

  if (!harSajt) return <span style={{ color: '#475569', fontSize: 12 }}>ingen sajt</span>

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <button onClick={spara} disabled={läge === 'sparar'} style={knapp}>
        {läge === 'sparar' ? 'Sparar…' : 'Spara kopia'}
      </button>
      {läge === 'klar' && <span style={{ fontSize: 11, color: '#4ade80' }}>sparad</span>}
      {läge === 'fel'  && <span style={{ fontSize: 11, color: '#f87171' }}>gick inte</span>}
    </span>
  )
}

export function ÅterställKnapp({ arkivId, etikett }: { arkivId: string; etikett: string }) {
  const [bekräftar, setBekräftar] = useState(false)
  const [läge, setLäge] = useState<'vila' | 'sparar' | 'klar' | 'fel'>('vila')

  async function återställ() {
    setLäge('sparar')
    try {
      const res = await fetch('/api/admin/sidarkiv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ återställ: arkivId }),
      })
      if (!res.ok) throw new Error()
      setLäge('klar')
      setTimeout(() => location.reload(), 900)
    } catch {
      setLäge('fel')
      setBekräftar(false)
    }
  }

  if (läge === 'klar') return <span style={{ fontSize: 12, color: '#4ade80' }}>Återställd</span>

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <button
        onClick={() => bekräftar ? void återställ() : setBekräftar(true)}
        onBlur={() => setBekräftar(false)}
        disabled={läge === 'sparar'}
        title={`Skriver över kundens nuvarande sajt med "${etikett}"`}
        style={{
          ...knapp,
          ...(bekräftar
            ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }
            : {}),
        }}
      >
        {läge === 'sparar' ? 'Skriver…' : bekräftar ? 'Skriv över sajten?' : 'Lägg tillbaka'}
      </button>
      {läge === 'fel' && <span style={{ fontSize: 11, color: '#f87171' }}>gick inte</span>}
    </span>
  )
}
