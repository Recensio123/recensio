import { accountClosure } from '@/lib/access'
import { redirect } from 'next/navigation'

/*
 * Beskedet en kund möter när avtalet är avslutat.
 *
 * Utan den här sidan skickas de tillbaka till inloggningen, skriver sitt
 * lösenord igen och kommer inte in — utan att få veta varför. Att stänga en
 * dörr utan att säga att den är stängd är sämre än att stänga den.
 *
 * Ingenting är raderat. Öppnas avtalet igen ligger sajten, bokningarna och
 * texterna kvar precis som de var, och det säger vi rakt ut här — dels för att
 * det är sant, dels för att en kund som ångrar sig ska veta att vägen tillbaka
 * finns.
 */

export const metadata = { robots: { index: false, follow: false } }

export default async function AvtalAvslutat() {
  const stängt = await accountClosure()
  /* Aktivt avtal, eller ingen session: den här sidan har inget att säga dem. */
  if (!stängt) redirect('/dashboard')

  const datum = new Date(stängt.closedAt).toLocaleDateString('sv-SE', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0b1220', padding: '32px',
    }}>
      <div style={{
        maxWidth: 460, background: '#0f172a', border: '1px solid #1e293b',
        borderRadius: 16, padding: '32px 30px',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', margin: '0 0 12px' }}>
          Avtalet är avslutat
        </h1>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 16px' }}>
          {stängt.name ? `${stängt.name}s avtal ` : 'Avtalet '}avslutades {datum}.
          Webbplatsen ligger inte längre uppe och panelen är stängd.
        </p>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 24px' }}>
          Ingenting är raderat. Vill du börja igen finns sidan, prislistan och
          bokningarna kvar precis som de var.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="mailto:hej@kiterank.se" style={{
            padding: '11px 20px', borderRadius: 8, background: '#eab308', color: '#0f172a',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            Kontakta oss
          </a>
          <a href="/auth/signout" style={{
            padding: '11px 18px', borderRadius: 8, border: '1px solid #334155',
            color: '#94a3b8', fontSize: 14, textDecoration: 'none',
          }}>
            Logga ut
          </a>
        </div>
      </div>
    </main>
  )
}
