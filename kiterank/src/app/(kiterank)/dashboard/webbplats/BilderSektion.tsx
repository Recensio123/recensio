'use client'
import { useState } from 'react'
import { uploadImage } from '@/lib/uploadImage'
import { isExampleImage as ärExempel } from '@/lib/exampleContent'
import { F } from './fields'

/*
 * Bilderna, samlade på ett ställe.
 *
 * Uppladdningen sker fortfarande där bilden ska sitta — man klickar på
 * bildplatsen och väljer en fil. Den här sektionen ändrar inte på det. Den
 * svarar på två andra frågor: var ligger mina bilder, och vad står det att de
 * föreställer?
 *
 * Den andra är den som annars aldrig blir gjord. Bildbeskrivningen är osynlig
 * på sidan, så ingen upptäcker att den saknas — och den som redigerar en bild
 * där den sitter tänker på hur den ser ut, inte på vad det ska stå om den.
 *
 * En ruta per PLATS, inte per fil. Skillnaden märks så fort samma bild sitter
 * på två ställen — vilket den gör hela tiden så länge exempelbilderna ligger
 * kvar, eftersom sex filer fyller tjugo platser. Grupperat per fil öppnade ett
 * klick en lista med sju fält, och det såg ut som att ändringen gällde alla
 * sju. Nu är en ruta en plats, ett klick en beskrivning.
 */

/**
 * En plats där en bild sitter.
 *
 * `sida` är sajtens sida, med det namn menyn ger den — så att "Tjänster" här
 * är samma "Tjänster" som besökaren klickar på. Det är både det filtret
 * grupperar på och etiketten på bilden. `namn` pekar ut platsen på sidan:
 * vilken artikel, vilken galleriplats.
 *
 * `sättAlt` är null där beskrivningen inte är kundens att skriva: loggan och
 * personalbilderna beskrivs av företagsnamnet respektive personens namn.
 */
export type BildPlats = {
  sida:    string
  namn:    string
  alt:     string
  sättAlt: ((v: string) => void) | null
  /** Var bilden sitter: vilken sida förhandsvisningen ska visa och vilket
   *  avsnitt i panelen som ska öppnas. */
  till:    { panel: string; sida: string }
}

type Post = { nyckel: string; url: string; plats: BildPlats | null }

const OPUBLICERADE = 'Inte publicerade'

/* Kort nog att läsas upp i ett svep, långt nog att beskriva något. Google
   läser inte längre än så heller. */
const MAX_ALT = 125

