import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublishedSite, servicesOf, pricelistIsExternal, type PublishedSite, type ServiceOnSite } from '../../site-data'
import { siteLabel } from '@/lib/siteLabels'
import { siteFontVars, SiteFontFace } from '@/components/SiteFont'

/*
 * One page per service — the keyword landing pages. When someone searches
 * "balayage stockholm" this is the page meant to answer, so everything on it
 * is written around that one service: the name and place in the title, the
 * price up front, and a single action.
 *
 * The dashboard's Synlighet tab tells customers to create exactly these
 * pages; here they exist automatically for every service on the menu.
 */

type Props = { params: Promise<{ slug: string; tjanst: string }> }

async function resolve(slugs: { slug: string; tjanst: string }): Promise<{ site: PublishedSite; service: ServiceOnSite; others: ServiceOnSite[] } | null> {
  const site = await getPublishedSite(slugs.slug)
  if (!site) return null
  const all = servicesOf(site)
  const service = all.find(s => s.slug === slugs.tjanst)
  if (!service) return null
  return { site, service, others: all.filter(s => s.slug !== slugs.tjanst) }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params
  const r = await resolve(p)
  if (!r) return {}

  const { site, service } = r
  const where = site.content.address ? ` i ${site.content.address}` : ''
  return {
    // "Balayage i Södermalm, Stockholm — Studio Söder" — the search phrase is the title
    title: `${service.name}${where} — ${site.content.businessName}`,
    description: `${service.desc}. ${service.price}${service.duration ? ` · ${service.duration}` : ''}. Boka online hos ${site.content.businessName}.`,
    alternates: { canonical: `/s/${site.slug}/tjanster/${service.slug}` },
  }
}

const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'
const isDark = (hex: string) => {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

export default async function ServiceKeywordPage({ params }: Props) {
  const p = await params
  const r = await resolve(p)
  if (!r) notFound()

  // Price list lives on the booking page — the keyword pages step aside too
  if (pricelistIsExternal(r.site)) redirect(`/s/${r.site.slug}`)

  const { site, service, others } = r
  const c = site.template.colors
  const { content } = site
  const base = `/s/${site.slug}`
  const fgSub = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type':    'Service',
    name:        service.name,
    description: service.desc,
    provider: { '@type': 'LocalBusiness', name: content.businessName, telephone: content.phone },
    areaServed:  content.address,
  }

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F, ...siteFontVars(content) }}>
      <SiteFontFace content={content} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />

      {/* Nav — same bar as the rest of the site, so this reads as a page of
          it rather than a landing page bolted on */}
      <nav style={{ background: c.nav, padding: '0 8%', borderBottom: `1px solid ${divider}` }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 68, gap: 32 }}>
          <a href={base} style={{ color: c.h, fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>{content.businessName}</a>
          <a href={`${base}/tjanster`} style={{ color: fgSub, fontSize: 14, textDecoration: 'none' }}>{siteLabel(content.labels, 'navServices')}</a>
          <a
            href={content.bookingUrl || base}
            style={{ marginLeft: 'auto', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '9px 22px', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
          >
            {content.ctaText || 'Boka tid'}
          </a>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '72px 24px 96px' }}>
        <p style={{ fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
          {service.category}
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: c.h, letterSpacing: -1, marginBottom: 8, lineHeight: 1.15 }}>
          {service.name}{content.address ? ` i ${content.address}` : ''}
        </h1>
        <p style={{ fontSize: 15, color: fgSub, marginBottom: 28 }}>hos {content.businessName}</p>

        <p style={{ fontSize: 17, color: fgSub, lineHeight: 1.75, marginBottom: 36 }}>
          {service.desc}
        </p>

        <div style={{ display: 'flex', gap: 40, padding: '24px 0', borderTop: `1px solid ${divider}`, borderBottom: `1px solid ${divider}`, marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 11, color: fgSub, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{siteLabel(content.labels, 'priceLabel')}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: c.h }}>{service.price}</p>
          </div>
          {service.duration && (
            <div>
              <p style={{ fontSize: 11, color: fgSub, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{siteLabel(content.labels, 'durationLabel')}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: c.h }}>{service.duration}</p>
            </div>
          )}
        </div>

        <a
          href={content.bookingUrl || base}
          style={{ display: 'inline-block', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginBottom: 64 }}
        >
          Boka {service.name.toLowerCase()}
        </a>

        {/* Internal links between the service pages — this is what makes them
            rank as a family instead of orphans */}
        {others.length > 0 && (
          <section>
            <h2 style={{ fontSize: 13, color: fgSub, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 18 }}>
              Fler behandlingar hos {content.businessName}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {others.slice(0, 9).map(o => (
                <a
                  key={o.slug}
                  href={`${base}/tjanster/${o.slug}`}
                  style={{ border: `1px solid ${divider}`, borderRadius: 10, padding: '14px 16px', textDecoration: 'none' }}
                >
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: c.h, marginBottom: 4 }}>{o.name}</span>
                  <span style={{ display: 'block', fontSize: 13, color: fgSub }}>{o.price}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
