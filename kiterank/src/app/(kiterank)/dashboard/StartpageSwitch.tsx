'use client'
import { HomeTest2 } from './HomeTest2'
import { type Dataläge } from '@/lib/datalage'

/*
 * Startsidan — summering och veckans åtgärder på ett ställe.
 *
 * Den här komponenten avgjorde tidigare om kunden var uppsatt genom att läsa
 * localStorage, och skickade dem annars till installationsguiden. Det gjorde
 * webbläsaren till facit: en kund som loggade in på mobilen, rensade sina
 * kakor eller bytte webbläsare möttes av en guide de redan gått igenom, och
 * sidan hann rita tomt innan omdirigeringen slog till.
 *
 * Frågan ställs nu i dashboard/layout, mot kontot, på servern. Hit kommer man
 * bara om registreringen är klar — så här finns inget kvar att kontrollera.
 */
export function StartpageSwitch({ companyName, läge }: {
  companyName: string
  läge: Dataläge
  /** Serversidans markup behålls som skal, men renderas aldrig. */
  children?: React.ReactNode
}) {
  return <HomeTest2 companyName={companyName} läge={läge} />
}
