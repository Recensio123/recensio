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

const SIDOR: { href: string; namn: string; om: string }[] = [
  { href: '/admin',        namn: 'Konton',   om: 'Vilka som är kunder, och vem som sagt upp' },
  { href: '/admin/kunder', namn: 'Kundvård', om: 'Vad som slutat fungera hos kunderna' },
  { href: '/admin/sidor',  namn: 'Sidor',    om: 'Allt du byggt åt kunder, sparat' },
  { href: '/admin/betalning', namn: 'Betalning', om: 'Vem som betalar, vad, och till när' },
  { href: '/admin/avtal',     namn: 'Avtal',     om: 'Villkoren kunderna möter, redigerbara' },
  { href: '/admin/export',    namn: 'Utlämning', om: 'Kundhistorik och hemsida att lämna ut' },
  { href: '/admin/tester', namn: 'Tester',   om: 'Kontroller på bokning och utskick' },
]

export function AdminNav() {
  const nu = usePathname()

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 190 }}>
      {SIDOR.map(s => {
        /* Exakt match för startsidan, prefix för resten — annars är Konton
           markerad överallt, eftersom varje adminadress börjar med /admin. */
        const aktiv = s.href === '/admin' ? nu === '/admin' : nu.startsWith(s.href)
        return (
          <a
            key={s.href}
            href={s.href}
            title={s.om}
            style={{
              display: 'block', padding: '9px 12px', borderRadius: 9,
              fontSize: 13, fontWeight: aktiv ? 700 : 500,
              fontFamily: 'var(--font-geist-sans)', textDecoration: 'none',
              background: aktiv ? '#1e293b' : 'transparent',
              color: aktiv ? '#f1f5f9' : '#94a3b8',
            }}
          >
            {s.namn}
          </a>
        )
      })}
    </nav>
  )
}
