import { siteRootOf, type PublishedSite } from '../site-data'
import { SiteNav, Footer } from '@/components/site/PreviewSite'
import { BACKDROPS, backdropSrc, backdropStyle } from '@/lib/siteBackdrop'
import { SiteStyles } from '@/components/SiteStyles'
import { siteFontVars, SiteFontFace } from '@/components/SiteFont'
import type { CSSProperties } from 'react'

/*
 * The frame every page other than the start page sits in.
 *
 * A site is one site. The start page used to be the only page that got the
 * design's own menu, the design's typography, the surface it stands on, the
 * mobile rules and the footer — everything below it was a plain white room
 * with a different bar on top. This frame hands all of it to every page, from
 * the same source the start page uses, so nothing can drift apart again.
 */

export const F = 'var(--font-brand-sans), system-ui, -apple-system, sans-serif'

export function isDark(hex: string) {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

/** Which page is being shown, as the address the menu links to. */
const currentHref = (base: string, page?: 'pricelist' | 'about' | 'blog' | 'kontakt') =>
  page === 'pricelist' ? `${base}/tjanster`
  : page === 'about'   ? `${base}/om-oss`
  : page === 'blog'    ? `${base}/artiklar`
  : page === 'kontakt' ? `${base}/kontakt`
  : undefined

/* The four designs that stand on a surface rather than on a colour. Away from
   the hero the surface is dimmed further — a page of text has to stay
   readable on it, which the hero's own headline does not have to worry
   about. */
const SURFACE: Record<string, string> = {
  workshop:  BACKDROPS.tra.src,
  sign:      BACKDROPS.tegel.src,
  foyer:     BACKDROPS.linne.src,
}

function pageSurface(site: PublishedSite): CSSProperties {
  const fallback = SURFACE[site.template.layout]
  if (!fallback) return { background: site.template.colors.bg }
  return { ...backdropStyle(backdropSrc(site.content, fallback), 0.82), backgroundAttachment: 'scroll' }
}

export function ArticleNav({ site, current }: {
  site: PublishedSite
  /** Which page the visitor is on, so the menu can say so. */
  current?: 'pricelist' | 'about' | 'blog' | 'kontakt'
}) {
  const base = siteRootOf(site)
  return (
    <SiteNav
      layout={site.template.layout}
      c={site.template.colors}
      content={site.content}
      th={`${base}/tjanster`}
      base={base}
      current={currentHref(base, current)}
    />
  )
}

/** The whole page: surface, typography, menu, content, footer. */
export function SitePage({ site, current, children }: {
  site:      PublishedSite
  current?:  'pricelist' | 'about' | 'blog' | 'kontakt'
  children:  React.ReactNode
}) {
  const base = siteRootOf(site)
  return (
    <div
      className="kr-site"
      lang={site.content.siteLang || 'sv'}
      style={{
        minHeight: '100vh',
        fontFamily: F,
        ...pageSurface(site),
        ...siteFontVars(site.content, site.template.font),
      }}
    >
      <SiteStyles />
      <SiteFontFace content={site.content} />
      <ArticleNav site={site} current={current} />
      {children}
      <Footer c={site.template.colors} content={site.content} base={base} />
    </div>
  )
}
