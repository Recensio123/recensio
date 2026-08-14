'use client'
import Link from 'next/link'
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
  | 'bokningar' | 'sms' | 'ai' | 'citations' | 'webbplats' | 'connections' | 'settings' | 'support' | 'setup'

type NavDef = { id: NavId; href: string; icon: string }

const nav: NavDef[] = [
  { id: 'actionplan', href: '/dashboard/action-plan',  icon: '✓' },
  { id: 'home',       href: '/dashboard',              icon: '▤' },
  { id: 'gbp',        href: '/dashboard/gbp',          icon: '✦' },
  { id: 'seo',        href: '/dashboard/keywords',     icon: '⌕' },
  { id: 'ads',        href: '/dashboard/paid-search',  icon: '◈' },
  { id: 'tools',      href: '/dashboard/tools',        icon: '⊕' },
  { id: 'website',    href: '/dashboard/analytics',    icon: '↗' },
  { id: 'bokningar',  href: '/dashboard/bokningar',    icon: '◻' },
  { id: 'sms',        href: '/dashboard/sms',          icon: '✉' },
  { id: 'ai',         href: '/dashboard/ai-visibility', icon: '✺' },
]

const testingNav: NavDef[] = [
  { id: 'citations', href: '/dashboard/testing/citations', icon: '⊞' },
]

const bottomNav: NavDef[] = [
  { id: 'webbplats',   href: '/dashboard/webbplats',   icon: '✎' },
  // Build-time shortcut only — the real onboarding reaches customers through
  // the signup redirect, never as a menu entry. Delete this line to remove it.
  { id: 'setup',       href: '/dashboard/setup',       icon: '◔' },
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
    website:     { label: 'Hemsida',             tooltip: 'Hur många som besöker din hemsida, varifrån de kommer och vad de gör där.' },
    bokningar:   { label: 'Bokningar',           tooltip: 'Ditt bokningssystem — dagens bokningar, kommande besök och veckans bokade värde.' },
    sms:         { label: 'SMS',                 tooltip: 'Bokningspåminnelser och recensionsförfrågningar via SMS — automatiskt eller per kund, med dina egna mallar.' },
    ai:          { label: 'AI-synlighet',        tooltip: 'Rekommenderas din salong när folk frågar ChatGPT eller Gemini om en salong i ditt område?' },
    citations:   { label: 'Katalogkoll',         tooltip: 'Kollar att namn, adress och telefonnummer stämmer i de stora katalogerna. Fel där sänker din lokala ranking.' },
    webbplats:   { label: 'Webbplats',           tooltip: 'Redigera din webbplats — logga, texter, tjänster, bilder och innehåll.' },
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
    website:     { label: 'Website',             tooltip: 'How many people visit your website, where they come from, and what they do there.' },
    bokningar:   { label: 'Bookings',            tooltip: 'Your booking system — today\'s appointments, upcoming visits, and this week\'s booked value.' },
    sms:         { label: 'SMS',                 tooltip: 'Booking reminders and review requests by SMS — automatic or per customer, with your own templates.' },
    ai:          { label: 'AI visibility',       tooltip: 'Does your salon get recommended when people ask ChatGPT or Gemini for a salon in your area?' },
    citations:   { label: 'Citation health',     tooltip: 'Checks that your name, address, and phone number are consistent across the major directories.' },
    webbplats:   { label: 'Website editor',      tooltip: 'Edit your website — logo, text, services, images, and content.' },
    connections: { label: 'Connections',         tooltip: 'Link your Google account so we can pull in your real reviews, rankings, ads, and visitor data.' },
    settings:    { label: 'Settings',            tooltip: 'Update your business details, location, and account settings.' },
    support:     { label: 'Help',                tooltip: 'Guides that explain every page — what the numbers mean and how to use them.' },
    setup:       { label: 'Onboarding',          tooltip: 'Build-time shortcut: the setup flow new customers land in. Not shown to customers — they arrive here from signup.' },
  },
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

