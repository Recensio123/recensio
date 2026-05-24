'use client'
import { useState, useEffect } from 'react'

type Campaign = {
  id: string; name: string; template: string; timing_hours: number
  timing_after: string; neg_filter: boolean; active: boolean
}

const TIMING_OPTIONS = [
  { label: '1 timme',  sub: 'Bäst svar',  hours: 1 },
  { label: '4 timmar', sub: 'Populärast', hours: 4 },
  { label: '24 timmar', sub: '',          hours: 24 },
  { label: '48 timmar', sub: '',          hours: 48 },
]

const CAMP_TIMING = ['30min','1h','4h','24h','48h','90min']

export default function KampanjerPage() {
  const [campaigns, setCampaigns]       = useState<Campaign[]>([])
  const [loading, setLoading]           = useState(true)
  const [selectedTiming, setSelectedTiming] = useState(1)
  const [smsTemplate, setSmsTemplate]   = useState('Hej {förnamn}! Tack för att du anlitade {företag}. Nöjd med jobbet? 30 sek 🙏')
  const [showNew, setShowNew]           = useState(false)
  const [newName, setNewName]           = useState('')
  const [newTemplate, setNewTemplate]   = useState('Hej {förnamn}! Tack för att du anlitade {företag}. Nöjd med jobbet? 30 sek 🙏\n\n→ recensio.se/r/{kod}')
  const [saving, setSaving]             = useState(false)
  const [newTiming, setNewTiming]       = useState('1h')
  const [newNegFilter, setNewNegFilter] = useState(true)
  const [editingId, setEditingId]       = useState<string | null>(null)

  // per-campaign edit state
  const [editName, setEditName]         = useState('')
  const [editTiming, setEditTiming]     = useState('1h')
  const [editTemplate, setEditTemplate] = useState('')
  const [editNegFilter, setEditNegFilter] = useState(true)
  const [editSaving, setEditSaving]     = useState(false)
  const [companyName, setCompanyName]   = useState('ditt företag')

  useEffect(() => { fetchCampaigns(); fetchCompanyName() }, [])

  async function fetchCompanyName() {
    const res = await fetch('/api/settings')
    if (res.ok) {
      const data = await res.json()
      if (data.name) setCompanyName(data.name)
    }
  }

  async function fetchCampaigns() {
    const res = await fetch('/api/campaigns')
    if (res.ok) setCampaigns(await res.json())
    setLoading(false)
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id)
    setEditName(c.name)
    setEditNegFilter(c.neg_filter)
    setEditTemplate(c.template)
    // convert hours back to label
    const h = c.timing_hours
    if (h < 1) setEditTiming('30min')
    else if (h === 1) setEditTiming('1h')
    else if (h === 1.5) setEditTiming('90min')
    else setEditTiming(`${h}h`)
  }

  function timingToHours(t: string): number {
    if (t === '30min') return 0.5
    if (t === '90min') return 1.5
    return parseFloat(t.replace('h',''))
  }

  async function saveCampaign(id: string) {
    setEditSaving(true)
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        template: editTemplate,
        timing_hours: timingToHours(editTiming),
        neg_filter: editNegFilter,
      }),
    })
    setEditingId(null)
    setEditSaving(false)
    fetchCampaigns()
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        template: newTemplate,
        timing_hours: timingToHours(newTiming),
        neg_filter: newNegFilter,
      }),
    })
    setNewName('')
    setNewTiming('1h')
    setNewNegFilter(true)
    setSaving(false)
    setShowNew(false)
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
    if (editingId === id) setEditingId(null)
    fetchCampaigns()
  }

  function timingLabel(h: number) {
    if (h < 1) return '30min'
    if (h === 1.5) return '90min'
    if (h < 24) return `${h}h`
    return `${h / 24}d`
  }

  const preview = smsTemplate
    .replace(/\{förnamn\}/g, 'Anna')
    .replace(/\{företag\}/g, companyName)

  return (
    <>
      {/* Standard SMS-timing */}
      <div style={card}>
        <div style={cardTitle}>Standard SMS-timing</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: '.5rem' }}>
          {TIMING_OPTIONS.map(opt => (
            <div
              key={opt.hours}
              onClick={() => setSelectedTiming(opt.hours)}
              style={{
                border: `1px solid ${selectedTiming === opt.hours ? '#2e6649' : '#e5dfd4'}`,
                borderRadius: 9, padding: '.5rem', textAlign: 'center', cursor: 'pointer',
                background: selectedTiming === opt.hours ? '#deeae3' : '#fff',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0e1410' }}>{opt.label}</div>
              {opt.sub && <div style={{ fontSize: 10, color: '#9c9285', marginTop: 2 }}>{opt.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Standard SMS-mall */}
      <div style={card}>
        <div style={cardTitle}>Standard SMS-mall</div>
        <textarea
          value={smsTemplate}
          onChange={e => setSmsTemplate(e.target.value)}
          style={{ width: '100%', fontSize: 13, minHeight: 64, resize: 'none', border: '1px solid #e5dfd4', borderRadius: 9, padding: 9, background: '#f7f3ec', color: '#0e1410', outline: 'none', fontFamily: 'inherit', marginTop: '.5rem' }}
        />
        <div style={{ background: '#f7f3ec', borderRadius: 9, padding: '.85rem', marginTop: '.75rem' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9c9285', fontWeight: 600, marginBottom: '.4rem' }}>Förhandsvisning</div>
          <div style={{ background: '#fff', borderRadius: '12px 12px 12px 3px', padding: '.7rem .9rem', fontSize: 12, color: '#0e1410', lineHeight: 1.65, display: 'inline-block', maxWidth: '100%', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
            {preview}<br />
            <span style={{ color: '#2e6649' }}>→ recensio.se/r/abc123</span>
          </div>
        </div>
      </div>

      {/* Kampanjer */}
      <div style={card}>
        <div style={{ ...cardTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Kampanjer
          <button onClick={() => setShowNew(v => !v)} style={{ fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#0e1410', border: '1px solid #e5dfd4' }}>
            + Ny kampanj
          </button>
        </div>

        {showNew && (
          <form onSubmit={createCampaign} style={{ marginTop: '.75rem', marginBottom: '.5rem', padding: '1rem', background: '#f7f3ec', borderRadius: 10, border: '1px solid #e5dfd4' }}>
            <div style={{ marginBottom: '.6rem' }}>
              <label style={lblStyle}>Namn</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} style={inStyle} required placeholder="Kampanjnamn" />
            </div>
            <div style={{ marginBottom: '.6rem' }}>
              <label style={lblStyle}>Timing</label>
              <select value={newTiming} onChange={e => setNewTiming(e.target.value)} style={{ ...inStyle, cursor: 'pointer' }}>
                {CAMP_TIMING.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '.6rem' }}>
              <label style={lblStyle}>Meddelandemall</label>
              <textarea value={newTemplate} onChange={e => setNewTemplate(e.target.value)} style={{ ...inStyle, minHeight: 80, resize: 'vertical' }} required />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem', padding: '.6rem .75rem', background: '#fff', borderRadius: 8, border: '1px solid #e5dfd4' }}>
              <label style={{ fontSize: 12, color: '#5c5445' }}>Negativt filter (under 4 stjärnor → privat)</label>
              <button
                type="button"
                onClick={() => setNewNegFilter(v => !v)}
                style={{ width: 34, height: 18, borderRadius: 9, position: 'relative', cursor: 'pointer', border: 'none', background: newNegFilter ? '#2e6649' : '#e5dfd4', flexShrink: 0, transition: 'background .2s' }}
              >
                <span style={{ position: 'absolute', top: 2, left: newNegFilter ? 16 : 2, width: 14, height: 14, background: '#fff', borderRadius: '50%', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.15)', display: 'block' }} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }}>
                {saving ? '...' : 'Spara'}
              </button>
              <button type="button" onClick={() => setShowNew(false)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', background: 'none', color: '#9c9285', border: '1px solid #e5dfd4' }}>
                Avbryt
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p style={{ fontSize: 12, color: '#9c9285', marginTop: '.5rem' }}>Laddar...</p>
        ) : campaigns.map(c => (
          <div key={c.id} style={{ border: '1px solid #e5dfd4', borderRadius: 10, marginTop: '.6rem', background: '#f7f3ec', overflow: 'hidden' }}>

            {/* Card header */}
            <div style={{ padding: '.75rem 1rem', background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Toggle */}
              <button
                onClick={() => toggleActive(c.id, c.active)}
                style={{ width: 34, height: 18, borderRadius: 9, position: 'relative', cursor: 'pointer', border: 'none', background: c.active ? '#2e6649' : '#e5dfd4', flexShrink: 0, transition: 'background .2s' }}
              >
                <span style={{ position: 'absolute', top: 2, left: c.active ? 16 : 2, width: 14, height: 14, background: '#fff', borderRadius: '50%', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.15)', display: 'block' }} />
              </button>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#9c9285', marginTop: 2 }}>
                  Timing: {timingLabel(c.timing_hours)} · Negativt filter: {c.neg_filter ? 'På' : 'Av'} · {c.active ? 'Aktiv' : 'Pausad'}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => editingId === c.id ? setEditingId(null) : openEdit(c)}
                  style={btnEdit}
                >
                  ✏ Redigera
                </button>
                <button onClick={() => deleteCampaign(c.id)} style={btnDel}>🗑 Ta bort</button>
              </div>
            </div>

            {/* Inline edit panel */}
            {editingId === c.id && (
              <div style={{ padding: '1rem', borderTop: '1px solid #e5dfd4' }}>

                <div style={{ marginBottom: '.6rem' }}>
                  <label style={lblStyle}>Namn</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={inStyle} />
                </div>

                <div style={{ marginBottom: '.6rem' }}>
                  <label style={lblStyle}>Timing</label>
                  <select
                    value={editTiming}
                    onChange={e => setEditTiming(e.target.value)}
                    style={{ ...inStyle, cursor: 'pointer' }}
                  >
                    {CAMP_TIMING.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '.6rem' }}>
                  <label style={lblStyle}>Meddelandemall</label>
                  <textarea
                    value={editTemplate}
                    onChange={e => setEditTemplate(e.target.value)}
                    style={{ ...inStyle, minHeight: 80, resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem', padding: '.6rem .75rem', background: '#fff', borderRadius: 8, border: '1px solid #e5dfd4' }}>
                  <label style={{ fontSize: 12, color: '#5c5445' }}>Negativt filter (under 4 stjärnor → privat)</label>
                  <button
                    type="button"
                    onClick={() => setEditNegFilter(v => !v)}
                    style={{ width: 34, height: 18, borderRadius: 9, position: 'relative', cursor: 'pointer', border: 'none', background: editNegFilter ? '#2e6649' : '#e5dfd4', flexShrink: 0, transition: 'background .2s' }}
                  >
                    <span style={{ position: 'absolute', top: 2, left: editNegFilter ? 16 : 2, width: 14, height: 14, background: '#fff', borderRadius: '50%', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.15)', display: 'block' }} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => saveCampaign(c.id)}
                    disabled={editSaving}
                    style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }}
                  >
                    {editSaving ? '...' : 'Spara'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', background: 'none', color: '#9c9285', border: '1px solid #e5dfd4' }}
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem', marginBottom: '1.1rem' }
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#0e1410' }
const lblStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#9c9285', marginBottom: '.25rem', textTransform: 'uppercase', letterSpacing: '.04em' }
const inStyle: React.CSSProperties = { width: '100%', padding: '8px 11px', background: '#fff', border: '1px solid #e5dfd4', borderRadius: 7, fontFamily: 'inherit', fontSize: 12, color: '#0e1410', outline: 'none' }
const btnEdit: React.CSSProperties = { fontSize: 11, padding: '4px 12px', borderRadius: 7, cursor: 'pointer', background: '#fff', color: '#5c5445', border: '1px solid #e5dfd4' }
const btnDel: React.CSSProperties = { fontSize: 11, padding: '4px 12px', borderRadius: 7, cursor: 'pointer', background: '#fff', color: '#c0392b', border: '1px solid #f5c6c0' }
