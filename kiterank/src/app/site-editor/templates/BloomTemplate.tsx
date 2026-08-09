'use client'
import { E } from '../Editable'
import { type SiteConfig, type EditHandlers } from '../SiteEditor'

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function BloomTemplate({ config, h }: { config: SiteConfig; h: EditHandlers }) {
  const p = config.primaryColor
  const a = config.secondaryColor
  const dark = '#2d1520'
  const muted = '#6b3a4e'
  const navLink: React.CSSProperties = { color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: 0, textDecoration: 'none', transition: 'color 0.2s' }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#fef0f4', color: dark, minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: p, padding: '0 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
        <E value={config.brandName} onChange={v => h.update('brandName', v)}
          style={{ color: '#fff', fontSize: '18px', fontWeight: 600, letterSpacing: '0.04em', cursor: 'text' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {[['services', 'Services'], ['about', 'About'], ['contact', 'Contact']].map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); go(id) }}
              style={navLink}
              onMouseOver={e => (e.currentTarget.style.color = '#fff')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            >{label}</a>
          ))}
          {config.pages.map(pg => (
            <a key={pg.id} href="#" onClick={e => { e.preventDefault(); h.navigatePage(pg.id) }}
              style={navLink}
              onMouseOver={e => (e.currentTarget.style.color = '#fff')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            >{pg.name}</a>
          ))}
          <a href="#contact" onClick={e => { e.preventDefault(); go('contact') }}
            style={{ background: '#fff', color: p, padding: '9px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
            <E value={config.heroCta} onChange={v => h.update('heroCta', v)} />
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{ background: `linear-gradient(160deg, ${a}55 0%, #fef0f4 60%)`, padding: '100px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '10%', width: '280px', height: '280px', borderRadius: '50%', background: `${a}30`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '5%', width: '160px', height: '160px', borderRadius: '50%', background: `${p}15`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <E value={config.tagline} onChange={v => h.update('tagline', v)}
            style={{ color: p, fontSize: '12px', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '20px' }} />
          <E value={config.heroHeadline} onChange={v => h.update('heroHeadline', v)}
            style={{ fontSize: '52px', fontWeight: 700, lineHeight: 1.15, maxWidth: '640px', margin: '0 auto', display: 'block', marginBottom: '20px', color: '#1a0a10' }} />
          <E value={config.heroSubtext} onChange={v => h.update('heroSubtext', v)} multiline
            style={{ color: muted, fontSize: '16px', maxWidth: '460px', lineHeight: 1.7, margin: '0 auto', display: 'block', marginBottom: '44px' }} />
          <a href="#contact" onClick={e => { e.preventDefault(); go('contact') }}
            style={{ background: p, color: '#fff', padding: '14px 36px', borderRadius: '100px', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
            <E value={config.heroCta} onChange={v => h.update('heroCta', v)} />
          </a>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" style={{ padding: '80px 56px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#1a0a10', margin: '0 0 8px' }}>What we offer</h2>
        <p style={{ textAlign: 'center', color: muted, fontSize: '15px', marginBottom: '48px' }}>Every service tailored to you</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '920px', margin: '0 auto' }}>
          {config.services.map(svc => (
            <div key={svc.id} className="relative group/svc"
              style={{ background: '#fff', borderRadius: '16px', padding: '28px 22px', boxShadow: '0 2px 12px rgba(157,79,106,0.08)' }}>
              <button onClick={() => h.removeService(svc.id)}
                className="absolute top-2 right-2 opacity-0 group-hover/svc:opacity-100 transition-opacity"
                style={{ background: '#f0e0e8', color: '#9d4f6a', border: 'none', width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: '20px' }}>×</button>
              <div style={{ width: '32px', height: '3px', background: p, borderRadius: '2px', marginBottom: '14px' }} />
              <E value={svc.name} onChange={v => h.updateService(svc.id, 'name', v)}
                style={{ display: 'block', fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#1a0a10' }} />
              <E value={svc.description} onChange={v => h.updateService(svc.id, 'description', v)} multiline
                style={{ color: muted, fontSize: '13px', lineHeight: 1.65 }} />
            </div>
          ))}
          {config.services.length < 9 && (
            <button onClick={h.addService}
              style={{ border: '2px dashed rgba(157,79,106,0.2)', borderRadius: '16px', padding: '28px 22px', color: 'rgba(157,79,106,0.4)', fontSize: '13px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
              + Add service
            </button>
          )}
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{ background: '#fff', padding: '80px 56px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <div style={{ background: `${a}25`, borderRadius: '20px', aspectRatio: '4/5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: p, opacity: 0.4, fontSize: '13px', letterSpacing: '0.1em' }}>Photo</span>
          </div>
          <div>
            <E value={config.aboutHeadline} onChange={v => h.update('aboutHeadline', v)}
              style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1.25, display: 'block', marginBottom: '20px', color: '#1a0a10' }} />
            <E value={config.aboutText} onChange={v => h.update('aboutText', v)} multiline
              style={{ color: muted, fontSize: '15px', lineHeight: 1.8 }} />
          </div>
        </div>
      </section>

      {/* ── Latest articles ── */}
      {(() => {
        const articles = (config.pages ?? [])
          .flatMap(pg => (pg.articles ?? []).map(a => ({ ...a, pageId: pg.id })))
          .sort((x, y) => y.publishedAt.localeCompare(x.publishedAt))
          .slice(0, 3)
        if (!articles.length) return null
        return (
          <section style={{ padding: '80px 56px', background: '#fff' }}>
            <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 700, color: '#1a0a10', margin: '0 0 8px' }}>Latest tips</h2>
            <p style={{ textAlign: 'center', color: muted, fontSize: '15px', marginBottom: '48px' }}>Inspiration and advice from our stylists</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '920px', margin: '0 auto' }}>
              {articles.map(art => (
                <div key={art.id} onClick={() => h.navigateArticle(art.pageId, art.id)}
                  style={{ background: '#fef0f4', borderRadius: '16px', padding: '28px 22px', cursor: 'pointer' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#fde8ef')}
                  onMouseOut={e => (e.currentTarget.style.background = '#fef0f4')}>
                  <p style={{ color: p, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 500 }}>{art.publishedAt}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#1a0a10', lineHeight: 1.35, marginBottom: '10px' }}>{art.title}</p>
                  <p style={{ color: muted, fontSize: '13px', lineHeight: 1.65, marginBottom: '16px' }}>{art.excerpt}</p>
                  <span style={{ color: p, fontSize: '12px', fontWeight: 600 }}>Read more →</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button onClick={() => h.navigatePage(articles[0].pageId)}
                style={{ background: p, color: '#fff', padding: '13px 36px', borderRadius: '100px', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', border: 'none', cursor: 'pointer' }}
                onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
                See all articles
              </button>
            </div>
          </section>
        )
      })()}

      {/* ── Contact ── */}
      <section id="contact" style={{ background: p, padding: '80px 56px', color: '#fff' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>Visit us</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '48px', fontSize: '15px' }}>We would love to meet you</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', marginBottom: '48px', textAlign: 'left' }}>
            {[
              { label: 'Address', key: 'address' as const, multiline: true },
              { label: 'Phone',   key: 'phone'   as const, multiline: false },
              { label: 'Hours',   key: 'businessHours' as const, multiline: false },
            ].map(({ label, key, multiline }) => (
              <div key={key} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</p>
                <E value={config[key]} onChange={v => h.update(key, v)} multiline={multiline}
                  style={{ color: '#fff', fontSize: '14px', lineHeight: 1.65 }} />
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Map — synced from Google Business Profile</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: p, borderTop: '1px solid rgba(255,255,255,0.1)', padding: '36px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{config.brandName}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>© 2025</span>
      </footer>
    </div>
  )
}
