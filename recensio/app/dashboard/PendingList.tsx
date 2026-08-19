'use client'
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

type Customer = {
  id: string; name: string; phone: string; platform: string
  status: string; scheduled_for: string | null
  custom_message: string | null; custom_campaign_id: string | null
}
type Campaign = { id: string; name: string; template: string }

function renderTmpl(raw: string, firstName: string, co: string) {
  return raw
    .replace(/\{förnamn\}/g, firstName)
    .replace(/\{företag\}/g, co)
    .replace(/\{kod\}/g, 'abc123')
    .replace(/\{rabattkod\}/g, 'SOMMAR20')
}

function toTemplate(text: string, firstName: string, co: string) {
  const escapedCo = co.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedName = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text
    .replace(new RegExp(escapedCo, 'g'), '{företag}')
    .replace(new RegExp(`\\b${escapedName}\\b`, 'g'), '{förnamn}')
    .replace(/\babc123\b/g, '{kod}')
    .replace(/SOMMAR20/g, '{rabattkod}')
}

function fmtTime(d: string) {
  const diff = new Date(d).getTime() - Date.now()
  if (diff <= 0) return 'Nu'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h >= 24) return `Om ${Math.floor(h / 24)} dagar`
  if (h > 0) return `Om ${h} tim ${m} min`
  return `Om ${m} min`
}

