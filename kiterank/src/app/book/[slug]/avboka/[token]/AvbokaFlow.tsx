'use client'
import { useEffect, useState } from 'react'

/* The page behind the cancellation link. The token in the address is the
 * proof — whoever holds it made the booking, so no login stands in the way.
 * Inside 24 hours the slot is too close to refill, and the page asks them to
 * call instead: the salon gets a voice and a chance to save the hour. */

export type Info = {
  company:      string
  service:      string
  date:         string
  time:         string
  status:       string
  cancellable:  boolean
  cancel_hours: number
}

const MONTHS_SV = ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december']
const DAYS_LONG = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag']

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_SV[d.getMonth()]} ${d.getFullYear()}`
}

export function AvbokaFlow({ slug, token, exempel = null }: {
  slug:  string
  token: string
  /* En färdig bokning i stället för en riktig. Salongen ska kunna se sidan
     deras kunder möter utan att först lägga en påhittad bokning i sin egen
     kalender — den bokningen ligger sedan kvar och stökar i statistiken. */
  exempel?: Info | null
}) {
  const [info,    setInfo]    = useState<Info | null>(exempel)
  const [state,   setState]   = useState<'loading' | 'ready' | 'working' | 'done' | 'missing'>(
    exempel ? 'ready' : 'loading')

  useEffect(() => {
    /* Exempelläget rör aldrig databasen. En förhandsvisning som hämtar en
       riktig bokning kan också avboka en. */
    if (exempel) return
    fetch(`/api/book/${slug}/cancel?token=${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: Info) => {
        setInfo(d)
        setState(d.status === 'cancelled' ? 'done' : 'ready')
      })
      .catch(() => setState('missing'))
  }, [slug, token, exempel])

  async function cancel() {
    /* I exempelläget hoppar knappen rakt till kvittensen. Salongen ska se båda
       skärmarna — den andra är den de aldrig annars får syn på. */
    if (exempel) { setState('done'); return }
    setState('working')
    const res = await fetch(`/api/book/${slug}/cancel`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    setState(res.ok ? 'done' : 'ready')
  }

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: '20px', padding: '28px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '60px 16px' }}>
        {/* Remsan står över kortet och inte under det. Den som öppnar sidan ska
            veta att ingen riktig tid ligger bakom knappen innan de trycker på
            den — inte efteråt. */}
        {exempel && (
          <div style={{
            background: '#111', color: '#fff', borderRadius: '12px',
            padding: '12px 16px', marginBottom: '16px', fontSize: '13px', lineHeight: 1.6,
          }}>
            <strong>Exempel.</strong> Så här ser sidan ut för din kund när de klickar
            på länken i sitt meddelande. Ingen riktig bokning ligger bakom — knappen
            avbokar ingenting.
          </div>
        )}

        {state === 'loading' && (
          <div style={{ ...card, textAlign: 'center', color: '#bbb', fontSize: '14px' }}>Hämtar bokning…</div>
        )}

        {state === 'missing' && (
          <div style={{ ...card, textAlign: 'center' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>Hittar ingen bokning</h1>
            <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
              Länken kan vara felskriven. Kontakta salongen om du vill ändra din tid.
            </p>
          </div>
        )}

        {(state === 'ready' || state === 'working') && info && (
          <div style={card}>
            <p style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', textAlign: 'center', marginBottom: '18px' }}>
              {info.company}
            </p>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111', textAlign: 'center', margin: '0 0 20px' }}>
              Avboka din tid?
            </h1>
            <div style={{ border: '1.5px solid #ebebeb', borderRadius: '14px', padding: '16px 18px', marginBottom: '22px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>{info.service}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>{formatDateLong(info.date)} · kl. {info.time}</div>
            </div>

            {info.cancellable ? (
              <>
                <button
                  onClick={cancel}
                  disabled={state === 'working'}
                  style={{
                    width: '100%', padding: '15px', background: state === 'working' ? '#888' : '#b91c1c',
                    color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px',
                    fontWeight: 600, cursor: state === 'working' ? 'default' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {state === 'working' ? 'Avbokar…' : 'Ja, avboka tiden'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#bbb', marginTop: '12px' }}>
                  Tiden släpps direkt till andra kunder
                </p>
              </>
            ) : (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ fontSize: '14px', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                  {info.cancel_hours > 0
                    ? `Din tid är närmare än ${info.cancel_hours} timmar bort och kan inte avbokas här. Ring salongen så hjälper de dig.`
                    : 'Tiden har redan börjat och kan inte avbokas här. Ring salongen så hjälper de dig.'}
                </p>
              </div>
            )}
          </div>
        )}

        {state === 'done' && (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: '#111',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
            }}>
              <svg width="26" height="26" viewBox="0 0 34 34" fill="none">
                <path d="M7 17l7 7 13-13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>Tiden är avbokad</h1>
            <p style={{ fontSize: '14px', color: '#888', margin: 0, lineHeight: 1.6 }}>
              Välkommen tillbaka när det passar dig{info ? ` — boka en ny tid hos ${info.company} när du vill` : ''}.
            </p>
            <a
              href={`/book/${slug}`}
              style={{
                display: 'inline-block', marginTop: '20px', padding: '12px 28px',
                background: '#111', color: '#fff', borderRadius: '12px',
                fontSize: '14px', fontWeight: 600, textDecoration: 'none',
              }}
            >
              Boka ny tid
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
