'use client'
import { useMemo, useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import {
  gruppera, summering, förändring, halvor, harHistorik,
  type Månadsrad, type Period, type Stapel,
} from '@/lib/bokningsstatistik'
import { staffedMinutes, type WeekHours } from './kalender'
import type { StaffMember } from './data'

/*
 * Året över kundlistan.
 *
 * Kundhistoriken svarar på "vem kommer tillbaka". Den svarar inte på "går det
 * bättre än förra kvartalet", och det är den frågan en salongsägare faktiskt
 * öppnar historiken för. Därför står den här bandet överst, innan listan.
 *
 * Fyra tal och ett diagram, inte tolv tal. Ett band med allt man kan räkna ut
 * blir en instrumentbräda som ingen läser; fyra tal med varsin förändringssiffra
 * går att ta in på en sekund, och diagrammet under visar formen som talen är
 * summan av.
 *
 * Beläggningen räknas mot dagens öppettider och dagens stolar, även för månader
 * långt bak. Det är en approximation och den står utskriven i förklaringen —
 * alternativet vore att låta bli att visa siffran alls, och en salong som
 * undrar om den är fullbokad är sämre betjänt av ett tomt fält än av ett tal
 * med en fotnot.
 */

const T = {
  sv: {
    rubrik:     'Så har det gått',
    manad: 'Månad', kvartal: 'Kvartal', ar: 'År',
    bokningar: 'Bokningar', varde: 'Värde', belaggning: 'Beläggning', snitt: 'Snitt per bokning',
    aterbud: 'Återbud', uteblev: 'Uteblev',
    period:     (n: number) => n === 1 ? 'senaste månaden' : `senaste ${n} månaderna`,
    mot:        'mot föregående',
    oforandrat: 'Oförändrat',
    ingen:      'Ingen historik att visa ännu.',
    ingenHjalp: 'Så fort bokningarna börjar samlas ritas de här — antal, värde och hur fulla dagarna var, månad för månad.',
    tipBokningar: 'Antal bokade tider. Avbokade räknas inte med — de blev aldrig något.',
    tipVarde:     'Summan av priserna för de bokade tiderna.',
    tipBelaggning:'Hur stor del av den bemannade tiden som var bokad. Räknat mot dina öppettider och din personal som de ser ut idag, så en månad då ni var färre kan se fullare ut än den var.',
    tipSnitt:     'Värdet delat på antalet bokningar. Den här siffran rör sig när ni börjar sälja behandling i stället för klippning.',
    tipAterbud:   'Andel av alla bokade tider som avbokades.',
    tipUteblev:   'Andel av de tider som hunnit avgöras där kunden inte kom. Över tio procent är värt att åtgärda — en påminnelse dagen innan är det billigaste sättet.',
    pagar:        'pågår',
    tipPagar:     'Perioden är inte slut, så stapeln visar bara vad som hunnit hända. Den räknas inte in i pilarna ovanför — en halv månad är ingen dålig månad.',
    tipDelvis:    'Historiken går ett år tillbaka, och den här perioden började innan dess. Stapeln visar bara den del vi har, och räknas inte in i pilarna ovanför.',
  },
  en: {
    rubrik:     'How it has gone',
    manad: 'Month', kvartal: 'Quarter', ar: 'Year',
    bokningar: 'Bookings', varde: 'Value', belaggning: 'Occupancy', snitt: 'Average booking',
    aterbud: 'Cancellations', uteblev: 'No-shows',
    period:     (n: number) => n === 1 ? 'the last month' : `the last ${n} months`,
    mot:        'vs previous',
    oforandrat: 'Unchanged',
    ingen:      'No history to show yet.',
    ingenHjalp: 'As soon as bookings start collecting they are drawn here — count, value and how full the days were, month by month.',
    tipBokningar: 'Booked appointments. Cancelled ones are not counted — they never happened.',
    tipVarde:     'The total price of the booked appointments.',
    tipBelaggning:'How much of the staffed time was booked. Measured against your opening hours and staff as they are today, so a month when you were fewer can look fuller than it was.',
    tipSnitt:     'Value divided by number of bookings. This moves when you start selling treatments rather than cuts.',
    tipAterbud:   'Share of all booked appointments that were cancelled.',
    tipUteblev:   'Share of settled appointments where the customer did not turn up. Above ten percent is worth acting on — a reminder the day before is the cheapest fix.',
    pagar:        'in progress',
    tipPagar:     'The period is not over, so the bar only shows what has happened so far. It is left out of the arrows above — half a month is not a bad month.',
    tipDelvis:    'The history goes one year back, and this period started before that. The bar shows only the part we have, and is left out of the arrows above.',
  },
}

const kr = (n: number) => `${n.toLocaleString('sv-SE')} kr`

/** 12 400 kr blir "12,4 tn" — en stapeletikett har inte plats för hela talet. */
function kort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} mn`
  if (n >= 10_000)    return `${Math.round(n / 1000)} tn`
  if (n >= 1_000)     return `${(n / 1000).toFixed(1).replace('.', ',')} tn`
  return String(n)
}

/** Pilen bredvid ett tal. Grönt uppåt är rätt för allt utom återbud och
 *  uteblivna, som är fel att öka — därför `bra`. */
function Ändring({ pct, bra = true }: { pct: number | null; bra?: boolean }) {
  if (pct === null || pct === 0) return null
  const upp   = pct > 0
  const gott  = upp === bra
  return (
    <span className={`text-xs font-medium ${gott ? 'text-green-400' : 'text-orange-400'}`}>
      {upp ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

type Mått = 'antal' | 'värde' | 'beläggning'

export function HistorikStats({ rader, staff, hours }: {
  /** En rad per månad, färdigräknad på servern. */
  rader: Månadsrad[]
  staff: StaffMember[]
  hours: WeekHours
}) {
  const { lang } = useLang()
  const t = T[lang]

  const [period, setPeriod] = useState<Period>('manad')
  const [mått, setMått]     = useState<Mått>('antal')

  /*
   * Kapaciteten per månad, räknad en gång.
   *
   * Samma funktion som kalenderns beläggningsruta använder, med tom
   * frånvarolista: vi vet vem som är ledig nästa vecka men inte vem som var
   * sjuk i november, och att gissa vore att räkna bort timmar som kanske aldrig
   * försvann.
   */
  const kapacitet = useMemo(() => {
    const karta = new Map<string, number>()
    for (const r of rader) {
      const [år, mån] = r.månad.split('-').map(Number)
      const dagar = new Date(år, mån, 0).getDate()
      karta.set(r.månad, staffedMinutes({
        from: `${r.månad}-01`, days: dagar, staff, absences: [], hours,
      }))
    }
    return karta
  }, [rader, staff, hours])

  /* Vilken månad vi står i, som datum och inte som klocka: det enda som behövs
     är vilken stapel som inte är färdig. Sista raden servern skickade är den
     månaden — att läsa den därifrån i stället för ur webbläsarens klocka håller
     server och panel överens även för den som sitter i en annan tidszon. */
  const nuMånad = rader.length ? rader[rader.length - 1].månad : undefined

  const staplar = useMemo(
    () => gruppera(rader, period, m => kapacitet.get(m) ?? 0, lang, nuMånad),
    [rader, period, kapacitet, lang, nuMånad])

  const total = useMemo(() => summering(staplar), [staplar])

  /* Reglerna för vad som jämförs med vad står i halvor(). */
  const jämför = useMemo(() => {
    const h = halvor(staplar)
    if (!h || !h.förra.length) return null
    return { nu: summering(h.nu), förra: summering(h.förra) }
  }, [staplar])

  if (!harHistorik(rader)) {
    return (
      <div className="border border-navy-700 rounded-2xl px-6 py-8 text-center mb-4">
        <p className="text-white font-semibold text-sm">{t.ingen}</p>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">{t.ingenHjalp}</p>
      </div>
    )
  }

  const rutor: { nyckel: Mått | null; etikett: string; värde: string; tip: string; ändring: number | null; bra?: boolean }[] = [
    { nyckel: 'antal',      etikett: t.bokningar,  värde: String(total.antal),      tip: t.tipBokningar,
      ändring: jämför && förändring(jämför.nu.antal, jämför.förra.antal) },
    { nyckel: 'värde',      etikett: t.varde,      värde: kr(total.värde),          tip: t.tipVarde,
      ändring: jämför && förändring(jämför.nu.värde, jämför.förra.värde) },
    { nyckel: 'beläggning', etikett: t.belaggning, värde: `${total.beläggning}%`,   tip: t.tipBelaggning,
      ändring: jämför && förändring(jämför.nu.beläggning, jämför.förra.beläggning) },
    { nyckel: null,         etikett: t.snitt,      värde: kr(total.snitt),          tip: t.tipSnitt,
      ändring: jämför && förändring(jämför.nu.snitt, jämför.förra.snitt) },
  ]

  const värdeAv = (s: Stapel) => mått === 'antal' ? s.antal : mått === 'värde' ? s.värde : s.beläggning
  const topp    = Math.max(1, ...staplar.map(värdeAv))
  const etikett = (s: Stapel) =>
    mått === 'antal' ? String(s.antal) : mått === 'värde' ? kort(s.värde) : `${s.beläggning}%`

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">{t.rubrik}</h3>
          <p className="text-slate-500 text-xs mt-0.5">{t.period(rader.length)}</p>
        </div>
        <div className="flex gap-1 bg-navy-950 border border-navy-700 rounded-xl p-1">
          {([['manad', t.manad], ['kvartal', t.kvartal], ['ar', t.ar]] as [Period, string][]).map(([id, namn]) => (
            <button
              key={id}
              onClick={() => setPeriod(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === id ? 'bg-mustard/15 text-mustard' : 'text-slate-400 hover:text-white'
              }`}
            >
              {namn}
            </button>
          ))}
        </div>
      </div>

      {/* Talen. De tre första är också knappar — de byter vad diagrammet ritar,
          så att man kan ställa frågan "var i året kom värdet ifrån" på samma
          ställe som man läste summan. Snittet har ingen egen kurva: en stapel
          per snitt säger inget som värdet och antalet inte redan sagt. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        {rutor.map(r => {
          const valbar = r.nyckel !== null
          const vald   = valbar && mått === r.nyckel
          return (
            <div
              key={r.etikett}
              onClick={valbar ? () => setMått(r.nyckel as Mått) : undefined}
              role={valbar ? 'button' : undefined}
              tabIndex={valbar ? 0 : undefined}
              onKeyDown={valbar ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMått(r.nyckel as Mått) } } : undefined}
              className={`rounded-xl p-3 border transition-colors ${
                vald ? 'bg-navy-800 border-mustard/40'
                     : `bg-navy-950/60 border-navy-700 ${valbar ? 'cursor-pointer hover:border-navy-600' : ''}`
              }`}
            >
              <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">{r.etikett}</p>
              <Tooltip text={r.tip}>
                <p className="text-xl font-bold text-white tabular-nums">{r.värde}</p>
              </Tooltip>
              {/* Noll är oförändrat, och "▲ 0% mot föregående" är ett tal som
                  låtsas vara ett besked. Då står det ordet i stället — och när
                  det saknas jämförelse alls står det ingenting. */}
              {r.ändring !== null && r.ändring !== undefined && (
                <p className="mt-1 flex items-center gap-1.5">
                  {r.ändring === 0
                    ? <span className="text-slate-500 text-xs font-medium">{t.oforandrat}</span>
                    : <>
                        <Ändring pct={r.ändring} bra={r.bra} />
                        <span className="text-slate-600 text-[11px]">{t.mot}</span>
                      </>}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/*
        Diagrammet: rena div:ar och inget ritbibliotek. Tretton staplar är
        tretton rutor med varsin höjd, och ett bibliotek för det vore ett
        beroende att underhålla i all framtid för något CSS redan gör.

        Det får scrolla i sitt eget spår. Tretton staplar på en telefon blir
        arton pixlar var, och då kortas "aug -25" till "a…" — tretton etiketter
        som alla lyder likadant och ingen kan läsa. Med en minsta bredd står
        månaderna kvar som månader och den som vill se hela året drar i stället
        i sidled. Bara diagrammet rör sig; talen ovanför staplar om sig som
        vanligt.
      */}
      <div className="-mx-1 px-1 overflow-x-auto">
      <div className="flex items-end gap-1.5 h-40 min-w-[480px]" role="img" aria-label={t.rubrik}>
        {staplar.map(s => {
          const v = värdeAv(s)
          const h = Math.round((v / topp) * 100)
          return (
            <Tooltip
              key={s.nyckel}
              text={`${s.etikett} — ${s.antal} ${t.bokningar.toLowerCase()}, ${kr(s.värde)}, ${s.beläggning}% ${t.belaggning.toLowerCase()}${s.avbokade ? `, ${s.avbokade} ${t.aterbud.toLowerCase()}` : ''}${s.hel ? '' : `. ${s.pågår ? t.tipPagar : t.tipDelvis}`}`}
            >
              <div className="flex-1 flex flex-col items-center justify-end h-40 min-w-0">
                <span className="text-[10px] text-slate-400 tabular-nums mb-1 truncate w-full text-center">
                  {v > 0 ? etikett(s) : ''}
                </span>
                {/* En stympad period ritas ihålig — den som pågår och den i
                    andra änden som minnet inte når hela vägen till. En fylld
                    stapel som är kortare än grannen läses som ett fall, och det
                    är inte vad en halv period är. Konturen säger "inte hel"
                    utan ett ord. */}
                <div
                  className={`w-full rounded-t transition-all ${
                    v <= 0   ? 'bg-navy-800'
                    : !s.hel ? 'bg-mustard/15 border border-dashed border-mustard/60'
                    :          'bg-mustard/70'
                  }`}
                  style={{ height: v > 0 ? `${Math.max(h, 3)}%` : '3px' }}
                />
                <span className={`text-[10px] mt-1.5 truncate w-full text-center ${
                  s.hel ? 'text-slate-500' : 'text-mustard/70'
                }`}>
                  {s.hel ? s.etikett : `${s.etikett} ·`}
                </span>
              </div>
            </Tooltip>
          )
        })}
      </div>
      </div>

      {/* Återbud och uteblivna står under och inte i rutraden ovan. De är
          diagnoser och inte resultat: en salong läser dem när något känns fel,
          inte varje gång den öppnar sidan. */}
      <div className="flex gap-5 flex-wrap mt-4 pt-3 border-t border-navy-800">
        <Tooltip text={t.tipAterbud}>
          <span className="text-xs text-slate-400">
            {t.aterbud}: <span className="text-slate-200 font-medium tabular-nums">{total.avbokade}</span>
            <span className="text-slate-600"> · {total.avbokadeAndel}%</span>
          </span>
        </Tooltip>
        {total.avgjorda > 0 && (
          <Tooltip text={t.tipUteblev}>
            <span className="text-xs text-slate-400">
              {t.uteblev}: <span className={`font-medium tabular-nums ${
                total.uteblivnaAndel >= 10 ? 'text-orange-400' : 'text-slate-200'
              }`}>{total.uteblivna}</span>
              <span className="text-slate-600"> · {total.uteblivnaAndel}%</span>
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
