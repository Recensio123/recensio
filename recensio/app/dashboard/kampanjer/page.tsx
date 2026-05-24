'use client'
import { useState, useEffect } from 'react'

type Campaign = {
  id: string; name: string; template: string; timing_hours: number
  timing_after: string; neg_filter: boolean; active: boolean
}

export default function KampanjerPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTemplate, setNewTemplate] = useState('Hej {förnamn}! Tack för att du anlitade {företag}. Nöjd med jobbet? 30 sek 🙏\n\n→ recensio.se/r/{kod}')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCampaigns() }, [])

  async function fetchCampaigns() {
    const res = await fetch('/api/campaigns')
    if (res.ok) setCampaigns(await res.json())
    setLoading(false)
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, template: newTemplate }),
    })
    setNewName(''); setSaving(false); setShowNew(false)
    fetchCampaigns()
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    fetchCampaigns()
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Ta bort kampanj?')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    fetchCampaigns()
  }

  return (
    <>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem', marginBottom: '1.1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '.85rem', display: 'flex', justifyContent: 'space-between' }}>
          Kampanjer
          <button onClick={() => setShowNew(v => !v)} style={{ fontSize: 11, color: '#4d8c68', background: 'none', border: 'none', cursor: 'pointer' }}>+ Ny kampanj</button>
        </div>

        {showNew && (
          <form onSubmit={createCampaign} style={{ marginBottom: '1rem', padding: '1rem', background: '#f7f3ec', borderRadius: 10 }}>
            <div style={{ marginBottom: '.6rem' }}>
              <label style={lblStyle}>Namn</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} style={inStyle} required placeholder="Kampanjnamn" />
            </div>
            <div style={{ marginBottom: '.6rem' }}>
              <label style={lblStyle}>Mall</label>
              <textarea value={newTemplate} onChange={e => setNewTemplate(e.target.value)} style={{ ...inStyle, minHeight: 80, resize: 'vertical' }} required />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 7, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }}>
                {saving ? '...' : 'Spara'}
              </button>
              <button type="button" onClick={() => setShowNew(false)} style={{ fontSize: 11, padding: '4px 11px', borderRadius: 7, cursor: 'pointer', background: 'none', color: '#9c9285', border: '1px solid #e5dfd4' }}>
                Avbryt
              </button>
            </div>
          </form>
        )}

        {loading ? <p style={{ fontSize: 12, color: '#9c9285' }}>Laddar...</p> : campaigns.map(c => (
          <div key={c.id} style={{ border: '1px solid #e5dfd4', borderRadius: 10, padding: '.9rem', marginBottom: '.6rem', background: '#f7f3ec' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#9c9285', marginTop: 2 }}>
                  {c.timing_hours}h efter jobb · {c.neg_filter ? 'Negativt filter på' : 'Inget filter'}
                </div>
              </div>
              <button onClick={() => toggleActive(c.id, c.active)} style={{
                width: 34, height: 18, borderRadius: 9, position: 'relative', cursor: 'pointer',
                border: 'none', background: c.active ? '#2e6649' : '#e5dfd4', flexShrink: 0, transition: 'background .2s',
              }}>
                <span style={{ position: 'absolute', top: 2, left: c.active ? 16 : 2, width: 14, height: 14, background: '#fff', borderRadius: '50%', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.15)' }} />
              </button>
              <button onClick={() => deleteCampaign(c.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', background: 'none', color: '#c0392b', border: '1px solid #f5c6c0' }}>
                Ta bort
              </button>
            </div>
            <div style={{ marginTop: '.75rem', background: '#fff', borderRadius: 9, padding: '.7rem .9rem', fontSize: 12, color: '#0e1410', lineHeight: 1.65 }}>
              {c.template}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

const lblStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#9c9285', marginBottom: '.25rem', textTransform: 'uppercase', letterSpacing: '.04em' }
const inStyle: React.CSSProperties = { width: '100%', padding: '8px 11px', background: '#fff', border: '1px solid #e5dfd4', borderRadius: 7, fontFamily: 'inherit', fontSize: 12, color: '#0e1410', outline: 'none' }
