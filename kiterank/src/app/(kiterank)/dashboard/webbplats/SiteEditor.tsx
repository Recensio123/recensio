'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import type { TemplateColors } from '@/lib/templates'
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
  /* Vad de tre bilderna föreställer. Egna fält eftersom de tidigare lånade
     företagsnamnet respektive Om oss-rubriken — vilket beskriver sidan och
     inte bilden. */
  heroImageAlt?:    string
  featureImageAlt?: string
  aboutImageAlt?:   string
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


const F = 'var(--font-brand-sans), system-ui, -apple-system, sans-serif'

/* ── E: inline-editable text element ──────────────────────────────── */


/* ── Gallery editor ────────────────────────────────────────────────── */


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

/* ── Logo / business-name switcher ─────────────────────────────────── */


/* ── Editable nav ──────────────────────────────────────────────────── */


/* ── Editable service cards ────────────────────────────────────────── */


/* ── Editable footer ───────────────────────────────────────────────── */

/* ── Shared: Google reviews section ────────────────────────────────── */




/* ── Image placeholder (non-editable decorative) ───────────────────── */


/* ── Layout: Centered ──────────────────────────────────────────────── */


/* ── Layout: Split ─────────────────────────────────────────────────── */


/* ── Layout: Editorial ─────────────────────────────────────────────── */


/* ── Layout: Heritage ──────────────────────────────────────────────── */


/* ── Layout: Luxury ────────────────────────────────────────────────── */


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
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8 }}>&ldquo;{t.text}&rdquo;</p>
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


/* ── Team section ──────────────────────────────────────────────────── */

/* ── Template-aware nav (used by inner pages to match the home page nav) */


/* ── Om oss page ───────────────────────────────────────────────────── */


/* ── Team members section ───────────────────────────────────────────── */


/* ── Pricelist section ─────────────────────────────────────────────── */


/* ── Movable section blocks ────────────────────────────────────────── */



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


