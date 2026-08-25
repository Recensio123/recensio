import { cookies } from 'next/headers'
import { MOCK_KAKA, VY_KAKA, läsVy, type Vy } from '@/lib/datalage'

/*
 * Serversidan av dataläget.
 *
 * Ligger för sig eftersom klientkomponenter behöver typerna och harSiffror
 * men aldrig får dra in cookies() och behörighetskontrollen — de hör hemma på
 * servern, och en import härifrån i webbläsarpaketet stoppar bygget.
 */

/**
 * Vilken vy den som frågar har valt.
 *
 * Kakan räcker, och det är med flit. Lägena är öppna för varje kund — skyddet
 * mot förväxling ligger i bandet överst som inte går att stänga, inte i vem
 * som får slå på dem.
 */
export async function hämtaVy(): Promise<Vy> {
  const jar = await cookies()

  const vy = läsVy(jar.get(VY_KAKA)?.value)
  if (vy !== 'kund') return vy

  /* Den gamla av/på-kakan. En session som stod i demoläget när växeln byggdes
     om ska inte kastas tillbaka till sitt eget konto mitt i en genomgång. */
  return jar.get(MOCK_KAKA)?.value === '1' ? 'mock' : 'kund'
}

/** Ska vyn rita exempelsiffror? Bara i mockläget — aldrig på ett skarpt konto,
 *  och inte heller i guiden, som ska bedömas mot ett tomt konto. */
export async function visaExempel(): Promise<boolean> {
  return (await hämtaVy()) === 'mock'
}

/** Ska introduktionen visas? */
export async function visaGuide(): Promise<boolean> {
  return (await hämtaVy()) === 'guide'
}
