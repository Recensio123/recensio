'use client'
import { E } from '../Editable'
import { type SiteConfig, type EditHandlers } from '../SiteEditor'

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function StudioTemplate({ config, h }: { config: SiteConfig; h: EditHandlers }) {
  const p = config.primaryColor
  const a = config.secondaryColor
  const navLink: React.CSSProperties = { fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${p}80`, cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: 0, textDecoration: 'none', transition: 'color 0.2s' }

  return (
    <div style={{ fontFamily: "'Arial', 'Helvetica', sans-serif", background: '#fff', color: p, minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: `2px solid ${p}`, padding: '0 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
        <E value={config.brandName} onChange={v => h.update('brandName', v)}
          style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', cursor: 'text' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {[['services', 'Services'], ['about', 'About'], ['contact', 'Contact']].map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); go(id) }}
              style={navLink}
              onMouseOver={e => (e.currentTarget.style.color = p)}
              onMouseOut={e => (e.currentTarget.style.color = `${p}80`)}
            >{label}</a>
          ))}
          {config.pages.map(pg => (
            <a key={pg.id} href="#" onClick={e => { e.preventDefault(); h.navigatePage(pg.id) }}
              style={navLink}
              onMouseOver={e => (e.currentTarget.style.color = p)}
              onMouseOut={e => (e.currentTarget.style.color = `${p}80`)}
            >{pg.name}</a>
          ))}
          <a href="#contact" onClick={e => { e.preventDefault(); go('contact') }}
            style={{ background: a, color: '#fff', padding: '10px 22px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <E value={config.heroCta} onChange={v => h.update('heroCta', v)} />
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{ display: 'grid', gridTemplateColumns: '55% 45%', minHeight: '85vh' }}>
        <div style={{ padding: '80px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: `2px solid ${p}` }}>
          <E value={config.tagline} onChange={v => h.update('tagline', v)}
            style={{ color: a, fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '28px' }} />
          <E value={config.heroHeadline} onChange={v => h.update('heroHeadline', v)}
            style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1.0, display: 'block', marginBottom: '28px', letterSpacing: '-0.03em' }} />
          <div style={{ width: '56px', height: '4px', background: a, marginBottom: '28px' }} />
          <E value={config.heroSubtext} onChange={v => h.update('heroSubtext', v)} multiline
            style={{ color: `${p}70`, fontSize: '16px', lineHeight: 1.7, maxWidth: '420px', display: 'block', marginBottom: '48px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <a href="#contact" onClick={e => { e.preventDefault(); go('contact') }}
              style={{ background: p, color: '#fff', padding: '16px 36px', borderRadius: '4px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', letterSpacing: '0.05em' }}>
              <E value={config.heroCta} onChange={v => h.update('heroCta', v)} />
            </a>
            <E value={config.phone} onChange={v => h.update('phone', v)}
              style={{ color: a, fontSize: '15px', fontWeight: 700 }} />
          </div>
        </div>
        <div style={{ background: `${p}06`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', top: '30%', background: `${a}08` }} />
          <span style={{ color: `${p}20`, fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', position: 'relative' }}>Photo</span>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" style={{ padding: '80px 56px', borderTop: `2px solid ${p}` }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '56px', margin: '0 0 56px' }}>Services.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
            {config.services.map((svc, i) => (
              <div key={svc.id} className="relative group/svc"
                style={{ padding: '28px 0', borderBottom: `1px solid ${p}15`, paddingRight: i % 2 === 0 ? '48px' : '0', paddingLeft: i % 2 === 1 ? '48px' : '0', borderRight: i % 2 === 0 ? `1px solid ${p}15` : 'none', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <span style={{ color: a, fontSize: '32px', fontWeight: 900, lineHeight: 1, minWidth: '40px', letterSpacing: '-0.03em' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1 }}>
                  <button onClick={() => h.removeService(svc.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover/svc:opacity-100 transition-opacity"
                    style={{ background: '#f5f5f5', color: '#666', border: 'none', width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: '20px' }}>×</button>
                  <E value={svc.name} onChange={v => h.updateService(svc.id, 'name', v)}
                    style={{ display: 'block', fontSize: '16px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.01em' }} />
                  <E value={svc.description} onChange={v => h.updateService(svc.id, 'description', v)} multiline
                    style={{ color: `${p}60`, fontSize: '13px', lineHeight: 1.6 }} />
                </div>
              </div>
            ))}
            {config.services.length < 9 && (
              <button onClick={h.addService}
                style={{ padding: '28px 0', borderBottom: `1px solid ${p}15`, border: `1px dashed ${p}20`, color: `${p}30`, fontSize: '13px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                + Add service
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{ background: p, padding: '80px 56px', color: '#fff' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <E value={config.aboutHeadline} onChange={v => h.update('aboutHeadline', v)}
            style={{ fontSize: '44px', fontWeight: 900, lineHeight: 1.1, display: 'block', marginBottom: '28px', letterSpacing: '-0.03em' }} />
          <E value={config.aboutText} onChange={v => h.update('aboutText', v)} multiline
            style={{ color: 'rgba(255,255,255,0.65)', fontSize: '16px', lineHeight: 1.8, maxWidth: '600px', display: 'block' }} />
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
          <section style={{ padding: '80px 56px', borderTop: `2px solid ${p}` }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 56px' }}>From the blog.</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' }}>
                {articles.map((art, i) => (
                  <div key={art.id} onClick={() => h.navigateArticle(art.pageId, art.id)}
                    style={{ paddingRight: i < 2 ? '40px' : '0', paddingLeft: i > 0 ? '40px' : '0', borderRight: i < 2 ? `1px solid ${p}15` : 'none', cursor: 'pointer' }}>
                    <p style={{ color: a, fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>{art.publishedAt}</p>
                    <p style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.3, marginBottom: '10px', transition: 'color 0.15s' }}
                      onMouseOver={e => (e.currentTarget.style.color = a)} onMouseOut={e => (e.currentTarget.style.color = p)}>{art.title}</p>
                    <p style={{ color: `${p}60`, fontSize: '13px', lineHeight: 1.65, marginBottom: '16px' }}>{art.excerpt}</p>
                    <span style={{ color: a, fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>READ →</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '48px' }}>
                <button onClick={() => h.navigatePage(articles[0].pageId)}
                  style={{ background: p, color: '#fff', padding: '14px 36px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit', border: 'none', cursor: 'pointer' }}
                  onMouseOver={e => (e.currentTarget.style.background = a)}
                  onMouseOut={e => (e.currentTarget.style.background = p)}>
                  See all articles
                </button>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ── Contact ── */}
      <section id="contact" style={{ padding: '80px 56px', borderTop: `2px solid ${p}` }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '32px', margin: '0 0 32px' }}>Find us.</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                { label: 'Address', key: 'address' as const, multiline: true },
                { label: 'Phone',   key: 'phone'   as const, multiline: false },
                { label: 'Hours',   key: 'businessHours' as const, multiline: false },
              ].map(({ label, key, multiline }) => (
                <div key={key}>
                  <p style={{ color: a, fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
                  <E value={config[key]} onChange={v => h.update(key, v)} multiline={multiline}
                    style={{ color: p, fontSize: '15px', lineHeight: 1.6 }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: `${p}06`, border: `2px solid ${p}10`, height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: `${p}25`, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Map — synced from Google Business Profile</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '32px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `2px solid ${p}` }}>
        <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: `${p}40` }}>{config.brandName}</span>
        <span style={{ color: `${p}30`, fontSize: '12px' }}>© 2025</span>
      </footer>
    </div>
  )
}
