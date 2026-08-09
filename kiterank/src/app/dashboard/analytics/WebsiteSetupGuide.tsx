'use client'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'
import { ExternalLink } from '@/components/ExternalLink'

/*
 * Shown on the Website page when no visitor measurement is connected yet.
 *
 * Google can see the searches that lead to a site, but nothing about what
 * happens once the visitor arrives — that only exists if measurement runs in
 * the browser. So this is the one gap the customer has to close themselves.
 * We walk them through it rather than doing it for them, which keeps our
 * access to their Google account read-only.
 */

const T = {
  sv: {
    title:    'Din hemsida mäts inte ännu',
    sub:      'Google ser vilka sökningar som leder till dig, men inte vad som händer när besökaren väl är inne. Det kräver en mätning på själva sidan. Tre steg, och du gör dem en gång.',
    already:  'Har din webbyrå redan satt upp Google Analytics? Då kan du hoppa direkt till steg 3.',
    oneT:     'Skapa mätningen hos Google',
    oneS:     'Logga in med samma Google-konto som salongen använder. Välj Administratör, sedan Skapa egendom, och lägg till din hemsida som en webbdataström. Google ger dig då en kod som hör till just din sajt.',
    oneCta:   'Öppna Google Analytics →',
    twoT:     'Lägg koden på hemsidan',
    twoS:     'Google visar en kodrad som ska in högst upp på varje sida. Sköter någon annan din hemsida skickar du den vidare — det tar dem några minuter. Har du sidan i en byggare som Wix eller Squarespace finns oftast ett fält för den under inställningar.',
    threeT:   'Koppla Google här',
    threeS:   'Sista steget. När kopplingen är gjord hämtar vi in besöken automatiskt, och den här sidan fylls med dina egna siffror.',
    threeCta: 'Koppla Google →',
    threeDoneT:   'Vi hämtar in den automatiskt',
    threeDoneS:   'Ditt Google-konto är redan kopplat, så du behöver inte koppla om. Så fort mätningen finns hos Google plockar vi upp den vid nästa hämtning och sidan fylls med dina siffror. Vill du inte vänta kan du hämta om direkt.',
    threeDoneCta: 'Hämta om nu →',
    warn:     'Mätningen börjar den dag den sätts upp. Besök som skett innan dess finns inte sparade någonstans, så ju förr desto mer har du att jämföra med om ett år.',
  },
  en: {
    title:    'Your website is not being measured yet',
    sub:      'Google can see which searches lead to you, but not what happens once the visitor arrives. That needs measurement on the site itself. Three steps, and you only do them once.',
    already:  'Has your web agency already set up Google Analytics? Then skip straight to step 3.',
    oneT:     'Create the measurement at Google',
    oneS:     'Sign in with the same Google account the salon uses. Choose Admin, then Create property, and add your website as a web data stream. Google then gives you a code that belongs to your site.',
    oneCta:   'Open Google Analytics →',
    twoT:     'Put the code on your website',
    twoS:     'Google shows a line of code that goes at the top of every page. If someone else looks after your site, forward it to them — it takes a few minutes. If your site is in a builder like Wix or Squarespace, there is usually a field for it under settings.',
    threeT:   'Connect Google here',
    threeS:   'The last step. Once connected we pull the visits in automatically, and this page fills with your own numbers.',
    threeCta: 'Connect Google →',
    threeDoneT:   'We pick it up automatically',
    threeDoneS:   'Your Google account is already connected, so there is nothing to reconnect. As soon as the measurement exists at Google we pick it up on the next sync and this page fills with your numbers. If you would rather not wait, you can sync again now.',
    threeDoneCta: 'Sync again now →',
    warn:     'Measurement starts the day it is set up. Visits before that are not stored anywhere, so the sooner it is done, the more you have to compare against a year from now.',
  },
}

export function WebsiteSetupGuide({ isConnected = false }: { isConnected?: boolean }) {
  const { lang } = useLang()
  const t = T[lang]

  // A customer who connected during onboarding has nothing to redo — the
  // grant already covers Analytics. What is missing is the property itself,
  // and that gets picked up on the next sync.
  const steps: [string, string, string, string | null, string][] = [
    ['1', t.oneT, t.oneS, t.oneCta, 'https://analytics.google.com'],
    ['2', t.twoT, t.twoS, null,     ''],
    // Not connected yet? Straight to the sign-in, same as everywhere else.
    // Already connected? Then the connections page is the right place, since
    // what they want there is a fresh sync rather than another sign-in.
    isConnected
      ? ['3', t.threeDoneT, t.threeDoneS, t.threeDoneCta, '/dashboard/connections']
      : ['3', t.threeT,     t.threeS,     t.threeCta,     '/api/auth/google'],
  ]

  return (
    <div className="bg-navy-800 rounded-2xl border border-mustard/25 p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">{t.title}</h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">{t.sub}</p>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">{t.already}</p>

      <div className="space-y-2.5">
        {steps.map(([n, title, sub, cta, href]) => (
          <div key={n} className="bg-navy-900/60 rounded-xl border border-navy-700 p-4 flex items-start gap-3 flex-wrap">
            <span className="w-6 h-6 rounded-full bg-mustard text-navy-950 text-xs font-bold flex items-center justify-center shrink-0">
              {n}
            </span>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{sub}</p>
            </div>
            {cta && (href.startsWith('http') || href.startsWith('/api/') ? (
              <ExternalLink
                href={href}
                className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-white transition-colors"
              >
                {cta}
              </ExternalLink>
            ) : (
              <Link
                href={href}
                className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-mustard hover:bg-mustard/90 text-navy-950 transition-colors"
              >
                {cta}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-mustard/70 leading-relaxed">{t.warn}</p>
    </div>
  )
}
