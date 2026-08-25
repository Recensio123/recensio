'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

/*
 * Knappen som öppnar demot.
 *
 * Läget slås på först och navigeringen sker sedan — annars laddar första
 * fliken innan kakan hunnit fram och visar ett tomt konto, vilket är precis
 * motsatsen till vad kunden klickade för att se.
 */
export function StartaDemo({ till, children }: {
  till: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const [öppnar, setÖppnar] = useState(false)

  async function öppna() {
    setÖppnar(true)
    try {
      await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ på: true }),
      })
      router.push(till)
      router.refresh()
    } catch {
      setÖppnar(false)
    }
  }

  return (
    <button
      onClick={() => void öppna()}
      disabled={öppnar}
      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-navy-700/40 transition-colors disabled:opacity-60"
    >
      {children}
    </button>
  )
}
