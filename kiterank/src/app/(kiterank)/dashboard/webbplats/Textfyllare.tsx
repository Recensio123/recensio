'use client'
import { useState } from 'react'
import { TONER, läsAntal, type Ton, type Förslag } from '@/lib/textfyllare'
import { F } from './fields'

/*
 * Textfyllaren, som en panel i redigeraren.
 *
 * Två lägen. Först frågorna — de enda vi inte kan svara på själva. Sedan
 * förslagen, ett fält i taget, med kundens nuvarande text bredvid och en knapp
 * per fält.
 *
 * Fält för fält och inte allt på en gång, av ett skäl som är värt att hålla
 * fast vid: en knapp som byter ut hela sidan är en knapp man trycker på en
 * gång och sedan ångrar utan väg tillbaka. Ett fält i taget gör att kunden
 * läser vad som står innan det står på deras sida.
 *
 * Ingenting sparas härifrån. Förslaget skrivs in i redigerarens utkast precis
 * som om kunden skrivit det själv, och Spara-knappen gäller som vanligt.
 */

const FRÅGOR = {
  plats: {
    rubrik: 'Vilken ort ska stå i texten?',
    hjälp:  'Den plats folk söker på när de letar efter någon som du. I större städer är stadsdelen oftast bättre än staden — "frisör Södermalm" möter färre konkurrenter och träffar den som faktiskt tänker gå dit. Ligger du mitt i city, eller på en mindre ort, skriv staden.',
    ex:     'Södermalm, Stockholm',
  },
  målgrupp: {
    rubrik: 'Vem kommer till er?',
    hjälp:  'Det som mest styr hur texten låter. Skriv som du skulle beskrivit dem för en kollega.',
    ex:     'Mest kvinnor 30–55 från området, många stamkunder som kommer var sjätte vecka',
  },
  viktigast: {
    rubrik: 'Vilka är de viktigaste tjänsterna ni säljer?',
    hjälp:  'De ni tjänar mest på, eller de ni vill sälja fler av. De hamnar först i texten och i söktiteln — resten av prislistan står kvar som vanligt.',
    ex:     'Balayage och slingor, sedan klippning. Vi vill gärna sälja fler behandlingar för slitet hår.',
  },
  annorlunda: {
    rubrik: 'Vad gör er annorlunda?',
    hjälp:  'Det som skiljer er från salongen tvärs över gatan. Konkret slår svepande — ett exempel säger mer än ett omdöme om er själva.',
    ex:     'Vi bokar en kund i taget, så ingen sitter och väntar mellan momenten.',
  },
  antal: {
    rubrik: 'Hur många jobbar hos er?',
    hjälp:  'Är du ensam skrivs texten i jag-form, annars i vi-form. Vi lägger också upp lika många platser under Om oss, med namn och bild att fylla i.',
    ex:     '4',
  },
} as const

/** Fälten i förslaget, i den ordning de står på sidan. */
const FÄLT: { nyckel: keyof Förslag; namn: string; lång?: boolean }[] = [
  { nyckel: 'heroHeading',    namn: 'Rubriken högst upp' },
  { nyckel: 'heroBody',       namn: 'Texten under rubriken', lång: true },
  { nyckel: 'tagline',        namn: 'Slogan' },
  { nyckel: 'ctaText',        namn: 'Knapptext' },
  { nyckel: 'aboutTitle',     namn: 'Om oss — rubrik' },
  { nyckel: 'aboutBody',      namn: 'Om oss — text', lång: true },
  { nyckel: 'seoTitle',       namn: 'Titel i sökresultatet' },
  { nyckel: 'seoDescription', namn: 'Beskrivning i sökresultatet', lång: true },
]

