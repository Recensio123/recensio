'use client'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'

/*
 * Måndagsrapporten — the weekly digest, previewed as a page.
 * This exact layout becomes the email/SMS body. Sending requires an email
 * provider (e.g. Resend) — not yet connected; content is mock until then.
 */

const T = {
  sv: {
    title:        'Din måndagsrapport',
    subtitle:     'Det här landar i din inkorg varje måndag kl. 08:00',
    preview:      'Förhandsvisning',
    emailHeader:  'Kiterank · Vecka 31',
    emailSub:     'Din vecka på Google, på 20 sekunder',
    whatHappened: 'Vad som hänt',
    headline:     '14 nya kunder hittade dig via Google — upp från 11 förra veckan',
    win:          '★ Du fick 3 nya recensioner och klättrade till plats 2 på Google Maps för ”frisör södermalm”',
    taskTitle:    'Veckans viktigaste uppgift',
    taskName:     'Svara på dina 3 obesvarade recensioner',
    taskSub:      'Tar cirka 10 minuter — färdiga svarsförslag väntar på dig.',
    cta:          'Öppna veckans åtgärder →',
    footer:       'Du får det här varje måndag eftersom det är veckovis omsorg som flyttar Google-rankningen. Avsluta när du vill under Inställningar.',
    activates:    'E-postutskicken aktiveras när utskickstjänsten är ansluten.',
  },
  en: {
    title:        'Your Monday report',
    subtitle:     'This is what lands in your inbox every Monday at 08:00',
    preview:      'Preview',
    emailHeader:  'Kiterank · Week 31',
    emailSub:     'Your week on Google, in 20 seconds',
    whatHappened: 'What happened',
    headline:     '14 new customers found you on Google — up from 11 last week',
    win:          '★ You got 3 new reviews and moved up to #2 on Google Maps for “frisör södermalm”',
    taskTitle:    "This week's most important task",
    taskName:     'Reply to your 3 unanswered reviews',
    taskSub:      'Takes about 10 minutes — suggested replies are ready for you.',
    cta:          "Open this week's actions →",
    footer:       'You get this every Monday because weekly attention is what moves Google rankings. Unsubscribe anytime in Settings.',
    activates:    'Email delivery activates when the sending service is connected.',
  },
}

export default function DigestPreviewPage() {
  const { lang } = useLang()
  const t = T[lang]
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-8 py-10">

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">{t.title}</h1>
          <p className="text-slate-500 text-sm mt-1">{t.subtitle}</p>
        </div>
        <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
          {t.preview}
        </span>
      </div>

      {/* The email, as a card */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 overflow-hidden">

        {/* Email header */}
        <div className="px-6 py-4 border-b border-navy-700 bg-navy-900/50">
          <p className="text-white text-sm font-semibold">{t.emailHeader}</p>
          <p className="text-slate-500 text-xs mt-0.5">{t.emailSub}</p>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* 1. The headline */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t.whatHappened}</p>
            <p className="text-white text-lg font-bold leading-snug">{t.headline}</p>
          </div>

          {/* 2. The win */}
          <div className="bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3">
            <p className="text-green-400 text-sm">{t.win}</p>
          </div>

          {/* 3. The one thing to do */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">{t.taskTitle}</p>
            <div className="bg-navy-900 border border-navy-600 rounded-xl px-4 py-3.5">
              <p className="text-white text-sm font-medium">{t.taskName}</p>
              <p className="text-slate-500 text-xs mt-1">{t.taskSub}</p>
            </div>
          </div>

          {/* 4. One button */}
          <Link
            href="/dashboard#actions"
            className="block text-center bg-mustard hover:bg-mustard/90 text-navy-950 text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
          >
            {t.cta}
          </Link>

        </div>

        {/* Email footer */}
        <div className="px-6 py-3 border-t border-navy-700 bg-navy-900/50">
          <p className="text-slate-500 text-xs">{t.footer}</p>
        </div>
      </div>

      <p className="text-slate-500 text-xs mt-4 text-center">{t.activates}</p>

    </div>
  )
}
