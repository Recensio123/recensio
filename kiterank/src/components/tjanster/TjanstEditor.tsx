'use client'
import { useEffect, useMemo, useState } from 'react'
import { prisText, tidText, type Tjanst } from '@/lib/tjanster'

/*
 * Tjänsterna, redigerade på ett ställe.
 *
 * Samma komponent bakom två dörrar: Bokningar → Tjänster för den som har
 * bokningssystem, Webbplats → Prislista för alla. Det är samma rader, samma
 * tabell och samma priser — det var uppdelningen i två listor som gjorde att en
 * prishöjning på hemsidan aldrig nådde bokningen.
 *
 * `harBokning` styr vilka fält som ritas, inte om de går att spara. En kund
 * utan bokningssystem ser aldrig bufferttid eller max per dag: fälten betyder
 * ingenting för dem, och ett fält man inte förstår är sämre än inget fält. De
 * ligger kvar i databasen med sina standardvärden och vaknar den dag salongen
 * köper till bokningen.
 */

export type Stol = { id: string; name: string }

const T = {
  rubrik:      'Tjänster och priser',
  tom:         'Inga tjänster än',
  tomHjälp:    'Lägg upp det ni gör och vad det kostar. Listan blir prislistan på hemsidan — och det kunderna kan boka, om ni har bokningssystemet.',
  lägg:        '+ Tjänst',
  spara:       'Spara',
  sparar:      'Sparar…',
  ta:          'Ta bort',
  namn:        'Namn',
  kategori:    'Kategori',
  beskrivning: 'Beskrivning',
  pris:        'Pris',
  frånPris:    'Från-pris',
  frånHjälp:   'Priset är ett golv. Visas som "från 2 200 kr" — för behandlingar som beror på hårlängd eller tidsåtgång.',
  påFörfrågan: 'Pris på förfrågan',
  visaPris:    'Visa priset på hemsidan',
  tid:         'Tid (minuter)',
  visaTid:     'Visa tiden på hemsidan',
  städtid:     'Städtid mellan bokningar sätts under Inställningar — den gäller alla tjänster.',
  bokningsbar: 'Går att boka online',
  bokHjälp:    'Av betyder att tjänsten syns i prislistan men kräver kontakt först — till exempel en behandling som behöver konsultation.',
  maxPerDag:   'Max per dag',
  maxHjälp:    'Tak för hur många ni hinner. Tomt = inget tak.',
  avbokning:   'Egen avbokningstid (timmar)',
  avbHjälp:    'Åsidosätter salongens vanliga regel. Tomt = den vanliga gäller.',
  förbered:    'Att göra före besöket',
  förbHjälp:   'Visas för kunden när de bokar. "Kom med tvättat hår."',
  vem:         'Vem kan utföra den',
  vemHjälp:    'Ingen ikryssad betyder alla. Kryssa bara om någon inte gör den här behandlingen.',
  dold:        'Dold',
  visa:        'Visa',
  stjärna:     'Visa på startsidan',
  stjärnaAv:   'Visas på startsidan — klicka för att ta bort',
  nyKategori:  '+ Ny kategori',
  kategoriNamn:'Kategorins namn',
}

const ram = {
  width: '100%', background: '#0b1220', border: '1px solid #1e293b',
  borderRadius: 8, padding: '7px 10px', color: '#e2e8f0', fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
} as const

function Fält({ etikett, hjälp, children }: { etikett: string; hjälp?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
        {etikett}
      </span>
      {children}
      {hjälp && (
        <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.55 }}>
          {hjälp}
        </span>
      )}
    </label>
  )
}

function Kryss({ på, sätt, text, hjälp }: { på: boolean; sätt: (v: boolean) => void; text: string; hjälp?: string }) {
  return (
    <label style={{ display: 'block', cursor: 'pointer' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={på} onChange={e => sätt(e.target.checked)} style={{ accentColor: '#f0b429' }} />
        <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>{text}</span>
      </span>
      {hjälp && (
        <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 3, marginLeft: 24, lineHeight: 1.55 }}>
          {hjälp}
        </span>
      )}
    </label>
  )
}

