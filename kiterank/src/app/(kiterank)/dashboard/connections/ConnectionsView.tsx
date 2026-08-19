'use client'
import { useLang } from '@/components/LanguageProvider'
import { GoogleConnectPanel } from '@/components/dashboard/GoogleConnectPanel'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { HelpButton } from '@/components/dashboard/HelpButton'
import { Tooltip } from '@/components/Tooltip'
import { ExternalLink } from '@/components/ExternalLink'
import { SyncButton } from './SyncButton'

type Props = {
  error?:        string
  errorDetail?:  string
  success?:      string
  isConnected:   boolean
  hasLocation:   boolean
  scActive:      boolean
  adsActive:     boolean
  ga4Active:     boolean
  companyName:   string | null
  city:          string | null
  connectedAt:   string | null
  scSiteUrl:     string | null
  scQueryCount:  number | null
  adsCustomerId: string | null
  ga4PropertyId: string | null
  lastSynced:    string | null
}

const T = {
  sv: {
    subConnected:    'Hantera din Google-koppling och datahämtning',
    subNotConnected: 'Koppla en gång — sedan hämtas all din data automatiskt',
    errors: {
      cancelled:      'Du avbröt inloggningen med Google.',
      invalid_state:  'Säkerhetskontrollen misslyckades. Försök igen.',
      token_exchange: 'Inloggningen kunde inte slutföras. Försök igen.',
      db:             'Databasfel. Försök igen.',
    } as Record<string, string>,
    errorFallback:   'Något gick fel. Försök igen.',
    success:         'Google är nu kopplat. Din data börjar snart synas i översikten.',
    googleAccount:   'Google-konto',
    connectedOn:     'Kopplad',
    connectedBadge:  'Kopplad',
    active:          'Aktiv',
    pendingApproval: 'Väntar på godkännande',
    setupNeeded:     'Behöver sättas upp',
    activeTip:       'Källan är igång — din data hämtas automatiskt och visas i översikten.',
    pendingTip:      'Google behöver godkänna åtkomsten till din företagsprofil. Det sker automatiskt, oftast inom 2–5 vardagar. Du behöver inte göra något.',
    setupTip:        'Källan hittades inte på ditt Google-konto. Texten under raden förklarar exakt vad som behöver göras.',
    connectedTip:    'Ditt Google-konto är kopplat och din data läses automatiskt. Vi kan aldrig ändra något åt dig.',
    gbpName:         'Företagsprofil',
    gbpDesc:         'Recensioner, visningar, synlighet på Maps',
    scName:          'Search Console',
    scDescActive:    (n: number, url: string) => `${n} sökord bevakas · ${url}`,
    scDescIdle:      'Sökordsplaceringar, besök från Google-sök',
    adsName:         'Google Ads',
    adsDescActive:   (id: string) => `Kundnummer: ${id}`,
    adsDescIdle:     'Annonskostnad, sökord som slösar pengar',
    ga4Name:         'Analytics',
    ga4DescActive:   (id: string) => `Egendom: ${id}`,
    ga4DescIdle:     'Hemsidebesök, förfrågningar',
    reconnect:       'Koppla om Google',
  },
  en: {
    subConnected:    'Manage your Google connection and data sync',
    subNotConnected: 'Connect once — all your data flows in automatically',
    errors: {
      cancelled:      'You cancelled the Google sign-in.',
      invalid_state:  'Security check failed. Please try again.',
      token_exchange: 'Failed to complete sign-in. Please try again.',
      db:             'Database error. Please try again.',
    } as Record<string, string>,
    errorFallback:   'Something went wrong. Please try again.',
    success:         'Google connected successfully. Your data will start appearing in the dashboard.',
    googleAccount:   'Google account',
    connectedOn:     'Connected',
    connectedBadge:  'Connected',
    active:          'Active',
    pendingApproval: 'Pending approval',
    setupNeeded:     'Setup needed',
    activeTip:       'This source is live — your data is fetched automatically and shown in the dashboard.',
    pendingTip:      'Google needs to approve access to your Business Profile. This happens automatically, usually within 2–5 business days. No action needed.',
    setupTip:        'This source was not found on your Google account. The note below the row explains exactly what to do.',
    connectedTip:    'Your Google account is connected and your data is read automatically. We can never change anything on your behalf.',
    gbpName:         'Business Profile',
    gbpDesc:         'Reviews, impressions, Maps visibility',
    scName:          'Search Console',
    scDescActive:    (n: number, url: string) => `${n} keywords tracked · ${url}`,
    scDescIdle:      'Keyword rankings, organic traffic',
    adsName:         'Google Ads',
    adsDescActive:   (id: string) => `Customer ID: ${id}`,
    adsDescIdle:     'Campaign spend, wasted keywords',
    ga4Name:         'Analytics',
    ga4DescActive:   (id: string) => `Property: ${id}`,
    ga4DescIdle:     'Website sessions, conversions',
    reconnect:       'Reconnect Google',
  },
}


