'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Kommande', icon: '🕐' },
  { href: '/dashboard/pagaende', label: 'Pågående', icon: '⏳' },
  { href: '/dashboard/historik', label: 'Kundhistorik', icon: '👥' },
  { href: '/dashboard/recensioner', label: 'Recensionsamling', icon: '⭐' },
  { href: '/dashboard/kampanjer', label: 'Utskick & Kampanjer', icon: '✉️' },
  { href: '/dashboard/kopplingar', label: 'Kopplingar', icon: '🔗' },
  { href: '/dashboard/installningar', label: 'Inställningar', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{ width: 200, flexShrink: 0, background: '#0e1410', display: 'flex', flexDirection: 'column', padding: '1rem 0' }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#fff', padding: '0 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,.07)', marginBottom: '.5rem' }}>
        Recens<span style={{ color: '#4d8c68' }}>io</span>
      </div>
      {links.map(({ href, label, icon }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '.5rem 1.25rem',
            fontSize: 12, color: active ? '#fff' : 'rgba(255,255,255,.42)',
            background: active ? 'rgba(255,255,255,.07)' : 'none',
            borderLeft: `2px solid ${active ? '#4d8c68' : 'transparent'}`,
            textDecoration: 'none', transition: 'all .15s',
          }}>
            <span style={{ fontSize: 13, width: 16, textAlign: 'center' }}>{icon}</span>
            {label}
          </Link>
        )
      })}
      <div style={{ marginTop: 'auto', padding: '.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <Link href="/" style={{ display: 'block', width: '100%', padding: 7, background: '#1a3d2b', border: 'none', borderRadius: 7, color: 'rgba(255,255,255,.7)', fontSize: 11, fontWeight: 500, textAlign: 'center', textDecoration: 'none' }}>
          ← Tillbaka till sajten
        </Link>
      </div>
    </aside>
  )
}
