'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'

/*
 * The bookings block on the home dashboard — the row that closes the loop.
 * Everything above it says how many people the marketing brought in;
 * this says what they booked, in kronor, per channel. It is the number a
 * salon owner can act on, and the reason the platform is one product rather
 * than a website tool next to a booking tool.
 *
 * Exempelsiffror hör till mockläget och ingen annanstans. En salong som loggar
 * in på sitt eget konto ser sina egna tal, även när de är noll — en tom vecka
 * är ett riktigt svar, och den som tror att åtta bokningar är hennes slutar
 * lita på varenda siffra i produkten den dag hon förstår att de var påhittade.
 */

type Summary = {
  real:      boolean
  today:     number
  week:      number
  weekValue: number
  pending:   number
  /** Avbokade tider den kommande veckan — luckor som gått att fylla. */
  cancelled: number
  channels:  { channel: string; value: number }[]
}

const EXAMPLE: Summary = {
  real: false, today: 6, week: 8, weekValue: 9700, pending: 2, cancelled: 1,
  channels: [
    { channel: 'google',    value: 4750 },
    { channel: 'instagram', value: 1900 },
    { channel: 'facebook',  value: 650  },
  ],
}

/* Kontot utan bokningar. Noll är ett svar, inte ett tomrum att fylla. */
const TOM: Summary = {
  real: false, today: 0, week: 0, weekValue: 0, pending: 0, cancelled: 0, channels: [],
}

const CHANNEL_LABEL: Record<string, string> = {
  google: 'Google', facebook: 'Facebook', instagram: 'Instagram', direct: 'Direkt',
}

const T = {
  sv: {
    title: 'Bokningar', open: 'Öppna bokningarna →',
    today: 'idag', week: 'denna vecka', pending: 'väntar svar', cancelled: 'avbokat',
    valueLabel: 'Bokat värde denna vecka',
    channelTitle: 'Bokade kronor per kanal, 30 dagar',
    channelSub: 'Det här är vad din marknadsföring ger tillbaka — bokningar som kom via varje kanal.',
    example: 'exempel',
  },
  en: {
    title: 'Bookings', open: 'Open bookings →',
    today: 'today', week: 'this week', pending: 'awaiting reply', cancelled: 'cancelled',
    valueLabel: 'Booked value this week',
    channelTitle: 'Booked kronor per channel, 30 days',
    channelSub: 'This is what your marketing brings back — bookings that arrived through each channel.',
    example: 'example',
  },
}

export function BokningarHemSection({ exempel = false }: { exempel?: boolean }) {
  const { lang } = useLang()
  const L = T[lang]
  const [data, setData] = useState<Summary>(exempel ? EXAMPLE : TOM)

  useEffect(() => {
    /* Mockläget hämtar ingenting. Exempelveckan är hela poängen med läget, och
       ett svar från databasen hade skrivit över den. */
    if (exempel) return
    let aktiv = true
    fetch('/api/bookings')
      .then(r => r.ok ? r.json() : Promise.reject())
      /* Svaret gäller oavsett om det innehåller något. Villkoret `if (d.real)`
         var det som lät exempelsiffrorna stå kvar på ett skarpt konto. */
      .then((d: Summary) => { if (aktiv) setData(d) })
      .catch(() => {})
    return () => { aktiv = false }
  }, [exempel])

  const maxChannel = Math.max(...data.channels.map(c => c.value), 1)

  return (
    <section className="bg-navy-900 border border-navy-700 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="text-white font-semibold">
          {L.title}
          {exempel && (
            <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-purple-300/80 bg-purple-500/10 px-1.5 py-0.5 rounded">
              {L.example}
            </span>
          )}
        </h2>
        <Link href="/dashboard/bokningar" className="text-xs text-slate-400 hover:text-mustard transition-colors">
          {L.open}
        </Link>
      </div>

      {/* The week at a glance + the kr number that matters */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <p className="text-green-400 text-3xl font-bold tabular-nums">{data.weekValue.toLocaleString('sv-SE')} kr</p>
          <p className="text-slate-500 text-xs mt-0.5">{L.valueLabel}</p>
        </div>
        <div className="flex gap-5 text-sm">
          <span className="text-slate-300"><b className="text-white">{data.today}</b> {L.today}</span>
          <span className="text-slate-300"><b className="text-white">{data.week}</b> {L.week}</span>
          {data.pending > 0 && (
            <span className="text-amber-400"><b>{data.pending}</b> {L.pending}</span>
          )}
          {/* Bara när det finns något att fylla. En nolla varje vecka blir en
              siffra ögat slutar läsa, och då syns inte trean heller. */}
          {data.cancelled > 0 && (
            <span className="text-red-400"><b>{data.cancelled}</b> {L.cancelled}</span>
          )}
        </div>
      </div>

      {/* Kronor per channel — marketing answered in bookings */}
      {data.channels.length > 0 && (
        <div>
          <p className="text-slate-400 text-xs font-medium mb-0.5">{L.channelTitle}</p>
          <p className="text-slate-500 text-xs mb-3">{L.channelSub}</p>
          <div className="space-y-2">
            {data.channels.map(c => (
              <div key={c.channel} className="flex items-center gap-3">
                <span className="text-slate-300 text-xs w-20 shrink-0">{CHANNEL_LABEL[c.channel] ?? c.channel}</span>
                <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
                  <div className="h-full bg-mustard/70 rounded-full" style={{ width: `${Math.round(c.value / maxChannel * 100)}%` }} />
                </div>
                <span className="text-white text-xs font-semibold tabular-nums w-20 text-right shrink-0">
                  {c.value.toLocaleString('sv-SE')} kr
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
