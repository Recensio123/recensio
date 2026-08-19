'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePlan, type Plan } from '@/components/PlanProvider'

/*
 * A page that does not exist in this mode.
 *
 * Removing it from the menu hides the door; this closes it. Someone who typed
 * the address, followed an old link or used the back button after switching
 * modes lands on the dashboard instead of on a page the mode is meant not to
 * have.
 *
 * The guard is client-side because the mode is: the plan lives in a React
 * context the owner flips from the sidebar, and nothing about it reaches the
 * server. That is the whole mechanism a preview mode has, so it is also the
 * strongest gate available here. It is not a permission — role-based access is
 * enforced in the routes themselves, where it belongs.
 */
export function HiddenIn({ plans, children }: {
  plans:    Plan[]
  children: React.ReactNode
}) {
  const { plan } = usePlan()
  const router   = useRouter()
  const hidden   = plans.includes(plan)

  useEffect(() => {
    if (hidden) router.replace('/dashboard')
  }, [hidden, router])

  return hidden ? null : <>{children}</>
}

/*
 * The other direction: a page that exists in these modes and nowhere else.
 *
 * Same mechanism, same limits — see above. Used for pages built on the
 * simplified track before they are ready for the older modes.
 */
export function OnlyIn({ plans, children }: {
  plans:    Plan[]
  children: React.ReactNode
}) {
  const { plan } = usePlan()
  const router   = useRouter()
  const shown    = plans.includes(plan)

  useEffect(() => {
    if (!shown) router.replace('/dashboard')
  }, [shown, router])

  return shown ? <>{children}</> : null
}
