'use client'
import { useMemo, useState } from 'react'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { type Booking, type StaffMember, type Status } from './data'
import { kundNyckel } from '@/lib/kundNyckel'
import { KundAnteckning } from './KundAnteckning'
import { HistorikStats } from './HistorikStats'
import { DEFAULT_HOURS, type WeekHours } from './kalender'
import { harHistorik, type Månadsrad } from '@/lib/bokningsstatistik'

/*
 * Kundhistoriken — salongen sedd genom sina kunder i stället för sina timmar.
 *
 * Kalendern svarar på "vem står var". Den här sidan svarar på frågan en
 * salongsägare faktiskt ställer sig mellan bokningarna: vilka kommer tillbaka,
 * vilka har inte varit här på ett halvår, och vem är värd mest.
 *
 * Tidigare låg här en platt lista med varje bokning som en rad. Den visade allt
 * och sa ingenting: fyra rader med samma namn såg ut som fyra kunder, och att
 * någon varit hos dig nio gånger gick inte att se utan att räkna själv.
 *
 * Kunder slås ihop på telefonnummer, sedan e-post, sist namn. Ordningen är
 * medveten — numret är det som följer med en person, mejladressen kan bytas,
 * och namn stavas olika. Två personer som verkligen heter likadant och saknar
 * både nummer och mejl slås ihop, och det får de göra: alternativet är att
 * varje bokning blir sin egen kund igen.
 *
 * En frisör med eget konto ser bara sina egna kunder. Kollegornas bokningar
 * kommer hit maskerade och räknas inte — salongens kundregister är ägarens.
 */

const MS_DAG = 86_400_000