function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex gap-1 bg-navy-800 p-0.5 rounded-lg">
      {([['sv', '🇸🇪'], ['en', '🇬🇧']] as [Lang, string][]).map(([l, flag]) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          title={l === 'sv' ? 'Svenska' : 'English'}
          className={`px-1.5 py-0.5 rounded-md text-sm transition-all ${
            lang === l ? 'bg-navy-600' : 'opacity-40 hover:opacity-80'
          }`}
        >
          {flag}
        </button>
      ))}
    </div>
  )
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

export function Sidebar({ companyName, reviewBadge = 0, connectionStatus = 'disconnected', role = 'admin' }: {
  companyName: string
  reviewBadge?: number
  connectionStatus?: ConnectionStatus
  /** An account the salon created reaches the calendar and nothing else. */
  role?: 'admin' | 'schema' | 'staff'
}) {
  const pathname = usePathname()
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

  const visibleNav = nav.filter(item => {
    // Tools dissolved; Action Plan merged into Home in the simplified plans
    if ((item.id === 'tools' || item.id === 'actionplan')) return false
    // The booking system and its SMS sendouts belong to the testbok track only
    /* The plan switch is the owner's toy. A calendar account keeps its one
     * page whichever mode the switch happens to be left in — otherwise the
     * salon could strand its own staff on an empty menu. */
    if ((item.id === 'sms' || item.id === 'bokningar') && !hasBooking(plan) && !calendarOnly) return false
    if (calendarOnly && item.id !== 'bokningar') return false
    return true
  })

  function resolve(id: NavId): { label: string; tooltip: string } {

    return L[id]
  }

  const content = (
    <>
      <div className="px-5 py-5 border-b border-navy-700">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-lg tracking-tight">Kiterank</span>
          <LangToggle />
        </div>
        <p className="text-slate-400 text-xs mt-0.5 truncate">{companyName}</p>
        {/* Build-time preview switch. Testbok2 is the working copy of the
            booking track — the marketing side is being simplified against
            it, and having both means a change can be looked at beside what
            it replaced instead of remembered. */}
        {!calendarOnly && (
        <div className="flex gap-1.5 mt-3">
          {([
            { id: 'test',     label: 'Test',      on: 'bg-blue-500/15 border-blue-500/40 text-blue-400'       },
            { id: 'testbok',  label: 'Testbok',   on: 'bg-purple-500/15 border-purple-500/40 text-purple-400' },
            { id: 'testbok2', label: 'Testbok2',  on: 'bg-teal-500/15 border-teal-500/40 text-teal-300'       },
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
              badge={item.id === 'gbp' ? reviewBadge : undefined}
              progress={item.id === 'home' ? apProgress : undefined}
            />
          )
        })}

        {/* Testing section — only shown when experiments are active */}
        {testingNav.length > 0 && (
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              {lang === 'sv' ? 'Test' : 'Testing'}
            </p>
            {testingNav.map(item => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={L[item.id].label}
                tooltip={L[item.id].tooltip}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </div>
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
      </div>

      {/* Connection status */}
      <div className="px-3 pb-2">
        <Link
          href={status.href}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-navy-800 border border-navy-700 hover:border-navy-600 transition-colors"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot} ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-300 leading-none">{status.label}</p>
            <p className="text-xs text-slate-400 mt-1 leading-none truncate">{status.sub}</p>
          </div>
        </Link>
      </div>

      <div className="px-5 pt-1 pb-5">
        <form action="/auth/signout" method="post">
          <button className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            {lang === 'sv' ? 'Logga ut' : 'Sign out'}
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-navy-900 border-b border-navy-700 flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          aria-label={lang === 'sv' ? 'Öppna menyn' : 'Open menu'}
          className="text-slate-200 text-2xl leading-none px-1"
        >
          ☰
        </button>
        <span className="text-white font-bold text-lg tracking-tight">Kiterank</span>
        <LangToggle />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
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

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-navy-900 border-r border-navy-700 flex-col h-fit">
        {content}
      </aside>
    </>
  )
}
