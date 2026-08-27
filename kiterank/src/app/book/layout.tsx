import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google'
import '../globals.css'

/*
 * Bokningsflödets eget dokument.
 *
 * En egen rotlayout, som kundsidan och adminområdet. Skälet är att /book inte
 * ligger i (kiterank)-gruppen och därför inte ärver dess layout: utan den här
 * filen renderas sidorna helt utan <html> och <body>, vilket Next säger ifrån
 * om i utvecklingsläge och som ger ogiltig HTML i skarpt.
 *
 * Att det inte märkts tidigare är typiskt för felet: sidan ser rätt ut ändå.
 * Det som saknas är dokumentets ram — språket webbläsaren och skärmläsaren
 * läser, och typsnitten som annars faller tillbaka på systemets.
 *
 * Ingen navigering och ingen produktmeny. Den som står här har klickat på en
 * länk från sin salong och ska boka eller avboka en tid — allt annat på
 * skärmen är något som drar dem därifrån.
 */

const brandSans = Plus_Jakarta_Sans({ variable: '--font-brand-sans', subsets: ['latin'] })
const brandMono = Geist_Mono({ variable: '--font-brand-mono', subsets: ['latin'] })

/*
 * Aldrig i sökresultaten.
 *
 * En bokningsadress bär en engångskod eller en kundtid, och den ska nås genom
 * salongens länk och ingen annanstans ifrån. Salongens egen sida är den som
 * ska ranka; det här är vägen dit.
 */
export const metadata: Metadata = {
  title:  'Boka tid',
  robots: { index: false, follow: false },
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${brandSans.variable} ${brandMono.variable} h-full`}>
      <body style={{ margin: 0, minHeight: '100%' }}>{children}</body>
    </html>
  )
}
