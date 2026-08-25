'use client'
import { useCallback, useEffect, useState } from 'react'

/*
 * Bokningarna i telefonens egen kalender.
 *
 * En adress, fyra appar. Google, Outlook, iPhone och Android läser alla samma
 * sorts prenumeration, vilket är enda sättet att nå alla fyra utan att salongen
 * ska behöva godkänna en app hos vare sig Google eller Microsoft.
 *
 * Priset står med i klartext högst upp och inte som en not längst ned:
 * kalendern är enkelriktad, och den uppdateras när mottagaren vill. En salong
 * som tror att den kan flytta en tid i telefonen kommer att göra det, och
 * kunden står utanför en låst dörr.
 */

type Stol = { staffId: string; namn: string; token: string; senast: string | null }
type Data = { salong: { token: string; senast: string | null } | null; stolar: Stol[] }

const T = {
  title: 'Se bokningarna i din egen kalender',
  intro: 'Lägg in adressen nedan i Google Kalender, Outlook eller iPhone så dyker dina tider upp där automatiskt. Android använder Google Kalender, så den följer med på köpet.',
  warn:  'Kalendern är enkelriktad. Tiderna syns i telefonen, men det du skriver där kommer inte tillbaka hit — bokningar ändras i Kiterank. Hur ofta den uppdateras bestämmer din kalenderapp: iPhone kan ställas på fem minuter, Outlook hämtar ungefär var tredje timme, Google när det passar Google.',
  salong: 'Hela salongen',
  stolarTitle: 'En kalender per stol',
  stolarIntro: 'Ge varje medarbetare sin egen adress, så ser de bara sina egna tider.',
  copy:   'Kopiera',
  copied: 'Kopierad',
  iphone: 'Lägg till på iPhone',
  never:  'Aldrig hämtad ännu',
  read:   (d: string) => `Senast hämtad ${d}`,
  reset:  'Byt ut adressen',
  resetting: 'Byter…',
  resetWarn: 'Den nuvarande adressen slutar fungera direkt och kalendern försvinner ur alla telefoner som har den. Byt ut den?',
  how:    'Så här lägger du in den',
  loading:'Hämtar…',
  failed: 'Kunde inte hämta adresserna.',
  steps: [
    ['Google Kalender', 'Öppna Google Kalender på en dator. Vid "Andra kalendrar" i vänsterspalten: plusknappen → Från webbadress → klistra in → Lägg till.'],
    ['Outlook',         'Öppna Outlook-kalendern. Lägg till kalender → Prenumerera från webben → klistra in → Importera.'],
    ['iPhone och iPad', 'Tryck på knappen "Lägg till på iPhone" här nedanför i telefonen. Eller: Inställningar → Appar → Kalender → Kalenderkonton → Lägg till konto → Annat → Lägg till prenumererad kalender.'],
    ['Android',         'Android visar kalendrarna från ditt Google-konto. Lägg in adressen i Google Kalender enligt ovan, så dyker den upp i telefonen.'],
  ] as [string, string][],
}

