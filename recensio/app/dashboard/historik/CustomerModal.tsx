'use client'
import { useEffect, useState } from 'react'

type SmsLogEntry = {
  id: string; type: string; message: string; sent_at: string
  campaigns: { name: string } | null
}
type CustomerDetail = {
  id: string; name: string; phone: string; platform: string; status: string
  stars: number | null; review_text: string | null; outbound_sms: string | null
  sms_sent_at: string | null; created_at: string
  sms_log: SmsLogEntry[]
}

const statusLabel: Record<string, { label: string; bg: string; color: string }> = {
  reviewed: { label: 'Recension',  bg: '#dcfce7', color: '#15803d' },
  private:  { label: 'Privat',     bg: '#fee2e2', color: '#dc2626' },
  sent:     { label: 'Skickat',    bg: '#dbeafe', color: '#2563eb' },
  pending:  { label: 'Väntar',     bg: '#fef9c3', color: '#a16207' },
  stopped:  { label: 'Stoppad',    bg: '#f1f5f9', color: '#64748b' },
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.round(diff / 60000)
  if (m < 2) return 'Nyss'
  if (m < 60) return `${m} min sedan`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h sedan`
  return `${Math.round(h / 24)}d sedan`
}

function Stars({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 18, color: i <= n ? '#f5a623' : '#e5dfd4' }}>★</span>
      ))}
    </div>
  )
}

export default function CustomerModal({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customers/${customerId}`)
      .then(r => r.json())
      .then(d => { setCustomer(d); setLoading(false) })
  }, [customerId])

  // Close on backdrop click
  function onBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const s = customer ? (statusLabel[customer.status] ?? statusLabel.stopped) : null

  return (
    <div
      onClick={onBackdrop}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,.18)' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem .75rem', borderBottom: '1px solid #f0ece6', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', color: '#0e1410', fontWeight: 600 }}>
              {loading ? '…' : customer?.name}
            </div>
            {customer && (
              <div style={{ fontSize: 12, color: '#9c9285', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                {customer.phone} · {customer.platform.charAt(0).toUpperCase() + customer.platform.slice(1)}
                {s && <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: '#f7f3ec', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: 'pointer', color: '#5c5445', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </div>

        {loading && <div style={{ padding: '2rem', textAlign: 'center', fontSize: 13, color: '#9c9285' }}>Laddar…</div>}

        {customer && (
          <div style={{ padding: '1rem 1.25rem 1.5rem' }}>

            {/* UTSKICK */}
            {(customer.outbound_sms || customer.sms_log.filter(e => e.type === 'outbound').length > 0) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={sectionLabel}>Utskick</div>
                {(() => {
                  const entry = customer.sms_log.find(e => e.type === 'outbound')
                  const msg = entry?.message ?? customer.outbound_sms ?? ''
                  const sentAt = entry?.sent_at ?? customer.sms_sent_at
                  return (
                    <div style={bubble}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                        <span style={campTag}>Recensionsförfrågan</span>
                        {sentAt && <span style={{ fontSize: 11, color: '#9c9285' }}>{timeAgo(sentAt)}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#0e1410', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg}</div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* KAMPANJ (extra campaign messages) */}
            {customer.sms_log.filter(e => e.type === 'campaign').map(entry => (
              <div key={entry.id} style={{ marginBottom: '1.25rem' }}>
                <div style={sectionLabel}>Kampanj</div>
                <div style={{ ...bubble, borderColor: '#2e6649' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                    <span style={{ ...campTag, background: '#deeae3', color: '#2e6649' }}>{entry.campaigns?.name ?? 'Kampanj'}</span>
                    <span style={{ fontSize: 11, color: '#9c9285' }}>{timeAgo(entry.sent_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#0e1410', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.message}</div>
                </div>
              </div>
            ))}

            {/* RECENSION */}
            {(customer.status === 'reviewed' || customer.status === 'private') && (
              <div>
                <div style={sectionLabel}>{customer.status === 'private' ? 'Privat feedback' : 'Recension'}</div>
                <div style={{ marginTop: '.4rem' }}>
                  {customer.stars && <Stars n={customer.stars} />}
                  {customer.review_text && (
                    <div style={{ marginTop: '.5rem', fontSize: 13, color: customer.status === 'private' ? '#c0392b' : '#0e1410', fontStyle: 'italic', lineHeight: 1.6, background: customer.status === 'private' ? '#fdf0ee' : '#f7f3ec', borderRadius: 8, padding: '.65rem .85rem' }}>
                      "{customer.review_text}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inget skickat än */}
            {customer.status === 'pending' && (
              <div style={{ fontSize: 13, color: '#9c9285', textAlign: 'center', padding: '1rem 0' }}>
                Inget utskick skickat än.
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
  color: '#9c9285', marginBottom: '.5rem',
}
const bubble: React.CSSProperties = {
  background: '#f7f3ec', border: '1px solid #e5dfd4', borderRadius: 10, padding: '.75rem .9rem',
}
const campTag: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 5,
  background: '#f0ece6', color: '#5c5445',
}
