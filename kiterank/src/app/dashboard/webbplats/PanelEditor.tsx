'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getPalettesForIndustry, type Template } from '@/app/onboarding/templates'
import { PreviewSite, templateImageSlots, getIndConfig, orderedIds, menuLinks, PAGE_SECTIONS, type SiteContent as PublicContent } from '@/app/preview/[templateId]/PreviewSite'
import { SITE_LABELS, siteLabel } from '@/lib/siteLabels'
import {
  SECTION_PAGES, SECTION_PAGE_IDS, sectionHasMaterial, sectionPageEnabled, sectionPageSuggestion,
  type SectionPageId, type SectionPage as SectionPageConfig,
} from '@/lib/sectionPages'
import { PageWorkspace } from './PageWorkspace'

/* What each section already puts at the top of its own page — said in the
 * customer's terms, so nobody wonders whether they have to add it by hand. */
/** Checklist row that opens the picture-swapping workspace, not a section. */
const SWAP_IMAGES = 'swap-images'

const PAGE_SUMMARY: Record<SectionPageId, string> = {
  pricelist: 'hela prislistan',
  about:     'er text om er och teamet',
  blog:      'alla dina publicerade artiklar',
}
/* Which panel section holds each field. A word can appear anywhere on the
   page; there is only ever one box that changes it. */
const FIELD_SECTION: Record<string, string> = {
  kicker: 'hero', heroHeading: 'hero', heroBody: 'hero', ctaText: 'hero',
  aboutTitle: 'about', aboutBody: 'about',
  businessName: 'brand', tagline: 'brand',
  phone: 'contact', address: 'contact', hours: 'contact',
}

/* The bubble editor's knowledge of each clickable text: what to call it and
   how long it may be — the same limits the panel fields enforce. */
const FIELD_META: Record<string, { label: string; max: number; multiline?: boolean }> = {
  kicker:       { label: 'Liten text ovanför rubriken', max: 40 },
  heroHeading:  { label: 'Rubrik',                      max: 60 },
  heroBody:     { label: 'Text under rubriken',         max: 220, multiline: true },
  ctaText:      { label: 'Knappens text',               max: 25 },
  aboutTitle:   { label: 'Rubrik för Om oss',           max: 60 },
  aboutBody:    { label: 'Om oss-texten',               max: 600, multiline: true },
  businessName: { label: 'Företagsnamn',                max: 40 },
  tagline:      { label: 'Kort slogan',                 max: 60 },
  phone:        { label: 'Telefon',                     max: 20 },
  address:      { label: 'Adress / område',             max: 60 },
  hours:        { label: 'Öppettider',                  max: 80 },
}

/* What the hover label calls each part of the page. */
const EDIT_LABEL: Record<string, string> = {
  menu: 'Redigera menyn', brand: 'Redigera logga & namn', hero: 'Redigera stora rubriken',
  pricelist: 'Redigera prislistan', about: 'Redigera om oss', gallery: 'Redigera bildgalleriet',
  reviews: 'Redigera recensionerna', articles: 'Redigera artiklarna', contact: 'Redigera kontakt & öppettider',
}

/* What the floating section tools call each movable part. */
const SECTION_NAME: Record<string, string> = {
  hero: 'Stora rubriken', services: 'Utvalda tjänster', pricelist: 'Prislistan',
  about: 'Om oss', reviews: 'Recensionerna', gallery: 'Bildgalleriet', blog: 'Artiklarna',
}

/* The on/off switch each movable section answers to — hero and the featured
   strip have none. */
const SECTION_FEATURE: Record<string, string | undefined> = {
  pricelist: 'pricelist', gallery: 'gallery', reviews: 'reviews', blog: 'blog', about: 'about',
}

/* What each own page is called in the Meny panel — the part of the site it
   belongs to, so the customer knows which button they are renaming. */
const PAGE_LABEL: Record<SectionPageId, string> = {
  pricelist: 'Prislistans sida',
  about:     'Om oss-sidan',
  blog:      'Artiklarnas sida',
}
import { SITE_FONTS } from '@/lib/siteFonts'
import { uploadFont } from '@/lib/uploadImage'
import type { ServiceEntry } from '@/app/preview/[templateId]/tjanster/services-data'
import { ExternalLink } from '@/components/ExternalLink'
import { emptyArticle, type Article } from '@/lib/articles'
import { withExamples, exampleArticles, isExampleImage } from '@/lib/exampleContent'
import { StartChecklist, type ChecklistItem } from './StartChecklist'
import { SwapImages, type Placeholder } from './SwapImages'
import { MediaProvider, useMedia } from './MediaLibrary'
import { SubpagePreview } from './SubpagePreview'
import { Field, F, inputStyle, useNarrow } from './fields'
import { ArticleList, ArticleWorkspace } from './ArticleEditor'
import {
  SITE_DEFAULTS, MOCK_REVIEWS,
  MenuEditor, TestimonialEditor, ReviewPicker, GoogleSerpEditor,
  type SiteContent, type Testimonial, type MockReview, type ServiceItem, type TeamMember,
} from './SiteEditor'

/*
 * The site editor, rebuilt around one idea: every field lives in one panel,
 * and the page next to it is rendered by the exact component that serves the
 * published site. What the customer sees while editing IS what goes live —
 * fidelity is structural, not something to keep in sync by hand.
 *
 * The old click-in-the-page replica mixed three interaction models (inline
 * text, tabs, hover arrows) and rendered a page that wasn't the real one.
 */

/* ── Small building blocks ─────────────────────────────────────────── */

/* Color helpers for the palette derivation below */
const hexLum = (hex: string) => {
  const h = hex.replace('#', '')
  if (h.length < 6) return 0
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000
}
const hexIsDark = (hex: string) => hexLum(hex) < 128
/** WCAG contrast ratio between two hex colors — 1 (none) to 21 (max). */
const contrastRatio = (hexA: string, hexB: string) => {
  const rel = (hex: string) => {
    const h = hex.replace('#', '')
    if (h.length < 6) return 0
    const [r, g, b] = [0, 2, 4]
      .map(i => parseInt(h.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [rel(hexA), rel(hexB)].sort((m, n) => n - m)
  return (hi + 0.05) / (lo + 0.05)
}
const shade = (hex: string, amount: number) => {
  const h = hex.replace('#', '')
  const ch = [0, 2, 4].map(i => Math.min(255, Math.max(0, parseInt(h.slice(i, i + 2), 16) + amount)))
  return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('')
}
/** Blend two hex colors — t is the weight of the second. */
const mix = (hexA: string, hexB: string, t: number) => {
  const a = hexA.replace('#', ''), b = hexB.replace('#', '')
  const ch = [0, 2, 4].map(i => Math.round(
    parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t
  ))
  return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('')
}

/** A whole readable palette from one background choice. Text and section
 *  colors follow along, so no combination the customer picks can produce
 *  white text on a white page. */
function paletteFromBg(bg: string) {
  const dark = hexIsDark(bg)
  return {
    bg,
    nav: bg,
    b:   dark ? shade(bg, 16) : shade(bg, -10),
    h:   dark ? '#ffffff' : '#131313',
    s:   dark ? '#9a9a9a' : '#666666',
  }
}

/* The layout's own picture. Stored as a file, not inside the page content, so
   a big photo doesn't end up embedded in the HTML of every visit. */
function SlotImage({ label, hint, value, onChange }: {
  label: string; hint: string; value: string; onChange: (url: string) => void
}) {
  const media = useMedia()
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 5px' }}>{label}</p>
      <button
        onClick={async () => { const url = await media?.pickImage(); if (url) onChange(url) }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ width: 84, height: 60, objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <span style={{ width: 84, height: 60, borderRadius: 8, border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>+</span>
        )}
        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.5 }}>
          {value ? 'Byt bild' : hint}
        </span>
      </button>
      {value && (
        <button onClick={() => onChange('')} style={{ marginTop: 6, fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: F, padding: 0 }}>
          Ta bort bilden
        </button>
      )}
    </div>
  )
}

/* Logo and team photos. Stored as files like every other picture — inline
   image data would ride along in the HTML of every single page view. */
function ImageUpload({ value, onChange, label, round }: {
  value: string; onChange: (url: string) => void; label: string; round?: boolean
}) {
  const media = useMedia()
  return (
    <button
      onClick={async () => { const url = await media?.pickImage(); if (url) onChange(url) }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" style={{ width: 56, height: 56, borderRadius: round ? '50%' : 8, objectFit: 'cover' }} />
      ) : (
        <span style={{ width: 56, height: 56, borderRadius: round ? '50%' : 8, border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>+</span>
      )}
      <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: F }}>{label}</span>
    </button>
  )
}

