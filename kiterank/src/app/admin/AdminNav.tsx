'use client'
import { usePathname } from 'next/navigation'

/*
 * Adminområdets egen meny.
 *
 * Låg tidigare inte alls — området var en enda sida, och den första nya sidan
 * hamnade i kundens sidomeny bakom en behörighetskontroll. Det fungerar tekniskt
 * och är fel i sak: en rubrik som säger "Test" mitt i en betalande kunds meny
 * får dem att undra vad av resten som också är på prov.
 *
 * Här ligger det som är ditt. Kunden ser aldrig den här filen.
 */

/*
 * Grupperna följer arbetsrytmen, inte byggordningen.
 *
 * Menyn var en platt lista där varje ny funktion blev ett nytt val, i den
 * ordning de råkade byggas — och nio oordnade val läser som röran de är.
 * Grupperingen är den varje moget adminverktyg landar i: det man gör varje
 * dag överst, leveransarbetet i mitten, och verktygen man rör en gång i
 * månaden sist. Rubrikerna gör att ögat hittar rätt grupp i stället för att
 * läsa nio rader.
 */
const GRUPPER: { rubrik: string; sidor: { href: string; namn: string; om: string }[] }[] = [
  {
    rubrik: 'Kunder',
    sidor: [
      { href: '/admin',        namn: 'Konton',    om: 'Vilka som är kunder, och vem som sagt upp' },
      { href: '/admin/kunder', namn: 'Kundvård',  om: 'Vad som slutat fungera hos kunderna' },
      { href: '/admin/betalning', namn: 'Betalning', om: 'Vem som betalar, vad, och till när' },
    ],
  },
  {
    rubrik: 'Arbete',
    sidor: [
      { href: '/admin/sidor',    namn: 'Sidor',     om: 'Allt du byggt åt kunder, sparat' },
      { href: '/admin/dokument', namn: 'Dokument',  om: 'Strategier och månadsrapporter till full service-kunder' },
      { href: '/admin/export',   namn: 'Utlämning', om: 'Kundhistorik och hemsida att lämna ut' },
    ],
  },
  {
    rubrik: 'Verktyg',
    sidor: [
      { href: '/admin/avtal',    namn: 'Avtal',    om: 'Villkoren kunderna möter, redigerbara' },
      { href: '/admin/tester',   namn: 'Tester',   om: 'Kontroller på bokning och utskick' },
      { href: '/admin/mallprov', namn: 'Mallvård', om: 'Alla mallar mot innehåll som vill sönder' },
    ],
  },
]

export function AdminNav() {
  const nu = usePathname()

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 190 }}>
      {GRUPPER.map(g => (
        <div key={g.rubrik}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#475569', margin: '0 0 4px', padding: '0 12px',
            fontFamily: 'var(--font-brand-sans)',
          }}>
            {g.rubrik}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {g.sidor.map(s => {
              /* Exakt match för startsidan, prefix för resten — annars är
                 Konton markerad överallt, eftersom varje adminadress börjar
                 med /admin. Kundsidorna hör hemma under Konton. */
              const aktiv = s.href === '/admin'
                ? nu === '/admin' || nu.startsWith('/admin/kund/')
                : nu.startsWith(s.href)
              return (
                <a
                  key={s.href}
                  href={s.href}
                  title={s.om}
                  style={{
                    display: 'block', padding: '8px 12px', borderRadius: 9,
                    fontSize: 13, fontWeight: aktiv ? 700 : 500,
                    fontFamily: 'var(--font-brand-sans)', textDecoration: 'none',
                    background: aktiv ? '#1e293b' : 'transparent',
                    color: aktiv ? '#f1f5f9' : '#94a3b8',
                  }}
                >
                  {s.namn}
                </a>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
