'use client'
import { useState, useEffect, useRef } from 'react'

type Customer = {
  id: string; name: string; phone: string; platform: string
  status: string; scheduled_for: string | null; custom_message: string | null
  custom_campaign_id: string | null
}
type Campaign = { id: string; name: string; template: string }

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function fmtTime(d: string) {
  const diff = new Date(d).getTime() - Date.now()
  const m = Math.round(diff / 60000)
  if (m < 60) return `Om ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `Om ${h} tim`
  return `Om ${Math.round(h / 24)} dagar`
}

function fmtDetail(d: string) {
  return new Date(d).toLocaleString('sv-SE', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function groupCustomers(customers: Customer[]) {
  const now = new Date()
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)

  const idag: Customer[] = []
  const vecka: Customer[] = []
  const senare: Customer[] = []

  for (const c of customers) {
    if (!c.scheduled_for) continue
    const t = new Date(c.scheduled_for)
    if (t <= todayEnd) idag.push(c)
    else if (t <= weekEnd) vecka.push(c)
    else senare.push(c)
  }
  return { idag, vecka, senare }
}

export default function PendingList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [defaultTemplate, setDefaultTemplate] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandType, setExpandType] = useState<'kampanj' | 'schema' | 'redigera' | null>(null)

  // per-row state
  const [editMsg, setEditMsg] = useState('')
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [schedDate, setSchedDate] = useState('')
  const [campSel, setCampSel] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [cr, campr, setr] = await Promise.all([
      fetch('/api/customers'),
      fetch('/api/campaigns'),
      fetch('/api/settings'),
    ])
    if (cr.ok) {
      const all: Customer[] = await cr.json()
      setCustomers(all.filter(c => c.status === 'pending'))
    }
    if (campr.ok) setCampaigns(await campr.json())
    if (setr.ok) {
      const s = await setr.json()
      setDefaultTemplate(s.sms_template ?? '')
      setCompanyName(s.name ?? '')
    }
    setLoading(false)
  }

  function toggle(id: string, type: 'kampanj' | 'schema' | 'redigera', c: Customer) {
    if (expandedId === id && expandType === type) {
      setExpandedId(null); setExpandType(null); return
    }
    setExpandedId(id); setExpandType(type)
    if (type === 'redigera') {
      const raw = c.custom_message
        ?? campaigns.find(cp => cp.id === c.custom_campaign_id)?.template
        ?? defaultTemplate
      const firstName = c.name.split(' ')[0]
      const rendered = raw
        .replace(/\{förnamn\}/g, firstName)
        .replace(/\{företag\}/g, companyName)
        .replace(/\{kod\}/g, 'abc123')
      setEditMsg(rendered)
    }
    if (type === 'schema') setSchedDate(c.scheduled_for ? c.scheduled_for.slice(0, 16) : '')
    if (type === 'kampanj') setCampSel(c.custom_campaign_id ?? 'standard')
  }

  async function patch(id: string, body: object) {
    await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setExpandedId(null); setExpandType(null)
    fetchAll()
  }

  async function sendNow(id: string) {
    await fetch(`/api/customers/${id}/send-now`, { method: 'POST' })
    fetchAll()
  }

  async function stop(id: string) {
    if (!confirm('Stoppa utskick?')) return
    await fetch(`/api/customers/${id}/stop`, { method: 'POST' })
    fetchAll()
  }

  if (loading) return <p style={{ fontSize: 12, color: '#9c9285', padding: '.75rem 0' }}>Laddar...</p>
  if (!customers.length) return <p style={{ fontSize: 12, color: '#9c9285', padding: '.75rem 0' }}>Inga schemalagda utskick just nu.</p>

  const { idag, vecka, senare } = groupCustomers(customers)
  const groups = [
    { label: 'IDAG', items: idag },
    { label: 'DENNA VECKA', items: vecka },
    { label: 'SENARE', items: senare },
  ].filter(g => g.items.length > 0)

  return (
    <>
      {groups.map(g => (
        <div key={g.label}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: '#9c9285', padding: '.4rem 0 .25rem', marginTop: '.25rem' }}>{g.label}</div>
          {g.items.map(c => (
            <div key={c.id} style={{ border: '1px solid #e5dfd4', borderRadius: 10, marginBottom: '.5rem', background: '#f7f3ec', overflow: 'hidden' }}>

              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '.65rem .85rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#deeae3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#2e6649', flexShrink: 0 }}>
                  {initials(c.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0e1410' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#9c9285' }}>
                    {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)} · {c.scheduled_for ? fmtDetail(c.scheduled_for) : '–'}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#c47f2a', whiteSpace: 'nowrap' }}>
                  {c.scheduled_for ? fmtTime(c.scheduled_for) : '–'}
                </span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6, padding: '0 .85rem .65rem', flexWrap: 'wrap' }}>
                <button onClick={() => sendNow(c.id)} style={btnStyle}>✈ Skicka nu</button>
                <button onClick={() => toggle(c.id, 'redigera', c)} style={{ ...btnStyle, background: expandedId === c.id && expandType === 'redigera' ? '#eae4db' : '#fff' }}>✏ Redigera utskick</button>
                <button onClick={() => toggle(c.id, 'kampanj', c)} style={{ ...btnStyle, background: expandedId === c.id && expandType === 'kampanj' ? '#eae4db' : '#fff' }}>⚙ Kampanj</button>
                <button onClick={() => toggle(c.id, 'schema', c)} style={{ ...btnStyle, background: expandedId === c.id && expandType === 'schema' ? '#eae4db' : '#fff' }}>📅 Schemalägg om</button>
                <button onClick={() => stop(c.id)} style={{ ...btnStyle, color: '#c0392b', borderColor: '#f5c6c0' }}>⊘ Stoppa</button>
              </div>

              {/* Expand: Redigera utskick */}
              {expandedId === c.id && expandType === 'redigera' && (
                <div style={expandPanel}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0e1410', marginBottom: '.6rem' }}>Redigera meddelande för {c.name}</div>

                  <div
                    ref={bubbleRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={e => setEditMsg((e.target as HTMLDivElement).innerText)}
                    style={{ background: '#fff', borderRadius: '12px 12px 12px 3px', padding: '.7rem .9rem', fontSize: 13, color: '#0e1410', lineHeight: 1.65, display: 'inline-block', maxWidth: '100%', boxShadow: '0 1px 4px rgba(0,0,0,.1)', whiteSpace: 'pre-wrap', outline: 'none', minWidth: 200, cursor: 'text', border: '1.5px solid #2e6649' }}
                  >
                    {editMsg}
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: '.75rem' }}>
                    <button onClick={() => patch(c.id, { custom_message: bubbleRef.current?.innerText ?? editMsg })} style={saveBtn}>Spara</button>
                    <button onClick={() => setExpandedId(null)} style={cancelBtn}>Avbryt</button>
                  </div>
                </div>
              )}

              {/* Expand: Kampanj */}
              {expandedId === c.id && expandType === 'kampanj' && (
                <div style={expandPanel}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0e1410', marginBottom: '.4rem' }}>Individuell kampanj för {c.name}</div>
                  <select
                    value={campSel}
                    onChange={e => setCampSel(e.target.value)}
                    style={{ width: '100%', fontSize: 12, padding: '7px 10px', border: '1px solid #e5dfd4', borderRadius: 7, background: '#fff', color: '#0e1410', outline: 'none', fontFamily: 'inherit' }}
                  >
                    <option value="standard">Standard (standardkampanj)</option>
                    {campaigns.map(cp => <option key={cp.id} value={cp.id}>{cp.name}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 6, marginTop: '.5rem' }}>
                    <button onClick={() => patch(c.id, { custom_campaign_id: campSel === 'standard' ? null : campSel })} style={saveBtn}>Spara</button>
                    <button onClick={() => setExpandedId(null)} style={cancelBtn}>Avbryt</button>
                  </div>
                  <div style={{ fontSize: 10, color: '#9c9285', marginTop: '.3rem' }}>Åsidosätter standardkampanjen bara för denna kund.</div>
                </div>
              )}

              {/* Expand: Schemalägg om */}
              {expandedId === c.id && expandType === 'schema' && (
                <div style={expandPanel}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0e1410', marginBottom: '.4rem' }}>Schemalägg om för {c.name}</div>
                  <input
                    type="datetime-local"
                    value={schedDate}
                    onChange={e => setSchedDate(e.target.value)}
                    style={{ fontSize: 12, padding: '7px 10px', border: '1px solid #e5dfd4', borderRadius: 7, background: '#fff', color: '#0e1410', outline: 'none', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: '.5rem' }}>
                    <button onClick={() => patch(c.id, { scheduled_for: schedDate ? new Date(schedDate).toISOString() : null })} style={saveBtn}>Spara</button>
                    <button onClick={() => setExpandedId(null)} style={cancelBtn}>Avbryt</button>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      ))}
    </>
  )
}

const btnStyle: React.CSSProperties = {
  fontSize: 11, padding: '4px 11px', borderRadius: 7, cursor: 'pointer',
  background: '#fff', color: '#5c5445', border: '1px solid #e5dfd4',
}
const expandPanel: React.CSSProperties = {
  borderTop: '1px solid #e5dfd4', padding: '.75rem .85rem', background: '#fff',
}
const saveBtn: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 7,
  cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none',
}
const cancelBtn: React.CSSProperties = {
  fontSize: 11, padding: '5px 12px', borderRadius: 7,
  cursor: 'pointer', background: 'none', color: '#9c9285', border: '1px solid #e5dfd4',
}
