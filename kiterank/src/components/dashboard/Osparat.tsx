'use client'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { LägeBand } from '@/components/dashboard/DemoBand'
import type { Vy } from '@/lib/datalage'

/*
 * Osparade ändringar.
 *
 * Ett val som sparar sig självt i det ögonblick man klickar känns snabbt tills
 * man råkar klicka fel. Då finns ingen ångervändning, och salongen vet inte ens
 * säkert vad som ändrades. Därför samlas ändringar i stället upp och skrivs när
 * någon säger till.
 *
 * Priset är att man kan gå därifrån med osparat arbete, och det priset betalar
 * vi inte: bandet syns så länge något är osparat, det ligger överst på sidan
 * oavsett hur långt ned man scrollat, och ett försök att lämna sidan frågar
 * först.
 *
 * Bandet ligger i layouten och inte i fliken. Skälet är platsen: överst finns
 * redan demobandet, och två band ovanpå varandra hade skjutit ned innehållet
 * och konkurrerat om samma blick. Ett osparat arbete är dessutom mer brådskande
 * än påminnelsen om att man tittar på demodata — så länge något väntar tar det
 * över raden.
 */

export type OsparatLäge = {
  osparat: boolean
  sparar:  boolean
  /** Visas en stund efter en lyckad sparning. */
  sparad:  boolean
  fel?:    string
  spara:   () => void
}

/*
 * Fliken talar om för layouten vad som gäller.
 *
 * Genom en liten butik utanför React och inte genom en context. Skälet är
 * riktningen: den som publicerar sitt läge ligger *under* den som visar det i
 * trädet, och en context kan bara gå åt andra hållet. En butik är dessutom
 * precis vad `useSyncExternalStore` finns till för — bandet prenumererar, och
 * ingen omritning behöver vandra genom halva panelen.
 */
let nuvarande: OsparatLäge | null = null
const lyssnare = new Set<() => void>()

function publicera(läge: OsparatLäge | null) {
  nuvarande = läge
  for (const f of lyssnare) f()
}

function prenumerera(f: () => void) {
  lyssnare.add(f)
  return () => { lyssnare.delete(f) }
}

const läs       = () => nuvarande
const läsServer = () => null

/**
 * Anmäler flikens läge till bandet, och varnar innan sidan lämnas.
 *
 * Två vägar bort, och båda måste täckas. Webbläsarens egen dialog fångar
 * omladdning och stängd flik; klicklyssnaren fångar länkar i panelen, eftersom
 * en navigering inom appen aldrig når `beforeunload`.
 */
export function useOsparat(läge: OsparatLäge) {
  const { osparat, sparar, sparad, fel } = läge

  /* Sparfunktionen är ny vid varje omritning, och skulle den ingå i beroendena
     hade bandet publicerats om i onödan flera gånger per tangenttryck. Den når
     vi i stället genom en referens som alltid pekar på den senaste. */
  const sparaRef = useRef(läge.spara)
  useEffect(() => { sparaRef.current = läge.spara })
  const spara = useCallback(() => sparaRef.current(), [])

  useEffect(() => {
    publicera({ osparat, sparar, sparad, fel, spara })
    return () => publicera(null)
  }, [osparat, sparar, sparad, fel, spara])

  useEffect(() => {
    if (!osparat) return

    const lämna = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', lämna)

    /* Fångas i capture-fasen, före Next egen routerlyssnare — annars har
       navigeringen redan börjat när vi hinner fråga. */
    const klick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank') return

      const href = a.getAttribute('href') ?? ''
      /* Ankare på samma sida lämnar ingenting. */
      if (!href || href.startsWith('#')) return

      if (!window.confirm(T.fråga)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', klick, true)

    return () => {
      window.removeEventListener('beforeunload', lämna)
      document.removeEventListener('click', klick, true)
    }
  }, [osparat])
}

/**
 * Bandet överst på sidan.
 *
 * Visar det som är mest brådskande: osparat arbete går före påminnelsen om
 * demodata. Klibbar vid överkanten, så att en Spara-knapp aldrig är något man
 * måste scrolla efter.
 */
export function OsparatBand({ vy }: { vy: Vy }) {
  const läge = useSyncExternalStore(prenumerera, läs, läsServer)
  const visa = läge && (läge.osparat || läge.sparad || läge.fel)

  if (!visa) return <LägeBand vy={vy} />

  return (
    <div className="sticky top-0 z-30">
      <Rad {...läge} />
    </div>
  )
}

/**
 * Samma rad, men på plats i flödet.
 *
 * Står sist på sidan: den som arbetat sig nedåt ska inte behöva leta uppåt
 * igen för att avsluta.
 */
export function OsparatRad(läge: OsparatLäge) {
  if (!läge.osparat && !läge.sparad && !läge.fel) return null
  return <div className="rounded-xl overflow-hidden"><Rad {...läge} /></div>
}

function Rad({ osparat, sparar, sparad, fel, spara }: OsparatLäge) {
  /* Gult när något väntar, grönt när det gick igenom, rött när det inte gjorde
     det. Samma tre färger som resten av panelen använder för samma tre saker. */
  const bakgrund = fel ? 'bg-red-500' : osparat ? 'bg-mustard' : 'bg-green-500'
  const text = sparad && !osparat && !fel ? T.sparat : fel ? fel : T.osparat

  return (
    <div className={`${bakgrund} text-navy-950 px-4 sm:px-8 py-2 flex items-center justify-between gap-4 flex-wrap`}>
      <p className="text-xs font-semibold">{text}</p>
      {osparat && (
        <button
          onClick={spara}
          disabled={sparar}
          className="text-xs font-bold underline underline-offset-2 hover:no-underline disabled:opacity-60"
        >
          {sparar ? T.sparar : T.spara}
        </button>
      )}
    </div>
  )
}

const T = {
  osparat: 'Du måste spara din ändring',
  sparat:  'Sparat',
  spara:   'Spara',
  sparar:  'Sparar…',
  fråga:   'Du har ändringar som inte är sparade. Lämna sidan ändå?',
}
