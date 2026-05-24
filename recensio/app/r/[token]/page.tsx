
'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>()
  const [stars, setStars] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [stage, setStage] = useState<'stars' | 'feedback' | 'done'>('stars')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitStars(s: number) {
    setLoading(true)
    const res = await fetch(`/api/review/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars: s }),
    })
    const data = await res.json()
    if (s >= 4 && data.redirectUrl) {
      window.location.href = data.redirectUrl
    } else if (s < 4) {
      setStage('feedback')
    } else {
      setStage('done')
    }
    setLoading(false)
  }

  async function submitFeedback() {
    if (!feedback.trim()) return
    setLoading(true)
    await fetch(`/api/review/${token}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    })
    setStage('done')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3ec', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: '#fff', border: '1px solid #e5dfd4', borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, marginBottom: '1.5rem', color: '#0e1410' }}>
          Recens<span style={{ color: '#4d8c68' }}>io</span>
        </div>

        {stage === 'stars' && (
          <>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', marginBottom: '.5rem' }}>Hur gick jobbet?</h1>
            <p style={{ fontSize: 14, color: '#9c9285', marginBottom: '2rem' }}>Det tar bara 30 sekunder.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => { setStars(s); submitStars(s) }}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2.5rem', color: s <= (hovered || stars) ? '#f4a823' : '#e5dfd4', transition: 'color .1s' }}
                >
                  ★
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#9c9285' }}>Välj antal stjärnor</p>
          </>
        )}

        {stage === 'feedback' && (
          <>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', marginBottom: '.5rem' }}>Vad hände?</h1>
            <p style={{ fontSize: 14, color: '#9c9285', marginBottom: '1.5rem' }}>Din feedback går direkt till företaget — publiceras aldrig offentligt.</p>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Berätta vad som hände..."
              style={{ width: '100%', minHeight: 120, padding: '10px 14px', border: '1px solid #e5dfd4', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, resize: 'vertical', outline: 'none', marginBottom: '1rem' }}
            />
            <button onClick={submitFeedback} disabled={loading || !feedback.trim()} style={{ width: '100%', background: '#1a3d2b', color: '#fff', border: 'none', padding: 13, borderRadius: 10, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Skickar...' : 'Skicka feedback →'}
            </button>
          </>
        )}

        {stage === 'done' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', marginBottom: '.5rem' }}>Tack för din feedback!</h1>
            <p style={{ fontSize: 14, color: '#9c9285' }}>Vi uppskattar att du tog dig tid.</p>
          </>
        )}
      </div>
    </div>
  )
}
