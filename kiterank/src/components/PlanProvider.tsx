'use client'
import { createContext, useContext, useState } from 'react'

/* Two modes, one product: 'test' is the standard experience, 'testbok' adds
   the booking-system track on top. The old Growth/Pro tiers are gone. */
export type Plan = 'test' | 'testbok'

type PlanContextValue = {
  plan:    Plan
  setPlan: (plan: Plan) => void
}

const PlanContext = createContext<PlanContextValue>({
  plan:    'test',
  setPlan: () => {},
})

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Plan>('test')
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
