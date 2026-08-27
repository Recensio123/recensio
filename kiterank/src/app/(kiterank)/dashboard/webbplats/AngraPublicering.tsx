'use client'
import { useCallback, useEffect, useState } from 'react'

/*
 * Ett steg tillbaka till förra publiceringen.
 *
 * Finns för det som händer alla förr eller senare: man sparar, tittar på
 * sidan, och inser att det var bättre innan. Utan knappen är enda vägen
 * tillbaka att minnas exakt vad som stod och skriva om det för hand.
 *
 * Ett steg, inte en historik. Den som råkat skriva över sin startsida vill ha
 * tillbaka gårdagens — inte välja mellan sju versioner de inte kan skilja åt.
 * Fler steg finns sparade hos oss, och den som behöver längre tillbaka har ett
 * problem som förtjänar ett samtal.
 *
 * Ritas bara när det finns något att ångra. En knapp som säger nej är sämre än
 * ingen knapp.
 */

const F = 'var(--font-brand-sans)'

export function ÅngraPublicering() {
  const [finns, setFinns]         = useState(false)
  const [när, setNär]             = useState<string | null>(null)
  const [bekräftar, setBekräftar] = useState(false)
  const [läge, setLäge]           = useState<'vila' | 'arbetar' | 'fel'>('vila')

  const kolla = useCallback(async () => {
    try {
      const res = await fetch('/api/webbplats/angra')
      if (!res.ok) return
      const d = await res.json()
      setFinns(Boolean(d.finns))
      setNär(d.skapad ?? null)
    } catch { /* går det inte att fråga ritas ingen knapp */ }
  }, [])

  useEffect(() => { void kolla() }, [kolla])

  async function ångra() {
    setLäge('arbetar')
    try {
      const res = await fetch('/api/webbplats/angra', { method: 'POST' })
      if (!res.ok) throw new Error()
      /* Hela sidan om: panelen har innehållet i minnet, och en återställning
         som bara syns live vore värre än ingen alls. */
      location.reload()
    } catch {
      setLäge('fel')
      setBekräftar(false)
    }
  }

  if (!finns) return null

  const datum = när
    ? new Date(när).toLocaleDateString('sv-SE') + ' ' + new Date(när).toLocaleTimeString('sv-SE').slice(0, 5)
    : ''

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => bekräftar ? void ångra() : setBekräftar(true)}
        onBlur={() => setBekräftar(false)}
        disabled={läge === 'arbetar'}
        title={datum ? `Lägger tillbaka sidan som den såg ut ${datum}` : undefined}
        style={{
          padding: '5px 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
          fontFamily: F, cursor: 'pointer', background: 'transparent',
          color: bekräftar ? '#f87171' : '#94a3b8',
          border: `1px solid ${bekräftar ? 'rgba(239,68,68,0.45)' : '#334155'}`,
        }}
      >
        {läge === 'arbetar' ? 'Lägger tillbaka…'
          : bekräftar ? 'Säker? Klicka igen'
          : 'Ångra senaste publiceringen'}
      </button>
      {läge === 'fel' && (
        <span style={{ fontSize: 12, color: '#f87171', fontFamily: F }}>gick inte</span>
      )}
    </span>
  )
}
