'use client'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import Link from 'next/link'
import type { Connection } from './types'

/*
 * The accounts, and what it takes to connect each one.
 *
 * A card is in one of three states. Connected, with the account name and when
 * we last fetched. Ready to connect, with a button that opens that platform's
 * own approval page. Or not switched on yet — which is the truthful state while
 * our app is still going through the platform's review, and the reason the
 * button is a flat label instead of something that would fail on click.
 *
 * No connection is made from inside our product: the salon logs in on
 * Instagram's or TikTok's own page and approves there, and what comes back is a
 * token tied to that one account. That is why the requirement text matters —
 * a private Instagram account cannot report statistics no matter what the
 * salon approves.
 */

const T = {
  sv: {
    connect:     'Koppla',
    connected:   'Kopplat',
    notReady:    'Inte påslaget ännu',
    notReadyTip: 'Kopplingen väntar på godkännande hos plattformen. Knappen dyker upp här så fort den är klar — inget du behöver göra.',
    syncedNever: 'Ingen hämtning gjord ännu',
    lastSync:    'Senast hämtat',
    gives:       'Du får:',
    disconnect:  'Koppla från',
    linkTitle:   'Vad ett inlägg ger på hemsidan',
    linkNote:    'Plattformarna räknar gilla och kommentarer. Vill du se hur många besök ett enskilt inlägg skickade vidare märker du länken innan du delar den.',
    linkLink:    'Spårningslänkar på Hemsida →',
  },
  en: {
    connect:     'Connect',
    connected:   'Connected',
    notReady:    'Not switched on yet',
    notReadyTip: 'The connection is waiting for approval from the platform. The button appears here as soon as it is ready — nothing for you to do.',
    syncedNever: 'Nothing fetched yet',
    lastSync:    'Last fetched',
    gives:       'You get:',
    disconnect:  'Disconnect',
    linkTitle:   'What a post brings to the website',
    linkNote:    'The platforms count likes and comments. To see how many visits one post sent on, tag the link before you share it.',
    linkLink:    'Tracking links on Website →',
  },
}

export function KontonTab({ connections }: { connections: Connection[] }) {
  const { lang } = useLang()
  const t = T[lang]

  return (
    <div className="space-y-6">
      <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
        {connections.map(c => (
          <div key={c.platform} className="px-4 py-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-sm font-medium">{c.label}</p>
                {c.connected && (
                  <span className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded">
                    {t.connected}
                  </span>
                )}
              </div>

              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                <span className="text-slate-500">{t.gives} </span>
                {c.gives[lang]}
              </p>

              {c.connected ? (
                <p className="text-slate-600 text-xs mt-1.5">
                  {c.account ? `${c.account} · ` : ''}
                  {c.syncedAt
                    ? `${t.lastSync} ${new Date(c.syncedAt).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' })}`
                    : t.syncedNever}
                </p>
              ) : (
                <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">{c.requires[lang]}</p>
              )}
            </div>

            <div className="shrink-0 pt-0.5">
              {c.connected ? (
                <form action={`/api/social/${c.platform}/disconnect`} method="post">
                  <button className="text-xs text-slate-500 hover:text-slate-300 border border-navy-700 px-3 py-1.5 rounded-lg transition-colors">
                    {t.disconnect}
                  </button>
                </form>
              ) : c.configured ? (
                <a
                  href={`/api/social/${c.platform}/connect`}
                  className="text-xs font-semibold bg-mustard hover:bg-mustard/90 text-navy-950 px-3.5 py-1.5 rounded-lg transition-colors inline-block"
                >
                  {t.connect}
                </a>
              ) : (
                <Tooltip text={t.notReadyTip}>
                  <span className="text-xs text-slate-600 border border-navy-700 px-3.5 py-1.5 rounded-lg cursor-default inline-block">
                    {t.notReady}
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 max-w-2xl">
        <p className="text-white text-sm font-medium">{t.linkTitle}</p>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{t.linkNote}</p>
        <Link href="/dashboard/analytics" className="text-mustard text-xs font-medium hover:underline inline-block mt-2">
          {t.linkLink}
        </Link>
      </div>
    </div>
  )
}