export function KalenderSynk() {
  const [data, setData] = useState<Data | null>(null)
  const [fel,  setFel]  = useState('')
  const [visaStolar, setVisaStolar] = useState(false)

  const hämta = useCallback(async () => {
    const res = await fetch('/api/calendar-feeds')
    if (!res.ok) throw new Error(String(res.status))
    return res.json() as Promise<Data>
  }, [])

  useEffect(() => {
    let aktiv = true
    hämta()
      .then(d => { if (aktiv) setData(d) })
      .catch(() => { if (aktiv) setFel(T.failed) })
    return () => { aktiv = false }
  }, [hämta])

  /* Adressen byggs ur webbläsarens egen origin. Servern vet inte alltid vilket
     namn salongen nådde oss på, och en länk med fel värdnamn är en kalender som
     aldrig hämtar. */
  const url = (token: string) =>
    typeof window === 'undefined' ? '' : `${window.location.origin}/api/kalender/${token}`

  async function byt(staffId: string | null) {
    if (!window.confirm(T.resetWarn)) return
    setFel('')
    try {
      const res = await fetch('/api/calendar-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setData(await hämta())
    } catch {
      setFel(T.failed)
    }
  }

  return (
    <section className="pt-6 border-t border-navy-700">
      <h2 className="text-white font-semibold text-lg mb-1">{T.title}</h2>
      <p className="text-slate-400 text-sm mb-3">{T.intro}</p>

      <p className="text-slate-400 text-xs bg-navy-900 border border-navy-700 rounded-xl p-3 mb-4">
        {T.warn}
      </p>

      {fel && <p className="text-red-400 text-sm mb-3">{fel}</p>}
      {!data && !fel && <p className="text-slate-500 text-sm">{T.loading}</p>}

      {data?.salong && (
        <Adress
          etikett={T.salong}
          url={url(data.salong.token)}
          senast={data.salong.senast}
          onByt={() => void byt(null)}
        />
      )}

      {!!data?.stolar.length && (
        <div className="mt-4">
          <button
            onClick={() => setVisaStolar(v => !v)}
            className="text-mustard text-xs font-semibold hover:underline"
          >
            {visaStolar ? '▲ ' : '▼ '}{T.stolarTitle}
          </button>
          {visaStolar && (
            <div className="mt-2 space-y-2">
              <p className="text-slate-500 text-xs">{T.stolarIntro}</p>
              {data.stolar.map(s => (
                <Adress
                  key={s.staffId}
                  etikett={s.namn}
                  url={url(s.token)}
                  senast={s.senast}
                  onByt={() => void byt(s.staffId)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-white text-sm font-semibold mb-2">{T.how}</h3>
        <dl className="space-y-2">
          {T.steps.map(([app, steg]) => (
            <div key={app} className="bg-navy-900 border border-navy-700 rounded-xl px-3 py-2">
              <dt className="text-slate-300 text-xs font-semibold">{app}</dt>
              <dd className="text-slate-400 text-xs mt-0.5">{steg}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/*
 * En adress med sina knappar.
 *
 * Adressen visas i klartext och inte bakom en kopieringsknapp ensam: den som
 * ska klistra in något i Outlook vill se att den fick med hela strängen.
 */
function Adress({ etikett, url, senast, onByt }: {
  etikett: string
  url:     string
  senast:  string | null
  onByt:   () => void
}) {
  const [kopierad, setKopierad] = useState(false)
  const [byter,    setByter]    = useState(false)

  async function kopiera() {
    try {
      await navigator.clipboard.writeText(url)
      setKopierad(true)
      setTimeout(() => setKopierad(false), 2000)
    } catch { /* utan urklippsrättighet får den markeras för hand */ }
  }

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <span className="text-white text-sm font-semibold">{etikett}</span>
        <span className="text-slate-500 text-[11px]">
          {senast ? T.read(new Date(senast).toLocaleString('sv-SE')) : T.never}
        </span>
      </div>

      <input
        readOnly
        value={url}
        onFocus={e => e.currentTarget.select()}
        className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono"
      />

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <button
          onClick={() => void kopiera()}
          className="px-3 py-1.5 bg-mustard text-navy-900 rounded-lg text-xs font-semibold"
        >
          {kopierad ? T.copied : T.copy}
        </button>
        {/* webcal:// öppnar kalenderappen direkt i stället för att ladda ned en
            fil. Samma adress, bara ett annat protokollnamn. */}
        <a
          href={url.replace(/^https?:/, 'webcal:')}
          className="px-3 py-1.5 bg-navy-700 text-slate-200 hover:bg-navy-600 rounded-lg text-xs font-semibold"
        >
          {T.iphone}
        </a>
        <button
          onClick={() => { setByter(true); onByt(); setByter(false) }}
          className="px-3 py-1.5 text-slate-500 hover:text-red-400 rounded-lg text-xs font-semibold ml-auto"
        >
          {byter ? T.resetting : T.reset}
        </button>
      </div>
    </div>
  )
}
