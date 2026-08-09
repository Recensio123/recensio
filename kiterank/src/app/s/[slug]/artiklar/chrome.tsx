import type { PublishedSite } from '../site-data'
import { siteLabel } from '@/lib/siteLabels'

/* The frame both article pages sit in — the same bar as the rest of the site,
   so an article reads as a page of the salon's site rather than a blog bolted
   onto the side of it. */

export const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'

export function isDark(hex: string) {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

export function ArticleNav({ site }: { site: PublishedSite }) {
  const c = site.template.colors
  const { content } = site
  const base    = `/s/${site.slug}`
  const fgSub   = isDark(c.bg) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)'
  // Price list on the booking page? Then the services link goes there too.
  const external = content.pricelistMode === 'booking' && !!content.bookingUrl?.trim()
  const tjanster = external ? content.bookingUrl!.trim() : `${base}/tjanster`

  return (
    <nav style={{ background: c.nav, padding: '0 8%', borderBottom: `1px solid ${divider}` }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 68, gap: 32 }}>
        <a href={base} style={{ color: c.h, fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>
          {content.businessName}
        </a>
        <a href={tjanster} style={{ color: fgSub, fontSize: 14, textDecoration: 'none' }}>{siteLabel(content.labels, 'navServices')}</a>
        <a href={`${base}/artiklar`} style={{ color: fgSub, fontSize: 14, textDecoration: 'none' }}>{siteLabel(content.labels, 'navArticles')}</a>
        <a
          href={content.bookingUrl || base}
          style={{ marginLeft: 'auto', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '9px 22px', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
        >
          {content.ctaText || 'Boka tid'}
        </a>
      </div>
    </nav>
  )
}
