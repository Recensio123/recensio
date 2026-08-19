'use client'

import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { CONTENT as SITE_DEFAULTS } from '@/lib/siteExampleContent'
import Link from 'next/link'
import type { Template, TemplateColors } from '@/lib/templates'
import type { ServiceEntry, ServiceCategory } from '@/lib/services-data'
import type { Article } from '@/lib/articles'
import type { SocialLinks } from '@/lib/siteSocial'

/* ── Types ─────────────────────────────────────────────────────────── */

export type ServiceItem  = { name: string; desc: string; price: string }
export type TeamMember   = { name: string; title: string; image: string }
export type { ServiceEntry, ServiceCategory }

export type SiteContent = {
  businessName:   string
  tagline:        string
  kicker:         string
  heroHeading:    string
  heroBody:       string
  ctaText:        string
  /** Vart menyns boka-knapp leder: bokningen, eller prissidan när de vill
   *  att besökaren ser priserna först. Osatt = bokningen. */
  ctaTarget?:        'boka' | 'prislista'
  bookingUrl:     string
  services:       ServiceItem[]
  menuCategories: ServiceCategory[]
  aboutTitle:     string
  aboutBody:      string
  navLinks:       string[]
  phone:          string
  /** Salongens e-post. Frivillig — många vill hellre bli ringda, och en
   *  adress som ingen läser är sämre än ingen adress. */
  email?:          string
  hours:          string
  address:        string
  featured_reviews?: Array<{
    author:   string
    rating:   number
    text:     string
    title?:   string
    company?: string
    source?:  'google' | 'manual' | 'example'
  }>
  /* Öppen och inte låst till sex namn, av två skäl. Den publika sidans typ ser
     den så, och FEATURES_DEFAULT i sectionPages likaså — en låst form här gjorde
     att samma innehåll inte gick att skicka mellan panelen och sajten. Och en ny
     del ska inte kräva att den här listan skrivs om. */
  siteFeatures?: Record<string, boolean>
  sectionOrder?: string[]
  team?: TeamMember[]
  sectionPages?: Partial<Record<import('@/lib/sectionPages').SectionPageId, import('@/lib/sectionPages').SectionPage>>
  mediaLibrary?: string[]
  pricelistPreview?: 'promo' | 'full'
  blogCount?: 3 | 6
  galleryCount?: 3 | 6
  /** One description per gallery image — what Google and screen readers see. */
  gallery_alts?: string[]
  gallery_images?: string[]
  logo?: string
  articles?: Article[]
  /** The layout's own picture slots — see templateImageSlots. */
  heroImage?:    string
  featureImage?: string
  aboutImage?:   string
  /** The surface a backdrop design stands on — their own room beats a texture. */
  backdropImage?: string
  /** Which drawn texture, when they have uploaded nothing. */
  backdrop?:     string
  /** Search-result overrides; empty means the auto-generated ones are used. */
  seo?: { title?: string; description?: string }
  /** Where the price list lives — on the site or on the booking page. */
  pricelistMode?: 'site' | 'booking'
  /** Overrides for the site's own headings — empty means Swedish default. */
  labels?: Record<string, string>
  siteLang?: string
  social?: SocialLinks
  stats?: { num: string; label: string }[]
  colorOverrides?: Partial<TemplateColors>
  textColorPicked?: boolean
  customFont?: { url: string; name: string }
  fontPreset?: string
}

type FeatureId = 'booking' | 'pricelist' | 'gallery' | 'contact' | 'blog' | 'reviews'
const SITE_FEATURES: { id: FeatureId; label: string; desc: string; icon: string }[] = [
  { id: 'booking',   label: 'Bokningssystem',   desc: 'Kunder bokar tider direkt på sidan',  icon: '◻' },
  { id: 'pricelist', label: 'Prislista / Meny',  desc: 'Visa tjänster och priser tydligt',    icon: '◈' },
  { id: 'gallery',   label: 'Bildgalleri',       desc: 'Visa upp ditt arbete med foton',      icon: '⬡' },
  { id: 'contact',   label: 'Kontaktformulär',   desc: 'Kunder kan skicka meddelanden',       icon: '✉' },
  { id: 'blog',      label: 'Blogg & Artiklar',  desc: 'Dela nyheter, tips och guider',       icon: '▤' },
  { id: 'reviews',   label: 'Kundrecensioner',   desc: 'Lyft fram dina bästa omdömen',        icon: '✦' },
]
const DEFAULT_FEATURES: Record<FeatureId, boolean> = {
  booking: true, pricelist: true, gallery: true, contact: true, blog: false, reviews: false,
}

/* ── Mock reviews — swap with live GBP data in a later phase ───────── */

export const MOCK_REVIEWS = [
  { author: 'Anna Lindström',  rating: 5, text: 'Fantastiskt bemötande och resultat som överträffade alla förväntningar. Kommer definitivt tillbaka!' },
  { author: 'Erik Johansson',  rating: 5, text: 'Professionellt och personligt. Man känner sig verkligen välkommen från första stund.' },
  { author: 'Maria Karlsson',  rating: 5, text: 'Bästa upplevelsen på länge. Kunnig personal och en trevlig, välkomnande atmosfär.' },
  { author: 'Johan Andersson', rating: 5, text: 'Rekommenderar varmt. Hög kvalitet och rättvist pris — har inte hittat något bättre.' },
  { author: 'Sofia Nilsson',   rating: 4, text: 'Mycket nöjd med resultatet. Personalen är hjälpsam och lyhörd för önskemål.' },
  { author: 'Peter Holm',      rating: 5, text: 'Alltid lika bra service. Jag har gått hit i tre år och det är konsekvent hög klass.' },
  { author: 'Lena Bergström',  rating: 4, text: 'Trevlig miljö och duktiga medarbetare. Bokar redan nästa gång utan tvekan.' },
  { author: 'Marcus Svensson', rating: 5, text: 'Exceptionellt hantverk och ett genuint engagemang för kundnöjdhet. Imponerande.' },
]
export type MockReview = typeof MOCK_REVIEWS[number]

export type Testimonial = {
  author:   string
  rating:   number
  text:     string
  title?:   string
  company?: string
  source?:  'google' | 'manual' | 'example'
}

/* ── Defaults per industry ─────────────────────────────────────────── */


/* ── Helpers ───────────────────────────────────────────────────────── */

function isDark(hex: string): boolean {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return true
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'

/* ── E: inline-editable text element ──────────────────────────────── */

function E({
  value,
  onChange,
  as: Tag = 'span',
  style,
  multiline = false,
}: {
  value: string
  onChange: (v: string) => void
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div'
  style?: CSSProperties
  multiline?: boolean
}) {
  const ref     = useRef<any>(null)
  const mounted = useRef(false)
  const [on, setOn] = useState(false)
  const [hv, setHv] = useState(false)

  useEffect(() => {
    if (!mounted.current && ref.current) {
      ref.current.textContent = value
      mounted.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onMouseEnter={() => setHv(true)}
      onMouseLeave={() => setHv(false)}
      onFocus={() => { setOn(true); setHv(false) }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        setOn(false)
        onChange(e.currentTarget.textContent ?? '')
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        }
      }}
      style={{
        ...style,
        outline: 'none',
        cursor: 'text',
        boxShadow: on
          ? 'inset 0 -2px 0 rgba(99,102,241,0.85)'
          : hv
            ? 'inset 0 -2px 0 rgba(99,102,241,0.35)'
            : 'inset 0 -2px 0 transparent',
        transition: 'box-shadow 0.12s',
      }}
    />
  )
}

/* ── Gallery editor ────────────────────────────────────────────────── */

function GalleryEditor({
  c,
  images,
  onImageChange,
  alts = [],
  onAltChange,
  count = 6,
  sectionBg,
}: {
  c: TemplateColors
  images: string[]
  onImageChange: (i: number, url: string) => void
  /** One description per image — what Google and screen readers see. */
  alts?: string[]
  onAltChange?: (i: number, v: string) => void
  count?: 3 | 6
  sectionBg?: string
}) {
  const bg  = sectionBg ?? c.b
  const sep = isDark(bg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const empty = isDark(bg) ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'

  return (
    <section style={{ background: bg, padding: '80px 8%' }}>
      <p style={{ textAlign: 'center', fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16, fontFamily: F }}>
        Vårt arbete
      </p>
      <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: c.h, marginBottom: 40, letterSpacing: -0.8, fontFamily: F }}>
        Bildgalleri
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {images.slice(0, count).map((img, i) => (
          <div key={i}>
          <label
            style={{
              display: 'block',
              cursor: 'pointer',
              position: 'relative',
              aspectRatio: '4/3',
              overflow: 'hidden',
              borderRadius: 10,
              background: img ? 'transparent' : empty,
              border: img ? 'none' : `2px dashed ${sep}`,
            }}
          >
            {img ? (
              <>
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); onImageChange(i, '') }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 28, height: 28,
                    background: 'rgba(0,0,0,0.7)', color: '#fff',
                    border: 'none', borderRadius: '50%',
                    fontSize: 16, fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="6" width="20" height="14" rx="2" stroke={c.s} strokeWidth="1.4" strokeOpacity="0.4" />
                  <circle cx="12" cy="13" r="3" stroke={c.s} strokeWidth="1.4" strokeOpacity="0.4" />
                  <path d="M9 6L10.5 4h3L15 6" stroke={c.s} strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.4" />
                </svg>
                <span style={{ fontSize: 12, color: c.s, opacity: 0.55, fontFamily: F }}>Ladda upp bild</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = ev => onImageChange(i, ev.target?.result as string)
                reader.readAsDataURL(file)
                e.target.value = ''
              }}
            />
          </label>
          {/* The description Google reads. Asked for right where the image
              was just uploaded — the only moment anyone fills these in. */}
          {img && onAltChange && (
            <input
              value={alts[i] ?? ''}
              onChange={e => onAltChange(i, e.target.value)}
              placeholder="Beskriv bilden — t.ex. 'Balayage på långt hår'"
              style={{
                width: '100%', marginTop: 6, padding: '7px 10px',
                fontSize: 12, fontFamily: F, borderRadius: 6,
                border: `1px solid ${sep}`, background: 'transparent',
                color: isDark(bg) ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
              }}
            />
          )}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Google search preview ─────────────────────────────────────────── */

/*
 * How the salon will look in a Google result, editable in place. The
 * generated title and description are good defaults, but the customer knows
 * their own selling points — this is where they get to use them. Length
 * limits mirror what Google actually shows before truncating.
 */
/* The words the example search phrase is built from — the hint should sound
   like the customer's own trade, not like a hairdresser's for everyone. */
const SERP_EXAMPLE: Record<string, string> = {
  salon:      'Frisör Södermalm — balayage & klippning',
  beauty:     'Hudvård Södermalm — ansiktsbehandling & fransar',
  spa:        'Spa Södermalm — massage & behandlingar',
  fitness:    'Gym Södermalm — PT & gruppträning',
  restaurant: 'Restaurang Södermalm — lunch & middag',
  craftsman:  'Snickare Södermalm — renovering & kök',
  cleaning:   'Städfirma Södermalm — hemstäd & flyttstäd',
}

export function GoogleSerpEditor({
  content, siteSlug, industry, onChange,
}: {
  content:   SiteContent
  siteSlug:  string
  industry?: string
  onChange: (seo: { title?: string; description?: string }) => void
}) {
  const example   = SERP_EXAMPLE[industry ?? ''] ?? 'Frisör Södermalm — balayage & klippning'
  const autoTitle = `${content.businessName} — ${content.tagline}${content.address ? ` | ${content.address}` : ''}`
  const autoDesc  = content.heroBody
  const title = content.seo?.title?.trim() || autoTitle
  const desc  = content.seo?.description?.trim() || autoDesc
  const TITLE_MAX = 60
  const DESC_MAX  = 155

  const count = (v: string, max: number) => (
    <span style={{ fontSize: 11, fontFamily: F, color: v.length > max ? '#f87171' : '#64748b' }}>
      {v.length}/{max}
    </span>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', fontFamily: F, marginBottom: 6 }}>
        Så syns du på Google
      </h2>
      <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, marginBottom: 24 }}>
        {/* Löftet var för stort. "Din annonsyta i sökresultatet" läser som en
            garanti, och Google byter ut beskrivningen oftare än de behåller den
            — de sätter ihop ett utdrag ur sidan som passar just den sökning som
            gjordes. Den som skrivit sin text, sökt på sig själv och sett något
            annat tror att något är trasigt. Det som alltid gäller är delningen:
            där är det vår text som följer med. */}
        Syns när någon delar din länk, och används ofta av Google i sökresultatet.
        Lämnar du fälten tomma används texterna nedan automatiskt.
      </p>

      {/* The result, as Google renders it */}
      <div style={{ background: '#ffffff', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
        <p style={{ fontSize: 12, color: '#202124', fontFamily: 'arial, sans-serif', marginBottom: 2 }}>
          kiterank.se<span style={{ color: '#5f6368' }}> › s › {siteSlug}</span>
        </p>
        <p style={{ fontSize: 20, color: '#1a0dab', fontFamily: 'arial, sans-serif', lineHeight: 1.3, marginBottom: 4, cursor: 'pointer' }}>
          {title.length > TITLE_MAX ? title.slice(0, TITLE_MAX - 1).trimEnd() + '…' : title}
        </p>
        <p style={{ fontSize: 14, color: '#4d5156', fontFamily: 'arial, sans-serif', lineHeight: 1.55 }}>
          {desc.length > DESC_MAX ? desc.slice(0, DESC_MAX - 1).trimEnd() + '…' : desc}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: F }}>Rubrik i sökresultatet</label>
            {count(content.seo?.title ?? '', TITLE_MAX)}
          </div>
          <input
            value={content.seo?.title ?? ''}
            onChange={e => onChange({ ...content.seo, title: e.target.value })}
            placeholder={autoTitle}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: F, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' }}
          />
          {/* The single highest-leverage field the customer edits — it deserves
              one concrete sentence of guidance, not silence */}
          <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, margin: '6px 0 0' }}>
            Skriv vad du gör + var, t.ex. ”{example}”. Det är exakt så nya kunder söker.
          </p>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: F }}>Beskrivning i sökresultatet</label>
            {count(content.seo?.description ?? '', DESC_MAX)}
          </div>
          <textarea
            value={content.seo?.description ?? ''}
            onChange={e => onChange({ ...content.seo, description: e.target.value })}
            placeholder={autoDesc}
            rows={3}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: F, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', resize: 'vertical' }}
          />
          <p style={{ fontSize: 12, color: '#64748b', fontFamily: F, marginTop: 6, lineHeight: 1.5 }}>
            Skriv det som får någon att välja dig: vad du är bäst på, var du finns och att man kan boka online.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Shared editable props ─────────────────────────────────────────── */

