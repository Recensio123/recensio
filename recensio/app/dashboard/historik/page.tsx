'use client'
import { useState, useEffect, useRef } from 'react'

type Customer = {
  id: string; name: string; phone: string; platform: string; status: string
  stars: number | null; review_text: string | null; created_at: string
  campaign_sent_name: string | null; redirect_platform: string | null
  outbound_sms: string | null; followup_scheduled_at: string | null
  followup_cancelled: boolean; followup_message: string | null
  owner_responded_at: string | null
}

type Campaign = { id: string; name: string; template: string; timing_hours: number }

const statusLabel: Record<string, { label: string; bg: string; color: string }> = {
  reviewed: { label: 'Recension',       bg: '#dcfce7', color: '#15803d' },
  private:  { label: 'Privat feedback', bg: '#fee2e2', color: '#dc2626' },
  sent:     { label: 'SMS skickat',     bg: '#dbeafe', color: '#2563eb' },
  pending:  { label: 'Väntar',          bg: '#fef9c3', color: '#a16207' },
  stopped:  { label: 'Stoppad',         bg: '#f1f5f9', color: '#64748b' },
}

const platformLabel: Record<string, string> = {
  google: 'Google', reco: 'Reco.se', hitta: 'Hittaproffs',
}

const PAGE_SIZE = 15

function fmtCountdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Nu'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h >= 24) return `Om ${Math.floor(h / 24)} dagar`
  if (h > 0) return `Om ${h} tim ${m} min`
  return `Om ${m} min`
}

