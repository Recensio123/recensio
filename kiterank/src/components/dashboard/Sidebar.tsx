'use client'
import Link from 'next/link'
import { VyVaxel } from './VyVaxel'
import type { Vy } from '@/lib/datalage'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTooltips } from '@/components/TooltipProvider'
import { useDataDepth, type DepthPreset } from '@/components/DataCoverageProvider'
import { usePlan, hasBooking } from '@/components/PlanProvider'
import { useLang, type Lang } from '@/components/LanguageProvider'

/*
 * Navigation — every label and tooltip exists in Swedish (primary) and
 * English, switched with the flag toggle at the top. Items are identified
 * by id; labels are looked up per language at render time.
 */

type NavId =
  | 'actionplan' | 'home' | 'gbp' | 'seo' | 'ads' | 'tools' | 'website'
  | 'bokningar' | 'social' | 'sms' | 'webbplats' | 'connections' | 'settings' | 'support' | 'setup'

type NavDef = { id: NavId; href: string; icon: string }

/*
 * Menyn i tre grupper.
 *
 * Först det salongen driver: sidan, tidboken. Sedan hur det går för dem, under
 * en egen rubrik. Sist det man rör sällan.
 *
 * Uppdelningen ersätter en enda lång lista där en kund som ville ändra en text
 * på sin hemsida fick läsa förbi rankningar och annonssiffror för att hitta
 * dit. Det som är dagligt arbete står överst; det som är uppföljning står under
 * ett ord som säger att det är uppföljning.
 */
const nav: NavDef[] = [
  { id: 'home',       href: '/dashboard',              icon: '▤' },
  { id: 'webbplats',  href: '/dashboard/webbplats',    icon: '✎' },
  { id: 'bokningar',  href: '/dashboard/bokningar',    icon: '◻' },
]

/* Kanalerna, och vad de gav. Alla fyra svarar på samma fråga för var sitt
   ställe: syns vi, och ledde det någonstans? */
const marknadNav: NavDef[] = [
  { id: 'gbp',        href: '/dashboard/gbp',          icon: '✦' },
  { id: 'seo',        href: '/dashboard/keywords',     icon: '⌕' },
  { id: 'ads',        href: '/dashboard/paid-search',  icon: '◈' },
  { id: 'website',    href: '/dashboard/analytics',    icon: '↗' },
  /* Sociala medier is parked until the platform connections are approved —
     see the note in the page itself. Put the entry back here when it returns:
     { id: 'social', href: '/dashboard/social', icon: '❐' }, */
]

const bottomNav: NavDef[] = [
  /* Ingen genväg till installationsguiden här. Den nås genom registreringen,
     och en kund som redan är uppsatt har inget ärende dit — raden fanns bara
     för att slippa skriva adressen under bygget. */
  { id: 'connections', href: '/dashboard/connections', icon: '⟳' },
  { id: 'settings',    href: '/dashboard/settings',    icon: '⚙' },
  { id: 'support',     href: '/dashboard/support',     icon: '?' },
]

