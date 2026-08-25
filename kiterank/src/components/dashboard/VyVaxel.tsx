'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Vy } from '@/lib/datalage'

/*
 * Växeln mellan plattformens tre vyer.
 *
 * Finns för att kunna bedöma produkten på alla tre sätt utan att bygga om
 * något — och utan att skapa ett nytt konto varje gång guiden ska ses.
 *
 *   Kund      det egna kontot, med sina riktiga siffror.
 *   Mockdata  ett påhittat konto, för att se en vy som den ser ut fylld.
 *   Guide     det egna kontot med introduktionen påslagen, alltså så som en
 *             ny kund möter plattformen dag ett.
 *
 * Tre knappar och inte en växel som stegar runt. En växel gör läget till något
 * man klickar sig fram till i stället för väljer, och den som vill från guiden
 * till kunden skulle behöva passera mockdatan för att komma dit.
 *
 * Sidan laddas om efter bytet i stället för att uppdatera state. Läget läses på
 * servern av varje vy, och en omladdning är det enda som gör att alla hämtar om
 * samtidigt — annars visar en flik exempel medan grannen visar verklighet.
 */

const T: Record<Vy, { etikett: string; hjälp: string }> = {
  kund:  { etikett: 'Kund',     hjälp: 'Ditt eget konto med dina riktiga siffror.' },
  mock:  { etikett: 'Mockdata', hjälp: 'Ett påhittat konto med exempelsiffror.' },
  guide: { etikett: 'Guide',    hjälp: 'Ditt konto med introduktionen påslagen — så som en ny kund möter plattformen.' },
}

const ORDNING: Vy[] = ['kund', 'mock', 'guide']

export function VyVaxel({ vy }: { vy: Vy }) {
  const router = useRouter()
  const [byter, setByter] = useState<Vy | null>(null)

  async function byt(till: Vy) {
    if (till === vy) return
    setByter(till)
    try {
      await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vy: till }),
      })
      router.refresh()
    } finally {
      setByter(null)
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ORDNING.map(v => {
        const aktiv = v === vy
        return (
          <button
            key={v}
            onClick={() => void byt(v)}
            disabled={byter !== null}
            title={T[v].hjälp}
            className={`text-xs px-1.5 py-0.5 rounded transition-colors disabled:opacity-60 ${
              aktiv
                ? v === 'kund'
                  ? 'text-slate-200 font-semibold'
                  : 'text-amber-400 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {byter === v ? '…' : T[v].etikett}
          </button>
        )
      })}
    </div>
  )
}
