import { ImageResponse } from 'next/og'
import { getPublishedSite } from './site-data'
import { hexIsDark } from '@/app/(kiterank)/dashboard/webbplats/farger'

/*
 * Sajtens favicon — märket Google visar bredvid namnet i sökresultaten.
 *
 * Utan den visar Google en grå jordglob, vilket läser som "oetablerad" i
 * exakt det ögonblick någon jämför salonger. Värre var läget innan den här
 * filen fanns: kundsajterna ärvde plattformens favicon, så en salong på sin
 * egen domän bar vårt märke i Googles resultat.
 *
 * Loggan när salongen laddat upp en. Annars en bokstavsikon i sajtens egna
 * färger — initialen ur salongsnamnet på accentfärgen. Det är samma reserv
 * sajtens sidhuvud redan använder när loggan saknas, så ikonen och sidan
 * berättar samma sak. Ingen salong visar jordgloben, och en uppladdad logga
 * uppgraderar ikonen av sig själv.
 *
 * 96×96: Googles riktlinje är en kvadrat i multipel av 48. Cachen sköts av
 * sajtuppslagets egna dygnscache — sparar kunden en ny logga rensas den, och
 * ikonen följer med.
 */

export const size = { width: 96, height: 96 }
export const contentType = 'image/png'

export default async function Icon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const site = await getPublishedSite(slug)

  /* En adress utan sajt får en neutral ruta — den ska inte 500:a, för Google
     provar ikonen även på adresser som slutat finnas. */
  if (!site) {
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: '#334155', color: '#f1f5f9',
          fontSize: 52, fontWeight: 700,
        }}>
          {slug.charAt(0).toUpperCase() || '·'}
        </div>
      ),
      { ...size },
    )
  }

  const logga = site.content.logo?.trim()

  if (logga) {
    /* Loggan på sajtens egen bakgrundsfärg — samma ground som sidhuvudet, så
       en ljus logga ritad för en mörk sida inte försvinner mot vitt. Luften
       runt om finns för att favicons beskärs hårt i vissa flikar. */
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: site.template.colors.bg,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logga}
            alt=""
            style={{ width: 80, height: 80, objectFit: 'contain' }}
          />
        </div>
      ),
      { ...size },
    )
  }

  /* Bokstavsikonen: initialen på accentfärgen. Bokstavens färg väljs efter
     accentens ljushet — en gul accent får mörk text, en vinröd får ljus. */
  const accent = site.template.colors.a
  const namn   = site.content.businessName?.trim() || site.slug

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: accent,
        color: hexIsDark(accent) ? '#ffffff' : '#101418',
        fontSize: 54, fontWeight: 700,
      }}>
        {namn.charAt(0).toUpperCase()}
      </div>
    ),
    { ...size },
  )
}