const LABELS: Record<Lang, Record<NavId, { label: string; tooltip: string }>> = {
  sv: {
    actionplan:  { label: 'Åtgärdsplan',        tooltip: 'Dina viktigaste åtgärder rankade efter effekt. Gör dem så förbättras dina rankningar, recensioner och annonser.' },
    home:        { label: 'Hem',                 tooltip: 'Vad som hänt den här veckan och vad du ska göra åt det — din summering och veckans åtgärder på ett ställe.' },
    gbp:         { label: 'Din Google-profil',   tooltip: 'Din företagsprofil på Google — recensioner, inlägg, foton och konkurrenterna runt dig.' },
    seo:         { label: 'Synlighet på Google', tooltip: 'Vilka sökningar folk hittar dig med, hur högt du visas — och var i ditt område du syns på kartan.' },
    ads:         { label: 'Annonser',            tooltip: 'Vad dina Google-annonser kostar, vad de ger tillbaka och vilka sökningar som slösar pengar.' },
    tools:       { label: 'Verktyg',             tooltip: 'ROI-kalkylator och länkbyggare för kampanjspårning.' },
    website:     { label: 'Besök på hemsidan',   tooltip: 'Hur många som besöker din hemsida, varifrån de kommer och vad de gör där.' },
    bokningar:   { label: 'Bokningar',           tooltip: 'Ditt bokningssystem — dagens bokningar, kommande besök och veckans bokade värde.' },
    social:      { label: 'Sociala medier',      tooltip: 'Koppla Instagram, TikTok och Pinterest — hur ofta du postar och vad inläggen ger, samlat på ett ställe.' },
    sms:         { label: 'Kommande',            tooltip: 'Bokningar som ännu inte är färdiga, och de utskick som ligger i kön till dem. Här stoppar du ett enskilt meddelande till en enskild kund.' },
    webbplats:   { label: 'Hemsida',             tooltip: 'Redigera din hemsida — logga, texter, tjänster, bilder och innehåll.' },
    connections: { label: 'Kopplingar',          tooltip: 'Koppla ditt Google-konto så vi kan hämta dina riktiga recensioner, rankningar, annonser och besöksdata.' },
    settings:    { label: 'Inställningar',       tooltip: 'Uppdatera företagsuppgifter, plats och kontoinställningar.' },
    support:     { label: 'Hjälp',               tooltip: 'Guider som förklarar varje sida — vad siffrorna betyder och hur du använder dem.' },
    setup:       { label: 'Onboarding',          tooltip: 'Genväg under bygget: uppsättningsflödet nya kunder möts av. Syns inte för kunder — de kommer hit via registreringen.' },
  },
  en: {
    actionplan:  { label: 'Action Plan',         tooltip: 'Your personalised list of actions ranked by impact. Work through these and your rankings, reviews, and ad performance will improve.' },
    home:        { label: 'Home',                tooltip: 'What changed this week and what to do about it — your summary and weekly actions in one place.' },
    gbp:         { label: 'Your Google profile', tooltip: 'Your business profile on Google — reviews, posts, photos, and the competitors around you.' },
    seo:         { label: 'Google visibility',   tooltip: 'Which searches people find you with, how high you appear — and where on the map you show up in your area.' },
    ads:         { label: 'Ads',                 tooltip: 'What your Google ads cost, what they bring back, and which searches waste money.' },
    tools:       { label: 'Tools',               tooltip: 'ROI calculator and UTM link builder for campaign tracking.' },
    website:     { label: 'Website visitors',    tooltip: 'How many people visit your website, where they come from, and what they do there.' },
    bokningar:   { label: 'Bookings',            tooltip: 'Your booking system — today\'s appointments, upcoming visits, and this week\'s booked value.' },
    social:      { label: 'Social media',        tooltip: 'Connect Instagram, TikTok and Pinterest — how often you post and what the posts bring, in one place.' },
    sms:         { label: 'Upcoming',            tooltip: 'Bookings not yet finished, and the messages queued for them. Stop a single message to a single customer here.' },
    webbplats:   { label: 'Website',             tooltip: 'Edit your website — logo, text, services, images, and content.' },
    connections: { label: 'Connections',         tooltip: 'Link your Google account so we can pull in your real reviews, rankings, ads, and visitor data.' },
    settings:    { label: 'Settings',            tooltip: 'Update your business details, location, and account settings.' },
    support:     { label: 'Help',                tooltip: 'Guides that explain every page — what the numbers mean and how to use them.' },
    setup:       { label: 'Onboarding',          tooltip: 'Build-time shortcut: the setup flow new customers land in. Not shown to customers — they arrive here from signup.' },
  },
}


/* Rubriken över mellangruppen, och etiketten över vyväxeln längst ned. */
const GRUPP: Record<Lang, { marknad: string; exempeldata: string }> = {
  sv: { marknad: 'Marknadsföring', exempeldata: 'Exempeldata' },
  en: { marknad: 'Marketing',      exempeldata: 'Sample data'  },
}

