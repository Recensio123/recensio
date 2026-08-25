'use client'
import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { orderedIds, PAGE_SECTIONS, promoSlots, promoServices, type SiteContent, type SiteContent as PublicContent } from '@/components/site/PreviewSite'
import type { TemplateColors } from '@/lib/templates'
import { paletteFromBg, mix } from './farger'
import { withExamples, exampleArticles } from '@/lib/exampleContent'
import { CONTENT as SITE_DEFAULTS } from '@/lib/siteExampleContent'
import { emptyArticle, type Article } from '@/lib/articles'
import type { ServiceEntry } from '@/lib/services-data'
import type { SocialKey } from '@/lib/siteSocial'
import type { SectionPageId, SectionPage as SectionPageConfig } from '@/lib/sectionPages'
import type { Testimonial, MockReview, ServiceItem, TeamMember } from './SiteEditor'

/*
 * Sidans innehåll, och allt som ändrar det.
 *
 * Låg tidigare mitt i redigeraren, blandat med vilken sektion som är öppen
 * och var muspekaren är. Två sorters tillstånd i samma hög: det ena är vad
 * kunden bygger och sparar, det andra är hur panelen ser ut just nu.
 *
 * Uppdelningen är inte städning. Den är det som gör att en sektion kan flytta
 * till en egen fil: sektionerna behöver innehållet och inget av panelens
 * gränssnitt, och genom kontexten når de det som en sak i stället för som
 * tjugo props.
 */

/** `design` är mallens färger och layout. Hooken äger innehållet, inte
 *  designen — men flera ändringar behöver veta vilken botten och vilken
 *  layout de landar i. */
