import { hasBooking, type Plan } from '@/components/PlanProvider'

/*
 * Vad en ny kund kallas — ett ord, på ett ställe.
 *
 * De två uppläggen räknar samma sak men det heter olika, och skillnaden är
 * inte kosmetisk. En salong säljer en tid: kunden väljer klockslag, betalar ett
 * pris som står i prislistan, och affären är avslutad i samma stund. En
 * hantverkare säljer ingenting när någon hör av sig — han får ett namn och ett
 * nummer, och sedan ska han ringa upp, åka ut och räkna på jobbet.
 *
 * Därför går kronorna inte att skriva ut i leadläget. "14 kunder värda 16 800
 * kr" är sant för salongen, för priset är känt. För hantverkaren är samma
 * mening en gissning — halva förfrågningarna blir aldrig ett jobb, och de som
 * blir det kan vara värda tio gånger mer. Att ändå visa en krona vore att hitta
 * på en siffra kunden sedan planerar efter.
 *
 * Orden bor här och inte i varje vys egen textlista. Fjorton kopior av "lead"
 * betyder att den dag ordet ska ändras hittas tolv av dem.
 */

export type Ordval = {
  /** "en bokning" / "ett lead" */
  ett:        string
  flera:      string
  Flera:      string
  /** Kolumnrubrik där annonserna redovisas. */
  frånAnnons: string
  /* Vad rubriken på översikten säger efter antalet nya kunder. Bokningsläget
     kan säga kronor eftersom priset är känt; leadläget säger vad som väntar
     på att göras i stället. */
  rubrikTillägg: string
  /** Vad kanalerna jämförs i, i uppräkningen av vad kunden får se. */
  kanalRad:   string
}

const SV: Record<'bokning' | 'lead', Ordval> = {
  bokning: {
    ett: 'bokning', flera: 'bokningar', Flera: 'Bokningar',
    frånAnnons:    'Bokningar från annonser',
    rubrikTillägg: ' — värda ca 16 800 kr i bokningar',
    kanalRad:      'Bokningarna — vad varje kanal ger dig i kronor',
  },
  lead: {
    ett: 'lead', flera: 'leads', Flera: 'Leads',
    frånAnnons:    'Leads från annonser',
    rubrikTillägg: ' — varav 9 hörde av sig',
    kanalRad:      'Leaden — vilken kanal som ger dig flest förfrågningar',
  },
}

const EN: Record<'bokning' | 'lead', Ordval> = {
  bokning: {
    ett: 'booking', flera: 'bookings', Flera: 'Bookings',
    frånAnnons:    'Bookings from ads',
    rubrikTillägg: ' — worth ca 16 800 kr in bookings',
    kanalRad:      'Bookings — what each channel brings you in kronor',
  },
  lead: {
    ett: 'lead', flera: 'leads', Flera: 'Leads',
    frånAnnons:    'Leads from ads',
    rubrikTillägg: ' — 9 of them got in touch',
    kanalRad:      'Leads — which channel brings you the most enquiries',
  },
}

export function konverteringsOrd(plan: Plan, lang: 'sv' | 'en'): Ordval {
  const sort = hasBooking(plan) ? 'bokning' : 'lead'
  return (lang === 'sv' ? SV : EN)[sort]
}
