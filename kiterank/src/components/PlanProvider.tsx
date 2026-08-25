'use client'
import { createContext, useContext, useState } from 'react'
import { type Plan } from '@/lib/plan'

/*
 * Vilket upplägg som är aktivt, delat genom trädet.
 *
 * Typen och `hasBooking` bor i lib/plan och inte här. En 'use client'-modul
 * exporterar klientreferenser, inte värden — den som importerar en funktion
 * härifrån på servern får något som ser rätt ut tills det anropas. Kontexten
 * och kroken behöver webbläsaren; regeln gör det inte.
 */

export type { Plan }
export { hasBooking } from '@/lib/plan'

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

export function PlanProvider({ start = 'testbok2', children }: {
  /** Startläget, satt av servern utifrån vad kunden betalar för. */
  start?: Plan
  children: React.ReactNode
}) {
  const [plan, setPlan] = useState<Plan>(start)
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
