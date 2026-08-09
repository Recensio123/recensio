'use client'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

// ─── Logo ─────────────────────────────────────────────────────────────────────
// Two layers:
//   1. White "KiteRank" base (always fully visible)
//   2. Mustard "KiteRank" clipped to a diagonal upper region:
//      - left edge:  starts at the bottom of the capital K  (~76% = baseline)
//      - right edge: ends at the top of the lowercase k     (~24% = ascender)
//      - everything above that diagonal = mustard
//      - everything below = white base shows through
function Logo() {
  return (
    <Link href="/" className="shrink-0 select-none">
      <span className="relative inline-block font-bold text-2xl tracking-tight">

        {/* Layer 1 — white base */}
        <span className="text-white">KiteRank</span>

        {/* Layer 2 — mustard upper half, clipped by diagonal polygon
            polygon(top-left, top-right, right-edge@ascender, left-edge@baseline) */}
        <span
          className="absolute inset-0 text-[#f0b429] pointer-events-none"
          style={{ clipPath: 'polygon(0% 76%, 100% 24%, 100% 100%, 0% 100%)' }}
          aria-hidden="true"
        >KiteRank</span>

      </span>
    </Link>
  )
}

const FEATURES_MENU = [
  {
    group: 'Google Presence',
    items: [
      {
        icon:  '✦',
        title: 'Google Business Profile',
        desc:  'Photos, posts, Q&A and GBP health score',
        href:  '/features#gbp',
      },
      {
        icon:  '★',
        title: 'Review Intelligence',
        desc:  'Monitor every review and draft responses instantly',
        href:  '/features#reviews',
      },
      {
        icon:  '◎',
        title: 'Local Pack Rankings',
        desc:  'Your position in Google Maps results per keyword',
        href:  '/features#local-pack',
      },
    ],
  },
  {
    group: 'Traffic & Ads',
    items: [
      {
        icon:  '⌕',
        title: 'SEO & Rankings',
        desc:  'Keywords, positions, and competitor keyword gaps',
        href:  '/features#seo',
      },
      {
        icon:  '◈',
        title: 'Google Ads',
        desc:  'Spend, CPC and wasted budget in plain numbers',
        href:  '/features#ads',
      },
      {
        icon:  '↗',
        title: 'Website Analytics',
        desc:  'GA4 + Search Console in one clean dashboard',
        href:  '/features#analytics',
      },
    ],
  },
  {
    group: 'AI & Social',
    items: [
      {
        icon:  '✺',
        title: 'AI Search Visibility',
        desc:  'ChatGPT, Perplexity, Gemini and AI Overviews',
        href:  '/features#ai',
      },
      {
        icon:  '⬡',
        title: 'Social Media',
        desc:  'Facebook and Instagram performance in one view',
        href:  '/features#social',
      },
      {
        icon:  '✓',
        title: 'Weekly Action Plan',
        desc:  'Three prioritised tasks delivered every Monday',
        href:  '/features#action-plan',
      },
    ],
  },
]

export function Nav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMenuOpen(true)
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 120)
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 bg-[#080f1e]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">

          {/* Features with mega menu */}
          <div
            className="relative"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <button
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors ${
                isActive('/features')
                  ? 'text-white bg-white/8'
                  : 'text-white/55 hover:text-white hover:bg-white/5'
              }`}
            >
              Features
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[660px]"
                onMouseEnter={openMenu}
                onMouseLeave={scheduleClose}
              >
                {/* Arrow */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0d1829] border-l border-t border-white/10 rotate-45" />

                <div className="bg-[#0d1829] border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-6 grid grid-cols-3 gap-2">
                  {FEATURES_MENU.map(group => (
                    <div key={group.group}>
                      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-2">
                        {group.group}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map(item => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                          >
                            <span className="text-base w-5 text-center shrink-0 mt-px">{item.icon}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white/75 group-hover:text-white transition-colors leading-none">
                                {item.title}
                              </p>
                              <p className="text-xs text-white/30 mt-1 leading-snug">{item.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Bottom CTA strip */}
                  <div className="col-span-3 border-t border-white/5 mt-2 pt-4 flex items-center justify-between">
                    <p className="text-xs text-white/30">
                      All features included in your free 7-day trial.
                    </p>
                    <Link
                      href="/auth/login"
                      onClick={() => setMenuOpen(false)}
                      className="text-xs font-semibold text-[#f0b429] hover:text-[#e0a520] transition-colors"
                    >
                      Start free trial →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/pricing"
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isActive('/pricing')
                ? 'text-white bg-white/8'
                : 'text-white/55 hover:text-white hover:bg-white/5'
            }`}
          >
            Pricing
          </Link>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden md:block text-white/50 hover:text-white text-sm transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth/login"
            className="bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Get started free
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-white/50 hover:text-white"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#080f1e]">
          <div className="px-6 py-4 space-y-1">
            <span className="relative inline-block font-bold text-xl tracking-tight py-2">
              <span className="text-white">KiteRank</span>
              <span
                className="absolute inset-0 text-[#f0b429] pointer-events-none"
                style={{ clipPath: 'polygon(0% 76%, 100% 24%, 100% 100%, 0% 100%)' }}
                aria-hidden="true"
              >KiteRank</span>
            </span>
            <Link href="/features" onClick={() => setMobileOpen(false)} className="block py-2 text-white/60 hover:text-white text-sm transition-colors">Features</Link>
            <Link href="/pricing"  onClick={() => setMobileOpen(false)} className="block py-2 text-white/60 hover:text-white text-sm transition-colors">Pricing</Link>
            <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="block py-2 text-white/60 hover:text-white text-sm transition-colors">Log in</Link>
          </div>
        </div>
      )}
    </header>
  )
}
