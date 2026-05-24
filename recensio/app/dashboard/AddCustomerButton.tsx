'use client'
import { useState } from 'react'

export default function AddCustomerButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [platform, setPlatform] = useState('google')
  const [schedDate, setSchedDate] = useState(() => {
    const d = new Date(Date.now() + 3600 * 1000)
    return d.toISOString().slice(0, 10)
  })
  const [schedTime, setSchedTime] = useState(() => {
    const d = new Date(Date.now() + 3600 * 1000)
    return d.toTimeString().slice(0, 5)
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const delayHours = Math.max(0, (new Date(`${schedDate}T${schedTime}`).getTime() - Date.now()) / 3600000)
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, platform, delay_hours: delayHours }),
    })
    setSaving(false)
    setDone(true)
    setTimeout(() => {
      setOpen(false)
      setDone(false)
      setName(''); setPhone(''); setPlatform('google')
      // Refresha PendingList
      window.location.reload()
    }, 1200)
  }

  function close() {
    setOpen(false)
    setName(''); setPhone(''); setPlatform('google'); setDone(false)
    const d = new Date(Date.now() + 3600 * 1000)
    setSchedDate(d.toISOString().slice(0, 10))
    setSchedTime(d.toTimeString().slice(0, 5))
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ background: '#1a3d2b', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
      >
        + Lägg till kund
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) close() }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,.18)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '1.1rem 1.25rem .9rem', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.1rem', color: '#0e1410' }}>Lägg till kund</div>
              <button onClick={close} style={{ background: '#f7f3ec', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: 'pointer', color: '#5c5445' }}>✕</button>
            </div>

            {done ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: '.5rem' }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#15803d' }}>Kund tillagd!</div>
                <div style={{ fontSize: 12, color: '#9c9285', marginTop: '.25rem' }}>SMS schemaläggs automatiskt.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: '1.1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                <div>
                  <label style={lbl}>Namn *</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="Anna Lindgren" required style={inp}
                  />
                </div>
                <div>
                  <label style={lbl}>Telefonnummer *</label>
                  <input
                    value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="070-123 45 67" required style={inp}
                  />
                </div>
                <div>
                  <label style={lbl}>Plattform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="google">Google</option>
                    <option value="reco">Reco.se</option>
                    <option value="hittaproffs">Hittaproffs</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lbl}>Datum</label>
                    <input
                      type="date"
                      value={schedDate}
                      onChange={e => setSchedDate(e.target.value)}
                      required
                      style={inp}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Klockslag</label>
                    <input
                      type="time"
                      value={schedTime}
                      onChange={e => setSchedTime(e.target.value)}
                      required
                      style={inp}
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={saving}
                  style={{ background: '#1a3d2b', color: '#fff', border: 'none', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: '.25rem' }}
                >
                  {saving ? 'Sparar...' : 'Lägg till kund →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500, color: '#9c9285',
  marginBottom: '.3rem', textTransform: 'uppercase', letterSpacing: '.04em',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#f7f3ec', border: '1px solid #e5dfd4',
  borderRadius: 8, fontFamily: 'inherit', fontSize: 13, color: '#0e1410', outline: 'none',
}
