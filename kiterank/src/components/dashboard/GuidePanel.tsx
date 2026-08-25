'use client'
import { useState } from 'react'
import Link from 'next/link'
import { synligaSteg, type GuideSteg } from '@/lib/guide'
import { usePlan } from '@/components/PlanProvider'

/*
 * Vägen in, som en lista att beta av.
 *
 * Ett steg i taget är öppet — det som står på tur. Alla öppna samtidigt gav en
 * skärm med tjugo saker att göra, vilket för någon som köpt sin första
 * hemsida är en anledning att stänga fliken. Är steget klart fälls det ihop
 * till en rad med en bock, och nästa öppnar sig.
 *
 * Ingenting är spärrat. Den som vill börja med bokningen klickar på den raden;
 * ordningen är ett råd, inte en grind. Skälet är att kunden ibland har en
 * anledning vi inte känner till — en tid ska tas emot i morgon — och en guide
 * som står i vägen för det blir något man tar sig förbi i stället för följer.
 */

const T = {
  title:    'Kom igång',
  klartSub: 'Du har gjort allt som behövs. Härifrån handlar det om att hålla sidan aktuell och läsa av hur det går.',
  av:       (k: number, n: number) => `${k} av ${n} klara`,
  gör:      'Gör det här',
  visa:     'Visa',
  dölj:     'Dölj',
}

export function GuidePanel({ steg: alla }: { steg: GuideSteg[] }) {
  /* Bokningsstegen faller bort för den som tar emot förfrågningar i stället
     för att boka tider. Servern räknar fram listan hel eftersom den inte har
     något upplägg att fråga efter. */
  const { plan } = usePlan()
  const steg = synligaSteg(alla, plan)

  const klara = steg.filter(s => s.klart).length
  const nästa = steg.find(s => !s.klart)

  /* Öppnat för hand vinner över det som står på tur. Null betyder att ingen
     rört listan än, alltså att nästa steg får stå öppet. */
  const [öppet, setÖppet] = useState<string | null>(null)
  const aktivt = öppet ?? nästa?.id ?? null

  return (
    <section className="bg-navy-900 border border-sky-400/30 rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-white font-semibold">{T.title}</h2>
        <span className="text-slate-400 text-xs tabular-nums">{T.av(klara, steg.length)}</span>
      </div>

      {/* En rad som fylls. Siffran säger hur många; stapeln säger hur nära. */}
      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-sky-400 rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(klara / Math.max(steg.length, 1) * 100)}%` }}
        />
      </div>

      {!nästa && (
        <p className="text-slate-400 text-sm mb-4">{T.klartSub}</p>
      )}

      <ol className="space-y-2">
        {steg.map((s, i) => {
          const öppen = s.id === aktivt
          return (
            <li
              key={s.id}
              className={`rounded-xl border transition-colors ${
                öppen ? 'bg-navy-800 border-navy-600' : 'bg-navy-900 border-navy-700'
              }`}
            >
              <button
                onClick={() => setÖppet(öppen ? '' : s.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <Bock klart={s.klart} nummer={i + 1} />
                <span className={`flex-1 min-w-0 text-sm font-semibold ${
                  s.klart ? 'text-slate-500 line-through decoration-slate-600' : 'text-white'
                }`}>
                  {s.rubrik}
                </span>
                <span className="shrink-0 text-slate-500 text-xs">{öppen ? T.dölj : T.visa}</span>
              </button>

              {öppen && (
                <div className="px-3 pb-3 pl-11 space-y-3">
                  <p className="text-slate-400 text-xs leading-relaxed">{s.varför}</p>

                  {!!s.delar?.length && (
                    <ul className="space-y-1">
                      {s.delar.map(d => (
                        <li key={d.rubrik} className="flex items-start gap-2 text-xs">
                          <span className={d.klart ? 'text-green-400' : 'text-slate-600'}>
                            {d.klart ? '✓' : '○'}
                          </span>
                          <span className={d.klart ? 'text-slate-500' : 'text-slate-300'}>{d.rubrik}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!s.klart && (
                    <Link
                      href={s.href}
                      className="inline-block px-3 py-1.5 bg-sky-400 text-navy-950 rounded-lg text-xs font-bold hover:bg-sky-300 transition-colors"
                    >
                      {T.gör} →
                    </Link>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/* Bocken när det är gjort, numret innan. Numret finns för att listan ska gå
   att prata om — "jag fastnade på trean" — och försvinner när det är avklarat,
   eftersom ordningen då inte betyder något längre. */
function Bock({ klart, nummer }: { klart: boolean; nummer: number }) {
  return (
    <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
      klart ? 'bg-green-500/20 text-green-400' : 'bg-navy-700 text-slate-400'
    }`}>
      {klart ? '✓' : nummer}
    </span>
  )
}
