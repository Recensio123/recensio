'use client'
import { useState, type ReactNode } from 'react'
import { F } from './fields'
import { tillAdress } from '@/lib/siteAddress'

/* Delarna som domänrutan, zonrutan och mailrutan alla behöver.
 *
 * Samlade här av samma skäl som mallarnas komponenter: en ändring i hur ett
 * värde kopieras eller en knapp ser ut ska slå igenom på alla tre ställen, inte
 * på det ställe man råkade komma ihåg. */

export const helpTxt = {
  fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0,
}

/* Vägen till att köpa en domän, på ett ställe. Både texten i domänrutan och
   knappen i guiden pekar hit, och en salong som möter två olika länkar till
   samma sak undrar vilken som är den rätta. */
const NETIM = 'https://www.netim.com/en/domain-name/search'

/** Netims sök, förifyllt med salongens namn. Namnet är ändå det de hade
 *  skrivit, och ett tomt sökfält är ett beslut till att fatta. */
export function netimSök(namn?: string): string {
  const förslag = tillAdress(namn ?? '')
  return förslag ? `${NETIM}?domain=${förslag}.se` : NETIM
}

export const länkTxt = {
  color: '#eab308', textDecoration: 'underline', fontWeight: 700,
}

export const labelTxt = {
  fontSize: 10, color: '#64748b', letterSpacing: 1.5,
  textTransform: 'uppercase' as const, fontFamily: F, margin: 0,
}

export const boxStyle = {
  border: '1px solid #1e293b', borderRadius: 10, padding: 12,
  display: 'flex', flexDirection: 'column' as const, gap: 10,
}

export function Btn({ onClick, children, disabled, tone = 'primary' }: {
  onClick: () => void; children: ReactNode; disabled?: boolean
  tone?: 'primary' | 'quiet'
}) {
  const primary = tone === 'primary' && !disabled
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 12, fontWeight: 700, fontFamily: F, whiteSpace: 'nowrap',
        background: primary ? '#eab308' : '#1e293b',
        color:      primary ? '#0f172a' : disabled ? '#475569' : '#e2e8f0',
        border: 'none', borderRadius: 8, padding: '8px 16px',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

/** Ett värde att skriva av, med kopiering. Avskrivna DNS-värden blir felskrivna
 *  DNS-värden, och felet syns inte förrän sidan inte fungerar. */
export function CopyRad({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      /* Utan klippbordsrättighet står värdet kvar att markera. */
    }
  }

  return (
    <>
      <span style={{ color: '#64748b', fontSize: 12, fontFamily: F }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: 12, fontFamily: F, wordBreak: 'break-all' }}>{value}</span>
      <button
        onClick={() => void copy()}
        style={{
          fontSize: 10, fontFamily: F, color: done ? '#4ade80' : '#94a3b8',
          background: 'none', border: '1px solid #1e293b', borderRadius: 6,
          padding: '2px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {done ? 'Kopierad' : 'Kopiera'}
      </button>
    </>
  )
}

export const gridStyle = {
  display: 'grid', gridTemplateColumns: 'auto 1fr auto',
  gap: '6px 12px', alignItems: 'center' as const,
}

/** En ruta som säger något viktigt utan att se ut som ett fel. Skillnaden
 *  spelar roll: "du har mail på domänen" är information kunden måste läsa, inte
 *  något som gått sönder. */
export function Notis({ tone, children }: { tone: 'warn' | 'ok' | 'info'; children: ReactNode }) {
  const c = tone === 'warn' ? '#eab308' : tone === 'ok' ? '#4ade80' : '#94a3b8'
  return (
    <div style={{
      borderLeft: `2px solid ${c}`, paddingLeft: 10,
      fontSize: 11, color: '#cbd5e1', fontFamily: F, lineHeight: 1.55,
    }}>
      {children}
    </div>
  )
}
