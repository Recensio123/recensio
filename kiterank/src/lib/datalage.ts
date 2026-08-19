/*
 * Vilken data en vy ska visa — ett beslut, på ett ställe.
 *
 * Låg tidigare som `const FORCE_MOCK = true` i åtta olika sidfiler. Åtta
 * kopior av samma beslut betyder att den dag produkten ska visa riktiga
 * siffror måste åtta filer hittas, och den som glöms bort visar påhittade tal
 * för en betalande kund utan att någon märker det.
 *
 * Fyra lägen, och skillnaden mellan de två tomma är inte kosmetisk:
 *
 *   egen        deras siffror — alltid förvalet när de finns
 *   ej-kopplat  ingenting hämtas ännu. Kundens sak att åtgärda, med en knapp.
 *   för-nytt    kopplat, men vi har inte hunnit samla. Vår sak. Ingen knapp.
 *   exempel     exempelsiffror, alltid märkta som sådana
 *
 * Slås de två tomma ihop sitter en kund och trycker på en knapp som inte
 * hjälper, eller väntar på data som aldrig kommer för att ingenting är kopplat.
 *
 * Exempeldata får aldrig vara förval för en betalande kund. En salong som ser
 * 340 besökare, blir glad, och senare förstår att siffran var påhittad slutar
 * tro på varenda siffra i produkten — även de äkta.
 */

export type Källa = 'gbp' | 'search' | 'ads' | 'website'

export type Dataläge = 'egen' | 'ej-kopplat' | 'för-nytt' | 'exempel'

/*
 * Under bygget visas exempel i alla vyer.
 *
 * Kopplade konton har mycket tunn verklig data medan produkten byggs, och en
 * vy som alltid är tom går inte att bedöma. När plattformen ska möta kund
 * ändras den här raden till `false` — och då slår det igenom överallt på en
 * gång, vilket är hela poängen med att den bara finns här.
 */
export const VISA_EXEMPEL = true

/**
 * Vad vyn ska visa.
 *
 * `kopplat` — finns en anslutning alls för den här källan.
 * `harData` — har vi något att visa för perioden.
 */
export function dataläge({ kopplat, harData }: {
  kopplat: boolean
  harData: boolean
}): Dataläge {
  if (VISA_EXEMPEL) return 'exempel'
  if (!kopplat)     return 'ej-kopplat'
  if (!harData)     return 'för-nytt'
  return 'egen'
}

/** Sant när vyn ska rita siffror — egna eller exempel. Falskt när den ska
 *  lämna plats åt det tomma läget i stället. */
export function harSiffror(läge: Dataläge): boolean {
  return läge === 'egen' || läge === 'exempel'
}
