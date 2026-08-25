import { tradePack } from '@/lib/trades'
import type { ServiceCategory } from '@/lib/services-data'

/*
 * Är prislistan fortfarande vår, eller salongens?
 *
 * Varje bransch levereras med samma prislista — namnen, tiderna och priserna
 * ur branschpaketet. Namnen och tiderna är bra utgångspunkter: en frisör klipper
 * dam, herr och barn oavsett var salongen ligger. **Priserna är gissningar.**
 *
 * Det är den enda inställningen i produkten som är självsäkert felaktig. En tom
 * text syns; ett pris som ser rimligt ut men är hundra kronor fel gör det inte,
 * och det upptäcks först när en kund bokat på det och sitter i stolen.
 *
 * Bedömningen görs genom jämförelse i stället för genom en sparad flagga. En
 * flagga måste sättas vid registreringen och underhållas vid varje ändring, och
 * den dagen någon glömmer det står det "din prislista" över våra siffror. En
 * jämförelse kan inte hamna ur synk med verkligheten — den läser verkligheten.
 */

const normal = (v?: string) => (v ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

/** Priserna ur branschpaketet, uppslagna på tjänstens namn. */
function paketetsPriser(bransch?: string | null): Map<string, string> {
  const karta = new Map<string, string>()
  for (const kat of tradePack(bransch).categories) {
    for (const rad of kat.items) karta.set(normal(rad.name), normal(rad.price))
  }
  return karta
}

/**
 * Hur många priser salongen satt själv.
 *
 * En rad räknas som deras så fort priset skiljer sig från paketets — eller så
 * fort tjänsten inte finns i paketet alls, eftersom en tjänst de lagt till är
 * per definition deras.
 */
export function egnaPriser(kategorier: ServiceCategory[] | undefined, bransch?: string | null): number {
  const paket = paketetsPriser(bransch)
  let egna = 0

  for (const kat of kategorier ?? []) {
    for (const rad of kat.items ?? []) {
      const namn = normal(rad.name)
      if (!namn) continue
      const vårt = paket.get(namn)
      if (vårt === undefined || vårt !== normal(rad.price)) egna++
    }
  }
  return egna
}

/**
 * Står prislistan kvar som vi levererade den?
 *
 * Ett enda ändrat pris räcker för att svaret ska bli nej. Salongen har då börjat
 * göra listan till sin, och en banderoll som fortsätter säga "exempel" över
 * arbete de lagt ned läser som att vi inte tittat.
 */
export function ärExempelPrislista(kategorier: ServiceCategory[] | undefined, bransch?: string | null): boolean {
  const rader = (kategorier ?? []).reduce((n, k) => n + (k.items?.length ?? 0), 0)
  return rader > 0 && egnaPriser(kategorier, bransch) === 0
}

/**
 * En tom lista att bygga från.
 *
 * Ingenting sparas av vår — inte namnen, inte kategorierna, inte tiderna.
 *
 * Frestelsen är att behålla raderna och bara tömma priserna, eftersom "en frisör
 * klipper ju dam, herr och barn". Men hur salongen delar upp och namnger det de
 * säljer är deras yrkeskunnande, inte vårt: en salong räknar färgning per
 * hårlängd, en annan per tidsåtgång, en tredje säljer bara paket. En halvtömd
 * mall ser ut som ett formulär att fylla i och styr dem in i vår uppdelning.
 *
 * Exempellistan finns för att ge en bild av vad som brukar stå. Den som väljer
 * att göra sin egen har sett den, och tar med sig det de vill ha.
 */
export function tomPrislista(): ServiceCategory[] {
  return []
}