type EP = {
  c:               TemplateColors
  content:         SiteContent
  images:          string[]
  logo:            string
  patch:           (k: keyof SiteContent, v: string) => void
  patchSvc:        (i: number, f: keyof ServiceItem, v: string) => void
  patchNav:        (i: number, v: string) => void
  setImage:        (i: number, url: string) => void
  alts:            string[]
  setAlt:          (i: number, v: string) => void
  setLogo:         (url: string) => void
  featuredReviews:    Testimonial[]
  toggleReview:       (r: MockReview) => void
  addTestimonial:     (t: Testimonial) => void
  removeTestimonial:  (i: number) => void
  siteFeatures:    Record<FeatureId, boolean>
  sectionOrder:    FeatureId[]
  moveSection:     (id: FeatureId, dir: -1 | 1) => void
  patchTeam:       (i: number, f: keyof TeamMember, v: string) => void
  addTeamMember:   () => void
  removeTeamMember:(i: number) => void
  sectionBg?:      string
}

/* ── Logo / business-name switcher ─────────────────────────────────── */

function LogoOrName({
  content, patch, logo, setLogo, nameStyle, logoHeight = 34,
}: {
  content:     SiteContent
  patch:       (k: keyof SiteContent, v: string) => void
  logo:        string
  setLogo:     (url: string) => void
  nameStyle?:  CSSProperties
  logoHeight?: number
}) {
  const [hover, setHover] = useState(false)

  function readFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (logo) {
    return (
      <div
        style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <img
          src={logo}
          alt={content.businessName}
          style={{ height: logoHeight, maxWidth: 180, objectFit: 'contain', display: 'block' }}
        />
        {hover && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            borderRadius: 4,
          }}>
            <label style={{ cursor: 'pointer', color: '#fff', fontSize: 11, fontFamily: F, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 6L10.5 4h3L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Byt
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={readFile} />
            </label>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>|</span>
            <button type="button" onClick={() => setLogo('')}
              style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: F, padding: 0 }}>
              Ta bort
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <E value={content.businessName} onChange={v => patch('businessName', v)} style={nameStyle} />
  )
}

/* ── Editable nav ──────────────────────────────────────────────────── */

function ENav({ c, content, patch, patchNav, logo, setLogo, centered, minimal, siteFeatures }: EP & { centered?: boolean; minimal?: boolean }) {
  const btnBg    = c.a
  const btnFg    = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const bg       = c.nav
  const fg       = isDark(bg) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'
  const nameColor = isDark(bg) ? '#ffffff' : c.h
  const bdr      = isDark(bg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const nameStyle = { fontSize: 20, fontWeight: 800, color: nameColor, fontFamily: F, letterSpacing: -0.5 } as CSSProperties

  if (centered) {
    return (
      <nav style={{ background: bg, padding: '0 8%', borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, gap: 40, flexWrap: 'wrap' }}>
          {[0, 1].map(i => (
            <E key={i} value={content.navLinks[i] ?? ''} onChange={v => patchNav(i, v)}
              style={{ color: fg, fontSize: 14, fontFamily: F }} />
          ))}
          <LogoOrName content={content} patch={patch} logo={logo} setLogo={setLogo} nameStyle={nameStyle} />
          {[2, 3].map(i => (
            <E key={i} value={content.navLinks[i] ?? ''} onChange={v => patchNav(i, v)}
              style={{ color: fg, fontSize: 14, fontFamily: F }} />
          ))}
          {siteFeatures?.gallery  && <span style={{ color: fg, fontSize: 14, fontFamily: F }}>Galleri</span>}
          {siteFeatures?.blog     && <span style={{ color: fg, fontSize: 14, fontFamily: F }}>Blogg</span>}
        </div>
      </nav>
    )
  }

  if (minimal) {
    return (
      <nav style={{ background: bg, padding: '0 10%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <LogoOrName content={content} patch={patch} logo={logo} setLogo={setLogo} nameStyle={nameStyle} logoHeight={30} />
        <div style={{ display: 'flex', gap: 32 }}>
          {[0, 1, 2].map(i => (
            <E key={i} value={content.navLinks[i] ?? ''} onChange={v => patchNav(i, v)}
              style={{ color: fg, fontSize: 13, fontFamily: F }} />
          ))}
          {siteFeatures?.gallery  && <span style={{ color: fg, fontSize: 13, fontFamily: F }}>Galleri</span>}

          {siteFeatures?.blog     && <span style={{ color: fg, fontSize: 13, fontFamily: F }}>Blogg</span>}
        </div>
      </nav>
    )
  }

  return (
    <nav style={{ background: bg, padding: '0 8%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, borderBottom: `1px solid ${bdr}` }}>
      <LogoOrName content={content} patch={patch} logo={logo} setLogo={setLogo} nameStyle={nameStyle} />
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <E key={i} value={content.navLinks[i] ?? ''} onChange={v => patchNav(i, v)}
            style={{ color: fg, fontSize: 14, fontFamily: F }} />
        ))}
        {siteFeatures?.gallery  && <span style={{ color: fg, fontSize: 14, fontFamily: F }}>Galleri</span>}

        {siteFeatures?.blog     && <span style={{ color: fg, fontSize: 14, fontFamily: F }}>Blogg</span>}
        <div style={{ background: btnBg, color: btnFg, padding: '10px 24px', borderRadius: 6, fontFamily: F }}>
          <E value={content.ctaText} onChange={v => patch('ctaText', v)}
            style={{ color: btnFg, fontSize: 14, fontWeight: 700, fontFamily: F }} />
        </div>
      </div>
    </nav>
  )
}

/* ── Editable service cards ────────────────────────────────────────── */

function EServiceCards({ c, content, patchSvc, cols = 3 }: EP & { cols?: number }) {
  const cardBg  = c.b
  const cardSep = isDark(cardBg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24 }}>
      {content.services.map((s, i) => (
        <div key={i} style={{ background: cardBg, padding: '32px 28px', borderRadius: 12, border: `1px solid ${cardSep}` }}>
          <E as="h3" value={s.name} onChange={v => patchSvc(i, 'name', v)}
            style={{ fontSize: 18, fontWeight: 700, color: c.h, marginBottom: 10, fontFamily: F }} />
          <E as="p" value={s.desc} onChange={v => patchSvc(i, 'desc', v)} multiline
            style={{ fontSize: 14, color: c.s, lineHeight: 1.65, marginBottom: 20, fontFamily: F }} />
          <E value={s.price} onChange={v => patchSvc(i, 'price', v)}
            style={{ fontSize: 14, fontWeight: 700, color: c.a, fontFamily: F }} />
        </div>
      ))}
    </div>
  )
}

/* ── Editable footer ───────────────────────────────────────────────── */

/* ── Shared: Google reviews section ────────────────────────────────── */

