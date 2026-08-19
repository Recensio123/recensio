/*
 * Branschens ord.
 *
 * Varje bransch säger samma sak på sitt vis: en salong har tjänster, en
 * verkstad har jobb. Rubrikerna nedan är standarderna — kunden skriver över
 * dem via labels, och cfgLabel svarar med deras ord när de finns.
 *
 * Ligger här och inte i PreviewSite eftersom PreviewSite är en
 * klientmodul. Prissidan och de andra undersidorna renderas på servern och
 * kan inte anropa en funktion som bor på klienten — den kommer fram som en
 * tom stubbe eller ett rent fel. Ren data hör hemma i lib.
 */
import { baseIndustry } from '@/lib/industries'

export type IndConfig = {
  statsStrip:        string[]
  badges:            string[]
  statsBar:          { num: string; label: string }[]
  processTitle:      string
  processSteps:      { n: string; title: string; desc: string }[]
  testimonial:       string
  testimonialAttrib: string
  ctaBandTitle:      string
  heroSecondBtn:     string
  allLink:           string
  svcKicker:         string
  svcHeading:        string
  heritageSvcHdg:    string
  featureLabel:      string
  menuLabel:         string
}

/*
 * The headings whose default wording depends on the trade.
 *
 * A salon's service section is headed differently from a restaurant's menu, so
 * these defaults come from the industry config rather than from siteLabels —
 * but a customer edits them exactly like any other text on the page, and the
 * three states are the same: untouched falls back to the trade's wording, a
 * written one stands, a cleared one leaves nothing behind.
 */
export const CFG_LABEL_NAMES = {
  svcKicker:    'Liten rubrik över tjänsterna',
  svcHeading:   'Rubrik över tjänsterna',
  allLink:      'Länken till hela listan',
  menuLabel:    'Rubrik över hela prislistan',
  featureLabel: 'Liten rubrik vid den utvalda bilden',
  ctaBandTitle: 'Rubrik i bokningsbandet',
} as const

export type CfgLabelKey = keyof typeof CFG_LABEL_NAMES

export function cfgLabel(
  labels: Record<string, string> | undefined,
  fallback: string,
  key: CfgLabelKey,
): string {
  const own = labels?.[key]
  return own === undefined ? fallback : own.trim()
}

export { baseIndustry }

