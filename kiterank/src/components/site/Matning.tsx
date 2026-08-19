'use client'
import { useEffect } from 'react'
import Script from 'next/script'
import { SOCIAL_FIELDS } from '@/lib/siteSocial'

/*
 * Mätningen på salongens sajt.
 *
 * Den fanns inte alls tidigare. Sajterna vi bygger levererade strukturerad data
 * till Google men mätte ingenting — vilket betydde att en salong med en gammal
 * egen hemsida, där någon installerade Analytics för fem år sedan, hade mer
 * historik hos oss än en salong vi byggt sajten åt. Google fyller aldrig i
 * historik i efterhand, så varje dag utan tagg var en dag borta för alltid.
 *
 * Taggen skriver till kundens egen property, aldrig vår. Samma regel som för
 * domänen: datan är deras och följer med den dag de slutar hos oss.
 *
 * Tre händelser är definierade här och inte i varje mall. Det gör dem lika hos
 * varenda kund — vilket är det enda som gör det möjligt att jämföra en salong
 * med en annan. Definieras de per sajt mäter fjorton kunder fjorton olika saker
 * och siffrorna går inte att lägga bredvid varandra.
 */

/* Samtycke först, mätning sedan.
 *
 * Analyskakor kräver samtycke enligt svensk rätt, och en tagg som sätter dem
 * direkt gör salongen ansvarig för något de inte bett om. Consent mode startar
 * därför nekande: Google får en anonym signal utan kakor, och full mätning slås
 * på först när en samtyckesruta säger till. Rutan finns inte ännu — därför är
 * det här läget rätt och inte en tillfällig lösning. */
const SAMTYCKE_START = `
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
gtag('js',new Date());`

export function Matning({ mätId, bokaHref }: { mätId: string; bokaHref?: string }) {
  useEffect(() => {
    /* Lyssnaren sitter på dokumentet i stället för på varje knapp. Sajten har
       nio ställen som renderar en boka-knapp och lika många telefonlänkar —
       att haka på var och en vore nio ställen att glömma ett. */
    function klick(e: MouseEvent) {
      const länk = (e.target as HTMLElement | null)?.closest?.('a')
      if (!länk) return
      const href = länk.getAttribute('href') ?? ''

      if (href.startsWith('tel:'))    return skicka('telefon_klick',  { nummer: href.slice(4) })
      if (href.startsWith('mailto:')) return skicka('epost_klick')
      /* Bokningen känns igen på adressen och inte på en klass — en mall som
         råkar utelämna klassen hade tyst slutat mäta det som betyder mest. */
      if (bokaHref && (href === bokaHref || href.startsWith(bokaHref))) {
        return skicka('boka_klick')
      }
      /* Klick vidare till Instagram och de andra. Besökaren lämnar sajten här,
         så det är sista gången vi ser dem — och för en salong är det ett av
         de mest använda stegen på hela sidan. Plattformen skickas med, för
         "någon gick till sociala medier" går inte att göra något åt medan
         "trettio gick till Instagram och två till Facebook" gör det. */
      const plattform = socialPlattform(href)
      if (plattform) return skicka('social_klick', { plattform })
    }

    function skickat() { skicka('formular_skickat') }

    document.addEventListener('click', klick)
    document.addEventListener('submit', skickat)
    return () => {
      document.removeEventListener('click', klick)
      document.removeEventListener('submit', skickat)
    }
  }, [bokaHref])

  return (
    <>
      <Script id="matning-samtycke" strategy="afterInteractive">{SAMTYCKE_START}</Script>
      <Script
        id="matning-gtag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${mätId}`}
      />
      <Script id="matning-start" strategy="afterInteractive">
        {`gtag('config','${mätId}');`}
      </Script>
    </>
  )
}

/* Värdnamnen läses ur samma lista som ritar ikonerna och bygger länkarna. En
   sjätte plattform som läggs till där börjar mätas utan att någon rör den här
   filen — vilket är hela skälet till att den inte har en egen lista. */
const SOCIALA = SOCIAL_FIELDS.map(f => ({
  key:  f.key,
  värd: f.base.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, ''),
}))

/** Vilken plattform en adress leder till, om någon. */
function socialPlattform(href: string): string | null {
  let värd: string
  try {
    värd = new URL(href, window.location.origin).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
  /* Slutet av värdnamnet jämförs, inte hela: youtu.be och m.facebook.com är
     samma plattform för den som klickade. */
  return SOCIALA.find(s => värd === s.värd || värd.endsWith('.' + s.värd))?.key ?? null
}

/** Skickar en händelse om taggen hunnit ladda. Tyst annars — en besökare ska
 *  aldrig märka att mätningen inte kom igång. */
function skicka(namn: string, data?: Record<string, unknown>) {
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag
  if (typeof g === 'function') g('event', namn, data ?? {})
}
