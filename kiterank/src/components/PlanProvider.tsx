'use client'
import { createContext, useContext, useState } from 'react'

/*
 * Three modes, one product.
 *
 *   test      — the standard experience.
 *   testbok   — the same, plus the booking-system track.
 *   testbok2  — a second booking track, identical to the first, kept as the
 *               working copy while the marketing side is simplified. Having
 *               two lets a change be looked at next to what it replaced
 *               rather than remembered.
 *
 * The old Growth/Pro tiers are gone.
 */
export type Plan = 'test' | 'testbok' | 'testbok2'

/**
 * Does this mode carry the booking system?
 *
 * Every gate asks this rather than comparing to a literal. A second booking
 * track added as a string comparison would have quietly switched the
 * calendar off in the very mode built to preview it.
 */
export function hasBooking(plan: Plan): boolean {
  return plan === 'testbok' || plan === 'testbok2'
}

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