export function getIndConfig(rawIndustry?: string): IndConfig {
  const industry = baseIndustry(rawIndustry)
  if (industry === 'spa') return {
    statsStrip:        ['Diplomerade terapeuter', 'Eco-certifierade produkter', 'Fri konsultation'],
    badges:            ['✓ Diplomerade terapeuter', '✓ Eco-certifierat', '✓ Fri konsultation'],
    statsBar:          [{ num: '12+', label: 'År i branschen' }, { num: '4', label: 'Certifierade terapeuter' }, { num: '3 000+', label: 'Nöjda gäster' }, { num: '4.9★', label: 'Google-betyg' }],
    processTitle:      'Boka din behandling',
    processSteps:      [
      { n: '1', title: 'Välj behandling', desc: 'Bläddra bland massage, ansiktsbehandlingar och paket' },
      { n: '2', title: 'Boka din tid',    desc: 'Välj datum och tid som passar dig — enkelt online' },
      { n: '3', title: 'Slappna av',      desc: 'Vi tar hand om resten — kom in och låt oss ta hand om dig' },
    ],
    testimonial:       'Aldrig känt mig så avslappnad. En upplevelse som stannar kvar länge efter besöket.',
    testimonialAttrib: '— Återkommande gäst sedan 2022',
    ctaBandTitle:      'Boka din behandling idag',
    heroSecondBtn:     'Se behandlingar',
    allLink:           'Se alla behandlingar →',
    svcKicker:         'För kropp & sinne',
    svcHeading:        'Behandlingar',
    heritageSvcHdg:    'Rekommenderade behandlingar',
    featureLabel:      'POPULÄRAST',
    menuLabel:         'BEHANDLINGAR',
  }
  if (industry === 'beauty') return {
    statsStrip:        ['Certifierade specialister', 'Premiumkvalitet', 'Fri konsultation'],
    badges:            ['✓ Certifierade specialister', '✓ Premiumkvalitet', '✓ Fri konsultation'],
    statsBar:          [{ num: '8+', label: 'År i branschen' }, { num: '3', label: 'Certifierade specialister' }, { num: '2 000+', label: 'Nöjda kunder' }, { num: '4.9★', label: 'Google-betyg' }],
    processTitle:      'Boka din behandling',
    processSteps:      [
      { n: '1', title: 'Välj behandling', desc: 'Bläddra bland fransar, naglar, bryn och vaxning' },
      { n: '2', title: 'Boka tid',        desc: 'Välj datum och tid — vi bekräftar direkt' },
      { n: '3', title: 'Kom in!',         desc: 'Vi levererar precision och resultat du kan se direkt' },
    ],
    testimonial:       'Resultatet är fantastiskt. Jag har aldrig haft fransar som sitter så bra.',
    testimonialAttrib: '— Stamkund sedan 2021',
    ctaBandTitle:      'Boka din behandling idag',
    heroSecondBtn:     'Se behandlingar',
    allLink:           'Se alla behandlingar →',
    svcKicker:         'Skönhetsbehandlingar',
    svcHeading:        'Behandlingar',
    heritageSvcHdg:    'Populärast hos oss',
    featureLabel:      'POPULÄRAST',
    menuLabel:         'PRISLISTA',
  }
  if (industry === 'fitness') return {
    statsStrip:        ['Certifierade tränare', '20+ pass i veckan', 'Alla nivåer välkomna'],
    badges:            ['✓ Certifierade tränare', '✓ 20+ pass/vecka', '✓ Alla nivåer'],
    statsBar:          [{ num: '10+', label: 'År i branschen' }, { num: '20+', label: 'Pass per vecka' }, { num: '600+', label: 'Aktiva medlemmar' }, { num: '4.8★', label: 'Google-betyg' }],
    processTitle:      'Kom igång på 3 steg',
    processSteps:      [
      { n: '1', title: 'Provträna gratis', desc: 'Testa ett valfritt pass utan bindning — bara dyka upp' },
      { n: '2', title: 'Välj upplägg',     desc: 'Drop-in, klippkort eller medlemskap — vi anpassar oss efter dig' },
      { n: '3', title: 'Träna!',           desc: 'Bygg din rutin med stöd av erfarna tränare och en engagerad grupp' },
    ],
    testimonial:       'Bästa gymmet jag provat. Tränarna bryr sig verkligen och stämningen i gruppen är oöverträffad.',
    testimonialAttrib: '— Medlem sedan 2022',
    ctaBandTitle:      'Kom igång idag',
    heroSecondBtn:     'Se schema',
    allLink:           'Se alla pass →',
    svcKicker:         'Träning för alla nivåer',
    svcHeading:        'Träning & coaching',
    heritageSvcHdg:    'Populärast',
    featureLabel:      'POPULÄRAST',
    menuLabel:         'SCHEMA',
  }
  if (industry === 'restaurant') return {
    statsStrip:        ['Öppnat 2018', 'Allt hemlagat', 'Lunch varje vardag'],
    badges:            ['✓ Lokala råvaror', '✓ Säsongsanpassat', '✓ Allt hemlagat'],
    statsBar:          [{ num: '2018', label: 'Öppnade vi' }, { num: '100%', label: 'Hemlagat' }, { num: '4.9★', label: 'Google-betyg' }, { num: '5+', label: 'År i branschen' }],
    processTitle:      'Välkommen in',
    processSteps:      [
      { n: '1', title: 'Se menyn',   desc: 'Bläddra bland dagens lunch, à la carte och drycker' },
      { n: '2', title: 'Boka bord',  desc: 'Ring oss eller boka enkelt online — vi bekräftar direkt' },
      { n: '3', title: 'Välkommen', desc: 'Vi tar hand om resten — sätt dig och njut' },
    ],
    testimonial:       'Den bästa middagen vi haft i Stockholm. Maten, atmosfären, personalen — allt var perfekt.',
    testimonialAttrib: '— Återkommande gäst sedan 2020',
    ctaBandTitle:      'Boka ditt bord idag',
    heroSecondBtn:     'Se menyn',
    allLink:           'Se hela menyn →',
    svcKicker:         'Från menyn',
    svcHeading:        'Populärt just nu',
    heritageSvcHdg:    'Kockens urval',
    featureLabel:      'KOCKENS VAL',
    menuLabel:         'MENYN',
  }
  if (industry === 'salon') return {
    statsStrip:        ['10 erfarna stylister', 'Diplomerade & certifierade', 'Fri konsultation'],
    badges:            ['✓ Diplomerade stylister', '✓ Ekologiska produkter', '✓ Fri konsultation'],
    statsBar:          [{ num: '10+', label: 'År i branschen' }, { num: '8', label: 'Erfarna stylister' }, { num: '5 000+', label: 'Nöjda kunder' }, { num: '4.9★', label: 'Google-betyg' }],
    processTitle:      'Boka din tid',
    processSteps:      [
      { n: '1', title: 'Välj tjänst',        desc: 'Bläddra bland klippning, färgning och behandlingar' },
      { n: '2', title: 'Välj tid & stylist', desc: 'Hitta en tid som passar dig med din favoriststylist' },
      { n: '3', title: 'Kom in!',            desc: 'Vi välkomnar dig och ser till att du lämnar nöjd' },
    ],
    testimonial:       'Bästa salongen jag besökt. Alltid välkomnande och alltid nöjd med resultatet.',
    testimonialAttrib: '— Stamkund sedan 2019',
    ctaBandTitle:      'Boka din tid idag',
    heroSecondBtn:     'Se prislista',
    allLink:           'Se prislista →',
    svcKicker:         'Vad vi erbjuder',
    svcHeading:        'Våra tjänster',
    heritageSvcHdg:    'Populärast hos oss',
    featureLabel:      'POPULÄRAST',
    menuLabel:         'PRISLISTA',
  }
  if (industry === 'craftsman') return {
    statsStrip:        ['30 år i branschen', 'F-skattsedel & försäkrad', 'RUT & ROT'],
    badges:            ['✓ F-skattsedel', '✓ Försäkrade', '✓ RUT & ROT'],
    statsBar:          [{ num: '30+', label: 'År i branschen' }, { num: '500+', label: 'Slutförda projekt' }, { num: '100%', label: 'Garanti på arbetet' }, { num: '4.9★', label: 'Google-betyg' }],
    processTitle:      'Så enkelt är det',
    processSteps:      [
      { n: '1', title: 'Kostnadsfri offert', desc: 'Vi tittar på jobbet och ger dig en tydlig prisuppgift' },
      { n: '2', title: 'Vi planerar',        desc: 'Startdatum och tidsplan presenteras — inga överraskningar' },
      { n: '3', title: 'Klart!',             desc: 'Utfört prydligt och noggrant — vi städar efter oss' },
    ],
    testimonial:       'Jobbet gjort på riktigt. Precis som de lovade. Kan inte rekommendera dem nog.',
    testimonialAttrib: '— Kund i Stockholm',
    ctaBandTitle:      'Begär kostnadsfri offert',
    heroSecondBtn:     'Se tjänster',
    allLink:           'Se alla tjänster →',
    svcKicker:         'Vad vi gör',
    svcHeading:        'Tjänster',
    heritageSvcHdg:    'Hantverk vi är stolta över',
    featureLabel:      'SPECIALITET',
    menuLabel:         'TJÄNSTER',
  }
  if (industry === 'cleaning') return {
    statsStrip:        ['Eco-certifierade produkter', 'Bakgrundskontrollerade', 'Nöjd-kund-garanti'],
    badges:            ['✓ Bakgrundskontrollerade', '✓ Försäkrade', '✓ Nöjd-kund-garanti'],
    statsBar:          [{ num: '10+', label: 'År i branschen' }, { num: '500+', label: 'Nöjda kunder' }, { num: '100%', label: 'Eco-certifierat' }, { num: '4.9★', label: 'Google-betyg' }],
    processTitle:      'Boka städning på 3 steg',
    processSteps:      [
      { n: '1', title: 'Begär offert', desc: 'Fyll i dina uppgifter — kostnadsfritt och utan bindning' },
      { n: '2', title: 'Välj datum',   desc: 'Vi hittar en tid som passar dig, även med kort varsel' },
      { n: '3', title: 'Vi städar!',   desc: 'Ditt hem är skinande rent när du kommer hem' },
    ],
    testimonial:       'Priceless att komma hem till ett rent hem. Bästa beslutet vi tagit.',
    testimonialAttrib: '— Nöjd kund, Täby',
    ctaBandTitle:      'Begär offert idag — kostnadsfritt',
    heroSecondBtn:     'Se priser',
    allLink:           'Se alla tjänster →',
    svcKicker:         'Vad vi erbjuder',
    svcHeading:        'Städtjänster',
    heritageSvcHdg:    'Populärt val',
    featureLabel:      'POPULÄRAST',
    menuLabel:         'TJÄNSTER',
  }
  return {
    statsStrip:        ['12 år i branschen', '2 500+ kunder', '98% nöjda'],
    badges:            ['✓ Certifierade', '✓ Försäkrade', '✓ Garanti'],
    statsBar:          [{ num: '12+', label: 'År i branschen' }, { num: '340+', label: 'Slutförda projekt' }, { num: '98%', label: 'Nöjda kunder' }, { num: '4.9★', label: 'Google-betyg' }],
    processTitle:      'Så här fungerar det',
    processSteps:      [
      { n: '1', title: 'Kontakta oss', desc: 'Ring eller mejla för en kostnadsfri konsultation' },
      { n: '2', title: 'Vi planerar',  desc: 'Vi går igenom dina behov och sätter upp en plan' },
      { n: '3', title: 'Klart!',       desc: 'Jobbet utförs professionellt och i rätt tid' },
    ],
    testimonial:       'Vi har anlitat dem i 3 år och varje gång överträffar de förväntningarna.',
    testimonialAttrib: '— Nöjd kund sedan 2021',
    ctaBandTitle:      'Redo att boka?',
    heroSecondBtn:     'Se tjänster',
    allLink:           'Se alla tjänster →',
    svcKicker:         'Vad vi erbjuder',
    svcHeading:        'Våra tjänster',
    heritageSvcHdg:    'Tjänster',
    featureLabel:      'UTVALT',
    menuLabel:         'TJÄNSTER',
  }
}
