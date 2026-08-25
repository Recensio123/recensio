import type { ServiceCategory } from '@/lib/services-data'

/*
 * Det som gör en publicerad sida trasig för besökaren.
 *
 * Skilt från checklistan i panelen, som säger vad som återstår för att sidan
 * ska bli bra. Det här är en kortare och strängare lista: vad som är fel nog
 * att någon som besöker sidan möter en återvändsgränd.
 *
 * Regeln ligger som ren funktion för att den ska gå att pröva. En sida som
 * skickar besökare mot en knapp som inte gör något är det dyraste felet i
 * produkten som inte kostar pengar direkt — och det enda som varken kompilatorn
 * eller ögat fångar, eftersom knappen ser precis ut som en knapp.
 */

export type Brist = {
  id:      string
  rubrik:  string
  /** Vad besökaren möter. Skrivet ur deras synvinkel, inte ur systemets. */
  följd:   string
  /** Vad salongen gör åt det. */
  åtgärd:  string
}

export type SidansLäge = {
  /** Prislistan som den ligger sparad. */
  menuCategories?: ServiceCategory[]
  bransch?:        string | null
  /** Salongens egen bokningsadress, om de klistrat in en. */
  bookingUrl?:     string
  /** Är vårt bokningssystem påslaget för sajten. */
  harBokning:      boolean
}

/**
 * Bristerna, i den ordning de skadar mest.
 *
 * Tom lista betyder att sidan går att publicera utan att besökaren möter något
 * som inte fungerar. Den säger ingenting om att sidan är bra.
 */
export function sidansBrister(läge: SidansLäge): Brist[] {
  const brister: Brist[] = []

  const egenLänk    = !!läge.bookingUrl?.trim()
  const gårAttBoka  = läge.harBokning || egenLänk
  /* Tjänstelistan är salongens egen så snart den har rader. Här stod tidigare
     en jämförelse mot branschpaketet, eftersom listan seedades vid
     registreringen och en orörd lista var vår och inte deras. Numera seedas
     ingenting: en tom lista betyder att de inte satt sina priser än, och en rad
     är en rad de skrivit själva. */
  const harPrislista = (läge.menuCategories ?? []).some(k => (k.items?.length ?? 0) > 0)

  /*
   * Knappen utan mål.
   *
   * Prislistan är det första målet, bokningen det andra. Saknas båda finns
   * ingenting kvar att skicka besökaren till, och knappen ritas då som en död
   * knapp på den publicerade sidan i stället för att peka någonstans på måfå.
   */
  if (!harPrislista && !gårAttBoka) {
    brister.push({
      id:     'ingen-vag-vidare',
      rubrik: 'Boka-knappen leder ingenstans',
      följd:  'Du har varken en prislista eller ett sätt att ta emot bokningar. '
            + 'Knappen syns på sidan men går inte att klicka på — besökaren '
            + 'ser vad du vill att de ska göra och kan inte göra det.',
      åtgärd: 'Sätt egna priser i prislistan, slå på bokningssystemet, eller '
            + 'klistra in länken dit du tar emot bokningar i dag.',
    })
  }

  return brister
}
