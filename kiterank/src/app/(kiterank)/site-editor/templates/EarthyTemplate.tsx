'use client'
import { E } from '../Editable'
import { type SiteConfig, type EditHandlers } from '../SiteEditor'

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function EarthyTemplate({ config, h }: { config: SiteConfig; h: EditHandlers }) {
  const p = config.primaryColor
  const a = config.secondaryColor
  const bg = '#faf5ee'
  const textMain = '#2c2c20'
  const textMuted = '#6b6450'
  const navLink: React.CSSProperties = { color: textMuted, fontSize: '13px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: 0, textDecoration: 'none', letterSpacing: '0.04em', transition: 'color 0.2s' }

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: bg, color: textMain, minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: bg, padding: '0 64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', borderBottom: `1px solid ${p}25` }}>
        <E value={config.brandName} onChange={v => h.update('brandName', v)}
          style={{ fontSize: '17px', fontWeight: 400, letterSpacing: '0.08em', color: textMain, cursor: 'text' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {[['services', 'Services'], ['about', 'About'], ['contact', 'Contact']].map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); go(id) }}
              style={navLink}
              onMouseOver={e => (e.currentTarget.style.color = p)}
              onMouseOut={e => (e.currentTarget.style.color = textMuted)}
            >{label}</a>
          ))}
          {config.pages.map(pg => (
            <a key={pg.id} href="#" onClick={e => { e.preventDefault(); h.navigatePage(pg.id) }}
              style={navLink}
              onMouseOver={e => (e.currentTarget.style.color = p)}
              onMouseOut={e => (e.currentTarget.style.color = textMuted)}
            >{pg.name}</a>
          ))}
          <a href="#contact" onClick={e => { e.preventDefault(); go('contact') }}
            style={{ background: p, color: '#fff', padding: '9px 22px', borderRadius: '100px', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', letterSpacing: '0.04em' }}>
            <E value={config.heroCta} onChange={v => h.update('heroCta', v)} />
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '520px', height: '520px', borderRadius: '50%', border: `1.5px solid ${p}25`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '380px', height: '380px', borderRadius: '50%', background: `${a}18`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <E value={config.tagline} onChange={v => h.update('tagline', v)}
            style={{ color: p, fontSize: '12px', fontWeight: 400, letterSpacing: '0.25em', textTransform: 'uppercase', display: 'block', marginBottom: '24px' }} />
          <E value={config.heroHeadline} onChange={v => h.update('heroHeadline', v)}
            style={{ fontSize: '52px', fontWeight: 400, lineHeight: 1.2, maxWidth: '620px', display: 'block', marginBottom: '22px', letterSpacing: '-0.01em' }} />
          <E value={config.heroSubtext} onChange={v => h.update('heroSubtext', v)} multiline
            style={{ color: textMuted, fontSize: '16px', maxWidth: '440px', lineHeight: 1.75, display: 'block', marginBottom: '44px' }} />
          <a href="#contact" onClick={e => { e.preventDefault(); go('contact') }}
            style={{ background: 'transparent', color: p, padding: '12px 32px', borderRadius: '100px', fontSize: '14px', fontFamily: 'inherit', border: `1.5px solid ${p}`, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', letterSpacing: '0.05em' }}>
            <E value={config.heroCta} onChange={v => h.update('heroCta', v)} />
          </a>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" style={{ padding: '80px 64px', background: '#fff' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '30px', fontWeight: 400, margin: 0 }}>Services</h2>
            <div style={{ flex: 1, height: '1px', background: `${p}30`, marginLeft: '8px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {config.services.map(svc => (
              <div key={svc.id} className="relative group/svc"
                style={{ padding: '22px 24px', borderLeft: `3px solid ${p}`, background: `${p}06`, borderRadius: '0 8px 8px 0' }}>
                <button onClick={() => h.removeService(svc.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover/svc:opacity-100 transition-opacity"
                  style={{ background: `${p}20`, color: p, border: 'none', width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: '20px' }}>×</button>
                <E value={svc.name} onChange={v => h.updateService(svc.id, 'name', v)}
                  style={{ display: 'block', fontSize: '15px', fontWeight: 400, marginBottom: '6px', color: textMain }} />
                <E value={svc.description} onChange={v => h.updateService(svc.id, 'description', v)} multiline
                  style={{ color: textMuted, fontSize: '13px', lineHeight: 1.65 }} />
              </div>
            ))}
            {config.services.length < 9 && (
              <button onClick={h.addService}
                style={{ padding: '22px 24px', border: `1.5px dashed ${p}30`, borderRadius: '8px', color: `${p}60`, fontSize: '13px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                + Add service
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{ padding: '80px 64px' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '72px', alignItems: 'center' }}>
          <div>
            <E value={config.aboutHeadline} onChange={v => h.update('aboutHeadline', v)}
              style={{ fontSize: '36px', fontWeight: 400, lineHeight: 1.25, display: 'block', marginBottom: '22px', letterSpacing: '-0.01em' }} />
            <E value={config.aboutText} onChange={v => h.update('aboutText', v)} multiline
              style={{ color: textMuted, fontSize: '15px', lineHeight: 1.85 }} />
          </div>
          <div style={{ background: `${a}30`, borderRadius: '20px', aspectRatio: '4/5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${p}20` }}>
            <span style={{ color: p, opacity: 0.35, fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Photo</span>
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
          <section style={{ padding: '80px 64px', borderTop: `1px solid ${p}25` }}>
            <div style={{ maxWidth: '880px', margin: '0 auto' }}>
              <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '30px', fontWeight: 400, margin: 0 }}>From our blog</h2>
                <div style={{ flex: 1, height: '1px', background: `${p}30`, marginLeft: '8px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
                {articles.map(art => (
                  <div key={art.id} onClick={() => h.navigateArticle(art.pageId, art.id)}
                    style={{ paddingLeft: '16px', borderLeft: `2px solid ${p}40`, cursor: 'pointer' }}>
                    <p style={{ color: p, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>{art.publishedAt}</p>
                    <p style={{ fontSize: '16px', fontWeight: 400, lineHeight: 1.4, marginBottom: '8px', transition: 'color 0.2s', color: textMain }}
                      onMouseOver={e => (e.currentTarget.style.color = p)} onMouseOut={e => (e.currentTarget.style.color = textMain)}>{art.title}</p>
                    <p style={{ color: textMuted, fontSize: '13px', lineHeight: 1.65, marginBottom: '12px' }}>{art.excerpt}</p>
                    <span style={{ color: p, fontSize: '12px', fontWeight: 600 }}>Read more →</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '40px' }}>
                <button onClick={() => h.navigatePage(articles[0].pageId)}
                  style={{ background: 'transparent', color: p, border: `1.5px solid ${p}`, padding: '12px 32px', borderRadius: '100px', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.04em' }}
                  onMouseOver={e => { e.currentTarget.style.background = p; e.currentTarget.style.color = '#fff' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = p }}>
                  See all articles
                </button>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ── Contact ── */}
      <section id="contact" style={{ background: `${p}12`, padding: '80px 64px', borderTop: `1px solid ${p}25` }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '30px', fontWeight: 400, margin: 0 }}>Visit us</h2>
            <div style={{ flex: 1, height: '1px', background: `${p}30`, marginLeft: '8px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                { label: 'Address', key: 'address' as const, multiline: true },
                { label: 'Phone',   key: 'phone'   as const, multiline: false },
                { label: 'Hours',   key: 'businessHours' as const, multiline: false },
              ].map(({ label, key, multiline }) => (
                <div key={key} style={{ paddingLeft: '16px', borderLeft: `2px solid ${p}40` }}>
                  <p style={{ color: p, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>{label}</p>
                  <E value={config[key]} onChange={v => h.update(key, v)} multiline={multiline}
                    style={{ color: textMain, fontSize: '15px', lineHeight: 1.65 }} />
                </div>
              ))}
            </div>
            <div style={{ background: `${a}20`, border: `1.5px solid ${p}20`, borderRadius: '16px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: `${p}50`, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Map — synced from Google Business Profile</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${p}25`, padding: '36px 64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: textMuted, letterSpacing: '0.05em' }}>{config.brandName}</span>
        <span style={{ color: `${textMuted}60`, fontSize: '12px' }}>© 2025</span>
      </footer>
    </div>
  )
}
