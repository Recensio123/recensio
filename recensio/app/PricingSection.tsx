'use client'
import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  { tier: 'Starter', monthlyPrice: 349, desc: 'För dig som precis börjat.', features: ['Upp till 50 kunder/mån', 'Automatiska SMS + e-post', 'Google-recensioner', 'Manuell kundläggning'], featured: false },
  { tier: 'Pro', monthlyPrice: 599, desc: 'För etablerade serviceföretag.', features: ['Upp till 500 kunder/mån', 'Google + Reco.se + Hittaproffs', 'Koppla affärssystem/kalender', 'Kampanjhantering', 'Referral-program', 'Hemsidewidget'], featured: true },
  { tier: 'Growth', monthlyPrice: 999, desc: 'För hög volym och flera team.', features: ['Obegränsat antal kunder', 'Allt i Pro', 'Flera teammedlemmar', 'Prioriterad support'], featured: false },
]

export default function PricingSection() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" style={{ padding: '5rem 0', background: '#fdfcf9' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2e6649', marginBottom: '.75rem' }}>Priser</div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(1.9rem,4vw,2.9rem)', marginBottom: '.75rem' }}>Enkla priser.<br />Inga överraskningar.</h2>
        <p style={{ fontSize: '1rem', color: '#5c5445', marginBottom: '1.75rem' }}>Alla priser exklusive moms.</p>

        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: '2.5rem' }}>
          <span style={{ fontSize: 14, fontWeight: yearly ? 400 : 600, color: yearly ? '#9c9285' : '#0e1410' }}>Månadsvis</span>
          <div
            onClick={() => setYearly(v => !v)}
            style={{ width: 44, height: 24, background: '#1a3d2b', borderRadius: 12, position: 'relative', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{ position: 'absolute', top: 3, left: 3, width: 18, height: 18, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'transform .2s', transform: yearly ? 'translateX(20px)' : 'translateX(0)' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: yearly ? 600 : 400, color: yearly ? '#0e1410' : '#9c9285', display: 'flex', alignItems: 'center', gap: 8 }}>
            Årsvis
            <span style={{ fontSize: 11, fontWeight: 600, background: '#deeae3', color: '#2e6649', padding: '2px 9px', borderRadius: 999 }}>Spara 20%</span>
          </span>
        </div>

        {/* Pricing cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
          {PLANS.map(p => {
            const price = yearly ? Math.round(p.monthlyPrice * 0.8) : p.monthlyPrice
            return (
              <div key={p.tier} style={{ background: p.featured ? '#1a3d2b' : '#fdfcf9', border: `1px solid ${p.featured ? '#1a3d2b' : '#e5dfd4'}`, borderRadius: 20, padding: '2rem', position: 'relative' }}>
                {p.featured && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#c47f2a', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 16px', borderRadius: 999, whiteSpace: 'nowrap' }}>Mest populär</div>}
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: p.featured ? 'rgba(255,255,255,.45)' : '#9c9285', marginBottom: '.9rem' }}>{p.tier}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: '3rem', color: p.featured ? '#fff' : '#0e1410', lineHeight: 1 }}>{price}</div>
                <div style={{ fontSize: 13, color: p.featured ? 'rgba(255,255,255,.4)' : '#9c9285', marginBottom: '.25rem' }}>
                  {yearly ? 'kr / mån, faktureras årsvis' : 'kr / månad'}
                </div>
                <div style={{ fontSize: 13, color: p.featured ? 'rgba(255,255,255,.55)' : '#5c5445', margin: '.9rem 0 1.25rem' }}>{p.desc}</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.75rem', padding: 0 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ fontSize: 13, color: p.featured ? 'rgba(255,255,255,.7)' : '#5c5445', display: 'flex', gap: 8 }}>
                      <span style={{ color: p.featured ? '#4d8c68' : '#2e6649', fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" style={{ display: 'block', padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none', background: p.featured ? '#fff' : 'transparent', color: p.featured ? '#1a3d2b' : '#0e1410', border: p.featured ? 'none' : '1.5px solid #e5dfd4' }}>
                  Boka demo
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