export function useSajtInnehall(
  initialContent: Partial<SiteContent>,
  industry: string,
  design: { layout: string; colors: TemplateColors },
) {

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
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  function touch() { setDirty(true); setSaved(false) }
  function patch(k: keyof SiteContent, v: string) { setContent(p => ({ ...p, [k]: v })); touch() }
  /* The site's own headings. Empty = the default (shown as placeholder), so a
   * customer writing in French just types over every heading they see. */
  function patchLabel(key: string, v: string) {
    setContent(p => ({ ...p, labels: { ...(p.labels ?? {}), [key]: v } })); touch()
  }
  function patchSocial(key: SocialKey, v: string) {
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

  /*
   * Hur många tjänster startsidan har plats för — mallens svar, inte panelens.
   *
   * Talet stod tidigare som en fyra här och en fyra i renderaren. En mall som
   * visar sex hade då fått sex på sidan och fyra stjärnor i panelen. Nu frågar
   * båda samma funktion, och den frågar mallen kunden valt.
   */
  const PROMO_MAX = promoSlots(design.layout)
  /** Samma tal i löpande text, så panelen inte säger "4 platser". */
  const PLATSORD = ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio'][PROMO_MAX] ?? String(PROMO_MAX)

  /*
   * De fyra som faktiskt står på startsidan, som en lista att ändra i.
   *
   * Stjärnorna räckte inte alltid till fyra, och då fylldes platserna på ur
   * prislistan när sidan renderades. Panelen visade stjärnorna, sidan visade
   * påfyllningen, och de gick isär: fyra tjänster på sidan, en stjärna i
   * listan. Samma funktion som sidan renderar ur svarar nu åt båda, och varje
   * ändring utgår från det svaret — så det som är stjärnmärkt är det som syns.
   */
  function visadeTjanster(c: SiteContent): ServiceItem[] {
    return promoServices(c as unknown as PublicContent, industry, PROMO_MAX) as ServiceItem[]
  }

  /** Alla fyra platser tagna och kunden försökte lägga till en till. */
  const [urvalFullt, setUrvalFullt] = useState(false)
  /** Rutan med de fyra, dit spärren skickar dem. */
  const urvalRef = useRef<HTMLDivElement | null>(null)

  function taBortUtvald(namn: string) {
    setContent(p => ({ ...p, services: visadeTjanster(p).filter(s => s.name !== namn) }))
    setUrvalFullt(false); touch()
  }

  function toggleFeatured(item: ServiceEntry) {
    const nu = visadeTjanster(content)
    if (nu.some(s => s.name === item.name)) { taBortUtvald(item.name); return }

    /*
     * Fullt. Tidigare knuffades den äldsta tyst ut för att ge plats — kunden
     * bad om en tjänst till och fick en borttagen på köpet, utan att se
     * vilken. Nu står valet still och panelen visar var man tar bort.
     */
    if (nu.length >= PROMO_MAX) {
      setUrvalFullt(true)
      urvalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const next: ServiceItem = { name: item.name, desc: item.desc, price: item.hidePrice ? '' : item.price }
    setContent(p => ({ ...p, services: [...visadeTjanster(p), next] }))
    setUrvalFullt(false); touch()
  }

  /* Ordningen på startsidan. Den första visas stor med tre under, så vilken
     som står först är ett verkligt val och inte en detalj. */
  function moveFeatured(i: number, dir: -1 | 1) {
    setContent(p => {
      /* Pilarna står vid den upplösta listan, så platsnumren gäller den —
         inte den sparade, som kan vara kortare. */
      const next = visadeTjanster(p)
      const j = i + dir
      if (j < 0 || j >= next.length) return p
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...p, services: next }
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
  /** Skapar artikeln och lämnar tillbaka dess id. Att öppna den är panelens
   *  sak — hooken vet ingenting om vilken vy som står framme. */
  function addArticle(): string {
    const id = `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`
    changeArticles([emptyArticle(id, new Date().toISOString().slice(0, 10)), ...articles])
    return id
  }

  function addTeamMember()      { setContent(p => ({ ...p, team: [...(p.team ?? []), { name: '', title: '', image: '' }] })); touch() }
  function removeTeamMember(i: number) { setContent(p => ({ ...p, team: (p.team ?? []).filter((_, j) => j !== i) })); touch() }

  /* Own pages: the section stays on the start page, or gets a page of its
   * own — a menu button, its own name, and room for more content. */
  function patchPage(id: SectionPageId, part: Partial<SectionPageConfig>) {
    setContent(p => ({ ...p, sectionPages: { ...(p.sectionPages ?? {}), [id]: { ...(p.sectionPages?.[id] ?? {}), ...part } } }))
    touch()
  }
  return {
    content,
    setContent,
    images,
    setImages,
    alts,
    setAlts,
    logo,
    setLogo,
    featuredReviews,
    setFeaturedReviews,
    siteFeatures,
    setSiteFeatures,
    sectionOrder,
    setSectionOrder,
    articles,
    setArticles,
    dirty,
    setDirty,
    saved,
    setSaved,
    touch,
    patch,
    patchLabel,
    patchSocial,
    setAccent,
    setBackground,
    setTextColor,
    resetColors,
    patchStat,
    visadeTjanster,
    taBortUtvald,
    toggleFeatured,
    moveFeatured,
    patchPromo,
    patchCatName,
    patchItemField,
    toggleItemBool,
    toggleAllBool,
    addCategory,
    removeCategory,
    addItem,
    removeItem,
    toggleFeaturedReview,
    addTestimonial,
    removeTestimonial,
    patchTeam,
    moveSection,
    swapGallery,
    changeArticles,
    addArticle,
    addTeamMember,
    removeTeamMember,
    patchPage,
    PROMO_MAX, PLATSORD, urvalFullt, setUrvalFullt, urvalRef,
  }
}

export type SajtInnehall = ReturnType<typeof useSajtInnehall>

/*
 * Kontexten sektionerna läser ur.
 *
 * En sektion anropar useSajt() och tar det den behöver. Alternativet — props
 * hela vägen ned — hade betytt att varje ny sektion lägger till ett dussin
 * rader i den fil vi just delade upp.
 */
const SajtContext = createContext<SajtInnehall | null>(null)

export function SajtProvider({ värde, children }: { värde: SajtInnehall; children: ReactNode }) {
  return <SajtContext.Provider value={värde}>{children}</SajtContext.Provider>
}

/** Kastar utanför panelen. Ett tyst null hade blivit ett fel långt senare, i
 *  en sektion som undrar varför innehållet är tomt. */
export function useSajt(): SajtInnehall {
  const v = useContext(SajtContext)
  if (!v) throw new Error("useSajt användes utanför SajtProvider")
  return v
}