function EReviews({ c, featuredReviews, sectionBg }: EP) {
  if (!featuredReviews.length) return null
  const bg     = sectionBg ?? c.b
  const dark   = isDark(bg)
  const fgH    = dark ? '#ffffff' : '#0a0a0a'
  const fgS    = dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const cardBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  const divBdr = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  return (
    <section style={{ background: bg, padding: '72px 8%' }}>
      <p style={{ fontSize: 11, color: c.a, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12, fontFamily: F }}>Omdömen</p>
      <h2 style={{ fontSize: 32, fontWeight: 800, color: fgH, marginBottom: 40, letterSpacing: -0.5, fontFamily: F }}>Vad kunderna säger</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        {featuredReviews.map((r, i) => (
          <div key={i} style={{ background: cardBg, borderRadius: 12, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {r.source !== 'manual' && (
              <div style={{ color: '#fbbf24', fontSize: 15, letterSpacing: 2 }}>
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </div>
            )}
            {r.source === 'manual' && (
              <div style={{ fontSize: 32, color: c.a, lineHeight: 0.8, fontFamily: 'Georgia, serif' }}>&ldquo;</div>
            )}
            <p style={{ fontSize: 15, color: fgS, lineHeight: 1.7, fontFamily: F, flex: 1 }}>{r.text}</p>
            <div style={{ paddingTop: 8, borderTop: `1px solid ${divBdr}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: fgH, fontFamily: F }}>{r.author}</span>
                  {(r.title || r.company) && (
                    <p style={{ fontSize: 11, color: fgS, fontFamily: F, marginTop: 2 }}>
                      {[r.title, r.company].filter(Boolean).join(' · ')}
                    </p>
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
          </div>
        ))}
      </div>
    </section>
  )
}

function ECtaBanner({ c, content, patch }: EP) {
  const bg    = c.a
  const dark  = isDark(bg)
  const fg    = dark ? '#ffffff' : '#0a0a0a'
  const fgSub = dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  return (
    <section style={{ background: bg, padding: '80px 8%', textAlign: 'center' }}>
      <h2 style={{ fontSize: 36, fontWeight: 800, color: fg, marginBottom: 16, letterSpacing: -0.8, fontFamily: F }}>
        Redo att komma igång?
      </h2>
      <p style={{ fontSize: 16, color: fgSub, marginBottom: 36, fontFamily: F }}>
        <E value={content.phone}   onChange={v => patch('phone', v)}   style={{ color: fgSub, fontFamily: F }} />
        {'  ·  '}
        <E value={content.address} onChange={v => patch('address', v)} style={{ color: fgSub, fontFamily: F }} />
      </p>
      <div style={{ display: 'inline-block', background: dark ? '#ffffff' : '#0a0a0a', padding: '14px 40px', borderRadius: 8 }}>
        <E value={content.ctaText} onChange={v => patch('ctaText', v)}
          style={{ color: dark ? '#0a0a0a' : '#ffffff', fontSize: 15, fontWeight: 700, fontFamily: F }} />
      </div>
    </section>
  )
}

function EFooter({ c, content, patch, logo }: EP) {
  const footerBg  = isDark(c.bg) ? c.b : (isDark(c.nav) ? c.nav : c.b)
  const fg        = isDark(footerBg) ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const fgStrong  = isDark(footerBg) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
  const bdr       = isDark(footerBg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  return (
    <footer style={{ background: footerBg, padding: '48px 8%', borderTop: `1px solid ${bdr}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}>
        <div>
          {logo
            ? <img src={logo} alt={content.businessName}
                style={{ height: 36, maxWidth: 160, objectFit: 'contain', display: 'block', marginBottom: 8 }} />
            : <E as="p" value={content.businessName} onChange={v => patch('businessName', v)}
                style={{ fontSize: 16, fontWeight: 800, color: fgStrong, marginBottom: 8, fontFamily: F }} />
          }
          <E as="p" value={content.tagline} onChange={v => patch('tagline', v)}
            style={{ fontSize: 13, color: fg, fontFamily: F }} />
        </div>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontFamily: F }}>Kontakt</p>
            <E as="p" value={content.phone} onChange={v => patch('phone', v)}
              style={{ fontSize: 13, color: fg, marginBottom: 6, fontFamily: F }} />
            <E as="p" value={content.address} onChange={v => patch('address', v)}
              style={{ fontSize: 13, color: fg, fontFamily: F }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontFamily: F }}>Öppettider</p>
            <E as="p" value={content.hours} onChange={v => patch('hours', v)}
              style={{ fontSize: 13, color: fg, fontFamily: F }} />
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${bdr}`, marginTop: 40, paddingTop: 24, fontSize: 12, color: fg, fontFamily: F }}>
        © 2025 {content.businessName}
      </div>
    </footer>
  )
}

/* ── Image placeholder (non-editable decorative) ───────────────────── */

function ImgPlaceholder({ c, height = 380, radius = 16 }: { c: TemplateColors; height?: number; radius?: number }) {
  return (
    <div style={{ background: c.b, borderRadius: radius, height, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '35%', left: '30%', width: 180, height: 180, borderRadius: '50%', background: c.a, opacity: 0.12 }} />
      <div style={{ position: 'absolute', bottom: 40, right: 30, width: 100, height: 100, borderRadius: '50%', background: c.a, opacity: 0.08 }} />
    </div>
  )
}

/* ── Layout: Centered ──────────────────────────────────────────────── */

function EditableCentered(ep: EP) {
  const { c, content, patch, patchSvc } = ep
  const btnBg = c.a
  const btnFg = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  return (
    <div style={{ background: c.bg, minHeight: '100vh' }}>
      <ENav {...ep} />
      <section style={{ background: c.bg, padding: '110px 10%', textAlign: 'center' }}>
        <E value={content.kicker} onChange={v => patch('kicker', v)}
          style={{ color: c.a, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20, fontFamily: F, display: 'block' }} />
        <E as="h1" value={content.heroHeading} onChange={v => patch('heroHeading', v)}
          style={{ fontSize: 68, fontWeight: 800, color: c.h, lineHeight: 1.06, maxWidth: 760, margin: '0 auto 24px', letterSpacing: -2, fontFamily: F, display: 'block' }} />
        <E as="p" value={content.heroBody} onChange={v => patch('heroBody', v)} multiline
          style={{ fontSize: 20, color: c.s, maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.7, fontFamily: F }} />
        <div style={{ display: 'inline-block', background: btnBg, color: btnFg, padding: '16px 40px', borderRadius: 8 }}>
          <E value={content.ctaText} onChange={v => patch('ctaText', v)}
            style={{ color: btnFg, fontSize: 16, fontWeight: 700, fontFamily: F }} />
          <span style={{ color: btnFg, fontSize: 16, fontWeight: 700 }}> →</span>
        </div>
      </section>
      <section style={{ background: c.bg, padding: '72px 8%', borderTop: `1px solid ${isDark(c.bg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <p style={{ textAlign: 'center', fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12, fontFamily: F }}>Hur det fungerar</p>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: c.h, marginBottom: 56, letterSpacing: -0.8, fontFamily: F }}>Tre enkla steg</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48, maxWidth: 860, margin: '0 auto' }}>
          {content.services.slice(0, 3).map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 64, fontWeight: 900, color: c.a, opacity: 0.15, lineHeight: 1, marginBottom: 16, fontFamily: F }}>0{i + 1}</p>
              <E as="h3" value={s.name} onChange={v => patchSvc(i, 'name', v)} style={{ fontSize: 18, fontWeight: 700, color: c.h, marginBottom: 10, fontFamily: F, display: 'block' }} />
              <E as="p" value={s.desc} onChange={v => patchSvc(i, 'desc', v)} multiline style={{ fontSize: 14, color: c.s, lineHeight: 1.65, fontFamily: F }} />
            </div>
          ))}
        </div>
      </section>
      <MovableSections ep={ep} />
      <ECtaBanner {...ep} />
      <EFooter {...ep} />
    </div>
  )
}

/* ── Layout: Split ─────────────────────────────────────────────────── */

function EditableSplit(ep: EP) {
  const { c, content, patch } = ep
  const btnBg = c.a
  const btnFg = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const outlineBdr = isDark(c.bg) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
  return (
    <div style={{ background: c.bg, minHeight: '100vh' }}>
      <ENav {...ep} />
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 560, background: c.bg }}>
        <div style={{ padding: '80px 8%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <E value={content.kicker} onChange={v => patch('kicker', v)}
            style={{ color: c.a, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20, fontFamily: F, display: 'block' }} />
          <E as="h1" value={content.heroHeading} onChange={v => patch('heroHeading', v)}
            style={{ fontSize: 56, fontWeight: 800, color: c.h, lineHeight: 1.1, marginBottom: 24, letterSpacing: -1.5, fontFamily: F, display: 'block' }} />
          <E as="p" value={content.heroBody} onChange={v => patch('heroBody', v)} multiline
            style={{ fontSize: 18, color: c.s, lineHeight: 1.75, marginBottom: 40, maxWidth: 420, fontFamily: F }} />
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ background: btnBg, padding: '14px 32px', borderRadius: 8, display: 'inline-block' }}>
              <E value={content.ctaText} onChange={v => patch('ctaText', v)}
                style={{ color: btnFg, fontSize: 15, fontWeight: 700, fontFamily: F }} />
            </div>
            <div style={{ background: 'transparent', padding: '14px 24px', borderRadius: 8, border: `1px solid ${outlineBdr}`, display: 'inline-block' }}>
              <span style={{ color: c.h, fontSize: 15, fontFamily: F }}>Läs mer</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '40px 8% 40px 4%', display: 'flex', alignItems: 'center' }}>
          <ImgPlaceholder c={c} height={440} radius={20} />
        </div>
      </section>
      <MovableSections ep={ep} />
      <ECtaBanner {...ep} />
      <EFooter {...ep} />
    </div>
  )
}

/* ── Layout: Editorial ─────────────────────────────────────────────── */

function EditableEditorial(ep: EP) {
  const { c, content, patch } = ep
  const btnBg  = c.a
  const btnFg  = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  return (
    <div style={{ background: c.bg, minHeight: '100vh' }}>
      <ENav {...ep} minimal />
      <section style={{ padding: '96px 8% 80px', borderBottom: `1px solid ${divider}` }}>
        <E value={content.kicker} onChange={v => patch('kicker', v)}
          style={{ fontSize: 12, color: c.a, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 32, fontFamily: F, display: 'block' }} />
        <E as="h1" value={content.heroHeading} onChange={v => patch('heroHeading', v)}
          style={{ fontSize: 88, fontWeight: 900, color: c.h, lineHeight: 0.98, letterSpacing: -3, maxWidth: 860, marginBottom: 48, fontFamily: F, display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
          <E as="p" value={content.heroBody} onChange={v => patch('heroBody', v)} multiline
            style={{ fontSize: 18, color: c.s, lineHeight: 1.7, maxWidth: 480, fontFamily: F }} />
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ background: btnBg, padding: '16px 40px', display: 'inline-block' }}>
              <E value={content.ctaText} onChange={v => patch('ctaText', v)}
                style={{ color: btnFg, fontSize: 15, fontWeight: 700, fontFamily: F }} />
            </div>
            <div style={{ background: 'transparent', padding: '16px 32px', border: `1px solid ${divider}`, display: 'inline-block' }}>
              <span style={{ color: c.h, fontSize: 15, fontFamily: F }}>Se tjänster</span>
            </div>
          </div>
        </div>
      </section>
      <MovableSections ep={ep} />
      <ECtaBanner {...ep} />
      <EFooter {...ep} />
    </div>
  )
}