export function Textfyllare({ nuvarande, onStäng, onAnvänd, onAnvändTjänst, onSättTeam }: {
  /** Kundens text i dag, för jämförelsen bredvid varje förslag. */
  nuvarande: Partial<Record<keyof Förslag, string>>
  onStäng:   () => void
  onAnvänd:  (nyckel: keyof Förslag, text: string) => void
  /** Beskrivningen för en tjänst, matchad på namn. */
  onAnvändTjänst: (namn: string, beskrivning: string) => void
  /** Ser till att personalsektionen har minst så här många platser. */
  onSättTeam:     (antal: number) => void
}) {
  const [plats,    setPlats]    = useState('')
  const [målgrupp, setMålgrupp] = useState('')
  const [viktigast,  setViktigast]  = useState('')
  const [annorlunda, setAnnorlunda] = useState('')
  const [ton,      setTon]      = useState<Ton>('varm')
  const [antal,    setAntal]    = useState('')

  const [kör,     setKör]     = useState(false)
  const [fel,     setFel]     = useState('')
  const [förslag, setFörslag] = useState<Förslag | null>(null)
  const [tagna,   setTagna]   = useState<Set<string>>(new Set())

  /* Antalet läses med samma funktion som servern använder, så att knappen
     aldrig är klickbar för ett svar rutten sedan avvisar. */
  const teamAntal = läsAntal(antal)

  /* Alla tre krävs. Antalet avgör dessutom om texten skrivs i jag- eller
     vi-form, och den gissningen vill vi inte göra. */
  const kanKöra = plats.trim().length > 1 && målgrupp.trim().length > 2
    && viktigast.trim().length > 2 && annorlunda.trim().length > 2 && teamAntal > 0

  async function kör_() {
    setKör(true); setFel('')
    try {
      const res = await fetch('/api/textfyllare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plats, målgrupp, viktigast, annorlunda, ton, antal }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Något gick fel.')
      setFörslag(json.förslag as Förslag)
      setTagna(new Set())
    } catch (err) {
      setFel(err instanceof Error ? err.message : 'Något gick fel.')
    } finally {
      setKör(false)
    }
  }

  function ta(nyckel: string, gör: () => void) {
    gör()
    setTagna(prev => new Set(prev).add(nyckel))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.72)', zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 14, width: 'min(620px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '16px 18px 12px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#f1f5f9', fontFamily: F, margin: 0 }}>
            {förslag ? 'Förslag till din sida' : 'Fyll din hemsida med text'}
          </p>
          <button onClick={onStäng} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: F }}>
            Stäng
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!förslag ? (
            <>
              <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.7, margin: 0 }}>
                Vi vet redan ditt företagsnamn, din ort, din bransch och dina
                tjänster. Det vi behöver är det som inte går att läsa sig till.
              </p>

              <Fråga f={FRÅGOR.plats}    värde={plats}    sätt={setPlats}    rader={1} />
              <Fråga f={FRÅGOR.målgrupp} värde={målgrupp} sätt={setMålgrupp} rader={2} />
              <Fråga f={FRÅGOR.viktigast}  värde={viktigast}  sätt={setViktigast}  rader={2} />
              <Fråga f={FRÅGOR.annorlunda} värde={annorlunda} sätt={setAnnorlunda} rader={3} />

              <div>
                <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, fontFamily: F, margin: '0 0 2px' }}>
                  Hur ska det låta?
                </p>
                <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, margin: '0 0 8px', lineHeight: 1.5 }}>
                  Tonen i texten. Går att köra om med en annan om den inte känns rätt.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TONER.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTon(t.id)}
                      title={t.hur}
                      style={{
                        fontSize: 12, fontFamily: F, padding: '7px 11px', borderRadius: 8, cursor: 'pointer',
                        background: ton === t.id ? 'rgba(234,179,8,0.12)' : '#1e293b',
                        border: `1px solid ${ton === t.id ? '#eab308' : '#334155'}`,
                        color: ton === t.id ? '#eab308' : '#cbd5e1',
                      }}
                    >
                      {t.namn}
                    </button>
                  ))}
                </div>
              </div>

              <Fråga f={FRÅGOR.antal} värde={antal} sätt={setAntal} rader={1} smal />
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.7, margin: 0 }}>
                Läs igenom och ta det du gillar. Ingenting sparas förrän du
                trycker Spara i panelen, precis som när du skriver själv.
              </p>

              {FÄLT.map(f => (
                <Rad
                  key={f.nyckel}
                  namn={f.namn}
                  ny={String(förslag[f.nyckel] ?? '')}
                  gammal={nuvarande[f.nyckel] ?? ''}
                  tagen={tagna.has(f.nyckel)}
                  lång={f.lång}
                  onTa={() => ta(f.nyckel, () => onAnvänd(f.nyckel, String(förslag[f.nyckel] ?? '')))}
                />
              ))}

              {teamAntal > 0 && (
                <div style={{ border: '1px solid #1e293b', borderRadius: 10, padding: 11, background: '#0b1220' }}>
                  <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: F, margin: '0 0 6px' }}>
                    Personal på Om oss
                  </p>
                  <p style={{ fontSize: 12, color: '#f1f5f9', fontFamily: F, margin: '0 0 9px', lineHeight: 1.65 }}>
                    {teamAntal} platser med namn, titel och bild att fylla i.
                  </p>
                  <button
                    onClick={() => ta('team', () => onSättTeam(teamAntal))}
                    disabled={tagna.has('team')}
                    style={{
                      fontSize: 11, fontWeight: 700, fontFamily: F, padding: '5px 10px', borderRadius: 7,
                      cursor: tagna.has('team') ? 'default' : 'pointer',
                      background: tagna.has('team') ? 'rgba(74,222,128,0.14)' : 'none',
                      border: `1px solid ${tagna.has('team') ? 'rgba(74,222,128,0.4)' : '#334155'}`,
                      color: tagna.has('team') ? '#4ade80' : '#eab308',
                    }}
                  >
                    {tagna.has('team') ? '✓ Upplagda' : 'Lägg upp platserna'}
                  </button>
                </div>
              )}

              {förslag.tjänster.length > 0 && (
                <>
                  <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700, fontFamily: F, margin: '6px 0 0' }}>
                    Beskrivningar till tjänsterna
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, margin: 0, lineHeight: 1.5 }}>
                    Priserna rörs inte — bara texten under varje tjänst.
                  </p>
                  {förslag.tjänster.map(t => (
                    <Rad
                      key={t.namn}
                      namn={t.namn}
                      ny={t.beskrivning}
                      gammal=""
                      tagen={tagna.has(`tj:${t.namn}`)}
                      onTa={() => ta(`tj:${t.namn}`, () => onAnvändTjänst(t.namn, t.beskrivning))}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {fel && <p style={{ fontSize: 12, color: '#f87171', fontFamily: F, margin: 0 }}>{fel}</p>}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 18px 16px', borderTop: '1px solid #1e293b' }}>
          <button
            onClick={() => void kör_()}
            disabled={kör || !kanKöra}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: 700, fontFamily: F, borderRadius: 9,
              border: 'none', cursor: kör || !kanKöra ? 'default' : 'pointer',
              background: kör || !kanKöra ? '#1e293b' : '#eab308',
              color: kör || !kanKöra ? '#64748b' : '#0f172a',
            }}
          >
            {kör ? 'Skriver…' : förslag ? 'Skriv om' : 'Skriv texterna'}
          </button>
          {förslag && (
            <button
              onClick={() => setFörslag(null)}
              style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, fontFamily: F, borderRadius: 9, background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}
            >
              Ändra svaren
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Fråga({ f, värde, sätt, rader, smal }: {
  f: { rubrik: string; hjälp: string; ex: string }
  värde: string
  sätt: (v: string) => void
  rader: number
  smal?: boolean
}) {
  const stil = {
    width: smal ? 120 : '100%', background: '#1e293b', border: '1px solid #334155',
    borderRadius: 8, padding: '9px 11px', fontSize: 13, color: '#f1f5f9',
    fontFamily: F, outline: 'none', lineHeight: 1.6, resize: 'vertical' as const,
  }
  return (
    <div>
      <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, fontFamily: F, margin: '0 0 2px' }}>{f.rubrik}</p>
      <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, margin: '0 0 8px', lineHeight: 1.5 }}>{f.hjälp}</p>
      {rader > 1
        ? <textarea value={värde} onChange={e => sätt(e.target.value)} rows={rader} placeholder={f.ex} style={stil} />
        : <input type="text" value={värde} onChange={e => sätt(e.target.value)} placeholder={f.ex} style={stil} />}
    </div>
  )
}

