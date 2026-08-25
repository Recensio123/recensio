'use client'
import { useState } from 'react'
import { F } from './fields'

/*
 * Raden som säger vems prislistan är.
 *
 * Varje bransch levereras med samma lista. Namnen och tiderna är bra —
 * en frisör klipper dam, herr och barn oavsett var salongen ligger. Priserna
 * är gissningar, och de är den enda inställningen i produkten som är
 * självsäkert felaktig.
 *
 * Skillnaden mot en tom text är att felet inte syns. Ett tomt fält är
 * uppenbart ofärdigt; "Klippning dam 650 kr" ser färdigt ut ända fram till att
 * en kund bokat på det och sitter i stolen.
 *
 * Därför står det här, i gult, ovanför listan.
 *
 * Knappen tömmer hela listan och inte bara priserna. Hur salongen delar upp och
 * namnger det de säljer är deras yrkeskunnande — en halvtömd mall hade styrt in
 * dem i vår uppdelning i stället för att lämna plats åt deras.
 */

export function PrislistaBanderoll({ egnaPriser, antalRader, onBörjaOm }: {
  /** Hur många rader som har salongens eget pris. Noll = allt är vårt. */
  egnaPriser:  number
  antalRader:  number
  onBörjaOm:   () => void
}) {
  const [frågar, setFrågar] = useState(false)

  /* Efter att de börjat sätta egna priser säger banderollen inget nytt, och en
     varning som står kvar över eget arbete läser som att vi inte tittat. */
  if (egnaPriser > 0 || antalRader === 0) return null

  return (
    <div style={{
      border: '1px solid rgba(234,179,8,0.4)', background: 'rgba(234,179,8,0.08)',
      borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 9,
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#eab308', fontFamily: F, margin: 0 }}>
        Exempelprislista
      </p>
      <p style={{ fontSize: 11, color: '#cbd5e1', fontFamily: F, lineHeight: 1.65, margin: 0 }}>
        Listan är densamma för alla i din bransch och finns här som inspiration —
        ungefär vad som brukar stå och vad det brukar kosta.
      </p>
      {/* Det viktiga står för sig. Att listan inte går ut är inte en detalj i en
          förklaring, det är svaret på frågan kunden annars ställer sig: kan jag
          publicera med det här? */}
      <p style={{ fontSize: 11, color: '#f1f5f9', fontFamily: F, lineHeight: 1.65, margin: 0, fontWeight: 600 }}>
        Den publiceras inte. Din sida visar ingen prislista förrän du satt egna
        priser — vi vill inte att någon bokar hos dig på en siffra vi gissat.
      </p>

      {!frågar ? (
        <button
          onClick={() => setFrågar(true)}
          style={{
            alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, fontFamily: F,
            padding: '6px 11px', borderRadius: 8, cursor: 'pointer',
            background: '#eab308', color: '#0f172a', border: 'none',
          }}
        >
          Skapa din egen prislista
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, color: '#cbd5e1', fontFamily: F, lineHeight: 1.65, margin: 0 }}>
            Hela exempellistan tas bort och du börjar från en tom sida — dina
            kategorier, dina behandlingar, dina priser. Exemplet går inte att få
            tillbaka efteråt.
          </p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button
              onClick={() => { onBörjaOm(); setFrågar(false) }}
              style={{
                fontSize: 11, fontWeight: 700, fontFamily: F, padding: '6px 11px',
                borderRadius: 8, cursor: 'pointer', background: '#eab308',
                color: '#0f172a', border: 'none',
              }}
            >
              Börja om
            </button>
            <button
              onClick={() => setFrågar(false)}
              style={{
                fontSize: 11, fontWeight: 600, fontFamily: F, padding: '6px 11px',
                borderRadius: 8, cursor: 'pointer', background: 'none',
                color: '#94a3b8', border: '1px solid #334155',
              }}
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
