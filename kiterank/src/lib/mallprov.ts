import { TEMPLATES_BY_INDUSTRY, type Template } from '@/lib/templates'
import type { SiteContent } from '@/components/site/PreviewSite'

/*
 * Innehållet provgalleriet matar mallarna med.
 *
 * Lägena är valda efter var layoutbuggar faktiskt bor. Det elaka innehållet
 * trycker varje yta mot sitt värsta fall: namnet som radbryts, tjänsten vars
 * namn är en hel mening, beskrivningen som inte tar slut. Det avskalade drar
 * åt andra hållet — kortast möjliga allt, varje valbar sektion av — eftersom
 * hål och kollapsade ytor är fel av samma dignitet som spruckna.
 *
 * Egna data och inte demoinnehållet, för demoinnehållet är skrivet för att se
 * bra ut. Ett prov som bara visar solskensfallet är en broschyr.
 */

/** Alla mallar, en gång var. Registret är per bransch och salongsmallarna
 *  delas av sex nycklar — utan dubblettskyddet visades de sex gånger. */
export const ALL_TEMPLATES: Template[] = (() => {
  const sedda = new Set<string>()
  const ut: Template[] = []
  for (const lista of Object.values(TEMPLATES_BY_INDUSTRY)) {
    for (const t of lista) {
      if (sedda.has(t.id)) continue
      sedda.add(t.id)
      ut.push(t)
    }
  }
  return ut
})()

const LÅNG_TEXT =
  'Vi har arbetat med hår i över tjugo år och tar emot både drop-in och bokade besök. ' +
  'Hos oss får du alltid en konsultation innan vi börjar, och vi använder uteslutande ' +
  'produkter vi själva står bakom — utan undantag, utan kompromisser och utan dolda avgifter.'

const ELAKA_TJÄNSTER = Array.from({ length: 14 }, (_, i) => ({
  name:  i === 0
    ? 'Balayage med toning, olaplexbehandling & personlig färgkonsultation'
    : `Behandling ${i + 1} — klippning, styling och vård`,
  desc:  LÅNG_TEXT.slice(0, 120),
  price: i % 3 === 0 ? 'från 2 495 kr' : `${450 + i * 85} kr`,
}))

/** Elakt: allt långt, inga bilder, å ä ö och &-tecken där de gör mest skada. */
const ELAK: Partial<SiteContent> = {
  businessName: 'Härnösands Hår- & Skönhetsateljé Nordström',
  tagline:      'Klippning, färg, styling, vård, uppsättningar & brudhår i hjärtat av Härnösand sedan 2003',
  kicker:       'VÄLKOMMEN TILL OSS PÅ ATELJÉN',
  heroHeading:  'En upplevelse utöver det vanliga — varje gång, för varje kund',
  heroBody:     LÅNG_TEXT,
  ctaText:      'Boka din kostnadsfria konsultation redan idag',
  services:     ELAKA_TJÄNSTER,
  aboutTitle:   'Om oss och vår långa historia här i Härnösand',
  aboutBody:    LÅNG_TEXT + ' ' + LÅNG_TEXT,
  phone:        '0611-123 456 78',
  hours:        'Mån–Fre 08.00–19.30 · Lör 09.00–17.00 · Sön stängt (öppet första söndagen varje månad)',
  address:      'Stora Torget 1B, 2 tr, 871 30 Härnösand',
  /* Inga bilder alls: varje bildyta måste bära sin frånvaro. */
  gallery_images: [],
  stats: [
    { num: '20+', label: 'år i branschen och i samma lokal på samma adress' },
    { num: '4,9', label: 'i snittbetyg' },
    { num: '12 000', label: 'nöjda kunder' },
  ],
}

/** Avskalat: kortast möjliga allt, varje valbar sektion av. */
const TOM: Partial<SiteContent> = {
  businessName: 'Bo',
  tagline:      'Hår.',
  kicker:       '',
  heroHeading:  'Hej',
  heroBody:     '',
  ctaText:      'Boka',
  services:     [{ name: 'Klipp', desc: '', price: '400 kr' }],
  aboutTitle:   'Om',
  aboutBody:    '',
  phone:        '',
  hours:        '',
  address:      '',
  gallery_images: [],
  siteFeatures: { gallery: false, reviews: false, about: false, blog: false, pricelist: true, contact: false, booking: true },
}

export type ProvLäge = 'demo' | 'elak' | 'tom'

/** Innehållet för ett läge — null för demo, som betyder mallens eget. */
export function provInnehåll(läge: ProvLäge): Partial<SiteContent> | null {
  return läge === 'elak' ? ELAK : läge === 'tom' ? TOM : null
}