function renderTmpl(tmpl: string, firstName: string, co: string) {
  return tmpl
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

export default function HistorikPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [companyName, setCompanyName] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [copied, setCopied] = useState(false)
  const followupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCustomers()
    fetch('/api/campaigns').then(r => r.ok ? r.json() : []).then(setCampaigns)
    fetch('/api/settings').then(r => r.ok ? r.json() : null).then(d => { if (d?.name) setCompanyName(d.name) })
  }, [])

  useEffect(() => { setPage(1) }, [search, statusFilter])

  useEffect(() => {
    if (followupRef.current && editingFollowupId) {
      const c = customers.find(x => x.id === editingFollowupId)
      if (c) {
        const campaign = campaigns[0]
        const firstName = c.name.split(' ')[0]
        const msg = c.followup_message
          ?? (campaign ? renderTmpl(campaign.template, firstName, companyName) : '')
        followupRef.current.innerText = msg
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingFollowupId])

  async function fetchCustomers() {
    const res = await fetch('/api/customers')
    if (res.ok) setCustomers(await res.json())
    setLoading(false)
  }

  function toggleRow(id: string) {
    if (expandedId === id) {
      setExpandedId(null); setEditingFollowupId(null); setAiSuggestion('')
    } else {
      setExpandedId(id); setEditingFollowupId(null); setAiSuggestion('')
    }
  }

  async function saveFollowup(c: Customer) {
    const text = followupRef.current?.innerText ?? ''
    const tmpl = toTemplate(text, c.name.split(' ')[0], companyName)
    await fetch(`/api/customers/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followup_message: tmpl }),
    })
    setEditingFollowupId(null)
    fetchCustomers()
  }

  async function cancelFollowup(id: string) {
    if (!confirm('Avbryt kampanjutskicket?')) return
    await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followup_cancelled: true }),
    })
    fetchCustomers()
  }

  async function generateSuggestion(c: Customer) {
    setLoadingAi(true); setAiSuggestion('')
    const res = await fetch('/api/ai/sms-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: c.review_text, customerName: c.name.split(' ')[0], companyName, type: 'response' }),
    })
    if (res.ok) setAiSuggestion((await res.json()).suggestion)
    setLoadingAi(false)
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function isPagaende(c: Customer) {
    if (c.status === 'sent') return true
    if (c.status === 'reviewed' && !c.followup_cancelled && !!c.followup_scheduled_at && new Date(c.followup_scheduled_at) > new Date()) return true
    if (c.status === 'private' && !c.owner_responded_at) return true
    return false
  }

  const historik = customers
    .filter(c => c.status !== 'pending' && !isPagaende(c))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filtered = historik
    .filter(c => search === '' || c.name.toLowerCase().includes(search.toLowerCase()))
    .filter(c => statusFilter === 'all' || c.status === statusFilter)

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const smsSent = historik.length
  const reviewed = customers.filter(c => c.status === 'reviewed').length
  const conversion = smsSent > 0 ? Math.round((reviewed / smsSent) * 100) + '%' : '–'

  const activeCampaign = campaigns[0] ?? null

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Kunder totalt', val: customers.length },
          { label: 'SMS skickade', val: smsSent },
          { label: 'Konvertering', val: conversion },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: 11, color: '#9c9285', fontWeight: 500, marginBottom: '.3rem' }}>{m.label}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', color: '#0e1410', lineHeight: 1 }}>{m.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410' }}>Kundhistorik ({filtered.length})</div>
          <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök namn..." style={inStyle} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inStyle, cursor: 'pointer', width: 'auto' }}>
              <option value="all">Alla status</option>
              {Object.entries(statusLabel).filter(([k]) => k !== 'pending').map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? <p style={{ fontSize: 12, color: '#9c9285' }}>Laddar...</p> : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>{['', 'Namn', 'Plattform', 'Kampanj', 'Status', 'Datum'].map(h => (
                  <th key={h} style={{ fontSize: 10, color: '#9c9285', textAlign: 'left', padding: '.35rem .65rem', borderBottom: '1px solid #f0ece6', fontWeight: 500 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {paginated.map(c => {
                  const s = statusLabel[c.status] ?? statusLabel.stopped
                  const isExpanded = expandedId === c.id
                  const firstName = c.name.split(' ')[0]
                  const followupMsg = c.followup_message
                    ? renderTmpl(c.followup_message, firstName, companyName)
                    : (activeCampaign ? renderTmpl(activeCampaign.template, firstName, companyName) : '')

                  return (
                    <>
                      <tr
                        key={c.id}
                        onClick={() => toggleRow(c.id)}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{ cursor: 'pointer', background: isExpanded ? '#f7f3ec' : hoveredId === c.id ? '#faf8f5' : 'transparent', transition: 'background .15s' }}
                      >
                        <td style={{ padding: '.6rem .65rem' }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#deeae3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#2e6649' }}>
                            {c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                        </td>
                        <td style={{ padding: '.6rem .65rem', color: '#5c5445' }}>
                          <div>{c.name}</div>
                          {c.stars != null && (
                            <div style={{ fontSize: 11, color: '#f4a823', marginTop: 1, letterSpacing: 1 }}>
                              {'★'.repeat(c.stars)}{'☆'.repeat(5 - c.stars)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '.6rem .65rem', color: '#5c5445' }}>{c.platform}</td>
                        <td style={{ padding: '.6rem .65rem' }}>
                          {c.campaign_sent_name
                            ? <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: '#deeae3', color: '#2e6649' }}>{c.campaign_sent_name}</span>
                            : <span style={{ color: '#c8c3bb', fontSize: 11 }}>–</span>}
                        </td>
                        <td style={{ padding: '.6rem .65rem' }}>
                          {c.redirect_platform
                            ? <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: '#dcfce7', color: '#15803d' }}>Skickad till {platformLabel[c.redirect_platform] ?? c.redirect_platform}</span>
                            : <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>}
                        </td>
                        <td style={{ padding: '.6rem .65rem', color: '#9c9285' }}>{new Date(c.created_at).toLocaleDateString('sv-SE')}</td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${c.id}-expand`}>
                          <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid #e5dfd4' }}>
                            <div style={{ padding: '1rem', background: '#f7f3ec', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                              {/* Vänster: SMS som skickades */}
                              <div>
                                <div style={sectionLabel}>SMS som skickades</div>
                                {c.outbound_sms
                                  ? <div style={smsBubble}>{c.outbound_sms}</div>
                                  : <div style={{ fontSize: 12, color: '#9c9285', fontStyle: 'italic' }}>Inget SMS loggat</div>}
                              </div>

                              {/* Höger: beroende på status */}
                              <div>
                                {/* Privat feedback + AI-svar */}
                                {c.status === 'private' && (
                                  <>
                                    <div style={sectionLabel}>Kundens feedback</div>
                                    {c.stars != null && (
                                      <div style={{ fontSize: 14, color: '#f4a823', marginBottom: '.4rem', letterSpacing: 1 }}>
                                        {'★'.repeat(c.stars)}{'☆'.repeat(5 - c.stars)}
                                      </div>
                                    )}
                                    <div style={{ fontSize: 12, color: '#5c5445', lineHeight: 1.65, marginBottom: '.75rem' }}>{c.review_text}</div>
                                    <div style={sectionLabel}>SMS-svar förslag</div>
                                    {!aiSuggestion ? (
                                      <button onClick={() => generateSuggestion(c)} disabled={loadingAi} style={aiBtn}>
                                        {loadingAi ? '✨ Genererar...' : '✨ Generera svar'}
                                      </button>
                                    ) : (
                                      <>
                                        <div style={smsBubble}>{aiSuggestion}</div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: '.5rem' }}>
                                          <button onClick={() => copyToClipboard(aiSuggestion)} style={{ ...smallBtn, background: copied ? '#deeae3' : '#fff', color: copied ? '#2e6649' : '#5c5445' }}>
                                            {copied ? '✓ Kopierat' : 'Kopiera'}
                                          </button>
                                          <button onClick={() => { setAiSuggestion(''); generateSuggestion(c) }} style={cancelBtn}>Nytt förslag</button>
                                        </div>
                                      </>
                                    )}
                                  </>
                                )}

                                {/* Kampanjuppföljning för recenserade */}
                                {c.status === 'reviewed' && (
                                  <>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.35rem' }}>
                                      <div style={sectionLabel}>Kampanjuppföljning</div>
                                      {c.followup_cancelled && (
                                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>Avbruten</span>
                                      )}
                                    </div>

                                    {c.followup_cancelled ? (
                                      <div style={{ fontSize: 12, color: '#9c9285', fontStyle: 'italic' }}>Kampanjutskicket är avbrutet.</div>
                                    ) : (
                                      <>
                                        {c.followup_scheduled_at && (
                                          <div style={{ fontSize: 11, color: '#c47f2a', fontWeight: 600, marginBottom: '.5rem' }}>
                                            ⏱ {fmtCountdown(c.followup_scheduled_at)}
                                          </div>
                                        )}

                                        {editingFollowupId === c.id ? (
                                          <>
                                            <div
                                              ref={followupRef}
                                              contentEditable
                                              suppressContentEditableWarning
                                              style={{ ...smsBubble, outline: '1.5px solid #2e6649', cursor: 'text' }}
                                            />
                                            <div style={{ display: 'flex', gap: 6, marginTop: '.5rem' }}>
                                              <button onClick={() => saveFollowup(c)} style={aiBtn}>Spara</button>
                                              <button onClick={() => setEditingFollowupId(null)} style={cancelBtn}>Avbryt</button>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div style={smsBubble}>{followupMsg}</div>
                                            <div style={{ display: 'flex', gap: 6, marginTop: '.5rem' }}>
                                              <button onClick={e => { e.stopPropagation(); setEditingFollowupId(c.id) }} style={smallBtn}>Redigera</button>
                                              <button onClick={e => { e.stopPropagation(); cancelFollowup(c.id) }} style={{ ...cancelBtn, color: '#dc2626', borderColor: '#f5c6c0' }}>Avbryt utskick</button>
                                            </div>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}

                                {/* Skickat — inväntar svar */}
                                {c.status === 'sent' && (
                                  <div style={{ fontSize: 12, color: '#9c9285', fontStyle: 'italic', marginTop: '.5rem' }}>Inväntar svar från kunden.</div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '1.5rem .65rem', color: '#9c9285', fontSize: 12 }}>Inga kunder matchar sökningen.</td></tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px solid #f0ece6' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 7, cursor: page === 1 ? 'default' : 'pointer', background: '#fff', color: page === 1 ? '#c8c3bb' : '#5c5445', border: '1px solid #e5dfd4' }}>← Föregående</button>
                <span style={{ fontSize: 11, color: '#9c9285' }}>Sida {page} av {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 7, cursor: page === totalPages ? 'default' : 'pointer', background: '#fff', color: page === totalPages ? '#c8c3bb' : '#5c5445', border: '1px solid #e5dfd4' }}>Nästa →</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

const inStyle: React.CSSProperties = { padding: '6px 10px', background: '#f7f3ec', border: '1px solid #e5dfd4', borderRadius: 7, fontFamily: 'inherit', fontSize: 12, color: '#0e1410', outline: 'none' }
const sectionLabel: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: '#9c9285', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.35rem' }
const smsBubble: React.CSSProperties = { background: '#fff', borderRadius: '10px 10px 10px 3px', padding: '.65rem .85rem', fontSize: 12, color: '#0e1410', lineHeight: 1.65, border: '1px solid #e5dfd4', whiteSpace: 'pre-wrap' }
const aiBtn: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }
const smallBtn: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', background: '#fff', color: '#5c5445', border: '1px solid #e5dfd4' }
const cancelBtn: React.CSSProperties = { fontSize: 11, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', background: 'none', color: '#9c9285', border: '1px solid #e5dfd4' }
