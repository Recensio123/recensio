import { notFound, redirect, permanentRedirect } from 'next/navigation'
import { jsonLd } from '@/lib/jsonLd'
import type { Metadata } from 'next'
import { sitePath, siteAbsUrl } from '@/lib/siteHost'
import { BookButton } from '@/components/site/PreviewSite'
import { getPublishedSite, servicesOf, pricelistIsExternal, sectionHasPage, type PublishedSite, type ServiceOnSite, redirectToOwnDomain, sitePathOf, siteAbsUrlOf } from '../../site-data'
import { siteLabel } from '@/lib/siteLabels'
import { SitePage } from '../../artiklar/chrome'
import { serviceNode } from '@/lib/siteSchema'

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
  // No own price pages — the keyword pages would be orphans of a hub that's gone
  if (!site || !sectionHasPage(site, 'pricelist')) return null
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
    alternates: { canonical: sitePathOf(site, `/tjanster/${service.slug}`) },
  }
}
const isDark = (hex: string) => {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

/*
 * Inga adresser är kända när vi bygger — kunderna tillkommer efteråt. Den
 * tomma listan säger just det, och gör samtidigt sidan cachebar: första
 * besökaren på en adress renderar den, alla efter får den färdig. Utan den
 * här raden renderas sidan om vid varje besök, för varje kund, för alltid.
 *
 * Vad som rensar cachen står i site-data: clearSiteCache vid sparning.
 */
export async function generateStaticParams() { return [] }

export default async function ServiceKeywordPage({ params }: Props) {
  const p = await params
  const r = await resolve(p)
  if (!r) notFound()
  redirectToOwnDomain(r.site, p.slug, `/tjanster/${p.tjanst}`)
  // Old address after a rename — send Google and visitors to the current one
  if (r.site.slug !== p.slug) permanentRedirect(`/s/${r.site.slug}/tjanster/${p.tjanst}`)

  // Price list lives on the booking page — the keyword pages step aside too
  if (pricelistIsExternal(r.site)) redirect(`/s/${r.site.slug}`)

  const { site, service, others } = r
  const c = site.template.colors
  const { content } = site
  const base = `/s/${site.slug}`
  const fgSub = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

  /* The business is described once, on the home page. This page states the
     treatment and refers to the company by id, instead of repeating a thinner
     copy of it that Google could read as a second business. */
  const serviceSchema = serviceNode({ service, content, slug: site.slug, base: siteAbsUrlOf(site) })

  return (
    <SitePage site={site} current="pricelist">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(serviceSchema) }} />

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

        <BookButton
          content={content}
          label={`Boka ${service.name.toLowerCase()}`}
          style={{ display: 'inline-block', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginBottom: 64 }}
        />

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
    </SitePage>
  )
}
