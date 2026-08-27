'use client'

import { useState } from 'react'

/*
 * Ett riktigt utskick till ett nummer eller en adress du väljer.
 *
 * Skiljer sig från proven ovanför på det enda sätt som betyder något: de
 * kontrollerar reglerna, det här kontrollerar leveransen. Nyckel, avsändare,
 * domänverifiering och operatörens filter syns först när ett meddelande
 * faktiskt lämnar servern.
 *
 * Leverantörens skäl skrivs ut orört. Ett fel som översatts till "något gick
 * fel" är ett fel man får felsöka två gånger.
 */

type Svar = {
  ok?: boolean
  skäl?: string
  error?: string
  avsandare?: string
  segment?: number
  tecken?: number
  id?: string
}

const F = 'var(--font-brand-sans)'

const fält: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#0b1220', border: '1px solid #1e293b', borderRadius: 9,
  padding: '9px 12px', fontSize: 13, color: '#e2e8f0', fontFamily: F,
}

const etikett: React.CSSProperties = {
  display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600,
}

export function Utskickstest({ smsKlart, mailKlart }: { smsKlart: boolean; mailKlart: boolean }) {
  const [kanal, setKanal]         = useState<'sms' | 'epost'>('sms')
  const [till, setTill]           = useState('')
  const [avsandare, setAvsandare] = useState('Kiterank')
  const [kör, setKör]             = useState(false)
  const [svar, setSvar]           = useState<Svar | null>(null)

  const redo = kanal === 'sms' ? smsKlart : mailKlart

  async function skicka() {
    if (!till.trim() || kör) return
    setKör(true)
    setSvar(null)
    try {
      const r = await fetch('/api/admin/utskickstest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ kanal, till, avsandare }),
      })
      setSvar(await r.json())
    } catch (e) {
      setSvar({ ok: false, skäl: e instanceof Error ? e.message : 'nådde inte servern' })
    } finally {
      setKör(false)
    }
  }

  return (
    <div style={{ marginTop: 34, fontFamily: F }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Testutskick</h2>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 16px' }}>
        Skickar på riktigt till numret eller adressen du skriver in. Ett SMS kostar
        vad ett SMS kostar — men ett prov som stannar i koden säger ingenting om
        huruvida meddelandet kommer fram.
      </p>

      <div style={{
        border: '1px solid #1e293b', borderRadius: 12, background: '#0f172a', padding: 16,
      }}>
        {/* Kanalvalet. Två knappar i stället för en meny — det är två val och
            de ska synas båda två. */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
          {([['sms', 'SMS'], ['epost', 'E-post']] as const).map(([id, namn]) => {
            const vald = kanal === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setKanal(id); setSvar(null) }}
                style={{
                  padding: '7px 15px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: F,
                  border: `1px solid ${vald ? '#334155' : '#1e293b'}`,
                  background: vald ? '#1e293b' : 'transparent',
                  color: vald ? '#f1f5f9' : '#64748b',
                }}
              >
                {namn}
              </button>
            )
          })}
        </div>

        {/* Saknas nycklarna sägs det innan man skrivit in ett nummer, inte
            efteråt som ett fel. */}
        {!redo && (
          <div style={{
            borderRadius: 9, padding: '10px 13px', marginBottom: 14,
            border: '1px solid rgba(234,179,8,0.35)', background: 'rgba(234,179,8,0.07)',
            fontSize: 12.5, color: '#fde68a', lineHeight: 1.65,
          }}>
            {kanal === 'sms'
              ? <>Nycklarna saknas. Fyll i <code>SMS_API_USERNAME</code> och <code>SMS_API_PASSWORD</code> i <code>.env.local</code> och starta om servern.</>
              : <>Nycklarna saknas. Fyll i <code>RESEND_API_KEY</code> och <code>MAIL_FROM</code> i <code>.env.local</code> och starta om servern. Adressen i <code>MAIL_FROM</code> måste ligga på en domän som är verifierad hos Resend.</>}
          </div>
        )}

        {/* Avsändaren gäller båda kanalerna. Den var länge bara SMS, vilket gav
            fel intryck: mejlet ser ut att alltid komma från oss, medan det i
            skarpt läge bär salongens namn precis som SMS:et. */}
        <div style={{ display: 'grid', gap: 13, gridTemplateColumns: '1fr 190px' }}>
          <div>
            <label style={etikett} htmlFor="ut-till">
              {kanal === 'sms' ? 'Mobilnummer' : 'E-postadress'}
            </label>
            <input
              id="ut-till"
              style={fält}
              value={till}
              onChange={e => setTill(e.target.value)}
              placeholder={kanal === 'sms' ? '070-123 45 67' : 'du@exempel.se'}
              inputMode={kanal === 'sms' ? 'tel' : 'email'}
            />
          </div>

          <div>
            <label style={etikett} htmlFor="ut-avs">Avsändarnamn</label>
            <input
              id="ut-avs"
              style={fält}
              value={avsandare}
              onChange={e => setAvsandare(e.target.value)}
              maxLength={60}
              placeholder="Studio Söder"
            />
          </div>
        </div>

        <p style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.65, margin: '9px 0 0' }}>
          {kanal === 'sms'
            ? <>Namnet kortas till elva tecken utan specialtecken — GSM-standardens gräns, inte vår. Skriv en salongs namn här för att se exakt vad deras kunder får i telefonen.</>
            : <>Mejlhuvudet har ingen längdgräns, så namnet står som det stavas. Skriv en salongs namn här för att se exakt vad som hamnar i kundens inkorg.</>}
        </p>

        <button
          type="button"
          onClick={skicka}
          disabled={kör || !till.trim()}
          style={{
            marginTop: 15, padding: '9px 18px', borderRadius: 9, border: 'none',
            fontSize: 13.5, fontWeight: 700, fontFamily: F,
            cursor: kör || !till.trim() ? 'not-allowed' : 'pointer',
            background: kör || !till.trim() ? '#1e293b' : '#eab308',
            color:      kör || !till.trim() ? '#475569' : '#0f172a',
          }}
        >
          {kör ? 'Skickar…' : kanal === 'sms' ? 'Skicka test-SMS' : 'Skicka testmejl'}
        </button>

        {svar && (
          <div style={{
            marginTop: 15, borderRadius: 9, padding: '12px 14px',
            border: `1px solid ${svar.ok ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`,
            background: svar.ok ? 'rgba(74,222,128,0.07)' : 'rgba(239,68,68,0.07)',
          }}>
            <p style={{
              margin: 0, fontSize: 13.5, fontWeight: 700,
              color: svar.ok ? '#86efac' : '#fca5a5',
            }}>
              {svar.ok
                ? 'Avsänt. Leverantören tog emot det.'
                : 'Gick inte fram.'}
            </p>

            {(svar.skäl || svar.error) && (
              <p style={{ margin: '7px 0 0', fontSize: 12.5, color: '#94a3b8', lineHeight: 1.65 }}>
                {svar.skäl ?? svar.error}
              </p>
            )}

            {/* Det som avgör om utskicket ser rätt ut för mottagaren, och vad
                det kostar när det går ut till hundra personer. */}
            {svar.ok && svar.avsandare && (
              <p style={{ margin: '7px 0 0', fontSize: 12.5, color: '#94a3b8', lineHeight: 1.65 }}>
                Avsändare: <strong style={{ color: '#cbd5e1' }}>{svar.avsandare}</strong>
                {svar.segment != null && <> · {svar.tecken} tecken, {svar.segment} SMS</>}
                {svar.id && <> · id {svar.id}</>}
              </p>
            )}

            {svar.ok && (
              <p style={{ margin: '7px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.65 }}>
                Att leverantören tog emot det betyder inte att det landat. Titta i
                telefonen respektive inkorgen — och i skräpposten, som är där ett
                mejl från en ny domän hamnar först.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
