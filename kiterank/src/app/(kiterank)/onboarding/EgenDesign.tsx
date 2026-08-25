'use client'
import { useState } from 'react'

/*
 * Erbjudandet om en formgiven sida, mitt i mallvalet.
 *
 * Ligger här och ingen annanstans av ett enda skäl: det är den enda minuten då
 * kunden aktivt tittar på hur deras hemsida ska se ut. Frågar man dem en vecka
 * senare har de redan vant sig vid mallen, och frågar man i ett nyhetsbrev
 * läser ingen.
 *
 * Ingen betalning och inget val som binder. En formgiven sida börjar med ett
 * samtal om hur den ska se ut, och det samtalet kan inte ersättas av en knapp.
 * Frågan hamnar i samma lista som uppgraderingar från panelen.
 */

export function EgenDesign({ titel, om, cta, klar }: {
  titel: string
  om:    string
  cta:   string
  klar:  string
}) {
  const [läge, setLäge] = useState<'vila' | 'skickar' | 'klar'>('vila')

  async function fråga() {
    setLäge('skickar')
    try {
      await fetch('/api/betalning/paketbyte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'design' }),
      })
    } catch { /* en obesvarad förfrågan är illa nog utan ett felmeddelande */ }
    /* Klar oavsett svar. Kunden har sagt vad de vill; att de skulle behöva
       bry sig om vår databas vore fel sorts ärlighet. Misslyckas anropet syns
       det i loggen och inte i deras registrering. */
    setLäge('klar')
  }

  if (läge === 'klar') {
    return (
      <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
        {klar}
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800/50 p-4 flex items-start gap-3 flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <p className="text-sm font-semibold text-white">{titel}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{om}</p>
      </div>
      <button
        onClick={() => void fråga()}
        disabled={läge === 'skickar'}
        className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-white transition-colors disabled:opacity-60"
      >
        {läge === 'skickar' ? '…' : cta}
      </button>
    </div>
  )
}
