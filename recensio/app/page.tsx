import Link from 'next/link'
import PricingSection from './PricingSection'

export default function LandingPage() {
  return (
    <main style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0e1410', background: '#f7f3ec', minHeight: '100vh' }}>
      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(14,20,16,.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '0 2rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 21, color: '#fff', letterSpacing: '-.03em' }}>
          Recens<span style={{ color: '#4d8c68' }}>io</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href="#features" style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, padding: '7px 14px', textDecoration: 'none' }}>Funktioner</a>
          <a href="#pricing" style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, padding: '7px 14px', textDecoration: 'none' }}>Priser</a>
          <Link href="/login" style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, padding: '7px 14px', textDecoration: 'none' }}>Logga in</Link>
          <Link href="/login" style={{ background: '#4d8c68', color: '#fff', fontSize: 14, fontWeight: 500, padding: '9px 20px', borderRadius: 8, textDecoration: 'none' }}>Boka demo →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: '#0e1410', padding: '7rem 0 5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.65)', fontSize: 12, fontWeight: 500, padding: '5px 16px', borderRadius: 999, marginBottom: '2rem' }}>
            🇸🇪 Byggt för svenska serviceföretag
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(2.8rem,7vw,5.5rem)', lineHeight: 1.04, letterSpacing: '-.04em', color: '#fff', marginBottom: '1.5rem' }}>
            Fler recensioner.<br /><em style={{ fontStyle: 'italic', color: '#4d8c68' }}>Automatiskt.</em>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,.5)', maxWidth: 520, margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
            Recensio kontaktar dina kunder direkt efter jobbet och fångar deras 5-stjärniga recension — utan att du lyfter ett finger.
          </p>
          <Link href="/login" style={{ background: '#fff', color: '#0e1410', fontSize: 15, fontWeight: 600, padding: '15px 32px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>
            Boka en demo
          </Link>
        </div>
      </section>

      {/* STATS */}
      <div style={{ background: '#1a3d2b', padding: '1.5rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', maxWidth: 700, margin: '0 auto', padding: '0 2rem' }}>
          {([['Automatiskt', 'Inget manuellt arbete krävs'], ['SMS + e-post', 'Når kunden på rätt kanal'], ['Google & Reco.se', 'De plattformar som räknas']] as const).map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center', padding: '0 1.5rem', borderLeft: '1px solid rgba(255,255,255,.15)' }}>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: '2.1rem', color: '#fff', display: 'block', lineHeight: 1 }}>{n}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', display: 'block', marginTop: 4 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ padding: '5rem 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2e6649', marginBottom: '.75rem' }}>Funktioner</div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(1.9rem,4vw,2.9rem)', lineHeight: 1.12, marginBottom: '2rem' }}>Allt du behöver.<br />Inget du inte behöver.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
            {([
              ['✉️', 'Automatiska utskick', 'SMS skickas automatiskt i ditt namn. Du skriver mallen en gång — resten sköter sig självt.'],
              ['🛡️', 'Negativt filter', 'Missnöjda kunder fångas upp privat. Du hanterar feedbacken direkt i dashboarden.'],
              ['📊', 'Kampanjhantering', 'Skapa, redigera och ta bort kampanjer. Sätt individuella kampanjer per kund.'],
              ['🌐', 'Hemsidewidget', 'Bädda in dina bästa recensioner live på din hemsida med en kodrad.'],
              ['👥', 'Referral-program', 'Nöjda kunder bjuds automatiskt in att värva en vän med personlig rabattkod.'],
              ['⭐', 'Reco.se & Hittaproffs', 'Native-stöd för plattformarna svenska kunder faktiskt använder.'],
            ] as const).map(([ico, title, desc]) => (
              <div key={title} style={{ background: '#f7f3ec', border: '1px solid #e5dfd4', borderRadius: 14, padding: '1.5rem' }}>
                <div style={{ width: 42, height: 42, background: '#deeae3', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: '1rem' }}>{ico}</div>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: '.4rem' }}>{title}</h3>
                <p style={{ fontSize: 13, color: '#5c5445', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <PricingSection />

      {/* CTA */}
      <div style={{ background: '#1a3d2b', padding: '7rem 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: '1rem', lineHeight: 1.12 }}>
            Redo att få <em style={{ fontStyle: 'italic', color: '#4d8c68' }}>fler recensioner?</em>
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,.5)', marginBottom: '2rem' }}>30 minuter, inga förpliktelser.</p>
          <Link href="/login" style={{ background: '#fff', color: '#1a3d2b', fontSize: 15, fontWeight: 600, padding: '16px 36px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>
            Boka din demo →
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#0e1410', padding: '2.5rem 0', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'rgba(255,255,255,.45)' }}>Recens<span style={{ color: '#4d8c68' }}>io</span></div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {['Integritetspolicy', 'Villkor', 'GDPR', 'hello@recensio.se'].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.2)' }}>© 2026 Recensio AB · Stockholm</div>
        </div>
      </footer>
    </main>
  )
}
