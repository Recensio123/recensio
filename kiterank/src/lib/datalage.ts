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
 * Exempeldata är ett läge man går in i, inte ett tillstånd produkten är i.
 *
 * Var tidigare en konstant satt till `true`, vilket betydde att varje siffra i
 * varje vy var påhittad för alla — inklusive en betalande kund. Nu är det en
 * växel som bara plattformsadmin kan slå på, och bara för sin egen session.
 *
 * Två skäl att göra den till en växel i stället för att bara slå av den:
 * vyerna behöver fortfarande gå att bedöma medan produkten byggs, och samma
 * konto ska kunna se hur bokningsläget och leadläget ter sig med riktig data.
 * Det går inte om exemplen ligger i vägen.
 *
 * Kunden når den aldrig. Kakan ensam räcker inte — behörigheten kontrolleras
 * varje gång, så en satt kaka i en kundwebbläsare ger ingenting.
 */
export const MOCK_KAKA = 'kr_mock'

/**
 * Vad vyn ska visa.
 *
 * `kopplat` — finns en anslutning alls för den här källan.
 * `harData` — har vi något att visa för perioden.
 * `exempel` — läget är påslaget, från `visaExempel()`.
 */
export function dataläge({ kopplat, harData, exempel }: {
  kopplat: boolean
  harData: boolean
  exempel: boolean
}): Dataläge {
  if (exempel)  return 'exempel'
  if (!kopplat) return 'ej-kopplat'
  if (!harData) return 'för-nytt'
  return 'egen'
}

/** Sant när vyn ska rita siffror — egna eller exempel. Falskt när den ska
 *  lämna plats åt det tomma läget i stället. */
export function harSiffror(läge: Dataläge): boolean {
  return läge === 'egen' || läge === 'exempel'
}

/*
 * Vilken vy plattformen visas i.
 *
 * Var tidigare en av/på-växel mellan kundens konto och ett påhittat. Guiden
 * gör det till tre lägen, och en boolean kan inte bära tre — därför ett värde
 * och inte en flagga till. Nästa läge efter det ska inte kräva att någon
 * hittar alla ställen som frågar "är demot på?".
 *
 *   kund   deras konto, deras siffror. Det enda en betalande kund ser.
 *   mock   ett påhittat konto med exempelsiffror, alltid märkta som sådana.
 *   guide  kundens eget konto, men med introduktionen påslagen — så att den
 *          går att bedöma utan att skapa ett nytt konto varje gång.
 *
 * Guiden visar avsiktligt riktig data och inte exempel: den ska bedömas som en
 * ny kund möter den, och en ny kund har ett tomt konto. Ser den bra ut fylld
 * med en annan salongs siffror säger det ingenting om hur den känns dag ett.
 */

export type Vy = 'kund' | 'mock' | 'guide'

export const VY_KAKA = 'kr_vy'

/** Kakans värde som ett läge. Allt okänt är kundens egen vy — det säkra valet:
 *  ett trasigt värde ska aldrig kunna visa påhittade siffror. */
export function läsVy(rå: unknown): Vy {
  return rå === 'mock' || rå === 'guide' ? rå : 'kund'
}
