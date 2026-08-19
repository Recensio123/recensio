'use client'
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

type Customer = {
  id: string; name: string; phone: string; platform: string; status: string
  stars: number | null; review_text: string | null; created_at: string
  outbound_sms: string | null
  followup_scheduled_at: string | null; followup_cancelled: boolean
  followup_message: string | null; followup_campaign_name: string | null
  followup_campaign_template: string | null
  owner_responded_at: string | null
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

function fmtCountdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Nu'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h >= 24) return `Om ${Math.floor(h / 24)} dagar`
  if (h > 0) return `Om ${h} tim ${m} min`
  return `Om ${m} min`
}

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

function isAwaitingFollowup(c: Customer) {
  return c.status === 'reviewed' &&
    !c.followup_cancelled &&
    !!c.followup_scheduled_at &&
    new Date(c.followup_scheduled_at) > new Date()
}

// Redigerbar kampanjbubbla — isolerad från förälderns re-renders
const FollowupBubble = forwardRef<
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
      onInput={e => {
        textRef.current = (e.target as HTMLDivElement).innerText
        onDirty()
      }}
      style={{
        background: '#fff', borderRadius: '10px 10px 10px 3px', padding: '.65rem .85rem',
        fontSize: 12, color: '#0e1410', lineHeight: 1.65, border: '1px solid #e5dfd4',
        whiteSpace: 'pre-wrap', cursor: 'text', outline: 'none',
        marginBottom: '.5rem',
      }}
    />
  )
})
FollowupBubble.displayName = 'FollowupBubble'

