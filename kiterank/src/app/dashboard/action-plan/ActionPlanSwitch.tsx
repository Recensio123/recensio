'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/*
 * The Action Plan lives merged into Home — this route only exists so old
 * links keep working, and always redirects there.
 */
export function ActionPlanSwitch({ children: _children }: { children?: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard#actions') }, [router])
  return null
}
