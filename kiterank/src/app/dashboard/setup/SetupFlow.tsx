'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'
import { usePlan } from '@/components/PlanProvider'
import { getTemplatesForIndustry } from '@/app/onboarding/templates'
import { type GbpState } from '@/components/dashboard/GoogleProfileGuide'
import { GoogleConnectPanel } from '@/components/dashboard/GoogleConnectPanel'
import { ExternalLink } from '@/components/ExternalLink'
import {
  BLANK_PROFILE, siteIsOurs, SETUP_PROFILE_KEY, SETUP_DONE_KEY,
  type SetupProfile,
} from './steps'

/*
 * The whole journey, start to finish, in the order a customer actually lives
 * it: what they already have, then the site (browsing real templates if we
 * are building it), then measurement, then the Google profile, then the
 * connection that pulls it all in.
 *
 * Which screens appear depends entirely on the first one. A salon keeping its
 * own site never sees the template picker, but still has to put measurement
 * in place — having had a website and having recorded it are different things.
 */

const FLOW_KEY = 'kiterank_setup_flow'
const STEP_KEY = 'kiterank_setup_step'

type StepId =
  | 'intake' | 'template' | 'features'
  | 'address' | 'connect' | 'measure' | 'profile' | 'done'

type FlowState = {
  template: string | null
  features: string[]
  address:  string
  gbpState: GbpState
  profileDone: string[]   // gbp sub-steps ticked
}

// Salons only for now, so the industry question is gone and the templates
// come straight from the salon set.
const INDUSTRY = 'salon'

const FEATURES = [
  { id: 'booking',   sv: 'Bokningssystem på sidan', en: 'Booking system on the site', svd: 'Kunderna bokar tider direkt på din hemsida. Sköter du redan bokningen via en extern tjänst, som Bokadirekt, kan du stänga av den här.', end: 'Customers book appointments straight from your website. If you already handle booking through an external service, such as Bokadirekt, you can switch this off.' },
  { id: 'pricelist', sv: 'Prislista',       en: 'Price list',       svd: 'Visa tjänster och priser tydligt',    end: 'Show services and prices clearly' },
  { id: 'gallery',   sv: 'Bildgalleri',     en: 'Photo gallery',    svd: 'Visa upp ditt arbete med foton',      end: 'Show off your work with photos' },
  { id: 'contact',   sv: 'Kontaktformulär', en: 'Contact form',     svd: 'Kunder kan skicka meddelanden',       end: 'Customers can send you messages' },
  { id: 'reviews',   sv: 'Kundomdömen',     en: 'Customer reviews', svd: 'Lyft fram dina bästa recensioner',    end: 'Highlight your best reviews' },
]

// Everything on to start with — it is easier to switch a section off than to
// discover one you never knew existed.
const BLANK_FLOW: FlowState = {
  template: null, features: FEATURES.map(f => f.id), address: '',
  gbpState: 'unknown', profileDone: [],
}