export function ConnectionsView({
  error, errorDetail, success,
  isConnected, hasLocation, scActive, adsActive, ga4Active,
  companyName, city, connectedAt, scSiteUrl, scQueryCount, adsCustomerId, ga4PropertyId, lastSynced,
}: Props) {
  const { lang } = useLang()
  const L = T[lang]

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-8 py-8 space-y-4">

      <PageHeader
        titleSv="Google-koppling"
        titleEn="Google connection"
        subSv={isConnected ? T.sv.subConnected : T.sv.subNotConnected}
        subEn={isConnected ? T.en.subConnected : T.en.subNotConnected}
      >
        <HelpButton topic="kopplingar" />
      </PageHeader>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {L.errors[error] ?? L.errorFallback}
          {errorDetail && <p className="text-xs text-red-300 font-mono mt-1">{errorDetail}</p>}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400 text-sm">
          {L.success}
        </div>
      )}


      {/* NOT CONNECTED — the same panel onboarding shows, so connecting looks
          identical wherever the customer meets it */}
      {!isConnected && (
        <GoogleConnectPanel
          salonName={companyName ?? ''}
          city={city ?? ''}
          isConnected={isConnected}
        />
      )}

      {/* CONNECTED */}
      {isConnected && (
        <div className="bg-navy-800 rounded-2xl border border-navy-700 overflow-hidden">

          {/* Account row */}
          <div className="px-4 sm:px-6 py-5 flex items-center justify-between flex-wrap gap-4 border-b border-navy-700">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-green-400 font-bold text-lg">G</div>
              <div>
                <p className="text-white font-semibold">{companyName ?? L.googleAccount}</p>
                {connectedAt && (
                  <p className="text-slate-500 text-xs mt-0.5">
                    {L.connectedOn} {new Date(connectedAt).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            <Tooltip text={L.connectedTip}>
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full shrink-0 cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {L.connectedBadge}
              </span>
            </Tooltip>
          </div>

          {/* Data sources */}
          <div className="divide-y divide-navy-700">
            {/* GBP */}
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-base w-5 text-center">★</span>
                  <div>
                    <p className="text-sm text-white font-medium">{L.gbpName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{L.gbpDesc}</p>
                  </div>
                </div>
                <Tooltip text={hasLocation ? L.activeTip : L.pendingTip}>
                  <span className={`text-xs shrink-0 cursor-default ${hasLocation ? 'text-green-400' : 'text-amber-400'}`}>
                    {hasLocation ? L.active : L.pendingApproval}
                  </span>
                </Tooltip>
              </div>
              {!hasLocation && (
                <p className="text-xs text-slate-500 mt-2 ml-8 leading-relaxed">
                  {lang === 'sv'
                    ? 'Ditt Google-konto är kopplat. Vi väntar på att Google ska godkänna åtkomsten till din företagsprofil — det tar oftast 2–5 vardagar. Du behöver inte göra något. Översikten uppdateras automatiskt när det är klart.'
                    : "Your Google account is connected. We're waiting on Google to approve API access to your Business Profile data — this typically takes 2–5 business days. No action needed from you. Your dashboard will update automatically once approved."}
                </p>
              )}
            </div>

            {/* Search Console */}
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-base w-5 text-center">⌕</span>
                  <div>
                    <p className="text-sm text-white font-medium">{L.scName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {scActive ? L.scDescActive(scQueryCount ?? 0, scSiteUrl ?? '') : L.scDescIdle}
                    </p>
                  </div>
                </div>
                <Tooltip text={scActive ? L.activeTip : L.setupTip}>
                  <span className={`text-xs shrink-0 cursor-default ${scActive ? 'text-green-400' : 'text-amber-400'}`}>
                    {scActive ? L.active : L.setupNeeded}
                  </span>
                </Tooltip>
              </div>
              {!scActive && (
                <p className="text-xs text-slate-500 mt-2 ml-8 leading-relaxed">
                  {lang === 'sv' ? (
                    <>
                      Din hemsida är inte verifierad i Google Search Console ännu.{' '}
                      <ExternalLink href="https://search.google.com/search-console" className="text-mustard underline">
                        Verifiera den här
                      </ExternalLink>
                      {' '}— koppla sedan om Google, så dyker dina sökordsplaceringar upp.
                    </>
                  ) : (
                    <>
                      Your website isn&apos;t verified in Google Search Console yet.{' '}
                      <ExternalLink href="https://search.google.com/search-console" className="text-mustard underline">
                        Verify it here
                      </ExternalLink>
                      {' '}— then reconnect Google and your keyword rankings will appear.
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Google Ads */}
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-base w-5 text-center">◈</span>
                  <div>
                    <p className="text-sm text-white font-medium">{L.adsName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {adsActive && adsCustomerId ? L.adsDescActive(adsCustomerId) : L.adsDescIdle}
                    </p>
                  </div>
                </div>
                <Tooltip text={adsActive ? L.activeTip : L.setupTip}>
                  <span className={`text-xs shrink-0 cursor-default ${adsActive ? 'text-green-400' : 'text-amber-400'}`}>
                    {adsActive ? L.active : L.setupNeeded}
                  </span>
                </Tooltip>
              </div>
              {!adsActive && (
                <p className="text-xs text-slate-500 mt-2 ml-8 leading-relaxed">
                  {lang === 'sv' ? (
                    <>
                      Vi hittade inget Google Ads-konto på din Google-profil. Annonserar du inte ännu?{' '}
                      <ExternalLink href="https://ads.google.com" className="text-mustard underline">
                        Kom igång på ads.google.com
                      </ExternalLink>
                      . Har du redan ett konto? Se till att det hör till samma Google-konto som du kopplade ovan, och koppla sedan om.
                    </>
                  ) : (
                    <>
                      No Google Ads account was found on your Google profile. If you&apos;re not running ads yet,{' '}
                      <ExternalLink href="https://ads.google.com" className="text-mustard underline">
                        get started at ads.google.com
                      </ExternalLink>
                      . Already have an account? Make sure it&apos;s linked to the same Google profile you connected above, then reconnect.
                    </>
                  )}
                </p>
              )}
            </div>

            {/* GA4 */}
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-base w-5 text-center">↗</span>
                  <div>
                    <p className="text-sm text-white font-medium">{L.ga4Name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ga4Active && ga4PropertyId ? L.ga4DescActive(ga4PropertyId) : L.ga4DescIdle}
                    </p>
                  </div>
                </div>
                <Tooltip text={ga4Active ? L.activeTip : L.setupTip}>
                  <span className={`text-xs shrink-0 cursor-default ${ga4Active ? 'text-green-400' : 'text-amber-400'}`}>
                    {ga4Active ? L.active : L.setupNeeded}
                  </span>
                </Tooltip>
              </div>
              {!ga4Active && (
                <p className="text-xs text-slate-500 mt-2 ml-8 leading-relaxed">
                  {lang === 'sv' ? (
                    <>
                      Vi hittade inget Google Analytics-konto kopplat till din Google-profil.{' '}
                      <ExternalLink href="https://analytics.google.com" className="text-mustard underline">
                        Skapa ett på analytics.google.com
                      </ExternalLink>
                      {' '}— det är gratis. Koppla sedan om Google, så visas din hemsidedata här.
                    </>
                  ) : (
                    <>
                      We couldn&apos;t find a Google Analytics account linked to your Google profile.{' '}
                      <ExternalLink href="https://analytics.google.com" className="text-mustard underline">
                        Create one at analytics.google.com
                      </ExternalLink>
                      {' '}— it&apos;s free. Once set up, reconnect Google and your website data will appear here.
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-4 sm:px-6 py-4 border-t border-navy-700 flex items-center flex-wrap gap-4">
            <SyncButton lastSynced={lastSynced} />
            <ExternalLink href="/api/auth/google" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              {L.reconnect}
            </ExternalLink>
          </div>
        </div>
      )}

    </div>
  )
}
