import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublishedSite } from '../site-data'
import { ArticleNav, F, isDark } from '../artiklar/chrome'
import { siteLabel } from '@/lib/siteLabels'
import { siteFontVars, SiteFontFace } from '@/components/SiteFont'

/*
 * The contact page — where "öppettider {salongen}" and "{salongen} telefon"
 * searches land. Name, address, phone and hours in one consistent place is
 * also what local ranking is built on, so this page is as much for Google's
 * benefit as for the visitor's.
 */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) return {}

  const { content } = site
  const where = content.address ? ` i ${content.address}` : ''
  return {
    title: `${siteLabel(content.labels, 'contactTitle')} — ${content.businessName}${content.address ? ` | ${content.address}` : ''}`,
    description: `Kontaktuppgifter, öppettider och vägbeskrivning till ${content.businessName}${where}. ${content.phone}.`,
    alternates: { canonical: `/s/${site.slug}/kontakt` },
  }
}

export default async function ContactPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) notFound()
  // Old address after a rename — send Google and visitors to the current one
  if (site.slug !== slug) permanentRedirect(`/s/${site.slug}/kontakt`)

  const c = site.template.colors
  const { content } = site
  const fgSub   = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)'
  const mapsHref = content.address?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${content.businessName} ${content.address}`)}`
    : undefined
  const socials = ([['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok']] as const)
    .map(([key, name]) => ({ name, href: content.social?.[key]?.trim() }))
    .filter(s => s.href)

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'ContactPage',
    name:        `${siteLabel(content.labels, 'contactTitle')} — ${content.businessName}`,
    mainEntity: {
      '@type':      'LocalBusiness',
      name:          content.businessName,
      telephone:     content.phone,
      openingHours:  content.hours,
      address:     { '@type': 'PostalAddress', streetAddress: content.address, addressCountry: 'SE' },
      ...(socials.length ? { sameAs: socials.map(s => s.href) } : {}),
    },
  }

  const row = (label: string, body: React.ReactNode) => (
    <div style={{ padding: '20px 0', borderBottom: `1px solid ${divider}` }}>
      <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
      {body}
    </div>
  )

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F, ...siteFontVars(content) }}>
      <SiteFontFace content={content} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ArticleNav site={site} />

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '72px 24px 96px' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: c.h, letterSpacing: -1, marginBottom: 8 }}>
          {siteLabel(content.labels, 'contactTitle')}
        </h1>
        <p style={{ fontSize: 16, color: fgSub, marginBottom: 32 }}>{content.businessName}</p>

        {row(siteLabel(content.labels, 'contactTitle'), (
          <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ fontSize: 22, fontWeight: 800, color: c.h, textDecoration: 'none' }}>
            {content.phone}
          </a>
        ))}

        {row(siteLabel(content.labels, 'hoursTitle'), (
          <p style={{ fontSize: 16, color: c.h }}>{content.hours}</p>
        ))}

        {content.address?.trim() && row('Adress', (
          <>
            <p style={{ fontSize: 16, color: c.h, marginBottom: 8 }}>{content.address}</p>
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: c.a, textDecoration: 'underline' }}>
                {siteLabel(content.labels, 'directions')}
              </a>
            )}
          </>
        ))}

        {socials.length > 0 && row(siteLabel(content.labels, 'followTitle'), (
          <div style={{ display: 'flex', gap: 16 }}>
            {socials.map(s => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, color: c.h, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>
                {s.name}
              </a>
            ))}
          </div>
        ))}

        <a
          href={content.bookingUrl || `/s/${site.slug}`}
          style={{ display: 'inline-block', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginTop: 32 }}
        >
          {content.ctaText || 'Boka tid'}
        </a>
      </main>
    </div>
  )
}
