import { isExampleImage } from '@/lib/exampleContent'

/*
 * Vad som återstår innan hemsidan är salongens egen.
 *
 * Google-kopplingen räknas inte här — den äger sin egen ruta på startsidan och
 * har bara ett steg som betyder något: är den gjord eller inte.
 *
 * Ingenting sparas. Varje punkt räknas ut ur innehållet varje gång, av samma
 * skäl som registreringen bara sparar val: en sparad klarmarkering blir osann
 * i samma stund kunden ångrar sig, och då står det "klart" bredvid något som
 * inte är gjort.
 *
 * Reglerna bor här och inte i panelen. Panelen räknar på det kunden håller på
 * att skriva, startsidan på det som är sparat — olika indata, men det får inte
 * bli olika svar på vad som är klart.
 */

export type Steg = {
  id:      string
  rubrik:  string
  /** En rad om varför, för den som inte vet vad steget är bra för. */
  varför:  string
  klart:   boolean
  /** Vart knappen går. */
  href:    string
}

/* Det som behövs ur site_config för att svara. Löst typat med flit: innehållet
   växer, och en checklista ska inte vara det som hindrar ett nytt fält. */
type Innehåll = {
  businessName?: string
  heroHeading?:  string
  aboutBody?:    string
  bookingUrl?:   string
  logo?:         string
  heroImage?:    string
  featureImage?: string
  aboutImage?:   string
  gallery_images?: string[]
  featured_reviews?: { source?: string }[]
  menuCategories?: unknown[]
  services?: { name?: string }[]
}

const PANEL = '/dashboard/webbplats'

/** Bilder som fortfarande är våra exempel — de som måste bytas ut. */
function exempelbilderKvar(c: Innehåll): number {
  const alla = [c.heroImage, c.featureImage, c.aboutImage, ...(c.gallery_images ?? [])]
  return alla.filter(isExampleImage).length
}

/**
 * Hemsidan — vad som är kvar innan den är någons egen.
 *
 * `standardOmText` är exempeltexten för branschen. Den ligger kvar tills
 * kunden skrivit sin egen, och en sida som fortfarande visar den beskriver
 * inte salongen utan mallen.
 */
export function sajtSteg(c: Innehåll, standardOmText = ''): Steg[] {
  const kvar = exempelbilderKvar(c)
  const egnaOmdömen = (c.featured_reviews ?? []).some(r => r.source !== 'example')

  return [
    {
      id: 'namn', rubrik: 'Namn och rubrik',
      varför: 'Det första en besökare läser',
      klart: !!c.businessName?.trim() && !!c.heroHeading?.trim(),
      href: PANEL,
    },
    {
      id: 'priser', rubrik: 'Prislista med dina priser',
      varför: 'Priserna är det besökarna letar efter först',
      klart: (c.menuCategories?.length ?? 0) > 0
          || (c.services ?? []).filter(s => s.name?.trim()).length >= 4,
      href: PANEL,
    },
    {
      id: 'bilder',
      rubrik: kvar > 0 ? `Byt ut exempelbilderna (${kvar} kvar)` : 'Byt ut exempelbilderna',
      varför: 'Dina egna foton är det som får någon att boka',
      klart: kvar === 0,
      href: PANEL,
    },
    {
      id: 'logga', rubrik: 'Ladda upp din logga',
      varför: 'Syns överst på varje sida',
      klart: !!c.logo,
      href: PANEL,
    },
    {
      /* Våra exempelomdömen bockar inte av det här. De publiceras aldrig, så
         en sajt som bara har dem har en tom omdömessektion live. */
      id: 'omdomen', rubrik: 'Välj omdömen som visas',
      varför: 'Andras ord väger tyngre än dina egna',
      klart: egnaOmdömen,
      href: PANEL,
    },
    {
      id: 'om', rubrik: 'Skriv om Om oss-texten',
      varför: 'Exempeltexten ligger kvar tills du gjort den till din',
      klart: !!c.aboutBody?.trim() && c.aboutBody.trim() !== standardOmText.trim(),
      href: PANEL,
    },
  ]
}

/** Hur långt de kommit, som en andel. */
export function andel(steg: Steg[]): { klara: number; av: number } {
  return { klara: steg.filter(s => s.klart).length, av: steg.length }
}