/* ── Layout: Heritage ──────────────────────────────────────────────── */

function EditableHeritage(ep: EP) {
  const { c, content, patch } = ep
  const btnBg   = c.a
  const btnFg   = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const bannerBg = isDark(c.nav) ? c.nav : c.b
  const bannerFg = isDark(bannerBg) ? '#ffffff' : c.h
  const bannerSub = isDark(bannerBg) ? 'rgba(255,255,255,0.65)' : c.s
  return (
    <div style={{ background: c.bg, minHeight: '100vh' }}>
      <ENav {...ep} centered />
      <section style={{ background: bannerBg, padding: '80px 10%', textAlign: 'center' }}>
        <E value={content.kicker} onChange={v => patch('kicker', v)}
          style={{ fontSize: 12, color: isDark(bannerBg) ? 'rgba(255,255,255,0.5)' : c.s, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16, fontFamily: F, display: 'block' }} />
        <E as="h1" value={content.heroHeading} onChange={v => patch('heroHeading', v)}
          style={{ fontSize: 54, fontWeight: 800, color: bannerFg, lineHeight: 1.12, maxWidth: 680, margin: '0 auto 24px', letterSpacing: -1, fontFamily: F, display: 'block' }} />
        <E as="p" value={content.heroBody} onChange={v => patch('heroBody', v)} multiline
          style={{ fontSize: 18, color: bannerSub, maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.7, fontFamily: F }} />
        <div style={{ display: 'inline-block', background: btnBg, padding: '14px 36px', borderRadius: 4 }}>
          <E value={content.ctaText} onChange={v => patch('ctaText', v)}
            style={{ color: btnFg, fontSize: 15, fontWeight: 700, letterSpacing: 0.5, fontFamily: F }} />
        </div>
      </section>
      <section style={{ background: isDark(c.nav) ? c.nav : c.b, padding: '48px 8%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
          {(['Telefon', 'Öppettider', 'Besöksadress'] as const).map((label, i) => {
            const val = i === 0 ? content.phone : i === 1 ? content.hours : content.address
            const key = i === 0 ? 'phone' : i === 1 ? 'hours' : 'address'
            return (
              <div key={label}>
                <p style={{ fontSize: 11, color: isDark(c.nav) ? 'rgba(255,255,255,0.4)' : c.s, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10, fontFamily: F }}>{label}</p>
                <E as="p" value={val} onChange={v => patch(key as keyof typeof content, v)}
                  style={{ fontSize: 16, fontWeight: 600, color: isDark(c.nav) ? '#ffffff' : c.h, fontFamily: F }} />
              </div>
            )
          })}
        </div>
      </section>
      <MovableSections ep={ep} />
      <ECtaBanner {...ep} />
      <EFooter {...ep} />
    </div>
  )
}

/* ── Layout: Luxury ────────────────────────────────────────────────── */

function EditableLuxury(ep: EP) {
  const { c, content, patch } = ep
  const btnBg   = c.a
  const btnFg   = isDark(btnBg) ? '#ffffff' : '#0a0a0a'
  const divider = isDark(c.bg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const navFg      = isDark(c.nav) ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
  const navLogoClr = isDark(c.nav) ? '#ffffff' : c.h
  return (
    <div style={{ background: c.bg, minHeight: '100vh' }}>
      <nav style={{ background: c.nav, padding: '0 8%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, gap: 48 }}>
          {[0, 1].map(i => (
            <E key={i} value={content.navLinks[i] ?? ''} onChange={v => ep.patchNav(i, v)}
              style={{ color: navFg, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: F }} />
          ))}
          <div style={{ margin: '0 16px' }}>
            <LogoOrName content={content} patch={patch} logo={ep.logo} setLogo={ep.setLogo}
              nameStyle={{ fontSize: 22, fontWeight: 800, color: navLogoClr, fontFamily: F, letterSpacing: -0.5 }} />
          </div>
          {[2, 3].map(i => (
            <E key={i} value={content.navLinks[i] ?? ''} onChange={v => ep.patchNav(i, v)}
              style={{ color: navFg, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: F }} />
          ))}
          {ep.siteFeatures?.gallery  && <span style={{ color: navFg, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: F }}>Galleri</span>}

          {ep.siteFeatures?.blog     && <span style={{ color: navFg, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: F }}>Blogg</span>}
        </div>
        <div style={{ height: 1, background: c.a, opacity: 0.5 }} />
      </nav>
      <section style={{ padding: '120px 10%', textAlign: 'center', background: c.bg }}>
        <E value={content.kicker} onChange={v => patch('kicker', v)}
          style={{ fontSize: 11, color: c.a, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 32, fontFamily: F, display: 'block' }} />
        <E as="h1" value={content.heroHeading} onChange={v => patch('heroHeading', v)}
          style={{ fontSize: 64, fontWeight: 300, color: c.h, lineHeight: 1.15, maxWidth: 780, margin: '0 auto 32px', letterSpacing: -1, fontFamily: F, display: 'block' }} />
        <E as="p" value={content.heroBody} onChange={v => patch('heroBody', v)} multiline
          style={{ fontSize: 17, color: c.s, maxWidth: 460, margin: '0 auto 48px', lineHeight: 1.8, fontFamily: F }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 1, background: c.a }} />
          <div style={{ background: btnBg, padding: '14px 40px', display: 'inline-block' }}>
            <E value={content.ctaText} onChange={v => patch('ctaText', v)}
              style={{ color: btnFg, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F }} />
          </div>
          <div style={{ width: 40, height: 1, background: c.a }} />
        </div>
      </section>
      <MovableSections ep={ep} />
      <ECtaBanner {...ep} />
      <EFooter {...ep} />
    </div>
  )
}

/* ── Menu editor ───────────────────────────────────────────────────── */

type MenuEditorProps = {
  categories: ServiceCategory[]
  patchCatName:   (ci: number, v: string) => void
  patchItemField: (ci: number, ii: number, f: keyof ServiceEntry, v: string) => void
  toggleItemBool: (ci: number, ii: number, f: 'hidePrice' | 'hideDuration') => void
  toggleAllBool:  (f: 'hidePrice' | 'hideDuration') => void
  addCategory:    () => void
  removeCategory: (ci: number) => void
  addItem:        (ci: number) => void
  removeItem:     (ci: number, ii: number) => void
  /** Narrow-panel layout: items collapse to name rows, expand one at a time. */
  compact?:       boolean
  /** Names of services featured on the start page — lights up the star. */
  featuredNames?:    string[]
  /** Star toggle: feature/unfeature a service on the start page. */
  onToggleFeatured?: (item: ServiceEntry) => void
}

/* Input with a character counter that floats in while you type — the price
 * grid has hundreds of fields, so permanent counters would drown the content. */
function CountedInput({ value, onChange, placeholder, max, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; max: number
  style?: React.CSSProperties
}) {
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ position: 'relative', flex: style?.flex, width: style?.width === '100%' ? '100%' : undefined }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={max}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...style, flex: undefined, width: '100%' }}
      />
      {focus && (
        <span style={{
          position: 'absolute', top: '100%', right: 2, marginTop: 2, zIndex: 5,
          fontSize: 10, fontFamily: F, padding: '1px 5px', borderRadius: 4,
          background: '#080c14', color: value.length >= max ? '#f87171' : '#64748b',
        }}>
          {value.length}/{max}
        </span>
      )}
    </div>
  )
}

