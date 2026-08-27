'use client'
import { useState } from 'react'

/*
 * Rabattreglaget per kund: ett procentfält som sparar sig självt.
 *
 * Skrivs på blur eller Enter, bara när värdet faktiskt ändrats — en adminvy
 * med spara-knapp per rad blir ett formulär, och det här är en tabell. Svaret
 * säger om Stripe hann med: en rabatt som bara nådde databasen ska synas som
 * en varning här, inte upptäckas på kundens nästa faktura.
 */

export function RabattCell({ companyId, procent }: { companyId: string; procent: number }) {
  const [värde, setVärde] = useState(String(procent))
  const [sparat, setSparat] = useState(procent)
  const [läge, setLäge] = useState<'vila' | 'sparar' | 'klar' | 'fel' | 'osynkad'>('vila')

  async function spara() {
    const n = Math.round(Number(värde))
    if (!Number.isFinite(n) || n < 0 || n > 100) { setVärde(String(sparat)); return }
    if (n === sparat) return
    setLäge('sparar')
    try {
      const res = await fetch('/api/admin/rabatt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, procent: n }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok || !d?.ok) throw new Error()
      setSparat(n)
      setVärde(String(n))
      setLäge(d.varning ? 'osynkad' : 'klar')
    } catch {
      setVärde(String(sparat))
      setLäge('fel')
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <input
        type="number" min={0} max={100} value={värde}
        onChange={e => { setVärde(e.target.value); setLäge('vila') }}
        onBlur={spara}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        disabled={läge === 'sparar'}
        style={{
          width: 52, padding: '4px 6px', borderRadius: 7, fontSize: 13,
          textAlign: 'right', fontFamily: 'var(--font-brand-sans)',
          background: '#0f172a', border: '1px solid #1e293b',
          color: sparat > 0 ? '#f0b429' : '#94a3b8',
        }}
      />
      <span style={{ fontSize: 12, color: '#475569' }}>%</span>
      {läge === 'sparar'  && <span style={{ fontSize: 11, color: '#64748b' }}>sparar…</span>}
      {läge === 'klar'    && <span style={{ fontSize: 11, color: '#4ade80' }}>sparat</span>}
      {läge === 'fel'     && <span style={{ fontSize: 11, color: '#f87171' }}>gick inte</span>}
      {läge === 'osynkad' && (
        <span style={{ fontSize: 11, color: '#fb923c' }} title="Sparat här, men Stripe svarade inte — lägg om rabatten eller sätt kupongen hos Stripe.">
          ej hos Stripe
        </span>
      )}
    </span>
  )
}
