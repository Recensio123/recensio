'use client'
import { useState, useEffect } from 'react'

type Settings = {
  name: string
  sms_sender: string
  google_place_id: string
  reco_url: string
  hitta_url: string
  facebook_url: string
  tripadvisor_url: string
}

const PLATFORMS = [
  {
    key: 'google_place_id' as keyof Settings,
    label: 'Google',
    icon: '🔵',
    placeholder: 'ChIJ...',
    hint: 'Hitta ditt Place ID på Google Maps. Sök ditt företag → dela → kopiera ID:t ur länken.',
    isPlaceId: true,
  },
  {
    key: 'reco_url' as keyof Settings,
    label: 'Reco',
    icon: '🟢',
    placeholder: 'https://reco.se/foretag/...',
    hint: 'Klistra in länken till din Reco-sida.',
  },
  {
    key: 'hitta_url' as keyof Settings,
    label: 'Hittaproffs',
    icon: '🟡',
    placeholder: 'https://www.hittaproffs.se/...',
    hint: 'Klistra in länken till din Hittaproffs-profil.',
  },
  {
    key: 'facebook_url' as keyof Settings,
    label: 'Facebook',
    icon: '🔷',
    placeholder: 'https://www.facebook.com/...',
    hint: 'Klistra in länken till din Facebook-sida.',
  },
  {
    key: 'tripadvisor_url' as keyof Settings,
    label: 'TripAdvisor',
    icon: '🟤',
    placeholder: 'https://www.tripadvisor.se/...',
    hint: 'Klistra in länken till din TripAdvisor-profil.',
  },
]

export default function InstallningarPage() {
  const [fields, setFields] = useState<Settings>({
    name: '', sms_sender: '', google_place_id: '',
    reco_url: '', hitta_url: '', facebook_url: '', tripadvisor_url: '',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setFields({
          name: d.name ?? '',
          sms_sender: d.sms_sender ?? '',
          google_place_id: d.google_place_id ?? '',
          reco_url: d.reco_url ?? '',
          hitta_url: d.hitta_url ?? '',
          facebook_url: d.facebook_url ?? '',
          tripadvisor_url: d.tripadvisor_url ?? '',
        })
        setLoading(false)
      })
  }, [])

  function set(key: keyof Settings, val: string) {
    setFields(f => ({ ...f, [key]: val }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fields.name,
        sms_sender: fields.sms_sender,
        google_place_id: fields.google_place_id,
        reco_url: fields.reco_url,
        hitta_url: fields.hitta_url,
        facebook_url: fields.facebook_url,
        tripadvisor_url: fields.tripadvisor_url,
      }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <p style={{ fontSize: 12, color: '#9c9285' }}>Laddar...</p>

  return (
    <form onSubmit={save} style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Företagsinformation */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>Företagsinformation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Företagsnamn">
            <input value={fields.name} onChange={e => set('name', e.target.value)} style={inStyle} placeholder="Ditt företag AB" />
          </Field>
          <Field label="SMS-avsändare (max 11 tecken)">
            <input value={fields.sms_sender} onChange={e => set('sms_sender', e.target.value)} maxLength={11} style={inStyle} />
          </Field>
        </div>
      </div>

      {/* Recensionssidor */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>Recensionssidor</div>
        <p style={{ fontSize: 12, color: '#9c9285', marginTop: 0, marginBottom: '1rem', lineHeight: 1.5 }}>
          Koppla de plattformar du använder. Kopplade sidor visas som snabbknappar när du svarar på recensioner.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PLATFORMS.map(p => {
            const val = fields[p.key]
            const connected = val.trim() !== ''
            return (
              <div key={p.key} style={{ borderRadius: 10, border: `1px solid ${connected ? '#c8e6d4' : '#e5dfd4'}`, background: connected ? '#f5fbf7' : '#fafaf8', padding: '.75rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.5rem' }}>
                  <span style={{ fontSize: 15 }}>{p.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0e1410' }}>{p.label}</span>
                  {connected && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#deeae3', color: '#2e6649', marginLeft: 'auto' }}>
                      Kopplad ✓
                    </span>
                  )}
                </div>
                <input
                  value={val}
                  onChange={e => set(p.key, e.target.value)}
                  placeholder={p.placeholder}
                  style={{ ...inStyle, fontSize: 12 }}
                />
                <div style={{ fontSize: 11, color: '#9c9285', marginTop: '.35rem' }}>{p.hint}</div>
              </div>
            )
          })}
        </div>
      </div>

      <button type="submit" style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }}>
        {saved ? 'Sparat ✓' : 'Spara ändringar'}
      </button>
    </form>
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

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.25rem 1.5rem',
}
const cardTitleStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '1rem',
}
const inStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#f7f3ec', border: '1px solid #e5dfd4',
  borderRadius: 8, fontFamily: 'inherit', fontSize: 14, color: '#0e1410', outline: 'none', boxSizing: 'border-box',
}
