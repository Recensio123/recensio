'use client'
import { useSyncExternalStore } from 'react'

/*
 * Klockan, läst på ett sätt som håller.
 *
 * `Date.now()` mitt i en rendering ger två problem. Servern och webbläsaren
 * räknar fram olika värden för samma sida, vilket ger hydreringsfel — React
 * kastar bort HTML:en och ritar om. Och renderingen blir oren: två anrop med
 * samma indata ger olika resultat, vilket React uttryckligen förbjuder.
 *
 * Den vanliga lösningen — läs klockan i en effekt och lägg den i state — byter
 * bara ut ett problem mot ett annat. En setState direkt i en effekt startar en
 * andra rendering av varje komponent som gör det, och projektet har redan tolv
 * såna varningar.
 *
 * useSyncExternalStore är byggt för precis det här: ett värde som finns i
 * webbläsaren men inte på servern. Servern får `null` och ritar ingen tid alls,
 * klienten får klockan efter montering. Ingen omväg via state.
 *
 * Tiden uppdateras var halvminut, delat av alla som frågar. Utan det skulle
 * "för 3 minuter sedan" stå kvar och ljuga resten av besöket — värdet ligger
 * kvar mellan renderingar med flit, eftersom en ny siffra vid varje rendering
 * är just den orenhet vi ville bort från.
 */

const INTERVALL = 30_000

let nu = 0
let timer: ReturnType<typeof setInterval> | null = null
const lyssnare = new Set<() => void>()

function abonnera(på: () => void): () => void {
  lyssnare.add(på)
  if (!timer) {
    nu = Date.now()
    timer = setInterval(() => {
      nu = Date.now()
      for (const l of lyssnare) l()
    }, INTERVALL)
  }
  return () => {
    lyssnare.delete(på)
    /* Sista lyssnaren släcker klockan. En timer som tickar vidare i en
       avmonterad vy håller sidan vaken utan att någon ser resultatet. */
    if (lyssnare.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

/* Måste ge samma svar vid upprepade anrop inom samma rendering, annars
   renderar React om i all oändlighet. Därför det lagrade värdet och inte
   Date.now() rakt av. */
const iKlienten = () => nu || (nu = Date.now())
const påServern = () => null

/**
 * Tiden nu i millisekunder, eller `null` innan komponenten monterat.
 *
 * `null` är inte ett fel att gardera bort — det är serverns ärliga svar. Rita
 * ingen relativ tid då; den dyker upp en tiondels sekund senare.
 */
export function useNu(): number | null {
  return useSyncExternalStore(abonnera, iKlienten, påServern)
}