const T = {
  sv: {
    of: 'av',
    back: '← Tillbaka', next: 'Nästa →', finish: 'Klart →',
    rail: { intake: 'Läget', template: 'Mall', features: 'Funktioner', address: 'Webbadress', connect: 'Koppling', measure: 'Mätning', profile: 'Google-profil', done: 'Klart' } as Record<StepId, string>,

    intakeTitle: 'Vad vill du ha hjälp med?',
    intakeSub:   'Välj det som stämmer för dig — valet avgör vilka steg du får härnäst.',
    optKeep:     'Jag har en hemsida som jag vill fortsätta med',
    optKeepSub:  'Du får marknadsföringsdashboarden. Vi mäter din nuvarande hemsida, din Google-profil och dina sökresultat — men rör inte själva sidan.',
    optBuild:    'Jag har ingen hemsida — eller vill se era alternativ',
    optBuildSub: 'Vi bygger sidan åt dig och sköter all mätning automatiskt. Du får titta igenom mallarna innan du bestämmer dig för något.',

    templateTitle: 'Välj en mall',
    templateSub:   'Klicka runt bland varianterna. Du kan byta mall och ändra färger och text när som helst efteråt.',
    preview:         'Öppna i helskärm',
    backToTemplates: '← Tillbaka till mallvalet',
    previewing:      'Förhandsgranskar:',

    featuresTitle: 'Vad ska sidan innehålla?',
    featuresSub:   'Allt går att slå på och av senare. Bokning rekommenderas — det är den som gör att vi kan visa vad varje kanal ger dig i kronor.',

    addressTheirsTitle: 'Vad är adressen till din hemsida?',
    addressTheirsSub:   'Vi behöver den för att kunna mäta besöken och se hur du ligger till i sökresultaten.',
    addressPh: 'studiosoder.se',

    connectStepTitle: 'Koppla ditt Google-konto',
    connectStepSub:   'Kopplingen är det som gör översikten till något — utan den finns inga siffror att visa dig. En inloggning hämtar in recensioner, sökresultat, annonser och besök. Bara läsbehörighet, vi ändrar aldrig något åt dig.',
    connectStepDone:  'Google är kopplat ✓',

    mNotConnected:    'Vi vet inte förrän du kopplat',
    mNotConnectedSub: 'Så fort Google-kontot är kopplat ser vi om din hemsida redan mäts. Hoppa tillbaka ett steg och koppla, så slipper du gissa.',
    mFoundTitle:      'Din besöksmätning finns redan',
    mFoundSub:        'Vi hittade mätningen på din hemsida och läser den härifrån. Ingenting behöver läggas in och du behöver inte kontakta den som sköter sidan.',
    mMissingTitle:    'Din hemsida mäts inte ännu',
    mMissingSub:      'Vi hittade ingen besöksmätning på sidan. Google kan bara se sökningarna som leder till dig — inte vad som händer när besökaren väl är inne. Det är därför den här raden behöver in på sidan.',
    mScFound:         'Sökresultaten läses redan in — där behövs ingenting.',
    mScMissing:       'Din sajt är inte anmäld till Google ännu. Det ordnar vi tillsammans, oftast utan att röra sidan.',

    measureOursTitle: 'Mätningen sköter vi',
    measureOursSub:   'När sidan är live lägger vi in besöksmätningen och anmäler sajten till Google. Du behöver inte göra något. Din sida publiceras på en tillfällig adress direkt — den egna webbadressen ordnar vi tillsammans efteråt, så inget behöver vänta på den.',
    measureTheirsTitle: 'Mätningen på din hemsida',
    measureTheirsSub:   'Vi kan inte nå in i en sida vi inte byggt, så den här biten behöver dig — eller den som sköter din hemsida.',
    snippetLabel: 'Koden som ska in på sidan',
    snippetHint:  'Klistra in den precis före </head> på alla sidor. Sköter någon annan hemsidan skickar du den vidare — det tar dem några minuter.',
    copy: 'Kopiera', copied: 'Kopierad ✓',
    scTitle: 'Anmäl sajten till Google',
    scText:  'Har någon redan gjort det åt dig får du upp till 16 månaders historik direkt. Har ingen gjort det börjar räkningen samma dag.',
    measureWarn: 'Mätningen börjar den dag den sätts upp. Besök som skett innan dess finns inte sparade någonstans — varken hos oss eller hos Google.',

    profileTitle: 'Din Google-profil',
    profileSub:   'Rutan med din salong som visas på Google och kartan. Den är gratis, och för en lokal salong drar den oftast in fler kunder än hemsidan.',
    lookupTitle:  'Finns salongen redan på Google?',
    lookupSub:    'Väldigt många salonger ligger redan på kartan utan att ägaren lagt upp dem — Google skapar dem själv. Tryck på knappen så söker vi upp din, sen berättar du vad du ser.',
    lookupCta:    'Sök upp min salong på Google →',
    foundTitle:   'Vad hittade du?',
    optMine:      'Den finns och jag äger den redan',
    optMineSub:   'Du kan logga in och redigera profilen',
    optUnclaimed: 'Den finns men den är inte min ännu',
    optUnclaimedSub: 'Rutan visas men du kan inte redigera den',
    optMissing:   'Jag hittar den inte',
    optMissingSub:'Ingen ruta med adress och karta dyker upp',
    tasksTitle:   'Gör så här',
    openGoogle:   'Öppna Google Företagsprofil →',

    connectNext:  'När sidan är live: koppla ditt Google-konto så fylls översikten med dina egna siffror.',
    connectCta:   'Koppla Google →',

    doneTitle: 'Allt är på plats',
    doneSub:   'Härifrån handlar det om att förbättra siffrorna. Veckans åtgärder ligger på startsidan.',
    doneStarts:'Det här börjar mätas nu:',
    buildTitle: 'Nu bygger vi din sida',
    buildSub:   'Vi sätter upp sidan med mallen och funktionerna du valt, och lägger in mätningen. Den publiceras på en tillfällig adress — din egen webbadress ordnar vi tillsammans efteråt.',
    nextSteps:  'Två saker återstår, i den här ordningen:',
    nsOneTitle: 'Färdigställ innehållet på hemsidan',
    nsOneSub:   'Fyll i dina tjänster med priser, texterna och bilderna. Klicka på det du vill ändra och skriv. Ju mer komplett sidan är, desto snabbare kan den gå live.',
    nsOneCta:   'Öppna redigeraren →',
    nsTwoTitle: 'Skapa eller koppla ditt Google-konto',
    nsTwoSub:   'Kopplingen är det som fyller översikten med dina egna siffror. Saknar du en Google-företagsprofil hjälper vi dig att skapa den på vägen.',
    nsTwoCta:   'Koppla Google →',
    willMeasure:'När det är klart börjar det här mätas:',
    goHome:    'Gå till startsidan →',
  },
  en: {
    of: 'of',
    back: '← Back', next: 'Next →', finish: 'Done →',
    rail: { intake: 'Your setup', template: 'Template', features: 'Features', address: 'Web address', connect: 'Connection', measure: 'Measurement', profile: 'Google profile', done: 'Done' } as Record<StepId, string>,

    intakeTitle: 'What would you like help with?',
    intakeSub:   'Pick the one that fits — it decides which steps you get next.',
    optKeep:     'I have a website I want to keep using',
    optKeepSub:  'You get the marketing dashboard. We measure your current website, your Google profile, and your search results — but leave the site itself alone.',
    optBuild:    'I have no website — or I want to see your options',
    optBuildSub: 'We build the site for you and handle all the measurement automatically. You get to look through the templates before deciding on anything.',

    templateTitle: 'Pick a template',
    templateSub:   'Click through the options. You can switch template and change colours and text at any time afterwards.',
    preview:         'Open full screen',
    backToTemplates: '← Back to templates',
    previewing:      'Previewing:',

    featuresTitle: 'What should the site include?',
    featuresSub:   'Everything can be switched on and off later. Booking is recommended — it is what lets us show what each channel brings you in kronor.',

    addressTheirsTitle: 'What is your website address?',
    addressTheirsSub:   'We need it to measure your visits and see where you rank in search results.',
    addressPh: 'studiosoder.se',

    connectStepTitle: 'Connect your Google account',
    connectStepSub:   'The connection is what makes the dashboard worth anything — without it there are no numbers to show you. One sign-in pulls in reviews, search results, ads, and visits. Read-only; we never change anything on your behalf.',
    connectStepDone:  'Google is connected ✓',

    mNotConnected:    'We cannot tell until you connect',
    mNotConnectedSub: 'As soon as your Google account is connected we can see whether your website is already being measured. Step back and connect, and you avoid guessing.',
    mFoundTitle:      'Your visitor measurement is already there',
    mFoundSub:        'We found the measurement on your website and read it from here. Nothing needs adding, and you do not have to contact whoever looks after the site.',
    mMissingTitle:    'Your website is not measured yet',
    mMissingSub:      'We found no visitor measurement on the site. Google can only see the searches that lead to you — not what happens once the visitor is there. That is why this line needs to go on the site.',
    mScFound:         'Search results are already coming in — nothing needed there.',
    mScMissing:       'Your site is not registered with Google yet. We sort that out together, usually without touching the site.',

    measureOursTitle: 'We handle the measurement',
    measureOursSub:   'Once the site is live we add visitor measurement and register it with Google. Nothing for you to do. Your site is published on a temporary address right away — we sort out your own web address together afterwards, so nothing has to wait for it.',
    measureTheirsTitle: 'Measurement on your website',
    measureTheirsSub:   'We cannot reach into a site we did not build, so this part needs you — or whoever looks after your website.',
    snippetLabel: 'The code that goes on the site',
    snippetHint:  'Paste it just before </head> on every page. If someone else looks after the site, forward it to them — it takes a few minutes.',
    copy: 'Copy', copied: 'Copied ✓',
    scTitle: 'Register the site with Google',
    scText:  'If someone already did this for you, you get up to 16 months of history straight away. If nobody has, the count starts today.',
    measureWarn: 'Measurement starts the day it is set up. Visits before that are not stored anywhere — not by us and not by Google.',

    profileTitle: 'Your Google profile',
    profileSub:   'The box with your salon that shows on Google and the map. It is free, and for a local salon it usually brings in more customers than the website.',
    lookupTitle:  'Is the salon already on Google?',
    lookupSub:    'A lot of salons are already on the map without the owner ever adding them — Google creates them itself. Press the button and we look yours up, then tell us what you see.',
    lookupCta:    'Look up my salon on Google →',
    foundTitle:   'What did you find?',
    optMine:      'It is there and I already own it',
    optMineSub:   'You can sign in and edit the profile',
    optUnclaimed: 'It is there but it is not mine yet',
    optUnclaimedSub: 'The panel shows but you cannot edit it',
    optMissing:   'I cannot find it',
    optMissingSub:'No panel with an address and map appears',
    tasksTitle:   'Here is what to do',
    openGoogle:   'Open Google Business Profile →',

    connectNext:  'Once the site is live: connect your Google account and the dashboard fills with your own numbers.',
    connectCta:   'Connect Google →',

    doneTitle: 'Everything is in place',
    doneSub:   "From here it is about improving the numbers. This week's actions are on your home page.",
    doneStarts:'This starts being measured now:',
    buildTitle: 'We are building your site',
    buildSub:   'We set the site up with the template and features you chose, and put the measurement in place. It goes live on a temporary address — we sort out your own web address together afterwards.',
    nextSteps:  'Two things remain, in this order:',
    nsOneTitle: 'Finish the content on your website',
    nsOneSub:   'Fill in your services with prices, the text, and the images. Click what you want to change and type. The more complete the site is, the sooner it can go live.',
    nsOneCta:   'Open the editor →',
    nsTwoTitle: 'Create or connect your Google account',
    nsTwoSub:   'The connection is what fills the dashboard with your own numbers. If you do not have a Google Business Profile yet, we help you create one along the way.',
    nsTwoCta:   'Connect Google →',
    willMeasure:'Once that is done, this starts being measured:',
    goHome:    'Go to your home page →',
  },
}

