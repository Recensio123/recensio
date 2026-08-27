import { notFound, permanentRedirect } from 'next/navigation'
import { jsonLd } from '@/lib/jsonLd'
import { sectionPageTitle } from '@/lib/sectionPages'
import type { Metadata } from 'next'
import { BookButton } from '@/components/site/PreviewSite'
import { getPublishedSite, redirectToOwnDomain, sitePathOf, siteAbsUrlOf } from '../site-data'
import { SitePage, isDark } from '../artiklar/chrome'
import { siteLabel } from '@/lib/siteLabels'
import { pageNode } from '@/lib/siteSchema'
import { socialLinks } from '@/lib/siteSocial'
import { mapLinkUrl } from '@/lib/siteMap'
import { SiteMapFrame } from '@/components/SiteMapFrame'

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
    title: `${sectionPageTitle(content, 'contact')} — ${content.businessName}${content.address ? ` | ${content.address}` : ''}`,
    description: `Kontaktuppgifter, öppettider och vägbeskrivning till ${content.businessName}${where}. ${content.phone}.`,
    alternates: { canonical: sitePathOf(site, '/kontakt') },
  }
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

export default async function ContactPage({ params }: Props) {
  const { slug } = await params
  const site = await getPublishedSite(slug)
  if (!site) notFound()
  redirectToOwnDomain(site, slug, '/kontakt')
  // Old address after a rename — send Google and visitors to the current one
  if (site.matchedBy === 'slug' && site.slug !== slug) permanentRedirect(`/s/${site.slug}/kontakt`)

  const c = site.template.colors
  const { content } = site
  const fgSub   = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)'
  const mapsHref = content.address?.trim()
    ? mapLinkUrl(content.businessName, content.address)
    : undefined
  const socials = socialLinks(content.social)

  /* The social profiles belong to the business itself, so they attach to that
     node by id rather than to a second copy of the company. */
  const schema = pageNode({
    type:   'ContactPage',
    name:   `${sectionPageTitle(content, 'contact')} — ${content.businessName}`,
    slug:   site.slug,
    sameAs: socials.map(s => s.href),
    base:   siteAbsUrlOf(site),
  })

  const row = (label: string, body: React.ReactNode) => (
    <div style={{ padding: '20px 0', borderBottom: `1px solid ${divider}` }}>
      <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
      {body}
    </div>
  )

  return (
    <SitePage site={site} current="kontakt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '72px 24px 96px' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: c.h, letterSpacing: -1, marginBottom: 8 }}>
          {sectionPageTitle(content, 'contact')}
        </h1>
        <p style={{ fontSize: 16, color: fgSub, marginBottom: 32 }}>{content.businessName}</p>

        {/* The page's own opening line, stored as its own wording. The Om oss
            page has a "Hitta hit" paragraph of its own; the two are separate
            texts on separate pages, so editing one leaves the other alone. */}
        {!!siteLabel(content.labels, 'contactIntro') && (
          <p style={{ fontSize: 17, color: c.h, lineHeight: 1.7, marginBottom: 8 }}>
            {siteLabel(content.labels, 'contactIntro')}
          </p>
        )}

        {row(sectionPageTitle(content, 'contact'), (
          <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ fontSize: 22, fontWeight: 800, color: c.h, textDecoration: 'none' }}>
            {content.phone}
          </a>
        ))}

        {/* Tömmer salongen öppettiderna försvinner rubriken med dem. En rubrik
            utan innehåll ser ut som att sidan gått sönder, och "Öppettider"
            följt av ingenting är sämre än att inte nämna dem alls. */}
        {content.hours?.trim() && row(siteLabel(content.labels, 'hoursTitle'), (
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

        {/* Vad salongen gör, i egna ord — inte fyra tjänster med priser.
            Listan var en andra prislista på fel sida: den blev inaktuell så
            fort priserna ändrades, och den som står här söker telefonnumret,
            inte ett urval. Texten är kundens egen att skriva om, och länken
            går till hela listan i stället för att kopiera delar av den. */}
        {!!siteLabel(content.labels, 'contactDoBody') && row(siteLabel(content.labels, 'contactDoTitle'), (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            <p style={{ fontSize: 16, color: c.h, lineHeight: 1.7 }}>
              {siteLabel(content.labels, 'contactDoBody')}
            </p>
            <a href={sitePathOf(site, '/tjanster')} style={{ fontSize: 15, color: c.a, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>
              {siteLabel(content.labels, 'seePrices')} →
            </a>
          </div>
        ))}

        <SiteMapFrame businessName={content.businessName} address={content.address} borderColor={divider} />

        <BookButton content={content} style={{ display: 'inline-block', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginTop: 32 }} />
      </main>
    </SitePage>
  )
}
