import type { Template, TemplateColors } from '@/lib/templates'
import type { SiteContent } from '@/components/site/PreviewSite'
import { type ServiceEntry, type ServiceCategory, SERVICES, slugifyService } from '@/lib/services-data'
import { SiteNav } from '@/components/site/PreviewSite'
/* Direkt ur lib, inte via PreviewSite: den här sidan renderas på servern och
   PreviewSite är en klientmodul. Vägen dit igenom ger ett rent fel. */
import { getIndConfig, cfgLabel } from '@/lib/siteIndustry'
import { siteLabel } from '@/lib/siteLabels'
import { sectionPageTitle } from '@/lib/sectionPages'

/* ── re-export for consumers ────────────────────────────────────────────── */
export type { ServiceEntry, ServiceCategory }
export { SERVICES }


/* ── Helpers ────────────────────────────────────────────────────────────── */

function isDark(hex: string): boolean {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return true
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'


/* ── Footer ─────────────────────────────────────────────────────────────── */

function Footer({ c, content }: { c: TemplateColors; content: SiteContent }) {
  const footerBg = isDark(c.bg) ? c.b : (isDark(c.nav) ? c.nav : c.b)
  const fg       = isDark(footerBg) ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const fgStrong = isDark(footerBg) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
  return (
    <footer style={{ background: footerBg, padding: '48px 8%', borderTop: `1px solid ${isDark(footerBg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: fgStrong, marginBottom: 8, fontFamily: F }}>{content.businessName}</p>
          <p style={{ fontSize: 13, color: fg, fontFamily: F }}>{content.tagline}</p>
        </div>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontFamily: F }}>Kontakt</p>
            <p style={{ fontSize: 13, color: fg, marginBottom: 6, fontFamily: F }}>{content.phone}</p>
            <p style={{ fontSize: 13, color: fg, fontFamily: F }}>{content.address}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontFamily: F }}>Öppettider</p>
            <p style={{ fontSize: 13, color: fg, fontFamily: F }}>{content.hours}</p>
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${isDark(footerBg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, marginTop: 40, paddingTop: 24, fontSize: 12, color: fg, fontFamily: F }}>
        © 2025 {content.businessName}
      </div>
    </footer>
  )
}

/* ── Service table layouts ──────────────────────────────────────────────── */

/* Standard: card grid per category */
function StandardServiceList({ c, categories, serviceHref }: { c: TemplateColors; categories: ServiceCategory[]; serviceHref?: (name: string) => string }) {
  const cardBg  = c.b
  const cardSep = isDark(cardBg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  return (
    <div>
      {categories.map(cat => (
        <div key={cat.category} style={{ marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: c.h, letterSpacing: -0.5, fontFamily: F, margin: 0 }}>{cat.category}</h2>
            <div style={{ flex: 1, height: 1, background: isDark(c.bg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {cat.items.map(item => (
              <div key={item.name} style={{ background: cardBg, padding: '24px 24px', borderRadius: 10, border: `1px solid ${cardSep}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: c.h, marginBottom: 6, fontFamily: F }}>
                    {serviceHref
                      ? <a href={serviceHref(item.name)} style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: c.a, textUnderlineOffset: 3 }}>{item.name}</a>
                      : item.name}
                  </p>
                  <p style={{ fontSize: 13, color: c.s, lineHeight: 1.6, fontFamily: F }}>{item.desc}</p>
                  {item.duration && !item.hideDuration && <p style={{ fontSize: 12, color: c.a, marginTop: 8, fontFamily: F }}>{item.duration}</p>}
                </div>
                {!item.hidePrice && <p style={{ fontSize: 13, fontWeight: 700, color: c.a, whiteSpace: 'nowrap', fontFamily: F, marginTop: 2 }}>{item.price}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* Editorial: numbered list rows */
function EditorialServiceList({ c, categories, serviceHref }: { c: TemplateColors; categories: ServiceCategory[]; serviceHref?: (name: string) => string }) {
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  return (
    <div>
      {categories.map(cat => (
        <div key={cat.category} style={{ marginBottom: 64 }}>
          <p style={{ fontSize: 11, color: c.a, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 24, fontFamily: F }}>— {cat.category}</p>
          {cat.items.map((item, i) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'baseline', gap: 24, padding: '22px 0', borderBottom: `1px solid ${divider}` }}>
              <span style={{ fontSize: 12, color: c.a, fontWeight: 700, minWidth: 28, fontFamily: F }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: c.h, marginBottom: 4, fontFamily: F }}>
                  {serviceHref
                    ? <a href={serviceHref(item.name)} style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: c.a, textUnderlineOffset: 3 }}>{item.name}</a>
                    : item.name}
                </p>
                <p style={{ fontSize: 14, color: c.s, fontFamily: F }}>{item.desc}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {!item.hidePrice && <p style={{ fontSize: 14, fontWeight: 600, color: c.a, whiteSpace: 'nowrap', fontFamily: F }}>{item.price}</p>}
                {item.duration && !item.hideDuration && <p style={{ fontSize: 12, color: c.s, marginTop: 3, fontFamily: F }}>{item.duration}</p>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* Luxury: minimal spaced rows */
function LuxuryServiceList({ c, categories, serviceHref }: { c: TemplateColors; categories: ServiceCategory[]; serviceHref?: (name: string) => string }) {
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {categories.map(cat => (
        <div key={cat.category} style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 11, color: c.a, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8, fontFamily: F }}>{cat.category}</p>
          <div style={{ height: 1, background: `linear-gradient(to right, ${c.a}80, transparent)`, marginBottom: 32 }} />
          {cat.items.map(item => (
            <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, padding: '20px 0', borderBottom: `1px solid ${divider}` }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: c.h, marginBottom: 4, letterSpacing: -0.2, fontFamily: F }}>
                  {serviceHref
                    ? <a href={serviceHref(item.name)} style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: c.a, textUnderlineOffset: 3 }}>{item.name}</a>
                    : item.name}
                </p>
                <p style={{ fontSize: 13, color: c.s, fontFamily: F }}>{item.desc}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {!item.hidePrice && <p style={{ fontSize: 14, color: c.a, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: F }}>{item.price}</p>}
                {item.duration && !item.hideDuration && <p style={{ fontSize: 12, color: c.s, marginTop: 2, fontFamily: F }}>{item.duration}</p>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ── Hero per layout ────────────────────────────────────────────────────── */

/*
 * Vad prislistans topp säger.
 *
 * Den sa tidigare tre saker och alla tre var fel för den här sidan: ett ord ur
 * den gamla menylistan, företagsnamnet som rubrik, och en slogan under.
 * Företagsnamnet står redan i loggan och i webbläsarfliken — att upprepa det som
 * sidans rubrik betyder att den enda raden som borde säga vad sidan innehåller
 * i stället säger vad salongen heter.
 *
 * Nu är rubriken sidans namn, det salongen själv satt i panelen, precis som på
 * om oss och kontakt. Under den står vad sidan innehåller och var salongen
 * finns — byggt bara ur fält de fyllt i, inget påhittat om deras verksamhet.
 */
function pageIntro(content: SiteContent): { rubrik: string; förklaring: string } {
  const rubrik = sectionPageTitle(content, 'pricelist')

  /* Vad som faktiskt står på sidan. Antalet nämns inte: en salong som lägger
     till en behandling ska inte få en text som plötsligt ljuger.
   *
   * Adressen läggs till så länge kunden inte skrivit en egen text. Skriver de
   * en ersätter den vår helt — annars hade vi hängt på en mening i slutet av
   * något de själva formulerat. */
  const egen  = content.labels?.pricePageIntro
  const plats = content.address?.trim()
  const förklaring = egen === undefined
    ? [siteLabel(content.labels, 'pricePageIntro'), plats && `Du hittar oss på ${plats}.`].filter(Boolean).join(' ')
    : egen.trim()

  return { rubrik, förklaring }
}

function PageHero({ c, content, layout }: { c: TemplateColors; content: SiteContent; layout: string }) {
  const { rubrik, förklaring } = pageIntro(content)

  if (layout === 'editorial') {
    const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    return (
      <section style={{ padding: '80px 8% 56px', borderBottom: `1px solid ${divider}` }}>
        <h1 style={{ fontSize: 72, fontWeight: 900, color: c.h, lineHeight: 0.98, letterSpacing: -2.5, maxWidth: 700, fontFamily: F }}>
          {rubrik}
        </h1>
        <p style={{ fontSize: 17, color: c.s, maxWidth: 480, lineHeight: 1.7, marginTop: 28, fontFamily: F }}>
          {förklaring}
        </p>
      </section>
    )
  }

  if (layout === 'luxury') {
    return (
      <section style={{ background: c.bg, padding: '100px 10%', textAlign: 'center' }}>
        <h1 style={{ fontSize: 60, fontWeight: 900, color: c.h, lineHeight: 1.06, maxWidth: 700, margin: '0 auto 20px', letterSpacing: -2, fontFamily: F }}>
          {rubrik}
        </h1>
        <p style={{ fontSize: 17, color: c.s, maxWidth: 460, margin: '0 auto', lineHeight: 1.8, fontFamily: F }}>
          {förklaring}
        </p>
      </section>
    )
  }

  if (layout === 'heritage') {
    const bannerBg = isDark(c.nav) ? c.nav : c.b
    const bannerFg = isDark(bannerBg) ? '#ffffff' : c.h
    return (
      <section style={{ background: bannerBg, padding: '60px 10%', textAlign: 'center' }}>
        <h1 style={{ fontSize: 44, fontWeight: 800, color: bannerFg, lineHeight: 1.1, fontFamily: F, letterSpacing: -1 }}>
          {rubrik}
        </h1>
        <p style={{ fontSize: 17, color: isDark(bannerBg) ? 'rgba(255,255,255,0.65)' : c.s, maxWidth: 420, margin: '16px auto 0', lineHeight: 1.7, fontFamily: F }}>
          {förklaring}
        </p>
      </section>
    )
  }

  /* centered / split / default */
  return (
    <section style={{ background: c.b, padding: '72px 8%', textAlign: layout === 'centered' ? 'center' : 'left' }}>
      <h1 style={{ fontSize: 48, fontWeight: 800, color: c.h, marginBottom: 16, letterSpacing: -1, fontFamily: F, maxWidth: 640 }}>
        {rubrik}
      </h1>
      <p style={{ fontSize: 18, color: c.s, lineHeight: 1.7, maxWidth: 520, fontFamily: F }}>
        {förklaring}
      </p>
    </section>
  )
}

/* ── Main export ────────────────────────────────────────────────────────── */

export function ServicePage({ template, industry, content, basePath }: {
  template: Template
  industry: string
  content: SiteContent
  /** The site's root — /s/<slug> when published, /preview/<id> for demos. */
  basePath?: string
}) {
  const c          = template.colors
  const home       = basePath ?? `/preview/${template.id}`
  // Each service name links to its own keyword page — published sites only,
  // since the demo previews have no such pages
  const serviceHref = basePath?.startsWith('/s/')
    ? (name: string) => `${basePath}/tjanster/${slugifyService(name)}`
    : undefined
  const categories = (content.menuCategories?.length ? content.menuCategories : SERVICES[industry]) ?? SERVICES.other
  const layout     = template.layout

  const isEditorial = layout === 'editorial'
  const isLuxury    = layout === 'luxury'

  /* Bokningsbandets ord. Rubriken hör till branschen — en verkstad säger inte
     samma sak som en salong — resten är sidans egna och bor i siteLabels. */
  const cfg      = getIndConfig(industry)
  const ctaTitel = cfgLabel(content.labels, cfg.ctaBandTitle, 'ctaBandTitle')
  const ctaText  = siteLabel(content.labels, 'ctaBandBody')
  const tillbaka = siteLabel(content.labels, 'backToStart')


  const sectionBg = isEditorial || isLuxury ? c.bg : c.bg


  return (
    <>
      <PageHero c={c} content={content} layout={layout} />

      {/* ── Luxury thin divider */}
      {isLuxury && <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${c.a}60, transparent)`, margin: '0 8%' }} />}

      <section style={{ background: sectionBg, padding: '72px 8%' }}>
        {isEditorial && <EditorialServiceList c={c} categories={categories} serviceHref={serviceHref} />}
        {isLuxury    && <LuxuryServiceList    c={c} categories={categories} serviceHref={serviceHref} />}
        {!isEditorial && !isLuxury && <StandardServiceList c={c} categories={categories} serviceHref={serviceHref} />}
      </section>

      {/* ── CTA strip.
          Varje ord här kommer ur siteLabels och är därmed redigerbart — de
          stod tidigare som textsträngar i koden, osynliga för kunden och
          svenska även på en engelsk sajt. En tömd rad renderas inte alls. */}
      <section style={{ background: c.b, padding: '64px 8%', textAlign: 'center' }}>
        {!!ctaTitel && (
          <h2 style={{ fontSize: 32, fontWeight: 800, color: c.h, marginBottom: 16, letterSpacing: -0.5, fontFamily: F }}>
            {ctaTitel}
          </h2>
        )}
        {!!ctaText && (
          <p style={{ fontSize: 16, color: c.s, marginBottom: 32, fontFamily: F }}>
            {ctaText}
          </p>
        )}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!!content.ctaText?.trim() && (
            <a href={content.bookingUrl || `tel:${content.phone.replace(/\s/g, '')}`}
              style={{ background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700, fontFamily: F, textDecoration: 'none' }}>
              {content.ctaText}
            </a>
          )}
          {/* Pekade tidigare på mallens demo, /preview/<id>, även på en
              publicerad sajt — besökaren hamnade hos någon annans exempel. */}
          {!!tillbaka && (
            <a href={home}
              style={{ background: 'transparent', color: c.h, padding: '14px 28px', borderRadius: 8, fontSize: 15, border: `1px solid ${isDark(c.bg) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`, fontFamily: F, textDecoration: 'none' }}>
              {tillbaka}
            </a>
          )}
        </div>
        <p style={{ fontSize: 13, color: c.s, marginTop: 24, fontFamily: F }}>
          {[content.phone, content.hours, content.address].filter(v => v?.trim()).join('  ·  ')}
        </p>
      </section>

    </>
  )
}
