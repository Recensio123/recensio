'use client'
import { createContext, useContext, useState } from 'react'

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
 *
 * Det tredje läget, `testbok`, är borta. Det fanns för att kunna se en ändring
 * bredvid det den ersatte medan marknadsföringssidan förenklades — den
 * jämförelsen är gjord, och testbok2 är det som gäller.
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

type PlanContextValue = {
  plan:    Plan
  setPlan: (plan: Plan) => void
}

/* Bokningsläget är förvalet. Det är upplägget produkten byggs mot, och det som
   en ny kund möter om ingenting annat sagts. */
const PlanContext = createContext<PlanContextValue>({
  plan:    'testbok2',
  setPlan: () => {},
})

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Plan>('testbok2')
  return (
    <PlanContext.Provider value={{ plan, setPlan }}>
      {children}
    </PlanContext.Provider>
  )
}

/** Read or change the active plan from any dashboard component. */
export function usePlan(): PlanContextValue {
  return useContext(PlanContext)
}