/* Mini progress ring — weekly action completion, shown in the nav */
function MiniRing({ done, total }: { done: number; total: number }) {
  const size = 18, r = 7
  const c      = 2 * Math.PI * r
  const pct    = total > 0 ? Math.min(done / total, 1) : 0
  const offset = c * (1 - pct)
  const full   = pct >= 1
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="2.5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={full ? '#4ade80' : '#f0b429'} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {full && (
        <text x="50%" y="66%" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="700">✓</text>
      )}
    </svg>
  )
}

/* Reads the weekly progress written by the Home page and stays in sync */
function useActionPlanProgress(): { done: number; total: number } | null {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('kiterank_ap_progress')
      if (raw) setProgress(JSON.parse(raw))
    } catch { /* ignore */ }
    const onUpdate = (e: Event) => setProgress((e as CustomEvent).detail)
    window.addEventListener('kiterank-ap-progress', onUpdate)
    return () => window.removeEventListener('kiterank-ap-progress', onUpdate)
  }, [])
  return progress
}

function NavItem({
  href, icon, label, tooltip, active, badge, progress,
}: {
  href: string
  icon: string
  label: string
  tooltip: string
  active: boolean
  badge?: number
  progress?: { done: number; total: number } | null
}) {
  const { enabled } = useTooltips()
  const [show, setShow] = useState(false)
  const [pos,  setPos]  = useState({ x: 0, y: 0 })
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const posRef          = useRef({ x: 0, y: 0 })

  function onEnter(e: React.MouseEvent) {
    if (!enabled) return
    posRef.current = { x: e.clientX, y: e.clientY }
    timerRef.current = setTimeout(() => {
      setPos({ ...posRef.current })
      setShow(true)
    }, 2000)
  }
  function onMove(e: React.MouseEvent) {
    posRef.current = { x: e.clientX, y: e.clientY }
  }
  function onLeave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setShow(false)
  }

  return (
    <div onMouseEnter={onEnter} onMouseMove={onMove} onMouseLeave={onLeave}>
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-mustard/15 text-mustard font-medium'
            : 'text-slate-400 hover:text-white hover:bg-navy-700'
        }`}
      >
        <span className="text-base w-4 text-center">{icon}</span>
        <span className="flex-1">{label}</span>
        {progress && <MiniRing done={progress.done} total={progress.total} />}
        {badge !== undefined && badge > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
            {badge}
          </span>
        )}
      </Link>
      {show && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: pos.x + 14, top: pos.y + 14 }}
        >
          <div className="bg-navy-950 border border-navy-600 rounded-xl px-3 py-2.5 shadow-2xl max-w-[220px]">
            <p className="text-xs text-slate-200 leading-relaxed">{tooltip}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

type ConnectionStatus = 'live' | 'connected' | 'disconnected'

const STATUS_CONFIG: Record<Lang, Record<ConnectionStatus, { dot: string; label: string; sub: string; href: string }>> = {
  sv: {
    live:         { dot: 'bg-green-400', label: 'Livedata',       sub: 'Google anslutet',        href: '/dashboard/connections' },
    connected:    { dot: 'bg-mustard',   label: 'Exempeldata',    sub: 'Synkar ditt konto…',     href: '/dashboard/connections' },
    disconnected: { dot: 'bg-slate-500', label: 'Ej ansluten',    sub: 'Koppla Google →',        href: '/dashboard/connections' },
  },
  en: {
    live:         { dot: 'bg-green-400', label: 'Live data',      sub: 'Google connected',       href: '/dashboard/connections' },
    connected:    { dot: 'bg-mustard',   label: 'Sample data',    sub: 'Syncing your account…',  href: '/dashboard/connections' },
    disconnected: { dot: 'bg-slate-500', label: 'Not connected',  sub: 'Connect Google →',       href: '/dashboard/connections' },
  },
}

/* Build-time control: how much Google history the customer arrives with.
   Replaced by the real per-source start dates once the daily sync lands. */
function DepthToggle() {
  const { preset, setPreset } = useDataDepth()
  const options: [DepthPreset, string, string][] = [
    ['etablerad', 'Etablerad', 'Kund sedan flera år — all historik finns'],
    ['nykund',    'Ny kund',   'Nyss påskriven: profil och sök har historik, hemsidemätning nyinstallerad'],
    ['nystartad', 'Nystartad', 'Ny salong eller ny hemsida — nästan ingen historik'],
  ]
  return (
    <div className="flex gap-1.5 mt-1.5">
      {options.map(([id, label, tip]) => (
        <button
          key={id}
          onClick={() => setPreset(id)}
          title={tip}
          className={`flex-1 py-1 text-xs rounded-lg border transition-all ${
            preset === id
              ? 'bg-navy-700 border-navy-600 text-slate-300'
              : 'bg-transparent border-navy-800 text-slate-600 hover:text-slate-500 hover:border-navy-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Sidebar({ companyName, reviewBadge = 0, connectionStatus = 'disconnected', role = 'admin', isPlatformAdmin = false, vy = 'kund' }: {
  companyName: string
  reviewBadge?: number
  connectionStatus?: ConnectionStatus
  /** An account the salon created reaches the calendar and nothing else. */
  role?: 'admin' | 'schema' | 'staff'
  /** Den som driver plattformen, inte salongen. Avgörs på servern — det här
   *  är bara om länken ska ritas, aldrig om adressen släpper in. */
  isPlatformAdmin?: boolean
  /** Exempeldataläget, för växeln bredvid Admin. */
  vy?: Vy
}) {
  const pathname = usePathname()
  /* Panelen får skärmen för sig själv — se kommentaren vid sidomenyn nedan. */
  const påPanelen = pathname.startsWith('/dashboard/webbplats')
  const { plan, setPlan } = usePlan()
  const { lang } = useLang()
  const apProgress = useActionPlanProgress()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer whenever navigation happens
  useEffect(() => { setOpen(false) }, [pathname])

  // Both remaining modes use the merged, simplified structure
  const L      = LABELS[lang]
  const status = STATUS_CONFIG[lang][connectionStatus]

  /* A stylist or a receptionist was given a calendar, not a marketing suite.
   * The gate below is a courtesy — the routes behind each page refuse them
   * on their own, so a typed URL gets nowhere either. */
  const calendarOnly = role !== 'admin'

  /* Bokningar hör till bokningsupplägget. Undantaget för kalenderkonton är
   * inte en generositet utan en spärr: växeln mellan uppläggen är ägarens,
   * och en frisör som råkar logga in medan den står på Lead ska inte mötas av
   * en meny utan sin egen dagbok. */
  const syns = (item: NavDef) => {
    if (calendarOnly) return item.id === 'bokningar'
    if (item.id === 'bokningar' && !hasBooking(plan)) return false
    return true
  }

  const visibleNav  = nav.filter(syns)
  const visibleMark = calendarOnly ? [] : marknadNav

  function resolve(id: NavId): { label: string; tooltip: string } {

    return L[id]
  }

  const content = (
    <>
      <div className="px-5 py-5 border-b border-navy-700">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-lg tracking-tight">Kiterank</span>
        </div>
        <p className="text-slate-400 text-xs mt-0.5 truncate">{companyName}</p>
        {/* Växeln mellan de två uppläggen. Bara för plattformsadmin: den byter
            hur hela kontot presenteras, och en salongsägare som råkar trycka
            på den ser plötsligt sina bokningar heta leads utan att förstå
            varför. Vilket upplägg en kund kör avgörs av vad de svarade i
            registreringen, inte av en knapp i deras egen meny. */}
        {isPlatformAdmin && (
        <div className="flex gap-1.5 mt-3">
          {([
            { id: 'testbok2', label: 'Bokning',   on: 'bg-teal-500/15 border-teal-500/40 text-teal-300'  },
            { id: 'test',     label: 'Lead',      on: 'bg-blue-500/15 border-blue-500/40 text-blue-400'  },
          ] as const).map(({ id, label, on }) => (
            <button
              key={id}
              onClick={() => setPlan(id)}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                plan === id ? on
                  : 'bg-transparent border-navy-700 text-slate-500 hover:text-slate-400 hover:border-navy-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        )}
        {!calendarOnly && <DepthToggle />}
      </div>

      <nav className="px-3 py-4 space-y-0.5 flex-1">
        {visibleNav.map(item => {
          const active = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          const { label, tooltip } = resolve(item.id)
          return (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={label}
              tooltip={tooltip}
              active={active}
              progress={item.id === 'home' ? apProgress : undefined}
            />
          )
        })}

        {/* Rubriken står över gruppen, inte som en klickbar rad. Den är en
            upplysning om vad de fyra nedanför har gemensamt — ett ställe att
            synas på och siffror på hur det gick — så att den som söker sin
            egen hemsida vet att den inte ligger här. */}
        {visibleMark.length > 0 && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {GRUPP[lang].marknad}
            </p>
            {visibleMark.map(item => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={resolve(item.id).label}
                tooltip={resolve(item.id).tooltip}
                active={pathname.startsWith(item.href)}
                badge={item.id === 'gbp' ? reviewBadge : undefined}
              />
            ))}
          </>
        )}
        {/* Kopplingsrutan avslutar marknadsföringsgruppen i stället för att
            ligga längst ned. Den säger vad siffrorna på de fyra sidorna ovanför
            är hämtade ur, och det beskedet hör hemma bredvid sidorna det gäller
            — inte under inställningarna, där det dessutom hamnade granne med
            vyväxeln och de två råkade säga "Exempeldata" om olika saker. */}
        {!calendarOnly && (
          <Link
            href={status.href}
            className="mt-4 flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-navy-800 border border-navy-700 hover:border-navy-600 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot} ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-300 leading-none">{status.label}</p>
              <p className="text-xs text-slate-400 mt-1 leading-none truncate">{status.sub}</p>
            </div>
          </Link>
        )}
      </nav>

      <div className="px-3 pb-2 space-y-0.5 border-t border-navy-700 pt-3">
        {bottomNav.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={L[item.id].label}
            tooltip={L[item.id].tooltip}
            active={pathname.startsWith(item.href)}
          />
        ))}

        {/* Exempeldataläget står som en rad i menyn i stället för intill
            "Logga ut", där det låg tidigare och lästes som en fotnot. Det är
            ett läge man kan bli stående i, och en rad som säger vilket läge
            som är valt är svårare att glömma bort än tre ord i marginalen.
            Fortfarande bara för den som driver plattformen. */}
        {isPlatformAdmin && (
          <div className="px-3 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              {GRUPP[lang].exempeldata}
            </p>
            <VyVaxel vy={vy} />
          </div>
        )}
      </div>

      <div className="px-5 pt-2 pb-5 flex items-center gap-4">
        <form action="/auth/signout" method="post">
          <button className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            {lang === 'sv' ? 'Logga ut' : 'Sign out'}
          </button>
        </form>
        {/* Bara för den som driver plattformen. Ingen kund ser länken, och
            adressen är stängd även för den som gissar sig till den. */}
        {isPlatformAdmin && (
          <a href="/admin" className="text-xs text-amber-500/80 hover:text-amber-400 transition-colors">
            Admin
          </a>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-navy-900 border-b border-navy-700 flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          aria-label={lang === 'sv' ? 'Öppna menyn' : 'Open menu'}
          className="text-slate-200 text-2xl leading-none px-1"
        >
          ☰
        </button>
        <span className="text-white font-bold text-lg tracking-tight">Kiterank</span>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <aside className="w-64 max-w-[85%] bg-navy-900 border-r border-navy-700 flex flex-col h-full overflow-y-auto">
            {content}
          </aside>
          <button
            className="flex-1 bg-black/60"
            aria-label={lang === 'sv' ? 'Stäng menyn' : 'Close menu'}
            onClick={() => setOpen(false)}
          />
        </div>
      )}

      {/* Desktop sidebar.
       *
       * Borta i panelen med flit. Där delar redigeraren och förhandsvisningen
       * på bredden, och 224 pixlar meny är 224 pixlar mindre sajt att titta
       * på — just på den skärm där man behöver se vad man gör. Panelen har en
       * egen väg tillbaka i sitt sidhuvud, så ingen blir instängd. */}
      {!påPanelen && (
        <aside className="hidden md:flex w-56 shrink-0 bg-navy-900 border-r border-navy-700 flex-col h-fit">
          {content}
        </aside>
      )}
    </>
  )
}
