'use client'
import { E } from '../Editable'
import { type SiteConfig, type EditHandlers } from '../SiteEditor'

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function LuxeTemplate({ config, h }: { config: SiteConfig; h: EditHandlers }) {
  const p = config.primaryColor
  const a = config.secondaryColor
  const text = '#f0ead6'
  const muted = 'rgba(240,234,214,0.5)'
  const faint = 'rgba(240,234,214,0.08)'
  const navLink: React.CSSProperties = { color: muted, fontSize: '12px', letterSpacing: '0.1em', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: 0, textDecoration: 'none', transition: 'color 0.2s' }

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: p, color: text, minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${faint}`, background: p, padding: '0 64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        <E value={config.brandName} onChange={v => h.update('brandName', v)}
          style={{ fontSize: '16px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 400, cursor: 'text' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {[['services', 'Services'], ['about', 'About'], ['contact', 'Contact']].map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); go(id) }}
              style={navLink}
              onMouseOver={e => (e.currentTarget.style.color = text)}
              onMouseOut={e => (e.currentTarget.style.color = muted)}
            >{label}</a>
          ))}
          {config.pages.map(pg => (
            <a key={pg.id} href="#" onClick={e => { e.preventDefault(); h.navigatePage(pg.id) }}
              style={navLink}
              onMouseOver={e => (e.currentTarget.style.color = text)}
              onMouseOut={e => (e.currentTarget.style.color = muted)}
            >{pg.name}</a>
          ))}
          <a href="#contact" onClick={e => { e.preventDefault(); go('contact') }}
            style={{ background: a, color: p, padding: '9px 22px', fontSize: '11px', letterSpacing: '0.12em', fontFamily: 'inherit', border: 'none', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
            <E value={config.heroCta} onChange={v => h.update('heroCta', v)} />
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{ minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 64px' }}>
        <div style={{ width: '48px', height: '1px', background: a, marginBottom: '36px' }} />
        <E value={config.tagline} onChange={v => h.update('tagline', v)}
          style={{ color: a, letterSpacing: '0.3em', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '28px' }} />
        <E value={config.heroHeadline} onChange={v => h.update('heroHeadline', v)}
          style={{ fontSize: '58px', fontWeight: 300, lineHeight: 1.15, maxWidth: '700px', display: 'block', marginBottom: '28px', letterSpacing: '-0.01em' }} />
        <E value={config.heroSubtext} onChange={v => h.update('heroSubtext', v)} multiline
          style={{ color: muted, fontSize: '17px', maxWidth: '480px', lineHeight: 1.75, display: 'block', marginBottom: '52px' }} />
        <a href="#contact" onClick={e => { e.preventDefault(); go('contact') }}
          style={{ background: a, color: p, padding: '14px 36px', fontSize: '12px', letterSpacing: '0.12em', fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
          <E value={config.heroCta} onChange={v => h.update('heroCta', v)} />
        </a>
        <div style={{ width: '48px', height: '1px', background: 'rgba(240,234,214,0.15)', marginTop: '52px' }} />
      </section>

      {/* ── Services ── */}
      <section id="services" style={{ padding: '80px 64px', borderTop: `1px solid ${faint}` }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <span style={{ color: a, letterSpacing: '0.25em', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>Our Services</span>
          <div style={{ width: '36px', height: '1px', background: 'rgba(240,234,214,0.15)', margin: '0 auto' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '960px', margin: '0 auto' }}>
          {config.services.map(svc => (
            <div key={svc.id} className="relative group/svc"
              style={{ background: 'rgba(240,234,214,0.03)', border: `1px solid ${faint}`, borderTop: `2px solid ${a}`, padding: '28px 22px' }}>
              <button onClick={() => h.removeService(svc.id)}
                className="absolute top-2 right-2 opacity-0 group-hover/svc:opacity-100 transition-opacity"
                style={{ background: 'rgba(240,234,214,0.08)', color: muted, border: 'none', width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', lineHeight: '20px', padding: 0 }}>×</button>
              <E value={svc.name} onChange={v => h.updateService(svc.id, 'name', v)}
                style={{ display: 'block', fontSize: '14px', fontWeight: 400, letterSpacing: '0.05em', marginBottom: '10px' }} />
              <E value={svc.description} onChange={v => h.updateService(svc.id, 'description', v)} multiline
                style={{ color: muted, fontSize: '13px', lineHeight: 1.6 }} />
            </div>
          ))}
          {config.services.length < 9 && (
            <button onClick={h.addService}
              style={{ border: `1px dashed rgba(240,234,214,0.15)`, padding: '28px 22px', color: 'rgba(240,234,214,0.25)', fontSize: '13px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.05em' }}>
              + Add service
            </button>
          )}
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{ padding: '100px 64px', borderTop: `1px solid ${faint}` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div>
            <E value={config.aboutHeadline} onChange={v => h.update('aboutHeadline', v)}
              style={{ fontSize: '38px', fontWeight: 300, lineHeight: 1.3, display: 'block', marginBottom: '24px', letterSpacing: '-0.01em' }} />
            <E value={config.aboutText} onChange={v => h.update('aboutText', v)} multiline
              style={{ color: muted, fontSize: '15px', lineHeight: 1.85 }} />
          </div>
          <div style={{ background: 'rgba(240,234,214,0.04)', border: `1px solid ${faint}`, aspectRatio: '4/5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(240,234,214,0.15)', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Photo</span>
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
          <section style={{ padding: '80px 64px', borderTop: `1px solid ${faint}` }}>
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                <span style={{ color: a, letterSpacing: '0.25em', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>From our blog</span>
                <div style={{ width: '36px', height: '1px', background: `${text}18`, margin: '0 auto' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
                {articles.map(art => (
                  <div key={art.id} onClick={() => h.navigateArticle(art.pageId, art.id)}
                    style={{ cursor: 'pointer', borderTop: `1px solid ${faint}`, paddingTop: '24px' }}>
                    <p style={{ color: a, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>{art.publishedAt}</p>
                    <p style={{ fontSize: '16px', fontWeight: 400, lineHeight: 1.4, marginBottom: '10px', color: text, transition: 'color 0.2s' }}
                      onMouseOver={e => (e.currentTarget.style.color = a)} onMouseOut={e => (e.currentTarget.style.color = text)}>{art.title}</p>
                    <p style={{ color: muted, fontSize: '13px', lineHeight: 1.65 }}>{art.excerpt}</p>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '48px' }}>
                <button onClick={() => h.navigatePage(articles[0].pageId)}
                  style={{ background: 'transparent', color: a, border: `1px solid ${faint}`, padding: '12px 36px', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'inherit', cursor: 'pointer' }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = a)}
                  onMouseOut={e => (e.currentTarget.style.borderColor = faint)}>
                  See all articles
                </button>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ── Contact ── */}
      <section id="contact" style={{ padding: '80px 64px', borderTop: `1px solid ${faint}`, background: 'rgba(240,234,214,0.02)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ color: a, letterSpacing: '0.25em', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>Find Us</span>
          <div style={{ width: '36px', height: '1px', background: 'rgba(240,234,214,0.15)', margin: '0 auto 48px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px', textAlign: 'left', marginBottom: '48px' }}>
            {[
              { label: 'Address', key: 'address' as const, multiline: true },
              { label: 'Phone',   key: 'phone'   as const, multiline: false },
              { label: 'Hours',   key: 'businessHours' as const, multiline: false },
            ].map(({ label, key, multiline }) => (
              <div key={key}>
                <p style={{ color: a, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px' }}>{label}</p>
                <E value={config[key]} onChange={v => h.update(key, v)} multiline={multiline}
                  style={{ color: text, fontSize: '14px', lineHeight: 1.7 }} />
              </div>
            ))}
          </div>
          {/* Map placeholder */}
          <div style={{ width: '100%', height: '200px', background: 'rgba(240,234,214,0.04)', border: `1px solid ${faint}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(240,234,214,0.15)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Map — synced from Google Business Profile</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${faint}`, padding: '36px 64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(240,234,214,0.25)' }}>{config.brandName}</span>
        <span style={{ color: 'rgba(240,234,214,0.2)', fontSize: '12px' }}>© 2025</span>
      </footer>
    </div>
  )
}