export function BilderSektion({ bilder, platser, onAdd, onRemove, onGåTill }: {
  bilder:   string[]
  /** Var varje bild sitter. Saknas den i kartan ligger den inte ute någonstans. */
  platser:  Map<string, BildPlats[]>
  onAdd:    (url: string) => void
  onRemove: (url: string) => void
  onGåTill: (till: { panel: string; sida: string }) => void
}) {
  const [busy,  setBusy]  = useState(false)
  const [fel,   setFel]   = useState('')
  const [valt,  setValt]  = useState<string | null>(null)
  const [öppen, setÖppen] = useState<string | null>(null)

  /* En post per plats. En bild som ingenstans sitter blir en post utan plats —
     den finns i biblioteket och ska gå att se och ta bort. */
  const poster: Post[] = bilder.flatMap<Post>(url => {
    const p = platser.get(url) ?? []
    return p.length
      ? p.map(x => ({ nyckel: `${x.sida}|${x.namn}|${url}`, url, plats: x }))
      : [{ nyckel: `oanvänd|${url}`, url, plats: null }]
  })

  const exempelKvar = poster.filter(x => x.plats && ärExempel(x.url)).length
  const oanvända    = poster.filter(x => !x.plats && !ärExempel(x.url)).length
  const utanText    = poster.filter(x => x.plats?.sättAlt && !x.plats.alt.trim()).length

  /*
   * Filterknapparna, i den ordning sidorna finns.
   *
   * Startsidan först eftersom den är den som besöks; artiklarna i sin egen
   * ordning; det opublicerade sist. Bara sidor som faktiskt har bilder får en
   * knapp — en knapp som leder till ett tomt rutnät är en återvändsgränd.
   */
  const sidor = [...new Set(poster.map(x => x.plats?.sida).filter((v): v is string => !!v))]
  const val   = [...sidor, ...(oanvända > 0 ? [OPUBLICERADE] : [])]
  const visaFilter = val.length > 1

  const synliga = !valt
    ? poster
    : valt === OPUBLICERADE
      ? poster.filter(x => !x.plats)
      : poster.filter(x => x.plats?.sida === valt)

  const öppnad = poster.find(x => x.nyckel === öppen) ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
        Varje ruta är en plats på sajten. Du byter bild genom att klicka på
        bildplatsen i förhandsvisningen — här skriver du vad bilden föreställer.
      </p>

      {!poster.length ? (
        <p style={{ fontSize: 12, color: '#64748b', fontFamily: F, lineHeight: 1.6, margin: 0, border: '1px dashed #334155', borderRadius: 8, padding: '14px 16px' }}>
          Inga bilder ännu. Klicka på en bildplats i förhandsvisningen för att
          ladda upp din första.
        </p>
      ) : (
        <>
          {visaFilter && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {[null, ...val].map(v => {
                const aktiv = v === valt
                const antal = v === null ? poster.length
                  : v === OPUBLICERADE ? oanvända
                  : poster.filter(x => x.plats?.sida === v).length
                return (
                  <button
                    key={v ?? 'alla'}
                    onClick={() => { setValt(v); setÖppen(null) }}
                    style={{
                      fontSize: 11, fontFamily: F, padding: '4px 8px', borderRadius: 999, cursor: 'pointer',
                      background: aktiv ? 'rgba(234,179,8,0.12)' : '#1e293b',
                      border: `1px solid ${aktiv ? '#eab308' : '#334155'}`,
                      color: aktiv ? '#eab308' : '#94a3b8',
                      maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {v ?? 'Alla'} {antal}
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            {synliga.map(post => {
              const { nyckel, url, plats } = post
              const markerad = nyckel === öppen
              const saknas   = !!plats?.sättAlt && !plats.alt.trim()

              return (
                <div key={nyckel} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setÖppen(markerad ? null : nyckel)}
                    title={plats ? `${plats.sida} · ${plats.namn}` : 'Ligger inte ute på sajten'}
                    style={{
                      display: 'block', width: '100%', padding: 0, cursor: 'pointer',
                      border: `1px solid ${markerad ? '#eab308' : '#334155'}`,
                      borderRadius: 8, overflow: 'hidden', background: '#1e293b', aspectRatio: '4/3',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>

                  {/* Sidan bilden ligger på. Uppgiften stod tidigare bara i
                      verktygstipset, vilket betyder att den bara fanns för den
                      som redan gissat att den fanns. */}
                  {plats && (
                    <span style={{
                      position: 'absolute', left: 4, top: 4, right: 30,
                      fontSize: 9, fontFamily: F, fontWeight: 600,
                      color: '#e2e8f0', background: 'rgba(2,6,23,0.82)',
                      border: '1px solid #334155', borderRadius: 4, padding: '2px 5px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}>
                      {plats.sida}
                    </span>
                  )}

                  {/* Grönt: den här är din och den sitter på sajten. Gult: den
                      här är vår, och den står där tills du byter ut den. Samma
                      färg för båda hade gjort exempelbilderna till något som
                      såg klart ut. */}
                  {plats && (
                    <span style={{
                      position: 'absolute', left: 4, bottom: 4, fontSize: 9, fontWeight: 700,
                      letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: F,
                      color: '#0f172a', background: ärExempel(url) ? '#eab308' : '#4ade80',
                      borderRadius: 4, padding: '2px 5px', pointerEvents: 'none',
                    }}>
                      {ärExempel(url) ? 'Exempel' : 'Används'}
                    </span>
                  )}

                  {/* Saknad beskrivning syns på bilden, inte bara i en siffra
                      längst ned. Det är den enda bristen på en hemsida som är
                      helt osynlig — ingen upptäcker den genom att titta. */}
                  {saknas && (
                    <span title="Ingen bildbeskrivning" style={{
                      position: 'absolute', right: 4, bottom: 4, width: 16, height: 16,
                      borderRadius: '50%', background: '#0f172a', border: '1px solid #eab308',
                      color: '#eab308', fontSize: 10, fontWeight: 700, fontFamily: F,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                    }}>
                      !
                    </span>
                  )}

                  {/* Bara den som inte sitter någonstans går att ta bort. Att
                      kunna tömma en bildplats på startsidan härifrån vore en
                      ändring man gör utan att se vad som händer. */}
                  {!plats && (
                    <button
                      onClick={() => { onRemove(url); if (markerad) setÖppen(null) }}
                      title="Ta bort ur biblioteket"
                      style={{
                        position: 'absolute', right: 4, top: 4, width: 22, height: 22,
                        borderRadius: 6, border: '1px solid #334155', background: 'rgba(2,6,23,0.8)',
                        color: '#f87171', fontSize: 13, lineHeight: 1, cursor: 'pointer', fontFamily: F,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {öppnad && (
            <Beskrivning post={öppnad} onStäng={() => setÖppen(null)} onGåTill={onGåTill} />
          )}

          {(oanvända > 0 || exempelKvar > 0 || utanText > 0) && (
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, margin: 0, lineHeight: 1.7 }}>
              {exempelKvar > 0 && (
                <span style={{ display: 'block' }}>
                  {exempelKvar === 1
                    ? '1 plats visar fortfarande en exempelbild.'
                    : `${exempelKvar} platser visar fortfarande exempelbilder.`}
                </span>
              )}
              {utanText > 0 && (
                <span style={{ display: 'block' }}>
                  {utanText === 1
                    ? '1 bild saknar beskrivning.'
                    : `${utanText} bilder saknar beskrivning.`}
                </span>
              )}
              {oanvända > 0 && (
                <span style={{ display: 'block' }}>
                  {oanvända === 1
                    ? '1 av dina bilder ligger inte ute på sajten.'
                    : `${oanvända} av dina bilder ligger inte ute på sajten.`}
                </span>
              )}
            </p>
          )}
        </>
      )}

      {fel && <p style={{ fontSize: 12, color: '#f87171', fontFamily: F, margin: 0 }}>{fel}</p>}

      {/* Uppladdning härifrån också. Den som redan står i vyn ska inte behöva
          leta upp en bildplats för att lägga till något. */}
      <label style={{
        display: 'block', textAlign: 'center', border: '1px dashed #334155', borderRadius: 8,
        padding: '10px 14px', fontSize: 12, color: busy ? '#64748b' : '#eab308',
        cursor: busy ? 'default' : 'pointer', fontFamily: F,
      }}>
        {busy ? 'Laddar upp…' : '+ Ladda upp bild'}
        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={busy} onChange={async e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setFel(''); setBusy(true)
          try {
            onAdd(await uploadImage(file))
          } catch (err) {
            setFel(err instanceof Error ? err.message : 'Uppladdningen misslyckades')
          } finally {
            setBusy(false)
          }
        }} />
      </label>
    </div>
  )
}

/*
 * Vad bilden föreställer, på just den här platsen.
 *
 * En plats i taget, eftersom beskrivningen hör till sammanhanget: samma foto på
 * startsidan illustrerar salongen, i en artikel om balayage illustrerar det
 * balayage. Det är också så texterna redan lagras.
 *
 * Förklaringen står med varje gång. Det här är ett fält vars nytta är osynlig —
 * ingen ser resultatet på sidan — och utan en mening om varför blir det ifyllt
 * med filnamnet eller inte alls.
 */
function Beskrivning({ post, onStäng, onGåTill }: {
  post: Post
  onStäng: () => void
  onGåTill: (till: { panel: string; sida: string }) => void
}) {
  const { url, plats } = post

  return (
    <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 12, background: '#0f172a', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 72, flexShrink: 0, borderRadius: 6, overflow: 'hidden', background: '#1e293b' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" style={{ width: '100%', display: 'block' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {plats && (
            <p style={{ fontSize: 11, color: '#cbd5e1', fontFamily: F, fontWeight: 700, margin: '0 0 4px' }}>
              {plats.sida} · {plats.namn}
            </p>
          )}
          <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
            Skriv vad bilden föreställer. Syns inte på sidan — berättar för
            Google och skärmläsare vad den visar.
          </p>
        </div>
        <button
          onClick={onStäng}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 16, lineHeight: 1, cursor: 'pointer', fontFamily: F, padding: 0 }}
        >
          ×
        </button>
      </div>

      {!plats && (
        <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, margin: 0, lineHeight: 1.6 }}>
          Bilden ligger inte ute på sajten. Lägg in den någonstans först, så går
          det att beskriva den.
        </p>
      )}

      {plats && !plats.sättAlt && (
        <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, margin: 0, lineHeight: 1.6 }}>
          Den här beskrivs redan av sitt sammanhang — loggan av företagsnamnet,
          en personalbild av personens namn.
        </p>
      )}

      {plats?.sättAlt && (
        <label style={{ display: 'block' }}>
          <span style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ flex: 1, fontSize: 11, color: '#cbd5e1', fontFamily: F, fontWeight: 600 }}>
              Bildbeskrivning
            </span>
            <span style={{ fontSize: 10, color: '#475569', fontFamily: F }}>
              {plats.alt.length}/{MAX_ALT}
            </span>
          </span>
          <input
            type="text"
            value={plats.alt}
            maxLength={MAX_ALT}
            onChange={e => plats.sättAlt?.(e.target.value)}
            placeholder="T.ex. Ljus balayage i axellångt hår, sett bakifrån"
            style={{
              width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
              padding: '8px 10px', fontSize: 12, color: '#f1f5f9', fontFamily: F, outline: 'none',
            }}
          />
        </label>
      )}

      {plats && (
        <button
          onClick={() => onGåTill(plats.till)}
          style={{
            alignSelf: 'flex-start', fontSize: 11, fontWeight: 600, fontFamily: F,
            padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
            background: 'none', border: '1px solid #334155', color: '#eab308',
          }}
        >
          Gå till bilden →
        </button>
      )}
    </div>
  )
}
