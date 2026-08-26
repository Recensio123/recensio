'use client'
import { useEffect, useState } from 'react'

/*
 * Läsindikatorn högst upp i artikeln.
 *
 * Finns av ett enda skäl: tretton minuter utan någon känsla för hur långt man
 * kommit känns längre än tretton minuter. Strecket kostar ingenting och gör
 * att den som är halvvägs vet att de är halvvägs.
 *
 * Räknar mot artikelns höjd och inte mot sidans, så att sidfoten inte äter
 * upp de sista tjugo procenten.
 */
export function Lasindikator({ farg = '#f0b429' }: { farg?: string }) {
  const [andel, setAndel] = useState(0)

  useEffect(() => {
    const artikel = document.querySelector('article')
    if (!artikel) return

    /* requestAnimationFrame i stället för att räkna vid varje scrollhändelse:
       webbläsaren skickar dem snabbare än den hinner rita, och skillnaden
       märks på en telefon. */
    let väntar = false
    const räkna = () => {
      väntar = false
      const topp  = artikel.offsetTop
      const höjd  = artikel.offsetHeight - window.innerHeight
      if (höjd <= 0) { setAndel(100); return }
      const gått = (window.scrollY - topp) / höjd
      setAndel(Math.min(100, Math.max(0, gått * 100)))
    }
    const vid = () => { if (!väntar) { väntar = true; requestAnimationFrame(räkna) } }

    räkna()
    window.addEventListener('scroll', vid, { passive: true })
    window.addEventListener('resize', vid)
    return () => {
      window.removeEventListener('scroll', vid)
      window.removeEventListener('resize', vid)
    }
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-[60] pointer-events-none" aria-hidden>
      <div
        className="h-full transition-[width] duration-100"
        style={{ width: `${andel}%`, background: farg }}
      />
    </div>
  )
}
