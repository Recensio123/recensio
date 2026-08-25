'use client'
import type { Brist } from '@/lib/sidansBrister'
import { F } from './fields'

/*
 * Bristerna, överst i panelen.
 *
 * Rött och inte gult. Checklistan längre ned säger vad som återstår för att
 * sidan ska bli bra; det här säger att något på den publicerade sidan inte
 * fungerar för besökaren. Samma färg för båda hade gjort skillnaden osynlig,
 * och den skillnaden är hela poängen.
 *
 * Står först i spalten, före kom igång-listan. En brist som ligger under sju
 * andra rader är en brist ingen ser.
 */

export function BristBand({ brister }: { brister: Brist[] }) {
  if (!brister.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {brister.map(b => (
        <div
          key={b.id}
          style={{
            border: '1px solid rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.09)',
            borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', fontFamily: F, margin: 0 }}>
            {b.rubrik}
          </p>
          <p style={{ fontSize: 11, color: '#cbd5e1', fontFamily: F, lineHeight: 1.65, margin: 0 }}>
            {b.följd}
          </p>
          {/* Åtgärden står för sig och inte inbakad i förklaringen. Den som läst
              att något är fel vill veta vad de gör, inte läsa vidare. */}
          <p style={{ fontSize: 11, color: '#f1f5f9', fontFamily: F, lineHeight: 1.65, margin: 0, fontWeight: 600 }}>
            {b.åtgärd}
          </p>
        </div>
      ))}
    </div>
  )
}
