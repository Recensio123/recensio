'use client'

/*
 * Kundsidornas mallar.
 *
 * Reglerna alla fjorton delar — vart en boka-knapp leder, hur en tömd text
 * beter sig, vilka delar en mall måste använda i stället för att skriva egna —
 * står i MALLAR.md i den här mappen. Läs den innan du lägger till en mall
 * eller ändrar något som gäller fler än en.
 */

import type { Template, TemplateColors } from '@/lib/templates'
import { Fragment } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { SERVICES, type ServiceCategory } from '@/lib/services-data'
import { publishedArticles, articleSummary, formatArticleDate, type Article } from '@/lib/articles'
import { siteLabel } from '@/lib/siteLabels'
import { CONTENT } from '@/lib/siteExampleContent'
import { BACKDROPS, backdropSrc, backdropStyle, rgbOf, isTexture } from '@/lib/siteBackdrop'
import { visibleReviews } from '@/lib/exampleContent'
import { baseIndustry } from '@/lib/industries'
import { businessNode, type CareAnswer } from '@/lib/siteSchema'
import { socialLinks, type SocialLinks } from '@/lib/siteSocial'
import { SocialIcon } from '@/components/site/SocialIcon'
import {
  FEATURES_DEFAULT, sectionPageEnabled, sitePageLinks,
  SECTION_PAGES, type SectionPageId, type SectionPage as SectionPageConfig,
} from '@/lib/sectionPages'
import { SiteStyles } from '@/components/SiteStyles'
import { siteFontVars, SiteFontFace } from '@/components/SiteFont'

/* ── Example content per industry ───────────────────────────────────────── */

export type ServiceItem = { name: string; desc: string; price: string }

export type SiteContent = {
  businessName:    string
  tagline:         string
  kicker:          string
  heroHeading:     string
  heroBody:        string
  ctaText:         string
  /** Vart menyns boka-knapp leder: bokningen, eller prissidan när salongen
   *  hellre vill att besökaren ser priserna först. Osatt = bokningen. */
  ctaTarget?:      'boka' | 'prislista'
  /** Uträknat, inte sparat: vart sidans boka-knappar faktiskt leder. Sätts en
   *  gång på startsidan. Undersidorna sätter det aldrig, och därför leder
   *  deras knappar alltid till bokningen — utan att någon behöver komma ihåg
   *  det. */
  ctaHref?:        string
  bookingUrl:      string
  services:        ServiceItem[]
  menuCategories:  ServiceCategory[]
  aboutTitle:      string
  aboutBody:       string
  navLinks:        string[]
  phone:           string
  /** Salongens e-post. Frivillig — många vill hellre bli ringda, och en
   *  adress som ingen läser är sämre än ingen adress. */
  email?:          string
  hours:           string
  address:         string
  featured_reviews?: Array<{
    author:   string
    rating:   number
    text:     string
    title?:   string
    company?: string
    source?:  'google' | 'manual' | 'example'
  }>
  /** The surface a backdrop theme stands on. A picture of their own room
   *  beats any texture we can draw, so an upload wins over the library. */
  backdropImage?:    string
  /** Which texture from BACKDROPS, when they have not uploaded one. */
  backdrop?:         string
  gallery_images?:   string[]
  /** One description per gallery image — SEO and accessibility in one. */
  gallery_alts?:     string[]
  logo?:             string
  /* The layouts' own picture slots. Each has its own field so a photo lands
     where it was uploaded — the gallery is the gallery, nothing else. */
  heroImage?:        string
  featureImage?:     string
  aboutImage?:       string
  /* Vad de tre bilderna föreställer. Egna fält eftersom de tidigare lånade
     företagsnamnet respektive Om oss-rubriken — vilket beskriver sidan och
     inte bilden, och därför säger Google ingenting om vad som syns. */
  heroImageAlt?:     string
  featureImageAlt?:  string
  aboutImageAlt?:    string
  /** Search-result overrides. Empty = the auto-generated ones are used. */
  seo?: { title?: string; description?: string }
  /** Where the price list lives: on the site (own pages, one per service) or
   *  on the customer's booking page — then every price-list link goes there. */
  pricelistMode?: 'site' | 'booking'
  /** With the prices on the booking page: how much the start page still
   *  shows. Four services as a taster, or the whole list in text. */
  pricelistPreview?: 'promo' | 'full'
  /** Overrides for the site's own headings and link texts — see siteLabels.
   *  This is what lets a customer run their site in another language. */
  labels?: Record<string, string>
  /** Language of the customer's own text — drives the lang attribute. */
  siteLang?: string
  /** Where the salon already shows its work. For a salon, Instagram is the
   *  portfolio, so leaving it off the site throws away the strongest proof.
   *  Only the profiles that are filled in are ever rendered — see siteSocial. */
  social?: SocialLinks
  /** The customer's real numbers. Empty means nothing is claimed — the
   *  template's example figures never go out on a published site. */
  stats?: { num: string; label: string }[]
  /** The customer's colors on top of the template's — a salon with a brand
   *  color shouldn't have to pick a template by its palette. */
  colorOverrides?: Partial<TemplateColors>
  /** True once the customer picked a text color themselves. Background
   *  changes then stop auto-adjusting the text — a made choice is kept. */
  textColorPicked?: boolean
  /** An uploaded font takes over the whole site's typography. */
  customFont?: { url: string; name: string }
  /** A font picked from the built-in library — see siteFonts. */
  fontPreset?: string
  /** Sections switched on/off in the editor's Funktioner tab. */
  siteFeatures?:     Record<string, boolean>
  /** The order the customer arranged the movable sections in. */
  sectionOrder?:     string[]
  team?:             Array<{ name: string; title: string; image: string }>
  /** The team can be switched off without losing the members or Om oss. */
  galleryCount?:     3 | 6
  blogCount?:        3 | 6
  articles?:         Article[]
  /** Per section: only on the start page, or also an own page with a menu
   *  button, its own name and extra content. See lib/sectionPages. */
  sectionPages?:     Partial<Record<SectionPageId, SectionPageConfig>>
  /** Every picture the customer has uploaded — the editor's "Dina bilder". */
  mediaLibrary?:     string[]
}


/* ── Helpers ────────────────────────────────────────────────────────────── */

/*
 * A line of text that disappears completely when there is none.
 *
 * An empty element still holds its font size, its line height and its margin,
 * so a heading the customer has cleared would leave a gap the exact size of
 * itself. That is not the same as removing it. Every heading and label on the
 * site therefore renders through here: something to read, or nothing at all.
 */
function Txt({ t, as: As = 'p', style, kicker, children }: {
  t?:        string
  as?:       'p' | 'h1' | 'h2' | 'h3' | 'span' | 'div'
  style?:    CSSProperties
  /** Marks the small line above a hero heading, which some backdrops style. */
  kicker?:   boolean
  /** Anything that belongs after the text and should share its fate. */
  children?: ReactNode
}) {
  if (!t?.trim()) return null
  return <As data-kicker={kicker ? '' : undefined} style={style}>{t}{children}</As>
}

