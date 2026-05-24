'use client'
import { useState, useEffect } from 'react'

export default function InstallningarPage() {
  const [name, setName] = useState('')
  const [smsSender, setSmsSender] = useState('Recensio')
  const [googlePlaceId, setGooglePlaceId] = useState('')
  const [recoUrl, setRecoUrl] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sms_sender: smsSender, google_place_id: googlePlaceId, reco_url: recoUrl }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.5rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '1.25rem' }}>Företagsinställningar</div>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Företagsnamn">
            <input value={name} onChange={e => setName(e.target.value)} style={inStyle} placeholder="Ditt företag AB" />
          </Field>
          <Field label="SMS-avsändare (max 11 tecken)">
            <input value={smsSender} onChange={e => setSmsSender(e.target.value)} maxLength={11} style={inStyle} />
          </Field>
          <Field label="Google Place ID">
            <input value={googlePlaceId} onChange={e => setGooglePlaceId(e.target.value)} style={inStyle} placeholder="ChIJ..." />
          </Field>
          <Field label="Reco.se-länk">
            <input value={recoUrl} onChange={e => setRecoUrl(e.target.value)} style={inStyle} placeholder="https://reco.se/foretag/..." />
          </Field>
          <button type="submit" style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }}>
            {saved ? 'Sparat ✓' : 'Spara ändringar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5c5445', marginBottom: '.3rem' }}>{label}</label>
      {children}
    </div>
  )
}

const inStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: '#f7f3ec', border: '1px solid #e5dfd4',
  borderRadius: 8, fontFamily: 'inherit', fontSize: 14, color: '#0e1410', outline: 'none',
}