const STATUS_LABEL: Record<Lang, Record<Status, string>> = {
  sv: { pending: 'Väntar', confirmed: 'Bekräftad', cancelled: 'Avbokad', completed: 'Avslutad', no_show: 'Uteblev' },
  en: { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', no_show: 'No-show' },
}

const STATUS_FÄRG: Record<Status, string> = {
  pending:   'bg-amber-500/15 text-amber-400',
  confirmed: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-red-500/15 text-red-400',
  completed: 'bg-slate-500/15 text-slate-400',
  no_show:   'bg-orange-500/15 text-orange-400',
}

type Sortering = 'senast' | 'besok' | 'varde'

const T = {
  sv: {
    sok:        'Sök på namn, telefon eller mejl',
    sortSenast: 'Senaste besök', sortBesok: 'Flest besök', sortVarde: 'Högst värde',
    tom:        'Ingen kundhistorik ännu.',
    tomHjalp:   'Så fort någon bokat en tid dyker de upp här — med sina besök, sitt värde och vad de brukar boka.',
    ingenTraff: 'Ingen kund matchar sökningen.',
    besok:      (n: number) => n === 1 ? '1 besök' : `${n} besök`,
    idag:       'Idag',
    igar:       'I går',
    dagar:      (n: number) => `för ${n} dagar sedan`,
    veckor:     (n: number) => n === 1 ? 'för en vecka sedan' : `för ${n} veckor sedan`,
    manader:    (n: number) => n === 1 ? 'för en månad sedan' : `för ${n} månader sedan`,
    lange:      'Har inte varit här på över ett år',
    uteblev:    (n: number) => n === 1 ? '1 gång uteblivit' : `${n} gånger uteblivit`,
    brukar:     'Brukar boka',
    totalt:     'Totalt',
    antal:      (n: number) => `${n} kunder`,
  },
  en: {
    sok:        'Search name, phone or email',
    sortSenast: 'Last visit', sortBesok: 'Most visits', sortVarde: 'Highest value',
    tom:        'No customer history yet.',
    tomHjalp:   'As soon as someone books a time they show up here — with their visits, their value and what they usually book.',
    ingenTraff: 'No customer matches that search.',
    besok:      (n: number) => n === 1 ? '1 visit' : `${n} visits`,
    idag:       'Today',
    igar:       'Yesterday',
    dagar:      (n: number) => `${n} days ago`,
    veckor:     (n: number) => n === 1 ? 'a week ago' : `${n} weeks ago`,
    manader:    (n: number) => n === 1 ? 'a month ago' : `${n} months ago`,
    lange:      'Has not been here in over a year',
    uteblev:    (n: number) => n === 1 ? '1 no-show' : `${n} no-shows`,
    brukar:     'Usually books',
    totalt:     'Total',
    antal:      (n: number) => `${n} customers`,
  },
}

type Kund = {
  nyckel:    string
  namn:      string
  telefon:   string
  epost:     string
  bokningar: Booking[]
  besok:     number
  varde:     number
  uteblev:   number
  senast:    string | null
  vanligast: string
}

function samlaKunder(bokningar: Booking[], idag: string): Kund[] {
  const karta = new Map<string, Booking[]>()
  for (const b of bokningar) {
    /* Maskerade rader är kollegans kund, inte den här användarens. */
    if (b.masked) continue
    if (!b.customerName?.trim()) continue
    /* Bara det som redan hänt. En kommande tid står i kalendern och i
       SMS-listan — att visa den här också gör historiken till en tredje
       kopia av samma bokning, och en kund med noll besök men en bokad tid
       läser som en kund, vilket den inte är än. */
    const hänt = b.date < idag || b.status === 'completed' || b.status === 'no_show'
    if (!hänt) continue
    const n = kundNyckel({ telefon: b.phone, epost: b.email, namn: b.customerName })
    karta.set(n, [...(karta.get(n) ?? []), b])
  }

  return [...karta.entries()].map(([nyckel, rader]) => {
    const sorterade = [...rader].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    /* Räknas som besök gör det som faktiskt hänt. En avbokad tid är ingen
       kundrelation, och en no-show är ett problem — inte ett besök. */
    const genomforda = sorterade.filter(b => b.status === 'completed')

    /* Det de brukar boka: vanligaste behandlingen, inte den senaste. */
    const raknare = new Map<string, number>()
    for (const b of sorterade) if (b.service?.trim()) raknare.set(b.service, (raknare.get(b.service) ?? 0) + 1)
    const vanligast = [...raknare.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

    const senaste = genomforda[0] ?? sorterade.find(b => b.date < idag) ?? null

    return {
      nyckel,
      namn:      sorterade.find(b => b.customerName?.trim())?.customerName ?? '',
      telefon:   sorterade.find(b => b.phone?.trim())?.phone ?? '',
      epost:     sorterade.find(b => b.email?.trim())?.email ?? '',
      bokningar: sorterade,
      besok:     genomforda.length,
      varde:     genomforda.reduce((s, b) => s + (b.price || 0), 0),
      uteblev:   sorterade.filter(b => b.status === 'no_show').length,
      senast:    senaste?.date ?? null,
      vanligast,
    }
  })
}

function sedanText(datum: string | null, idag: string, t: typeof T['sv']): string {
  if (!datum) return ''
  const dagar = Math.round((new Date(idag).getTime() - new Date(datum).getTime()) / MS_DAG)
  if (dagar <= 0)  return t.idag
  if (dagar === 1) return t.igar
  if (dagar < 14)  return t.dagar(dagar)
  if (dagar < 60)  return t.veckor(Math.round(dagar / 7))
  if (dagar < 365) return t.manader(Math.round(dagar / 30))
  return t.lange
}

function initialer(namn: string): string {
  return namn.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const kr = (n: number) => `${n.toLocaleString('sv-SE')} kr`

export function KundhistorikTab({
  bookings, staff, onStatusChange, noteringar = {}, onNotering, demo = false,
  årsrader = [], hours = DEFAULT_HOURS,
}: {
  bookings:       Booking[]
  staff:          StaffMember[]
  onStatusChange: (id: string, status: Status) => void
  /** Året bakåt, en rad per månad. Ritas som band över kundlistan. */
  årsrader?:      Månadsrad[]
  hours?:         WeekHours
  /** Salongens anteckningar per kundnyckel — samma karta som kommandelistan
   *  läser, så en anteckning skriven före besöket står kvar efteråt. */
  noteringar?:    Record<string, string>
  onNotering?:    (nyckel: string, text: string) => void
  demo?:          boolean
}) {
  const { lang } = useLang()
  const t = T[lang]
  const idag = new Date().toISOString().split('T')[0]

  const [sok, setSok]       = useState('')
  const [sort, setSort]     = useState<Sortering>('senast')
  const [oppen, setOppen]   = useState<string | null>(null)

  const kunder = useMemo(() => samlaKunder(bookings, idag), [bookings, idag])

  const visade = useMemo(() => {
    const q = sok.trim().toLowerCase()
    const träff = q
      ? kunder.filter(k =>
          k.namn.toLowerCase().includes(q) ||
          k.telefon.replace(/\D/g, '').includes(q.replace(/\D/g, '')) && q.replace(/\D/g, '') !== '' ||
          k.epost.toLowerCase().includes(q))
      : kunder
    return [...träff].sort((a, b) =>
      sort === 'besok' ? b.besok - a.besok
      : sort === 'varde' ? b.varde - a.varde
      : (b.senast ?? '').localeCompare(a.senast ?? ''))
  }, [kunder, sok, sort])

  /* Bandet står över listan även när listan är tom — en salong som just bytt
     till oss kan ha ett år i boken utan att ha hunnit få en enda återkommande
     kund. Men när båda är tomma säger bandet ingenting som listans egen ruta
     inte redan säger, och två rutor som var för sig meddelar "här finns inget"
     är en för mycket. */
  const band = <HistorikStats rader={årsrader} staff={staff} hours={hours} />

  if (!kunder.length) {
    return (
      <div className="space-y-4">
        {harHistorik(årsrader) && band}
        <div className="border border-navy-700 rounded-2xl px-6 py-10 text-center">
          <p className="text-white font-semibold text-sm">{t.tom}</p>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">{t.tomHjalp}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {band}

      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={sok}
          onChange={e => setSok(e.target.value)}
          placeholder={t.sok}
          className="flex-1 min-w-[220px] bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-mustard/50"
        />
        <div className="flex gap-1 bg-navy-900 border border-navy-700 rounded-xl p-1">
          {([['senast', t.sortSenast], ['besok', t.sortBesok], ['varde', t.sortVarde]] as [Sortering, string][]).map(([id, namn]) => (
            <button
              key={id}
              onClick={() => setSort(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sort === id ? 'bg-mustard/15 text-mustard' : 'text-slate-400 hover:text-white'
              }`}
            >
              {namn}
            </button>
          ))}
        </div>
        <span className="text-slate-500 text-xs">{t.antal(visade.length)}</span>
      </div>

      {!visade.length && (
        <p className="text-slate-400 text-sm px-1">{t.ingenTraff}</p>
      )}

      <div className="space-y-2">
        {visade.map(k => {
          const är = oppen === k.nyckel
          return (
            <div key={k.nyckel} className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOppen(är ? null : k.nyckel)}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-navy-700/40 transition-colors"
              >
                <span className="shrink-0 w-10 h-10 rounded-full bg-mustard/15 text-mustard text-sm font-bold flex items-center justify-center">
                  {initialer(k.namn)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{k.namn}</p>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">
                    {t.besok(k.besok)}
                    {k.senast && ` · ${sedanText(k.senast, idag, t)}`}
                    {k.vanligast && ` · ${k.vanligast}`}
                  </p>
                </div>


                {k.uteblev > 0 && (
                  <span className="hidden sm:inline shrink-0 text-xs px-2 py-1 rounded-full bg-orange-500/15 text-orange-400">
                    {t.uteblev(k.uteblev)}
                  </span>
                )}

                <span className="shrink-0 text-right">
                  <span className="block text-white text-sm font-semibold tabular-nums">{kr(k.varde)}</span>
                  <span className="block text-slate-500 text-[11px]">{t.totalt}</span>
                </span>
                <span className="shrink-0 text-slate-500 text-xs">{är ? '▲' : '▼'}</span>
              </button>

              {är && (
                <div className="border-t border-navy-700 px-4 py-3 space-y-3">
                  <div className="flex gap-4 flex-wrap text-xs">
                    {k.telefon && (
                      <a href={`tel:${k.telefon.replace(/\s/g, '')}`} className="text-mustard hover:underline">{k.telefon}</a>
                    )}
                    {k.epost && (
                      <a href={`mailto:${k.epost}`} className="text-slate-300 hover:text-white">{k.epost}</a>
                    )}
                  </div>

                  {onNotering && (
                    <KundAnteckning
                      nyckel={k.nyckel}
                      värde={noteringar[k.nyckel] ?? ''}
                      onSparad={text => onNotering(k.nyckel, text)}
                      låst={demo}
                    />
                  )}

                  <div className="space-y-1.5">
                    {k.bokningar.map(b => (
                      <div key={b.id} className="flex items-center gap-3 flex-wrap text-xs bg-navy-900/60 rounded-lg px-3 py-2">
                        <span className="text-slate-400 tabular-nums shrink-0">{b.date} {b.time}</span>
                        <span className="text-white flex-1 min-w-0 truncate">{b.service}</span>
                        {staff.find(s => s.id === b.staffId) && (
                          <span className="text-slate-500 shrink-0">{staff.find(s => s.id === b.staffId)?.name}</span>
                        )}
                        {!!b.price && <span className="text-slate-300 tabular-nums shrink-0">{kr(b.price)}</span>}
                        <span className={`shrink-0 px-2 py-0.5 rounded-full ${STATUS_FÄRG[b.status]}`}>
                          {STATUS_LABEL[lang][b.status]}
                        </span>
                        {/* En väntande tid ska gå att bekräfta där man ser den.
                            Att skicka någon till kalendern för ett klick är ett
                            steg som bara finns för att koden är uppdelad. */}
                        {b.status === 'pending' && (
                          <button
                            onClick={() => onStatusChange(b.id, 'confirmed')}
                            className="shrink-0 px-2 py-0.5 rounded-md bg-mustard text-navy-950 font-semibold"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
