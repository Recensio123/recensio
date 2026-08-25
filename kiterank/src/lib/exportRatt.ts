/*
 * Vem som får ta med sig hemsidan.
 *
 * Två villkor, och båda handlar om samma sak: att designarbetet är utfört och
 * betalt. Mallpaketet innehåller inget sådant arbete — kunden valde en mall och
 * formade den själv — så där finns ingenting att ta med sig utöver innehållet.
 *
 * Tolv betalda månader, inte tolv månader sedan registreringen. Skillnaden är
 * hela regeln: annars kvalificerar sig den som provade i en vecka, betalade en
 * månad och sedan var borta i elva.
 *
 * Kundhistoriken lyder inte under den här regeln. Den är salongens kunders
 * personuppgifter och ska tillbaka oavsett paket och oavsett tid — se
 * kommentaren i export.server.
 */

export type Exportunderlag = {
  plan:           string | null
  /** Betalda månader hos oss, räknade ur Stripes fakturor. */
  betaldaMånader: number
  /** Datum då avtalet avslutades, om det gjort det. */
  avslutat:       string | null
}

export type Exportsvar =
  | { får: true }
  | { får: false; skäl: 'fel-paket' | 'for-kort-tid' | 'fonstret-stangt'; text: string }

/** Dagar efter avslutat avtal som hemsidan fortfarande går att hämta. */
export const FÖNSTER_DAGAR = 30

/*
 * Månaderna som gör designarbetet avbetalt.
 *
 * Samma tal styr två saker: rätten att ta med sig sidan, och avdraget på
 * månadsavgiften. Det är med flit ett tal och inte två — de är samma löfte
 * sett från två håll, och skulle de glida isär skulle en kund kunna få sidan
 * utan att ha fått avdraget, eller tvärtom.
 */
export const KRAV_MÅNADER = 12

/** Kronor per månad som faller bort när sidan är avbetald. */
export const AVBETALD_RABATT_KR = 150

/** Har kunden betalat färdigt för sin formgivna sida? */
export function designAvbetald(plan: string | null, betaldaMånader: number): boolean {
  if (plan !== 'design' && plan !== 'fullservice') return false
  return betaldaMånader >= KRAV_MÅNADER
}

/**
 * Gäller avdraget just nu?
 *
 * Två villkor, och det andra är lätt att missa: avdraget hör till paketet, inte
 * till kunden. Mallpaketet kan aldrig bli billigare — där finns ingen
 * formgivning att betala av, och 150 kr bort från 129 vore att betala kunden
 * för att vara kund.
 *
 * Att ha betalat av sin sida är däremot permanent. En kund som går ned till
 * mall och senare tillbaka upp får avdraget igen direkt, utan nytt år.
 */
export function avdragGäller(plan: string | null, sidaAvbetald: string | null | undefined): boolean {
  if (!sidaAvbetald) return false
  return plan === 'design' || plan === 'fullservice'
}

/**
 * Förlorar kunden sin formgivna sida om de går ned till mall nu?
 *
 * Sidan är betald först efter ett år. Går de ned dessförinnan har de fått ett
 * arbete de inte betalat färdigt för, och det följer inte med till mallnivån.
 * Det ska stå innan de klickar, inte efteråt.
 */
export function förlorarSidan(
  frånPlan: string | null, tillPlan: string, sidaAvbetald: string | null | undefined,
): boolean {
  if (tillPlan !== 'mall') return false
  if (frånPlan !== 'design' && frånPlan !== 'fullservice') return false
  return !sidaAvbetald
}

export function fårTaMedHemsidan(u: Exportunderlag, nu: Date = new Date()): Exportsvar {
  if (u.plan !== 'design' && u.plan !== 'fullservice') {
    return {
      får: false, skäl: 'fel-paket',
      text: 'Mallpaketet innehåller ingen egen formgivning — rätten gäller designade sidor.',
    }
  }

  if (u.betaldaMånader < KRAV_MÅNADER) {
    return {
      får: false, skäl: 'for-kort-tid',
      text: `${u.betaldaMånader} av ${KRAV_MÅNADER} betalda månader.`,
    }
  }

  /*
   * Fönstret efter uppsägningen. Folk frågar efter att de slutat, inte innan,
   * och en månad kostar oss ingenting samtidigt som den tar bort ett helt
   * supportärende.
   */
  if (u.avslutat) {
    const dagar = Math.floor((nu.getTime() - new Date(u.avslutat).getTime()) / 86_400_000)
    if (dagar > FÖNSTER_DAGAR) {
      return {
        får: false, skäl: 'fonstret-stangt',
        text: `Avtalet avslutades för ${dagar} dagar sedan. Fönstret är ${FÖNSTER_DAGAR} dagar.`,
      }
    }
  }

  return { får: true }
}