function isDark(hex: string): boolean {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return true
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'

/* ── Backdrops ────────────────────────────────────────────────────────────
   Until now every template painted flat colour, which is the single reason
   they all read as the same clean site in different palettes. A real salon
   page is built on a surface — the wall, the floor, the room.

   These are drawn textures, not photographs of somebody else's salon: they
   set a mood without claiming anything about the business, and the customer
   replaces them with a picture of their own room whenever they like. */


/* ── Menus that are not a bar of links ────────────────────────────────────
   A row of links across a photograph competes with the headline underneath
   it. These two shapes get out of the way instead, and they are CSS-only on
   purpose: inside the editor a click on the page belongs to the edit layer,
   so a menu that needed an onClick would never open there. */

const MENU_ID = 'kr-menu-toggle'

/** The button, the panel and nothing else — used by both menus below. */
function MenuOverlay({ c, content, th, base, fg }: {
  c: TemplateColors; content: SiteContent; th: string; base: string; fg: string
}) {
  const panelBg = isDark(c.bg) ? 'rgba(10,10,12,0.97)' : 'rgba(252,252,250,0.97)'
  const panelFg = isDark(c.bg) ? '#ffffff' : '#0a0a0a'
  const socials = socialLinks(content.social)
  return (
    <>
      <label htmlFor={MENU_ID} className="kr-burger-btn" aria-label="Meny"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: fg, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase' as const, fontFamily: F }}>
        <span aria-hidden style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ width: 22, height: 2, background: fg, display: 'block' }} />
          <span style={{ width: 22, height: 2, background: fg, display: 'block' }} />
          <span style={{ width: 22, height: 2, background: fg, display: 'block' }} />
        </span>
        Meny
      </label>
      <div className="kr-menu-panel" style={{ background: panelBg }}>
        <label htmlFor={MENU_ID} aria-label="Stäng" style={{ position: 'absolute', top: 26, right: '7%', cursor: 'pointer', color: panelFg, fontSize: 30, lineHeight: 1, fontFamily: F }}>×</label>
        {menuLinks(content, th, base).map(l => (
          <a key={l.label} href={l.href ?? '#kontakt'} style={{ color: panelFg, fontSize: 26, letterSpacing: 1, fontFamily: F, textDecoration: 'none' }}>{l.label}</a>
        ))}
        <BookButton content={content} style={{ marginTop: 12, background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 36px', fontSize: 14, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' as const, fontFamily: F, textDecoration: 'none' }} />
        {/* On a phone the footer is a long way down. Someone who opened the
            menu to look around is exactly who wants the profiles. */}
        {socials.length > 0 && (
          <div style={{ marginTop: 22, display: 'flex', gap: 18, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
            {socials.map(s => (
              <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name}
                style={{ color: panelFg, opacity: 0.7, textDecoration: 'none' }}>
                <SocialIcon kind={s.key} size={22} />
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Namnet eller loggan i toppen — och vägen tillbaka till startsidan.
 *
 * Att klicka på namnet är det första en besökare provar när de vill hem, och
 * det gäller varenda sajt de besökt innan din. Alla fjorton menyer ritar sitt
 * namn olika, men de ritar det härifrån, så ingen mall kan glömma länken.
 *
 * Utan känd startsida blir det en vanlig text i stället för en död länk.
 */
function Wordmark({ content, base, style, logoStyle }: {
  content: SiteContent
  base?: string
  style: CSSProperties
  /** Loggans mått skiljer sig mellan menyerna — därför skickas de in. */
  logoStyle: CSSProperties
}) {
  const inner = content.logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={content.logo} alt={content.businessName} style={logoStyle} />
    : content.businessName
  const hem = siteBaseFrom(base ?? '')
  if (!hem) return <span style={style}>{inner}</span>
  return (
    <a href={hem} style={{ ...style, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
      {inner}
    </a>
  )
}

/** Wordmark on one side, a menu button on the other, floating on the page
 *  with no bar of its own. */
function BurgerNav({ c, content, th, base, over }: {
  c: TemplateColors; content: SiteContent; th: string; base: string
  /** True when the nav sits on a photo — then everything is white. */
  over?: boolean
}) {
  const fg = over ? '#ffffff' : isDark(c.nav) ? '#ffffff' : c.h
  return (
    <nav data-edit="design" aria-label="Navigering" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 7%', background: over ? 'transparent' : c.nav, position: 'relative', zIndex: 3 }}>
      <input type="checkbox" id={MENU_ID} className="kr-burger" aria-hidden />
      <Wordmark content={content} base={base}
        style={{ fontSize: 19, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, color: fg, fontFamily: F }}
        logoStyle={{ height: 28, display: 'block' }} />
      <MenuOverlay c={c} content={content} th={th} base={base} fg={fg} />
    </nav>
  )
}

/** Two decks: the wordmark centred on its own band, then a row of the three
 *  things a local visitor reaches for — menu, phone, directions. */
function StackedNav({ c, content, th, base }: {
  c: TemplateColors; content: SiteContent; th: string; base: string
}) {
  const barBg = isDark(c.nav) ? c.nav : c.b
  const fg    = isDark(barBg) ? '#ffffff' : c.h
  const line  = isDark(c.bg) ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'
  const maps  = content.address?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${content.businessName} ${content.address}`)}`
    : undefined
  return (
    <header style={{ position: 'relative', zIndex: 3 }}>
      <div style={{ textAlign: 'center', padding: '22px 7% 16px', background: c.bg }}>
        <Wordmark content={content} base={base}
          style={{ fontSize: 26, fontWeight: 700, letterSpacing: 5, textTransform: 'uppercase' as const, color: c.h, fontFamily: F }}
          logoStyle={{ height: 40, display: 'inline-block' }} />
        <Txt as="p" t={content.tagline} style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' as const, color: c.a, marginTop: 6, fontFamily: F }} />
      </div>
      <nav data-edit="design" aria-label="Navigering" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', background: barBg, borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}`, padding: '14px 7%' }}>
        <input type="checkbox" id={MENU_ID} className="kr-burger" aria-hidden />
        <span style={{ justifySelf: 'start' }}>
          <MenuOverlay c={c} content={content} th={th} base={base} fg={fg} />
        </span>
        <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ justifySelf: 'center', color: fg, fontSize: 15, fontWeight: 700, fontFamily: F, textDecoration: 'none' }}>{content.phone}</a>
        {maps ? (
          <a href={maps} target="_blank" rel="noopener noreferrer" style={{ justifySelf: 'end', color: fg, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' as const, fontFamily: F, textDecoration: 'none' }}>
            {siteLabel(content.labels, 'directions')}
          </a>
        ) : <span />}
      </nav>
    </header>
  )
}

/** A contact strip that rides along the bottom of the screen. Sticky, not
 *  fixed: it stays with the page inside the editor's panel instead of
 *  breaking out over the controls. */
function ContactBar({ c, content }: { c: TemplateColors; content: SiteContent }) {
  const bg = c.a
  const fg = isDark(bg) ? '#ffffff' : '#0a0a0a'
  const maps = content.address?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${content.businessName} ${content.address}`)}`
    : undefined
  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 5, background: bg, padding: '12px 7%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, rowGap: 6, flexWrap: 'wrap' as const }}>
      {maps && (
        <a href={maps} target="_blank" rel="noopener noreferrer" style={{ color: fg, fontSize: 13, fontWeight: 600, fontFamily: F, textDecoration: 'none' }}>
          {content.address}
        </a>
      )}
      <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ color: fg, fontSize: 13, fontWeight: 700, fontFamily: F, textDecoration: 'none' }}>{content.phone}</a>
      <BookButton content={content} style={{ color: fg, fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: F, textDecoration: 'underline' }} />
    </div>
  )
}

/* ── Per-industry config ─────────────────────────────────────────────────── */

/* Branschens ord bor i lib/siteIndustry — den här filen är en klientmodul,
   och serverrenderade undersidor måste nå samma konfiguration. Exporteras
   vidare här så att allt som redan importerar härifrån fortsätter fungera. */
export { CFG_LABEL_NAMES, cfgLabel, getIndConfig, type CfgLabelKey } from '@/lib/siteIndustry'
import { getIndConfig, cfgLabel, type IndConfig } from '@/lib/siteIndustry'

/* ── Shared sub-components ──────────────────────────────────────────────── */

function NavLink({ label, href, fg, size = 14, on, accent }: {
  label: string; href?: string; fg: string; size?: number
  /** True when this is the page being shown. */
  on?: boolean
  accent?: string
}) {
  /* The page you are on is named in the bar. Without it a visitor three pages
     into a site has nothing up here telling them where they landed. */
  const mark = on && accent
    ? { fontWeight: 700, borderBottom: `2px solid ${accent}`, paddingBottom: 3 }
    : {}
  if (href) return (
    <a href={href} style={{ color: fg, fontSize: size, fontFamily: F, textDecoration: 'none', ...mark }}>{label}</a>
  )
  return <span style={{ color: fg, fontSize: size, cursor: 'pointer', fontFamily: F, ...mark }}>{label}</span>
}

/** The whole top menu.
 *
 *  A published site builds its own: one button per page the customer has
 *  switched on, named by that page, plus Kontakt. Nothing to type and nothing
 *  that can point at the wrong place — the menu cannot fall out of step with
 *  the site because it IS the site. Renaming a page renames its button.
 *
 *  Template demos have no pages to point at, so they keep the example words
 *  from the industry content and the anchor matching below. */
export function menuLinks(content: SiteContent, tjansterHref?: string, base?: string): { label: string; href?: string }[] {
  const siteRoot = base && siteBaseFrom(base).startsWith('/s/') ? siteBaseFrom(base) : undefined

  if (siteRoot) {
    /* A cleared name removes the button. A menu entry with no words is a
       clickable blank, which is worse than one button fewer. */
    /* Kontakt is a page of its own, like the others — that is where the map
       is, and where a "{salongen} adress" search should land. */
    return sitePageLinks(content, siteRoot)
      .map(p => ({ label: p.label, href: p.href }))
      .filter(l => !!l.label?.trim())
  }

  function anchorHref(label: string, i: number): string | undefined {
    const l = label.toLowerCase()
    if (i === 0) return tjansterHref
    // Contact & about
    if (l.includes('kontakt')) return '#kontakt'
    if (l.includes('om oss') || l === 'om') return '#om-oss'
    // Booking
    if (l.includes('boka')) return content.bookingUrl || '#kontakt'
    // Services / prices page
    if (l.includes('pris') || l.includes('lista') || l.includes('behandl') ||
        l.includes('träning') || l.includes('schema') || l.includes('meny') ||
        l.includes('tjänst') || l.includes('service')) return tjansterHref
    // Portfolio / case / project → about section (closest match on single-page site)
    if (l.includes('case') || l.includes('projekt') || l.includes('portfolio') ||
        l.includes('referenser')) return '#om-oss'
    // Gift cards → contact
    if (l.includes('present') || l.includes('kort')) return '#kontakt'
    return '#kontakt'
  }

  /* Every layout renders its own booking button, and a published menu never
     contains one — so the example words must not either, or the demo shows a
     "Boka tid" link sitting next to the button that does the same thing. */
  return content.navLinks
    .filter(label => !label.toLowerCase().includes('boka'))
    .map((label, i) => ({ label, href: anchorHref(label, i) }))
}

function Nav({
  c, content, centered, minimal, tjansterHref, base,
}: { c: TemplateColors; content: SiteContent; centered?: boolean; minimal?: boolean; tjansterHref?: string; base?: string }) {
  const btnBg   = c.a
  const btnFg   = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const navBg   = c.nav
  const fg      = isDark(navBg) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'
  const links   = menuLinks(content, tjansterHref, base)

  if (centered) {
    return (
      <nav data-edit="design" aria-label="Navigering" style={{ background: navBg, padding: '0 8%', borderBottom: `1px solid ${isDark(navBg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, gap: 40 }}>
          {links.slice(0, 2).map(l => (
            <NavLink key={l.label} label={l.label} href={l.href} fg={fg} />
          ))}
          <Wordmark content={content} base={base}
            style={{ fontSize: 20, fontWeight: 800, color: isDark(navBg) ? '#ffffff' : c.h, fontFamily: F, letterSpacing: -0.5 }}
            logoStyle={{ height: 30, display: 'inline-block', verticalAlign: 'middle' }} />
          {links.slice(2).map(l => (
            <NavLink key={l.label} label={l.label} href={l.href} fg={fg} />
          ))}
        </div>
        <BookButton content={content} style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', background: btnBg, color: btnFg, padding: '9px 22px', borderRadius: 6, fontSize: 13, fontWeight: 700, fontFamily: F, textDecoration: 'none' }} />
      </nav>
    )
  }

  if (minimal) {
    return (
      <nav data-edit="design" aria-label="Navigering" style={{ background: navBg, padding: '0 10%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark content={content} base={base}
          style={{ fontSize: 20, fontWeight: 800, color: isDark(navBg) ? '#ffffff' : c.h, fontFamily: F, letterSpacing: -0.5 }}
          logoStyle={{ height: 30, display: 'inline-block', verticalAlign: 'middle' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {links.map(l => (
            <NavLink key={l.label} label={l.label} href={l.href} fg={fg} size={13} />
          ))}
          <BookButton content={content} style={{ background: btnBg, color: btnFg, padding: '8px 20px', borderRadius: 5, fontSize: 13, fontWeight: 700, fontFamily: F, textDecoration: 'none' }} />
        </div>
      </nav>
    )
  }

  return (
    <nav data-edit="design" aria-label="Navigering" style={{ background: navBg, padding: '0 8%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, borderBottom: `1px solid ${isDark(navBg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
      <Wordmark content={content} base={base}
        style={{ fontSize: 20, fontWeight: 800, color: isDark(navBg) ? '#ffffff' : c.h, fontFamily: F, letterSpacing: -0.5 }}
        logoStyle={{ height: 30, display: 'inline-block', verticalAlign: 'middle' }} />
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {links.map(l => (
          <NavLink key={l.label} label={l.label} href={l.href} fg={fg} />
        ))}
        <BookButton content={content} style={{ background: btnBg, color: btnFg, padding: '10px 24px', borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none' }} />
      </div>
    </nav>
  )
}

/* ── The menus that used to live inside one layout each ──────────────────────
 *
 * Five designs wrote their own bar in the middle of their own composition, so
 * nothing else could reach it — which is why every page other than the start
 * page had to draw a plainer one of its own and the menu changed appearance
 * the moment a visitor clicked anything.
 *
 * They are components now, same as the other nine, and SiteNav below picks the
 * right one per layout. Three of them float over the hero photograph rather
 * than sitting in a bar; away from that photograph there is nothing to float
 * over, so `over` tells them which they are and they take the design's own
 * nav colour when they are not on a picture.
 */

type SiteNavProps = {
  c:        TemplateColors
  content:  SiteContent
  th?:      string
  base?:    string
  /** True when the bar sits on the hero photograph. */
  over?:    boolean
  /** The page being shown, as its own address — that link is marked. */
  current?: string
}

/** Wordmark left, links right, in a bar of its own. */
function EditorialNav({ c, content, th, base, current }: SiteNavProps) {
  const fg = isDark(c.nav) ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
  return (
    <nav data-edit="design" aria-label="Navigering" style={{ background: c.nav, padding: '0 10%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Wordmark content={content} base={base}
        style={{ fontSize: 20, fontWeight: 800, color: isDark(c.nav) ? '#ffffff' : c.h, fontFamily: F, letterSpacing: -0.5 }}
        logoStyle={{ height: 28, display: 'block' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {menuLinks(content, th, base).map(l => (
          <NavLink key={l.label} label={l.label} href={l.href} fg={fg} size={13} on={!!current && l.href === current} accent={c.a} />
        ))}
      </div>
    </nav>
  )
}

/** The name centred with links either side, a thin accent rule below. */
function LuxuryNav({ c, content, th, base, current }: SiteNavProps) {
  const fg    = isDark(c.nav) ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const links = menuLinks(content, th, base)
  const small = (l: { label: string; href?: string }) => (
    <NavLink key={l.label} label={l.label} href={l.href} fg={fg} size={11} on={!!current && l.href === current} accent={c.a} />
  )
  return (
    <nav data-edit="design" aria-label="Navigering" style={{ background: c.nav, padding: '0 8%', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, gap: 48, letterSpacing: 2.5, textTransform: 'uppercase' as const }}>
        {links.slice(0, 2).map(small)}
        <Wordmark content={content} base={base}
          style={{ fontSize: 18, fontWeight: 600, color: isDark(c.nav) ? '#ffffff' : c.h, fontFamily: F, letterSpacing: 1, textTransform: 'uppercase' as const, margin: '0 16px' }}
          logoStyle={{ height: 26, display: 'block' }} />
        {links.slice(2).map(small)}
      </div>
      {/* Filled, not outlined: on a phone the outline read as one more line
          of thin type, and this is the only action visible before scrolling. */}
      <BookButton content={content} style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', background: c.a, color: isDark(c.a) ? '#ffffff' : '#0a0a0a', padding: '9px 26px', fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, fontFamily: F, textDecoration: 'none' }} />
      <div style={{ height: 1, background: c.a, opacity: 0.4 }} />
    </nav>
  )
}

/** Wordmark left, booking button right — the bar the mosaic hero wears. */
function OverlayNav({ c, content, th, base, over, current }: SiteNavProps) {
  const fg   = over ? '#ffffff' : isDark(c.nav) ? '#ffffff' : c.h
  const link = over ? 'rgba(255,255,255,0.8)' : isDark(c.nav) ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
  return (
    <nav data-edit="design" aria-label="Navigering" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' as const, padding: '18px 5%', background: over ? 'transparent' : c.nav }}>
      <Wordmark content={content} base={base}
        style={{ fontSize: 18, fontWeight: 800, color: fg, fontFamily: F, letterSpacing: 0.5 }}
        logoStyle={{ height: 30, display: 'inline-block', verticalAlign: 'middle' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' as const }}>
        {/* On the start page the links live in the hero below; away from it
            this bar is the only menu there is, so it carries them. */}
        {!over && menuLinks(content, th, base).map(l => (
          <NavLink key={l.label} label={l.label} href={l.href} fg={link} size={13} on={!!current && l.href === current} accent={c.a} />
        ))}
        <BookButton content={content} style={{ background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '9px 22px', borderRadius: 6, fontSize: 13, fontWeight: 700, fontFamily: F, textDecoration: 'none' }} />
      </div>
    </nav>
  )
}

/** Links straight on the wall, centred, no bar behind them. */
function WallNav({ c, content, th, base, over, current }: SiteNavProps) {
  const fg = over ? '#ffffff' : isDark(c.nav) ? '#ffffff' : c.h
  return (
    <nav data-edit="design" aria-label="Navigering" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '26px 6%', background: over ? 'transparent' : c.nav }}>
      {/* Namnet över väggen. Utan det har en besökare på en undersida ingen
          väg tillbaka till startsidan — menyn listar sidorna, inte hemmet. */}
      <Wordmark content={content} base={base}
        style={{ fontSize: 20, fontWeight: 800, letterSpacing: 5, textTransform: 'uppercase' as const, color: fg, fontFamily: F, textShadow: over ? '0 2px 10px rgba(0,0,0,0.6)' : 'none' }}
        logoStyle={{ height: 30, display: 'block' }} />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 34, rowGap: 10, flexWrap: 'wrap' as const }}>
        {menuLinks(content, th, base).map(l => (
          <a key={l.label} href={l.href ?? '#kontakt'} style={{
            color: fg, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase' as const, fontFamily: F, textDecoration: 'none',
            textShadow: over ? '0 2px 10px rgba(0,0,0,0.6)' : 'none',
            ...(current && l.href === current ? { fontWeight: 700, borderBottom: `2px solid ${c.a}`, paddingBottom: 3 } : {}),
          }}>
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  )
}


/*
 * The menu a design wears, wherever it is rendered.
 *
 * One lookup, so a page never has to know how a design dresses its top — it
 * asks for the menu and gets the right one. The start page passes over={true}
 * where the layout floats its bar on the hero photograph; every other page
 * passes nothing and gets the same menu in the design's own colours.
 */
export function SiteNav({ layout, ...rest }: SiteNavProps & { layout: string }) {
  switch (layout) {
    case 'editorial':  return <EditorialNav  {...rest} />
    case 'luxury':     return <LuxuryNav     {...rest} />
    case 'showcase':   return <OverlayNav    {...rest} />
    case 'workshop':   return <WallNav       {...rest} />
    case 'sign':       return <BurgerNav c={rest.c} content={rest.content} th={rest.th ?? ''} base={rest.base ?? ''} over={rest.over} />
    case 'foyer':      return <StackedNav c={rest.c} content={rest.content} th={rest.th ?? ''} base={rest.base ?? ''} />
    case 'heritage':   return <Nav {...rest} centered tjansterHref={rest.th} />
    case 'direct':
    case 'team':
    case 'pole':
    case 'grid':       return <Nav {...rest} minimal tjansterHref={rest.th} />
    default:           return <Nav {...rest} tjansterHref={rest.th} />
  }
}

/*
 * Booking, as one rule for every design.
 *
 * Where the button leads, when it appears at all, and how it is marked are
 * the same in all fourteen layouts — only how it looks belongs to the design,
 * and that arrives as `style`. Twenty-four hand-written copies of this anchor
 * drifted into two different fallbacks, one of which led nowhere; a change to
 * the rule now happens once.
 */

/** Where a booking button leads.
 *
 *  A published site always has an address: publishing fills the field with the
 *  salon's own booking page when they have not pasted one of their own. A
 *  template demo has nothing to book, so the button goes to the facts at the
 *  foot of the page rather than nowhere. */
/**
 * Vart varje "Boka din tid" leder — uträknat en gång, innan någon mall ser det.
 *
 * En salong som vill att besökaren ser vad saker kostar innan de bokar pekar
 * knapparna på prissidan; en som vill ha så få steg som möjligt till en bokad
 * tid pekar dem på bokningen. Båda är rimliga, och det är salongens beslut.
 *
 * Regeln gäller alla knappar med de orden. Ett urval av dem — den översta, den
 * i stora rubriken — var en skillnad besökaren inte kan se och kunden inte kan
 * förutse: samma ord på två knappar som gör olika saker.
 *
 * `prislista` utelämnas där ett sådant mål vore ett självklick: på prissidan
 * själv, och när salongen inte har någon prissida.
 */
/*
 * Tom sträng betyder att knappen inte har någonstans att gå.
 *
 * Den föll tidigare tillbaka på "#kontakt" — ett hopp till kontaktrutan längre
 * ned. Det ser ut som att knappen fungerar, och den som klickar på "Boka tid"
 * och landar på en adressrad tror att sidan är trasig. Ett hopp är inte en
 * bokning, och en fallback som döljer att något saknas gör att ingen åtgärdar
 * det.
 */
export function ctaHrefFor(content: SiteContent, prislista?: string): string {
  const boka = content.bookingUrl?.trim() ?? ''
  /* Ingen prissida: knappen går till bokningen i stället. Det är samma sak
     besökaren ville — se vad det kostar och boka — ett steg längre fram. */
  if (content.ctaTarget !== 'prislista') return boka
  return prislista?.trim() || boka
}

export function bookingHref(content: SiteContent): string {
  return content.ctaHref?.trim() || content.bookingUrl?.trim() || ''
}

/** The button itself. Renders nothing when the customer has cleared its
 *  words — a button with no label is a defect, not a minimal design. */
export function BookButton({ content, style, as: As = 'a', label: own, children }: {
  content:   SiteContent
  style:     CSSProperties
  /** Inside another link, the button has to be a span rather than an anchor. */
  as?:       'a' | 'span'
  /** A page that books one named treatment says so instead. */
  label?:    string
  /** An arrow or the like after the words. */
  children?: ReactNode
}) {
  const label = own?.trim() || content.ctaText?.trim()
  if (!label) return null
  if (As === 'span') return <span data-cta style={style}>{label}{children}</span>

  /*
   * Utan mål ritas knappen som en död knapp, inte som en länk.
   *
   * Alternativen var att dölja den — men då försvinner sidans tydligaste
   * uppmaning utan att någon förstår varför — eller att låta den peka någonstans
   * på måfå. En knapp som syns men inte går att trycka på är det ärligaste av
   * de tre: besökaren ser vad sidan vill, och salongen ser i panelen vad som
   * fattas.
   */
  const till = bookingHref(content)
  if (!till) {
    return (
      <span data-cta aria-disabled="true" style={{ ...style, opacity: 0.45, cursor: 'not-allowed' }}>
        {label}{children}
      </span>
    )
  }

  return (
    <a href={till} data-cta style={style}>{label}{children}</a>
  )
}

function ServiceCards({ c, content, cols = 3, tjansterHref }: { c: TemplateColors; content: SiteContent; cols?: number; tjansterHref?: string }) {
  const cardBg   = c.b
  const cardSep  = isDark(cardBg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  return (
    <div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24 }}>
      {content.services.map(s => (
        <div key={s.name} style={{ background: cardBg, padding: '32px 28px', borderRadius: 12, border: `1px solid ${cardSep}` }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: c.h, marginBottom: 10, fontFamily: F }}>{s.name}</h3>
          <p style={{ fontSize: 14, color: c.s, lineHeight: 1.65, marginBottom: 20, fontFamily: F }}>{s.desc}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: c.a, fontFamily: F }}>{s.price}</p>
        </div>
      ))}
    </div>
    {tjansterHref && (
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <a href={tjansterHref} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>
          Se alla tjänster →
        </a>
      </div>
    )}
    </div>
  )
}

function ImagePlaceholder({ c, height = 380, radius = 16, src, alt = '' }: { c: TemplateColors; height?: number; radius?: number; src?: string; alt?: string }) {
  if (src) return (
    <div style={{ borderRadius: radius, height, overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
  return (
    <div style={{ background: c.b, borderRadius: radius, height, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '35%', left: '30%', width: 180, height: 180, borderRadius: '50%', background: c.a, opacity: 0.12 }} />
      <div style={{ position: 'absolute', bottom: 40, right: 30, width: 100, height: 100, borderRadius: '50%', background: c.a, opacity: 0.08 }} />
    </div>
  )
}

/* ── Sections composed in the editor ────────────────────────────────────────
   Everything the customer arranges under Funktioner — which sections show and
   in what order — rendered here exactly as arranged. Same defaults as the
   editor, so an untouched site looks the same in both places. */

/* The whole page is movable except the footer. Every layout expresses its
   fixed compositions as three named blocks — hero, services, about — and the
   shared sections (reviews, gallery, blog) fill the remaining ids. */
export const PAGE_SECTIONS = ['hero', 'services', 'pricelist', 'about', 'reviews', 'gallery', 'blog']
export { FEATURES_DEFAULT }

/** Merge a saved order into the default: only the ids the customer has
 *  actually ordered swap places among the slots they occupy — older saves
 *  that only knew three movable sections keep working untouched. */
/* Delar som alltid ligger där de ligger. Stora rubriken är det första en
   besökare ser och det finns ingen ordning där den hör hemma någon annanstans —
   så den är inte flyttbar, och panelen visar ingen ruta för den. Den står kvar i
   PAGE_SECTIONS eftersom det är listan sidan renderas ur; hade den lyfts därifrån
   hade rubriken försvunnit från varje sajt. */
export const FIXED_SECTIONS = ['hero']

export function orderedIds(defaults: string[], saved?: string[]): string[] {
  const savedIn = (saved ?? [])
    .filter(id => defaults.includes(id))
    .filter(id => !FIXED_SECTIONS.includes(id))
  if (!savedIn.length) return defaults
  const slots  = defaults.map((id, i) => savedIn.includes(id) ? i : -1).filter(i => i >= 0)
  const result = [...defaults]
  slots.forEach((slot, j) => { result[slot] = savedIn[j] })
  return result
}

/* The team belongs on the about page, not the start page. The start page has
   one job — get a visitor to book — and every section between the prices and
   the booking button costs conversions. Someone who wants to know who works
   here clicks through to Om oss, and there the faces get room to matter.
   (The Team layout is the exception: its whole composition is built around
   the people, which is the reason a customer would choose it.) */

/** The site's own address, with the services path taken off. */
function siteBaseFrom(th: string): string {
  return th.replace(/\/tjanster$/, '')
}

/* The figures on the site. A published site shows only what the customer
   filled in — "5 000+ nöjda kunder" about a salon nobody has counted is a
   claim we have no business making on their behalf. Template demos keep the
   industry examples, because a demo is understood to be an example. */
function statsFor(content: SiteContent, cfg: IndConfig, th: string): { num: string; label: string }[] {
  const own = (content.stats ?? []).filter(s => s.num?.trim() && s.label?.trim())
  if (own.length) return own
  // Only the template demo shows example figures — a live site's price link
  // may point at /s/, the booking page or the on-page list, so test for the
  // demo instead of trying to enumerate every live shape.
  return th.startsWith('/preview/') ? cfg.statsBar : []
}

/* The figures, in every template. Numbers a salon is proud of are one of the
   strongest trust signals a local site has, so the field can't be dead just
   because a design didn't happen to include the row. Renders nothing until
   the customer fills something in. */
function StatsBar({ c, content, cfg, th }: { c: TemplateColors; content: SiteContent; cfg: IndConfig; th: string }) {
  const stats = statsFor(content, cfg, th)
  if (!stats.length) return null
  const bg  = isDark(c.bg) ? c.b : c.b
  const sep = isDark(bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
  return (
    <section style={{ background: bg, padding: '40px 8%' }}>
      <div data-grid="stats" style={{ display: 'flex', justifyContent: 'center', gap: 0, maxWidth: 1000, margin: '0 auto' }}>
        {stats.map((stat, i, arr) => (
          <div key={`${stat.num}-${stat.label}`} style={{ flex: 1, textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${sep}` : 'none', padding: '8px 12px' }}>
            <p style={{ fontSize: 34, fontWeight: 800, color: c.a, lineHeight: 1.1, marginBottom: 6, fontFamily: F }}>{stat.num}</p>
            <p style={{ fontSize: 12, color: c.s, fontFamily: F }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function badgesFor(content: SiteContent, cfg: IndConfig, th: string): string[] {
  const own = (content.stats ?? []).filter(s => s.label?.trim()).map(s => `${s.num} ${s.label}`.trim())
  if (own.length) return own
  // Demo-only, same reasoning as statsFor
  return th.startsWith('/preview/') ? cfg.badges : []
}

/* The articles the customer has written. Nothing is rendered until a real
   article is published — a "Senaste artiklarna" heading over invented posts
   would be the site's first lie to a visitor. */
function ArticlesSection({ c, content, th }: { c: TemplateColors; content: SiteContent; th: string }) {
  const articles = publishedArticles(content.articles).slice(0, content.blogCount ?? 3)
  if (!articles.length) return null

  const base = siteBaseFrom(th)
  const sep  = isDark(c.b) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  return (
    <section style={{ background: c.b, padding: '80px 8%' }}>
      <Txt t={siteLabel(content.labels, 'articlesKicker')} style={{ textAlign: 'center', fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 16, fontFamily: F }} />
      <Txt as="h2" t={siteLabel(content.labels, 'articlesTitle')} style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: c.h, marginBottom: 40, letterSpacing: -0.8, fontFamily: F }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
        {articles.map(a => (
          <a
            key={a.id}
            href={`${base}/artiklar/${a.slug}`}
            style={{ display: 'block', border: `1px solid ${sep}`, borderRadius: 12, overflow: 'hidden', textDecoration: 'none', background: c.bg }}
          >
            {a.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.cover} alt={a.coverAlt || a.title} loading="lazy" style={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'cover', display: 'block' }} />
            )}
            <div style={{ padding: '18px 20px 22px' }}>
              {a.date && (
                <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8, fontFamily: F }}>
                  {formatArticleDate(a.date)}
                </p>
              )}
              <h3 style={{ fontSize: 19, fontWeight: 700, color: c.h, lineHeight: 1.3, marginBottom: 8, fontFamily: F }}>{a.title}</h3>
              <p style={{ fontSize: 14, color: c.s, lineHeight: 1.6, fontFamily: F }}>{articleSummary(a, 120)}</p>
            </div>
          </a>
        ))}
      </div>
      {/* "All articles" only leads somewhere when the own page exists */}
      {(!base.startsWith('/s/') || sectionPageEnabled(content, 'blog')) && siteLabel(content.labels, 'articlesAll') && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href={`${base}/artiklar`} style={{ fontSize: 14, color: c.a, textDecoration: 'underline', fontFamily: F }}>
            {siteLabel(content.labels, 'articlesAll')}
          </a>
        </div>
      )}
    </section>
  )
}

/* The customer's chosen reviews, or on template demos a sample quote so the
   section shows what it is for. A published site with nothing chosen shows
   nothing — invented praise never goes live. */
function ReviewsSection({ c, content, th, industry }: { c: TemplateColors; content: SiteContent; th: string; industry?: string }) {
  /* The six we ship fill the section while the customer edits; a published
     page shows only the salon's own. See visibleReviews in lib/exampleContent. */
  const live  = th.startsWith('/s/')
  const shown = visibleReviews(content.featured_reviews, live)
  if (shown.length) return <ReviewGrid c={c} reviews={shown} labels={content.labels} />
  if (live) return null
  const cfg = getIndConfig(industry)
  return (
    <section style={{ background: c.b, padding: '72px 8%', textAlign: 'center' }}>
      <div style={{ fontSize: 64, color: c.a, lineHeight: 0.8, marginBottom: 32, fontFamily: 'Georgia, serif' }}>&ldquo;</div>
      <p style={{ fontSize: 22, fontStyle: 'italic', color: c.h, maxWidth: 560, margin: '0 auto 24px', lineHeight: 1.6, fontFamily: F }}>
        {cfg.testimonial}
      </p>
      <p style={{ fontSize: 14, color: c.s, fontFamily: F }}>{cfg.testimonialAttrib}</p>
    </section>
  )
}


/* The full price list on the start page — on by default for every site,
   since prices on the page is the single biggest booking factor for a local
   business, but the customer can switch it off like any other section.
   It also steps aside on its own when the price list lives on the
   customer's booking page — two copies would drift apart. */
/* The four services a booking-page customer still shows off.
 *
 * Starred ones first, in the customer's order, then the top of the price list
 * to fill up. Four, because one large card and three under it is the shape
 * that reads as a taster rather than a truncated list. */
/*
 * De fyra tjänsterna startsidan visar.
 *
 * Urvalet är stjärnorna i prislistan, och det avgörande ordet är *urval*: vad
 * som visas hämtas ur prislistan vid rendering, inte ur en kopia. Tidigare var
 * `services` en egen lista med egna namn och priser, sådd ur branschmallen —
 * och eftersom prislistan såddes från ett annat håll matchade inga namn. Ingen
 * stjärna kunde tändas, och startsidan sålde tre behandlingar salongen inte
 * hade. Ändrar de ett pris i listan följer startsidan nu med.
 *
 * Kopian finns kvar för salonger vars priser bor hos bokningstjänsten. Där
 * finns ingen prislista att peka in i, och de fyra redigeras direkt.
 */
/**
 * Hur många tjänster mallens tjänsteruta har plats för på startsidan.
 *
 * Talet hör till kompositionen, inte till kunden: Atelier lyfter en stor med
 * tre under, en mall byggd på ett rutnät kan bära sex. Panelen frågar samma
 * funktion, så stjärnornas tak och raderna under "Detta visas på startsidan"
 * följer mallen kunden valt — regeln skrivs på ett ställe, inte i varje mall.
 *
 * Bygger du en mall som visar ett annat antal: skriv in layoutens namn här.
 * Rör inte siffran i panelen; den finns inte längre.
 */
const PROMO_PLATSER: Record<string, number> = {
  // Alla fjorton mallar visar fyra idag. En avvikelse skrivs som `grid: 6`.
}
export function promoSlots(layout?: string): number {
  return PROMO_PLATSER[layout ?? ''] ?? 4
}

export function promoServices(content: SiteContent, industry?: string, platser = 4): ServiceItem[] {
  const valda = (content.services ?? []).filter(s => s.name?.trim())

  const cats = content.menuCategories?.length
    ? content.menuCategories
    : SERVICES[baseIndustry(industry)] ?? SERVICES.other ?? []
  const menyn: ServiceItem[] = cats.flatMap(cat =>
    cat.items.map(i => ({ name: i.name, desc: i.desc ?? '', price: i.hidePrice ? '' : i.price })))

  if (!menyn.length) return valda.slice(0, platser)

  /* Stjärnmärkta rader, i den ordning salongen satt dem, hämtade ur listan. */
  const nyckel = (n: string) => n.trim().toLowerCase()
  const iMenyn = new Map(menyn.map(s => [nyckel(s.name), s]))
  const stjärnade = valda.map(s => iMenyn.get(nyckel(s.name))).filter((s): s is ServiceItem => !!s)

  /*
   * Har salongen stjärnmärkt något gäller deras val exakt, även om de valt två.
   *
   * Platserna fylldes tidigare alltid upp till fyra ur listan. Det gjorde
   * stjärnan omöjlig att släcka: tog man bort den översta raden kom den
   * tillbaka i samma ögonblick som påfyllning, och panelen visade fyra
   * tjänster med en enda stjärna bredvid sig.
   */
  if (stjärnade.length) return stjärnade.slice(0, platser)

  /* Ingen har valt ännu: de fyra översta ur salongens egen prislista. Bättre
     än tre namn ur en branschmall som de aldrig skrivit. */
  return menyn.slice(0, platser)
}

/* A customer whose prices live on their booking page still needs the start
 * page to sell something. Instead of dropping the price list entirely, the
 * section becomes a shop window: the service they most want booked, three
 * more under it, and every one of them a link straight into the booking
 * flow. The full list stays in one place — theirs — so nothing can drift. */
function PricelistPromo({ c, content, industry, href }: { c: TemplateColors; content: SiteContent; industry?: string; href: string }) {
  const cfg   = getIndConfig(industry)
  const items = promoServices(content, industry)
  if (!items.length) return null
  const [lead, ...rest] = items
  const sep  = isDark(c.b) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const sub  = isDark(c.b) ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'

  return (
    <section id="prislista" style={{ background: c.b, padding: '72px 8%' }}>
      <p data-kicker style={{ textAlign: 'center', fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 40, fontFamily: F }}>
        {cfgLabel(content.labels, cfg.menuLabel, 'menuLabel')}
      </p>

      <div data-split style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 32, maxWidth: 980, margin: '0 auto', alignItems: 'start' }}>
        {/* The one they most want booked */}
        <a href={href} style={{ display: 'block', background: c.bg, border: `1px solid ${sep}`, borderRadius: 14, padding: '30px 32px', textDecoration: 'none' }}>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: c.h, letterSpacing: -0.4, marginBottom: 10, fontFamily: F }}>{lead.name}</h3>
          {lead.desc && <p style={{ fontSize: 14, color: sub, lineHeight: 1.65, marginBottom: 18, fontFamily: F }}>{lead.desc}</p>}
          {lead.price && <p style={{ fontSize: 20, fontWeight: 800, color: c.a, marginBottom: 22, fontFamily: F }}>{lead.price}</p>}
          <BookButton as="span" content={content} style={{ display: 'inline-block', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '11px 26px', borderRadius: 8, fontSize: 14, fontWeight: 700, fontFamily: F }} />
        </a>

        {/* Three more, priced and clickable */}
        <div>
          {rest.map(s => (
            <a
              key={s.name}
              href={href}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, padding: '15px 0', borderBottom: `1px solid ${sep}`, textDecoration: 'none' }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 16, color: c.h, fontWeight: 600, fontFamily: F }}>{s.name}</span>
                {s.desc && <span style={{ display: 'block', fontSize: 12, color: sub, marginTop: 3, fontFamily: F }}>{s.desc}</span>}
              </span>
              {s.price && <span style={{ fontSize: 15, color: c.a, fontWeight: 700, whiteSpace: 'nowrap' as const, fontFamily: F }}>{s.price}</span>}
            </a>
          ))}
          <div style={{ marginTop: 22 }}>
            <a href={href} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>
              {cfgLabel(content.labels, cfg.allLink, 'allLink')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export function PricelistSection({ c, content, th, industry }: { c: TemplateColors; content: SiteContent; th: string; industry?: string }) {
  /* Prices kept on the booking page. The customer still decides how much of
   * them the start page shows: four services as a taster, or the whole list
   * in text. Either way every link leads to the booking page. */
  const external = content.pricelistMode === 'booking' && !!content.bookingUrl?.trim()

  /*
   * Startsidan visar ett urval, inte hela listan — i båda lägena.
   *
   * Det är sidmodellen hela sajten följer: startsidan är smakprovet och den
   * egna sidan är hela versionen. Skillnaden mellan de två valen i panelen är
   * bara vart urvalet leder — till salongens prissida, eller till deras
   * bokningslänk.
   *
   * Hela listan står kvar på startsidan i ett enda fall: när det inte finns
   * någonstans att skicka besökaren. Det kan bara uppstå i data sparad innan
   * valen blev två, och då är en lång startsida bättre än inga priser alls.
   */
  const finnsVidare = external || sectionPageEnabled(content, 'pricelist')
  if (finnsVidare && (content.pricelistPreview ?? 'promo') === 'promo') {
    /* Vart urvalet leder: salongens bokningslänk, eller deras egen prissida
       där besökaren ser hela listan och bokar därifrån. */
    return <PricelistPromo c={c} content={content} industry={industry} href={th} />
  }
  const linkTo = external ? content.bookingUrl!.trim() : th
  const cfg  = getIndConfig(industry)
  const cats = content.menuCategories?.length
    ? content.menuCategories
    : SERVICES[baseIndustry(industry)] ?? SERVICES.other ?? []
  if (!cats.length) return null
  const sep = isDark(c.b) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const sub = isDark(c.b) ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'

  return (
    // The anchor "#prislista" is where price links land when no own page exists
    <section id="prislista" style={{ background: c.b, padding: '72px 8%' }}>
      <p data-kicker style={{ textAlign: 'center', fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 40, fontFamily: F }}>
        {cfgLabel(content.labels, cfg.menuLabel, 'menuLabel')}
      </p>
      <div data-grid="services" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px 64px', maxWidth: 980, margin: '0 auto' }}>
        {cats.map(cat => (
          <div key={cat.category}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: c.h, letterSpacing: 0.5, borderBottom: `2px solid ${c.a}`, paddingBottom: 8, marginBottom: 4, fontFamily: F }}>
              {cat.category}
            </h3>
            {cat.items.map(item => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, padding: '11px 0', borderBottom: `1px solid ${sep}` }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 15, color: c.h, fontWeight: 600, fontFamily: F }}>{item.name}</p>
                  {!item.hideDuration && item.duration && (
                    <p style={{ fontSize: 12, color: sub, marginTop: 2, fontFamily: F }}>{item.duration}</p>
                  )}
                </div>
                {!item.hidePrice && (
                  <p style={{ fontSize: 15, color: c.a, fontWeight: 700, whiteSpace: 'nowrap' as const, fontFamily: F }}>{item.price}</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <a href={linkTo} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>
          {cfgLabel(content.labels, cfg.allLink, 'allLink')}
        </a>
      </div>
    </section>
  )
}

/* Marks a stretch of the page as belonging to a panel section, so a click in
   the editor's preview can open the right one. display:contents means this
   wrapper adds no box and cannot change a single pixel of any layout — it is
   pure labelling, invisible on the published site. */
export function Editable({ id, sec, children }: { id: string; sec?: string; children: ReactNode }) {
  /* data-edit → which panel section a click opens; data-sec → which movable
     page section this is, for the floating move/hide tools in the editor. */
  return <div data-edit={id} data-sec={sec} style={{ display: 'contents' }}>{children}</div>
}

function PageSections({ blocks, c, content, base, industry }: {
  /** The layout's own designed blocks. null = the layout already shows that
   *  content as part of its composition (Showcase's photo hero) — never twice. */
  blocks: Record<string, ReactNode>
  c: TemplateColors; content: SiteContent; base: string; industry?: string
}) {
  const features = { ...FEATURES_DEFAULT, ...(content.siteFeatures ?? {}) }
  const ids      = orderedIds(PAGE_SECTIONS, content.sectionOrder)
  const siteRoot = siteBaseFrom(base)

  /* "Läs mer" under a section that also lives as an own page — the start page
   * shows the section, the link carries visitors (and Google) to the rest.
   * Only published sites have the pages, so demos render no dead links. */
  const readMore = (id: SectionPageId) => {
    if (!siteRoot.startsWith('/s/') || !sectionPageEnabled(content, id)) return null
    if (id === 'pricelist' && content.pricelistMode === 'booking' && content.bookingUrl?.trim()) return null
    // Cleared wording removes the link itself, not just the words in it.
    if (!siteLabel(content.labels, 'readMore')) return null
    return (
      <div style={{ background: c.bg, textAlign: 'center' as const, padding: '0 8% 56px' }}>
        <a
          href={`${siteRoot}/${SECTION_PAGES[id].path}`}
          style={{ color: c.a, fontSize: 14, fontWeight: 600, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 3 }}
        >
          {siteLabel(content.labels, 'readMore')}
        </a>
      </div>
    )
  }

  return (
    <>
      {ids.map(id => {
        // Om oss & teamet is switchable like the other sections, but the block
        // itself belongs to the layout — so the gate sits here, before it
        if (id === 'about' && !features.about) return null
        /* Mallens egen tjänsteruta ÄR prislistan på startsidan. Stänger salongen
           av prislistan är det den som ska bort — inget annat visar priser här. */
        if (id === 'services' && !features.pricelist) return null
        // The panel section a click on this part of the page should open
        const panel = id === 'services' ? 'pricelist' : id === 'blog' ? 'articles' : id
        if (id in blocks) return (
          <Editable key={id} id={panel} sec={id}>
            {blocks[id]}{id === 'about' && readMore('about')}
          </Editable>
        )
        // Photos and reviews live on the start page only — no page of their own
        if (id === 'gallery') return features.gallery ? (
          <Editable key={id} id={panel} sec={id}>
            <GallerySection
              c={c}
              images={content.gallery_images}
              alts={content.gallery_alts}
              businessName={content.businessName}
              count={content.galleryCount ?? 6}
              labels={content.labels}
              social={content.social}
            />
          </Editable>
        ) : null
        if (id === 'blog')      return features.blog    ? <Editable key={id} id={panel} sec={id}><ArticlesSection c={c} content={content} th={base} /></Editable> : null
        if (id === 'reviews')   return features.reviews ? <Editable key={id} id={panel} sec={id}><ReviewsSection c={c} content={content} th={base} industry={industry} /></Editable> : null
        {/* No readMore here: the price list ends with its own "Se prislista"
            link to the very same page, and two links stacked on top of each
            other only make a visitor wonder what the difference is. */}
        /*
         * Prislistan har ingen egen sektion på startsidan.
         *
         * Varje mall ritar sina fyra tjänster på sitt eget sätt — Ateliers bild
         * och stora namn, Grids rutnät, Foyers rader. Ett gemensamt kort under
         * dem hade sagt exakt samma sak en gång till, och vilken av de två som
         * fick synas hade då hängt på en inställning kunden gör. Utseendet är
         * vårt beslut, inte deras: mallen bestämmer, hela listan bor på
         * prissidan eller hos bokningstjänsten.
         */
        if (id === 'pricelist') return null
        return null
      })}
    </>
  )
}

/** Published sites carry a slug in their path; the noindexed template demos
 *  do not, and stay anonymous in the markup. */
function slugFrom(th: string): string | undefined {
  const m = th.match(/^\/s\/([^/]+)/)
  return m ? m[1] : undefined
}

function JsonLD({ content, industry, slug, care, base }: {
  content:   SiteContent
  industry?: string
  slug?:     string
  care?:     CareAnswer | null
  /** The address this page answers on — their own domain when they have one. */
  base?:     string
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(businessNode({ content, industry, slug, care, base })) }}
    />
  )
}

function GallerySection({ c, images, alts, businessName, sectionBg, count = 6, labels, social }: { c: TemplateColors; images?: string[]; alts?: string[]; businessName?: string; sectionBg?: string; count?: 3 | 6; labels?: Record<string, string>; social?: SocialLinks }) {
  const bg      = sectionBg ?? c.b
  const sep     = isDark(bg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const socials = socialLinks(social)
  // The editor stores six slots whether or not they hold anything — an empty
  // slot must never become <img src="">, which makes browsers refetch the page
  const filled = (images ?? []).map((src, i) => ({ src, alt: alts?.[i] })).filter(x => x.src)
  const cells = [c.bg, c.a + '22', c.bg, c.bg, c.a + '18', c.bg]
  return (
    <section style={{ background: bg, padding: '80px 8%' }}>
      <Txt t={siteLabel(labels, 'galleryKicker')} style={{ textAlign: 'center', fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 16, fontFamily: F }} />
      <Txt as="h2" t={siteLabel(labels, 'galleryTitle')} style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: c.h, marginBottom: 40, letterSpacing: -0.8, fontFamily: F }} />
      <div data-grid="gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {filled.length
          ? filled.slice(0, count).map(({ src, alt }, i) => (
              <div key={i} style={{ aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden', border: `1px solid ${sep}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt?.trim() || (businessName ? `${businessName} — bild ${i + 1}` : `Galleri bild ${i + 1}`)} loading={i < 2 ? 'eager' : 'lazy'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))
          : cells.map((bg, i) => (
              <div key={i} style={{
                aspectRatio: '4 / 3',
                background: bg,
                borderRadius: 10,
                border: `1px solid ${sep}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="6" width="20" height="14" rx="2" stroke={c.s} strokeWidth="1.4" strokeOpacity="0.3"/>
                  <path d="M2 9.5h20" stroke={c.s} strokeWidth="1.4" strokeOpacity="0.15"/>
                  <path d="M9 6L10.5 4h3L15 6" stroke={c.s} strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.3"/>
                  <circle cx="12" cy="14" r="3" stroke={c.s} strokeWidth="1.4" strokeOpacity="0.3"/>
                </svg>
              </div>
            ))
        }
      </div>

      {/* Twelve pictures is a gallery; a profile is the rest of the work.
          This is where a visitor who liked what they saw is ready to go look
          at more, so the profiles sit under the grid rather than only in the
          footer. */}
      {socials.length > 0 && (
        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: c.s, fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' as const }}>
          {siteLabel(labels, 'followMore') && <span>{siteLabel(labels, 'followMore')}</span>}
          {socials.map(s => (
            <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name}
              style={{ color: c.a, textDecoration: 'none' }}>
              <SocialIcon kind={s.key} size={20} />
            </a>
          ))}
        </p>
      )}
    </section>
  )
}

function ReviewGrid({ c, reviews, labels }: { c: TemplateColors; reviews: NonNullable<SiteContent['featured_reviews']>; labels?: Record<string, string> }) {
  const bg     = c.b
  const dark   = isDark(bg)
  const fgH    = dark ? '#ffffff' : '#0a0a0a'
  const fgS    = dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const cardBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  const divBdr = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  return (
    <section style={{ background: bg, padding: '72px 8%' }}>
      <Txt t={siteLabel(labels, 'reviewsKicker')} style={{ fontSize: 11, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 12, fontFamily: F }} />
      <Txt as="h2" t={siteLabel(labels, 'reviewsTitle')} style={{ fontSize: 32, fontWeight: 800, color: fgH, marginBottom: 40, letterSpacing: -0.5, fontFamily: F }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ background: cardBg, borderRadius: 12, padding: '28px 24px', display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            <div style={{ color: '#fbbf24', fontSize: 15, letterSpacing: 2 }}>
              {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
            </div>
            <p style={{ fontSize: 15, color: fgS, lineHeight: 1.7, fontFamily: F, flex: 1 }}>{r.text}</p>
            <div style={{ paddingTop: 8, borderTop: `1px solid ${divBdr}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: fgH, fontFamily: F, display: 'block' }}>{r.author}</span>
                {(r.title || r.company) && (
                  <span style={{ fontSize: 11, color: fgS, fontFamily: F }}>
                    {[r.title, r.company].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              {r.source !== 'manual' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" style={{ display: 'block' }}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span style={{ fontSize: 11, color: fgS, fontFamily: F }}>Google</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Footer({ c, content, base }: { c: TemplateColors; content: SiteContent; base?: string }) {
  const footerBg = isDark(c.bg) ? c.b : (isDark(c.nav) ? c.nav : c.b)
  const fg       = isDark(footerBg) ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const fgStrong = isDark(footerBg) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
  const socials  = socialLinks(content.social)

  /* Internal links to the site's own pages — the paths Google follows to
   * find them, and what ties the pages together as one site. Only published
   * sites have the pages, so demos show no dead links. */
  const siteRoot  = base?.startsWith('/s/') ? base.replace(/\/tjanster$/, '') : undefined
  const pageLinks = siteRoot
    ? sitePageLinks(content, siteRoot)
        .map(p => ({ label: p.label, href: p.href }))
        .filter(l => !!l.label?.trim())
    : []

  /*
   * Sidfoten redigeras inte på sidan — `data-panel-only`.
   *
   * Allt i den gäller varje sida, inte platsen den står på: namnet och
   * sloganen är samma som i toppen och hör till Branding, och telefon, adress
   * och öppettider ställs in under Kontakt & öppettider. En skrivruta här hade
   * betytt att samma text går att ändra på två ställen — och att kunden ändrar
   * hela sajten från en ruta som ser ut att gälla just sidfoten.
   *
   * Klicket leder därför till panelen i stället för till en skrivruta.
   */
  return (
    <footer data-edit="contact" data-panel-only id="kontakt" style={{ background: footerBg, padding: '48px 8%', borderTop: `1px solid ${isDark(footerBg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}>
        <div>
          <Txt t={content.businessName} style={{ fontSize: 16, fontWeight: 800, color: fgStrong, marginBottom: 8, fontFamily: F }} />
          <Txt t={content.tagline} style={{ fontSize: 13, color: fg, fontFamily: F }} />
        </div>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <Txt t={siteLabel(content.labels, 'contactTitle')} style={{ fontSize: 11, fontWeight: 700, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontFamily: F }} />
            {content.phone?.trim() && (
              <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ fontSize: 13, color: fg, marginBottom: 6, fontFamily: F, textDecoration: 'none', display: 'block' }}>{content.phone}</a>
            )}
            {/* Frivillig, och därför bara en rad när den finns — en tom rad
                mellan telefon och adress ser ut som ett fel. */}
            {content.email?.trim() && (
              <a href={`mailto:${content.email.trim()}`} style={{ fontSize: 13, color: fg, marginBottom: 6, fontFamily: F, textDecoration: 'none', display: 'block' }}>{content.email.trim()}</a>
            )}
            <Txt t={content.address} style={{ fontSize: 13, color: fg, fontFamily: F }} />
            {/* Directions: on a phone this is the second thing a local
                visitor wants, right after the phone number */}
            {content.address?.trim() && siteLabel(content.labels, 'directions') && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${content.businessName} ${content.address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: c.a, fontFamily: F, textDecoration: 'underline', display: 'inline-block', marginTop: 6 }}
              >
                {siteLabel(content.labels, 'directions')}
              </a>
            )}
          </div>
          {!!content.hours?.trim() && (
            <div>
              <Txt t={siteLabel(content.labels, 'hoursTitle')} style={{ fontSize: 11, fontWeight: 700, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontFamily: F }} />
              <Txt t={content.hours} style={{ fontSize: 13, color: fg, fontFamily: F }} />
            </div>
          )}
          {/* For a salon Instagram is the portfolio — the proof already exists */}
          {socials.length > 0 && (
            <div>
              <Txt t={siteLabel(content.labels, 'followTitle')} style={{ fontSize: 11, fontWeight: 700, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontFamily: F }} />
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const }}>
                {socials.map(s => (
                  <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name}
                    style={{ color: fg, textDecoration: 'none' }}>
                    <SocialIcon kind={s.key} size={20} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${isDark(footerBg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, marginTop: 40, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
        <span style={{ fontSize: 12, color: fg, fontFamily: F }}>© 2025 {content.businessName}</span>
        {pageLinks.length > 0 && (
          <nav aria-label="Sidor" style={{ display: 'flex', gap: 18, flexWrap: 'wrap' as const, background: 'transparent', padding: 0 }}>
            {pageLinks.map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: 12, color: fgStrong, fontFamily: F, textDecoration: 'none' }}>{l.label}</a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  )
}

/* ── Layout: Centered ───────────────────────────────────────────────────── */

function CenteredSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const isResto = industry === 'restaurant'
  const cfg    = getIndConfig(industry)
  const btnBg  = c.a
  const btnFg  = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const sep    = isDark(c.bg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const icons = [
    <svg key="i0" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74Z" stroke={c.a} strokeWidth="1.8" strokeLinejoin="round"/></svg>,
    <svg key="i1" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={c.a} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    <svg key="i2" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v5c0 5 3.5 9.74 8 11 4.5-1.26 8-6 8-11V7l-8-4z" stroke={c.a} strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke={c.a} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  ]

  const heroBlock = (
      <section style={{ background: c.bg, padding: '96px 10% 80px', textAlign: 'center' }}>
        {/* Rating badge — a demo garnish; a real site never claims numbers
            nobody has counted */}
        {!base.startsWith('/s/') && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${sep}`, borderRadius: 100, padding: '6px 16px', marginBottom: 32 }}>
          <span style={{ fontSize: 13 }}>⭐⭐⭐⭐⭐</span>
          <span style={{ fontSize: 12, color: c.a, fontWeight: 600, fontFamily: F }}>4.9 / 5</span>
          <span style={{ fontSize: 12, color: c.s, fontFamily: F }}>·  500+ recensioner</span>
        </div>
        )}
        <h1 style={{ fontSize: 72, fontWeight: 800, color: c.h, lineHeight: 1.05, maxWidth: 760, margin: '0 auto 24px', letterSpacing: -2, fontFamily: F }}>
          {content.heroHeading}
        </h1>
        <p style={{ fontSize: 20, color: c.s, maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7, fontFamily: F }}>
          {content.heroBody}
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <BookButton content={content} style={{ background: btnBg, color: btnFg, padding: '15px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700, fontFamily: F, textDecoration: 'none', display: 'inline-block' }} />
          <a href={th} style={{ background: 'transparent', color: c.h, padding: '15px 32px', borderRadius: 8, fontSize: 15, fontWeight: 600, border: `1px solid ${sep}`, fontFamily: F, textDecoration: 'none', display: 'inline-block' }}>
            {cfg.heroSecondBtn}
          </a>
        </div>
        {/* Stats strip */}
        <div data-grid="stats" style={{ borderTop: `1px solid ${sep}`, marginTop: 64, paddingTop: 32, display: 'flex', justifyContent: 'center', gap: 0 }}>
          {badgesFor(content, cfg, th).map((stat, i, arr) => (
            <div key={stat} style={{ padding: '0 40px', borderRight: i < arr.length - 1 ? `1px solid ${sep}` : 'none' }}>
              <span style={{ fontSize: 14, color: c.s, fontFamily: F }}>{stat}</span>
            </div>
          ))}
        </div>
      </section>
  )

  const servicesBlock = (
      <section style={{ background: c.b, padding: '80px 8%' }}>
        <Txt as="p" t={cfgLabel(content.labels, cfg.svcKicker, 'svcKicker')} style={{ textAlign: 'center', fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 12, fontFamily: F }} />
        <Txt as="h2" t={cfgLabel(content.labels, cfg.svcHeading, 'svcHeading')} style={{ textAlign: 'center', fontSize: 40, fontWeight: 800, color: c.h, marginBottom: 56, letterSpacing: -1, fontFamily: F }} />
        <div data-grid="services" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {content.services.map((s, i) => (
            <div key={s.name} style={{ background: c.bg, padding: '32px 28px', borderRadius: 16, border: `1px solid ${sep}` }}>
              <div style={{ width: 60, height: 60, borderRadius: 12, background: c.a + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                {icons[i % icons.length]}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: c.h, marginBottom: 8, fontFamily: F }}>{s.name}</h3>
              <p style={{ fontSize: 14, color: c.s, lineHeight: 1.65, marginBottom: 16, fontFamily: F }}>{s.desc}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: c.a, fontFamily: F }}>{s.price}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <a href={th} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>
            {cfgLabel(content.labels, cfg.allLink, 'allLink')}
          </a>
        </div>
      </section>
  )

  const aboutBlock = (
    <>
      <section id="om-oss" style={{ background: c.b, padding: '80px 8%', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 16, fontFamily: F }}>Om oss</p>
        <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 40, fontWeight: 800, color: c.h, marginBottom: 24, letterSpacing: -1, maxWidth: 600, margin: '0 auto 24px', fontFamily: F }} />
        <Txt as="p" t={content.aboutBody} style={{ fontSize: 18, color: c.s, lineHeight: 1.8, maxWidth: 600, margin: '0 auto 32px', fontFamily: F }} />
        <p style={{ fontSize: 14, color: c.a, fontWeight: 600, fontFamily: F }}>{content.phone}  ·  {content.address}</p>
      </section>
      <section style={{ background: c.a, padding: '64px 8%', textAlign: 'center' }}>
        <Txt as="h2" t={cfgLabel(content.labels, cfg.ctaBandTitle, 'ctaBandTitle')} style={{ fontSize: 36, fontWeight: 800, color: isDark(c.a) ? '#ffffff' : '#0a0a0a', marginBottom: 12, letterSpacing: -0.8, fontFamily: F }} />
        <p style={{ fontSize: 16, color: isDark(c.a) ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)', marginBottom: 32, fontFamily: F }}>{content.phone}</p>
        <BookButton content={content} style={{ background: isDark(c.a) ? '#ffffff' : '#0a0a0a', color: isDark(c.a) ? '#0a0a0a' : '#ffffff', padding: '14px 40px', borderRadius: 8, fontSize: 15, fontWeight: 700, fontFamily: F, textDecoration: 'none', display: 'inline-block' }} />
      </section>
    </>
  )

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <SiteNav layout="centered" c={c} content={content} th={th} base={base} />
      <main>
        <PageSections blocks={{ hero: <>{heroBlock}<StatsBar c={c} content={content} cfg={cfg} th={th} /></>, services: servicesBlock, about: aboutBlock }} c={c} content={content} base={base} industry={industry} />
      </main>
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )
}

/* ── Layout: Split ──────────────────────────────────────────────────────── */

function SplitSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const isResto = industry === 'restaurant'
  const cfg    = getIndConfig(industry)
  const btnBg  = c.a
  const btnFg  = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const sep    = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const statBg = c.b

  const heroBlock = (
      <section data-split style={{ display: 'grid', gridTemplateColumns: '58fr 42fr', minHeight: 580, background: c.bg }}>
        <div style={{ padding: '80px 6% 80px 8%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ color: c.a, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' as const, marginBottom: 24, fontFamily: F }}>
            {content.kicker}
          </p>
          <h1 style={{ fontSize: 64, fontWeight: 900, color: c.h, lineHeight: 1.05, marginBottom: 20, letterSpacing: -2, fontFamily: F }}>
            {content.heroHeading}
          </h1>
          {/* A headline names the promise; this sentence is what lets a
              first-time visitor judge whether it is meant for them. */}
          <p style={{ fontSize: 17, color: c.s, lineHeight: 1.7, maxWidth: 460, marginBottom: 32, fontFamily: F }}>
            {content.heroBody}
          </p>
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            <BookButton content={content} style={{ background: btnBg, color: btnFg, padding: '14px 32px', borderRadius: 6, fontSize: 15, fontWeight: 700, fontFamily: F, textDecoration: 'none', display: 'inline-block' }} />
            <a href={th} style={{ background: 'transparent', color: c.h, padding: '14px 28px', borderRadius: 6, fontSize: 15, fontWeight: 600, border: `1.5px solid ${sep}`, fontFamily: F, textDecoration: 'none', display: 'inline-block' }}>
              {cfg.heroSecondBtn}
            </a>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {badgesFor(content, cfg, th).map(badge => (
              <span key={badge} style={{ fontSize: 12, color: c.s, fontFamily: F }}>{badge}</span>
            ))}
          </div>
        </div>
        {/* Sharp-corner image — bold agency feel */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <ImagePlaceholder c={c} height={580} radius={0} src={content.heroImage} alt={content.heroImageAlt?.trim() || content.businessName} />
        </div>
      </section>
  )

  const servicesBlock = (
    <>
      <section style={{ background: c.bg, padding: '72px 8%' }}>
        <Txt as="h2" t={cfgLabel(content.labels, cfg.svcHeading, 'svcHeading')} style={{ fontSize: 36, fontWeight: 800, color: c.h, marginBottom: 40, letterSpacing: -0.8, fontFamily: F }} />
        {content.services.map((s, i) => (
          <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 24, alignItems: 'center', padding: '32px 0', borderBottom: `1px solid ${sep}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: c.a, fontFamily: F }}>0{i + 1}</span>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, color: c.h, marginBottom: 6, fontFamily: F }}>{s.name}</p>
              <p style={{ fontSize: 14, color: c.s, fontFamily: F }}>{s.desc}</p>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: c.a, whiteSpace: 'nowrap' as const, fontFamily: F }}>{s.price}</p>
          </div>
        ))}
        <div style={{ marginTop: 32 }}>
          <a href={th} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>
            {cfgLabel(content.labels, cfg.allLink, 'allLink')}
          </a>
        </div>
      </section>

      {/* Process strip (non-restaurant) / Öppettider strip (restaurant) */}
      <section style={{ background: c.a, padding: '64px 8%' }}>
        {isResto ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: isDark(c.a) ? '#ffffff' : '#0a0a0a', marginBottom: 16, letterSpacing: -0.5, fontFamily: F }}>Välkommen in</h2>
            <Txt as="p" t={content.hours} style={{ fontSize: 16, color: isDark(c.a) ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', marginBottom: 32, fontFamily: F }} />
            <p style={{ fontSize: 14, color: isDark(c.a) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)', marginBottom: 36, fontFamily: F }}>{content.address}  ·  {content.phone}</p>
            <BookButton content={content} style={{ background: isDark(c.a) ? '#ffffff' : '#0a0a0a', color: isDark(c.a) ? '#0a0a0a' : '#ffffff', padding: '14px 40px', borderRadius: 6, fontSize: 15, fontWeight: 700, fontFamily: F, textDecoration: 'none', display: 'inline-block' }} />
          </div>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: isDark(c.a) ? '#ffffff' : '#0a0a0a', marginBottom: 48, letterSpacing: -0.5, fontFamily: F }}>{cfg.processTitle}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative', maxWidth: 860, margin: '0 auto' }}>
              {cfg.processSteps.map((step, i, arr) => (
                <div key={step.n} style={{ textAlign: 'center', padding: '0 32px', borderRight: i < arr.length - 1 ? `1px solid ${isDark(c.a) ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}` : 'none' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: isDark(c.a) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 18, fontWeight: 800, color: isDark(c.a) ? '#ffffff' : '#0a0a0a', fontFamily: F }}>
                    {step.n}
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: isDark(c.a) ? '#ffffff' : '#0a0a0a', marginBottom: 8, fontFamily: F }}>{step.title}</p>
                  <p style={{ fontSize: 13, color: isDark(c.a) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontFamily: F }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  )

  const aboutBlock = (
    <>
      <section id="om-oss" style={{ background: c.b, padding: '72px 8%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
          <ImagePlaceholder c={c} height={380} radius={12} />
          <div>
            <p style={{ fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 16, fontFamily: F }}>Om oss</p>
            <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 34, fontWeight: 800, color: c.h, marginBottom: 20, letterSpacing: -0.8, fontFamily: F }} />
            <Txt as="p" t={content.aboutBody} style={{ fontSize: 16, color: c.s, lineHeight: 1.8, marginBottom: 28, fontFamily: F }} />
            <p style={{ fontSize: 14, color: c.a, fontWeight: 600, fontFamily: F }}>{content.phone}</p>
            <Txt as="p" t={content.hours} style={{ fontSize: 13, color: c.s, marginTop: 4, fontFamily: F }} />
          </div>
        </div>
      </section>
    </>
  )

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <SiteNav layout="split" c={c} content={content} th={th} base={base} />
      <main>
        <PageSections blocks={{ hero: <>{heroBlock}<StatsBar c={c} content={content} cfg={cfg} th={th} /></>, services: servicesBlock, about: aboutBlock }} c={c} content={content} base={base} industry={industry} />
      </main>
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )
}

/* ── Layout: Editorial ──────────────────────────────────────────────────── */

function EditorialSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const isResto = industry === 'restaurant'
  const cfg     = getIndConfig(industry)
  const btnBg   = c.a
  const btnFg   = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <SiteNav layout="editorial" c={c} content={content} th={th} base={base} />
      <main>
        <PageSections blocks={{ hero: <>{buildHero()}<StatsBar c={c} content={content} cfg={cfg} th={th} /></>, services: buildServices(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
      </main>
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildHero() { return (
      <section data-split style={{ display: 'grid', gridTemplateColumns: '62fr 38fr', minHeight: 520, background: c.bg }}>
        <div style={{ padding: '80px 6% 80px 10%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <p style={{ fontSize: 11, color: c.a, letterSpacing: 4, textTransform: 'uppercase' as const, marginBottom: 28, fontFamily: F }}>
            — {content.kicker}
          </p>
          <h1 style={{ fontSize: 96, fontWeight: 900, color: c.h, lineHeight: 0.92, letterSpacing: -4, marginBottom: 28, fontFamily: F }}>
            {content.heroHeading}
          </h1>
          <p style={{ fontSize: 17, color: c.s, lineHeight: 1.7, maxWidth: 480, marginBottom: 40, fontFamily: F }}>
            {content.heroBody}
          </p>
          <BookButton content={content} style={{ background: btnBg, color: btnFg, padding: '16px 40px', borderRadius: 0, fontSize: 15, fontWeight: 700, fontFamily: F, textDecoration: 'none', display: 'inline-block', alignSelf: 'flex-start' }} />
        </div>
        {/* Right panel: contact info with accent left border */}
        <div style={{ background: c.b, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 40px' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c.a }} />
          <p style={{ fontSize: 11, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 32, fontFamily: F }}>{content.businessName}</p>
          <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ fontSize: 24, fontWeight: 700, color: c.h, marginBottom: 20, fontFamily: F, textDecoration: 'none', display: 'block' }}>{content.phone}</a>
          <Txt as="p" t={content.hours} style={{ fontSize: 14, color: c.s, marginBottom: 12, lineHeight: 1.5, fontFamily: F }} />
          <Txt as="p" t={content.address} style={{ fontSize: 14, color: c.s, fontFamily: F }} />
        </div>
      </section>

  )}

  function buildServices() { return (
      <section style={{ padding: '72px 10%', borderTop: `4px solid ${c.a}` }}>
        {content.services.map((s, i) => (
          <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 0, alignItems: 'baseline', padding: '28px 0', borderBottom: `2px solid ${isDark(c.bg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            <span style={{ fontSize: 64, fontWeight: 900, color: c.a, opacity: 0.25, lineHeight: 1, fontFamily: F }}>0{i + 1}</span>
            <div style={{ paddingLeft: 8 }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: c.h, marginBottom: 6, fontFamily: F }}>{s.name}</p>
              <p style={{ fontSize: 15, color: c.s, fontFamily: F }}>{s.desc}</p>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: c.a, whiteSpace: 'nowrap' as const, fontFamily: F }}>{s.price}</p>
          </div>
        ))}
        <div style={{ marginTop: 24 }}>
          {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
        </div>
      </section>
  )}

  function buildAbout() { return (
    <>
      <section id="om-oss" style={{ background: c.bg, padding: '72px 10%' }}>
        <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 32, fontWeight: 700, color: c.h, marginBottom: 40, letterSpacing: -0.5, fontFamily: F }} />
        <div data-split style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
          <Txt as="p" t={content.aboutBody} style={{ fontSize: 16, color: c.s, lineHeight: 1.9, fontFamily: F }} />
          <div>
            <ImagePlaceholder c={c} height={280} radius={4} src={content.aboutImage} alt={content.aboutImageAlt?.trim() || content.aboutTitle} />
            <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ fontSize: 14, color: c.a, fontWeight: 600, marginTop: 20, fontFamily: F, textDecoration: 'none', display: 'block' }}>{content.phone}</a>
            <Txt as="p" t={content.address} style={{ fontSize: 13, color: c.s, marginTop: 6, fontFamily: F }} />
          </div>
        </div>
      </section>
    </>
  )}
}

/* ── Layout: Heritage ───────────────────────────────────────────────────── */

function HeritageSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const isResto = industry === 'restaurant'
  const cfg      = getIndConfig(industry)
  const btnBg    = c.a
  const btnFg    = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const heroBg   = c.nav
  const heroFg   = isDark(heroBg) ? '#ffffff' : c.h
  const heroSub  = isDark(heroBg) ? 'rgba(255,255,255,0.65)' : c.s
  const sep      = isDark(c.bg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <SiteNav layout="heritage" c={c} content={content} th={th} base={base} />
      <main>
        <PageSections blocks={{ hero: <>{buildHero()}<StatsBar c={c} content={content} cfg={cfg} th={th} /></>, services: buildServices(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
      </main>
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildHero() { return (
      <section style={{ background: heroBg, padding: '88px 10%', textAlign: 'center' }}>
        {/* Ornamental line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ height: 1, width: 60, background: c.a }} />
          <span style={{ color: c.a, fontSize: 12 }}>◆</span>
          <div style={{ height: 1, width: 60, background: c.a }} />
        </div>
        <p style={{ fontSize: 11, color: c.a, letterSpacing: 5, textTransform: 'uppercase' as const, marginBottom: 20, fontFamily: F }}>
          {content.kicker}
        </p>
        <h1 style={{ fontSize: 52, fontWeight: 700, color: heroFg, lineHeight: 1.18, maxWidth: 680, margin: '0 auto 24px', letterSpacing: -0.5, fontFamily: F }}>
          {content.heroHeading}
        </h1>
        <p style={{ fontSize: 18, color: heroSub, maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.7, fontFamily: F }}>
          {content.heroBody}
        </p>
        {/* Ornamental line again */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '24px 0 36px' }}>
          <div style={{ height: 1, width: 60, background: c.a, opacity: 0.5 }} />
          <span style={{ color: c.a, fontSize: 10, opacity: 0.5 }}>◆</span>
          <div style={{ height: 1, width: 60, background: c.a, opacity: 0.5 }} />
        </div>
        <BookButton content={content} style={{ background: btnBg, color: btnFg, padding: '14px 36px', borderRadius: 2, fontSize: 14, fontWeight: 700, letterSpacing: 0.5, fontFamily: F, textDecoration: 'none', display: 'inline-block' }} />
      </section>
  )}

  function buildServices() { return (
      <section style={{ background: c.bg, padding: '72px 8%' }}>
        <Txt as="p" t={cfgLabel(content.labels, cfg.svcKicker, 'svcKicker')} style={{ textAlign: 'center', fontSize: 11, color: c.a, letterSpacing: 4, textTransform: 'uppercase' as const, marginBottom: 12, fontFamily: F }} />
        <Txt as="h2" t={cfgLabel(content.labels, cfg.heritageSvcHdg, 'svcHeading')} style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, color: c.h, marginBottom: 48, letterSpacing: -0.5, fontFamily: F }} />
        <div data-grid="services" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {content.services.map(s => (
            <div key={s.name} style={{ background: c.b, borderRadius: 4, border: `1px solid ${sep}`, overflow: 'hidden' }}>
              <div style={{ height: 3, background: c.a }} />
              <div style={{ padding: '28px 28px 28px' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: c.h, marginBottom: 10, fontFamily: F }}>{s.name}</h3>
                <p style={{ color: c.a, fontSize: 16, marginBottom: 12, fontFamily: F }}>—</p>
                <p style={{ fontSize: 14, color: c.s, lineHeight: 1.7, marginBottom: 20, fontFamily: F }}>{s.desc}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: c.a, fontFamily: F }}>{s.price}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <a href={th} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>
            {cfgLabel(content.labels, cfg.allLink, 'allLink')}
          </a>
        </div>
      </section>
  )}

  function buildAbout() { return (
    <>
      <section id="om-oss" style={{ background: c.bg, padding: '72px 8%' }}>
        <div data-split style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
          <div>
            <p style={{ fontSize: 11, color: c.a, letterSpacing: 4, textTransform: 'uppercase' as const, marginBottom: 16, fontFamily: F }}>— Om oss</p>
            <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 32, fontWeight: 700, color: c.h, marginBottom: 20, letterSpacing: -0.5, fontFamily: F }} />
            <Txt as="p" t={content.aboutBody} style={{ fontSize: 16, color: c.s, lineHeight: 1.8, marginBottom: 28, fontFamily: F }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6, fontFamily: F }}>Telefon</p>
                <p style={{ fontSize: 14, color: c.h, fontFamily: F }}>{content.phone}</p>
              </div>
              {!!content.hours?.trim() && (
                <div>
                  <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6, fontFamily: F }}>Öppettider</p>
                  <Txt as="p" t={content.hours} style={{ fontSize: 14, color: c.h, fontFamily: F }} />
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6, fontFamily: F }}>Adress</p>
                <Txt as="p" t={content.address} style={{ fontSize: 14, color: c.h, fontFamily: F }} />
              </div>
            </div>
          </div>
          <ImagePlaceholder c={c} height={360} radius={4} src={content.aboutImage} alt={content.aboutTitle} />
        </div>
      </section>

      {/* Contact strip */}
      <section style={{ background: c.a, padding: '48px 8%' }}>
        <div data-grid="stats" style={{ display: 'flex', justifyContent: 'center', gap: 0 }}>
          {[
            { label: 'Telefon',    val: content.phone   },
            { label: 'Öppettider', val: content.hours   },
            { label: 'Adress',     val: content.address },
          ].filter(item => item.val?.trim()).map((item, i, arr) => (
            <div key={item.label} style={{ flex: 1, textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${isDark(c.a) ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}` : 'none', padding: '8px 24px' }}>
              <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' as const, color: isDark(c.a) ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)', marginBottom: 10, fontFamily: F }}>{item.label}</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: isDark(c.a) ? '#ffffff' : '#0a0a0a', fontFamily: F }}>{item.val}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )}
}

/* ── Layout: Luxury ─────────────────────────────────────────────────────── */

export type ImageSlot = 'heroImage' | 'featureImage' | 'aboutImage'

/** Which picture slots a template's design actually has. The editor only
 *  offers the ones the chosen layout renders — an upload that changes nothing
 *  visible is worse than no upload at all. */
export function templateImageSlots(layout: string): ImageSlot[] {
  switch (layout) {
    case 'split':     return ['heroImage']
    case 'editorial':
    case 'heritage':  return ['aboutImage']
    case 'luxury':    return ['featureImage']
    default:          return []
  }
}

function LuxurySite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const isResto = industry === 'restaurant'
  const cfg     = getIndConfig(industry)
  const sep     = isDark(c.bg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>

      <SiteNav layout="luxury" c={c} content={content} th={th} base={base} />
      <main>
        <PageSections blocks={{ hero: <>{buildHero()}<StatsBar c={c} content={content} cfg={cfg} th={th} /></>, services: buildServices(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
      </main>
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildHero() { return (
      <section style={{ background: c.bg, minHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 10%' }}>
        <p style={{ fontSize: 10, letterSpacing: 8, color: c.a, textTransform: 'uppercase' as const, marginBottom: 20, fontFamily: F }}>
          {content.kicker}
        </p>
        <p style={{ fontSize: 14, color: c.s, letterSpacing: 3, marginBottom: 48, fontFamily: F }}>
          {content.tagline}
        </p>
        <h1 style={{ fontSize: 60, fontWeight: 200, color: c.h, lineHeight: 1.15, maxWidth: 680, letterSpacing: -1, fontFamily: F }}>
          {content.heroHeading}
        </h1>
        <p style={{ fontSize: 17, color: c.s, lineHeight: 1.85, maxWidth: 520, margin: '28px auto 0', fontFamily: F }}>
          {content.heroBody}
        </p>
        {/* Thin line */}
        <div style={{ height: 1, width: 60, background: c.a, margin: '44px auto' }} />
        <BookButton content={content} style={{ background: c.a, color: isDark(c.a) ? '#ffffff' : '#0a0a0a', padding: '17px 50px', fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' as const, fontFamily: F, textDecoration: 'none', display: 'inline-block', borderRadius: 0 }} />
      </section>
  )}

  function buildServices() { return (
    <>
      <section data-split style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <ImagePlaceholder c={c} height={500} radius={0} src={content.featureImage} alt={content.services[0]?.name} />
        <div style={{ background: c.b, padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Txt as="p" t={cfgLabel(content.labels, cfg.featureLabel, 'featureLabel')} style={{ fontSize: 10, letterSpacing: 5, color: c.a, textTransform: 'uppercase' as const, marginBottom: 20, fontFamily: F }} />
          <h2 style={{ fontSize: 48, fontWeight: 200, color: c.h, lineHeight: 1.1, letterSpacing: -1, marginBottom: 0, fontFamily: F }}>{content.services[0]?.name}</h2>
          <p style={{ fontSize: 15, color: c.s, lineHeight: 1.9, marginTop: 16, marginBottom: 32, fontFamily: F }}>{content.services[0]?.desc}</p>
          <p style={{ fontSize: 20, color: c.a, fontWeight: 400, fontFamily: F }}>{content.services[0]?.price}</p>
        </div>
      </section>

      {/* Services list — ultra minimal.
          Den första tjänsten står redan stor i rutan ovanför, med bild, text
          och pris. Tas den inte bort här möter besökaren samma namn två gånger
          med tre centimeters mellanrum, och listan ser ut som ett misstag. */}
      {content.services.length > 1 && (
      <section style={{ background: c.bg, padding: '80px 10%' }}>
        <Txt as="p" t={cfgLabel(content.labels, cfg.menuLabel, 'menuLabel')} style={{ fontSize: 11, letterSpacing: 5, color: c.a, textTransform: 'uppercase' as const, marginBottom: 40, fontFamily: F }} />
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {content.services.slice(1).map(s => (
            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: `1px solid ${isDark(c.bg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
              <p style={{ fontSize: 18, color: c.h, fontWeight: 400, fontFamily: F }}>{s.name}</p>
              <p style={{ fontSize: 14, color: c.a, fontWeight: 400, fontFamily: F }}>{s.price}</p>
            </div>
          ))}
          <div style={{ marginTop: 36, textAlign: 'center' as const }}>
            {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ color: c.a, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' as const, fontFamily: F, textDecoration: 'none', borderBottom: `1px solid ${c.a}`, paddingBottom: 2 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
          </div>
        </div>
      </section>
      )}
    </>
  )}

  function buildAbout() { return (
    <>
      <section id="om-oss" style={{ background: c.bg, padding: '80px 10%', textAlign: 'center' }}>
        <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 28, fontWeight: 300, color: c.h, letterSpacing: -0.3, marginBottom: 20, fontFamily: F }} />
        <Txt as="p" t={content.aboutBody} style={{ fontSize: 15, color: c.s, maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.9, fontFamily: F }} />
        <p style={{ fontSize: 13, color: c.a, letterSpacing: 2, fontFamily: F }}>{content.phone}  ·  {content.address}</p>
      </section>
    </>
  )}
}

/* ── Showcase — the photos ARE the opening ─────────────────────────────────
   A salon's proof of skill already exists in pictures. This layout leads
   with them: a full-bleed mosaic with the identity laid over it. */
function ShowcaseSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const cfg    = getIndConfig(industry)
  const photos = (content.gallery_images ?? []).filter(src => src?.trim()).slice(0, 6)
  const cells  = photos.length ? photos : [c.a + '30', c.b, c.a + '18', c.b, c.a + '24', c.b]
  const overlay = 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.65) 100%)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <PageSections blocks={{ hero: buildHero(), services: buildServices(), about: buildAbout(), gallery: null }} c={c} content={content} base={base} industry={industry} />
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildHero() { return (
    <>
      {/* Hero: mosaic + overlaid identity. The nav floats on the pictures. */}
      <section style={{ position: 'relative', padding: 0 }}>
        <div data-grid="gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, minHeight: 520 }}>
          {cells.map((cell, i) => photos.length ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={cell} alt={content.gallery_alts?.[i]?.trim() || `${content.businessName} — bild ${i + 1}`} style={{ width: '100%', height: '100%', minHeight: 170, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div key={i} style={{ background: cell, minHeight: 170 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, background: overlay, display: 'flex', flexDirection: 'column' }}>
          <SiteNav layout="showcase" over c={c} content={content} th={th} base={base} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 8%' }}>
            <Txt as="p" kicker t={content.kicker} style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase' as const, color: '#ffffff', opacity: 0.85, marginBottom: 14, fontFamily: F }} />
            <h1 style={{ fontSize: 54, fontWeight: 800, color: '#ffffff', letterSpacing: -1, lineHeight: 1.1, maxWidth: 700, marginBottom: 22, fontFamily: F, textShadow: '0 2px 24px rgba(0,0,0,0.45)' }}>
              {content.heroHeading}
            </h1>
            <p style={{ fontSize: 17, color: '#ffffff', opacity: 0.9, lineHeight: 1.7, maxWidth: 560, marginBottom: 24, fontFamily: F, textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}>
              {content.heroBody}
            </p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <BookButton content={content} style={{ background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '13px 34px', borderRadius: 8, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none' }} />
              {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ color: '#ffffff', fontSize: 14, fontFamily: F, textDecoration: 'underline' }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
            </div>
          </div>
        </div>
      </section>
      <StatsBar c={c} content={content} cfg={cfg} th={th} />
    </>
  )}

  function buildServices() { return (
      <section style={{ background: c.bg, padding: '64px 8%' }}>
        <Txt as="p" kicker t={cfgLabel(content.labels, cfg.svcKicker, 'svcKicker')} style={{ fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 28, fontFamily: F, textAlign: 'center' }} />
        <div data-grid="services" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
          {content.services.map(s => (
            <div key={s.name} style={{ borderTop: `2px solid ${c.a}`, paddingTop: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: c.h, marginBottom: 6, fontFamily: F }}>{s.name}</h3>
              <p style={{ fontSize: 14, color: c.s, lineHeight: 1.6, marginBottom: 10, fontFamily: F }}>{s.desc}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: c.a, fontFamily: F }}>{s.price}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
        </div>
      </section>
  )}

  function buildAbout() { return (
    <>
      <section id="om-oss" style={{ background: c.b, padding: '72px 8%', textAlign: 'center' }}>
        <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 32, fontWeight: 800, color: c.h, marginBottom: 18, letterSpacing: -0.6, fontFamily: F }} />
        <Txt as="p" t={content.aboutBody} style={{ fontSize: 16, color: c.s, lineHeight: 1.8, maxWidth: 620, margin: '0 auto', fontFamily: F }} />
      </section>
    </>
  )}
}

/* ── Direkt — the booking above everything else ────────────────────────────
   For the salon whose visitors have already decided: prices and the button
   are the hero, storytelling steps aside. */
function DirectSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const cfg = getIndConfig(industry)
  const items = content.menuCategories.flatMap(cat => cat.items).filter(i => i.name?.trim()).slice(0, 6)
  const rows  = items.length ? items : content.services.map(s => ({ name: s.name, price: s.price, hidePrice: false }))
  const sep   = isDark(c.b) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <SiteNav layout="direct" c={c} content={content} th={th} base={base} />
      <PageSections blocks={{ hero: buildHero(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildHero() { return (
    <>
      {/* Hero: identity left, the booking card right */}
      <section data-split style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, padding: '64px 8%', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
        <div>
          <Txt as="p" kicker t={content.kicker} style={{ fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 14, fontFamily: F }} />
          <Txt as="h1" t={content.heroHeading} style={{ fontSize: 44, fontWeight: 800, color: c.h, letterSpacing: -1, lineHeight: 1.12, marginBottom: 18, fontFamily: F }} />
          <Txt as="p" t={content.heroBody} style={{ fontSize: 16, color: c.s, lineHeight: 1.75, marginBottom: 26, fontFamily: F }} />
          <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ display: 'block', fontSize: 22, fontWeight: 800, color: c.a, fontFamily: F, textDecoration: 'none', marginBottom: 8 }}>{content.phone}</a>
          <Txt as="p" t={content.hours} style={{ fontSize: 13, color: c.s, fontFamily: F }} />
        </div>
        <div style={{ background: c.b, borderRadius: 16, padding: '28px 28px 24px', border: `1px solid ${sep}` }}>
          {rows.map(item => (
            <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: `1px solid ${sep}` }}>
              <p style={{ fontSize: 14, color: c.h, fontWeight: 600, fontFamily: F }}>{item.name}</p>
              {!('hidePrice' in item && item.hidePrice) && <p style={{ fontSize: 14, color: c.a, fontWeight: 700, fontFamily: F, whiteSpace: 'nowrap' }}>{item.price}</p>}
            </div>
          ))}
          <BookButton content={content} style={{ display: 'block', textAlign: 'center', background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '14px 0', borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: F, textDecoration: 'none', marginTop: 18 }} />
          {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ display: 'block', textAlign: 'center', color: c.s, fontSize: 13, fontFamily: F, textDecoration: 'underline', marginTop: 12 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
        </div>
      </section>
      <StatsBar c={c} content={content} cfg={cfg} th={th} />
    </>
  )}

  function buildAbout() { return (
    <>
      {/* About, brief — this layout's promise is speed */}
      <section id="om-oss" style={{ background: c.b, padding: '56px 8%', textAlign: 'center' }}>
        <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 28, fontWeight: 800, color: c.h, marginBottom: 14, letterSpacing: -0.5, fontFamily: F }} />
        <Txt as="p" t={content.aboutBody} style={{ fontSize: 15, color: c.s, lineHeight: 1.75, maxWidth: 600, margin: '0 auto', fontFamily: F }} />
      </section>
    </>
  )}
}

/* ── Team — the people are the argument ────────────────────────────────────
   Regulars come back for a person, not a price list. On demos, sample faces
   show what the layout is for; a live site without a team gracefully leads
   with its services instead. */
function TeamSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const cfg    = getIndConfig(industry)
  const isLive = base.startsWith('/s/')
  const team   = (content.team ?? []).filter(m => m.name?.trim())
  const demo   = !team.length && !isLive
    ? [{ name: 'Anna', title: 'Grundare', image: '' }, { name: 'Sara', title: 'Senior stylist', image: '' }, { name: 'Elin', title: 'Stylist', image: '' }]
    : []
  const people = team.length ? team : demo
  const sep    = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <SiteNav layout="team" c={c} content={content} th={th} base={base} />
      <PageSections blocks={{ hero: buildHero(), services: buildServices(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildHero() { return (
    <>
      <section style={{ padding: '64px 8% 36px', textAlign: 'center' }}>
        <Txt as="p" kicker t={content.kicker} style={{ fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 14, fontFamily: F }} />
        <Txt as="h1" t={content.heroHeading} style={{ fontSize: 42, fontWeight: 800, color: c.h, letterSpacing: -1, lineHeight: 1.15, maxWidth: 680, margin: '0 auto 16px', fontFamily: F }} />
        <Txt as="p" t={content.heroBody} style={{ fontSize: 16, color: c.s, lineHeight: 1.75, maxWidth: 560, margin: '0 auto', fontFamily: F }} />
      </section>

      {people.length > 0 && (
        <section style={{ padding: '24px 8% 72px' }}>
          <div data-grid="services" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
            {people.map(m => (
              <div key={m.name} style={{ background: c.b, borderRadius: 16, padding: '32px 24px', textAlign: 'center', border: `1px solid ${sep}` }}>
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt={m.name} style={{ width: 132, height: 132, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', display: 'block' }} />
                ) : (
                  <div style={{ width: 132, height: 132, borderRadius: '50%', background: c.a + '26', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: c.a, fontSize: 40, fontWeight: 800, fontFamily: F }}>
                    {m.name.charAt(0)}
                  </div>
                )}
                <p style={{ fontSize: 18, fontWeight: 800, color: c.h, marginBottom: 4, fontFamily: F }}>{m.name}</p>
                <p style={{ fontSize: 13, color: c.s, marginBottom: 18, fontFamily: F }}>{m.title}</p>
                {/* En knapp per person, och de bokar. Att skicka den som klickat
                    på Marias kort till prislistan vore att svara på en annan
                    fråga än den de ställde. Valet gäller sidans enda stora
                    boka-knapp, inte varje knapp som råkar bära samma ord. */}
                <BookButton content={content} style={{ display: 'inline-block', border: `1.5px solid ${c.a}`, color: c.a, padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: F, textDecoration: 'none' }} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )}

  function buildServices() { return (
      <section style={{ background: c.b, padding: '64px 8%' }}>
        <Txt as="h2" t={cfgLabel(content.labels, cfg.svcHeading, 'svcHeading')} style={{ fontSize: 30, fontWeight: 800, color: c.h, textAlign: 'center', marginBottom: 36, letterSpacing: -0.6, fontFamily: F }} />
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          {content.services.map(s => (
            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '13px 0', borderBottom: `1px solid ${sep}` }}>
              <p style={{ fontSize: 15, color: c.h, fontWeight: 600, fontFamily: F }}>{s.name}</p>
              <p style={{ fontSize: 15, color: c.a, fontWeight: 700, fontFamily: F, whiteSpace: 'nowrap' }}>{s.price}</p>
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
          </div>
        </div>
      </section>
  )}

  /* No TeamSection here — the people already lead this page */
  function buildAbout() { return (
      <section id="om-oss" style={{ background: c.bg, padding: '64px 8%', textAlign: 'center' }}>
        <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 28, fontWeight: 800, color: c.h, marginBottom: 14, letterSpacing: -0.5, fontFamily: F }} />
        <Txt as="p" t={content.aboutBody} style={{ fontSize: 15, color: c.s, lineHeight: 1.75, maxWidth: 600, margin: '0 auto', fontFamily: F }} />
      </section>
  )}
}

/* ── Stolpen — everything hangs off one spine ──────────────────────────────
   A striped rail runs the full height of the page, the way the pole runs
   down a barbershop doorframe. Every section is numbered against it, so a
   visitor always knows how far down the page they are. */
function PoleSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const cfg  = getIndConfig(industry)
  const sep  = isDark(c.bg) ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'
  /* The pole: accent and background in a repeating diagonal, drawn once and
     stretched down the whole page rather than repeated per section. */
  const pole = `repeating-linear-gradient(-45deg, ${c.a} 0 10px, ${c.b} 10px 20px)`

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F, display: 'grid', gridTemplateColumns: '14px 1fr' }}>
      <div aria-hidden style={{ background: pole }} />
      <div style={{ minWidth: 0 }}>
        <SiteNav layout="pole" c={c} content={content} th={th} base={base} />
        <PageSections blocks={{ hero: buildHero(), services: buildServices(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
        <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
        <Footer c={c} content={content} base={base} />
      </div>
    </div>
  )

  /** The number that marks a section against the rail. */
  function Marker({ n, label }: { n: string; label: string }) {
    // A numbered rule with nothing to name is just a stray line.
    if (!label.trim()) return null
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <span style={{ fontSize: 12, fontWeight: 900, color: c.a, letterSpacing: 1, fontFamily: F }}>{n}</span>
        <span style={{ width: 28, height: 2, background: c.a }} />
        <span style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' as const, color: c.s, fontFamily: F }}>{label}</span>
      </div>
    )
  }

  function buildHero() { return (
    <>
      <section style={{ padding: '72px 8% 60px', maxWidth: 1100 }}>
        <Marker n="01" label={content.kicker} />
        <Txt as="h1" t={content.heroHeading} style={{ fontSize: 56, fontWeight: 900, color: c.h, letterSpacing: -1.5, lineHeight: 1.05, maxWidth: 780, marginBottom: 22, fontFamily: F }} />
        <Txt as="p" t={content.heroBody} style={{ fontSize: 17, color: c.s, lineHeight: 1.8, maxWidth: 560, marginBottom: 32, fontFamily: F }} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' as const, marginBottom: 40 }}>
          <BookButton content={content} style={{ background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '15px 36px', fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: F, textDecoration: 'none' }} />
          <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ border: `2px solid ${c.h}`, color: c.h, padding: '13px 28px', fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none' }}>{content.phone}</a>
        </div>
        {/* The two facts a walk-in customer needs, side by side */}
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' as const, borderTop: `1px solid ${sep}`, paddingTop: 22 }}>
          {!!content.hours?.trim() && (
            <div>
              <Txt t={siteLabel(content.labels, 'hoursTitle')} style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase' as const, color: c.a, marginBottom: 6, fontFamily: F }} />
              <Txt t={content.hours} style={{ fontSize: 15, color: c.h, fontWeight: 600, fontFamily: F }} />
            </div>
          )}
          <div>
            <Txt t={siteLabel(content.labels, 'contactTitle')} style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase' as const, color: c.a, marginBottom: 6, fontFamily: F }} />
            <Txt t={content.address} style={{ fontSize: 15, color: c.h, fontWeight: 600, fontFamily: F }} />
          </div>
        </div>
      </section>
      <StatsBar c={c} content={content} cfg={cfg} th={th} />
    </>
  )}

  function buildServices() { return (
      <section id="prislista" style={{ background: c.b, padding: '64px 8%' }}>
        <Marker n="02" label={cfgLabel(content.labels, cfg.svcKicker, 'svcKicker')} />
        <Txt as="h2" t={cfgLabel(content.labels, cfg.svcHeading, 'svcHeading')} style={{ fontSize: 32, fontWeight: 900, color: c.h, letterSpacing: -0.8, marginBottom: 32, fontFamily: F }} />
        <div data-grid="services" style={{ maxWidth: 760 }}>
          {content.services.map((s, i) => (
            <div key={s.name} style={{ display: 'flex', gap: 20, alignItems: 'baseline', padding: '18px 0', borderTop: i === 0 ? 'none' : `1px solid ${sep}` }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: c.a, fontFamily: F, minWidth: 24 }}>{String(i + 1).padStart(2, '0')}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: c.h, marginBottom: 4, fontFamily: F }}>{s.name}</h3>
                <p style={{ fontSize: 14, color: c.s, lineHeight: 1.65, fontFamily: F }}>{s.desc}</p>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: c.a, fontFamily: F, whiteSpace: 'nowrap' as const }}>{s.price}</span>
            </div>
          ))}
        </div>
        {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ display: 'inline-block', marginTop: 26, color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `2px solid ${c.a}`, paddingBottom: 2 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
      </section>
  )}

  function buildAbout() { return (
      <section id="om-oss" style={{ padding: '64px 8%' }}>
        <Marker n="03" label={siteLabel(content.labels, 'aboutPageTitle')} />
        <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 32, fontWeight: 900, color: c.h, letterSpacing: -0.8, marginBottom: 18, fontFamily: F }} />
        <Txt as="p" t={content.aboutBody} style={{ fontSize: 16, color: c.s, lineHeight: 1.85, maxWidth: 640, fontFamily: F }} />
      </section>
  )}
}

/* ── Rutnätet — hard tiles, no soft edges ──────────────────────────────────
   Nothing rounded, nothing floating: the opening is a mosaic of solid blocks
   with the background showing through as grout. Every tile carries exactly
   one fact, so the whole offer is readable before a single scroll. */
function GridSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const cfg   = getIndConfig(industry)
  const grout = c.bg
  const photo = (content.gallery_images ?? []).find(src => src?.trim())
  const top   = content.services[0]
  const sep   = isDark(c.b) ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'
  const onA   = isDark(c.a) ? '#ffffff' : '#0a0a0a'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <SiteNav layout="grid" c={c} content={content} th={th} base={base} />
      <PageSections blocks={{ hero: buildTiles(), services: buildServices(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildTiles() { return (
    <>
      <section data-grid="gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 132, gap: 3, background: grout, padding: 3 }}>
        {/* The name, two by two — the shopfront sign */}
        <div style={{ gridColumn: 'span 2', gridRow: 'span 2', background: c.b, padding: '30px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Txt as="p" kicker t={content.kicker} style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: c.a, fontFamily: F }} />
          <Txt as="h1" t={content.heroHeading} style={{ fontSize: 40, fontWeight: 900, color: c.h, letterSpacing: -1.2, lineHeight: 1.08, fontFamily: F }} />
          <Txt as="p" t={content.heroBody} style={{ fontSize: 14, color: c.s, lineHeight: 1.7, fontFamily: F }} />
        </div>

        {/* The photo, or a solid accent block when there is none yet */}
        <div style={{ gridColumn: 'span 2', gridRow: 'span 2', background: photo ? c.b : c.a, overflow: 'hidden' }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={content.gallery_alts?.[0]?.trim() || content.businessName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', padding: '30px 32px' }}>
              <Txt as="p" t={content.tagline} style={{ fontSize: 22, fontWeight: 900, color: onA, letterSpacing: -0.5, lineHeight: 1.2, fontFamily: F }} />
            </div>
          )}
        </div>

        {/* One tile per fact: the headline service, when, where */}
        {top && (
          <div style={{ background: c.b, padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: c.h, fontFamily: F }}>{top.name}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: c.a, fontFamily: F }}>{top.price}</p>
          </div>
        )}
        {!!content.hours?.trim() && (
          <div style={{ background: c.b, padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Txt t={siteLabel(content.labels, 'hoursTitle')} style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase' as const, color: c.a, fontFamily: F }} />
            <Txt t={content.hours} style={{ fontSize: 14, color: c.h, fontWeight: 600, lineHeight: 1.5, fontFamily: F }} />
          </div>
        )}
        <div style={{ background: c.b, padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Txt t={siteLabel(content.labels, 'contactTitle')} style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase' as const, color: c.a, fontFamily: F }} />
          <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ fontSize: 14, color: c.h, fontWeight: 600, lineHeight: 1.5, fontFamily: F, textDecoration: 'none' }}>{content.address}<br/>{content.phone}</a>
        </div>
        {/* The booking tile is the one block in the accent colour */}
        {/* The one tile in the accent colour — nothing but the action, so it
            reads as a button and not as another fact to take in. */}
        <BookButton content={content} style={{ background: c.a, padding: '22px 24px', display: 'flex', alignItems: 'center', textDecoration: 'none', fontSize: 19, fontWeight: 900, color: onA, letterSpacing: -0.3, lineHeight: 1.25, fontFamily: F }}>
          {' →'}
        </BookButton>
      </section>
      <StatsBar c={c} content={content} cfg={cfg} th={th} />
    </>
  )}

  function buildServices() { return content.services.length < 2 ? null : (
      <section id="prislista" style={{ padding: '64px 6%' }}>
        <Txt as="h2" t={cfgLabel(content.labels, cfg.svcHeading, 'svcHeading')} style={{ fontSize: 30, fontWeight: 900, color: c.h, letterSpacing: -0.8, marginBottom: 28, fontFamily: F }} />
        {/* Första tjänsten står redan som pristegel i mosaiken högst upp. Den
            utgår här, annars möter besökaren samma namn och pris två gånger
            innan sidan ens har börjat. */}
        <div data-grid="services" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {content.services.slice(1).map(s => (
            <div key={s.name} style={{ background: c.b, padding: '26px 26px 24px', borderTop: `4px solid ${c.a}` }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: c.h, marginBottom: 8, fontFamily: F }}>{s.name}</h3>
              <p style={{ fontSize: 14, color: c.s, lineHeight: 1.65, marginBottom: 14, fontFamily: F }}>{s.desc}</p>
              <p style={{ fontSize: 17, fontWeight: 900, color: c.a, fontFamily: F }}>{s.price}</p>
            </div>
          ))}
        </div>
        {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ display: 'inline-block', marginTop: 24, color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `2px solid ${c.a}`, paddingBottom: 2 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
      </section>
  )}

  function buildAbout() { return (
      <section id="om-oss" style={{ padding: '0 6% 64px' }}>
        <div style={{ background: c.b, padding: '48px 44px', borderTop: `1px solid ${sep}`, borderRight: `1px solid ${sep}`, borderBottom: `1px solid ${sep}`, borderLeft: `6px solid ${c.a}` }}>
          <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 28, fontWeight: 900, color: c.h, letterSpacing: -0.6, marginBottom: 16, fontFamily: F }} />
          <Txt as="p" t={content.aboutBody} style={{ fontSize: 16, color: c.s, lineHeight: 1.85, maxWidth: 680, fontFamily: F }} />
        </div>
      </section>
  )}
}

/* ── Verkstan — the wall is the page ───────────────────────────────────────
   No bar, no card, no panel: a bare row of links floating on the surface and
   a headline set straight onto it. The texture runs the whole way down, and
   every section below sits on a translucent sheet laid over it, the way a
   notice is taped to a workshop wall. */
function WorkshopSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const cfg   = getIndConfig(industry)
  const wall  = backdropSrc(content, BACKDROPS.tra.src)
  const sheet = 'rgba(12,10,9,0.72)'
  const line  = 'rgba(255,255,255,0.16)'

  return (
    <div style={{ ...backdropStyle(wall, 0.42), backgroundAttachment: 'scroll', minHeight: '100vh', fontFamily: F }}>
      <PageSections blocks={{ hero: buildHero(), services: buildServices(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildHero() { return (
    <>
      <section style={{ background: 'transparent', padding: 0 }}>
        <SiteNav layout="workshop" over c={c} content={content} th={th} base={base} />
        <div style={{ minHeight: '72vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 8%' }}>
          <Txt as="p" kicker t={content.kicker} style={{ fontSize: 12, letterSpacing: 6, textTransform: 'uppercase' as const, color: '#ffffff', opacity: 0.8, marginBottom: 26, fontFamily: F, textShadow: '0 2px 10px rgba(0,0,0,0.6)' }} />
          <h1 style={{ fontSize: 62, fontWeight: 800, color: '#ffffff', letterSpacing: 4, textTransform: 'uppercase' as const, lineHeight: 1.08, maxWidth: 900, marginBottom: 26, fontFamily: F, textShadow: '0 4px 28px rgba(0,0,0,0.65)' }}>
            {content.heroHeading}
          </h1>
          <Txt as="p" t={content.heroBody} style={{ fontSize: 17, color: '#ffffff', opacity: 0.9, lineHeight: 1.75, maxWidth: 560, marginBottom: 34, fontFamily: F, textShadow: '0 2px 14px rgba(0,0,0,0.7)' }} />
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
            <BookButton content={content} style={{ background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '16px 42px', fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, fontFamily: F, textDecoration: 'none' }} />
            <a href={`tel:${content.phone.replace(/\s/g, '')}`} style={{ border: '2px solid rgba(255,255,255,0.7)', color: '#ffffff', padding: '14px 30px', fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none' }}>{content.phone}</a>
          </div>
        </div>
      </section>
      <StatsBar c={c} content={content} cfg={cfg} th={th} />
    </>
  )}

  function buildServices() { return (
      <section id="prislista" style={{ background: 'transparent', padding: '64px 7%' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', background: sheet, border: `1px solid ${line}`, padding: '40px 44px' }}>
          <Txt as="p" kicker t={cfgLabel(content.labels, cfg.svcKicker, 'svcKicker')} style={{ fontSize: 11, color: c.a, letterSpacing: 4, textTransform: 'uppercase' as const, marginBottom: 8, fontFamily: F }} />
          <Txt as="h2" t={cfgLabel(content.labels, cfg.svcHeading, 'svcHeading')} style={{ fontSize: 30, fontWeight: 800, color: '#ffffff', letterSpacing: 1, marginBottom: 26, fontFamily: F }} />
          <div data-grid="services">
            {content.services.map((s, i) => (
              <div key={s.name} style={{ display: 'flex', gap: 18, alignItems: 'baseline', padding: '16px 0', borderTop: i === 0 ? 'none' : `1px solid ${line}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 4, fontFamily: F }}>{s.name}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontFamily: F }}>{s.desc}</p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: c.a, whiteSpace: 'nowrap' as const, fontFamily: F }}>{s.price}</span>
              </div>
            ))}
          </div>
          {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ display: 'inline-block', marginTop: 22, color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `2px solid ${c.a}`, paddingBottom: 2 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
        </div>
      </section>
  )}

  function buildAbout() { return (
      <section id="om-oss" style={{ background: 'transparent', padding: '0 7% 64px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', background: sheet, border: `1px solid ${line}`, padding: '40px 44px' }}>
          <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', letterSpacing: 1, marginBottom: 16, fontFamily: F }} />
          <Txt as="p" t={content.aboutBody} style={{ fontSize: 16, color: 'rgba(255,255,255,0.82)', lineHeight: 1.85, maxWidth: 660, fontFamily: F }} />
        </div>
      </section>
  )}
}

/* ── Skylten — one image, one promise, one button ──────────────────────────
   A solid band across the top with the menu tucked behind a button, and
   below it nothing but the room and a single thing to do. The emblem lower
   down is where the shop signs its name. */
function SignSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const cfg  = getIndConfig(industry)
  const shot = backdropSrc(content, BACKDROPS.tegel.src)
  const sep  = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <SiteNav layout="sign" c={c} content={content} th={th} base={base} />
      <PageSections blocks={{ hero: buildHero(), services: buildServices(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildHero() { return (
    <>
      <section style={{ ...backdropStyle(shot, 0.5), minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '72px 8%' }}>
        <h1 style={{ fontSize: 50, fontWeight: 700, color: '#ffffff', lineHeight: 1.15, maxWidth: 760, marginBottom: 20, fontFamily: F, textShadow: '0 3px 26px rgba(0,0,0,0.6)' }}>
          {content.heroHeading}
        </h1>
        <Txt as="p" t={content.heroBody} style={{ fontSize: 17, color: '#ffffff', opacity: 0.9, lineHeight: 1.75, maxWidth: 540, marginBottom: 32, fontFamily: F, textShadow: '0 2px 14px rgba(0,0,0,0.7)' }} />
        <BookButton content={content} style={{ background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '16px 46px', borderRadius: 999, fontSize: 15, fontWeight: 700, fontFamily: F, textDecoration: 'none', marginBottom: 56 }} />

        {/* The emblem — the shop's name, framed, the way it sits on a sign */}
        <div style={{ border: '2px solid rgba(255,255,255,0.75)', padding: '16px 34px', textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: 5, textTransform: 'uppercase' as const, color: '#ffffff', fontFamily: F, margin: 0 }}>{content.businessName}</p>
          <Txt as="p" t={content.tagline} style={{ fontSize: 10, letterSpacing: 5, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.75)', marginTop: 6, fontFamily: F }} />
        </div>
      </section>
      <StatsBar c={c} content={content} cfg={cfg} th={th} />
    </>
  )}

  function buildServices() { return (
      <section id="prislista" style={{ background: c.bg, padding: '72px 8%' }}>
        <Txt as="h2" t={cfgLabel(content.labels, cfg.svcHeading, 'svcHeading')} style={{ fontSize: 32, fontWeight: 700, color: c.h, textAlign: 'center', marginBottom: 40, fontFamily: F }} />
        <div data-grid="services" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, maxWidth: 1020, margin: '0 auto' }}>
          {content.services.map(s => (
            <div key={s.name} style={{ background: c.b, padding: '30px 28px', textAlign: 'center', border: `1px solid ${sep}` }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: c.h, marginBottom: 10, fontFamily: F }}>{s.name}</h3>
              <p style={{ fontSize: 14, color: c.s, lineHeight: 1.65, marginBottom: 16, fontFamily: F }}>{s.desc}</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: c.a, fontFamily: F }}>{s.price}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 34 }}>
          {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `2px solid ${c.a}`, paddingBottom: 2 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
        </div>
      </section>
  )}

  function buildAbout() { return (
      <section id="om-oss" style={{ ...backdropStyle(shot, 0.72), padding: '80px 8%', textAlign: 'center' }}>
        <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 30, fontWeight: 700, color: '#ffffff', marginBottom: 18, fontFamily: F }} />
        <Txt as="p" t={content.aboutBody} style={{ fontSize: 16, color: 'rgba(255,255,255,0.86)', lineHeight: 1.9, maxWidth: 640, margin: '0 auto', fontFamily: F }} />
      </section>
  )}
}

/* ── Salongen — the room does the talking ──────────────────────────────────
   Two decks of header, then a photograph with nothing written across it, and
   a contact strip that rides along the bottom of the screen wherever the
   visitor has scrolled to. Built for the salon whose interior is the pitch. */
function FoyerSite({ c, content, th, base, industry, care, siteBase }: { c: TemplateColors; content: SiteContent; th: string; base: string; industry?: string; care?: CareAnswer | null; siteBase?: string }) {
  const cfg  = getIndConfig(industry)
  const room = backdropSrc(content, BACKDROPS.linne.src)
  const sep  = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)'

  return (
    <div style={{ background: c.bg, minHeight: '100vh', fontFamily: F }}>
      <SiteNav layout="foyer" c={c} content={content} th={th} base={base} />
      <PageSections blocks={{ hero: buildHero(), services: buildServices(), about: buildAbout() }} c={c} content={content} base={base} industry={industry} />
      <JsonLD content={content} industry={industry} slug={slugFrom(base)} care={care} base={siteBase} />
      <ContactBar c={c} content={content} />
      <Footer c={c} content={content} base={base} />
    </div>
  )

  function buildHero() { return (
    <>
      {/* The room, uncovered — nothing is written over it on purpose. Until
          there is a room to show, the band shrinks and carries the name
          instead: a tall empty strip of texture reads as a broken page. */}
      {isTexture(room) ? (
        <section style={{ ...backdropStyle(room, 0.34), minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase' as const, color: '#ffffff', textAlign: 'center', fontFamily: F, textShadow: '0 2px 18px rgba(0,0,0,0.55)' }}>
            {content.businessName}
          </p>
        </section>
      ) : (
        <section style={{ ...backdropStyle(room, 0.08), minHeight: '62vh' }} aria-label={content.businessName} />
      )}
      <section style={{ background: c.bg, padding: '56px 8% 44px', textAlign: 'center' }}>
        <Txt as="p" kicker t={content.kicker} style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' as const, color: c.a, marginBottom: 16, fontFamily: F }} />
        <Txt as="h1" t={content.heroHeading} style={{ fontSize: 40, fontWeight: 700, color: c.h, lineHeight: 1.2, maxWidth: 720, margin: '0 auto 18px', fontFamily: F }} />
        <Txt as="p" t={content.heroBody} style={{ fontSize: 17, color: c.s, lineHeight: 1.8, maxWidth: 580, margin: '0 auto 30px', fontFamily: F }} />
        <BookButton content={content} style={{ background: c.a, color: isDark(c.a) ? '#fff' : '#0a0a0a', padding: '15px 40px', fontSize: 14, fontWeight: 700, letterSpacing: 1, fontFamily: F, textDecoration: 'none', display: 'inline-block' }} />
      </section>
      <StatsBar c={c} content={content} cfg={cfg} th={th} />
    </>
  )}

  function buildServices() { return (
      <section id="prislista" style={{ background: c.b, padding: '68px 8%' }}>
        <Txt as="h2" t={cfgLabel(content.labels, cfg.svcHeading, 'svcHeading')} style={{ fontSize: 28, fontWeight: 700, color: c.h, textAlign: 'center', letterSpacing: 1, marginBottom: 34, fontFamily: F }} />
        <div data-grid="services" style={{ maxWidth: 660, margin: '0 auto' }}>
          {content.services.map((s, i) => (
            <div key={s.name} style={{ padding: '18px 0', borderTop: i === 0 ? 'none' : `1px solid ${sep}`, display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'baseline' }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: c.h, marginBottom: 4, fontFamily: F }}>{s.name}</h3>
                <p style={{ fontSize: 14, color: c.s, lineHeight: 1.6, fontFamily: F }}>{s.desc}</p>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: c.a, whiteSpace: 'nowrap' as const, fontFamily: F }}>{s.price}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 30 }}>
          {!!cfgLabel(content.labels, cfg.allLink, 'allLink') && (<a href={th} style={{ color: c.a, fontSize: 14, fontWeight: 700, fontFamily: F, textDecoration: 'none', borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2 }}>{cfgLabel(content.labels, cfg.allLink, 'allLink')}</a>)}
        </div>
      </section>
  )}

  function buildAbout() { return (
      <section id="om-oss" style={{ background: c.bg, padding: '68px 8%', textAlign: 'center' }}>
        <Txt as="h2" t={content.aboutTitle} style={{ fontSize: 28, fontWeight: 700, color: c.h, marginBottom: 16, fontFamily: F }} />
        <Txt as="p" t={content.aboutBody} style={{ fontSize: 16, color: c.s, lineHeight: 1.9, maxWidth: 640, margin: '0 auto', fontFamily: F }} />
      </section>
  )}
}

/* ── Export ─────────────────────────────────────────────────────────────── */

export function PreviewSite({
  template, industry, contentOverride, tjansterBase, care, siteBase,
}: {
  template:         Template
  industry:         string
  contentOverride?: SiteContent
  /** Base path for internal links — the published site lives at /s/<slug>,
   *  the template demo at /preview/<templateId>. */
  tjansterBase?:    string
  /** Wellness or treatment, for trades that straddle the two — it decides
   *  which schema.org parent the markup uses. Absent on template demos. */
  care?:            CareAnswer | null
  /** The address this page is being served on — their own domain when they
   *  have one. The markup names it, so the salon owns their own identity in
   *  search rather than pointing at a page of ours. */
  siteBase?:        string
}) {
  const rått = contentOverride ?? CONTENT[baseIndustry(industry)] ?? CONTENT.other

  /*
   * De utvalda tjänsterna löses upp mot prislistan en gång, här, innan någon
   * layout ser dem.
   *
   * Nio ställen renderar `services` — varje designs egen tjänsteruta plus
   * prislistans urval. Löste bara ett av dem upp namnen mot listan visade sidan
   * två olika uppsättningar samtidigt: rutan högst upp sålde "Klippning &
   * styling" ur en gammal branschmall medan prislistan under visade salongens
   * riktiga rader. Görs det på ett ställe kan de inte gå isär.
   */
  /*
   * Boka-knapparnas mål, uträknat en gång här — samma tanke som tjänsterna
   * ovan. Varje mall ritar sina egna knappar, och skulle var och en räkna ut
   * målet själv kunde två knappar med samma ord leda olika.
   *
   * Bara startsidan. Undersidorna renderas av andra komponenter som aldrig
   * sätter fältet, så deras knappar går till bokningen av sig själva — vilket
   * är rätt: den som redan klickat sig in på prissidan ska boka därifrån, inte
   * skickas tillbaka dit de står.
   */
  const raw: SiteContent = {
    ...rått,
    services: promoServices(rått, industry, promoSlots(template.layout)),
    ctaHref: ctaHrefFor(rått, sectionPageEnabled(rått, 'pricelist')
      ? `${tjansterBase ?? `/preview/${template.id}`}/tjanster`
      : undefined),
  }

  /* Same order as the colors below: the theme sets the surface, anything the
   * customer chose or uploaded replaces it. */
  const content: SiteContent = raw.backdrop || !template.backdrop ? raw : { ...raw, backdrop: template.backdrop }
  /* The customer's colors win over the template's — same merge the published
   * pages get from site-data, so preview and live can't drift apart. */
  const c: TemplateColors = { ...template.colors, ...(content.colorOverrides ?? {}) }
  const base    = `${tjansterBase ?? `/preview/${template.id}`}/tjanster`

  /* A customer whose price list lives on their booking page (Bokadirekt and
   * the like) keeps prices in ONE place — every price-list link then goes
   * there instead of to our internal pages. `base` stays internal: articles
   * and schema still belong to the site itself. */
  const external = content.pricelistMode === 'booking' && !!content.bookingUrl?.trim()
  /* Price-list links: the booking page when the list lives there, the own
   * /tjanster page when one exists, otherwise the list on the start page —
   * a published site without the own page must never link into a 404. */
  /* Skarp sajt, till skillnad från mallens demo. Testet var tidigare att
     basen börjar med /s/ — men en salong med egen domän har tom bas, för där
     är sajten roten. Då såg en riktig sajt ut som en demo och kunde länka in
     i en 404 som demon inte har. Demon är den enda som saknar bas. */
  const published = tjansterBase !== undefined
  /* Utan egen prissida får bokningslänken ta emot — den visar hela listan
     ändå. Ankaret är sista utvägen: det leder till mallens egen tjänsteruta,
     alltså dit besökaren redan tittar, och det hjälper ingen. */
  const th = external ? content.bookingUrl!.trim()
    : published && !sectionPageEnabled(content, 'pricelist')
      ? (content.bookingUrl?.trim() || '#prislista')
    : base

  const layout = (() => {
    switch (template.layout) {
      case 'split':     return <SplitSite     c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'editorial': return <EditorialSite c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'heritage':  return <HeritageSite  c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'luxury':    return <LuxurySite    c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'showcase':  return <ShowcaseSite  c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'direct':    return <DirectSite    c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'team':      return <TeamSite      c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'pole':      return <PoleSite      c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'grid':      return <GridSite      c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'workshop':  return <WorkshopSite  c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'sign':      return <SignSite      c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      case 'foyer':     return <FoyerSite     c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
      default:          return <CenteredSite  c={c} content={content} th={th} base={base} industry={industry} care={care} siteBase={siteBase} />
    }
  })()

  /* lang on the site itself, not just the document: a customer writing in
   * French gets a French-declared page without us owning a separate root.
   * The font variable rides on the wrapper — every text style in the layouts
   * resolves through it, so one uploaded font restyles the whole site. */
  return (
    <div className="kr-site" lang={content.siteLang || 'sv'} style={siteFontVars(content, template.font)}>
      <SiteStyles />
      <SiteFontFace content={content} />
      {layout}
    </div>
  )
}
