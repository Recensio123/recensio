import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google'
import '../globals.css'
import { platformAdmin, adminAvstängt } from '@/lib/admin'
import { AdminNav } from './AdminNav'

/*
 * Plattformens eget område.
 *
 * Inte en kopia av kundpanelen — egna sidor, samma kod under. En kopia hade
 * betytt två ställen att rätta varje fel på, och den som glöms bort är den som
 * ligger kvar och gör fel.
 *
 * Här bor det bara du gör: säga upp konton, se vem som är kund. Kundens panel
 * ligger kvar där den ligger och vet ingenting om det här.
 *
 * En egen rotlayout, som kundsidorna, så att området inte ärver produktens
 * metadata eller navigering. Och noindex: det här ska aldrig hamna på Google.
 */

const brandSans = Plus_Jakarta_Sans({ variable: '--font-brand-sans', subsets: ['latin'] })
const brandMono = Geist_Mono({ variable: '--font-brand-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kiterank — admin',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  /* Ingen lista, ingen administratör. Att en glömd miljövariabel öppnar dörren
     för alla är precis den sortens tyst fel som inte upptäcks förrän någon
     annan hittat den. */
  if (adminAvstängt()) redirect('/')
  const admin = await platformAdmin()
  if (!admin) redirect('/auth/login')

  return (
    <html lang="sv" className={`${brandSans.variable} ${brandMono.variable} h-full`}>
      <body style={{ margin: 0, minHeight: '100%', background: '#0b1220' }}>
        <header style={{
          display: 'flex', alignItems: 'baseline', gap: 12,
          padding: '16px 24px', borderBottom: '1px solid #1e293b',
        }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', fontFamily: 'var(--font-brand-sans)' }}>
            Kiterank admin
          </span>
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'var(--font-brand-sans)' }}>
            {admin}
          </span>
          <span style={{ flex: 1 }} />
          <a href="/dashboard" style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'var(--font-brand-sans)' }}>
            Till panelen →
          </a>
        </header>
        {/* Menyn till vänster, innehållet till höger. Området växer — det
            började som en enda sida, och nästa sida hamnade i kundens meny
            för att det inte fanns någon annanstans att lägga den. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 16 }}>
          <AdminNav />
          <main style={{ flex: 1, minWidth: 0, padding: '8px 8px 40px' }}>{children}</main>
        </div>
      </body>
    </html>
  )
}
