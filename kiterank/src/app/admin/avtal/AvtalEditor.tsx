'use client'
import { useState } from 'react'

/*
 * Redigeraren för ett avtal.
 *
 * Ren text i en ruta, inte ett formaterat fält. Ett avtal ska gå att kopiera
 * rakt in i ett mejl, en PDF eller ett annat system utan att bära med sig
 * osynlig formatering — och den som ändrar en avtalsklausul vill se exakt vad
 * som står, inte en tolkning av det.
 *
 * Versionen skrivs för hand. Ett automatiskt löpnummer säger ingenting om
 * huruvida ändringen var ett stavfel eller en ny paragraf, och det är den
 * skillnaden en kund frågar efter.
 */

export function AvtalEditor({ slug, titel, innehall, version }: {
  slug:     string
  titel:    string
  innehall: string
  version:  string | null
}) {
  const [text,    setText]    = useState(innehall)
  const [ver,     setVer]     = useState(version ?? '')
  const [läge,    setLäge]    = useState<'vila' | 'sparar' | 'sparat' | 'fel'>('vila')
  const [kopierat, setKopierat] = useState(false)

  const ändrat = text !== innehall || ver !== (version ?? '')

  async function spara() {
    setLäge('sparar')
    try {
      const res = await fetch('/api/admin/avtal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, innehall: text, version: ver }),
      })
      if (!res.ok) throw new Error()
      setLäge('sparat')
      setTimeout(() => setLäge('vila'), 2500)
    } catch {
      setLäge('fel')
    }
  }

  const knapp = {
    padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
    fontFamily: 'var(--font-geist-sans)', cursor: 'pointer',
    border: '1px solid #1e293b', background: '#0f172a', color: '#cbd5e1',
  } as const

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: '#64748b' }}>
          Version{' '}
          <input
            value={ver}
            onChange={e => setVer(e.target.value)}
            placeholder="1.0"
            style={{
              width: 70, marginLeft: 6, padding: '4px 7px', borderRadius: 7, fontSize: 13,
              background: '#0f172a', border: '1px solid #1e293b', color: '#f1f5f9',
              fontFamily: 'var(--font-geist-sans)',
            }}
          />
        </label>

        <button
          onClick={() => { void navigator.clipboard.writeText(text); setKopierat(true); setTimeout(() => setKopierat(false), 2000) }}
          style={knapp}
        >
          {kopierat ? 'Kopierat' : 'Kopiera texten'}
        </button>

        <button
          onClick={spara}
          disabled={!ändrat || läge === 'sparar'}
          style={{
            ...knapp,
            opacity: ändrat ? 1 : 0.45,
            cursor: ändrat ? 'pointer' : 'default',
            background: ändrat ? '#1e293b' : '#0f172a',
            color: ändrat ? '#f1f5f9' : '#64748b',
          }}
        >
          {läge === 'sparar' ? 'Sparar…' : 'Spara'}
        </button>

        {läge === 'sparat' && <span style={{ fontSize: 12, color: '#4ade80' }}>Sparat</span>}
        {läge === 'fel'    && <span style={{ fontSize: 12, color: '#f87171' }}>Kunde inte spara</span>}
        {ändrat && läge === 'vila' && <span style={{ fontSize: 12, color: '#f0b429' }}>Osparade ändringar</span>}
      </div>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setLäge('vila') }}
        spellCheck={false}
        style={{
          width: '100%', minHeight: 520, padding: 14, borderRadius: 11,
          background: '#0b1220', border: '1px solid #1e293b', color: '#cbd5e1',
          fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
          fontSize: 12.5, lineHeight: 1.75, resize: 'vertical',
        }}
      />
    </div>
  )
}