export function SetupFlow({
  salonName = '', city = '', isConnected = false, ga4Active = false, scActive = false,
}: {
  salonName?:   string
  city?:        string
  isConnected?: boolean
  ga4Active?:   boolean
  scActive?:    boolean
}) {
  const { lang } = useLang()
  const { plan } = usePlan()
  const t = T[lang]

  const [profile, setProfile] = useState<SetupProfile>(BLANK_PROFILE)
  const [flow,    setFlow]    = useState<FlowState>(BLANK_FLOW)
  // The step id is the source of truth rather than an index, so the position
  // survives a reload and stays correct even if the path changes length
  const [stepId,  setStepId]  = useState<StepId>('intake')
  const [ready,   setReady]   = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [preview, setPreview] = useState<{ id: string; name: string } | null>(null)

  // One decision drives everything: keep the site they have, or let us build one
  const [path, setPath] = useState<'keep' | 'build' | null>(null)

  useEffect(() => {
    try {
      const p = localStorage.getItem(SETUP_PROFILE_KEY)
      if (p) {
        const parsed: SetupProfile = JSON.parse(p)
        setProfile(parsed)
        setPath(siteIsOurs(parsed) ? 'build' : 'keep')
      }
      const f = localStorage.getItem(FLOW_KEY)
      if (f) setFlow({ ...BLANK_FLOW, ...JSON.parse(f) })
    } catch { /* first run */ }

    // The step lives in the URL so the browser's own back button walks the
    // flow instead of leaving it. Falls back to the saved position when
    // arriving without one.
    const params  = new URLSearchParams(window.location.search)
    const fromUrl = params.get('steg') as StepId | null
    const saved   = (() => { try { return localStorage.getItem(STEP_KEY) as StepId | null } catch { return null } })()
    const initial = fromUrl ?? saved ?? 'intake'
    setStepId(initial)
    applyPreviewParam(params.get('mall'))
    window.history.replaceState({ steg: initial }, '', `?steg=${initial}`)

    function onPop() {
      const q = new URLSearchParams(window.location.search)
      setStepId((q.get('steg') as StepId | null) ?? 'intake')
      applyPreviewParam(q.get('mall'))
    }
    window.addEventListener('popstate', onPop)
    setReady(true)
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyPreviewParam(id: string | null) {
    if (!id) { setPreview(null); return }
    const tpl = getTemplatesForIndustry(INDUSTRY).find(t => t.id === id)
    setPreview(tpl ? { id: tpl.id, name: tpl.name } : null)
  }

  function persistFlow(next: FlowState) {
    setFlow(next)
    localStorage.setItem(FLOW_KEY, JSON.stringify(next))
  }

  function persistProfile(): SetupProfile {
    // The Google profile situation is settled on its own step, where the
    // lookup button answers it properly — no point guessing here.
    const p: SetupProfile = {
      hasWebsite:   path === 'keep',
      wantsNewSite: path === 'build',
      hasProfile:   null,
      hasAds:       false,
    }
    setProfile(p)
    localStorage.setItem(SETUP_PROFILE_KEY, JSON.stringify(p))
    return p
  }

  if (!ready) return null

  // Follow the live choice so the rail below updates the moment they pick,
  // rather than waiting until the step is committed
  const ourSite = path === null ? siteIsOurs(profile) : path === 'build'
  // A site we build goes live on a temporary address — the domain is sorted
  // afterwards, so nothing holds up getting them up and running. A site they
  // already have we do need the address of, or there is nothing to measure.
  // On a site we build there is nothing for the customer to do about
  // measurement — we set it up — so that screen only exists for a site they
  // already have, where the code has to be handed over.
  // Building a site is the fastest visible win, so that path is kept to the
  // essentials — the Google profile and the connection are handled together
  // once the site is up. A customer keeping their own site has no site work,
  // so the profile is where the substance is for them.
  // On the existing-site path the connection comes first, because it tells us
  // what is already in place. Asking for a tracking code before checking would
  // send half of them chasing their web agency for work already done.
  const steps: StepId[] = ourSite
    ? ['intake', 'template', 'features', 'done']
    : ['intake', 'address', 'connect']
  // A saved step that no longer exists on this path falls back to the start
  const stepIdx = Math.max(0, steps.indexOf(stepId))
  const step    = steps[stepIdx]
  // Keyed on position, not on a particular step, so the two paths can end on
  // different screens without the navigation breaking
  const isLast  = stepIdx === steps.length - 1

  function goToIdx(i: number) {
    const next = steps[Math.min(Math.max(0, i), steps.length - 1)]
    setStepId(next)
    localStorage.setItem(STEP_KEY, next)
    window.history.pushState({ steg: next }, '', `?steg=${next}`)
  }

  function openPreview(id: string, name: string) {
    setPreview({ id, name })
    window.history.pushState({ steg: step, mall: id }, '', `?steg=${step}&mall=${id}`)
  }

  // Closing goes through history, so the in-page button and the browser's
  // own back button do exactly the same thing
  const closePreview = () => window.history.back()

  const canAdvance = (() => {
    if (step === 'intake')   return path !== null
    if (step === 'template') return !!flow.template
    // No point moving on before we know which profile situation they are in
    if (step === 'profile')  return flow.gbpState !== 'unknown'
    if (step === 'address')  return flow.address.trim().length > 2
    return true
  })()

  function goNext() {
    if (step === 'intake') persistProfile()
    // Reaching the end marks the flow as started, so the dashboard stops
    // sending them back here. Keyed on the destination rather than on any one
    // step, so it survives steps being added or removed.
    if (stepIdx + 1 >= steps.length - 1) {
      localStorage.setItem(SETUP_DONE_KEY, JSON.stringify(steps))
    }
    goToIdx(stepIdx + 1)
  }


  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-6">

      {/* Progress rail — the whole journey visible at once */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${
              i === stepIdx ? 'bg-mustard text-navy-950 border-mustard font-semibold'
                : i < stepIdx ? 'border-green-500/40 text-green-400'
                : 'border-navy-700 text-slate-500'
            }`}>
              {t.rail[s]}
            </span>
            {i < steps.length - 1 && <span className="text-navy-700 text-xs">·</span>}
          </div>
        ))}
      </div>

      {/* ── Vad har du redan ─────────────────────────────────────────── */}
      {step === 'intake' && (
        <Screen title={t.intakeTitle} sub={t.intakeSub}>
          <div className="space-y-3">
            {([
              ['keep',  t.optKeep,  t.optKeepSub],
              ['build', t.optBuild, t.optBuildSub],
            ] as ['keep' | 'build', string, string][]).map(([v, label, sub]) => (
              <button
                key={v}
                onClick={() => setPath(v)}
                className={`w-full text-left rounded-xl border p-4 sm:p-5 flex items-start gap-3 transition-colors ${
                  path === v
                    ? 'bg-mustard/10 border-mustard'
                    : 'bg-navy-800 border-navy-700 hover:border-navy-600'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ${
                  path === v ? 'border-mustard bg-mustard' : 'border-navy-600'
                }`} />
                <span>
                  <span className={`block text-sm font-semibold ${path === v ? 'text-mustard' : 'text-white'}`}>{label}</span>
                  <span className="block text-xs text-slate-400 mt-1 leading-relaxed">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </Screen>
      )}

      {/* ── Mall, med riktiga förhandsvisningar ──────────────────────── */}
      {step === 'template' && (
        <Screen title={t.templateTitle} sub={t.templateSub}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[540px] overflow-y-auto pr-1">
            {getTemplatesForIndustry(INDUSTRY).map(tpl => {
              const active = flow.template === tpl.id
              return (
                <div
                  key={tpl.id}
                  onClick={() => persistFlow({ ...flow, template: tpl.id })}
                  className={`rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                    active ? 'border-mustard' : 'border-navy-700 hover:border-navy-500'
                  }`}
                >
                  <div className="relative overflow-hidden" style={{ height: 180, backgroundColor: tpl.colors.bg }}>
                    <iframe
                      src={`/preview/${tpl.id}`}
                      style={{
                        position: 'absolute', top: 0, left: 0, width: 1280, height: 800,
                        transform: 'scale(0.25)', transformOrigin: 'top left',
                        border: 'none', pointerEvents: 'none',
                      }}
                      loading="lazy"
                      title={tpl.name}
                    />
                  </div>
                  <div className={`px-3 py-2.5 flex items-center justify-between gap-2 ${active ? 'bg-mustard/10' : 'bg-navy-900'}`}>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm ${active ? 'text-mustard' : 'text-white'}`}>{tpl.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5 truncate">{tpl.tagline}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); openPreview(tpl.id, tpl.name) }}
                      className="shrink-0 text-xs text-slate-500 hover:text-mustard transition-colors whitespace-nowrap bg-transparent border-0 p-0 cursor-pointer"
                    >
                      {t.preview}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Screen>
      )}

      {/* ── Funktioner ───────────────────────────────────────────────── */}
      {step === 'features' && (
        <Screen title={t.featuresTitle} sub={t.featuresSub}>
          <div className="space-y-2">
            {FEATURES.map(f => {
              const on = flow.features.includes(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => persistFlow({
                    ...flow,
                    features: on ? flow.features.filter(x => x !== f.id) : [...flow.features, f.id],
                  })}
                  className={`w-full text-left rounded-xl border px-4 py-3 flex items-start gap-3 transition-colors ${
                    on ? 'bg-navy-800 border-mustard/40' : 'bg-navy-800/50 border-navy-700 hover:border-navy-600'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md border shrink-0 mt-0.5 flex items-center justify-center text-xs ${
                    on ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-navy-600 text-transparent'
                  }`}>✓</span>
                  <span>
                    <span className="block text-sm font-medium text-white">{lang === 'sv' ? f.sv : f.en}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">{lang === 'sv' ? f.svd : f.end}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Screen>
      )}

      {/* ── Webbadress ───────────────────────────────────────────────── */}
      {step === 'address' && (
        <Screen title={t.addressTheirsTitle} sub={t.addressTheirsSub}>
          <input
            value={flow.address}
            onChange={e => persistFlow({ ...flow, address: e.target.value })}
            placeholder={t.addressPh}
            className="w-full bg-navy-800 border border-navy-700 focus:border-mustard/50 outline-none rounded-xl px-4 py-3 text-white text-sm"
          />
        </Screen>
      )}

      {/* ── Koppling ─────────────────────────────────────────────────── */}
      {step === 'connect' && (
        <Screen title={t.connectStepTitle} sub={t.connectStepSub}>
          {isConnected ? (
            <p className="text-sm text-green-400">{t.connectStepDone}</p>
          ) : (
            <>
              {/* The same panel the connections page shows, so connecting is
                  one recognisable thing wherever it comes up. */}
              <GoogleConnectPanel salonName={salonName} city={city} isConnected={isConnected} />

              <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
                <p className="text-sm font-medium text-white mb-2">{t.willMeasure}</p>
                <ul className="space-y-1.5">
                  {[
                    lang === 'sv' ? 'Din Google-profil — visningar, samtal och vägbeskrivningar' : 'Your Google profile — views, calls, and directions',
                    lang === 'sv' ? 'Din hemsida — besök och förfrågningar' : 'Your website — visits and enquiries',
                    lang === 'sv' ? 'Sökresultaten — vilka sökningar som leder till dig' : 'Search results — which searches lead to you',
                    ...(plan === 'testbok' ? [lang === 'sv' ? 'Bokningarna — vad varje kanal ger dig i kronor' : 'Bookings — what each channel brings you in kronor'] : []),
                  ].map((line, i) => (
                    <li key={i} className="text-xs text-slate-300 flex gap-2">
                      <span className="text-green-400">✓</span>{line}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/dashboard"
                className="inline-block bg-mustard hover:bg-mustard/90 text-navy-950 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                {t.goHome}
              </Link>
            </>
          )}
        </Screen>
      )}


      {/* ── Klart ────────────────────────────────────────────────────── */}
      {step === 'done' && (
        <Screen
          title={ourSite ? t.buildTitle : t.doneTitle}
          sub={ourSite ? t.buildSub : t.doneSub}
        >
          {/* Nothing is measured yet on a site we are still building, so the
              honest ending is the two things that actually remain — in order. */}
          {ourSite && (
            <div className="space-y-2.5">
              <p className="text-sm font-medium text-white">{t.nextSteps}</p>
              {([
                ['1', t.nsOneTitle, t.nsOneSub, t.nsOneCta, '/dashboard/webbplats'],
                // Straight to the sign-in, exactly like the connect panel —
                // routing via the connections page first would be one more hop
                // for the same outcome.
                ['2', t.nsTwoTitle, t.nsTwoSub, t.nsTwoCta, '/api/auth/google'],
              ] as [string, string, string, string, string][]).map(([n, title, sub, cta, href]) => (
                <div key={n} className="bg-navy-800 rounded-xl border border-navy-700 p-4 flex items-start gap-3 flex-wrap">
                  <span className="w-6 h-6 rounded-full bg-mustard text-navy-950 text-xs font-bold flex items-center justify-center shrink-0">
                    {n}
                  </span>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{sub}</p>
                  </div>
                  {href.startsWith('/api/') ? (
                    <ExternalLink
                      href={href}
                      className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-white transition-colors"
                    >
                      {cta}
                    </ExternalLink>
                  ) : (
                    <Link
                      href={href}
                      className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-white transition-colors"
                    >
                      {cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
            <p className="text-sm font-medium text-white mb-2">{ourSite ? t.willMeasure : t.doneStarts}</p>
            <ul className="space-y-1.5">
              {[
                lang === 'sv' ? 'Din Google-profil — visningar, samtal och vägbeskrivningar' : 'Your Google profile — views, calls, and directions',
                lang === 'sv' ? 'Din hemsida — besök och förfrågningar' : 'Your website — visits and enquiries',
                lang === 'sv' ? 'Sökresultaten — vilka sökningar som leder till dig' : 'Search results — which searches lead to you',
                ...(plan === 'testbok' ? [lang === 'sv' ? 'Bokningarna — vad varje kanal ger dig i kronor' : 'Bookings — what each channel brings you in kronor'] : []),
              ].map((line, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-2">
                  <span className="text-green-400">✓</span>{line}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/dashboard"
            className="inline-block bg-mustard hover:bg-mustard/90 text-navy-950 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            {t.goHome}
          </Link>

          {!ourSite && (
            <p className="text-xs text-slate-500 leading-relaxed pt-1">
              {t.connectNext}{' '}
              <ExternalLink href="/api/auth/google" className="text-mustard hover:underline">
                {t.connectCta}
              </ExternalLink>
            </p>
          )}
        </Screen>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
        <button
          onClick={() => goToIdx(stepIdx - 1)}
          disabled={stepIdx === 0}
          className={`text-sm px-4 py-2 rounded-xl transition-colors ${
            stepIdx === 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t.back}
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 tabular-nums">
            {stepIdx + 1} {t.of} {steps.length}
          </span>
          {!isLast && (
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className={`text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors ${
                canAdvance
                  ? 'bg-mustard hover:bg-mustard/90 text-navy-950'
                  : 'bg-navy-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              {steps[stepIdx + 1] === 'done' ? t.finish : t.next}
            </button>
          )}
        </div>
      </div>

      {/* Full-screen preview as an overlay — leaving the page would drop the
          customer out of the flow entirely. */}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center gap-4 px-4 sm:px-5 shrink-0 h-14 bg-navy-900 border-b border-navy-700">
            <button
              onClick={closePreview}
              className="flex items-center gap-2 px-4 py-2 bg-mustard hover:bg-mustard/90 text-navy-950 font-semibold text-sm rounded-lg transition-colors shrink-0"
            >
              {t.backToTemplates}
            </button>
            <span className="text-slate-500 text-sm truncate">
              {t.previewing} <strong className="text-slate-300">{preview.name}</strong>
            </span>
          </div>
          <iframe
            src={`/preview/${preview.id}`}
            className="flex-1 w-full border-0"
            title={preview.name}
          />
        </div>
      )}
    </div>
  )
}

/* ── Building blocks ─────────────────────────────────────────────────── */

function Screen({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">{sub}</p>
      </div>
      {children}
    </div>
  )
}

