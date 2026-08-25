/*
 * Vilket upplägg kunden kör, och den enda frågan som skiljer dem.
 *
 * Ligger här och inte i PlanProvider, som är en klientkomponent. Skälet är en
 * gräns som är lätt att gå över utan att märka det: ett värde som exporteras
 * ur en `'use client'`-modul blir en klientreferens, inte funktionen själv.
 * Den som importerar den från serversidan får något som ser rätt ut och
 * exploderar först när det anropas.
 *
 * Typen och regeln är ren logik utan tillstånd. De hör hemma där båda sidor
 * får läsa dem; kontexten och kroken stannar i klientkomponenten.
 */

/*
 * Två upplägg, en produkt.
 *
 *   testbok2  — verksamheten bokar tid. Salongen, kliniken, frisören: kunden
 *               väljer en tid själv och resultatet mäts i bokningar och kronor.
 *   test      — verksamheten tar emot förfrågningar. Hantverkaren, byrån: ingen
 *               tidbok, utan någon som hör av sig och ska ringas upp. Samma
 *               plattform i övrigt, men resultatet mäts i leads.
 *
 * Skillnaden är inte kosmetisk. En hantverkare som får "12 bokningar" på sin
 * översikt letar efter en kalender som inte finns; en salong som får "12 leads"
 * undrar varför deras kunder inte redan har en tid. Ordet måste följa hur
 * verksamheten faktiskt tar betalt.
 */
export type Plan = 'test' | 'testbok2'

/**
 * Bär det här läget bokningssystemet?
 *
 * Varje grind frågar det här i stället för att jämföra med en sträng. Ett nytt
 * bokningsläge tillagt som strängjämförelse hade tyst släckt kalendern i just
 * det läge som byggdes för att visa den.
 */
export function hasBooking(plan: Plan): boolean {
  return plan === 'testbok2'
}