/* One collapsible part of the page. Open one at a time keeps the panel calm. */
function Section({ id, title, hint, open, onToggle, children, enabled, onEnabledChange, onMoveUp, onMoveDown, flash }: {
  id: string; title: string; hint?: string
  open: boolean; onToggle: () => void
  children: React.ReactNode
  enabled?: boolean; onEnabledChange?: (v: boolean) => void
  /** Movable sections: up/down here moves the section on the page itself. */
  onMoveUp?: () => void; onMoveDown?: () => void
  /** Just arrived here from a click on the page — mark it briefly. */
  flash?: boolean
}) {
  const arrow = (dir: '↑' | '↓', fn?: () => void) => (
    <button
      onClick={e => { e.stopPropagation(); fn?.() }}
      disabled={!fn}
      title={fn ? (dir === '↑' ? 'Flytta upp på sidan' : 'Flytta ner på sidan') : undefined}
      style={{ background: 'none', border: 'none', padding: '0 2px', fontSize: 13, lineHeight: 1, cursor: fn ? 'pointer' : 'default', color: fn ? '#64748b' : '#1e293b' }}
    >
      {dir}
    </button>
  )
  return (
    // flexShrink 0: the panel is a fixed-height flex column — without this,
    // overflowing sections get squeezed and clipped instead of scrolling.
    // data-panel-section is how goTo() finds this to scroll it into view.
    <div
      data-panel-section={id}
      style={{
        border: `1px solid ${flash ? '#eab308' : '#1e293b'}`,
        boxShadow: flash ? '0 0 0 3px rgba(234,179,8,0.15)' : 'none',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        borderRadius: 12, overflow: 'hidden', background: '#0f172a', flexShrink: 0, scrollMarginTop: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', cursor: 'pointer' }} onClick={onToggle}>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: F }}>
            {title}
            {/* Names the connection out loud: this is the piece you clicked */}
            {flash && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', background: '#eab308', borderRadius: 999, padding: '2px 8px', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                Vald på sidan
              </span>
            )}
          </span>
          {hint && <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: F, marginTop: 2 }}>{hint}</span>}
        </span>
        {(onMoveUp || onMoveDown) && (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {arrow('↑', onMoveUp)}
            {arrow('↓', onMoveDown)}
          </span>
        )}
        {onEnabledChange && (
          <button
            onClick={e => { e.stopPropagation(); onEnabledChange(!enabled) }}
            title={enabled ? 'Visas på sidan — klicka för att dölja' : 'Dold — klicka för att visa'}
            style={{
              width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: enabled ? '#eab308' : '#334155', position: 'relative', transition: 'background 0.15s',
            }}
          >
            <span style={{ position: 'absolute', top: 2, left: enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
          </button>
        )}
        <span style={{ color: '#64748b', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '4px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }} data-section={id}>
          {/* The arrows in the header are two small glyphs; a rookie has no
              reason to guess what they move. Say it once, while it is open. */}
          {(onMoveUp || onMoveDown) && (
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, margin: 0 }}>
              Pilarna ↑↓ högst upp flyttar den här delen på sidan.
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  )
}

/* ── The editor ────────────────────────────────────────────────────── */

export function PanelEditor({ template, industry, initialContent, siteSlug, templates }: {
  template:       Template
  industry:       string
  initialContent: Partial<SiteContent>
  siteSlug?:      string
  /** Every design available for this industry — the customer can change
   *  their mind after onboarding without starting over. */
  templates?:     Template[]
}) {
  const defaults = SITE_DEFAULTS[industry] ?? SITE_DEFAULTS.other
  /* A site that has never been given a team or articles opens with the
   * examples in place — the customer rewrites rather than starts blank. */
  const [content, setContent] = useState<SiteContent>(
    withExamples({ ...defaults, ...initialContent } as SiteContent, industry)
  )
  const [images,  setImages]  = useState<string[]>((initialContent as SiteContent).gallery_images ?? Array(6).fill(''))
  const [alts,    setAlts]    = useState<string[]>((initialContent as SiteContent).gallery_alts ?? Array(6).fill(''))
  const [logo,    setLogo]    = useState<string>((initialContent as SiteContent).logo ?? '')
  const [featuredReviews, setFeaturedReviews] = useState<Testimonial[]>(
    ((initialContent as SiteContent).featured_reviews ?? []) as Testimonial[]
  )
  const [siteFeatures, setSiteFeatures] = useState<Record<string, boolean>>({
    booking: true, pricelist: true, gallery: true, contact: true, blog: false, reviews: true, about: true,
    ...((initialContent as SiteContent).siteFeatures ?? {}),
  })
  /* The whole page's order — every section except the footer. Older saves
   * that only ordered three sections merge in without moving anything else. */
  const [sectionOrder, setSectionOrder] = useState<string[]>(() =>
    orderedIds(PAGE_SECTIONS, (initialContent as SiteContent).sectionOrder)
  )
  const [articles,  setArticles]  = useState<Article[]>(
    (initialContent as SiteContent).articles ?? exampleArticles(industry)
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  /** Which section's own page is open in the big workspace, if any. */
  const [editingPage, setEditingPage] = useState<SectionPageId | null>(null)
  /** The picture-swapping workspace, opened from the kom igång list. */
  const [swapping, setSwapping] = useState(false)
  const [design,    setDesign]    = useState<Template>(template)
  const [fontBusy,  setFontBusy]  = useState(false)
  const [fontError, setFontError] = useState('')

  const [open,      setOpen]      = useState<string>('hero')
  const [dirty,     setDirty]     = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState(false)
  /* The site's address — editable, since the URL is part of how the customer
   * gets indexed. Old addresses keep redirecting after a change. */
  const [currentSlug, setCurrentSlug] = useState(siteSlug ?? '')
  const [slugValue,   setSlugValue]   = useState(siteSlug ?? '')
  const [slugError,   setSlugError]   = useState('')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')

  const [pickerReviews,  setPickerReviews]  = useState<MockReview[]>(MOCK_REVIEWS)
  const [reviewsLoading, setReviewsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gbp/reviews')
      .then(r => r.json())
      .then(data => {
        if (data.reviews?.length) {
          setPickerReviews(
            data.reviews
              .filter((r: { text?: string; author?: string; rating?: number }) => r.text && r.author && r.rating)
              .map((r: { text: string; author: string; rating: number }) => ({ author: r.author, rating: r.rating, text: r.text } as MockReview))
          )
        }
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false))
  }, [])

  function touch() { setDirty(true); setSaved(false) }
  function patch(k: keyof SiteContent, v: string) { setContent(p => ({ ...p, [k]: v })); touch() }
  /* The site's own headings. Empty = the default (shown as placeholder), so a
   * customer writing in French just types over every heading they see. */
  function patchLabel(key: string, v: string) {
    setContent(p => ({ ...p, labels: { ...(p.labels ?? {}), [key]: v } })); touch()
  }
  function patchSocial(key: 'instagram' | 'facebook' | 'tiktok', v: string) {
    setContent(p => ({ ...p, social: { ...(p.social ?? {}), [key]: v } })); touch()
  }
  /* Colors: the accent stands alone; a background choice brings its whole
   * derived palette so the page always stays readable. */
  function setAccent(hex: string) {
    setContent(p => ({ ...p, colorOverrides: { ...(p.colorOverrides ?? {}), a: hex } })); touch()
  }
  /* Background: menu and section tones always follow. Text follows too —
   * but only until the customer has picked a text color of their own. A made
   * choice is never silently overwritten; body text is still re-softened
   * toward the new background so the pair keeps fitting together. */
  function setBackground(hex: string) {
    setContent(p => {
      const palette: Partial<typeof design.colors> = paletteFromBg(hex)
      if (p.textColorPicked && p.colorOverrides?.h) {
        delete palette.h
        palette.s = mix(p.colorOverrides.h, hex, 0.35)
      }
      return { ...p, colorOverrides: { ...(p.colorOverrides ?? {}), ...palette } }
    }); touch()
  }
  /* One text color choice sets both voices: headings take it straight,
   * body text gets it softened toward the background. */
  function setTextColor(hex: string) {
    setContent(p => {
      const bg = p.colorOverrides?.bg ?? design.colors.bg
      return { ...p, textColorPicked: true, colorOverrides: { ...(p.colorOverrides ?? {}), h: hex, s: mix(hex, bg, 0.35) } }
    }); touch()
  }
  function resetColors() {
    setContent(p => ({ ...p, colorOverrides: {}, textColorPicked: false })); touch()
  }

  /* Switching design starts the new one from scratch.
   *
   * Carrying the old choices over sounds generous and is not: a heading colour
   * picked to read on a dark theme disappears on a cream one, and a photograph
   * uploaded into a slot the new design does not have simply vanishes with no
   * explanation. Each design is drawn as a whole, so the customer gets it whole
   * and adjusts from there. Nothing is destroyed — every picture they have
   * uploaded stays in Dina bilder, and Ångra brings the old design back until
   * they save. */
  function switchDesign(t: Template) {
    setDesign(t)
    setContent(p => ({
      ...p,
      colorOverrides:  {},
      textColorPicked: false,
      // The three layout picture slots and the surface. The gallery, the logo
      // and the team portraits look the same in every design, so they stay.
      heroImage:     undefined,
      featureImage:  undefined,
      aboutImage:    undefined,
      backdropImage: undefined,
      backdrop:      undefined,
    }))
    touch()
  }
  /* The customer's own figures. Blank rows simply don't appear on the site —
   * that is how the templates' example numbers stop being published as fact. */
  function patchStat(i: number, field: 'num' | 'label', v: string) {
    setContent(p => {
      const stats = [...(p.stats ?? [])]
      while (stats.length < 4) stats.push({ num: '', label: '' })
      stats[i] = { ...stats[i], [field]: v }
      return { ...p, stats }
    }); touch()
  }

  /* Featured services = starred rows in the price list. Starring a fourth
   * replaces the oldest pick, so the default placeholders rotate out naturally. */
  function toggleFeatured(item: ServiceEntry) {
    setContent(p => {
      const on = p.services.some(s => s.name === item.name)
      const next: ServiceItem = { name: item.name, desc: item.desc, price: item.hidePrice ? '' : item.price }
      if (on) return { ...p, services: p.services.filter(s => s.name !== item.name) }
      const kept = p.services.length >= 3 ? p.services.slice(1) : p.services
      return { ...p, services: [...kept, next] }
    }); touch()
  }

  /* Booking-page customers keep their prices in one place — theirs. What we
   * edit here is the shop window: four services, the first one large. */
  function patchPromo(i: number, f: keyof ServiceItem, v: string) {
    setContent(p => {
      const next = [...(p.services ?? [])]
      while (next.length <= i) next.push({ name: '', desc: '', price: '' })
      next[i] = { ...next[i], [f]: v }
      return { ...p, services: next }
    }); touch()
  }

  /* Price list */
  function patchCatName(ci: number, v: string) {
    setContent(p => ({ ...p, menuCategories: p.menuCategories.map((c, i) => i === ci ? { ...c, category: v } : c) })); touch()
  }
  function patchItemField(ci: number, ii: number, f: keyof ServiceEntry, v: string) {
    setContent(p => ({
      ...p,
      menuCategories: p.menuCategories.map((cat, i) => i !== ci ? cat : {
        ...cat, items: cat.items.map((item, j) => j === ii ? { ...item, [f]: v } : item),
      }),
    })); touch()
  }
  function toggleItemBool(ci: number, ii: number, f: 'hidePrice' | 'hideDuration') {
    setContent(p => ({
      ...p,
      menuCategories: p.menuCategories.map((cat, i) => i !== ci ? cat : {
        ...cat, items: cat.items.map((item, j) => j === ii ? { ...item, [f]: !item[f] } : item),
      }),
    })); touch()
  }
  function toggleAllBool(f: 'hidePrice' | 'hideDuration') {
    setContent(p => {
      const allHidden = p.menuCategories.every(cat => cat.items.every(item => item[f]))
      return {
        ...p,
        menuCategories: p.menuCategories.map(cat => ({
          ...cat, items: cat.items.map(item => ({ ...item, [f]: !allHidden })),
        })),
      }
    }); touch()
  }
  function addCategory() {
    setContent(p => ({ ...p, menuCategories: [...p.menuCategories, { category: 'Ny kategori', items: [] }] })); touch()
  }
  function removeCategory(ci: number) {
    setContent(p => ({ ...p, menuCategories: p.menuCategories.filter((_, i) => i !== ci) })); touch()
  }
  function addItem(ci: number) {
    setContent(p => ({
      ...p,
      menuCategories: p.menuCategories.map((cat, i) => i !== ci ? cat : {
        ...cat, items: [...cat.items, { name: 'Ny tjänst', desc: '', price: '0 kr' }],
      }),
    })); touch()
  }
  function removeItem(ci: number, ii: number) {
    setContent(p => ({
      ...p,
      menuCategories: p.menuCategories.map((cat, i) => i !== ci ? cat : {
        ...cat, items: cat.items.filter((_, j) => j !== ii),
      }),
    })); touch()
  }

  /* Reviews */
  function toggleFeaturedReview(r: MockReview) {
    setFeaturedReviews(prev => {
      const on = prev.some(x => x.author === r.author && x.text === r.text)
      return on ? prev.filter(x => !(x.author === r.author && x.text === r.text)) : [...prev, { ...r, source: 'google' as const }]
    }); touch()
  }
  function addTestimonial(t: Testimonial) { setFeaturedReviews(p => [...p, t]); touch() }
  function removeTestimonial(i: number)   { setFeaturedReviews(p => p.filter((_, j) => j !== i)); touch() }

  /* Team */
  function patchTeam(i: number, f: keyof TeamMember, v: string) {
    setContent(p => ({ ...p, team: (p.team ?? []).map((m, j) => j === i ? { ...m, [f]: v } : m) })); touch()
  }
  /* Section order: up/down in the panel = up/down on the page */
  function moveSection(id: string, dir: -1 | 1) {
    setSectionOrder(prev => {
      const i = prev.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    touch()
  }

  /* Gallery order: the best picture belongs first, not wherever it was
   * uploaded. Image and its description move together. */
  function swapGallery(i: number, j: number) {
    const swap = (arr: string[]) => { const n = [...arr]; [n[i], n[j]] = [n[j], n[i]]; return n }
    setImages(swap); setAlts(swap); touch()
  }

  /* Articles. Publishing the first one switches the section on — nobody
   * writes an article intending to keep it off their own site. */
  function changeArticles(next: Article[]) {
    setArticles(next)
    if (next.some(a => a.published) && !siteFeatures.blog) {
      setSiteFeatures(p => ({ ...p, blog: true }))
    }
    touch()
  }
  function addArticle() {
    const id = `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`
    changeArticles([emptyArticle(id, new Date().toISOString().slice(0, 10)), ...articles])
    setEditingId(id)
  }

  function addTeamMember()      { setContent(p => ({ ...p, team: [...(p.team ?? []), { name: '', title: '', image: '' }] })); touch() }
  function removeTeamMember(i: number) { setContent(p => ({ ...p, team: (p.team ?? []).filter((_, j) => j !== i) })); touch() }

  /* Own pages: the section stays on the start page, or gets a page of its
   * own — a menu button, its own name, and room for more content. */
  function patchPage(id: SectionPageId, part: Partial<SectionPageConfig>) {
    setContent(p => ({ ...p, sectionPages: { ...(p.sectionPages ?? {}), [id]: { ...(p.sectionPages?.[id] ?? {}), ...part } } }))
    touch()
  }

  /* Every either/or in the panel wears the same clothes: two cards that say
   * plainly what the visitor gets. A customer who has never built a website
   * cannot be expected to work out what a bare switch does. */
  const choiceCard = (active: boolean, title: string, desc: string, onPick: () => void) => (
    <button
      key={title}
      onClick={onPick}
      style={{
        textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
        background: active ? 'rgba(234,179,8,0.08)' : '#1e293b',
        border: `1px solid ${active ? '#eab308' : '#334155'}`,
      }}
    >
      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: active ? '#eab308' : '#e2e8f0', fontFamily: F, marginBottom: 3 }}>
        {active ? '✓ ' : ''}{title}
      </span>
      <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', fontFamily: F, lineHeight: 1.5 }}>{desc}</span>
    </button>
  )

  /** The little yellow switch — same look as the section on/off toggles. */
  const miniSwitch = (on: boolean, flip: () => void, titles: [string, string]) => (
    <button
      onClick={flip}
      title={on ? titles[0] : titles[1]}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: on ? '#eab308' : '#334155', position: 'relative', transition: 'background 0.15s',
      }}
    >
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
    </button>
  )

  /* The "own page" choice a section panel ends with.
   *
   * Two cards, not a switch: a customer who has never built a website can't
   * be expected to know what "egen sida" would even do, so each option says
   * plainly what the visitor gets. The writing itself happens in the big
   * workspace — a 400px column is the wrong place to place photos. */
  const pageEditor = (id: SectionPageId) => {
    const cfg   = content.sectionPages?.[id] ?? {}
    const on    = cfg.enabled ?? SECTION_PAGES[id].defaultEnabled
    const name  = cfg.title?.trim() || siteLabel(content.labels, SECTION_PAGES[id].labelKey)
    const extra = (cfg.blocks ?? []).length
    /* Photos, reviews and articles are the customer's to supply — the page
     * waits for them rather than going live as an empty room. */
    const ready = sectionHasMaterial(
      { ...content, gallery_images: images, featured_reviews: featuredReviews, articles },
      id,
    )
    const missing: Record<string, string> = {
      blog: 'Publicera minst en artikel ovan, så får artiklarna sin egen sida.',
    }

    const choice = (mode: boolean, title: string, desc: string) =>
      choiceCard(on === mode, title, desc, () => { if (on !== mode) patchPage(id, { enabled: mode }) })

    return (
      <>
        {/* The price list asks this question with its own three cards higher
            up, where it belongs together with where the prices live. */}
        {id !== 'pricelist' && (
          <>
            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Var ska den här delen synas?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {choice(false, 'Bara på startsidan', 'Besökaren ser delen när de skrollar på startsidan. Inget mer.')}
              {choice(true,  'Också som en egen sida', 'Delen får dessutom en sida för sig själv, en knapp i menyn högst upp och en Läs mer-länk på startsidan.')}
            </div>
          </>
        )}
        {on && !ready && (
          <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
            {missing[id]}
          </p>
        )}
        {on && ready && (
          <button
            onClick={() => setEditingPage(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              padding: '11px 12px', borderRadius: 8, cursor: 'pointer',
              background: '#0f172a', border: '1px solid #334155',
            }}
          >
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#e2e8f0', fontFamily: F, marginBottom: 2 }}>
                Sidan heter &quot;{name}&quot;
              </span>
              <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', fontFamily: F }}>
                {extra
                  ? `Byt namn eller ändra din text (${extra} ${extra === 1 ? 'del' : 'delar'})`
                  : 'Sidan är ifylld — öppna för att byta namn eller skriva om texten'}
              </span>
            </span>
            <span style={{ fontSize: 13, color: '#eab308', fontFamily: F }}>Öppna →</span>
          </button>
        )}
      </>
    )
  }

  /* Every placeholder we shipped, with the way to replace each one. Built
   * from live state so the list shrinks as the customer works through it. */
  const placeholders: Placeholder[] = (() => {
    const out: Placeholder[] = []
    ;(content.team ?? []).forEach((m, i) => {
      if (!isExampleImage(m.image)) return
      out.push({
        key: `team-${i}`, where: `Teamet: ${m.name || 'medarbetare'}`, what: 'Porträtt', src: m.image,
        replace: url => patchTeam(i, 'image', url),
      })
    })
    articles.forEach((a, ai) => {
      const where = `Artikel: ${a.title || 'utan rubrik'}`
      if (isExampleImage(a.cover)) {
        out.push({
          key: `art-${a.id}-cover`, where, what: 'Huvudbild', src: a.cover,
          replace: url => setArticles(prev => prev.map((x, j) => j === ai ? { ...x, cover: url } : x)),
        })
      }
      a.blocks.forEach((b, bi) => {
        if (b.type !== 'images') return
        b.images.forEach((im, ii) => {
          if (!isExampleImage(im.src)) return
          out.push({
            key: `art-${a.id}-${bi}-${ii}`, where, what: `Bild ${ii + 1} i texten`, src: im.src,
            replace: url => setArticles(prev => prev.map((x, j) => j !== ai ? x : {
              ...x,
              blocks: x.blocks.map((bb, k) => k !== bi || bb.type !== 'images' ? bb
                : { ...bb, images: bb.images.map((y, l) => l === ii ? { ...y, src: url } : y) }),
            })),
          })
        })
      })
    })
    return out
  })()
  const placeholdersLeft = placeholders.length

  /* Where the prices live, and whether the list has a page of its own — one
   * question with three answers, asked in the Prislista panel. */
  const externalPricelist = content.pricelistMode === 'booking' && !!content.bookingUrl?.trim()
  const ownPricePage = content.sectionPages?.pricelist?.enabled ?? SECTION_PAGES.pricelist.defaultEnabled
  /** Booking page AND only four services shown here — the compact shape. */
  const promoOnly = externalPricelist && (content.pricelistPreview ?? 'promo') === 'promo'
  /* A search phrase built from the customer's own words — "klippning pris
   * södermalm" lands harder than any generic example could. */
  const priceQueryExample = [
    (content.services?.[0]?.name || content.menuCategories?.[0]?.items?.[0]?.name || 'klippning').toLowerCase(),
    'pris',
    content.address?.split(',')[0]?.trim().toLowerCase() ?? '',
  ].filter(Boolean).join(' ')

  const checklist: ChecklistItem[] = [
    { id: 'name',    label: 'Namn och stora rubriken',   done: !!content.businessName.trim() && !!content.heroHeading.trim(), section: 'hero',
      hint: 'Det första besökaren läser' },
    { id: 'price',
      label: externalPricelist ? 'Fyra tjänster att lyfta fram' : 'Prislista med dina priser',
      // With the prices on the booking page there is no list here to fill in;
      // what needs filling is the four services the start page shows off.
      done: promoOnly
        ? (content.services ?? []).filter(s => s.name?.trim()).length >= 4
        : (content.menuCategories?.length ?? 0) > 0,
      section: 'pricelist',
      hint: 'Priserna är det besökarna söker efter' },
    { id: 'logo',    label: 'Ladda upp din logga',       done: !!logo, section: 'brand',
      hint: 'Syns överst på varje sida' },
    { id: 'photos',  label: placeholdersLeft > 0 ? `Byt ut exempelbilderna (${placeholdersLeft} kvar)` : 'Byt ut exempelbilderna',
      done: placeholdersLeft === 0, section: SWAP_IMAGES,
      hint: 'Dina egna foton är det som får någon att boka' },
    /* Our example reviews do not tick this off — they never publish, so a
       site that still shows only them has an empty reviews section live. */
    { id: 'reviews', label: 'Välj omdömen som visas',    done: featuredReviews.some(r => r.source !== 'example'), section: 'reviews',
      hint: 'Andras ord väger tyngre än dina egna' },
    { id: 'about',   label: 'Skriv om Om oss-texten',    done: content.aboutBody.trim() !== (defaults.aboutBody ?? '').trim(), section: 'about',
      hint: 'Exempeltexten ligger kvar tills du gjort den till din' },
  ]

  /* Dina bilder: everything ever uploaded plus everything already in use on
   * the site — so the library is full the first time anyone opens it. */
  const mediaLibrary = (() => {
    const used = [
      ...images, logo, content.heroImage, content.featureImage, content.aboutImage,
      ...(content.team ?? []).map(m => m.image),
      ...articles.flatMap(a => [a.cover, ...a.blocks.flatMap(b => b.type === 'images' ? b.images.map(im => im.src) : [])]),
    ]
    return [...new Set([...(content.mediaLibrary ?? []), ...used])]
      .filter((u): u is string => !!u && !isExampleImage(u))
  })()
  function addToLibrary(url: string) {
    setContent(p => ({ ...p, mediaLibrary: [...new Set([...(p.mediaLibrary ?? []), url])] }))
    touch()
  }
  /* The picker lives in a provider so nested editors reach it too; inside
   * PanelEditor itself we are above that provider, so we drive it directly. */
  const mediaRef = useRef<{ pickImage: () => Promise<string | null> } | null>(null)
  const pickImage = () => mediaRef.current?.pickImage() ?? Promise.resolve(null)

  /* Ångra: everything the customer can lose, bundled. The snapshot starts as
   * the loaded site and moves forward on every successful save — so "Ångra
   * ändringar" always means "back to how the live page looks right now". */
  function takeSnapshot() {
    return { content, images, alts, logo, featuredReviews, siteFeatures, sectionOrder, articles }
  }
  const [savedState, setSavedState] = useState(takeSnapshot)
  const [confirmUndo, setConfirmUndo] = useState(false)
  function restoreSaved() {
    setContent(savedState.content)
    setImages(savedState.images); setAlts(savedState.alts); setLogo(savedState.logo)
    setFeaturedReviews(savedState.featuredReviews); setSiteFeatures(savedState.siteFeatures)
    setSectionOrder(savedState.sectionOrder); setArticles(savedState.articles)
    setDirty(false); setConfirmUndo(false); setSlugValue(currentSlug); setSlugError('')
  }

  /* A failed save must never look like a successful one — a customer who
   * closes the tab on a false "Sparat ✓" loses their work believing it safe. */
  async function save(): Promise<boolean> {
    setSaving(true); setSaveError(false); setSlugError('')
    try {
      const res = await fetch('/api/webbplats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: design.id,
          ...(slugValue.trim() && slugValue !== currentSlug ? { slug: slugValue.trim() } : {}),
          content: { ...content, gallery_images: images, gallery_alts: alts, logo, featured_reviews: featuredReviews, siteFeatures, sectionOrder, articles },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Address errors get their own message — the fix is in that field
        if (res.status === 400 || res.status === 409) {
          setSlugError(data.error ?? 'Adressen kunde inte sparas')
          setOpen('google')
        }
        throw new Error(`save failed: ${res.status}`)
      }
      if (data.slug) { setCurrentSlug(data.slug); setSlugValue(data.slug) }
      // What just went live is the new "back to" point for Ångra
      setSavedState(takeSnapshot())
      setDirty(false); setSaved(true)
      return true
    } catch {
      setSaveError(true)
      return false
    } finally {
      setSaving(false)
    }
  }

  /* Leaving with unsaved changes deserves a stop sign — a habitual click on
   * "← Dashboard" after ten minutes of editing must not cost the work.
   *
   * The stop sign is our own dialog, not the browser's: confirm() and the
   * beforeunload prompt are silently swallowed in embedded browsers, and a
   * warning that sometimes doesn't show is worse than none. Every link click
   * is intercepted while dirty; the dialog then offers the three honest ways
   * out. beforeunload stays as a second line for tab-close and reload, where
   * a page cannot draw its own UI. */
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null)
  const leavingRef = useRef(false)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      if (leavingRef.current) return
      e.preventDefault(); e.returnValue = ''
    }
    const guardClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest?.('a[href]')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (a.getAttribute('target') === '_blank' || href.startsWith('#')) return
      e.preventDefault()
      e.stopPropagation()
      setLeaveTarget((a as HTMLAnchorElement).href)
    }
    window.addEventListener('beforeunload', warn)
    document.addEventListener('click', guardClick, true)
    return () => {
      window.removeEventListener('beforeunload', warn)
      document.removeEventListener('click', guardClick, true)
    }
  }, [dirty])

  /* The preview IS the published renderer — same component, same content */
  const previewContent: PublicContent = {
    ...(content as unknown as PublicContent),
    gallery_images: images,
    gallery_alts:   alts,
    logo,
    featured_reviews: featuredReviews,
    siteFeatures,
    sectionOrder,
    articles,
  }
  /** Which own pages exist right now — decides the preview's tabs. */
  const contentForPages = previewContent

  /* Scale the fixed-width page to the pane.
   *
   * A callback ref, not a plain one: the pane is unmounted while an article is
   * being written and comes back as a different element. A one-shot effect
   * would keep measuring the old node — and the width of 0 it reports on its
   * way out would scale the page to nothing when it returned. */
  const observer = useRef<ResizeObserver | null>(null)
  const [paneW, setPaneW] = useState(720)
  const paneRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect()
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w > 0) setPaneW(w)
    })
    ro.observe(el)
    observer.current = ro
  }, [])
  const pageW  = device === 'desktop' ? 1280 : 390
  const scale  = Math.min(1, paneW / pageW)

  const toggle  = (id: string) => { setFlashed(''); setMarkedField(''); setOpen(o => o === id ? '' : id) }

  /* Sending someone to a section is not the same as opening it: the panel is
   * a long scrolling column, so an opened section can easily sit off-screen.
   * Open, then bring it into view — otherwise the click looks like it did
   * nothing at all. */
  const panelRef = useRef<HTMLDivElement | null>(null)
  /* Which section was just reached by clicking the page. The panel marks it
   * for a moment: after a click over on the preview, the eye needs telling
   * where in the list it landed — otherwise the connection between the two
   * halves of the screen has to be worked out rather than seen. */
  const [flashed, setFlashed] = useState('')
  /** The single field the click landed on, when the text could be placed. */
  const [markedField, setMarkedField] = useState('')

  /* The floating layer over the preview: the label following the cursor, the
   * move/hide tools pinned to the hovered section, and the text bubble open
   * at a clicked heading. */
  const [hoverChip, setHoverChip] = useState<{ x: number; y: number; label: string } | null>(null)
  const [hoverSec,  setHoverSec]  = useState<{ id: string; x: number; y: number } | null>(null)
  const [bubble,    setBubble]    = useState<{ field: string; x: number; y: number } | null>(null)
  /** Which of the site's pages the preview shows. */
  const [previewPage, setPreviewPage] = useState<'start' | SectionPageId>('start')

  /* Click a picture, get the picker, and the new choice lands exactly where
   * the old picture sat — gallery slot three, the hero image, a team photo.
   * The DOM src is absolute while stored values may be relative, so match on
   * the tail rather than equality. */
  async function swapPageImage(fullSrc: string) {
    const hit = (s?: string) => !!s && (s === fullSrc || fullSrc.endsWith(s))
    const inGallery  = images.some(hit)
    const slotKey    = (['heroImage', 'featureImage', 'aboutImage'] as const).find(k => hit(content[k]))
    const inTeam     = (content.team ?? []).some(m => hit(m.image))
    const inArticles = articles.some(a => hit(a.cover) || a.blocks.some(b => b.type === 'images' && b.images.some(im => hit(im.src))))
    const inPages    = Object.values(content.sectionPages ?? {}).some(p =>
      (p?.blocks ?? []).some(b => b.type === 'images' && b.images.some(im => hit(im.src))))
    if (!inGallery && !slotKey && !hit(logo) && !inTeam && !inArticles && !inPages) return

    const url = await pickImage()
    if (!url) return
    if (inGallery)  { setImages(prev => prev.map(s => hit(s) ? url : s)); touch(); return }
    if (hit(logo))  { setLogo(url); touch(); return }
    if (slotKey)    { setContent(p => ({ ...p, [slotKey]: url })); touch(); return }
    if (inTeam) {
      setContent(p => ({ ...p, team: (p.team ?? []).map(m => hit(m.image) ? { ...m, image: url } : m) })); touch(); return
    }
    if (inArticles) {
      setArticles(prev => prev.map(a => ({
        ...a,
        cover: hit(a.cover) ? url : a.cover,
        blocks: a.blocks.map(b => b.type === 'images' ? { ...b, images: b.images.map(im => hit(im.src) ? { ...im, src: url } : im) } : b),
      }))); touch(); return
    }
    setContent(p => ({
      ...p,
      sectionPages: Object.fromEntries(Object.entries(p.sectionPages ?? {}).map(([k, pg]) => [k, {
        ...pg,
        blocks: (pg?.blocks ?? []).map(b => b.type === 'images' ? { ...b, images: b.images.map(im => hit(im.src) ? { ...im, src: url } : im) } : b),
      }])),
    })); touch()
  }

  function goTo(sectionId: string, fromPage = false, field = '') {
    /* The field decides where we land, not where the click happened: the
     * booking button sits in the nav but its words live in Stora rubriken,
     * and the customer wants the box that changes it. */
    const id = (field && FIELD_SECTION[field]) || sectionId
    setOpen(id)
    setMobilePane('edit')
    // The mark stays as long as that section is the one you picked — a flash
    // that fades while the eye is still travelling across the screen is a
    // mark nobody sees.
    // Mark the exact box when we could place the click, the whole section only
    // when we could not — two marks at once would just ask "which one?"
    setFlashed(fromPage && !field ? id : '')
    setMarkedField(fromPage ? field : '')
    requestAnimationFrame(() => {
      const root = panelRef.current
      // Land on the exact box when we know which one, on the section otherwise
      const target = (field && root?.querySelector(`[data-panel-field="${field}"]`))
        || root?.querySelector(`[data-panel-section="${id}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: field ? 'center' : 'start' })
    })
  }

  /* Which panel field the click landed on.
   *
   * Rather than tagging every heading in ten layouts, the click is matched by
   * what it says: the clicked element's own text against the values the
   * customer typed. A layout can be rebuilt from scratch without anyone
   * remembering to re-tag it, and the same text in two places (the booking
   * button in the nav and in the hero) points at the one field behind both. */
  function fieldUnderCursor(el: HTMLElement): string {
    const named: [string, string | undefined][] = [
      ['heroHeading',  content.heroHeading],
      ['heroBody',     content.heroBody],
      ['kicker',       content.kicker],
      ['ctaText',      content.ctaText],
      ['aboutTitle',   content.aboutTitle],
      ['aboutBody',    content.aboutBody],
      ['businessName', content.businessName],
      ['tagline',      content.tagline],
      ['phone',        content.phone],
      ['address',      content.address],
      ['hours',        content.hours],
    ]
    // Walk out from the click: the innermost element holding exactly one
    // value is the one the customer pointed at.
    let node: HTMLElement | null = el
    for (let i = 0; i < 4 && node; i++) {
      const text = node.textContent?.trim()
      if (text) {
        const found = named.find(([, value]) => value?.trim() && value.trim() === text)
        if (found) return found[0]
      }
      node = node.parentElement
    }
    return ''
  }
  const editing = articles.find(a => a.id === editingId) ?? null
  const slots   = templateImageSlots(design.layout)
  const cfg     = getIndConfig(industry)

  /* A heading field: empty shows the default as placeholder — overwrite it to
   * rename the section, in any language. */
  const LField = (key: string, label: string, placeholder: string) => (
    <Field label={label} value={content.labels?.[key] ?? ''} onChange={v => patchLabel(key, v)} placeholder={placeholder} max={60} />
  )

  /* The people behind the business, edited on the page that shows them. */
  const teamEditor = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 1, background: '#1e293b' }} />
      <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Ska teamet visas?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {choiceCard(content.teamEnabled !== false, 'Ja, visa personerna',
          'Namn, titel och foto på var och en. Ansikten bygger mer förtroende än någon text.',
          () => { setContent(p => ({ ...p, teamEnabled: true })); touch() })}
        {choiceCard(content.teamEnabled === false, 'Nej, bara texten om oss',
          'Personerna sparas kvar men syns inte på sidan.',
          () => { setContent(p => ({ ...p, teamEnabled: false })); touch() })}
      </div>
      {content.teamEnabled !== false && (
        <>
          {LField('teamTitle', 'Rubrik över teamet', SITE_LABELS.teamTitle)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
            {(content.team ?? []).map((m, i) => (
              <div key={i} style={{ border: '1px solid #1e293b', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ImageUpload round value={m.image} onChange={url => patchTeam(i, 'image', url)} label={m.image ? 'Byt foto' : 'Välj foto'} />
                <Field label="Namn" value={m.name} onChange={v => patchTeam(i, 'name', v)} max={40} />
                <Field label="Titel" value={m.title} onChange={v => patchTeam(i, 'title', v)} max={40} />
                <button onClick={() => removeTeamMember(i)} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Ta bort</button>
              </div>
            ))}
          </div>
          {(content.team?.length ?? 0) < 8 && (
            <button onClick={addTeamMember} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#eab308', background: 'none', border: '1px dashed #334155', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: F }}>
              + Lägg till person
            </button>
          )}
        </>
      )}
    </div>
  )

  /** A divider that names what the sections under it have in common. */
  const Zone = (title: string, hint: string) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 2px 2px' }}>
      <span style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, fontWeight: 700 }}>{title}</span>
      <span style={{ fontSize: 11, color: '#475569', fontFamily: F }}>{hint}</span>
      <span style={{ flex: 1, height: 1, background: '#1e293b' }} />
    </div>
  )

  /** True when the prices live on the customer's booking page — the start
   *  page then promotes four services instead of listing everything. */

  /** One area's worth of wording, under a quiet heading. */
  const WGroup = (title: string, fields: React.ReactNode[]) => (
    <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 1, background: '#1e293b' }} />
      <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>{title}</p>
      {fields.map((f, i) => <div key={i}>{f}</div>)}
    </div>
  )

  /* What the site's own menu will read, shown back to the customer so the
   * generated menu is visible rather than a promise. */
  const menuButtons = menuLinks(
    { ...content, gallery_images: images, featured_reviews: featuredReviews, articles } as PublicContent,
    undefined,
    `/s/${currentSlug || 'x'}/tjanster`,
  )

  /* On a phone the panel and the page take turns instead of sharing the row */
  const narrow = useNarrow()
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit')
  const showPanel   = !narrow || mobilePane === 'edit'
  const showPreview = !narrow || mobilePane === 'preview'

  return (
    // The dashboard's mobile top bar is 3.5rem (pt-14); on lg the sidebar sits
    // beside us instead, so the editor gets the full viewport height there.
    <MediaProvider library={mediaLibrary} onAdd={addToLibrary} controlRef={mediaRef}>
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-dvh" style={{ background: '#020617' }}>

      {/* Our own leave-warning — browser dialogs can be silently suppressed */}
      {leaveTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.72)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: '100%', fontFamily: F }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>
              Är du säker på att du vill lämna sidan?
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 18px' }}>
              Du har osparade ändringar — lämnar du utan att spara försvinner de.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setLeaveTarget(null)}
                style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, fontFamily: F, background: 'none', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer' }}
              >
                Stanna kvar
              </button>
              <button
                onClick={() => { leavingRef.current = true; window.location.href = leaveTarget }}
                style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, fontFamily: F, background: 'none', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, cursor: 'pointer' }}
              >
                Lämna utan att spara
              </button>
              <button
                onClick={async () => { if (await save()) { leavingRef.current = true; window.location.href = leaveTarget } }}
                disabled={saving}
                style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: F, background: '#eab308', color: '#0f172a', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                {saving ? 'Sparar…' : 'Spara och lämna'}
              </button>
            </div>
            {saveError && (
              <p style={{ fontSize: 12, color: '#f87171', fontFamily: F, margin: '10px 0 0', textAlign: 'right' }}>
                Kunde inte spara — försök igen eller stanna kvar.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top bar — one row, nothing else to learn */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1e293b', flexWrap: 'wrap' }}>
        <a href="/dashboard" style={{ fontSize: 13, color: '#94a3b8', fontFamily: F, textDecoration: 'none' }}>← Dashboard</a>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: F }}>Redigera webbplats</span>
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: F, border: '1px solid #1e293b', borderRadius: 6, padding: '2px 8px' }}>{design.name}</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
            {(['desktop', 'mobile'] as const).map(d => (
              <button key={d} onClick={() => setDevice(d)} style={{
                padding: '5px 12px', fontSize: 12, fontFamily: F, border: 'none', cursor: 'pointer',
                background: device === d ? '#1e293b' : 'transparent', color: device === d ? '#f1f5f9' : '#64748b',
              }}>
                {d === 'desktop' ? 'Dator' : 'Mobil'}
              </button>
            ))}
          </div>
          {/* The live page shows what is SAVED — sending someone there with
              unsaved edits reads as "my changes are gone". */}
          {currentSlug && (dirty
            ? <span style={{ fontSize: 12, color: '#64748b', fontFamily: F }}>Spara för att se ändringarna live</span>
            : <ExternalLink href={`/s/${currentSlug}`} className="panel-live-link">
                <span style={{ fontSize: 13, color: '#eab308', fontFamily: F }}>Se min sida live →</span>
              </ExternalLink>
          )}
          {saveError && <span style={{ fontSize: 13, color: '#f87171', fontFamily: F }}>Kunde inte spara — försök igen</span>}
          {/* The way back. Knowing it exists is what makes the panel safe to
              poke around in — fear of breaking things keeps rookies from
              touching anything at all. */}
          {dirty && (
            <button
              onClick={() => {
                if (!confirmUndo) { setConfirmUndo(true); return }
                restoreSaved()
              }}
              onBlur={() => setConfirmUndo(false)}
              title="Backa alla ändringar sedan du senast sparade"
              style={{
                padding: '8px 12px', fontSize: 12, fontWeight: 600, fontFamily: F, background: 'none',
                color: confirmUndo ? '#f87171' : '#94a3b8',
                border: `1px solid ${confirmUndo ? 'rgba(239,68,68,0.45)' : '#334155'}`, borderRadius: 8, cursor: 'pointer',
              }}
            >
              {confirmUndo ? 'Säker? Klicka igen' : 'Ångra ändringar'}
            </button>
          )}
          {dirty && (
            <button onClick={save} disabled={saving} style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 700, fontFamily: F,
              background: '#eab308', color: '#0f172a', border: 'none', borderRadius: 8, cursor: 'pointer',
            }}>
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          )}
          {saved && !dirty && <span style={{ fontSize: 13, color: '#4ade80', fontFamily: F }}>Sparat ✓</span>}
        </div>
      </div>

      {/* The one thing a new customer wants to know: is my page up, and where */}
      {currentSlug && !editing && !editingPage && !swapping && (
        <div style={{ padding: '6px 16px', borderBottom: '1px solid #1e293b', fontSize: 12, color: '#64748b', fontFamily: F }}>
          Din sida ligger på{' '}
          <ExternalLink href={`/s/${currentSlug}`}>
            <span style={{ color: '#94a3b8', textDecoration: 'underline' }}>kiterank.se/s/{currentSlug}</span>
          </ExternalLink>
          {' '}— Google hittar den automatiskt.
        </div>
      )}

      {/* Phone: one pane at a time */}
      {narrow && !editing && !editingPage && !swapping && (
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
          {([['edit', 'Redigera'], ['preview', 'Förhandsgranska']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setMobilePane(id)} style={{
              flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, fontFamily: F, border: 'none', cursor: 'pointer',
              background: mobilePane === id ? '#0f172a' : 'transparent',
              color: mobilePane === id ? '#f1f5f9' : '#64748b',
              borderBottom: mobilePane === id ? '2px solid #eab308' : '2px solid transparent',
            }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Writing an article takes over the whole area — the top bar stays, so
          Spara is in the same place it always is. A section's own page gets
          the same treatment, for the same reason. */}
      {swapping ? (
        <SwapImages items={placeholders} onPick={pickImage} onClose={() => setSwapping(false)} />
      ) : editing ? (
        <ArticleWorkspace
          article={editing}
          template={{ ...design, colors: { ...design.colors, ...(content.colorOverrides ?? {}) } }}
          onChange={next => changeArticles(articles.map(a => a.id === next.id ? next : a))}
          onClose={() => setEditingId(null)}
          onDelete={() => { changeArticles(articles.filter(a => a.id !== editing.id)); setEditingId(null) }}
        />
      ) : editingPage ? (
        <PageWorkspace
          id={editingPage}
          pageName={content.sectionPages?.[editingPage]?.title ?? ''}
          placeholder={siteLabel(content.labels, SECTION_PAGES[editingPage].labelKey)}
          sectionSummary={PAGE_SUMMARY[editingPage]}
          blocks={content.sectionPages?.[editingPage]?.blocks ?? []}
          template={{ ...design, colors: { ...design.colors, ...(content.colorOverrides ?? {}) } }}
          content={{ ...content, gallery_images: images, gallery_alts: alts, featured_reviews: featuredReviews, articles } as PublicContent}
          suggestion={sectionPageSuggestion(
            { ...content, gallery_images: images, gallery_alts: alts },
            editingPage,
            industry,
          )}
          industry={industry}
          team={editingPage === 'about' ? teamEditor : undefined}
          onBlocksChange={blocks => patchPage(editingPage, { blocks })}
          onClose={() => setEditingPage(null)}
        />
      ) : (
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Panel — the page's parts, in page order ── */}
        <div ref={panelRef} style={{
          width: narrow ? '100%' : 400, minWidth: 320, overflowY: 'auto', padding: 14,
          display: showPanel ? 'flex' : 'none', flexDirection: 'column', gap: 10,
          borderRight: narrow ? 'none' : '1px solid #1e293b',
        }}>

          {/* The path through everything below — what to do next, not just
              what is possible */}
          <StartChecklist items={checklist} onGo={id => id === SWAP_IMAGES ? setSwapping(true) : goTo(id)} />

          {/* Thirteen sections in one run is past what anyone holds in their
              head. Three quiet dividers make the list explain itself: the top
              is the whole site, the middle IS the page in order, the bottom is
              rarely touched. */}
          {Zone('Grunden', 'Gäller hela sajten')}

          {/* First thing in the panel: without this link, no button on the
              site can take a booking — everything else is decoration. */}
          <Section id="booking" title="Bokning" hint="Vart alla boka-knappar leder" open={open === 'booking'} onToggle={() => toggle('booking')} flash={flashed === 'booking'}>
            <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
              Alla boka-knappar på sidan leder till ditt bokningssystem som ingår — kunderna väljer
              behandling, person och tid, och bokningarna dyker upp under Bokningar här i panelen.
            </p>
            <Field label="Egen bokningslänk (valfritt)" value={content.bookingUrl} onChange={v => patch('bookingUrl', v)} placeholder="https://…" />
            {!content.bookingUrl.trim() ? (
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-6px 0 0' }}>
                Tomt = bokningssystemet som ingår. Använder du en annan tjänst, t.ex. Bokadirekt,
                klistrar du in adressen här så leder knapparna dit i stället.
              </p>
            ) : (
              <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: F, lineHeight: 1.5, margin: '-6px 0 0' }}>
                Knapparna leder till din externa bokningssida. Rensa fältet för att använda
                bokningssystemet som ingår.
              </p>
            )}
          </Section>

          <Section id="brand" title="Logga & namn" hint="Det som syns överst på sidan" open={open === 'brand'} onToggle={() => toggle('brand')} flash={flashed === 'brand'}>
            <ImageUpload value={logo} onChange={url => { setLogo(url); touch() }} label={logo ? 'Byt logga (visas i stället för namnet)' : 'Ladda upp logga (annars visas namnet)'} />
            {logo && <button onClick={() => { setLogo(''); touch() }} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: F }}>Ta bort loggan</button>}
            <Field label="Företagsnamn" value={content.businessName} onChange={v => patch('businessName', v)} field='businessName' marked={markedField === 'businessName'} max={40} />
            <Field label="Kort slogan" value={content.tagline} onChange={v => patch('tagline', v)} field='tagline' marked={markedField === 'tagline'} max={60} />

            <div style={{ height: 1, background: '#1e293b' }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 6px' }}>Sidans språk</p>
              <select
                value={content.siteLang ?? 'sv'}
                onChange={e => { patch('siteLang', e.target.value) }}
                style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: F, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' }}
              >
                {[['sv', 'Svenska'], ['en', 'Engelska'], ['fr', 'Franska'], ['de', 'Tyska'], ['es', 'Spanska'], ['fi', 'Finska'], ['no', 'Norska'], ['da', 'Danska'], ['ar', 'Arabiska']].map(([v, n]) => (
                  <option key={v} value={v}>{n}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '6px 0 0' }}>
                Talar om för Google vilket språk sidan är skriven på. Texterna skriver du själv.
              </p>
            </div>
          </Section>

          {/* The menu, in one place: every button the site shows and what it
              is called. The buttons themselves are generated from the pages
              that are switched on, so this is where a page gets its name —
              renaming here renames the button, the page heading and the
              search-result title in one go. */}
          <Section id="menu" title="Meny" hint="Knapparna högst upp och vad sidorna heter" open={open === 'menu'} onToggle={() => toggle('menu')} flash={flashed === 'menu'}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {menuButtons.map(l => (
                <span key={l.label} style={{ fontSize: 12, color: '#cbd5e1', fontFamily: F, background: '#1e293b', border: '1px solid #334155', borderRadius: 999, padding: '4px 11px' }}>
                  {l.label}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
              Så här ser menyn ut på sidan. Den skapas av de delar du gett en egen sida — döp om dem här.
            </p>

            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Sidornas namn</p>
            {SECTION_PAGE_IDS.map(id => {
              const on = sectionPageEnabled(
                { ...content, gallery_images: images, featured_reviews: featuredReviews, articles } as PublicContent,
                id,
              )
              if (!on) return null
              return (
                <Field
                  key={id}
                  label={PAGE_LABEL[id]}
                  value={content.sectionPages?.[id]?.title ?? ''}
                  onChange={v => patchPage(id, { title: v })}
                  placeholder={siteLabel(content.labels, SECTION_PAGES[id].labelKey)}
                  max={30}
                />
              )
            })}
            <Field
              label="Kontakt"
              value={content.labels?.contactTitle ?? ''}
              onChange={v => patchLabel('contactTitle', v)}
              placeholder={SITE_LABELS.contactTitle}
              max={30}
            />
            {LField('readMore', 'Läs mer-länken på startsidan', SITE_LABELS.readMore)}
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
              Lämnar du ett fält tomt används namnet i grått. Delar utan egen sida syns inte i menyn — det valet gör du under varje del.
            </p>
          </Section>

          {Zone('Din sida', 'Uppifrån och ner, i samma ordning som på sidan')}

          {/* Every part of the page in the customer's order — the panel
              mirrors the page, and the arrows move both at once. Only the
              footer (Kontakt & öppettider) stays put. */}
          {sectionOrder.map((sectionId, si) => {
            /* The full price list rides along in the Prislista panel, so its
               arrows need to know where it sits on the page. */
            const priceAt = sectionOrder.indexOf('pricelist')
            /* On desktop, moving lives on the page itself — hover a section
               and the tools appear. The panel arrows stay only on phones,
               where there is no hover to find them with. */
            const moveProps = narrow ? {
              onMoveUp:   si > 0                       ? () => moveSection(sectionId, -1) : undefined,
              onMoveDown: si < sectionOrder.length - 1 ? () => moveSection(sectionId, 1)  : undefined,
            } : {}
            if (sectionId === 'hero') return (
          <Section key="hero" id="hero" title="Stora rubriken" hint="Det första besökaren ser" open={open === 'hero'} onToggle={() => toggle('hero')} flash={flashed === 'hero'} {...moveProps}>
            <Field label="Liten text ovanför rubriken" value={content.kicker} onChange={v => patch('kicker', v)} field='kicker' marked={markedField === 'kicker'} max={40} />
            <Field label="Rubrik" value={content.heroHeading} onChange={v => patch('heroHeading', v)} field='heroHeading' marked={markedField === 'heroHeading'} max={60} />
            <Field label="Text under rubriken" value={content.heroBody} onChange={v => patch('heroBody', v)} field='heroBody' marked={markedField === 'heroBody'} multiline max={220} />
            <Field label="Knappens text" value={content.ctaText} onChange={v => patch('ctaText', v)} field='ctaText' marked={markedField === 'ctaText'} max={25} />
            {slots.includes('heroImage') && (
              <SlotImage
                label="Bild bredvid rubriken"
                hint="Ladda upp bilden som visas överst"
                value={content.heroImage ?? ''}
                onChange={v => patch('heroImage', v)}
              />
            )}
          </Section>
            )
            {/* One price list, one panel. It used to be two — the menu here
                and its placement in a second section — which meant a help text
                whose whole job was to say where the other panel was. */}
            if (sectionId === 'services') return (
          <Section
            key="pricelist" id="pricelist" title="Prislista"
            hint={promoOnly
              ? 'Fyra tjänster som lockar vidare till din bokningssida'
              : 'Dina tjänster och priser — stjärnmärk upp till 3 så lyfts de fram överst'}
            open={open === 'pricelist'} onToggle={() => toggle('pricelist')} flash={flashed === 'pricelist'} {...moveProps}
          >
            {/* One question, asked once. "Where do the prices live" and "does
                the price list get its own page" were two separate choices in
                two separate places that between them produced impossible
                combinations — an own price page for a salon whose prices sit
                on Bokadirekt. Three answers, and each one says what the
                visitor gets. */}
            <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Var ska besökarna se dina priser?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {choiceCard(!externalPricelist && !ownPricePage, 'Bara på startsidan',
                'Hela prislistan finns när besökaren skrollar. Inget mer.',
                () => { setContent(p => ({ ...p, pricelistMode: 'site' })); patchPage('pricelist', { enabled: false }) })}
              {choiceCard(!externalPricelist && ownPricePage, 'På startsidan och en egen prissida',
                'Dessutom en prissida med knapp i menyn — och en egen sida per tjänst, som är det som rankar på ”balayage Södermalm”.',
                () => { setContent(p => ({ ...p, pricelistMode: 'site' })); patchPage('pricelist', { enabled: true }) })}
              {choiceCard(externalPricelist, 'Hos min bokningssida',
                'Alla pris- och boka-knappar leder till din bokningslänk. Du väljer själv hur mycket av priserna som ändå syns här — några utvalda eller hela listan.',
                () => { setContent(p => ({ ...p, pricelistMode: 'booking' })); touch() })}
            </div>
            {content.pricelistMode === 'booking' && !content.bookingUrl.trim() && (
              <p style={{ fontSize: 11, color: '#eab308', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                Fyll i din bokningslänk under Bokning — tills dess visas prislistan här på hemsidan.
              </p>
            )}

            {/* The second question only a booking-page customer has: how much
                of the price list the start page keeps. Worth spelling out —
                the link sends the visitor onward, but a search engine cannot
                read what is behind it, so what stays here is what can rank. */}
            {externalPricelist && (
              <>
                <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: '4px 0 0' }}>Hur mycket visas här?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {choiceCard((content.pricelistPreview ?? 'promo') === 'promo', 'Fyra utvalda tjänster',
                    'En tjänst stort med tre under. Minst att hålla uppdaterat — du skriver bara in de fyra.',
                    () => { setContent(p => ({ ...p, pricelistPreview: 'promo' })); touch() })}
                  {choiceCard(content.pricelistPreview === 'full', 'Hela prislistan',
                    'Alla dina priser i text på startsidan. Mer att hålla uppdaterat på två ställen — men mer för Google att hitta.',
                    () => { setContent(p => ({ ...p, pricelistPreview: 'full' })); touch() })}
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
                  Bokningslänken skickar trafiken vidare, men Google kan inte läsa priserna som ligger bakom den —
                  bara det som står i text på din egen sida kan dyka upp när någon söker på ”{priceQueryExample}”.
                  Ju mer du visar här, desto fler sökningar kan sidan svara på.
                </p>
              </>
            )}
            <div style={{ height: 1, background: '#1e293b' }} />

            {/* Prices kept on the booking page: there is no list to maintain
                here, only the four services the start page shows off. Editing
                a full price list we never display would be busywork with a
                second copy of the truth as the prize. */}
            {promoOnly ? (
              <>
                <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
                  Skriv in de fyra tjänster startsidan ska visa. Alla leder till din bokningssida.
                </p>
                {[0, 1, 2, 3].map(i => {
                  const s = content.services?.[i] ?? { name: '', desc: '', price: '' }
                  return (
                    <div key={i} style={{ border: '1px solid #1e293b', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p style={{ fontSize: 10, color: i === 0 ? '#eab308' : '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>
                        {i === 0 ? 'Utvald — visas stort' : `Tjänst ${i + 1}`}
                      </p>
                      <Field label="Namn" value={s.name} onChange={v => patchPromo(i, 'name', v)} placeholder={i === 0 ? 'Den du helst vill bli bokad på' : 'Tjänstens namn'} max={40} />
                      {i === 0 && (
                        <Field label="Kort beskrivning" value={s.desc} onChange={v => patchPromo(i, 'desc', v)} placeholder="En mening om vad kunden får" multiline max={140} />
                      )}
                      <Field label="Pris" value={s.price} onChange={v => patchPromo(i, 'price', v)} placeholder="från 650 kr" max={20} />
                    </div>
                  )
                })}
              </>
            ) : (
              <MenuEditor
                compact
                featuredNames={content.services.map(s => s.name)}
                onToggleFeatured={toggleFeatured}
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
            {/* The layout's featured-service picture belongs to the strip that
                the booking-page window replaces — no slot, no field */}
            {!promoOnly && slots.includes('featureImage') && (
              <SlotImage
                label="Bild till den framlyfta tjänsten"
                hint="Ladda upp bilden som visas bredvid tjänsten på startsidan"
                value={content.featureImage ?? ''}
                onChange={v => patch('featureImage', v)}
              />
            )}

            {WGroup('Rubriker i den här delen', promoOnly
              ? [
                  LField('menuLabel', 'Rubrik över tjänsterna',       cfg.menuLabel),
                  LField('allLink',   'Länken till din bokningssida', cfg.allLink),
                ]
              : [
                  LField('svcKicker',     'Liten rubrik över tjänsterna', cfg.svcKicker),
                  LField('svcHeading',    'Rubrik över tjänsterna',       cfg.svcHeading),
                  LField('allLink',       'Länken till prislistan',       cfg.allLink),
                  LField('menuLabel',     'Rubrik över hela prislistan',  cfg.menuLabel),
                  LField('priceLabel',    'Ordet för pris',               SITE_LABELS.priceLabel),
                  LField('durationLabel', 'Ordet för tidsåtgång',         SITE_LABELS.durationLabel),
                ])}

            {/* The full list is its own block on the page, so it keeps its own
                on/off and its own place — but it lives here, next to the
                content it shows. */}
            <div style={{ height: 1, background: '#1e293b' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F }}>
                  {promoOnly ? 'Utvalda tjänster på startsidan' : 'Hela prislistan på startsidan'}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: F, marginTop: 2 }}>
                  {siteFeatures.pricelist
                    ? promoOnly
                      ? 'En tjänst lyfts fram stort med tre under — alla leder till din bokningssida'
                      : externalPricelist
                        ? 'Alla kategorier och priser visas, och varje rad leder till din bokningssida'
                        : 'Alla kategorier och priser visas — priserna är det besökarna söker'
                    : promoOnly
                      ? 'Inga tjänster visas på startsidan alls'
                      : 'Bara de stjärnmärkta tjänsterna visas på startsidan'}
                </span>
              </span>
              {narrow && (
                <>
                  <button onClick={() => moveSection('pricelist', -1)} disabled={priceAt <= 0} title="Flytta upp på sidan"
                    style={{ background: 'none', border: 'none', padding: '0 2px', fontSize: 13, color: priceAt <= 0 ? '#1e293b' : '#64748b', cursor: priceAt <= 0 ? 'default' : 'pointer' }}>↑</button>
                  <button onClick={() => moveSection('pricelist', 1)} disabled={priceAt >= sectionOrder.length - 1} title="Flytta ner på sidan"
                    style={{ background: 'none', border: 'none', padding: '0 2px', fontSize: 13, color: priceAt >= sectionOrder.length - 1 ? '#1e293b' : '#64748b', cursor: priceAt >= sectionOrder.length - 1 ? 'default' : 'pointer' }}>↓</button>
                </>
              )}
              {miniSwitch(
                siteFeatures.pricelist,
                () => { setSiteFeatures(p => ({ ...p, pricelist: !p.pricelist })); touch() },
                ['Visas på startsidan — klicka för att dölja', 'Dold — klicka för att visa'],
              )}
            </div>
            {/* The own page is answered by the three cards at the top, so the
                only thing left is what to put on it */}
            {!externalPricelist && pageEditor('pricelist')}
          </Section>
            )
            if (sectionId === 'pricelist') return null
            if (sectionId === 'gallery') return (
          <Section
            key="gallery"
            id="gallery" title="Bildgalleri" hint="Foton från salongen och ditt arbete"
            open={open === 'gallery'} onToggle={() => toggle('gallery')} flash={flashed === 'gallery'}
            enabled={siteFeatures.gallery}
            onEnabledChange={v => { setSiteFeatures(p => ({ ...p, gallery: v })); touch() }}
            {...moveProps}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {images.slice(0, content.galleryCount ?? 6).map((img, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={async () => {
                      const url = await pickImage()
                      if (url) { setImages(prev => prev.map((x, j) => j === i ? url : x)); touch() }
                    }}
                    style={{ display: 'block', cursor: 'pointer', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', border: img ? 'none' : '2px dashed #334155', background: '#0b1220', position: 'relative', padding: 0, width: '100%' }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 12, fontFamily: F }}>Välj bild</span>
                    )}
                  </button>
                  {img && (
                    <div>
                      <input
                        value={alts[i] ?? ''}
                        onChange={e => { const v = e.target.value; setAlts(prev => prev.map((x, j) => j === i ? v : x)); touch() }}
                        placeholder="Beskriv bilden (för Google)"
                        maxLength={100}
                        style={{ width: '100%', padding: '6px 8px', fontSize: 11, fontFamily: F, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                        <button
                          onClick={() => swapGallery(i, i - 1)} disabled={i === 0} title="Flytta bakåt"
                          style={{ background: 'none', border: 'none', padding: '0 4px 0 0', fontSize: 12, cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#1e293b' : '#64748b' }}
                        >◀</button>
                        <button
                          onClick={() => swapGallery(i, i + 1)} disabled={i === (content.galleryCount ?? 6) - 1} title="Flytta framåt"
                          style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, cursor: i === (content.galleryCount ?? 6) - 1 ? 'default' : 'pointer', color: i === (content.galleryCount ?? 6) - 1 ? '#1e293b' : '#64748b' }}
                        >▶</button>
                        <span style={{ flex: 1, textAlign: 'right', fontSize: 10, fontFamily: F, color: (alts[i]?.length ?? 0) >= 100 ? '#f87171' : '#64748b' }}>
                          {alts[i]?.length ?? 0}/100
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {WGroup('Rubriker i den här delen', [
              LField('galleryKicker', 'Liten rubrik', SITE_LABELS.galleryKicker),
              LField('galleryTitle',  'Rubrik',       SITE_LABELS.galleryTitle),
            ])}
          </Section>
            )
            if (sectionId === 'blog') return (
          <Section
            key="articles"
            id="articles" title="Artiklar" hint="Egna sidor om sådant kunder söker på — starkast för Google över tid"
            open={open === 'articles'} onToggle={() => toggle('articles')} flash={flashed === 'articles'}
            enabled={siteFeatures.blog}
            onEnabledChange={v => { setSiteFeatures(p => ({ ...p, blog: v })); touch() }}
            {...moveProps}
          >
            <ArticleList articles={articles} onEdit={setEditingId} onAdd={addArticle} />
            {/* A blog with one post reads as abandoned. Six gives the section
                somewhere to breathe — and each one is a page Google can rank. */}
            {articles.length < 4 && (
              <button
                onClick={() => {
                  const have = new Set(articles.map(a => a.slug))
                  setArticles(prev => [...prev, ...exampleArticles(industry).filter(a => !have.has(a.slug))])
                  touch()
                }}
                style={{
                  alignSelf: 'flex-start', background: 'none', border: '1px dashed #334155', borderRadius: 8,
                  padding: '9px 14px', fontSize: 12, color: '#eab308', cursor: 'pointer', fontFamily: F,
                }}
              >
                + Fyll på med exempelartiklar
              </button>
            )}
            {/* Ours are neutral placeholders, not photographs of a salon —
                say so plainly rather than letting them pass as the real thing */}
            {articles.some(a => isExampleImage(a.cover)) && (
              <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                Bilderna i exempelartiklarna är platshållare. Byt dem mot egna foton — det är dina bilder som får någon att boka.
              </p>
            )}
            {WGroup('Rubriker i den här delen', [
              LField('articlesKicker',    'Liten rubrik på startsidan',   SITE_LABELS.articlesKicker),
              LField('articlesTitle',     'Rubrik på startsidan',         SITE_LABELS.articlesTitle),
              LField('articlesAll',       'Länken till alla artiklar',    SITE_LABELS.articlesAll),
              LField('articlesBack',      'Länken tillbaka i en artikel', SITE_LABELS.articlesBack),
              LField('articlesMore',      'Rubrik: fler artiklar',        SITE_LABELS.articlesMore),
              LField('noArticles',        'Text när inget är publicerat', SITE_LABELS.noArticles),
            ])}
            {pageEditor('blog')}
          </Section>
            )
            if (sectionId === 'reviews') return (
          <Section
            key="reviews"
            id="reviews" title="Recensioner" hint="Välj vilka omdömen som visas på sidan"
            open={open === 'reviews'} onToggle={() => toggle('reviews')} flash={flashed === 'reviews'}
            enabled={siteFeatures.reviews}
            onEnabledChange={v => { setSiteFeatures(p => ({ ...p, reviews: v })); touch() }}
            {...moveProps}
          >
            {featuredReviews.some(r => r.source === 'example') && (
              <div style={{ background: '#1e293b', borderLeft: '3px solid #eab308', borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: '#e2e8f0', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                  Omdömena här är exempel som visar hur delen ser ut ifylld. <strong>De följer inte med när sidan publiceras.</strong>{' '}
                  Koppla din Google-profil så hämtas dina riktiga omdömen hit, eller skriv in ett eget nedan.
                </p>
              </div>
            )}
            <TestimonialEditor compact testimonials={featuredReviews} onAdd={addTestimonial} onRemove={removeTestimonial} />
            <ReviewPicker compact reviews={pickerReviews} selected={featuredReviews.filter(r => r.source !== 'manual') as MockReview[]} toggle={toggleFeaturedReview} loading={reviewsLoading} />
            {WGroup('Rubriker i den här delen', [
              LField('reviewsKicker', 'Liten rubrik', SITE_LABELS.reviewsKicker),
              LField('reviewsTitle',  'Rubrik',       SITE_LABELS.reviewsTitle),
            ])}
          </Section>
            )
            return (
          <Section
            key="about"
            id="about" title="Om oss & teamet" hint="Er historia och personerna bakom"
            open={open === 'about'} onToggle={() => toggle('about')} flash={flashed === 'about'}
            enabled={siteFeatures.about}
            onEnabledChange={v => { setSiteFeatures(p => ({ ...p, about: v })); touch() }}
            {...moveProps}
          >
            <Field label="Rubrik" value={content.aboutTitle} onChange={v => patch('aboutTitle', v)} field='aboutTitle' marked={markedField === 'aboutTitle'} max={60} />
            <Field label="Text" value={content.aboutBody} onChange={v => patch('aboutBody', v)} field='aboutBody' marked={markedField === 'aboutBody'} multiline max={600} />
            {slots.includes('aboutImage') && (
              <SlotImage
                label="Bild till Om oss"
                hint="Ladda upp bilden som visas i Om oss-delen"
                value={content.aboutImage ?? ''}
                onChange={v => patch('aboutImage', v)}
              />
            )}
            {/* Numbers a business is proud of belong with the story about it,
                not filed under opening hours */}
            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Siffror om er</p>
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-8px 0 0' }}>
              Visas som en rad högst upp på sidan. Fyll bara i det som stämmer — tomma rader visas inte.
            </p>
            {[0, 1, 2, 3].map(i => {
              const s = content.stats?.[i] ?? { num: '', label: '' }
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                  <Field label={i === 0 ? 'Siffra' : ''} value={s.num} onChange={v => patchStat(i, 'num', v)} placeholder="10+" max={8} />
                  <Field label={i === 0 ? 'Vad den betyder' : ''} value={s.label} onChange={v => patchStat(i, 'label', v)} placeholder="År i branschen" max={30} />
                </div>
              )
            })}

            {/* The team is edited where it is seen — on the Om oss page's own
                workspace, which renders it. Nine member cards in a 400px
                column, next to a preview that no longer shows them, was the
                heaviest thing left in the panel. */}
            {pageEditor('about')}
          </Section>
            )
          })}

          <Section id="contact" title="Kontakt & öppettider" hint="Visas längst ner på varje sida" open={open === 'contact'} onToggle={() => toggle('contact')} flash={flashed === 'contact'}>
            <Field label="Telefon" value={content.phone} onChange={v => patch('phone', v)} field='phone' marked={markedField === 'phone'} max={20} />
            <Field label="Adress / område" value={content.address} onChange={v => patch('address', v)} field='address' marked={markedField === 'address'} max={60} />
            <Field label="Öppettider" value={content.hours} onChange={v => patch('hours', v)} field='hours' marked={markedField === 'hours'} max={80} />
            {content.address?.trim() && (
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-6px 0 0' }}>
                En &quot;Hitta hit&quot;-länk till kartan läggs till automatiskt.
              </p>
            )}

            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Sociala medier</p>
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-8px 0 0' }}>
              Instagram är ofta salongens starkaste skyltfönster — länka dit så syns arbetet utan att du behöver ladda upp det två gånger.
            </p>
            <Field label="Instagram" value={content.social?.instagram ?? ''} onChange={v => patchSocial('instagram', v)} placeholder="https://instagram.com/…" />
            <Field label="Facebook"  value={content.social?.facebook ?? ''}  onChange={v => patchSocial('facebook', v)}  placeholder="https://facebook.com/…" />
            <Field label="TikTok"    value={content.social?.tiktok ?? ''}    onChange={v => patchSocial('tiktok', v)}    placeholder="https://tiktok.com/@…" />

            {WGroup('Rubriker i den här delen', [
              LField('hoursTitle',  'Rubrik: Öppettider', SITE_LABELS.hoursTitle),
              LField('followTitle', 'Rubrik: Följ oss',   SITE_LABELS.followTitle),
              LField('directions',  'Länken till kartan', SITE_LABELS.directions),
            ])}
          </Section>


          {Zone('Inställningar', 'Ställs in en gång')}

          <Section id="google" title="Så syns du på Google" hint="Din annonsyta i sökresultatet" open={open === 'google'} onToggle={() => toggle('google')} flash={flashed === 'google'}>
            {/* The address is part of how the site indexes — the customer
                names it; every old address keeps redirecting to the new one */}
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Sidans adress</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{
                fontSize: 13, color: '#64748b', fontFamily: F, background: '#0f172a',
                border: '1px solid #334155', borderRight: 'none', borderRadius: '8px 0 0 8px',
                padding: '9px 8px 9px 12px', whiteSpace: 'nowrap',
              }}>
                kiterank.se/s/
              </span>
              <input
                value={slugValue}
                onChange={e => {
                  const v = e.target.value.toLowerCase()
                    .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
                    .replace(/[^a-z0-9-]+/g, '-')
                  setSlugValue(v); setSlugError('')
                  if (v !== currentSlug) touch()
                }}
                style={{ ...inputStyle, borderRadius: '0 8px 8px 0', flex: 1, minWidth: 0 }}
                placeholder="din-salong"
              />
            </div>
            {slugError
              ? <p style={{ fontSize: 11, color: '#f87171', fontFamily: F, margin: '-8px 0 0' }}>{slugError}</p>
              : <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-8px 0 0' }}>
                  Byter du adress skickas besökare och Google automatiskt vidare från den gamla adressen till den nya.
                </p>}
            <div style={{ height: 1, background: '#1e293b' }} />
            <GoogleSerpEditor
              content={content}
              siteSlug={currentSlug || 'din-salong'}
              industry={industry}
              onChange={seo => { setContent(p => ({ ...p, seo })); touch() }}
            />
          </Section>

          {/* Last, not first: the design is chosen once and revisited rarely,
              while the sections above are the ones a customer works in weekly */}
          {templates && templates.length > 1 && (
            <Section id="design" title="Utseende" hint={`Nuvarande: ${design.name}`} open={open === 'design'} onToggle={() => toggle('design')} flash={flashed === 'design'}>
              <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Färger</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {([
                  ['Accentfärg', 'Knappar, länkar och detaljer', content.colorOverrides?.a ?? design.colors.a, setAccent],
                  ['Bakgrund', content.textColorPicked ? 'Din valda textfärg behålls' : 'Textfärgen anpassas tills du valt en egen', content.colorOverrides?.bg ?? design.colors.bg, setBackground],
                  ['Textfärg', 'Rubriker — brödtexten följer med, mjukare', content.colorOverrides?.h ?? design.colors.h, setTextColor],
                ] as const).map(([label, hint, value, onPick]) => (
                  <div key={label}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 5px' }}>{label}</p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: '1px solid #334155', borderRadius: 8, padding: '7px 10px', background: '#1e293b' }}>
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
                        onChange={e => onPick(e.target.value)}
                        style={{ width: 26, height: 26, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 12, color: '#f1f5f9', fontFamily: F }}>{value}</span>
                    </label>
                    <p style={{ fontSize: 10, color: '#64748b', fontFamily: F, margin: '4px 0 0', lineHeight: 1.4 }}>{hint}</p>
                  </div>
                ))}
              </div>
              {/* One-click looks — the retired color-twin templates live on
                  here, where they always belonged */}
              {getPalettesForIndustry(industry).length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 6px' }}>Färdiga paletter</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {getPalettesForIndustry(industry).map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => { setContent(p => ({ ...p, colorOverrides: { ...preset.colors }, textColorPicked: false })); touch() }}
                        title={`Använd paletten ${preset.name}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', background: '#1e293b', border: '1px solid #334155' }}
                      >
                        <span style={{ display: 'flex', gap: 3 }}>
                          {[preset.colors.bg, preset.colors.a, preset.colors.b].map((col, i) => (
                            <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: col, border: '1px solid rgba(255,255,255,0.15)' }} />
                          ))}
                        </span>
                        <span style={{ fontSize: 12, color: '#f1f5f9', fontFamily: F }}>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* A pale accent on a pale page means pale buttons — say it here,
                  while both pickers are in view, instead of changing their
                  brand color behind their back */}
              {contrastRatio(
                content.colorOverrides?.a ?? design.colors.a,
                content.colorOverrides?.bg ?? design.colors.bg
              ) < 2.5 && (
                <p style={{ fontSize: 11, color: '#eab308', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                  Accentfärgen syns dåligt mot bakgrunden — knappar och länkar blir otydliga. Välj en {hexIsDark(content.colorOverrides?.bg ?? design.colors.bg) ? 'ljusare' : 'mörkare'} accentfärg.
                </p>
              )}
              {/* A kept text choice can collide with a new background — the
                  customer decides, but never without being told */}
              {contrastRatio(
                content.colorOverrides?.h ?? design.colors.h,
                content.colorOverrides?.bg ?? design.colors.bg
              ) < 2.5 && (
                <p style={{ fontSize: 11, color: '#eab308', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                  Textfärgen syns dåligt mot bakgrunden — rubrikerna blir svårlästa. Välj en {hexIsDark(content.colorOverrides?.bg ?? design.colors.bg) ? 'ljusare' : 'mörkare'} textfärg.
                </p>
              )}
              {content.colorOverrides && Object.keys(content.colorOverrides).length > 0 && (
                <button onClick={resetColors} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: F, padding: 0 }}>
                  Återställ mallens färger
                </button>
              )}

              <div style={{ height: 1, background: '#1e293b' }} />
              <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Typsnitt</p>
              {!content.customFont?.url && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['', 'Geist', 'Mallens standard', undefined] as const,
                    ...Object.entries(SITE_FONTS).map(([id, f]) => [id, f.name, f.hint, f.family] as const)
                  ].map(([id, name, hint, family]) => {
                    const active = (content.fontPreset ?? '') === id
                    return (
                      <button
                        key={id || 'default'}
                        onClick={() => { patch('fontPreset', id); }}
                        style={{
                          textAlign: 'left', padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                          background: active ? 'rgba(234,179,8,0.08)' : '#1e293b',
                          border: `1px solid ${active ? '#eab308' : '#334155'}`,
                        }}
                      >
                        {/* The name set in its own face — the picker is the preview */}
                        <span style={{ display: 'block', fontSize: 14, color: '#f1f5f9', fontFamily: family ?? F }}>{name}</span>
                        <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', fontFamily: F, marginTop: 2 }}>{hint}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                Har salongen ett eget typsnitt? Ladda upp filen så används det i stället. Kontrollera att licensen tillåter användning på webben.
              </p>
              {content.customFont?.url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13, color: '#f1f5f9', fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {content.customFont.name}
                  </span>
                  <button
                    onClick={() => { setContent(p => ({ ...p, customFont: undefined })); touch() }}
                    style={{ fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}
                  >
                    Ta bort — använd mallens
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', textAlign: 'center', border: '1px dashed #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: fontBusy ? '#64748b' : '#eab308', cursor: 'pointer', fontFamily: F }}>
                  {fontBusy ? 'Laddar upp…' : '+ Ladda upp typsnitt (WOFF2, TTF eller OTF)'}
                  <input type="file" accept=".woff2,.woff,.ttf,.otf" style={{ display: 'none' }} onChange={async e => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    setFontError(''); setFontBusy(true)
                    try {
                      const url = await uploadFont(file)
                      setContent(p => ({ ...p, customFont: { url, name: file.name } })); touch()
                    } catch (err) {
                      setFontError(err instanceof Error ? err.message : 'Uppladdningen misslyckades')
                    } finally {
                      setFontBusy(false)
                    }
                  }} />
                </label>
              )}
              {fontError && <p style={{ fontSize: 11, color: '#f87171', fontFamily: F, margin: 0 }}>{fontError}</p>}

              <div style={{ height: 1, background: '#1e293b' }} />
              <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Tema</p>
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-8px 0 0' }}>
                Hela sidans layout och stil. All text, prislistan, bildgalleriet, dina artiklar och ditt typsnitt följer med.
                Färgerna och bakgrundsbilden börjar om från den nya designen, så du ser den som den är tänkt —
                dina egna bilder finns kvar under Dina bilder. Ångrar du dig, tryck Ångra innan du sparar.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {templates.map(t => {
                  const active = t.id === design.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => { switchDesign(t) }}
                      style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        background: active ? 'rgba(234,179,8,0.08)' : '#1e293b',
                        border: `1px solid ${active ? '#eab308' : '#334155'}`,
                      }}
                    >
                      <span style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                        {[t.colors.bg, t.colors.a, t.colors.b].map((col, i) => (
                          <span key={i} style={{ width: 14, height: 14, borderRadius: 3, background: col, border: '1px solid rgba(255,255,255,0.12)' }} />
                        ))}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#f1f5f9', fontFamily: F }}>{t.name}</span>
                      <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', fontFamily: F, marginTop: 2 }}>{t.tagline}</span>
                    </button>
                  )
                })}
              </div>
            </Section>
          )}
        </div>

        {/* ── The page itself — rendered by the published site's renderer ── */}
        <div
          ref={paneRef}
          className="kr-editable"
          /* The page is the table of contents. Clicking a part of it opens the
             part of the panel that changes it — recognition instead of
             hunting down a name in a list of thirteen. Capture phase and a
             blanket preventDefault: this is an editor, so no click inside it
             should ever navigate away from the work. */
          onClickCapture={e => {
            e.preventDefault()
            const el = e.target as HTMLElement
            // The floating tools and the bubble own their clicks
            if (el.closest?.('[data-kr-tools]')) return
            const hit = el.closest?.('[data-edit]')
            const id  = hit?.getAttribute('data-edit')
            if (!id) return
            // A picture: open the library and replace exactly this one
            if (el.tagName === 'IMG') { void swapPageImage((el as HTMLImageElement).src); return }
            // A known text: edit it right where it stands
            const field = fieldUnderCursor(el)
            if (field && FIELD_META[field]) {
              const r = el.getBoundingClientRect()
              setBubble({ field, x: Math.max(8, Math.min(r.left, window.innerWidth - 380)), y: Math.min(r.bottom + 8, window.innerHeight - 240) })
              setHoverChip(null)
              return
            }
            goTo(id, true)
          }}
          onMouseMoveCapture={e => {
            const el = e.target as HTMLElement
            if (el.closest?.('[data-kr-tools]')) return   // keep the tools while on them
            const edit = el.closest?.('[data-edit]') as HTMLElement | null
            if (!edit) { setHoverChip(null); setHoverSec(null); return }
            // The label that says what a click here does
            const label = el.tagName === 'IMG' ? 'Byt bild'
              : fieldUnderCursor(el) ? 'Redigera texten'
              : EDIT_LABEL[edit.getAttribute('data-edit') ?? ''] ?? 'Redigera'
            setHoverChip({ x: e.clientX + 14, y: e.clientY + 16, label })
            // The move/hide tools, pinned to the hovered section's top edge
            const secEl = el.closest?.('[data-sec]') as HTMLElement | null
            const secId = secEl?.getAttribute('data-sec')
            if (secId) {
              const box = (el.closest('section, footer, nav') as HTMLElement | null) ?? el
              const r = box.getBoundingClientRect()
              setHoverSec({ id: secId, x: Math.min(r.right - 10, window.innerWidth - 10), y: Math.max(r.top + 10, 108) })
            } else setHoverSec(null)
          }}
          onMouseLeave={() => { setHoverChip(null); setHoverSec(null) }}
          style={{ flex: 1, overflow: 'auto', background: '#0b1220', padding: 16, display: showPreview ? 'block' : 'none' }}
        >
          <style>{`
            .kr-editable [data-edit]:hover > * { outline: 2px solid #eab308; outline-offset: -2px; cursor: pointer; }
            .kr-editable a, .kr-editable button { cursor: pointer; }
          `}</style>

          {/* The cursor's label — says what a click does before it is made */}
          {hoverChip && !bubble && (
            <span style={{
              position: 'fixed', left: hoverChip.x, top: hoverChip.y, zIndex: 55, pointerEvents: 'none',
              background: '#eab308', color: '#0f172a', fontSize: 11, fontWeight: 700, fontFamily: F,
              padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}>
              {hoverChip.label}
            </span>
          )}

          {/* Move/hide, on the section itself — order and visibility become
              something done where the effect is seen, not remembered from a
              list of arrows in the panel */}
          {hoverSec && !bubble && (() => {
            const idx = sectionOrder.indexOf(hoverSec.id)
            const featureKey = SECTION_FEATURE[hoverSec.id]
            const on = featureKey ? (siteFeatures[featureKey] ?? true) : true
            const btn = (txt: string, tip: string, disabled: boolean, fn: () => void) => (
              <button
                key={tip}
                disabled={disabled}
                title={tip}
                onClick={e => { e.stopPropagation(); fn() }}
                style={{ background: 'none', border: 'none', padding: '2px 5px', fontSize: 13, fontFamily: F, color: disabled ? '#334155' : '#e2e8f0', cursor: disabled ? 'default' : 'pointer' }}
              >
                {txt}
              </button>
            )
            return (
              <div data-kr-tools style={{
                position: 'fixed', left: hoverSec.x, top: hoverSec.y, transform: 'translateX(-100%)', zIndex: 56,
                display: 'flex', alignItems: 'center', gap: 2, background: '#0f172a', border: '1px solid #334155',
                borderRadius: 8, padding: '3px 7px', boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: F, marginRight: 4 }}>
                  {SECTION_NAME[hoverSec.id] ?? hoverSec.id}
                </span>
                {btn('↑', 'Flytta upp på sidan', idx <= 0, () => moveSection(hoverSec.id, -1))}
                {btn('↓', 'Flytta ner på sidan', idx < 0 || idx >= sectionOrder.length - 1, () => moveSection(hoverSec.id, 1))}
                {featureKey && btn(on ? 'Dölj' : 'Visa', on ? 'Dölj delen från sidan' : 'Visa delen på sidan', false,
                  () => { setSiteFeatures(p => ({ ...p, [featureKey]: !on })); touch() })}
              </div>
            )
          })()}

          {/* The bubble: the clicked text, editable right where it stands.
              The page underneath updates with every keystroke. */}
          {bubble && (() => {
            const meta  = FIELD_META[bubble.field]
            const value = (content[bubble.field as keyof SiteContent] as string | undefined) ?? ''
            const close = () => setBubble(null)
            return (
              <div data-kr-tools>
                <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 70 }} />
                <div style={{
                  position: 'fixed', left: bubble.x, top: bubble.y, zIndex: 71, width: 360,
                  background: '#0f172a', border: '1px solid #eab308', borderRadius: 12, padding: 14,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <label style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F }}>{meta.label}</label>
                    <span style={{ fontSize: 11, fontFamily: F, color: value.length >= meta.max ? '#f87171' : '#64748b' }}>{value.length}/{meta.max}</span>
                  </div>
                  {meta.multiline ? (
                    <textarea
                      autoFocus value={value} rows={5} maxLength={meta.max}
                      onChange={e => patch(bubble.field as keyof SiteContent, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') close() }}
                      style={inputStyle}
                    />
                  ) : (
                    <input
                      autoFocus value={value} maxLength={meta.max}
                      onChange={e => patch(bubble.field as keyof SiteContent, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') close() }}
                      style={inputStyle}
                    />
                  )}
                  <button onClick={close} style={{ alignSelf: 'flex-end', background: '#eab308', color: '#0f172a', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                    Klar
                  </button>
                </div>
              </div>
            )
          })()}
          {/* Every page the site has, one tab each — the whole site is
              previewable and clickable, not just the front of it */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '0 0 8px', flexWrap: 'wrap' }}>
            {([['start', 'Startsida'] as const,
               ...(!externalPricelist && ownPricePage ? [['pricelist', 'Prissidan'] as const] : []),
               ...(sectionPageEnabled(contentForPages, 'about') ? [['about', 'Om oss'] as const] : []),
               ...(sectionPageEnabled(contentForPages, 'blog') ? [['blog', 'Artiklarna'] as const] : []),
            ]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setPreviewPage(id)}
                style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, fontFamily: F, borderRadius: 999, cursor: 'pointer',
                  background: previewPage === id ? '#eab308' : 'transparent',
                  color: previewPage === id ? '#0f172a' : '#94a3b8',
                  border: `1px solid ${previewPage === id ? '#eab308' : '#334155'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* The one instruction that unlocks the whole editor — in the
              accent colour so it is read, not skimmed past */}
          <p style={{ fontSize: 12, fontWeight: 600, color: '#eab308', fontFamily: F, textAlign: 'center', margin: '0 0 10px' }}>
            Klicka på en del av sidan för att redigera den
          </p>
          <div style={{ width: pageW * scale, margin: '0 auto' }}>
            <div style={{ width: pageW, transform: `scale(${scale})`, transformOrigin: 'top left', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
              {previewPage === 'start' ? (
                <PreviewSite template={design} industry={industry} contentOverride={previewContent} tjansterBase={currentSlug ? `/s/${currentSlug}` : undefined} />
              ) : (
                <SubpagePreview
                  page={previewPage}
                  template={{ ...design, colors: { ...design.colors, ...(content.colorOverrides ?? {}) } }}
                  content={previewContent}
                  industry={industry}
                  siteRoot={currentSlug ? `/s/${currentSlug}` : undefined}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
    </MediaProvider>
  )
}
