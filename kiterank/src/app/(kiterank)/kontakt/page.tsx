import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'
import { MarknadsFot } from '@/components/marketing/MarknadsFot'

/*
 * Kontakt.
 *
 * Ingen formulärruta. Ett formulär kräver att något tar emot det och skickar
 * det vidare, och mejlutskicken är inte påkopplade än — ett formulär som
 * sväljer meddelanden utan att någon får dem är sämre än ingen kontaktsida
 * alls, för avsändaren tror att de hört av sig.
 *
 * När Resend är på plats byter vi ut e-postkorten mot ett formulär. Tills dess
 * står adressen utskriven, vilket dessutom är det de flesta ändå föredrar.
 *
 * Supporten står inte här. Den bor i plattformen, där personen är inloggad och
 * vi ser vilket konto frågan gäller.
 */

export const metadata = {
  title:       'Kontakta Kiterank | Kiterank',
  description: 'Frågor om paketen, offert på en formgiven hemsida, eller något annat — hör av er, vi svarar normalt samma arbetsdag.',
}

const ADRESS = 'kontakt@kiterank.se'

const ARENDEN = [
  {
    ikon:   '◇',
    rubrik: 'Frågor innan ni börjar',
    text:   'Undrar ni om plattformen passar er verksamhet, hur ett paketbyte fungerar eller vad som ingår? Skriv och beskriv vad ni driver, så svarar vi rakt.',
    knapp:  'Skicka en fråga',
    amne:   'Fråga om Kiterank',
  },
  {
    ikon:   '✎',
    rubrik: 'Offert på formgiven hemsida',
    text:   'Vill ni ha en sida ritad från grunden hör ni av er här. Berätta gärna om ni har logotyp, färger och bilder — då kan vi säga något konkret direkt.',
    knapp:  'Begär offert',
    amne:   'Offert på designad hemsida',
  },
  {
    ikon:   '⌂',
    rubrik: 'Flera salonger',
    text:   'Driver ni mer än en verksamhet, eller en kedja? Hör av er så tittar vi på ett upplägg — det löser sig oftast enklare än man tror.',
    knapp:  'Hör av er',
    amne:   'Flera verksamheter',
  },
]

export default function KontaktPage() {
  return (
    <div className="bg-[#080f1e] text-white min-h-screen">
      <Nav />

      <section className="max-w-3xl mx-auto px-6 pt-20 pb-10 text-center space-y-4">
        <h1 className="text-4xl font-bold leading-tight">Hör av er</h1>
        <p className="text-white/45 leading-relaxed max-w-xl mx-auto">
          Vi svarar normalt samma arbetsdag, och alltid inom två. Det är en människa som läser —
          skriv gärna vad ni driver och var, så slipper vi fram och tillbaka.
        </p>
        <p className="pt-2">
          <a
            href={`mailto:${ADRESS}`}
            className="text-[#f0b429] hover:text-[#e0a520] text-xl font-semibold transition-colors"
          >
            {ADRESS}
          </a>
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-5">
          {ARENDEN.map(a => (
            <div key={a.rubrik} className="rounded-2xl border border-white/10 bg-white/3 p-6 flex flex-col gap-3">
              <span className="text-xl text-[#f0b429]">{a.ikon}</span>
              <div className="flex-1 space-y-2">
                <p className="font-bold leading-snug">{a.rubrik}</p>
                <p className="text-white/45 text-sm leading-relaxed">{a.text}</p>
              </div>
              {/* Ämnesraden förifylls. Det kostar oss ingenting och sparar ett
                  svarsmejl som bara frågar vad saken gäller. */}
              <a
                href={`mailto:${ADRESS}?subject=${encodeURIComponent(a.amne)}`}
                className="text-sm text-white/60 hover:text-[#f0b429] transition-colors"
              >
                {a.knapp} →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Supporten hör hemma i plattformen och inte här. Den som redan är kund
          ska inte behöva beskriva vilket konto de har. */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-white/10 bg-white/3 p-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <p className="font-bold">Redan kund?</p>
            <p className="text-white/45 text-sm leading-relaxed mt-1.5">
              Supporten finns inne i plattformen, där vi ser ert konto och er data. Det går
              snabbare för er, och svaren blir bättre.
            </p>
          </div>
          <Link
            href="/dashboard/support"
            className="shrink-0 bg-white/8 hover:bg-white/12 border border-white/10 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors text-center"
          >
            Till supporten →
          </Link>
        </div>
      </section>

      <MarknadsFot />
    </div>
  )
}
