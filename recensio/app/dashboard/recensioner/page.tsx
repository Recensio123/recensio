'use client'
import { useState, useEffect } from 'react'

type Review = {
  id: string
  name: string
  platform: string
  stars: number | null
  review_text: string | null
  status: string
  created_at: string
  campaign_sent_name: string | null
  owner_response: string | null
  owner_responded_at: string | null
}

type PlatformLink = {
  label: string
  icon: string
  url: string
}

const platformLabel: Record<string, string> = {
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  facebook: 'Facebook',
  yelp: 'Yelp',
  reco: 'Reco',
  hittaproffs: 'Hittaproffs',
  annat: 'Annat',
}

function Stars({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: 13, color: i <= n ? '#f5a623' : '#e5dfd4', lineHeight: 1 }}>★</span>
      ))}
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function ReviewCard({
  r,
  platformLinks,
  onSaved,
}: {
  r: Review
  platformLinks: PlatformLink[]
  onSaved: (id: string, response: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(r.owner_response ?? '')
  const [saving, setSaving] = useState(false)
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null)

  const hasResponse = !!r.owner_responded_at

  async function save(responseText: string | null) {
    setSaving(true)
    await fetch(`/api/customers/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_response: responseText }),
    })
    setSaving(false)
    setOpen(false)
    onSaved(r.id, responseText)
  }

  function copyAndOpen(platform: PlatformLink) {
    if (text.trim()) navigator.clipboard.writeText(text.trim())
    window.open(platform.url, '_blank', 'noopener')
    setCopiedPlatform(platform.label)
    setTimeout(() => setCopiedPlatform(null), 3000)
  }

  return (
    <div style={{ border: `1px solid ${hasResponse ? '#c8e6d4' : '#e5dfd4'}`, borderRadius: 12, background: '#fafaf8', overflow: 'hidden' }}>

      {/* Main row */}
      <div style={{ padding: '.85rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#deeae3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#2e6649', flexShrink: 0 }}>
              {initials(r.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0e1410' }}>{r.name}</span>
                {r.stars && <Stars n={r.stars} />}
                <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: '#deeae3', color: '#2e6649' }}>
                  {platformLabel[r.platform] ?? r.platform}
                </span>
              </div>
              {r.review_text && (
                <div style={{ marginTop: '.4rem', fontSize: 13, color: '#3a3028', lineHeight: 1.65, fontStyle: 'italic' }}>
                  "{r.review_text}"
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#9c9285' }}>
              {new Date(r.created_at).toLocaleDateString('sv-SE')}
            </span>
            <button
              onClick={() => { setOpen(o => !o); setText(r.owner_response ?? '') }}
              style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid #e5dfd4', background: open ? '#eae4db' : '#f0ece6', color: '#5c5445' }}
            >
              {hasResponse ? 'Redigera svar' : 'Svara'}
            </button>
          </div>
        </div>

        {/* Saved response display */}
        {hasResponse && !open && (
          <div style={{ marginTop: '.65rem', marginLeft: 42, background: '#f0f7f3', border: '1px solid #c8e6d4', borderRadius: 8, padding: '.6rem .85rem' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#2e6649', marginBottom: 3, letterSpacing: '.05em', textTransform: 'uppercase' }}>Ditt svar</div>
            <div style={{ fontSize: 12, color: '#2a4a38', lineHeight: 1.6 }}>{r.owner_response}</div>
            <div style={{ fontSize: 10, color: '#9c9285', marginTop: 4 }}>
              Besvarad {r.owner_responded_at ? new Date(r.owner_responded_at).toLocaleDateString('sv-SE') : ''}
            </div>
          </div>
        )}
      </div>

      {/* Reply form */}
      {open && (
        <div style={{ borderTop: '1px solid #e5dfd4', padding: '.85rem 1rem', background: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#0e1410', marginBottom: '.5rem' }}>
            {hasResponse ? 'Redigera ditt svar' : 'Skriv ditt svar'}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="Tack för din recension! Vi är glada att du..."
            style={{ width: '100%', fontSize: 12, padding: '8px 10px', border: '1px solid #d0c8bc', borderRadius: 8, fontFamily: 'inherit', color: '#0e1410', resize: 'vertical', outline: 'none', background: '#fafaf8', boxSizing: 'border-box', lineHeight: 1.6 }}
          />

          {/* Platform buttons */}
          {platformLinks.length > 0 && (
            <div style={{ marginTop: '.65rem' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9c9285', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.4rem' }}>
                Kopiera svar &amp; öppna plattform
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {platformLinks.map(pl => (
                  <button
                    key={pl.label}
                    onClick={() => copyAndOpen(pl)}
                    disabled={text.trim() === ''}
                    style={{
                      fontSize: 11, fontWeight: 500, padding: '5px 12px', borderRadius: 7,
                      cursor: text.trim() === '' ? 'default' : 'pointer',
                      background: copiedPlatform === pl.label ? '#deeae3' : '#f0ece6',
                      color: copiedPlatform === pl.label ? '#2e6649' : '#3a3028',
                      border: `1px solid ${copiedPlatform === pl.label ? '#c8e6d4' : '#e5dfd4'}`,
                      opacity: text.trim() === '' ? 0.5 : 1,
                      transition: 'all .15s',
                    }}
                  >
                    {pl.icon} {copiedPlatform === pl.label ? `Öppnade ${pl.label} ✓` : `Öppna ${pl.label}`}
                  </button>
                ))}
              </div>
              {text.trim() === '' && (
                <div style={{ fontSize: 10, color: '#9c9285', marginTop: '.3rem' }}>Skriv ett svar ovan för att aktivera knapparna.</div>
              )}
              {copiedPlatform && (
                <div style={{ fontSize: 11, color: '#2e6649', marginTop: '.4rem' }}>
                  Svaret är kopierat — klistra in det på {copiedPlatform}.
                </div>
              )}
            </div>
          )}

          {platformLinks.length === 0 && (
            <div style={{ marginTop: '.5rem', fontSize: 11, color: '#9c9285' }}>
              Koppla recensionssidor under <strong>Inställningar</strong> för att få snabbknappar här.
            </div>
          )}

          {/* Action row */}
          <div style={{ display: 'flex', gap: 6, marginTop: '.75rem', alignItems: 'center', borderTop: '1px solid #f0ece6', paddingTop: '.65rem' }}>
            <button
              onClick={() => save(text.trim() || null)}
              disabled={saving}
              style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', background: '#1a3d2b', color: '#fff', border: 'none' }}
            >
              {saving ? 'Sparar...' : hasResponse ? 'Uppdatera anteckning' : 'Markera som besvarad'}
            </button>
            <button onClick={() => setOpen(false)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', background: 'none', color: '#9c9285', border: '1px solid #e5dfd4' }}>
              Stäng
            </button>
            {hasResponse && (
              <button onClick={() => save(null)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', background: 'none', color: '#c0392b', border: '1px solid #f5c6c0', marginLeft: 'auto' }}>
                Ta bort svar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RecensionerPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'obesvarade' | 'besvarade'>('obesvarade')
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [starsFilter, setStarsFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/settings').then(r => r.ok ? r.json() : {}),
    ]).then(([customers, settings]) => {
      setReviews((customers as Review[]).filter(c => c.status === 'reviewed' && c.stars !== null))

      const links: PlatformLink[] = []
      if (settings.google_place_id) links.push({
        label: 'Google',
        icon: '🔵',
        url: `https://search.google.com/local/reviews?placeid=${settings.google_place_id}`,
      })
      if (settings.reco_url) links.push({ label: 'Reco', icon: '🟢', url: settings.reco_url })
      if (settings.hitta_url) links.push({ label: 'Hittaproffs', icon: '🟡', url: settings.hitta_url })
      if (settings.facebook_url) links.push({ label: 'Facebook', icon: '🔷', url: settings.facebook_url })
      if (settings.tripadvisor_url) links.push({ label: 'TripAdvisor', icon: '🟤', url: settings.tripadvisor_url })
      setPlatformLinks(links)

      setLoading(false)
    })
  }, [])

  function handleSaved(id: string, response: string | null) {
    setReviews(prev => prev.map(r =>
      r.id === id
        ? { ...r, owner_response: response, owner_responded_at: response ? new Date().toISOString() : null }
        : r
    ))
  }

  const unanswered = reviews.filter(r => !r.owner_responded_at)
  const answered = reviews.filter(r => !!r.owner_responded_at)
  const source = tab === 'obesvarade' ? unanswered : answered

  const filtered = source
    .filter(r => search === '' || r.name.toLowerCase().includes(search.toLowerCase()) || (r.review_text ?? '').toLowerCase().includes(search.toLowerCase()))
    .filter(r => platformFilter === 'all' || r.platform === platformFilter)
    .filter(r => starsFilter === 'all' || String(r.stars) === starsFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const total = reviews.length
  const avgStars = total > 0
    ? (reviews.reduce((s, r) => s + (r.stars ?? 0), 0) / total).toFixed(1)
    : '–'
  const starDist = [5, 4, 3, 2, 1].map(n => ({
    n,
    count: reviews.filter(r => r.stars === n).length,
    pct: total > 0 ? Math.round((reviews.filter(r => r.stars === n).length / total) * 100) : 0,
  }))

  const usedPlatforms = [...new Set(reviews.map(r => r.platform))]

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: 10, marginBottom: '1.25rem' }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Snittbetyg</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '2.2rem', color: '#0e1410', lineHeight: 1 }}>{avgStars}</div>
            <span style={{ fontSize: 20, color: '#f5a623' }}>★</span>
          </div>
          <div style={{ fontSize: 11, color: '#9c9285', marginTop: 4 }}>{total} recensioner totalt</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Obesvarade</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: '2.2rem', color: unanswered.length > 0 ? '#c47f2a' : '#0e1410', lineHeight: 1 }}>
            {unanswered.length}
          </div>
          <div style={{ fontSize: 11, color: '#9c9285', marginTop: 4 }}>{answered.length} besvarade</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Fördelning</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {starDist.map(({ n, count, pct }) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#9c9285', width: 8, textAlign: 'right', flexShrink: 0 }}>{n}</span>
                <span style={{ fontSize: 11, color: '#f5a623' }}>★</span>
                <div style={{ flex: 1, height: 5, background: '#f0ece6', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: n >= 4 ? '#4d8c68' : n === 3 ? '#c47f2a' : '#dc2626', borderRadius: 3, transition: 'width .4s' }} />
                </div>
                <span style={{ fontSize: 10, color: '#9c9285', width: 20, textAlign: 'right', flexShrink: 0 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kopplade plattformar */}
      {platformLinks.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9c9285' }}>Kopplade:</span>
          {platformLinks.map(pl => (
            <span key={pl.label} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 6, background: '#deeae3', color: '#2e6649' }}>
              {pl.icon} {pl.label}
            </span>
          ))}
        </div>
      )}

      {/* List card */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['obesvarade', 'besvarade'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ fontSize: 12, padding: '5px 13px', borderRadius: 8, cursor: 'pointer', border: 'none', fontWeight: tab === t ? 600 : 400, background: tab === t ? '#0e1410' : '#f0ece6', color: tab === t ? '#fff' : '#5c5445', transition: 'all .15s' }}
              >
                {t === 'obesvarade' ? `Obesvarade (${unanswered.length})` : `Besvarade (${answered.length})`}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök..." style={inStyle} />
            <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} style={{ ...inStyle, cursor: 'pointer', width: 'auto' }}>
              <option value="all">Alla plattformar</option>
              {usedPlatforms.map(p => <option key={p} value={p}>{platformLabel[p] ?? p}</option>)}
            </select>
            <select value={starsFilter} onChange={e => setStarsFilter(e.target.value)} style={{ ...inStyle, cursor: 'pointer', width: 'auto' }}>
              <option value="all">Alla betyg</option>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={String(n)}>{n} ★</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: 12, color: '#9c9285', padding: '.75rem 0' }}>Laddar...</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9c9285', padding: '.75rem 0' }}>
            {total === 0 ? 'Inga recensioner inkomna ännu.' : tab === 'obesvarade' ? 'Alla recensioner är besvarade! 🎉' : 'Inga besvarade recensioner ännu.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(r => (
              <ReviewCard key={r.id} r={r} platformLinks={platformLinks} onSaved={handleSaved} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, padding: '1rem',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#9c9285', fontWeight: 500, marginBottom: '.3rem',
}
const inStyle: React.CSSProperties = {
  padding: '6px 10px', background: '#f7f3ec', border: '1px solid #e5dfd4',
  borderRadius: 7, fontFamily: 'inherit', fontSize: 12, color: '#0e1410', outline: 'none',
}