export default function PagaendePage() {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showFirstSms, setShowFirstSms] = useState<Record<string, boolean>>({})
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const bubbleRefs = useRef<Record<string, { getText: () => string } | null>>({})
  const dirtyRef = useRef(false)

  const [aiSuggestion, setAiSuggestion] = useState<Record<string, string>>({})
  const [loadingAi, setLoadingAi] = useState<string | null>(null)
  const [sendingReply, setSendingReply] = useState<string | null>(null)
  const [sentReply, setSentReply] = useState<string | null>(null)

  // Keep ref in sync so navigation guards can read it without re-installing
  useEffect(() => { dirtyRef.current = dirtyIds.size > 0 }, [dirtyIds.size])

  // Install navigation guards once on mount
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Intercept link clicks in capture phase — fires before Next.js ever
    // calls router.push(), so cancelling leaves the page completely untouched.
    const handleClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return
      const anchor = (e.target as Element).closest('a[href]')
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (!href || href.startsWith('#') || /^https?:\/\//.test(href)) return

      const leave = window.confirm(
        'Du har osparade ändringar som kommer gå förlorade.\n\nVill du lämna sidan utan att spara?'
      )
      if (!leave) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', handleClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [cr, setr] = await Promise.all([fetch('/api/customers'), fetch('/api/settings')])
    if (cr.ok) setAllCustomers(await cr.json())
    if (setr.ok) { const s = await setr.json(); if (s?.name) setCompanyName(s.name) }
    setLoading(false)
  }

  async function patchCustomer(id: string, body: object) {
    await fetch(`/api/customers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    fetchData()
  }

  function markDirty(id: string) {
    setDirtyIds(prev => prev.has(id) ? prev : new Set([...prev, id]))
  }

  async function saveFollowup(c: Customer) {
    const text = bubbleRefs.current[c.id]?.getText() ?? ''
    const tmpl = toTemplate(text, c.name.split(' ')[0], companyName)
    setDirtyIds(prev => { const n = new Set(prev); n.delete(c.id); return n })
    await patchCustomer(c.id, { followup_message: tmpl })
  }

  async function cancelFollowup(id: string) {
    if (!confirm('Avbryt kampanjutskicket?')) return
    await patchCustomer(id, { followup_cancelled: true })
  }

  async function markDone(id: string) {
    await patchCustomer(id, { owner_responded_at: new Date().toISOString() })
  }

  async function generateSuggestion(c: Customer) {
    setLoadingAi(c.id)
    const res = await fetch('/api/ai/sms-suggestion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: c.review_text, customerName: c.name.split(' ')[0], companyName, type: 'response' }),
    })
    if (res.ok) {
      const data = await res.json()
      setAiSuggestion(prev => ({ ...prev, [c.id]: data.suggestion }))
    }
    setLoadingAi(null)
  }

  async function sendReply(c: Customer, message: string) {
    setSendingReply(c.id)
    const res = await fetch(`/api/customers/${c.id}/send-reply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
    })
    setSendingReply(null)
    if (res.ok) { setSentReply(c.id); setTimeout(() => { setSentReply(null); fetchData() }, 1500) }
    else alert('Kunde inte skicka SMS. Kontrollera din 46elks-koppling.')
  }

  // Sortera: närmast utskick högst upp
  const followup = allCustomers
    .filter(isAwaitingFollowup)
    .sort((a, b) => new Date(a.followup_scheduled_at!).getTime() - new Date(b.followup_scheduled_at!).getTime())

  const privateUnhandled = allCustomers
    .filter(c => c.status === 'private' && !c.owner_responded_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const sent = allCustomers
    .filter(c => c.status === 'sent')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const total = followup.length + privateUnhandled.length + sent.length

  if (loading) return <p style={{ fontSize: 12, color: '#9c9285' }}>Laddar...</p>

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '.85rem' }}>
        Pågående ({total})
      </div>

      {total === 0 && <p style={{ fontSize: 12, color: '#9c9285' }}>Inget pågående just nu.</p>}

      {/* Kampanjuppföljning */}
      {followup.length > 0 && (
        <div>
          <div style={groupLabel}>KAMPANJUPPFÖLJNING</div>
          {followup.map(c => {
            const firstName = c.name.split(' ')[0]
            const followupMsg = c.followup_message ? renderTmpl(c.followup_message, firstName, companyName) : ''
            const seeFirst = showFirstSms[c.id] ?? false
            const isDirty = dirtyIds.has(c.id)
            const isCustomized = !isDirty &&
              c.followup_message != null &&
              c.followup_campaign_template != null &&
              c.followup_message !== c.followup_campaign_template
            const campLabel = (isDirty || isCustomized)
              ? 'Personlig kampanj'
              : `Kampanj: ${c.followup_campaign_name ?? '–'}`

            return (
              <div key={c.id} style={card}>
                {/* Header */}
                <div style={cardTop}>
                  <div style={{ flex: 1 }}>
                    <div style={cardName}>{c.name}</div>
                    <div style={cardSub}>
                      {c.platform}
                      {c.stars != null && (
                        <span style={{ color: '#f4a823', marginLeft: 6, letterSpacing: 1 }}>{stars(c.stars)}</span>
                      )}
                    </div>
                  </div>
                  <span style={timerBadge}>{c.followup_scheduled_at ? fmtCountdown(c.followup_scheduled_at) : '–'}</span>
                </div>

                {/* Kampanjbubbla */}
                <div style={{ padding: '0 .85rem .7rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#2e6649', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.3rem' }}>
                    {campLabel}
                  </div>

                  <FollowupBubble
                    key={c.id + (c.followup_message ?? '')}
                    ref={el => { bubbleRefs.current[c.id] = el }}
                    initialText={followupMsg}
                    onDirty={() => markDirty(c.id)}
                  />

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {isDirty && (
                      <button onClick={() => saveFollowup(c)} style={saveBtn}>Spara</button>
                    )}
                    <button onClick={() => cancelFollowup(c.id)} style={{ ...outlineBtn, color: '#c0392b', borderColor: '#f5c6c0' }}>⊘ Avbryt utskick</button>
                    <button onClick={() => setShowFirstSms(p => ({ ...p, [c.id]: !p[c.id] }))} style={{ ...ghostBtn, marginLeft: 'auto' }}>
                      {seeFirst ? 'Dölj ▲' : 'Se första utskick ▾'}
                    </button>
                  </div>

                  {seeFirst && (
                    <div style={{ marginTop: '.75rem' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#9c9285', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.3rem' }}>
                        Första utskick (redan skickat)
                      </div>
                      <div style={{ ...smsBubble, background: '#f7f3ec', color: '#9c9285' }}>{c.outbound_sms ?? '–'}</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Privat feedback */}
      {privateUnhandled.length > 0 && (
        <div>
          <div style={groupLabel}>PRIVAT FEEDBACK</div>
          {privateUnhandled.map(c => (
            <div key={c.id} style={card}>
              <div style={cardTop}>
                <div style={{ flex: 1 }}>
                  <div style={cardName}>{c.name}</div>
                  <div style={cardSub}>
                    {c.platform}
                    {c.stars != null && (
                      <span style={{ color: '#f4a823', marginLeft: 6, letterSpacing: 1 }}>{stars(c.stars)}</span>
                    )}
                  </div>
                </div>
              </div>

              {c.review_text && (
                <div style={{ padding: '0 .85rem .5rem', fontSize: 12, color: '#5c5445', lineHeight: 1.65, fontStyle: 'italic' }}>
                  "{c.review_text}"
                </div>
              )}

              <div style={{ padding: '0 .85rem .7rem' }}>
                <div style={sectionLabel}>SMS-svarförslag</div>
                {!aiSuggestion[c.id] ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => generateSuggestion(c)} disabled={loadingAi === c.id} style={saveBtn}>
                      {loadingAi === c.id ? '✨ Genererar...' : '✨ Generera svar'}
                    </button>
                    <button onClick={() => markDone(c.id)} style={ghostBtn}>Markera som klar utan att svara</button>
                  </div>
                ) : (
                  <>
                    <div style={{ ...smsBubble, marginBottom: '.5rem' }}>{aiSuggestion[c.id]}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {sentReply === c.id ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#2e6649' }}>✓ SMS skickat!</span>
                      ) : (
                        <button onClick={() => sendReply(c, aiSuggestion[c.id])} disabled={sendingReply === c.id} style={saveBtn}>
                          {sendingReply === c.id ? 'Skickar...' : '✈ Skicka SMS'}
                        </button>
                      )}
                      <button onClick={() => { setAiSuggestion(p => ({ ...p, [c.id]: '' })); generateSuggestion(c) }} style={ghostBtn}>Nytt förslag</button>
                      <button onClick={() => markDone(c.id)} style={ghostBtn}>Markera som klar utan att svara</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inväntar betyg */}
      {sent.length > 0 && (
        <div>
          <div style={groupLabel}>INVÄNTAR BETYG</div>
          {sent.map(c => (
            <div key={c.id} style={card}>
              <div style={cardTop}>
                <div style={{ flex: 1 }}>
                  <div style={cardName}>{c.name}</div>
                  <div style={cardSub}>{c.platform} · SMS skickat</div>
                </div>
                <span style={{ fontSize: 11, color: '#9c9285' }}>Inväntar svar...</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const groupLabel: React.CSSProperties = { fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: '#9c9285', padding: '.4rem 0 .25rem', marginTop: '.25rem' }
const sectionLabel: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: '#9c9285', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.35rem' }
const card: React.CSSProperties = { border: '1px solid #e5dfd4', borderRadius: 10, marginBottom: '.5rem', background: '#f7f3ec', overflow: 'hidden' }
const cardTop: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '.65rem .85rem' }
const cardName: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#0e1410' }
const cardSub: React.CSSProperties = { fontSize: 11, color: '#9c9285', display: 'flex', alignItems: 'center' }
const timerBadge: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#c47f2a', whiteSpace: 'nowrap' }
const smsBubble: React.CSSProperties = { background: '#fff', borderRadius: '10px 10px 10px 3px', padding: '.65rem .85rem', fontSize: 12, color: '#0e1410', lineHeight: 1.65, border: '1px solid #e5dfd4', whiteSpace: 'pre-wrap' }
const saveBtn: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }
const outlineBtn: React.CSSProperties = { fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 7, cursor: 'pointer', background: '#fff', color: '#5c5445', border: '1px solid #e5dfd4' }
const ghostBtn: React.CSSProperties = { fontSize: 11, padding: '4px 12px', borderRadius: 7, cursor: 'pointer', background: 'none', color: '#9c9285', border: '1px solid #e5dfd4' }