const TOM: Omit<Tjanst, 'id'> = {
  kategori: 'Tjänster', namn: '', beskrivning: '',
  pris_kr: null, pris_fran: false, visa_pris: true,
  minuter: 45, visa_tid: true,
  bokningsbar: true, max_per_dag: null, avbokning_timmar: null, forberedelse: '',
  aktiv: true, sort_order: 0,
}

export function TjanstEditor({
  harBokning, stolar = [], låst = false, utvalda, onStjärna,
}: {
  /** Styr vilka fält som ritas. Se filens inledning. */
  harBokning: boolean
  stolar?:    Stol[]
  /** Exempelläget: allt syns, ingenting sparas. */
  låst?:      boolean
  /*
   * Vilka tjänster som lyfts fram på startsidan, och hur man väljer dem.
   *
   * Urvalet hör till hemsidan och inte till tjänsten — det ligger i sidans
   * innehåll, inte i tabellen. Därför kommer det in utifrån, och stjärnorna ritas
   * bara där valet betyder något: i webbplatspanelen, bredvid förhandsvisningen
   * av startsidan. I bokningsfliken finns ingen startsida att lyfta fram något
   * på, och en stjärna där hade varit en knapp utan synlig verkan.
   */
  utvalda?:   string[]
  onStjärna?: (rad: { name: string; desc: string; price: string; duration: string }) => void
}) {
  const [rader, setRader]   = useState<Tjanst[]>([])
  const [personal, setPers] = useState<Record<string, string[]>>({})
  const [öppen, setÖppen]   = useState<string | null>(null)
  const [laddar, setLaddar] = useState(true)
  const [sparar, setSparar] = useState<string | null>(null)
  const [fel, setFel]       = useState('')

  useEffect(() => {
    let avbruten = false
    ;(async () => {
      try {
        const r = await fetch('/api/tjanster')
        if (!r.ok) throw new Error()
        const d = await r.json()
        if (avbruten) return
        setRader(d.tjanster ?? [])
        const karta: Record<string, string[]> = {}
        for (const p of d.personal ?? []) {
          karta[p.service_id] = [...(karta[p.service_id] ?? []), p.staff_id]
        }
        setPers(karta)
      } catch {
        if (!avbruten) setFel('Tjänsterna gick inte att hämta.')
      } finally {
        if (!avbruten) setLaddar(false)
      }
    })()
    return () => { avbruten = true }
  }, [])

  const kategorier = useMemo(
    () => [...new Set(rader.map(r => r.kategori).filter(Boolean))],
    [rader])

  /*
   * Raderna grupperade under sina rubriker.
   *
   * Låg förut som en platt lista med kategorin upprepad i grått på varje rad.
   * Femton rader där ordet "Klippning" står fyra gånger är inte en lista man
   * läser — och en rubrik som bara är ett fält på raden gick inte att döpa om
   * utan att öppna varje tjänst i tur och ordning.
   *
   * Ordningen följer sort_order: första gången en kategori dyker upp bestämmer
   * var rubriken hamnar, precis som på den publicerade prislistan.
   */
  const grupper = useMemo(() => {
    const ordning: string[] = []
    const karta = new Map<string, Tjanst[]>()
    for (const rad of [...rader].sort((a, b) => a.sort_order - b.sort_order)) {
      const k = rad.kategori?.trim() || 'Tjänster'
      if (!karta.has(k)) { karta.set(k, []); ordning.push(k) }
      karta.get(k)!.push(rad)
    }
    return ordning.map(k => ({ kategori: k, rader: karta.get(k)! }))
  }, [rader])

  function ändra(id: string, patch: Partial<Tjanst>) {
    setRader(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  async function spara(id: string) {
    const rad = rader.find(r => r.id === id)
    if (!rad || låst) return
    setSparar(id); setFel('')
    try {
      const r = await fetch('/api/tjanster', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rad, personal: personal[id] ?? [] }),
      })
      if (!r.ok) throw new Error()
    } catch {
      setFel('Kunde inte spara. Försök igen.')
    } finally {
      setSparar(null)
    }
  }

  /*
   * Byt namn på en kategori.
   *
   * Rubriken är ingen egen rad i databasen utan ett fält på varje tjänst, så
   * ett namnbyte rör alla rader i gruppen. Det sker i en enda fråga på servern
   * i stället för ett anrop per rad — femton anrop för att rätta ett stavfel
   * vore femton chanser att halva listan byter namn och andra halvan inte.
   */
  async function bytKategori(från: string, till: string) {
    const rent = till.trim()
    if (låst || !rent || rent === från) return
    setRader(rs => rs.map(x => x.kategori === från ? { ...x, kategori: rent } : x))
    try {
      await fetch('/api/tjanster', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategoriByt: { från, till: rent } }),
      })
    } catch {
      setFel('Kunde inte byta namn på kategorin.')
    }
  }

  async function lägg(kategori = 'Tjänster') {
    if (låst) return
    setFel('')
    try {
      const r = await fetch('/api/tjanster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...TOM, kategori, namn: 'Ny tjänst', sort_order: rader.length }),
      })
      if (!r.ok) throw new Error()
      const { tjanst } = await r.json()
      setRader(rs => [...rs, tjanst])
      setÖppen(tjanst.id)
    } catch {
      setFel('Kunde inte lägga till.')
    }
  }

  async function ta(id: string) {
    if (låst) return
    try {
      await fetch(`/api/tjanster?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setRader(rs => rs.filter(r => r.id !== id))
    } catch {
      setFel('Kunde inte ta bort.')
    }
  }

  if (laddar) {
    return <div style={{ height: 120, borderRadius: 12, background: '#0f172a', animation: 'pulse 2s infinite' }} />
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{T.rubrik}</h3>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {rader.length} {rader.length === 1 ? 'tjänst' : 'tjänster'}
        </span>
      </div>

      {fel && <p style={{ fontSize: 12.5, color: '#fca5a5', margin: '0 0 10px' }}>{fel}</p>}

      {!rader.length && (
        <div style={{ border: '1px solid #1e293b', borderRadius: 12, padding: '22px 18px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#f1f5f9' }}>{T.tom}</p>
          <p style={{ margin: '6px auto 0', fontSize: 12.5, color: '#94a3b8', lineHeight: 1.65, maxWidth: 420 }}>
            {T.tomHjälp}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {grupper.map(g => (
        <div key={g.kategori} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Rubriken, redigerbar på plats. Den är inget eget objekt i
              databasen utan kategorifältet på varje rad under sig — ett
              namnbyte här skriver om hela gruppen i en fråga. */}
          <input
            defaultValue={g.kategori}
            disabled={låst}
            aria-label={T.kategoriNamn}
            onBlur={e => bytKategori(g.kategori, e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            style={{
              background: 'none', border: 'none', borderBottom: '1px solid transparent',
              padding: '2px 0', fontSize: 12, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase', color: '#94a3b8', fontFamily: 'inherit',
              outline: 'none', width: '100%',
            }}
            onFocus={e => { e.target.style.borderBottomColor = '#334155' }}
            onBlurCapture={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}
          />

          {g.rader.map(r => {
          const är = öppen === r.id
          const stjärnad = utvalda?.includes(r.namn) ?? false
          return (
            <div key={r.id} style={{
              border: `1px solid ${är ? '#334155' : '#1e293b'}`, borderRadius: 10,
              background: '#0f172a', opacity: r.aktiv ? 1 : 0.55,
              display: 'flex', alignItems: 'stretch',
            }}>
              {/* Stjärnan står utanför öppna-knappen. Ligger den inuti blir ett
                  klick på den också ett klick som fäller ut raden. */}
              {onStjärna && (
                <button
                  onClick={() => onStjärna({
                    name: r.namn, desc: r.beskrivning,
                    price: prisText(r), duration: tidText(r),
                  })}
                  title={stjärnad ? T.stjärnaAv : T.stjärna}
                  aria-label={stjärnad ? T.stjärnaAv : T.stjärna}
                  aria-pressed={stjärnad}
                  style={{
                    flexShrink: 0, width: 34, background: 'none', border: 'none',
                    borderRight: '1px solid #1e293b', cursor: 'pointer',
                    color: stjärnad ? '#f0b429' : '#334155', fontSize: 15,
                    fontFamily: 'inherit', borderRadius: '10px 0 0 10px',
                  }}
                >
                  {stjärnad ? '★' : '☆'}
                </button>
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
              <button
                onClick={() => setÖppen(är ? null : r.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 13px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13.5, color: '#e2e8f0', fontWeight: 500 }}>
                    {r.namn || '—'}
                  </span>
                  {/* Kategorin står inte längre på raden — den står som rubrik
                      över gruppen. Kvar blir bara det som avviker. */}
                  {(!r.aktiv || (!r.bokningsbar && harBokning)) && (
                    <span style={{ display: 'block', fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                      {[!r.aktiv && T.dold.toLowerCase(),
                        !r.bokningsbar && harBokning && 'bokas inte online'].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 12.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {tidText(r, false)}
                </span>
                <span style={{ fontSize: 12.5, color: '#e2e8f0', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {prisText(r, false)}
                </span>
                <span style={{ fontSize: 11, color: '#475569' }}>{är ? '▲' : '▼'}</span>
              </button>

              {är && (
                <div style={{ borderTop: '1px solid #1e293b', padding: 13, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 11 }}>
                    <Fält etikett={T.namn}>
                      <input style={ram} value={r.namn} onChange={e => ändra(r.id, { namn: e.target.value })} />
                    </Fält>
                    <Fält etikett={T.kategori}>
                      <input style={ram} list="kiterank-kategorier" value={r.kategori}
                             onChange={e => ändra(r.id, { kategori: e.target.value })} />
                      <datalist id="kiterank-kategorier">
                        {kategorier.map(k => <option key={k} value={k} />)}
                      </datalist>
                    </Fält>
                  </div>

                  <Fält etikett={T.beskrivning}>
                    <input style={ram} value={r.beskrivning}
                           onChange={e => ändra(r.id, { beskrivning: e.target.value })} />
                  </Fält>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 11 }}>
                    <Fält etikett={T.pris}>
                      <input
                        style={ram} type="number" min={0} inputMode="numeric"
                        placeholder={T.påFörfrågan}
                        value={r.pris_kr ?? ''}
                        onChange={e => ändra(r.id, { pris_kr: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </Fält>
                    <Fält etikett={T.tid}>
                      <input
                        style={ram} type="number" min={5} max={600} step={5} inputMode="numeric"
                        value={r.minuter}
                        onChange={e => ändra(r.id, { minuter: Number(e.target.value) })}
                      />
                    </Fält>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Kryss på={r.pris_fran} sätt={v => ändra(r.id, { pris_fran: v })}
                           text={T.frånPris} hjälp={T.frånHjälp} />
                    <Kryss på={r.visa_pris} sätt={v => ändra(r.id, { visa_pris: v })} text={T.visaPris} />
                    <Kryss på={r.visa_tid}  sätt={v => ändra(r.id, { visa_tid: v })}  text={T.visaTid} />
                  </div>

                  {/* Bokningsfälten. Ritas inte alls utan bokningssystem — de
                      betyder ingenting för en kund som bara har en hemsida. */}
                  {harBokning && (
                    <div style={{
                      borderTop: '1px solid #1e293b', paddingTop: 12,
                      display: 'flex', flexDirection: 'column', gap: 11,
                    }}>
                      <Kryss på={r.bokningsbar} sätt={v => ändra(r.id, { bokningsbar: v })}
                             text={T.bokningsbar} hjälp={T.bokHjälp} />

                      {/* Städtiden är salongens rytm och inte behandlingens — se
                          Inställningar. Raden står här ändå, för det är här man
                          letar efter den. */}
                      <p style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                        {T.städtid}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 11 }}>
                        <Fält etikett={T.maxPerDag} hjälp={T.maxHjälp}>
                          <input
                            style={ram} type="number" min={1} inputMode="numeric" placeholder="—"
                            value={r.max_per_dag ?? ''}
                            onChange={e => ändra(r.id, { max_per_dag: e.target.value === '' ? null : Number(e.target.value) })}
                          />
                        </Fält>
                        <Fält etikett={T.avbokning} hjälp={T.avbHjälp}>
                          <input
                            style={ram} type="number" min={0} max={336} inputMode="numeric" placeholder="—"
                            value={r.avbokning_timmar ?? ''}
                            onChange={e => ändra(r.id, { avbokning_timmar: e.target.value === '' ? null : Number(e.target.value) })}
                          />
                        </Fält>
                      </div>

                      <Fält etikett={T.förbered} hjälp={T.förbHjälp}>
                        <input style={ram} value={r.forberedelse}
                               onChange={e => ändra(r.id, { forberedelse: e.target.value })} />
                      </Fält>

                      {stolar.length > 1 && (
                        <Fält etikett={T.vem} hjälp={T.vemHjälp}>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                            {stolar.map(s => {
                              const vald = (personal[r.id] ?? []).includes(s.id)
                              return (
                                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                  <input
                                    type="checkbox" checked={vald} style={{ accentColor: '#f0b429' }}
                                    onChange={e => setPers(p => ({
                                      ...p,
                                      [r.id]: e.target.checked
                                        ? [...(p[r.id] ?? []), s.id]
                                        : (p[r.id] ?? []).filter(x => x !== s.id),
                                    }))}
                                  />
                                  <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>{s.name}</span>
                                </label>
                              )
                            })}
                          </div>
                        </Fält>
                      )}
                    </div>
                  )}

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    borderTop: '1px solid #1e293b', paddingTop: 11,
                  }}>
                    <button
                      onClick={() => spara(r.id)}
                      disabled={låst || sparar === r.id}
                      style={{
                        fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 8,
                        border: 'none', background: '#f0b429', color: '#0b1220',
                        cursor: låst ? 'not-allowed' : 'pointer', opacity: låst ? 0.5 : 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      {sparar === r.id ? T.sparar : T.spara}
                    </button>
                    <button
                      onClick={() => ändra(r.id, { aktiv: !r.aktiv })}
                      style={{
                        fontSize: 12, padding: '6px 10px', borderRadius: 8,
                        border: '1px solid #334155', background: 'transparent',
                        color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {r.aktiv ? T.dold : T.visa}
                    </button>
                    <span style={{ flex: 1 }} />
                    <button
                      onClick={() => ta(r.id)}
                      disabled={låst}
                      style={{
                        fontSize: 12, background: 'none', border: 'none',
                        color: '#f87171', cursor: låst ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {T.ta}
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          )
        })}

          {/* Läggs till i den här kategorin, inte i en ny. Knappen står under
              sin egen grupp, så var man trycker avgör var raden hamnar. */}
          <button
            onClick={() => lägg(g.kategori)}
            disabled={låst}
            style={{
              alignSelf: 'flex-start', marginTop: 2, fontSize: 12, padding: '5px 10px',
              borderRadius: 8, border: '1px dashed #1e293b', background: 'transparent',
              color: '#64748b', cursor: låst ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {T.lägg}
          </button>
        </div>
        ))}
      </div>

      <button
        onClick={() => lägg('Ny kategori')}
        disabled={låst}
        style={{
          marginTop: 14, fontSize: 12.5, fontWeight: 600, padding: '8px 14px',
          borderRadius: 9, border: '1px dashed #334155', background: 'transparent',
          color: '#94a3b8', cursor: låst ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        }}
      >
        {T.nyKategori}
      </button>
    </div>
  )
}