function fmtDetail(d: string) {
  return new Date(d).toLocaleString('sv-SE', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function groupCustomers(customers: Customer[]) {
  const now = new Date()
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)
  const oschemalagda: Customer[] = [], idag: Customer[] = [], vecka: Customer[] = [], senare: Customer[] = []
  for (const c of customers) {
    if (!c.scheduled_for) { oschemalagda.push(c); continue }
    const t = new Date(c.scheduled_for)
    if (t <= todayEnd) idag.push(c)
    else if (t <= weekEnd) vecka.push(c)
    else senare.push(c)
  }
  return { oschemalagda, idag, vecka, senare }
}

// Isolerad SMS-bubbla — förälderns re-renders nollställer inte innehållet
const SmsBubble = forwardRef<
  { getText: () => string },
  { initialText: string; onDirty: () => void }
>(({ initialText, onDirty }, ref) => {
  const divRef = useRef<HTMLDivElement>(null)
  const textRef = useRef(initialText)
  useImperativeHandle(ref, () => ({ getText: () => textRef.current }))
  useEffect(() => {
    if (divRef.current) divRef.current.innerText = initialText
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onInput={e => { textRef.current = (e.target as HTMLDivElement).innerText; onDirty() }}
      style={{
        background: '#fff', borderRadius: '10px 10px 10px 3px',
        padding: '.65rem .85rem', fontSize: 12, color: '#0e1410',
        lineHeight: 1.65, border: '1px solid #e5dfd4',
        whiteSpace: 'pre-wrap', cursor: 'text', outline: 'none',
        marginBottom: '.5rem',
      }}
    />
  )
})
SmsBubble.displayName = 'SmsBubble'

export default function PendingList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [defaultTemplate, setDefaultTemplate] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)

  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const bubbleRefs = useRef<Record<string, { getText: () => string } | null>>({})
  const dirtyRef = useRef(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandType, setExpandType] = useState<'kampanj' | 'schema' | null>(null)
  const [schedDate, setSchedDate] = useState('')
  const [campSel, setCampSel] = useState('')

  useEffect(() => { dirtyRef.current = dirtyIds.size > 0 }, [dirtyIds.size])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      e.preventDefault(); e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    const handleClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return
      const anchor = (e.target as Element).closest('a[href]')
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (!href || href.startsWith('#') || /^https?:\/\//.test(href)) return
      if (!window.confirm('Du har osparade ändringar som kommer gå förlorade.\n\nVill du lämna sidan utan att spara?')) {
        e.preventDefault(); e.stopPropagation()
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [cr, campr, setr] = await Promise.all([
      fetch('/api/customers'), fetch('/api/campaigns'), fetch('/api/settings'),
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

  function getRendered(c: Customer) {
    const raw = c.custom_message
      ?? campaigns.find(cp => cp.id === c.custom_campaign_id)?.template
      ?? defaultTemplate
    return renderTmpl(raw, c.name.split(' ')[0], companyName)
  }

  function markDirty(id: string) {
    setDirtyIds(prev => prev.has(id) ? prev : new Set([...prev, id]))
  }

  async function patch(id: string, body: object) {
    await fetch(`/api/customers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setExpandedId(null); setExpandType(null)
    fetchAll()
  }

  async function saveMessage(c: Customer) {
    const text = bubbleRefs.current[c.id]?.getText() ?? ''
    const tmpl = toTemplate(text, c.name.split(' ')[0], companyName)
    setDirtyIds(prev => { const n = new Set(prev); n.delete(c.id); return n })
    await patch(c.id, { custom_message: tmpl })
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

  function toggleExpand(id: string, type: 'kampanj' | 'schema', c: Customer) {
    if (expandedId === id && expandType === type) {
      setExpandedId(null); setExpandType(null); return
    }
    setExpandedId(id); setExpandType(type)
    if (type === 'schema') setSchedDate(c.scheduled_for ? c.scheduled_for.slice(0, 16) : '')
    if (type === 'kampanj') setCampSel(c.custom_campaign_id ?? 'standard')
  }

  if (loading) return <p style={{ fontSize: 12, color: '#9c9285', padding: '.75rem 0' }}>Laddar...</p>
  if (!customers.length) return <p style={{ fontSize: 12, color: '#9c9285', padding: '.75rem 0' }}>Inga schemalagda utskick just nu.</p>

  const { oschemalagda, idag, vecka, senare } = groupCustomers(customers)
  const groups = [
    { label: 'EJ SCHEMALAGDA', items: oschemalagda },
    { label: 'IDAG', items: idag },
    { label: 'DENNA VECKA', items: vecka },
    { label: 'SENARE', items: senare },
  ].filter(g => g.items.length > 0)

  return (
    <>
      {groups.map(g => (
        <div key={g.label}>
          <div style={groupLabel}>{g.label}</div>
          {g.items.map(c => {
            const isDirty = dirtyIds.has(c.id)
            const isKampanj = expandedId === c.id && expandType === 'kampanj'
            const isSchema  = expandedId === c.id && expandType === 'schema'

            return (
              <div key={c.id} style={card}>
                {/* Header */}
                <div style={cardTop}>
                  <div style={{ flex: 1 }}>
                    <div style={cardName}>{c.name}</div>
                    <div style={cardSub}>
                      {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)}
                      {c.scheduled_for && <> · {fmtDetail(c.scheduled_for)}</>}
                    </div>
                  </div>
                  <span style={timerBadge}>{c.scheduled_for ? fmtTime(c.scheduled_for) : '–'}</span>
                </div>

                {/* SMS-bubbla — direkt redigerbar */}
                <div style={{ padding: '0 .85rem .7rem' }}>
                  <SmsBubble
                    key={c.id + (c.custom_message ?? '')}
                    ref={el => { bubbleRefs.current[c.id] = el }}
                    initialText={getRendered(c)}
                    onDirty={() => markDirty(c.id)}
                  />

                  {/* Knappar */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {isDirty && (
                      <button onClick={() => saveMessage(c)} style={saveBtn}>Spara</button>
                    )}
                    <button onClick={() => sendNow(c.id)} style={outlineBtn}>✈ Skicka nu</button>
                    <button onClick={() => toggleExpand(c.id, 'kampanj', c)} style={{ ...ghostBtn, background: isKampanj ? '#eae4db' : 'none' }}>⚙ Kampanj</button>
                    <button onClick={() => toggleExpand(c.id, 'schema', c)} style={{ ...ghostBtn, background: isSchema ? '#eae4db' : 'none' }}>📅 Schemalägg om</button>
                    <button onClick={() => stop(c.id)} style={{ ...ghostBtn, color: '#c0392b', borderColor: '#f5c6c0' }}>⊘ Stoppa</button>
                  </div>

                  {/* Kampanj-panel */}
                  {isKampanj && (
                    <div style={expandPanel}>
                      <div style={panelTitle}>Individuell kampanj för {c.name}</div>
                      <select value={campSel} onChange={e => setCampSel(e.target.value)} style={selectStyle}>
                        <option value="standard">Standard (standardkampanj)</option>
                        {campaigns.map(cp => <option key={cp.id} value={cp.id}>{cp.name}</option>)}
                      </select>
                      <div style={{ fontSize: 10, color: '#9c9285', margin: '.25rem 0 .4rem' }}>
                        Åsidosätter standardkampanjen bara för denna kund.
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => patch(c.id, { custom_campaign_id: campSel === 'standard' ? null : campSel })} style={saveBtn}>Spara</button>
                        <button onClick={() => setExpandedId(null)} style={ghostBtn}>Avbryt</button>
                      </div>
                    </div>
                  )}

                  {/* Schema-panel */}
                  {isSchema && (
                    <div style={expandPanel}>
                      <div style={panelTitle}>Schemalägg om för {c.name}</div>
                      <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={inputStyle} />
                      <div style={{ display: 'flex', gap: 6, marginTop: '.4rem' }}>
                        <button onClick={() => patch(c.id, { scheduled_for: schedDate ? new Date(schedDate).toISOString() : null })} style={saveBtn}>Spara</button>
                        <button onClick={() => setExpandedId(null)} style={ghostBtn}>Avbryt</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}

const groupLabel:  React.CSSProperties = { fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: '#9c9285', padding: '.4rem 0 .25rem', marginTop: '.25rem' }
const card:        React.CSSProperties = { border: '1px solid #e5dfd4', borderRadius: 10, marginBottom: '.5rem', background: '#f7f3ec', overflow: 'hidden' }
const cardTop:     React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '.65rem .85rem' }
const cardName:    React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#0e1410' }
const cardSub:     React.CSSProperties = { fontSize: 11, color: '#9c9285' }
const timerBadge:  React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#c47f2a', whiteSpace: 'nowrap' }
const saveBtn:     React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }
const outlineBtn:  React.CSSProperties = { fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 7, cursor: 'pointer', background: '#fff', color: '#5c5445', border: '1px solid #e5dfd4' }
const ghostBtn:    React.CSSProperties = { fontSize: 11, padding: '4px 12px', borderRadius: 7, cursor: 'pointer', background: 'none', color: '#9c9285', border: '1px solid #e5dfd4' }
const expandPanel: React.CSSProperties = { borderTop: '1px solid #e5dfd4', marginTop: '.5rem', paddingTop: '.6rem' }
const panelTitle:  React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#0e1410', marginBottom: '.4rem' }
const selectStyle: React.CSSProperties = { width: '100%', fontSize: 12, padding: '7px 10px', border: '1px solid #e5dfd4', borderRadius: 7, background: '#fff', color: '#0e1410', outline: 'none', fontFamily: 'inherit' }
const inputStyle:  React.CSSProperties = { fontSize: 12, padding: '7px 10px', border: '1px solid #e5dfd4', borderRadius: 7, background: '#fff', color: '#0e1410', outline: 'none', fontFamily: 'inherit' }
