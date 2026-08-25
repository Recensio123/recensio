'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LanguageProvider'
import type { Vy } from '@/lib/datalage'

/*
 * Bandet som säger vilken vy man står i.
 *
 * Hela demot vilar på den här raden. Utan den är ett läge som fyller kontot med
 * en annan salongs siffror en fälla: kunden ser 8 400 profilvisningar, blir
 * glad, och upptäcker veckor senare att det aldrig var deras. Då slutar de tro
 * på varenda siffra i produkten — även de äkta.
 *
 * Därför står det överst på varje sida, i en färg som inte går att missa, och
 * det finns ingen kryssruta för att stänga det. Vägen ut är att lämna läget.
 *
 * Guiden får ett eget band i en egen färg. Skälet är att de två säger olika
 * saker: mockbandet varnar för att siffrorna är påhittade, guidebandet säger
 * att siffrorna är äkta men att introduktionen visas. Samma gula rad för båda
 * hade lärt ögat att ignorera varningen.
 */

const T = {
  sv: {
    demo:  'Du tittar på ett demokonto. Siffrorna är påhittade och tillhör inte dig.',
    guide: 'Du ser plattformen som en ny kund gör, med introduktionen påslagen. Siffrorna är dina egna.',
    ut:    'Tillbaka till mitt konto',
  },
  en: {
    demo:  'You are viewing a demo account. These numbers are made up and are not yours.',
    guide: 'You are seeing the platform as a new customer does, with the introduction switched on. The numbers are your own.',
    ut:    'Back to my account',
  },
}

export function LägeBand({ vy }: { vy: Vy }) {
  const router = useRouter()
  const { lang } = useLang()
  const t = T[lang]
  const [lämnar, setLämnar] = useState(false)

  if (vy === 'kund') return null

  async function lämna() {
    setLämnar(true)
    try {
      await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vy: 'kund' }),
      })
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLämnar(false)
    }
  }

  const guide = vy === 'guide'

  return (
    <div className={`px-4 sm:px-8 py-2 flex items-center justify-between gap-4 flex-wrap ${
      guide ? 'bg-sky-400 text-navy-950' : 'bg-mustard text-navy-950'
    }`}>
      <p className="text-xs font-semibold">{guide ? t.guide : t.demo}</p>
      <button
        onClick={() => void lämna()}
        disabled={lämnar}
        className="text-xs font-bold underline underline-offset-2 hover:no-underline disabled:opacity-60"
      >
        {t.ut}
      </button>
    </div>
  )
}

/** Kvar för anropare som bara känner till av/på. */
export function DemoBand() {
  return <LägeBand vy="mock" />
}