/*
 * Ett förslag, med det som står i dag bredvid.
 *
 * Den gamla texten visas överstruken och i grått. Utan den är valet "låter det
 * här bra?"; med den är valet "är det här bättre än vad jag har?", vilket är
 * frågan kunden faktiskt ska svara på.
 */
function Rad({ namn, ny, gammal, tagen, lång, onTa }: {
  namn: string; ny: string; gammal: string; tagen: boolean; lång?: boolean; onTa: () => void
}) {
  if (!ny.trim()) return null

  return (
    <div style={{ border: '1px solid #1e293b', borderRadius: 10, padding: 11, background: '#0b1220' }}>
      <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: F, margin: '0 0 6px' }}>
        {namn}
      </p>

      {gammal.trim() && gammal.trim() !== ny.trim() && (
        <p style={{ fontSize: 11, color: '#475569', fontFamily: F, margin: '0 0 6px', lineHeight: 1.6, textDecoration: 'line-through' }}>
          {gammal.length > 180 ? gammal.slice(0, 180) + '…' : gammal}
        </p>
      )}

      <p style={{ fontSize: lång ? 12 : 13, color: '#f1f5f9', fontFamily: F, margin: '0 0 9px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {ny}
      </p>

      <button
        onClick={onTa}
        disabled={tagen}
        style={{
          fontSize: 11, fontWeight: 700, fontFamily: F, padding: '5px 10px', borderRadius: 7,
          cursor: tagen ? 'default' : 'pointer',
          background: tagen ? 'rgba(74,222,128,0.14)' : 'none',
          border: `1px solid ${tagen ? 'rgba(74,222,128,0.4)' : '#334155'}`,
          color: tagen ? '#4ade80' : '#eab308',
        }}
      >
        {tagen ? '✓ Inlagd' : 'Använd den här'}
      </button>
    </div>
  )
}
