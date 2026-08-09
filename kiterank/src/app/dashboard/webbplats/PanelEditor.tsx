'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PALETTE_PRESETS, type Template } from '@/app/onboarding/templates'
import { PreviewSite, templateImageSlots, getIndConfig, orderedIds, PAGE_SECTIONS, type SiteContent as PublicContent } from '@/app/preview/[templateId]/PreviewSite'
import { SITE_LABELS } from '@/lib/siteLabels'
import { SITE_FONTS } from '@/lib/siteFonts'
import { uploadImage, uploadFont } from '@/lib/uploadImage'
import type { ServiceEntry } from '@/app/preview/[templateId]/tjanster/services-data'
import { ExternalLink } from '@/components/ExternalLink'
import { emptyArticle, type Article } from '@/lib/articles'
import { Field, F, useNarrow } from './fields'
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
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 5px' }}>{label}</p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ width: 84, height: 60, objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <span style={{ width: 84, height: 60, borderRadius: 8, border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>+</span>
        )}
        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.5 }}>
          {busy ? 'Laddar upp…' : value ? 'Byt bild' : hint}
        </span>
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setError(''); setBusy(true)
          try { onChange(await uploadImage(file)) }
          catch (err) { setError(err instanceof Error ? err.message : 'Uppladdningen misslyckades') }
          finally { setBusy(false) }
        }} />
      </label>
      {error && <p style={{ fontSize: 11, color: '#f87171', fontFamily: F, margin: '6px 0 0' }}>{error}</p>}
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
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ width: 56, height: 56, borderRadius: round ? '50%' : 8, objectFit: 'cover' }} />
        ) : (
          <span style={{ width: 56, height: 56, borderRadius: round ? '50%' : 8, border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>+</span>
        )}
        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: F }}>{busy ? 'Laddar upp…' : label}</span>
        <input
          type="file" accept="image/*" style={{ display: 'none' }}
          onChange={async e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setError(''); setBusy(true)
            try { onChange(await uploadImage(file)) }
            catch (err) { setError(err instanceof Error ? err.message : 'Uppladdningen misslyckades') }
            finally { setBusy(false) }
          }}
        />
      </label>
      {error && <p style={{ fontSize: 11, color: '#f87171', fontFamily: F, margin: '6px 0 0' }}>{error}</p>}
    </div>
  )
}

