'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HomeTest2 } from './HomeTest2'
import { SETUP_DONE_KEY } from './setup/steps'

/*
 * The merged Home page (summary + weekly actions in one) for every customer —
 * the old Growth/Pro startpage is gone. A customer who has not been set up
 * yet is routed to the setup flow rather than a dashboard with nothing in it.
 * The children prop remains so the server page's markup can stay put as a
 * fallback shell, but it is never rendered.
 */
export function StartpageSwitch({ companyName, connected = false }: { companyName: string; connected?: boolean; children?: React.ReactNode }) {
  const router = useRouter()
  const [checkedWelcome, setCheckedWelcome] = useState(false)

  useEffect(() => {
    if (connected) { setCheckedWelcome(true); return }
    let started = false
    try {
      started = (JSON.parse(localStorage.getItem(SETUP_DONE_KEY) ?? '[]') as string[]).length > 0
    } catch { /* first run */ }

    if (!started) router.replace('/dashboard/setup')
    else          setCheckedWelcome(true)
  }, [connected, router])

  if (!checkedWelcome) return null
  return <HomeTest2 companyName={companyName} />
}