export function MenuEditor({ categories, patchCatName, patchItemField, toggleItemBool, toggleAllBool, addCategory, removeCategory, addItem, removeItem, compact, featuredNames, onToggleFeatured }: MenuEditorProps) {
  /* Vad ett klick på ett kryss betyder just nu: första klicket beväpnar,
     andra tar bort. Nyckeln är raden, så bara en åt gången kan vara armad och
     en ångrad avsikt slocknar av sig själv. */
  const [armed, setArmed] = useState<string | null>(null)
  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(null), 4000)
    return () => clearTimeout(id)
  }, [armed])
  /* Compact mode shows every service as one row; only the row being edited
   * unfolds to its full fields — otherwise a long price list buries the panel. */
  const [expanded, setExpanded] = useState<string | null>(null)
  const inputStyle = (flex?: number): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 13,
    color: '#e2e8f0',
    outline: 'none',
    fontFamily: F,
    width: '100%',
    flex: flex ?? undefined,
  })

  const label = (text: string) => (
    <span style={{ fontSize: 10, color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F }}>{text}</span>
  )

  return (
    <div style={compact
      ? { fontFamily: F }
      : { background: '#080c14', borderTop: '2px solid rgba(99,102,241,0.25)', padding: '48px 40px 72px', fontFamily: F }}>
      {/* Header */}
      {(() => {
        const anyPriceVis = categories.some(cat => cat.items.some(it => !it.hidePrice))
        const anyDurVis   = categories.some(cat => cat.items.some(it => !it.hideDuration))
        const hasItems    = categories.some(cat => cat.items.length > 0)
        const togBtnStyle = (active: boolean): React.CSSProperties => ({
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          color: active ? '#6366f1' : '#475569',
        })
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 14 : 40, flexWrap: 'wrap', gap: 8 }}>
            {!compact && (
              <div>
                <p style={{ fontSize: 11, color: '#6366f1', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Tjänstesida</p>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Redigera tjänstemeny</h2>
                <p style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>Ändra kategorier och tjänster som visas på din tjänstesida</p>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasItems && (
                <>
                  <button type="button" onClick={() => toggleAllBool('hidePrice')} style={togBtnStyle(anyPriceVis)}>
                    {anyPriceVis ? '●' : '○'} Pris
                  </button>
                  <button type="button" onClick={() => toggleAllBool('hideDuration')} style={togBtnStyle(anyDurVis)}>
                    {anyDurVis ? '●' : '○'} Tid
                  </button>
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                </>
              )}
              <button
                type="button"
                onClick={addCategory}
                style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                + Ny kategori
              </button>
            </div>
          </div>
        )
      })()}

      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 16 : 32 }}>
        {categories.map((cat, ci) => (
          <div key={ci} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>

            {/* Category heading row */}
            <div style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.2)', padding: compact ? '10px 12px' : '14px 20px', display: 'flex', alignItems: 'center', gap: compact ? 8 : 12 }}>
              {!compact && <span style={{ fontSize: 11, color: '#6366f1', letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Kategori</span>}
              <CountedInput
                value={cat.category}
                onChange={v => patchCatName(ci, v)}
                placeholder="Kategorinamn"
                max={40}
                style={{ ...inputStyle(), background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', fontWeight: 700, fontSize: 15, color: '#c7d2fe', flex: 1 }}
              />
              <button
                type="button"
                onClick={() => {
                  /* Ett klick får inte radera en hel kategori arbete. Tomma
                     kategorier tas bort direkt — det finns inget att förlora. */
                  const nyckel = `kat-${ci}`
                  if (cat.items.length === 0 || armed === nyckel) { setArmed(null); removeCategory(ci) }
                  else setArmed(nyckel)
                }}
                title={compact ? 'Ta bort kategori' : undefined}
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {armed === `kat-${ci}`
                  ? `Säker? ${cat.items.length} tjänst${cat.items.length === 1 ? '' : 'er'} följer med`
                  : compact ? '×' : 'Ta bort kategori'}
              </button>
            </div>

            {/* Items */}
            <div style={{ background: '#0d1117', padding: compact ? '12px 12px 14px' : '16px 20px 20px' }}>
              {/* Column headers — only in the wide grid layout */}
              {!compact && cat.items.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 1fr 1fr 32px', gap: 8, marginBottom: 8, paddingLeft: 4 }}>
                  {label('Tjänst')}
                  {label('Beskrivning')}
                  {label('Pris')}
                  {label('Tid / Typ')}
                  <span />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 8 }}>
                {cat.items.map((item, ii) => {
                  const key    = `${ci}-${ii}`
                  const isFeat = featuredNames?.includes(item.name) ?? false
                  const star   = onToggleFeatured && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onToggleFeatured(item) }}
                      title={isFeat ? 'Visas på startsidan — klicka för att ta bort' : 'Lyft fram på startsidan'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', color: isFeat ? '#eab308' : '#475569', flexShrink: 0 }}
                    >
                      {isFeat ? '★' : '☆'}
                    </button>
                  )

                  /* Collapsed row — just the service, tap to unfold */
                  if (compact && expanded !== key) {
                    return (
                      <div
                        key={ii}
                        onClick={() => setExpanded(key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}
                      >
                        {star}
                        <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0', fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name || 'Ny tjänst'}
                        </span>
                        {!item.hidePrice && item.price && (
                          <span style={{ fontSize: 12, color: '#64748b', fontFamily: F, whiteSpace: 'nowrap' }}>{item.price}</span>
                        )}
                        <span style={{ fontSize: 11, color: '#6366f1', fontFamily: F, whiteSpace: 'nowrap' }}>Redigera ▾</span>
                      </div>
                    )
                  }

                  return (
                  <div
                    key={ii}
                    style={compact
                      ? { display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid rgba(99,102,241,0.35)', borderRadius: 10, padding: '10px 10px 12px' }
                      : { display: 'grid', gridTemplateColumns: '1.4fr 2fr 1fr 1fr 32px', gap: 8, alignItems: 'center' }}
                  >
                    {compact && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {star}
                        {label('Tjänst')}
                        <span style={{ flex: 1 }} />
                        <button
                          type="button"
                          onClick={() => setExpanded(null)}
                          style={{ background: 'none', color: '#6366f1', border: 'none', fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: F }}
                        >
                          Stäng ▴
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nyckel = `item-${ci}-${ii}`
                            if (armed === nyckel) { setArmed(null); removeItem(ci, ii); setExpanded(null) }
                            else setArmed(nyckel)
                          }}
                          title="Ta bort tjänst"
                          style={{ background: 'none', color: armed === `item-${ci}-${ii}` ? '#f87171' : '#475569', border: 'none', fontSize: armed === `item-${ci}-${ii}` ? 11 : 18, fontWeight: armed === `item-${ci}-${ii}` ? 700 : 400, cursor: 'pointer', padding: 0, lineHeight: 1, fontFamily: F }}
                        >
                          {armed === `item-${ci}-${ii}` ? 'Säker?' : '×'}
                        </button>
                      </div>
                    )}
                    <CountedInput value={item.name} onChange={v => patchItemField(ci, ii, 'name', v)} placeholder="t.ex. Herrklippning" max={50} style={inputStyle()} />
                    {compact && label('Beskrivning')}
                    <CountedInput value={item.desc} onChange={v => patchItemField(ci, ii, 'desc', v)} placeholder="t.ex. Inkl. tvätt och styling" max={100} style={inputStyle()} />
                    {compact && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {label('Pris')}
                        {label('Tid / Typ')}
                      </div>
                    )}
                    {/* Price + duration side by side in compact, separate grid cells otherwise */}
                    <div style={compact ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } : { display: 'contents' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <CountedInput
                          value={item.price}
                          onChange={v => patchItemField(ci, ii, 'price', v)}
                          placeholder="t.ex. 650 kr"
                          max={20}
                          style={{ ...inputStyle(), flex: 1, opacity: item.hidePrice ? 0.35 : 1, textDecoration: item.hidePrice ? 'line-through' : 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => toggleItemBool(ci, ii, 'hidePrice')}
                          title={item.hidePrice ? 'Visa pris' : 'Dölj pris'}
                          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', color: item.hidePrice ? '#334155' : '#6366f1' }}
                        >
                          {item.hidePrice ? '○' : '●'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <CountedInput
                          value={item.duration ?? ''}
                          onChange={v => patchItemField(ci, ii, 'duration', v)}
                          placeholder="t.ex. 60 min"
                          max={25}
                          style={{ ...inputStyle(), flex: 1, opacity: item.hideDuration ? 0.35 : 1, textDecoration: item.hideDuration ? 'line-through' : 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => toggleItemBool(ci, ii, 'hideDuration')}
                          title={item.hideDuration ? 'Visa tid' : 'Dölj tid'}
                          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', color: item.hideDuration ? '#334155' : '#6366f1' }}
                        >
                          {item.hideDuration ? '○' : '●'}
                        </button>
                      </div>
                    </div>
                    {!compact && (
                      <button
                        type="button"
                        onClick={() => {
                          const nyckel = `item-${ci}-${ii}`
                          if (armed === nyckel) { setArmed(null); removeItem(ci, ii) }
                          else setArmed(nyckel)
                        }}
                        title="Ta bort tjänst"
                        style={{ background: 'none', color: armed === `item-${ci}-${ii}` ? '#f87171' : '#475569', border: 'none', fontSize: armed === `item-${ci}-${ii}` ? 11 : 20, fontWeight: armed === `item-${ci}-${ii}` ? 700 : 400, cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}
                      >
                        {armed === `item-${ci}-${ii}` ? 'Säker?' : '×'}
                      </button>
                    )}
                  </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => { addItem(ci); if (compact) setExpanded(`${ci}-${cat.items.length}`) }}
                style={{ marginTop: 12, background: 'none', color: '#6366f1', border: '1px dashed rgba(99,102,241,0.35)', borderRadius: 6, padding: '7px 16px', fontSize: 12, cursor: 'pointer' }}
              >
                + Lägg till tjänst
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Manual testimonial editor ─────────────────────────────────────── */

export function TestimonialEditor({
  testimonials,
  onAdd,
  onRemove,
  compact,
}: {
  testimonials: Testimonial[]
  onAdd:        (t: Testimonial) => void
  onRemove:     (i: number) => void
  /** Panel layout: no full-width chrome, the surrounding section frames it. */
  compact?:     boolean
}) {
  const [text,    setText]    = useState('')
  const [author,  setAuthor]  = useState('')
  const [title,   setTitle]   = useState('')
  const [company, setCompany] = useState('')
  const [open,    setOpen]    = useState(false)

  const manuals = testimonials.filter(t => t.source === 'manual')

  function submit() {
    if (!text.trim() || !author.trim()) return
    onAdd({ text: text.trim(), author: author.trim(), title: title.trim() || undefined, company: company.trim() || undefined, rating: 5, source: 'manual' })
    setText(''); setAuthor(''); setTitle(''); setCompany(''); setOpen(false)
  }

  const inp: CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, fontFamily: F, width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={compact
      ? { fontFamily: F }
      : { background: 'rgba(10,13,24,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '40px 32px', fontFamily: F }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
          <h3 style={{ fontSize: compact ? 14 : 18, fontWeight: 700, color: '#e2e8f0', margin: 0, whiteSpace: 'nowrap' }}>Kundcitat</h3>
          {!compact && <span style={{ fontSize: 12, color: '#64748b' }}>Egna testimonials med namn, titel och företag</span>}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, padding: '8px 16px', color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {open ? 'Avbryt' : '+ Lägg till citat'}
        </button>
      </div>

      {open && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '24px', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(() => {
            const counter = (v: string, max: number) => (
              <span style={{ display: 'block', textAlign: 'right', fontSize: 10, fontFamily: F, marginTop: 3, color: v.length >= max ? '#f87171' : '#64748b' }}>
                {v.length}/{max}
              </span>
            )
            return (
              <>
                <div>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Citatet — vad kunden sa om er…"
                    rows={3}
                    maxLength={280}
                    style={{ ...inp, resize: 'vertical' as const }}
                  />
                  {counter(text, 280)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Namn" maxLength={40} style={inp} />
                    {counter(author, 40)}
                  </div>
                  <div>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (VD)" maxLength={40} style={inp} />
                    {counter(title, 40)}
                  </div>
                </div>
                <div>
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Företag (Volvo Cars)" maxLength={40} style={inp} />
                  {counter(company, 40)}
                </div>
              </>
            )
          })()}
          <button
            onClick={submit}
            disabled={!text.trim()}
            style={{ background: !text.trim() ? 'rgba(99,102,241,0.2)' : '#6366f1', border: 'none', borderRadius: 8, padding: '11px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: !text.trim() ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}
          >
            Lägg till
          </button>
        </div>
      )}

      {manuals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {manuals.map((t, i) => {
            const globalIdx = testimonials.findIndex((x, xi) => x.source === 'manual' && testimonials.filter((y, yi) => y.source === 'manual' && yi <= xi).length === i + 1)
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8 }}>"{t.text}"</p>
                  <p style={{ fontSize: 12, color: '#64748b' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>{t.author}</span>
                    {t.title   && <span> · {t.title}</span>}
                    {t.company && <span> · {t.company}</span>}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(testimonials.indexOf(t))}
                  style={{ background: 'none', border: 'none', color: '#475569', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                >×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Blog placeholder section ──────────────────────────────────────── */

function BlogPlaceholder({ c, count = 6, sectionBg }: { c: TemplateColors; count?: 3 | 6; sectionBg?: string }) {
  const sectBg = sectionBg ?? c.bg
  const bg = isDark(sectBg) ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const border = isDark(sectBg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  return (
    <section style={{ background: sectBg, padding: '80px 8%', borderTop: `1px solid ${border}` }}>
      <p style={{ fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12, fontFamily: F, textAlign: 'center' }}>Blogg</p>
      <h2 style={{ fontSize: 36, fontWeight: 800, color: c.h, textAlign: 'center', marginBottom: 48, letterSpacing: -0.8, fontFamily: F }}>Senaste artiklarna</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
        {Array.from({ length: count }, (_, i) => `Artikel ${i + 1}`).map((title, i) => (
          <div key={i} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '28px 24px' }}>
            <p style={{ fontSize: 11, color: c.a, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, fontFamily: F }}>Kategori</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: c.h, marginBottom: 10, fontFamily: F }}>{title}</p>
            <p style={{ fontSize: 13, color: c.s, lineHeight: 1.6, fontFamily: F }}>Här visas en kort ingress till artikeln som lockar läsaren att klicka vidare och läsa mer.</p>
            <p style={{ fontSize: 12, color: c.a, marginTop: 16, fontFamily: F, fontWeight: 600 }}>Läs mer →</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 48 }}>
        <a href="#" style={{
          display: 'inline-block',
          border: `1.5px solid ${border}`,
          borderRadius: 8,
          padding: '12px 32px',
          fontSize: 14,
          fontWeight: 600,
          color: c.a,
          fontFamily: F,
          textDecoration: 'none',
          letterSpacing: 0.2,
        }}>
          Se alla artiklar →
        </a>
      </div>
    </section>
  )
}

/* ── Team section ──────────────────────────────────────────────────── */

/* ── Template-aware nav (used by inner pages to match the home page nav) */

function ELayoutNav({ ep, layout }: { ep: EP; layout: string }) {
  const { c, content } = ep
  if (layout === 'editorial') return <ENav {...ep} minimal />
  if (layout === 'heritage')  return <ENav {...ep} centered />
  if (layout === 'luxury') {
    const navFg      = isDark(c.nav) ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
    const navLogoClr = isDark(c.nav) ? '#ffffff' : c.h
    return (
      <nav style={{ background: c.nav, padding: '0 8%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, gap: 48 }}>
          {[0, 1].map(i => (
            <E key={i} value={content.navLinks[i] ?? ''} onChange={v => ep.patchNav(i, v)}
              style={{ color: navFg, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: F }} />
          ))}
          <div style={{ margin: '0 16px' }}>
            <LogoOrName content={content} patch={ep.patch} logo={ep.logo} setLogo={ep.setLogo}
              nameStyle={{ fontSize: 22, fontWeight: 800, color: navLogoClr, fontFamily: F, letterSpacing: -0.5 }} />
          </div>
          {[2, 3].map(i => (
            <E key={i} value={content.navLinks[i] ?? ''} onChange={v => ep.patchNav(i, v)}
              style={{ color: navFg, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: F }} />
          ))}
          {ep.siteFeatures?.gallery && <span style={{ color: navFg, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: F }}>Galleri</span>}
          {ep.siteFeatures?.blog    && <span style={{ color: navFg, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: F }}>Blogg</span>}
        </div>
        <div style={{ height: 1, background: c.a, opacity: 0.5 }} />
      </nav>
    )
  }
  return <ENav {...ep} />
}

/* ── Om oss page ───────────────────────────────────────────────────── */

function EAboutPage({ ep, layout }: { ep: EP; layout: string }) {
  const { c, content } = ep
  const bdr = isDark(c.bg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  return (
    <div style={{ background: c.bg, minHeight: '100vh' }}>
      <ELayoutNav ep={ep} layout={layout} />
      <section style={{ background: c.b, padding: '80px 8%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
          <div>
            <p style={{ fontSize: 12, color: c.a, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16, fontFamily: F }}>Om oss</p>
            <E as="h1" value={content.aboutTitle} onChange={v => ep.patch('aboutTitle', v)}
              style={{ fontSize: 52, fontWeight: 800, color: c.h, marginBottom: 28, letterSpacing: -1.5, fontFamily: F, display: 'block' }} />
            <E as="p" value={content.aboutBody} onChange={v => ep.patch('aboutBody', v)} multiline
              style={{ fontSize: 18, color: c.s, lineHeight: 1.8, fontFamily: F }} />
          </div>
          <ImgPlaceholder c={c} height={440} radius={8} />
        </div>
      </section>
      <section style={{ background: c.bg, padding: '40px 8%', borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: 'flex', gap: 56, maxWidth: 1100, margin: '0 auto' }}>
          {(['Telefon', 'Öppettider', 'Adress'] as const).map((label, i) => {
            const val = i === 0 ? content.phone : i === 1 ? content.hours : content.address
            const key = i === 0 ? 'phone' : i === 1 ? 'hours' : 'address'
            return (
              <div key={label}>
                <p style={{ fontSize: 10, color: c.a, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6, fontFamily: F }}>{label}</p>
                <E as="p" value={val} onChange={v => ep.patch(key as keyof typeof content, v)}
                  style={{ fontSize: 15, fontWeight: 600, color: c.h, fontFamily: F }} />
              </div>
            )
          })}
        </div>
      </section>
      <ETeam {...ep} />
      <ECtaBanner {...ep} />
      <EFooter {...ep} />
    </div>
  )
}

/* ── Team members section ───────────────────────────────────────────── */

function ETeam({ c, content, patchTeam, addTeamMember, removeTeamMember }: EP) {
  const team   = content.team ?? []
  const bdr    = isDark(c.bg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const avatar = isDark(c.bg) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  function readPhoto(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => patchTeam(i, 'image', ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Empty state: only visible in the editor so users can add members
  // On the published site this section is hidden when team is empty
  if (team.length === 0) {
    return (
      <section style={{ background: c.bg, padding: '32px 8%', borderTop: `1px solid ${bdr}`, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={addTeamMember}
          style={{
            border: `1.5px dashed ${bdr}`, borderRadius: 12,
            padding: '16px 36px', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            color: c.s, fontSize: 13, fontFamily: F,
          }}
        >
          <span style={{ fontSize: 20, color: c.a, lineHeight: 1 }}>+</span>
          Lägg till teammedlemmar
        </button>
      </section>
    )
  }

  return (
    <section style={{ background: c.bg, padding: '64px 8%', borderTop: `1px solid ${bdr}` }}>
      <h2 style={{ fontSize: 32, fontWeight: 800, color: c.h, marginBottom: 48, letterSpacing: -0.6, fontFamily: F, textAlign: 'center' }}>
        Möt teamet
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', maxWidth: 1100, margin: '0 auto' }}>
        {team.map((m, i) => (
          <div key={i} style={{ textAlign: 'center', width: 140, position: 'relative' }}>
            <button
              onClick={() => removeTeamMember(i)}
              style={{
                position: 'absolute', top: -8, right: -8,
                width: 22, height: 22, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', fontSize: 13, lineHeight: 1,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2,
              }}
            >×</button>
            <label style={{ cursor: 'pointer', display: 'block', marginBottom: 14 }}>
              {m.image
                ? <img src={m.image} alt={m.name} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto' }} />
                : (
                  <div style={{ width: 96, height: 96, borderRadius: '50%', background: avatar, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke={c.s} strokeWidth="1.5" strokeOpacity="0.5"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={c.s} strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                )
              }
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => readPhoto(i, e)} />
            </label>
            <E value={m.name} onChange={v => patchTeam(i, 'name', v)}
              style={{ fontSize: 14, fontWeight: 700, color: c.h, fontFamily: F, display: 'block' }} />
            <E value={m.title} onChange={v => patchTeam(i, 'title', v)}
              style={{ fontSize: 12, color: c.s, fontFamily: F, display: 'block', marginTop: 4 }} />
          </div>
        ))}
        {team.length < 8 && (
          <button
            onClick={addTeamMember}
            style={{
              width: 140, height: 140, borderRadius: 12,
              border: `1.5px dashed ${bdr}`,
              background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: c.s, fontSize: 12, fontFamily: F,
            }}
          >
            <span style={{ fontSize: 24, color: c.a, lineHeight: 1 }}>+</span>
            Lägg till person
          </button>
        )}
      </div>
    </section>
  )
}

/* ── Pricelist section ─────────────────────────────────────────────── */

function PricelistSection(ep: EP) {
  const { c, content, sectionBg } = ep
  const sectBg  = sectionBg ?? c.bg
  const divider = isDark(sectBg) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const border  = isDark(sectBg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  return (
    <div>
      <section style={{ background: sectBg, padding: '80px 10%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
          <ImgPlaceholder c={c} height={480} radius={4} />
          <div>
            <p style={{ fontSize: 11, color: c.a, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 24, fontFamily: F }}>Utvalt</p>
            <E as="h2" value={content.services[0]?.name ?? ''} onChange={v => ep.patchSvc(0, 'name', v)}
              style={{ fontSize: 44, fontWeight: 300, color: c.h, lineHeight: 1.1, marginBottom: 20, letterSpacing: -1, fontFamily: F, display: 'block' }} />
            <E as="p" value={content.services[0]?.desc ?? ''} onChange={v => ep.patchSvc(0, 'desc', v)} multiline
              style={{ fontSize: 16, color: c.s, lineHeight: 1.8, marginBottom: 32, fontFamily: F }} />
            <E value={content.services[0]?.price ?? ''} onChange={v => ep.patchSvc(0, 'price', v)}
              style={{ fontSize: 22, color: c.a, fontWeight: 500, letterSpacing: -0.3, fontFamily: F }} />
          </div>
        </div>
      </section>
      <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${c.a}60, transparent)`, margin: '0 8%' }} />
      <section style={{ background: sectBg, padding: '56px 10%' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {content.services.slice(1).map((s, i) => (
            <div key={i + 1} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32, padding: '28px 0', borderBottom: `1px solid ${divider}` }}>
              <div>
                <E as="p" value={s.name} onChange={v => ep.patchSvc(i + 1, 'name', v)}
                  style={{ fontSize: 18, fontWeight: 600, color: c.h, marginBottom: 6, fontFamily: F }} />
                <E as="p" value={s.desc} onChange={v => ep.patchSvc(i + 1, 'desc', v)} multiline
                  style={{ fontSize: 14, color: c.s, fontFamily: F }} />
              </div>
              <E value={s.price} onChange={v => ep.patchSvc(i + 1, 'price', v)}
                style={{ fontSize: 14, color: c.a, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: F, flexShrink: 0 }} />
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <a href="#" style={{ display: 'inline-block', border: `1.5px solid ${border}`, borderRadius: 8, padding: '12px 32px', fontSize: 14, fontWeight: 600, color: c.a, fontFamily: F, textDecoration: 'none' }}>
              Se hela prislistan →
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ── Movable section blocks ────────────────────────────────────────── */

const MOVABLE_IDS: FeatureId[] = ['pricelist', 'gallery', 'reviews', 'blog']

function MovableSections({ ep }: { ep: EP }) {
  const { c, siteFeatures, sectionOrder, moveSection } = ep
  const enabled = sectionOrder.filter(id => siteFeatures[id])
  if (!enabled.length) return null

  const btn = (disabled: boolean): CSSProperties => ({
    width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.14)',
    background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(6px)',
    color: disabled ? '#334155' : '#94a3b8',
    fontSize: 13, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.12s',
  })

  return (
    <>
      {enabled.map((id, idx) => {
        const sectionBg = idx % 2 === 0 ? c.bg : c.b
        const posEp = { ...ep, sectionBg }
        return (
          <div key={id} style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', right: 20, top: 20, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button style={btn(idx === 0)} disabled={idx === 0} onClick={() => moveSection(id, -1)} title="Flytta upp">↑</button>
              <button style={btn(idx === enabled.length - 1)} disabled={idx === enabled.length - 1} onClick={() => moveSection(id, 1)} title="Flytta ner">↓</button>
            </div>
            {id === 'gallery'   && <GalleryEditor c={c} images={ep.images} onImageChange={ep.setImage} alts={ep.alts} onAltChange={ep.setAlt} count={ep.content.galleryCount ?? 6} sectionBg={sectionBg} />}
            {id === 'reviews'   && <EReviews {...posEp} />}
            {id === 'blog'      && <BlogPlaceholder c={c} count={ep.content.blogCount ?? 6} sectionBg={sectionBg} />}
            {id === 'pricelist' && <PricelistSection {...posEp} />}
          </div>
        )
      })}
    </>
  )
}

/* ── Review picker (editor panel below site preview) ───────────────── */

const REVIEWS_PER_PAGE = 12

export function ReviewPicker({
  reviews,
  selected,
  toggle,
  loading,
  compact,
}: {
  reviews:  MockReview[]
  selected: MockReview[]
  toggle:   (r: MockReview) => void
  loading:  boolean
  /** Panel layout: no full-width chrome, the surrounding section frames it. */
  compact?: boolean
}) {
  const [page, setPage] = useState(0)

  const sorted = [...(reviews ?? MOCK_REVIEWS)].sort((a, b) => b.rating - a.rating)
  const totalPages = Math.ceil(sorted.length / REVIEWS_PER_PAGE)
  const visible = sorted.slice(page * REVIEWS_PER_PAGE, (page + 1) * REVIEWS_PER_PAGE)

  return (
    <div style={compact
      ? { fontFamily: F, marginTop: 18 }
      : { background: 'rgba(10,13,24,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '40px 32px', fontFamily: F }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: compact ? 14 : 18, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Google-recensioner på hemsidan</h3>
        <span style={{ fontSize: 12, color: '#64748b' }}>Välj 1–6 st</span>
      </div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: compact ? 14 : 28 }}>
        {loading
          ? 'Hämtar dina Google-recensioner…'
          : `Sorterade efter betyg — bäst först. ${sorted.length} recensioner totalt.`
        }
        {!loading && selected.length > 0 && <span style={{ color: '#94a3b8' }}>{' '}{selected.length} vald{selected.length > 1 ? 'a' : ''}.</span>}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {visible.map((r, i) => {
          const isSelected = selected.some(s => s.author === r.author)
          const isDisabled = !isSelected && selected.length >= 6
          return (
            <button
              key={page * REVIEWS_PER_PAGE + i}
              onClick={() => !isDisabled && toggle(r)}
              style={{
                textAlign: 'left',
                background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10,
                padding: '18px 20px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.35 : 1,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#fbbf24', fontSize: 13, letterSpacing: 1 }}>{'★'.repeat(r.rating)}</span>
                {isSelected && <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600 }}>✓ Vald</span>}
              </div>
              <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 }}>{r.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{r.author}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" style={{ display: 'block' }}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span style={{ fontSize: 11, color: '#475569' }}>Google</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 14px', color: page === 0 ? '#334155' : '#94a3b8',
              fontSize: 13, cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Föregående
          </button>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 14px', color: page === totalPages - 1 ? '#334155' : '#94a3b8',
              fontSize: 13, cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Nästa →
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Site features panel ───────────────────────────────────────────── */

function FeaturesPanel({
  features,
  onChange,
  logo,
  onLogoChange,
  blogCount,
  onBlogCountChange,
  galleryCount,
  onGalleryCountChange,
}: {
  features:           Record<FeatureId, boolean>
  onChange:           (id: FeatureId, val: boolean) => void
  logo:               string
  onLogoChange:       (url: string) => void
  blogCount:            3 | 6
  onBlogCountChange:    (n: 3 | 6) => void
  galleryCount:         3 | 6
  onGalleryCountChange: (n: 3 | 6) => void
}) {
  const row: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '14px 18px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer', transition: 'background 0.15s',
    marginBottom: 8,
  }
  const toggleStyle = (on: boolean): CSSProperties => ({
    position: 'relative', width: 44, height: 24, borderRadius: 12,
    background: on ? '#eab308' : '#1e2a3a',
    border: 'none', cursor: 'pointer', flexShrink: 0,
    transition: 'background 0.2s',
  })
  const knobStyle = (on: boolean): CSSProperties => ({
    position: 'absolute', top: 2, left: on ? 22 : 2,
    width: 20, height: 20, borderRadius: '50%',
    background: '#fff', transition: 'left 0.2s',
  })
  function readLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onLogoChange(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div style={{ padding: '32px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo upload */}
      <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
        Logotyp
      </p>
      <div style={{ marginBottom: 32, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 20px' }}>
        {logo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              background: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 0 0 / 12px 12px',
              borderRadius: 8, padding: 12, display: 'inline-flex',
            }}>
              <img src={logo} alt="Logotyp" style={{ height: 48, maxWidth: 180, objectFit: 'contain', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: '#94a3b8', fontFamily: F }}>
                Byt logotyp
                <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" style={{ display: 'none' }} onChange={readLogo} />
              </label>
              <button onClick={() => onLogoChange('')} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: '#f87171', cursor: 'pointer', fontFamily: F }}>
                Ta bort
              </button>
            </div>
          </div>
        ) : (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '16px 0' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: '#475569' }}>
              <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M9 6L10.5 4h3L15 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 13, color: '#64748b', fontFamily: F }}>Klicka för att ladda upp logotyp</span>
            <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" style={{ display: 'none' }} onChange={readLogo} />
          </label>
        )}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 11, color: '#475569', fontFamily: F }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Format:</span> SVG (bäst) · PNG · WebP
          </p>
          <p style={{ fontSize: 11, color: '#475569', fontFamily: F }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Storlek:</span> minst 400 × 100 px · max 2 MB
          </p>
          <p style={{ fontSize: 11, color: '#475569', fontFamily: F }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Transparent bakgrund:</span> använd SVG eller PNG med alfa-kanal — JPG stöder inte transparens
          </p>
        </div>
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
        Funktioner
      </p>
      {SITE_FEATURES.map(f => (
        <div key={f.id}>
          <div
            style={{ ...row, background: features[f.id] ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)' }}
            onClick={() => onChange(f.id, !features[f.id])}
          >
            <span style={{ fontSize: 16, width: 24, textAlign: 'center', color: features[f.id] ? '#eab308' : '#475569' }}>{f.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: features[f.id] ? '#f1f5f9' : '#64748b', marginBottom: 2 }}>{f.label}</p>
              <p style={{ fontSize: 12, color: '#475569' }}>{f.desc}</p>
            </div>
            <button
              role="switch"
              aria-checked={features[f.id]}
              onClick={e => { e.stopPropagation(); onChange(f.id, !features[f.id]) }}
              style={toggleStyle(features[f.id])}
            >
              <span style={knobStyle(features[f.id])} />
            </button>
          </div>
          {f.id === 'gallery' && features.gallery && (
            <div style={{ marginTop: -4, marginBottom: 8, marginLeft: 16, padding: '10px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '0 0 10px 10px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 12, color: '#64748b', flex: 1, fontFamily: F }}>Antal bilder på startsidan</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {([3, 6] as const).map(n => (
                  <button key={n} onClick={() => onGalleryCountChange(n)} style={{
                    padding: '5px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: galleryCount === n ? '1.5px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
                    background: galleryCount === n ? 'rgba(234,179,8,0.12)' : 'transparent',
                    color: galleryCount === n ? '#eab308' : '#475569',
                    fontFamily: F, transition: 'all 0.15s',
                  }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          {f.id === 'blog' && features.blog && (
            <div style={{ marginTop: -4, marginBottom: 8, marginLeft: 16, padding: '10px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '0 0 10px 10px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 12, color: '#64748b', flex: 1, fontFamily: F }}>Antal artiklar på startsidan</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {([3, 6] as const).map(n => (
                  <button key={n} onClick={() => onBlogCountChange(n)} style={{
                    padding: '5px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: blogCount === n ? '1.5px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
                    background: blogCount === n ? 'rgba(234,179,8,0.12)' : 'transparent',
                    color: blogCount === n ? '#eab308' : '#475569',
                    fontFamily: F, transition: 'all 0.15s',
                  }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────── */

export function SiteEditor({
  template,
  industry,
  initialContent,
  siteSlug,
}: {
  template:       Template
  industry:       string
  initialContent: Partial<SiteContent>
  /** Public address slug — shown in the Google result preview. */
  siteSlug?:      string
}) {
  const defaults = SITE_DEFAULTS[industry] ?? SITE_DEFAULTS.other
  const [content, setContent] = useState<SiteContent>({ ...defaults, ...initialContent })
  const [alts, setAlts] = useState<string[]>(
    (initialContent as SiteContent).gallery_alts ?? Array(6).fill('')
  )
  const [images,  setImages]  = useState<string[]>(
    (initialContent as any)?.gallery_images ?? Array(6).fill('')
  )
  const [logo,    setLogo]    = useState<string>((initialContent as any)?.logo ?? '')
  const [featuredReviews, setFeaturedReviews] = useState<Testimonial[]>(
    (initialContent.featured_reviews ?? []) as Testimonial[]
  )
  const [pickerReviews,   setPickerReviews]   = useState<MockReview[]>(MOCK_REVIEWS)
  const [reviewsLoading,  setReviewsLoading]  = useState(true)
  const [siteFeatures, setSiteFeatures] = useState<Record<FeatureId, boolean>>(
    { ...DEFAULT_FEATURES, ...(initialContent as any)?.siteFeatures }
  )
  const [sectionOrder, setSectionOrder] = useState<FeatureId[]>(
    ((initialContent as any)?.sectionOrder ?? [...MOVABLE_IDS]).filter((id: string) => id !== 'about') as FeatureId[]
  )
  const [activeTab, setActiveTab] = useState<'tjanster' | 'recensioner' | 'funktioner' | 'google' | 'om-oss'>('tjanster')
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  const c = template.colors

  useEffect(() => {
    fetch('/api/gbp/reviews')
      .then(r => r.json())
      .then(data => {
        if (data.reviews?.length) {
          setPickerReviews(
            data.reviews
              .filter((r: any) => r.text && r.author && r.rating)
              .map((r: any) => ({ author: r.author, rating: r.rating, text: r.text } as MockReview))
          )
        }
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false))
  }, [])

  function patch(k: keyof SiteContent, v: string) {
    setContent(prev => ({ ...prev, [k]: v }))
    setDirty(true)
    setSaved(false)
  }

  function patchSeo(seo: { title?: string; description?: string }) {
    setContent(prev => ({ ...prev, seo }))
    setDirty(true)
    setSaved(false)
  }

  function patchSvc(i: number, f: keyof ServiceItem, v: string) {
    setContent(prev => ({
      ...prev,
      services: prev.services.map((s, j) => j === i ? { ...s, [f]: v } : s),
    }))
    setDirty(true)
    setSaved(false)
  }

  function patchNav(i: number, v: string) {
    setContent(prev => ({
      ...prev,
      navLinks: prev.navLinks.map((l, j) => j === i ? v : l),
    }))
    setDirty(true)
    setSaved(false)
  }

  function setAlt(i: number, v: string) {
    setAlts(prev => prev.map((a, j) => j === i ? v : a))
    setDirty(true); setSaved(false)
  }

  function setImage(i: number, url: string) {
    setImages(prev => prev.map((img, j) => j === i ? url : img))
    setDirty(true)
    setSaved(false)
  }

  function handleSetLogo(url: string) {
    setLogo(url)
    setDirty(true)
    setSaved(false)
  }

  function toggleFeaturedReview(r: MockReview) {
    setFeaturedReviews(prev => {
      const exists = prev.some(fr => fr.author === r.author && fr.source !== 'manual')
      if (exists) return prev.filter(fr => !(fr.author === r.author && fr.source !== 'manual'))
      if (prev.length >= 6) return prev
      return [...prev, { ...r, source: 'google' as const }]
    })
    setDirty(true)
    setSaved(false)
  }

  function addTestimonial(t: Testimonial) {
    setFeaturedReviews(prev => [...prev, t])
    setDirty(true)
    setSaved(false)
  }

  function removeTestimonial(i: number) {
    setFeaturedReviews(prev => prev.filter((_, j) => j !== i))
    setDirty(true)
    setSaved(false)
  }

  function patchTeam(i: number, f: keyof TeamMember, v: string) {
    setContent(prev => ({
      ...prev,
      team: (prev.team ?? []).map((m, j) => j === i ? { ...m, [f]: v } : m),
    }))
    setDirty(true); setSaved(false)
  }

  function addTeamMember() {
    setContent(prev => ({
      ...prev,
      team: [...(prev.team ?? []), { name: 'Namn', title: 'Titel', image: '' }],
    }))
    setDirty(true); setSaved(false)
  }

  function removeTeamMember(i: number) {
    setContent(prev => ({
      ...prev,
      team: (prev.team ?? []).filter((_, j) => j !== i),
    }))
    setDirty(true); setSaved(false)
  }

  function moveSection(id: FeatureId, dir: -1 | 1) {
    setSectionOrder(prev => {
      const i = prev.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setDirty(true)
    setSaved(false)
  }

  function toggleSiteFeature(id: FeatureId, val: boolean) {
    setSiteFeatures(prev => ({ ...prev, [id]: val }))
    setDirty(true)
    setSaved(false)
  }

  function patchCatName(ci: number, v: string) {
    setContent(prev => ({
      ...prev,
      menuCategories: prev.menuCategories.map((cat, i) =>
        i === ci ? { ...cat, category: v } : cat
      ),
    }))
    setDirty(true); setSaved(false)
  }

  function patchItemField(ci: number, ii: number, f: keyof ServiceEntry, v: string) {
    setContent(prev => ({
      ...prev,
      menuCategories: prev.menuCategories.map((cat, i) =>
        i !== ci ? cat : {
          ...cat,
          items: cat.items.map((item, j) => j === ii ? { ...item, [f]: v } : item),
        }
      ),
    }))
    setDirty(true); setSaved(false)
  }

  function toggleItemBool(ci: number, ii: number, f: 'hidePrice' | 'hideDuration') {
    setContent(prev => ({
      ...prev,
      menuCategories: prev.menuCategories.map((cat, i) =>
        i !== ci ? cat : {
          ...cat,
          items: cat.items.map((item, j) => j === ii ? { ...item, [f]: !item[f] } : item),
        }
      ),
    }))
    setDirty(true); setSaved(false)
  }

  function toggleAllBool(f: 'hidePrice' | 'hideDuration') {
    setContent(prev => {
      const anyVisible = prev.menuCategories.some(cat => cat.items.some(it => !it[f]))
      return {
        ...prev,
        menuCategories: prev.menuCategories.map(cat => ({
          ...cat,
          items: cat.items.map(item => ({ ...item, [f]: anyVisible })),
        })),
      }
    })
    setDirty(true); setSaved(false)
  }

  function addCategory() {
    setContent(prev => ({
      ...prev,
      menuCategories: [...prev.menuCategories, { category: 'Ny kategori', items: [] }],
    }))
    setDirty(true); setSaved(false)
  }

  function removeCategory(ci: number) {
    setContent(prev => ({
      ...prev,
      menuCategories: prev.menuCategories.filter((_, i) => i !== ci),
    }))
    setDirty(true); setSaved(false)
  }

  function addItem(ci: number) {
    setContent(prev => ({
      ...prev,
      menuCategories: prev.menuCategories.map((cat, i) =>
        i !== ci ? cat : {
          ...cat,
          items: [...cat.items, { name: '', desc: '', price: '' }],
        }
      ),
    }))
    setDirty(true); setSaved(false)
  }

  function removeItem(ci: number, ii: number) {
    setContent(prev => ({
      ...prev,
      menuCategories: prev.menuCategories.map((cat, i) =>
        i !== ci ? cat : { ...cat, items: cat.items.filter((_, j) => j !== ii) }
      ),
    }))
    setDirty(true); setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/webbplats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { ...content, gallery_images: images, gallery_alts: alts, logo, featured_reviews: featuredReviews, siteFeatures, sectionOrder } }),
      })
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // silent — connection may not be set up yet
    } finally {
      setSaving(false)
    }
  }

  const ep: EP = { c, content, images, logo, patch, patchSvc, patchNav, setImage, alts, setAlt, setLogo: handleSetLogo, featuredReviews, toggleReview: toggleFeaturedReview, addTestimonial, removeTestimonial, siteFeatures, sectionOrder, moveSection, patchTeam, addTeamMember, removeTeamMember }

  const layout = template.layout as string

  return (
    <>
      {/* Fixed toolbar — sidebar is w-56 = 224px, so left: 224px clears it */}
      <div style={{
        position: 'fixed', top: 0, left: 224, right: 0, zIndex: 50,
        background: 'rgba(10,13,24,0.97)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        fontFamily: F,
      }}>
        <Link
          href="/dashboard"
          style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Dashboard
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Redigera webbplats</span>
          <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
            {template.name}
          </span>
        </div>

        {/* Booking URL input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380, margin: '0 24px' }}>
          <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>Bokningslänk</span>
          <input
            type="url"
            value={content.bookingUrl}
            onChange={e => patch('bookingUrl', e.target.value)}
            placeholder="https://bokadirekt.se/…  eller lämna tom för eget system"
            style={{
              flex: 1,
              fontSize: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '5px 10px',
              color: '#e2e8f0',
              outline: 'none',
              fontFamily: F,
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {dirty && !saving && (
            <span style={{ fontSize: 12, color: '#fbbf24' }}>Osparade ändringar</span>
          )}
          {saved && (
            <span style={{ fontSize: 12, color: '#34d399' }}>✓ Sparat</span>
          )}
          <a
            href={`/preview/${template.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}
          >
            Förhandsgranska ↗
          </a>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              background: dirty ? '#6366f1' : 'rgba(255,255,255,0.05)',
              color: dirty ? '#fff' : '#475569',
              border: 'none', borderRadius: 8,
              padding: '8px 20px', fontSize: 13, fontWeight: 600,
              cursor: dirty ? 'pointer' : 'default',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {saving ? 'Sparar…' : 'Spara'}
          </button>
        </div>
      </div>

      {/* Spacer to push content below the fixed toolbar (toolbar ~48px + hint ~36px = 84px) */}
      <div style={{ height: 84 }} />

      {/* Hint bar — also fixed so it stays below the toolbar */}
      <div style={{
        position: 'fixed', top: 48, left: 224, right: 0, zIndex: 49,
        background: 'rgba(99,102,241,0.09)',
        borderBottom: '1px solid rgba(99,102,241,0.15)',
        padding: '8px 20px',
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: F,
        textAlign: 'center',
      }}>
        Klicka på valfri text för att redigera den
      </div>

      {/* Editable site */}
      {activeTab === 'om-oss' ? (
        <EAboutPage ep={ep} layout={layout} />
      ) : (
        <>
          {layout === 'split'     && <EditableSplit     {...ep} />}
          {layout === 'editorial' && <EditableEditorial {...ep} />}
          {layout === 'heritage'  && <EditableHeritage  {...ep} />}
          {layout === 'luxury'    && <EditableLuxury    {...ep} />}
          {(layout === 'centered' || !['split','editorial','heritage','luxury'].includes(layout)) && <EditableCentered {...ep} />}
        </>
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0,
        background: 'rgba(10,13,24,0.98)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        fontFamily: F,
      }}>
        {([
          { id: 'tjanster',    label: 'Tjänster' },
          { id: 'recensioner', label: 'Recensioner' },
          { id: 'funktioner',  label: 'Funktioner' },
          { id: 'google',      label: 'Google' },
          { id: 'om-oss',      label: 'Om oss' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '14px 28px',
              fontSize: 14, fontWeight: 600,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: activeTab === tab.id ? '#eab308' : '#475569',
              borderBottom: activeTab === tab.id ? '2px solid #eab308' : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tjanster' && (
        <MenuEditor
          categories={content.menuCategories}
          patchCatName={patchCatName}
          patchItemField={patchItemField}
          toggleItemBool={toggleItemBool}
          toggleAllBool={toggleAllBool}
          addCategory={addCategory}
          removeCategory={removeCategory}
          addItem={addItem}
          removeItem={removeItem}
        />
      )}
      {activeTab === 'recensioner' && (
        <>
          <TestimonialEditor testimonials={featuredReviews} onAdd={addTestimonial} onRemove={removeTestimonial} />
          <ReviewPicker reviews={pickerReviews} selected={featuredReviews.filter(r => r.source !== 'manual') as MockReview[]} toggle={toggleFeaturedReview} loading={reviewsLoading} />
        </>
      )}
      {activeTab === 'google' && (
        <GoogleSerpEditor content={content} siteSlug={siteSlug ?? 'din-salong'} onChange={patchSeo} />
      )}
      {activeTab === 'funktioner' && (
        <FeaturesPanel
          features={siteFeatures}
          onChange={toggleSiteFeature}
          logo={logo}
          onLogoChange={handleSetLogo}
          blogCount={content.blogCount ?? 6}
          onBlogCountChange={n => { setContent(prev => ({ ...prev, blogCount: n })); setDirty(true); setSaved(false) }}
          galleryCount={content.galleryCount ?? 6}
          onGalleryCountChange={n => { setContent(prev => ({ ...prev, galleryCount: n })); setDirty(true); setSaved(false) }}
        />
      )}
    </>
  )
}
