'use client'
import { useState, useEffect } from 'react'

export default function KopplingarPage() {
  return (
    <>
      <div style={card}>
        <div style={cardTitle}>Manuell kundläggning</div>
        <IntRow name="✍️ Lägg till en i taget" sub="Under fliken Kundhistorik" right={<span style={{ fontSize: 11, color: '#2e6649', fontWeight: 500 }}>Alltid aktiv</span>} />
        <IntRow name="📁 CSV-import" sub="Kolumner: namn, telefon, plattform" right={<ConnBtn>Importera fil</ConnBtn>} last />
      </div>

      <div style={card}>
        <div style={cardTitle}>Affärssystem och kalender</div>
        <IntRow name="📅 Google Kalender" sub="OAuth2-integration" right={<ConnBtn>Anslut</ConnBtn>} />
        <IntRow name="📆 Outlook" sub="Trigger: möte slutar" right={<ConnBtn>Anslut</ConnBtn>} />
        <IntRow name="🔧 Hantverksdata" sub="Trigger: jobb avslutat" right={<ConnBtn>Anslut</ConnBtn>} />
        <IntRow name="⚡ Annat system" sub="5 000+ appar tillgängliga" right={<ConnBtn>Bläddra</ConnBtn>} last />
      </div>

      <div style={card}>
        <div style={cardTitle}>Direkt API</div>
        <div style={{ background: '#f7f3ec', borderRadius: 8, padding: '.65rem .85rem', fontFamily: 'monospace', fontSize: 11, color: '#5c5445', marginBottom: '.4rem' }}>
          POST api.recensio.se/v1/trigger/[company-id]
        </div>
        <p style={{ fontSize: 12, color: '#9c9285', marginTop: '.5rem' }}>
          Skicka <code>Authorization: Bearer [api-key]</code> och body med <code>name</code>, <code>phone</code>.
        </p>
      </div>

      <DiscountSection />
    </>
  )
}

function DiscountSection() {
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [connected, setConnected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/integrations/discount')
      .then(r => r.json())
      .then(d => { setUrl(d.url ?? ''); setConnected(d.connected) })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setStatus('idle')
    const res = await fetch('/api/integrations/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, api_key: apiKey }),
    })
    setSaving(false)
    if (res.ok) { setStatus('saved'); setConnected(true); setApiKey('') }
    else setStatus('error')
  }

  async function remove() {
    if (!confirm('Ta bort rabattkods-integrationen?')) return
    setRemoving(true)
    await fetch('/api/integrations/discount', { method: 'DELETE' })
    setConnected(false); setUrl(''); setRemoving(false)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
        <div style={cardTitle}>🎟 Rabattkoder</div>
        {connected && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '2px 9px', borderRadius: 999 }}>● Ansluten</span>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#9c9285', marginBottom: '1rem', lineHeight: 1.6 }}>
        Koppla ditt rabattkodssystem så att unika koder hämtas automatiskt vid utskick.
        Använd <code style={{ background: '#f7f3ec', padding: '1px 5px', borderRadius: 4 }}>{'{rabattkod}'}</code> i kampanjmallen — koden ersätts med en riktig kod från ditt system.
      </p>

      <div style={{ background: '#f7f3ec', borderRadius: 8, padding: '.65rem .85rem', fontFamily: 'monospace', fontSize: 11, color: '#5c5445', marginBottom: '1rem' }}>
        {'// Ditt API ska returnera:'}<br />
        {'{ "code": "SOMMAR20" }'}
      </div>

      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        <div>
          <label style={lbl}>API-adress</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://ditt-system.se/api/discount-code"
            required
            style={inp}
          />
        </div>
        <div>
          <label style={lbl}>API-nyckel {connected && <span style={{ color: '#9c9285', fontWeight: 400 }}>(lämna tom för att behålla befintlig)</span>}</label>
          <input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            type="password"
            placeholder={connected ? '••••••••' : 'Bearer-token eller API-nyckel'}
            required={!connected}
            style={inp}
          />
        </div>

        {status === 'saved' && <div style={{ fontSize: 12, color: '#15803d', fontWeight: 500 }}>✓ Integrationen sparad</div>}
        {status === 'error' && <div style={{ fontSize: 12, color: '#dc2626' }}>Något gick fel, kontrollera URL och nyckel.</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: '.25rem' }}>
          <button type="submit" disabled={saving} style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }}>
            {saving ? 'Sparar...' : connected ? 'Uppdatera' : 'Anslut'}
          </button>
          {connected && (
            <button type="button" onClick={remove} disabled={removing} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', background: 'none', color: '#dc2626', border: '1px solid #f5c6c0' }}>
              {removing ? '...' : 'Ta bort'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function IntRow({ name, sub, right, last }: { name: string; sub: string; right: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.6rem 0', borderBottom: last ? 'none' : '1px solid #f0ece6' }}>
      <div>
        <div style={{ fontSize: 13, color: '#0e1410' }}>{name}</div>
        <div style={{ fontSize: 11, color: '#9c9285', marginTop: 1 }}>{sub}</div>
      </div>
      {right}
    </div>
  )
}

function ConnBtn({ children }: { children: React.ReactNode }) {
  return (
    <button style={{ fontSize: 11, color: '#2e6649', background: '#deeae3', border: '1px solid #c2d9cb', borderRadius: 5, padding: '3px 11px', cursor: 'pointer', fontFamily: 'inherit' }}>
      {children}
    </button>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem', marginBottom: '1.1rem' }
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '.85rem' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#9c9285', marginBottom: '.25rem', textTransform: 'uppercase', letterSpacing: '.04em' }
const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', background: '#f7f3ec', border: '1px solid #e5dfd4', borderRadius: 7, fontFamily: 'inherit', fontSize: 12, color: '#0e1410', outline: 'none' }