/* One collapsible part of the page. Open one at a time keeps the panel calm. */
function Section({ id, title, hint, open, onToggle, children, enabled, onEnabledChange, onMoveUp, onMoveDown }: {
  id: string; title: string; hint?: string
  open: boolean; onToggle: () => void
  children: React.ReactNode
  enabled?: boolean; onEnabledChange?: (v: boolean) => void
  /** Movable sections: up/down here moves the section on the page itself. */
  onMoveUp?: () => void; onMoveDown?: () => void
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
    <div style={{ border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden', background: '#0f172a', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', cursor: 'pointer' }} onClick={onToggle}>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: F }}>{title}</span>
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
      {open && <div style={{ padding: '4px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }} data-section={id}>{children}</div>}
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
  const [content, setContent] = useState<SiteContent>({ ...defaults, ...initialContent } as SiteContent)
  const [images,  setImages]  = useState<string[]>((initialContent as SiteContent).gallery_images ?? Array(6).fill(''))
  const [alts,    setAlts]    = useState<string[]>((initialContent as SiteContent).gallery_alts ?? Array(6).fill(''))
  const [logo,    setLogo]    = useState<string>((initialContent as SiteContent).logo ?? '')
  const [featuredReviews, setFeaturedReviews] = useState<Testimonial[]>(
    ((initialContent as SiteContent).featured_reviews ?? []) as Testimonial[]
  )
  const [siteFeatures, setSiteFeatures] = useState<Record<string, boolean>>({
    booking: true, pricelist: true, gallery: true, contact: true, blog: false, reviews: true,
    ...((initialContent as SiteContent).siteFeatures ?? {}),
  })
  /* The whole page's order — every section except the footer. Older saves
   * that only ordered three sections merge in without moving anything else. */
  const [sectionOrder, setSectionOrder] = useState<string[]>(() =>
    orderedIds(PAGE_SECTIONS, (initialContent as SiteContent).sectionOrder)
  )
  const [articles,  setArticles]  = useState<Article[]>((initialContent as SiteContent).articles ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [design,    setDesign]    = useState<Template>(template)
  const [fontBusy,  setFontBusy]  = useState(false)
  const [fontError, setFontError] = useState('')

  const [open,      setOpen]      = useState<string>('hero')
  const [dirty,     setDirty]     = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState(false)
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
  function patchNav(i: number, v: string) {
    setContent(p => ({ ...p, navLinks: p.navLinks.map((l, j) => j === i ? v : l) })); touch()
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

  /* A failed save must never look like a successful one — a customer who
   * closes the tab on a false "Sparat ✓" loses their work believing it safe. */
  async function save(): Promise<boolean> {
    setSaving(true); setSaveError(false)
    try {
      const res = await fetch('/api/webbplats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: design.id,
          content: { ...content, gallery_images: images, gallery_alts: alts, logo, featured_reviews: featuredReviews, siteFeatures, sectionOrder, articles },
        }),
      })
      if (!res.ok) throw new Error(`save failed: ${res.status}`)
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

  const toggle  = (id: string) => setOpen(o => o === id ? '' : id)
  const editing = articles.find(a => a.id === editingId) ?? null
  const slots   = templateImageSlots(design.layout)
  const cfg     = getIndConfig(industry)

  /* A heading field: empty shows the default as placeholder — overwrite it to
   * rename the section, in any language. */
  const LField = (key: string, label: string, placeholder: string) => (
    <Field label={label} value={content.labels?.[key] ?? ''} onChange={v => patchLabel(key, v)} placeholder={placeholder} max={60} />
  )

  /* On a phone the panel and the page take turns instead of sharing the row */
  const narrow = useNarrow()
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit')
  const showPanel   = !narrow || mobilePane === 'edit'
  const showPreview = !narrow || mobilePane === 'preview'

  return (
    // The dashboard's mobile top bar is 3.5rem (pt-14); on lg the sidebar sits
    // beside us instead, so the editor gets the full viewport height there.
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
          {siteSlug && (dirty
            ? <span style={{ fontSize: 12, color: '#64748b', fontFamily: F }}>Spara för att se ändringarna live</span>
            : <ExternalLink href={`/s/${siteSlug}`} className="panel-live-link">
                <span style={{ fontSize: 13, color: '#eab308', fontFamily: F }}>Se min sida live →</span>
              </ExternalLink>
          )}
          {saveError && <span style={{ fontSize: 13, color: '#f87171', fontFamily: F }}>Kunde inte spara — försök igen</span>}
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
      {siteSlug && !editing && (
        <div style={{ padding: '6px 16px', borderBottom: '1px solid #1e293b', fontSize: 12, color: '#64748b', fontFamily: F }}>
          Din sida ligger på{' '}
          <ExternalLink href={`/s/${siteSlug}`}>
            <span style={{ color: '#94a3b8', textDecoration: 'underline' }}>kiterank.se/s/{siteSlug}</span>
          </ExternalLink>
          {' '}— Google hittar den automatiskt.
        </div>
      )}

      {/* Phone: one pane at a time */}
      {narrow && !editing && (
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
          Spara is in the same place it always is. */}
      {editing ? (
        <ArticleWorkspace
          article={editing}
          template={{ ...design, colors: { ...design.colors, ...(content.colorOverrides ?? {}) } }}
          onChange={next => changeArticles(articles.map(a => a.id === next.id ? next : a))}
          onClose={() => setEditingId(null)}
          onDelete={() => { changeArticles(articles.filter(a => a.id !== editing.id)); setEditingId(null) }}
        />
      ) : (
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Panel — the page's parts, in page order ── */}
        <div style={{
          width: narrow ? '100%' : 400, minWidth: 320, overflowY: 'auto', padding: 14,
          display: showPanel ? 'flex' : 'none', flexDirection: 'column', gap: 10,
          borderRight: narrow ? 'none' : '1px solid #1e293b',
        }}>

          {/* First thing in the panel: without this link, no button on the
              site can take a booking — everything else is decoration. */}
          <Section id="booking" title="Bokning & prislista" hint="Vart boka-knapparna och prislistan leder" open={open === 'booking'} onToggle={() => toggle('booking')}>

            {/* Part 1 — the booking link and exactly what it controls */}
            <div>
              <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: '0 0 4px' }}>Boka-knapparna</p>
              <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.5, margin: '0 0 8px' }}>
                Alla boka-knappar på sidan leder till den här länken:
              </p>
              <Field label="Din bokningslänk" value={content.bookingUrl} onChange={v => patch('bookingUrl', v)} placeholder="https://…" />
              {!content.bookingUrl.trim() && (
                <p style={{ fontSize: 11, color: '#eab308', fontFamily: F, lineHeight: 1.5, margin: '6px 0 0' }}>
                  Utan länk gör boka-knapparna ingenting — klistra in adressen till din bokningssida, t.ex. från Bokadirekt.
                </p>
              )}
            </div>

            <div style={{ height: 1, background: '#1e293b' }} />

            {/* Part 2 — where visitors see the prices */}
            <div>
              <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: '0 0 4px' }}>Prislistan</p>
              <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.5, margin: '0 0 8px' }}>
                Var ska besökarna se dina priser?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  ['site',    'Här på hemsidan',      'Egen prissida som du sköter under Tjänster & priser. Varje tjänst får dessutom en egen sida som syns på Google.'],
                  ['booking', 'Hos min bokningssida', 'Knappen "Se prislista" leder till bokningslänken ovan. Bra när priserna redan finns där — då slipper du hålla dem uppdaterade på två ställen.'],
                ] as const).map(([mode, title, desc]) => {
                  const active = (content.pricelistMode ?? 'site') === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => { setContent(p => ({ ...p, pricelistMode: mode })); touch() }}
                      style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        background: active ? 'rgba(234,179,8,0.08)' : '#1e293b',
                        border: `1px solid ${active ? '#eab308' : '#334155'}`,
                      }}
                    >
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#f1f5f9', fontFamily: F }}>
                        {active ? '● ' : '○ '}{title}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', fontFamily: F, marginTop: 3, lineHeight: 1.5 }}>{desc}</span>
                    </button>
                  )
                })}
              </div>
              {content.pricelistMode === 'booking' && !content.bookingUrl.trim() && (
                <p style={{ fontSize: 11, color: '#eab308', fontFamily: F, lineHeight: 1.5, margin: '8px 0 0' }}>
                  Fyll i bokningslänken ovan — tills dess visas prislistan på hemsidan.
                </p>
              )}
            </div>
          </Section>

          <Section id="brand" title="Logga & namn" hint="Det som syns överst på sidan" open={open === 'brand'} onToggle={() => toggle('brand')}>
            <ImageUpload value={logo} onChange={url => { setLogo(url); touch() }} label={logo ? 'Byt logga (visas i stället för namnet)' : 'Ladda upp logga (annars visas namnet)'} />
            {logo && <button onClick={() => { setLogo(''); touch() }} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: F }}>Ta bort loggan</button>}
            <Field label="Företagsnamn" value={content.businessName} onChange={v => patch('businessName', v)} max={40} />
            <Field label="Kort slogan" value={content.tagline} onChange={v => patch('tagline', v)} max={60} />

            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Menyn högst upp</p>
            {content.navLinks.map((l, i) => (
              <Field key={i} label={`Menyval ${i + 1}`} value={l} onChange={v => patchNav(i, v)} max={20} />
            ))}

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

          {/* Every part of the page in the customer's order — the panel
              mirrors the page, and the arrows move both at once. Only the
              footer (Kontakt & öppettider) stays put. */}
          {sectionOrder.map((sectionId, si) => {
            const moveProps = {
              onMoveUp:   si > 0                       ? () => moveSection(sectionId, -1) : undefined,
              onMoveDown: si < sectionOrder.length - 1 ? () => moveSection(sectionId, 1)  : undefined,
            }
            if (sectionId === 'hero') return (
          <Section key="hero" id="hero" title="Stora rubriken" hint="Det första besökaren ser" open={open === 'hero'} onToggle={() => toggle('hero')} {...moveProps}>
            <Field label="Liten text ovanför rubriken" value={content.kicker} onChange={v => patch('kicker', v)} max={40} />
            <Field label="Rubrik" value={content.heroHeading} onChange={v => patch('heroHeading', v)} max={60} />
            <Field label="Text under rubriken" value={content.heroBody} onChange={v => patch('heroBody', v)} multiline max={220} />
            <Field label="Knappens text" value={content.ctaText} onChange={v => patch('ctaText', v)} max={25} />
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
            if (sectionId === 'services') return (
          <Section key="pricelist" id="pricelist" title="Tjänster & priser" hint="Stjärnmärk upp till 3 tjänster så lyfts de fram på startsidan" open={open === 'pricelist'} onToggle={() => toggle('pricelist')} {...moveProps}>
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
            {slots.includes('featureImage') && (
              <SlotImage
                label="Bild till den framlyfta tjänsten"
                hint="Ladda upp bilden som visas bredvid tjänsten på startsidan"
                value={content.featureImage ?? ''}
                onChange={v => patch('featureImage', v)}
              />
            )}
            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Rubriker på sidan</p>
            {LField('svcKicker',  'Liten rubrik över tjänsterna', cfg.svcKicker)}
            {LField('svcHeading', 'Rubrik över tjänsterna',       cfg.svcHeading)}
            {LField('allLink',    'Länken till prislistan',       cfg.allLink)}
          </Section>
            )
            if (sectionId === 'gallery') return (
          <Section
            key="gallery"
            id="gallery" title="Bildgalleri" hint="Foton från salongen och ditt arbete"
            open={open === 'gallery'} onToggle={() => toggle('gallery')}
            enabled={siteFeatures.gallery}
            onEnabledChange={v => { setSiteFeatures(p => ({ ...p, gallery: v })); touch() }}
            {...moveProps}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {images.slice(0, content.galleryCount ?? 6).map((img, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ display: 'block', cursor: 'pointer', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', border: img ? 'none' : '2px dashed #334155', background: '#0b1220', position: 'relative' }}>
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 12, fontFamily: F }}>Ladda upp</span>
                    )}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      try {
                        const url = await uploadImage(file)
                        setImages(prev => prev.map((x, j) => j === i ? url : x))
                        touch()
                      } catch { /* the panel shows nothing changed — retry works */ }
                    }} />
                  </label>
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
            <div style={{ height: 1, background: '#1e293b' }} />
            {LField('galleryKicker', 'Liten rubrik', SITE_LABELS.galleryKicker)}
            {LField('galleryTitle',  'Rubrik',       SITE_LABELS.galleryTitle)}
          </Section>
            )
            if (sectionId === 'blog') return (
          <Section
            key="articles"
            id="articles" title="Artiklar" hint="Egna sidor om sådant kunder söker på — starkast för Google över tid"
            open={open === 'articles'} onToggle={() => toggle('articles')}
            enabled={siteFeatures.blog}
            onEnabledChange={v => { setSiteFeatures(p => ({ ...p, blog: v })); touch() }}
            {...moveProps}
          >
            <ArticleList articles={articles} onEdit={setEditingId} onAdd={addArticle} />
            <div style={{ height: 1, background: '#1e293b' }} />
            {LField('articlesKicker', 'Liten rubrik på startsidan', SITE_LABELS.articlesKicker)}
            {LField('articlesTitle',  'Rubrik på startsidan',       SITE_LABELS.articlesTitle)}
            {LField('articlesAll',    'Länken till alla artiklar',  SITE_LABELS.articlesAll)}
          </Section>
            )
            if (sectionId === 'reviews') return (
          <Section
            key="reviews"
            id="reviews" title="Recensioner" hint="Välj vilka omdömen som visas på sidan"
            open={open === 'reviews'} onToggle={() => toggle('reviews')}
            enabled={siteFeatures.reviews}
            onEnabledChange={v => { setSiteFeatures(p => ({ ...p, reviews: v })); touch() }}
            {...moveProps}
          >
            <TestimonialEditor compact testimonials={featuredReviews} onAdd={addTestimonial} onRemove={removeTestimonial} />
            <ReviewPicker compact reviews={pickerReviews} selected={featuredReviews.filter(r => r.source !== 'manual') as MockReview[]} toggle={toggleFeaturedReview} loading={reviewsLoading} />
            <div style={{ height: 1, background: '#1e293b' }} />
            {LField('reviewsKicker', 'Liten rubrik', SITE_LABELS.reviewsKicker)}
            {LField('reviewsTitle',  'Rubrik',       SITE_LABELS.reviewsTitle)}
          </Section>
            )
            return (
          <Section key="about" id="about" title="Om oss & teamet" hint="Er historia och personerna bakom" open={open === 'about'} onToggle={() => toggle('about')} {...moveProps}>
            <Field label="Rubrik" value={content.aboutTitle} onChange={v => patch('aboutTitle', v)} max={60} />
            <Field label="Text" value={content.aboutBody} onChange={v => patch('aboutBody', v)} multiline max={600} />
            {slots.includes('aboutImage') && (
              <SlotImage
                label="Bild till Om oss"
                hint="Ladda upp bilden som visas i Om oss-delen"
                value={content.aboutImage ?? ''}
                onChange={v => patch('aboutImage', v)}
              />
            )}
            {LField('teamTitle', 'Rubrik över teamet', SITE_LABELS.teamTitle)}
            <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '4px 0 0' }}>Teamet</p>
            {(content.team ?? []).map((m, i) => (
              <div key={i} style={{ border: '1px solid #1e293b', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ImageUpload round value={m.image} onChange={url => patchTeam(i, 'image', url)} label={m.image ? 'Byt foto' : 'Ladda upp foto'} />
                <Field label="Namn" value={m.name} onChange={v => patchTeam(i, 'name', v)} max={40} />
                <Field label="Titel" value={m.title} onChange={v => patchTeam(i, 'title', v)} max={40} />
                <button onClick={() => removeTeamMember(i)} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Ta bort</button>
              </div>
            ))}
            {(content.team?.length ?? 0) < 8 && (
              <button onClick={addTeamMember} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#eab308', background: 'none', border: '1px dashed #334155', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: F }}>
                + Lägg till person
              </button>
            )}
          </Section>
            )
          })}

          <Section id="contact" title="Kontakt & öppettider" hint="Visas längst ner på varje sida" open={open === 'contact'} onToggle={() => toggle('contact')}>
            <Field label="Telefon" value={content.phone} onChange={v => patch('phone', v)} max={20} />
            <Field label="Adress / område" value={content.address} onChange={v => patch('address', v)} max={60} />
            <Field label="Öppettider" value={content.hours} onChange={v => patch('hours', v)} max={80} />
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

            <div style={{ height: 1, background: '#1e293b' }} />
            {LField('contactTitle', 'Rubrik: Kontakt',    SITE_LABELS.contactTitle)}
            {LField('hoursTitle',   'Rubrik: Öppettider', SITE_LABELS.hoursTitle)}
            {LField('followTitle',  'Rubrik: Följ oss',   SITE_LABELS.followTitle)}
            {LField('directions',   'Länken till kartan', SITE_LABELS.directions)}
          </Section>

          <Section id="google" title="Google" hint="Hur du ser ut i sökresultatet" open={open === 'google'} onToggle={() => toggle('google')}>
            <GoogleSerpEditor
              content={content}
              siteSlug={siteSlug ?? 'din-salong'}
              onChange={seo => { setContent(p => ({ ...p, seo })); touch() }}
            />
          </Section>

          {/* Last, not first: the design is chosen once and revisited rarely,
              while the sections above are the ones a customer works in weekly */}
          {templates && templates.length > 1 && (
            <Section id="design" title="Utseende" hint={`Nuvarande: ${design.name}`} open={open === 'design'} onToggle={() => toggle('design')}>
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
              {(PALETTE_PRESETS[industry] ?? PALETTE_PRESETS.other ?? []).length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 6px' }}>Färdiga paletter</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(PALETTE_PRESETS[industry] ?? PALETTE_PRESETS.other ?? []).map(preset => (
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
                Hela sidans layout och stil. Byt när du vill — allt innehåll, dina färger och ditt typsnitt följer med.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {templates.map(t => {
                  const active = t.id === design.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setDesign(t); touch() }}
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
        <div ref={paneRef} style={{ flex: 1, overflow: 'auto', background: '#0b1220', padding: 16, display: showPreview ? 'block' : 'none' }}>
          <div style={{ width: pageW * scale, margin: '0 auto' }}>
            <div style={{ width: pageW, transform: `scale(${scale})`, transformOrigin: 'top left', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
              <PreviewSite template={design} industry={industry} contentOverride={previewContent} tjansterBase={siteSlug ? `/s/${siteSlug}` : undefined} />
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
