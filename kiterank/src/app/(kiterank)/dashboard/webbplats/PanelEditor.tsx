'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SITE_LANGUAGES } from '@/lib/siteLanguages'
import { type Template } from '@/lib/templates'
import { PreviewSite, getIndConfig, cfgLabel, CFG_LABEL_NAMES, type CfgLabelKey, type SiteContent as PublicContent } from '@/components/site/PreviewSite'
import { SITE_LABELS, LABEL_NAMES, siteLabel, type LabelKey } from '@/lib/siteLabels'
import { pageIntro } from '@/components/site/ServicePage'
import { usePlan, hasBooking } from '@/components/PlanProvider'
import {
  SECTION_PAGES, SECTION_PAGE_IDS, sectionHasMaterial, sectionPageEnabled, sectionPageSuggestion,
  sectionPageTitle, sectionPageBlocks,
  type SectionPageId,
} from '@/lib/sectionPages'
import { PageWorkspace } from './PageWorkspace'
import { ÅngraPublicering } from './AngraPublicering'

/* What each section already puts at the top of its own page — said in the
 * customer's terms, so nobody wonders whether they have to add it by hand. */
/** Checklist row that opens the picture-swapping workspace, not a section. */
const SWAP_IMAGES = 'swap-images'

const PAGE_SUMMARY: Record<SectionPageId, string> = {
  pricelist: 'hela prislistan',
  about:     'er text om er och teamet',
  blog:      'alla dina publicerade artiklar',
  contact:   'kontaktuppgifter, karta och öppettider',
}
/* Marks a bubble target as one of the site's own headings rather than one of
   the customer's content fields. Both are text on the page and both are edited
   the same way; only where the value is stored differs. */
const LABEL_PREFIX = 'label:'
const isLabelField  = (f: string) => f.startsWith(LABEL_PREFIX)
const labelKeyOf    = (f: string) => f.slice(LABEL_PREFIX.length)
/** Headings whose default wording comes from the trade rather than siteLabels. */
const isCfgLabel = (k: string): k is CfgLabelKey => k in CFG_LABEL_NAMES

/* Sidnamnet, klickat på sidans egen rubrik. Det är samma namn som står på
   menyknappen — döper de om sidan här byter knappen namn med den, vilket är
   hela poängen: ett namn, inte två som kan säga olika saker. */
const PAGE_PREFIX = 'page:'
const isPageField = (f: string) => f.startsWith(PAGE_PREFIX)
const pageIdOf    = (f: string) => f.slice(PAGE_PREFIX.length) as SectionPageId

/* De flesta rubriker ryms på en rad. Dessa är meningar och behöver mer. */
const LABEL_FORM: Record<string, { max: number; multiline?: boolean }> = {
  pricePageIntro: { max: 180, multiline: true },
  ctaBandBody:    { max: 160, multiline: true },
  contactIntro:   { max: 220, multiline: true },
  contactDoBody:  { max: 260, multiline: true },
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
  design: 'Redigera logga & namn', hero: 'Redigera stora rubriken',
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
  contact:   'Kontaktsidan',
}
import { ExternalLink } from '@/components/ExternalLink'
import { exampleArticles, exampleTeam, isExampleImage } from '@/lib/exampleContent'
import { StartChecklist, type ChecklistItem } from './StartChecklist'
import { SwapImages, type Placeholder } from './SwapImages'
import { MediaProvider } from './MediaLibrary'
import { TeamPhoto, Kryss, Val, Section } from './panelDelar'
import { useSajtInnehall, SajtProvider } from './sajtInnehall'
import { KontaktSektion } from './KontaktSektion'
import { BrandingSektion } from './BrandingSektion'
import { TjanstEditor } from '@/components/tjanster/TjanstEditor'
import { BristBand } from './BristBand'
import { sidansBrister } from '@/lib/sidansBrister'
import { BilderSektion, type BildPlats } from './BilderSektion'
import { Textfyllare } from './Textfyllare'
import type { Förslag } from '@/lib/textfyllare'
import { SubpagePreview } from './SubpagePreview'
import { DomanFalt } from './DomanFalt'
import type { domänData } from '@/lib/domanData'
import { Field, F, inputStyle, useNarrow } from './fields'
import { ArticleList, ArticleWorkspace } from './ArticleEditor'
import { CONTENT as SITE_DEFAULTS } from '@/lib/siteExampleContent'
import {
  MOCK_REVIEWS,
  TestimonialEditor, ReviewPicker, GoogleSerpEditor,
  type SiteContent, type MockReview,
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



export function PanelEditor({ template, industry, initialContent, siteSlug, templates, domäner = null, googleKopplat = false }: {
  template:       Template
  industry:       string
  initialContent: Partial<SiteContent>
  siteSlug?:      string
  /** Every design available for this industry — the customer can change
   *  their mind after onboarding without starting over. */
  templates?:     Template[]
  /** Salongens domäner, lästa av sidan. Utan dem hämtar domänfältet själv. */
  domäner?:       Awaited<ReturnType<typeof domänData>> | null
  /** Är Google kopplat. Avgör en post i kom igång-listan. */
  googleKopplat?: boolean
}) {
  const { plan } = usePlan()
  const defaults = SITE_DEFAULTS[industry] ?? SITE_DEFAULTS.other
  /* Mallen står först: hooken nedanför behöver dess layout och färger.
     Vilken mall som är vald är panelens sak, innehållet är hookens. */
  const [design,    setDesign]    = useState<Template>(template)

  /* Innehållet och dess ändringar ligger i en egen hook — se sajtInnehall.
     Namnen packas upp här så att resten av filen är oförändrad, och samma
     objekt går vidare till sektionerna genom kontexten. */
  const sajt = useSajtInnehall(initialContent as Partial<SiteContent>, industry, design)
  const {
    content, setContent, images, setImages,
    alts, setAlts, logo, setLogo,
    featuredReviews, setFeaturedReviews, siteFeatures, setSiteFeatures,
    sectionOrder, setSectionOrder, articles, setArticles,
    dirty, setDirty, saved, setSaved,
    touch, patch, patchLabel,
    patchStat, visadeTjanster, taBortUtvald, toggleFeatured,
    moveFeatured, patchPromo, toggleFeaturedReview, addTestimonial,
    removeTestimonial, patchTeam, moveSection, swapGallery,
    changeArticles, addArticle, addTeamMember, removeTeamMember,
    patchPage,
    PROMO_MAX, PLATSORD, urvalFullt, urvalRef,
  } = sajt
  const [editingId, setEditingId] = useState<string | null>(null)
  /** Which section's own page is open in the big workspace, if any. */
  const [editingPage, setEditingPage] = useState<SectionPageId | null>(null)
  /** The picture-swapping workspace, opened from the kom igång list. */
  const [swapping, setSwapping] = useState(false)

  const [open,      setOpen]      = useState<string>('hero')
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(false)
  /* The site's address — editable, since the URL is part of how the customer
   * gets indexed. Old addresses keep redirecting after a change. */
  const [currentSlug, setCurrentSlug] = useState(siteSlug ?? '')

  /*
   * Salongens egen domän, när de kopplat en.
   *
   * Panelen pekade tidigare alltid på /s/<slug> — vår tillfälliga adress. Den
   * fungerar, men skickar bara vidare, så kunden klickade "se min sida" och
   * såg sin gamla adress blinka förbi. Har de en verifierad domän är det den
   * som är deras sajt, och det är den panelen ska visa.
   */
  const [egenDoman, setEgenDoman] = useState<string | null>(null)
  useEffect(() => {
    let levande = true
    fetch('/api/domains')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!levande) return
        const klara = (d?.domains ?? []).filter((r: { verified_at?: string | null }) => r.verified_at)
        const vald  = klara.find((r: { is_primary?: boolean }) => r.is_primary) ?? klara[0]
        setEgenDoman(vald?.domain ?? null)
      })
      .catch(() => { /* domänerna är inte livsviktiga här — /s/ duger så länge */ })
    return () => { levande = false }
  }, [])

  /** Adressen kunden ska skickas till när de vill se sin sida. */
  const liveUrl = egenDoman ? `https://${egenDoman}` : `/s/${currentSlug}`

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


  /* Every either/or in the panel wears the same clothes: two cards that say
   * plainly what the visitor gets. A customer who has never built a website
   * cannot be expected to work out what a bare switch does. */

  /*
   * Var syns den här delen? Ett block, hela svaret.
   *
   * Frågan besvarades tidigare på tre ställen med tre olika reglage: en toggle
   * i sektionens rubrik för startsidan, två kort inuti för egen sida, och ett
   * tredje reglage i Meny-sektionen som styrde samma sparade fält som korten.
   * Tömde man namnet i Meny slogs sidan av utan att korten visste om det.
   *
   * Nu står båda kryssen bredvid varandra, med namnet vid det kryss det hör
   * till. Fyra kombinationer, en fråga, ett ställe.
   */
  /* Kontaktuppgifterna står i sidfoten på varje sida och går inte att stänga
     av därifrån — för dem är enda frågan om de också ska få en egen sida. Ett
     kryss som inte gör något är värre än inget kryss. */
  const visasVar = (id: SectionPageId | 'gallery' | 'reviews', rubrik: string, utanStart = false) => {
    const påStart = siteFeatures[id] !== false
    const harSida = id in SECTION_PAGES
    const sidId   = id as SectionPageId
    const cfg     = harSida ? (content.sectionPages?.[sidId] ?? {}) : {}
    const sidaPå  = harSida ? (cfg.enabled ?? SECTION_PAGES[sidId].defaultEnabled) : false
    /* Delar vars sida skulle öppna tom väntar på sitt innehåll i stället. */
    const ready = !harSida || sectionHasMaterial(
      { ...content, gallery_images: images, featured_reviews: featuredReviews, articles },
      sidId,
    )
    const väntar: Partial<Record<SectionPageId, string>> = {
      blog: 'Publicera minst en artikel först, så går den att ge en egen sida.',
    }

    return (
      <>
        <div style={{ height: 1, background: '#1e293b' }} />
        <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>
          {rubrik}
        </p>
        {!utanStart && <Kryss
          on={påStart}
          onChange={v => { setSiteFeatures(p => ({ ...p, [id]: v })); touch() }}
          title="På startsidan"
          hint="Besökaren ser delen när de skrollar."
        />}
        {harSida && (
          <>
            <Kryss
              on={sidaPå && ready}
              disabled={!ready}
              onChange={v => patchPage(sidId, v
                ? { enabled: true, title: cfg.title || undefined }
                : { enabled: false })}
              title="Som en egen sida"
              hint={ready
                ? 'Delen får en sida för sig själv, en knapp i menyn och en Läs mer-länk på startsidan.'
                : väntar[sidId]}
            />
            {sidaPå && ready && (
              <span style={{ paddingLeft: 28 }}>
                {/* Namnet står vid krysset det hör till. Tömmer de det tas
                    sidan bort — och då ska krysset slockna framför dem, inte
                    upptäckas på den publicerade sidan. */}
                <Field
                  label="Knappens text i menyn"
                  value={cfg.title ?? ''}
                  onChange={v => patchPage(sidId, v.trim() ? { title: v } : { title: v, enabled: false })}
                  placeholder={siteLabel(content.labels, SECTION_PAGES[sidId].labelKey)}
                  max={30}
                />
              </span>
            )}
          </>
        )}
        {!utanStart && !påStart && !(harSida && sidaPå && ready) && (
          <p style={{ fontSize: 11, color: '#eab308', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
            Delen publiceras inte — den syns varken på startsidan eller som en egen sida.
          </p>
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

  /*
   * Galleriet på startsidan, och ingenting annat.
   *
   * Posten räknade tidigare varje exempelbild på hela sajten — artiklarnas
   * omslag, bilderna inne i texterna, allt — och landade på tjugotre. Ett tal
   * i den storleken läser som en anklagelse och inte som en uppgift, och det
   * mesta av det gällde sidor besökaren sällan når. Galleriet på startsidan är
   * det som faktiskt syns, och det är en kväll med telefonen att fixa.
   *
   * Ingen räknare kvar heller. Antalet ändrar bara känslan av hur långt det är
   * kvar, aldrig vad man ska göra.
   */
  const galleriBilder = images.slice(0, content.galleryCount ?? 6)
  const galleriKlart  = galleriBilder.length > 0
    && galleriBilder.every(u => !!u && !isExampleImage(u))

  /* Where the prices live, and whether the list has a page of its own — one
   * question with three answers, asked in the Prislista panel. */
  const externalPricelist = content.pricelistMode === 'booking' && !!content.bookingUrl?.trim()
  const ownPricePage = content.sectionPages?.pricelist?.enabled ?? SECTION_PAGES.pricelist.defaultEnabled
  /* En egen bokningslänk betyder att bokningen sker någon annanstans. Tom länk
     betyder Kiteranks eget bokningssystem — den publicerade sidan fyller i
     /book/<adress> när fältet står tomt, så tomt är inte "ingen bokning" utan
     "bokning här". */
  const ownBookingLink = !!content.bookingUrl?.trim()

  /*
   * Bokar besökaren här eller någon annanstans?
   *
   * En tom bokningslänk betyder "här", en ifylld betyder "där". Men mellan
   * klicket på "egen bokningslänk" och den inklistrade adressen finns ett
   * ögonblick där datan fortfarande säger "här" — och utan ett lokalt val
   * skulle valet studsa tillbaka framför dem. Därför får det gälla tills
   * länken finns. Det sparas inte: så fort fältet är ifyllt säger data och val
   * samma sak, och ingen inställning kan ligga och säga emot en annan.
   *
   * Utan bokningssystemet finns inget att välja mellan — då är det alltid
   * deras egen länk, och panelen visar fältet i stället för frågan.
   */
  const [bokningsVal, setBokningsVal] = useState<'system' | 'egen' | null>(null)
  const bokningsLäge = !hasBooking(plan)
    ? 'egen'
    : bokningsVal ?? (ownBookingLink ? 'egen' : 'system')

  /** Knappens egna ord, kortade — panelen namnger den som kunden känner den. */
  const knappText = (content.ctaText?.trim() || 'Boka din tid').slice(0, 20)
  /** Vad prissidan heter i menyn, för att kunna peka ut den vid namn. */
  const prisSidNamn = content.sectionPages?.pricelist?.title?.trim()
    || siteLabel(content.labels, SECTION_PAGES.pricelist.labelKey)
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
    /*
     * Texten först, för att den lär ut greppet.
     *
     * Resten av listan förutsätter att man vet att man redigerar genom att
     * klicka i förhandsvisningen. Den som inte gjort det letar efter ett
     * formulär som inte finns, och en sida står halvfärdig av ett skäl som
     * inte har med skrivandet att göra.
     *
     * Bocken sätts av samma två fält som posterna Namn och Om oss — de är de
     * enda på sidan som är skrivna och inte valda eller uppladdade.
     */
    { id: 'text', label: 'Fyll din hemsida med text',
      done: !!content.businessName.trim() && !!content.heroHeading.trim()
         && content.aboutBody.trim() !== (defaults.aboutBody ?? '').trim(),
      section: 'hero',
      hint: 'Klicka på det fält du vill redigera i förhandsvisningen, eller ta hjälp av vår AI-fyllare.',
      bredvid: { text: 'Öppna AI-fyllare', action: 'fyllare' } },
    /*
     * Kopplingen står tvåa för att den gör flera av posterna under sig
     * onödiga. Telefon, öppettider och adress skrivs in av sig själva när den
     * görs, och salongens egna foton och omdömen blir åtkomliga. Att lägga
     * den sist hade betytt att kunden först skrev in för hand det som sedan
     * kom gratis.
     */
    { id: 'google', label: 'Koppla din Google-profil',
      done: googleKopplat,
      section: 'hero',
      href: '/dashboard/connections',
      hint: 'Fyller i telefon, öppettider och adress åt dig, och gör dina foton och omdömen tillgängliga.' },
    /* Omdömena först av innehållet. Andras ord om salongen väger tyngre än
       salongens egna, och de är det enda på sidan som besökaren inte misstänker
       är skrivet för att sälja. Våra exempelomdömen bockar inte av posten — de
       publiceras aldrig, så en sajt som bara har dem har en tom sektion live. */
    { id: 'reviews', label: 'Välj omdömen som visas',
      done: featuredReviews.some(r => r.source !== 'example'),
      section: 'reviews',
      hint: 'Plocka de omdömen du vill lyfta fram. Har du kopplat Google finns dina riktiga att välja bland.' },
    { id: 'price',
      label: externalPricelist ? `${PLATSORD.charAt(0).toUpperCase()}${PLATSORD.slice(1)} tjänster att lyfta fram` : 'Prislista med dina priser',
      // With the prices on the booking page there is no list here to fill in;
      // what needs filling is the four services the start page shows off.
      done: promoOnly
        ? (content.services ?? []).filter(s => s.name?.trim()).length >= PROMO_MAX
        : (content.menuCategories?.length ?? 0) > 0,
      section: 'pricelist',
      hint: 'Det besökaren letar efter först, och det som avgör om de hör av sig eller lämnar sidan.' },
    /* Utan bokningsväg är sidan färdig men obrukbar: varje boka-knapp leder
       till en tom sida. Salonger med bokningssystemet här har alltid en väg, så
       för dem finns posten inte — den skulle vara en uppgift utan innehåll. */
    ...(hasBooking(plan) ? [] : [{
      id: 'booking' as const,
      label: 'Bokningslänk',
      done: ownBookingLink,
      section: 'pricelist' as const,
      hint: 'Utan den leder varje boka-knapp till en tom sida',
    }]),
    { id: 'photos',  label: 'Lägg egna bilder i galleriet',
      done: galleriKlart, section: 'gallery',
      hint: 'Dina egna rum och ditt eget arbete. Exempelbilderna är vackra men de är inte dina, och det märks.' },
    /* Artiklarna sist av innehållet, för att de är det enda som inte behövs för
       att sidan ska fungera. De sex vi genererat ligger publicerade från start
       så att bloggen inte gapar tom — men de är våra ord, och posten bockas
       därför av först när salongen lagt in en egen. Samma regel som omdömena. */
    /*
     * Branding sist, och som ett steg i stället för fyra.
     *
     * Loggan, namnet, Om oss-texten och artiklarna stod tidigare var för sig.
     * De tre första bockades dessutom av på samma fält som posten om text, så
     * tre rader svarade på samma fråga — och artiklarna är det enda på sajten
     * som inte behövs för att den ska fungera.
     *
     * Kvar är det som gör sidan till deras: loggan, färgerna, typsnittet. En
     * enda av dem räcker för att bocka av — posten ber dem titta på avsnittet,
     * inte att ändra allt i det.
     */
    { id: 'branding', label: 'Gå igenom branding',
      done: !!logo
         || Object.keys(content.colorOverrides ?? {}).length > 0
         || !!content.fontPreset
         || !!content.customFont?.url,
      section: 'design',
      hint: 'Logga, färger och typsnitt — det som gör att sidan ser ut som ditt företag och inte som mallen.' },
  ]

  /* Dina bilder: everything ever uploaded plus everything already in use on
   * the site — so the library is full the first time anyone opens it. */
  const bildPlatser = (() => {
    const karta = new Map<string, BildPlats[]>()
    const lägg = (url: string | undefined | null, plats: BildPlats) => {
      if (!url) return
      karta.set(url, [...(karta.get(url) ?? []), plats])
    }

    /*
     * Grupperingen följer sajtens sidor, och namnen kommer ur menyn.
     *
     * Filtret listade tidigare varje artikel för sig, med rubriken som namn.
     * Sex artiklar gav sex knappar med fyrtio tecken var, och ingen av dem
     * motsvarade något kunden kan klicka på ute på sajten. Nu är grupperna de
     * sidor som faktiskt finns — och de heter det menyn kallar dem, så att
     * "Tjänster" här är samma "Tjänster" som besökaren ser.
     *
     * Döper kunden om en sida följer filtret med. Det är hela poängen med att
     * läsa namnet i stället för att skriva ett eget.
     */
    const START = 'Startsidan'
    const sidnamn = (id: SectionPageId) => sectionPageTitle(content, id)

    /* Vägen till platsen som en beskrivning, inte som en funktion. Att bygga
       återanropen här hade betytt att de skapas om vid varje rendering, och
       att navigeringen står i den del av filen som räknar fram data i stället
       för i den som ritar. Sektionen får beskrivningen och panelen utför den. */
    const gå = (panel: string, sida: 'start' | SectionPageId = 'start') => ({ panel, sida })

    lägg(content.heroImage, {
      sida: START, namn: 'Toppbilden', till: gå('hero'),
      alt: content.heroImageAlt ?? '', sättAlt: v => patch('heroImageAlt', v),
    })
    lägg(content.featureImage, {
      sida: START, namn: 'Bilden i mittensektionen', till: gå('hero'),
      alt: content.featureImageAlt ?? '', sättAlt: v => patch('featureImageAlt', v),
    })
    /* Om oss-bilden och personalbilderna hör till Om oss-sektionen, inte till
       startsidan. Har sektionen en egen sida är det där besökaren möter dem,
       och då ska de stå under det namnet — annars låg sex bilder under
       "Startsidan" medan sidan de faktiskt syns på saknades i filtret. */
    const omOssSida = sectionPageEnabled(content, 'about') ? sidnamn('about') : START
    const omOssTill = sectionPageEnabled(content, 'about') ? gå('about', 'about') : gå('about')

    lägg(content.aboutImage, {
      sida: omOssSida, namn: 'Bilden vid Om oss', till: omOssTill,
      alt: content.aboutImageAlt ?? '', sättAlt: v => patch('aboutImageAlt', v),
    })

    /* Loggan och personalbilderna beskriver sig själva — företagsnamnet
       respektive personens namn — och ska inte ha ett fält som frestar någon
       att skriva något annat. */
    lägg(logo, { sida: START, namn: 'Loggan', alt: '', sättAlt: null, till: gå('design') })
    for (const [i, m] of (content.team ?? []).entries()) {
      lägg(m.image, {
        sida: omOssSida, namn: m.name?.trim() || `Medarbetare ${i + 1}`,
        alt: '', sättAlt: null, till: sectionPageEnabled(content, 'about') ? gå('team', 'about') : gå('team'),
      })
    }

    for (const [i, u] of images.entries()) {
      lägg(u, {
        sida: START, namn: `Galleriet, bild ${i + 1}`, till: gå('gallery'),
        alt: alts[i] ?? '',
        sättAlt: v => { setAlts(prev => { const n = [...prev]; n[i] = v; return n }); touch() },
      })
    }

    /* Alla artiklar hör till artikelsidan. Vilken artikel bilden sitter i står
       i `namn` — det är precisionen man vill ha när man öppnat rutan, inte den
       man vill filtrera på. */
    const artikelSida = sidnamn('blog')
    for (const [ai, a] of articles.entries()) {
      const rubrik = a.title?.trim() || 'Artikel utan namn'
      lägg(a.cover, {
        sida: artikelSida, namn: `${rubrik} — huvudbild`, till: gå('blog', 'blog'),
        alt: a.coverAlt ?? '',
        sättAlt: v => setArticles(prev => prev.map((x, j) => j === ai ? { ...x, coverAlt: v } : x)),
      })
      for (const [bi, b] of a.blocks.entries()) {
        if (b.type !== 'images') continue
        for (const [ii, im] of b.images.entries()) {
          lägg(im.src, {
            sida: artikelSida, namn: `${rubrik} — bild ${ii + 1}`, till: gå('blog', 'blog'),
            alt: im.alt ?? '',
            sättAlt: v => setArticles(prev => prev.map((x, j) => j !== ai ? x : {
              ...x,
              blocks: x.blocks.map((bb, k) => k !== bi || bb.type !== 'images' ? bb
                : { ...bb, images: bb.images.map((y, l) => l === ii ? { ...y, alt: v } : y) }),
            })),
          })
        }
      }
    }

    /* Undersidornas egna bilder. De lästes inte alls förut, så en bild som
       kunden lagt in på Tjänster eller Kontakt saknades i vyn — och räknades
       som oanvänd trots att den låg ute. */
    for (const id of SECTION_PAGE_IDS) {
      if (id === 'blog') continue
      const sida   = sidnamn(id)
      const blocks = sectionPageBlocks(content, id, industry)
      for (const [bi, b] of blocks.entries()) {
        if (b.type !== 'images') continue
        for (const [ii, im] of b.images.entries()) {
          lägg(im.src, {
            sida, namn: `Bild ${ii + 1} på sidan`, till: gå(id, id),
            alt: im.alt ?? '',
            sättAlt: v => { setContent(prev => {
              const sidor = { ...(prev.sectionPages ?? {}) }
              const bas   = sectionPageBlocks(prev, id, industry)
              sidor[id] = {
                ...(sidor[id] ?? {}),
                blocks: bas.map((bb, k) => k !== bi || bb.type !== 'images' ? bb
                  : { ...bb, images: bb.images.map((y, l) => l === ii ? { ...y, alt: v } : y) }),
              }
              return { ...prev, sectionPages: sidor }
            }); touch() },
          })
        }
      }
    }

    return karta
  })()

  const iBruk = new Set(bildPlatser.keys())

  /*
   * Två listor, med olika frågor att svara på.
   *
   * Väljaren erbjuder bilder att återanvända — där hör bara kundens egna hemma.
   * Att bläddra fram en av våra platshållare när man letar efter ett foto av
   * salongen är brus.
   *
   * Bildsektionen visar vad som ligger på sidan. Där måste exempelbilderna vara
   * med, annars påstår vyn att Om oss-bilden och artiklarnas omslag inte finns
   * — och siffran längst ned blir fel på samma sätt.
   */
  const mediaLibrary = [...new Set([...(content.mediaLibrary ?? []), ...iBruk])]
    .filter((u): u is string => !!u && !isExampleImage(u))

  const allaBilder = [...new Set([...mediaLibrary, ...iBruk])]
  /* Bara ur listan. Filen ligger kvar i lagringen — en bild som råkat tas bort
     ska inte vara borta för gott, och en radering härifrån hade också kunnat
     släcka en bild på en sida som ingen tittar på just nu. */
  function removeFromLibrary(url: string) {
    setContent(p => ({ ...p, mediaLibrary: (p.mediaLibrary ?? []).filter(u => u !== url) }))
    touch()
  }

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
    /* The design belongs in here too. It is the largest change a customer can
       make in one click, and leaving it out meant Ångra said everything was
       back while the page still wore the design they were trying out. */
    return { design, content, images, alts, logo, featuredReviews, siteFeatures, sectionOrder, articles }
  }
  const [savedState, setSavedState] = useState(takeSnapshot)
  const [confirmUndo, setConfirmUndo] = useState(false)

  function restoreSaved() {
    setDesign(savedState.design)
    setContent(savedState.content)
    setImages(savedState.images); setAlts(savedState.alts); setLogo(savedState.logo)
    setFeaturedReviews(savedState.featuredReviews); setSiteFeatures(savedState.siteFeatures)
    setSectionOrder(savedState.sectionOrder); setArticles(savedState.articles)
    setDirty(false); setConfirmUndo(false)
  }

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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(`save failed: ${res.status}`)
      if (data.slug) setCurrentSlug(data.slug)
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

  /* The preview IS the published renderer — same component, same content.
   *
   * With one difference, and only inside the editor: a text the customer has
   * cleared is shown as the name of the field instead of as nothing. Every
   * text on the site is edited by clicking it where it stands, and a heading
   * that renders as empty leaves nothing to click — the field would be gone
   * for good. The stand-in gives it back a surface.
   *
   * It never reaches a visitor. The published site renders from the database
   * through the same component but never passes this way, and the bubble
   * still holds the real value, so a stand-in cannot be saved by accident. */
  /* The trade's own wording, needed here as well: the preview has to know
     which headings the customer has cleared before it can stand in for them. */
  const cfg = getIndConfig(industry)

  const previewContent: PublicContent = {
    ...(content as unknown as PublicContent),
    ...Object.fromEntries(
      Object.entries(FIELD_META)
        .filter(([k]) => !(content[k as keyof SiteContent] as string | undefined)?.trim())
        .map(([k, meta]) => [k, meta.label]),
    ),
    /* The same for the headings, which the customer can now clear from the
       page as well — both the site's own wording and the trade's. */
    labels: {
      ...(content.labels ?? {}),
      ...Object.fromEntries(
        (Object.keys(SITE_LABELS) as LabelKey[])
          .filter(k => !siteLabel(content.labels, k))
          .map(k => [k, LABEL_NAMES[k]]),
      ),
      ...Object.fromEntries(
        (Object.keys(CFG_LABEL_NAMES) as CfgLabelKey[])
          .filter(k => !cfgLabel(content.labels, cfg[k], k))
          .map(k => [k, CFG_LABEL_NAMES[k]]),
      ),
    },
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

  const toggle  = (id: string) => { setFlashed(''); setOpen(o => o === id ? '' : id) }

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

  /* Clicking a part of the page that is not a text opens the settings behind
   * it. Texts never come this way any more — they are written in the bubble,
   * where they stand. */
  /*
   * Textfyllaren.
   *
   * Förslagen skrivs in i utkastet precis som om kunden skrivit dem själv —
   * inget sparas härifrån, och Spara-knappen gäller som vanligt. Det är också
   * varför fälten tas ett i taget: en knapp som byter ut hela sidan trycker man
   * på en gång och ångrar utan väg tillbaka.
   */
  const [fyllare, setFyllare] = useState(false)
  function öppnaFyllare() { setFyllare(true) }

  function användText(nyckel: keyof Förslag, text: string) {
    if (nyckel === 'tjänster') return
    if (nyckel === 'seoTitle') {
      setContent(prev => ({ ...prev, seo: { ...(prev.seo ?? {}), title: text } })); touch(); return
    }
    if (nyckel === 'seoDescription') {
      setContent(prev => ({ ...prev, seo: { ...(prev.seo ?? {}), description: text } })); touch(); return
    }
    patch(nyckel as keyof SiteContent, text)
  }

  /* Beskrivningen matchas på tjänstens namn och skrivs på båda ställen namnet
     förekommer — de fyra som lyfts fram på startsidan och raden i prislistan.
     Att bara röra det ena hade betytt två beskrivningar av samma behandling. */
  /*
   * Platser åt personalen, så många som salongen sagt att de är.
   *
   * Bara påfyllning. Har de redan fler än de uppgav rörs ingenting — en
   * siffra i ett frivilligt fält ska aldrig kunna radera en medarbetare som
   * någon lagt in med namn och bild.
   *
   * De nya platserna får samma platshållarnamn som sidan redan levereras med.
   * Ett tomt kort renderas som ett tomt kort på den publicerade sidan, medan
   * ett med platshållare syns i checklistan som något att byta ut.
   */
  function sättTeam(antal: number) {
    setContent(prev => {
      const nu = prev.team ?? []
      if (nu.length >= antal) return prev
      const mall = exampleTeam(industry)
      const extra = Array.from({ length: antal - nu.length }, (_, i) => {
        const m = mall[(nu.length + i) % mall.length]
        return { name: m.name, title: m.title, image: m.image }
      })
      return { ...prev, team: [...nu, ...extra] }
    })
    touch()
  }

  function användTjänst(namn: string, beskrivning: string) {
    const lika = (a?: string) => (a ?? '').trim().toLowerCase() === namn.trim().toLowerCase()
    setContent(prev => ({
      ...prev,
      services: (prev.services ?? []).map(t => lika(t.name) ? { ...t, desc: beskrivning } : t),
      menuCategories: (prev.menuCategories ?? []).map(kat => ({
        ...kat,
        items: kat.items.map(rad => lika(rad.name) ? { ...rad, desc: beskrivning } : rad),
      })),
    }))
    touch()
  }

  function goTo(sectionId: string, fromPage = false) {
    setOpen(sectionId)
    setMobilePane('edit')
    // The mark stays as long as that section is the one you picked — a flash
    // that fades while the eye is still travelling across the screen is a
    // mark nobody sees.
    setFlashed(fromPage ? sectionId : '')
    requestAnimationFrame(() => {
      const root = panelRef.current
      const target = root?.querySelector(`[data-panel-section="${sectionId}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  /* Which panel field the click landed on.
   *
   * Rather than tagging every heading in ten layouts, the click is matched by
   * what it says: the clicked element's own text against the values the
   * customer typed. A layout can be rebuilt from scratch without anyone
   * remembering to re-tag it, and the same text in two places (the booking
   * button in the nav and in the hero) points at the one field behind both. */
  /** True when what stands on the page is our stand-in, not the customer's own
   *  text — the visitor sees nothing there. */
  function isEmptyField(f: string): boolean {
    /* Ett sidnamn syns alltid — står det inget eget står vårt där. */
    if (isPageField(f)) return false
    if (!isLabelField(f)) return !(content[f as keyof SiteContent] as string | undefined)?.trim()
    const k = labelKeyOf(f)
    return isCfgLabel(k)
      ? !cfgLabel(content.labels, cfg[k], k)
      : !siteLabel(content.labels, k as LabelKey)
  }

  function fieldUnderCursor(el: HTMLElement): string {
    /* Matched against what the preview actually renders, which for a cleared
       text is the stand-in from previewContent rather than the empty value —
       otherwise the one text that most needs clicking is the one text a click
       cannot find.
     *
     * The site's own wording comes second on purpose. If a customer names
     * their salon "Kontakt", the click should land on the business name they
     * typed rather than on our heading that happens to read the same. */
    const named: [string, string | undefined][] = [
      ...Object.entries(FIELD_META).map(([key, meta]): [string, string] =>
        [key, (content[key as keyof SiteContent] as string | undefined)?.trim() || meta.label]),
      ...(Object.keys(SITE_LABELS) as LabelKey[]).map((key): [string, string] =>
        [`${LABEL_PREFIX}${key}`, siteLabel(content.labels, key) || LABEL_NAMES[key]]),
      ...(Object.keys(CFG_LABEL_NAMES) as CfgLabelKey[]).map((key): [string, string] =>
        [`${LABEL_PREFIX}${key}`, cfgLabel(content.labels, cfg[key], key) || CFG_LABEL_NAMES[key]]),
      /* Undersidornas rubriker. De står sist: heter salongen "Tjänster" ska
         klicket landa på företagsnamnet, inte på sidans namn. */
      ...SECTION_PAGE_IDS.map((id): [string, string] =>
        [`${PAGE_PREFIX}${id}`, sectionPageTitle(content as unknown as PublicContent, id)]),
      /* Prislistans ingress som den faktiskt står på sidan.
       *
       * Den är den enda texten vi bygger ihop vid rendering: vår mening plus
       * adressen, så länge kunden inte skrivit en egen. Jämförelsen här är
       * exakt, så den sparade halvan matchade aldrig det som stod på skärmen —
       * och texten gick därför inte att klicka på. Sammansättningen hämtas från
       * samma funktion som sidan använder, så de två inte kan glida isär. */
      [`${LABEL_PREFIX}pricePageIntro`,
       pageIntro(content as unknown as PublicContent).förklaring],
    ]
    /*
     * Jämförelsen tål radbrytningar och dubbla mellanslag.
     *
     * Texten på skärmen är inte alltid tecken för tecken den som är sparad.
     * Rubriken delas i två element för att sätta de sista orden i kursiv, och
     * en text som står på flera rader i koden får radbrytningarna med sig i
     * textContent. Utan normalisering blir följden inte ett litet fel utan ett
     * totalt: fältet hittas inte, och texten går inte att klicka på alls.
     */
    const norm = (v: string) => v.replace(/\s+/g, ' ').trim()

    // Walk out from the click: the innermost element holding exactly one
    // value is the one the customer pointed at.
    let node: HTMLElement | null = el
    for (let i = 0; i < 4 && node; i++) {
      const text = norm(node.textContent ?? '')
      if (text) {
        const found = named.find(([, value]) => value && norm(value) && norm(value) === text)
        if (found) return found[0]
      }
      node = node.parentElement
    }
    return ''
  }
  const editing = articles.find(a => a.id === editingId) ?? null


  /** Vilken persons borttagning som väntar på en bekräftelse. */
  const [teamArmed, setTeamArmed] = useState<number | null>(null)

  /* The people behind the business, edited on the page that shows them. */
  const teamEditor = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 1, background: '#1e293b' }} />
      <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Personerna</p>
      {/*
        * Ingen på/av-knapp. Listan är svaret: står det ingen där visas ingen.
        *
        * Reglaget var dessutom bara halvt sant — det gällde Om oss-sidan men
        * inte mallen som visar teamet på startsidan, så en salong som stängt av
        * personerna kunde ändå möta dem på förstasidan. Ett tomt fält är en
        * regel som inte kan gälla på ett ställe och inte på ett annat.
        */}
      <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
        Namn, titel och foto på var och en — ansikten bygger mer förtroende än någon text.
        Lämna tomt om du inte vill visa några personer; en rad utan namn syns inte heller.
      </p>
      {/*
        * En rad per person, som prislistan har en rad per tjänst.
        *
        * Korten var 210 pixlar breda i en 400 pixlar bred spalt, med foto, två
        * fält och en knapp staplade på höjden — åtta personer blev en skärmhöjd
        * att skrolla igenom för att byta en titel. Raden visar samma tre saker
        * bredvid varandra: fotot är knappen som byter det, namnet och titeln
        * står som fält, krysset tar bort.
        */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(content.team ?? []).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 8 }}>
                <TeamPhoto value={m.image} onChange={url => patchTeam(i, 'image', url)} />
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <input
                    value={m.name}
                    onChange={e => patchTeam(i, 'name', e.target.value)}
                    placeholder="Namn"
                    maxLength={40}
                    style={{ ...inputStyle, padding: '6px 8px', fontSize: 13, fontWeight: 600 }}
                  />
                  <input
                    value={m.title}
                    onChange={e => patchTeam(i, 'title', e.target.value)}
                    placeholder="Titel — t.ex. frisör"
                    maxLength={40}
                    style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                  />
                </span>
                {/* Två steg, samma regel som prislistan: ett klick får inte
                    radera en person med namn, titel och uppladdat foto. Egen
                    knapp i stället för webbläsarens dialog — den sväljs tyst i
                    inbäddade webbläsare, och en varning som ibland inte syns är
                    sämre än ingen. En tom rad tas bort direkt; där finns
                    ingenting att förlora. */}
                <button
                  onClick={() => {
                    const tom = !m.name?.trim() && !m.title?.trim() && !m.image?.trim()
                    if (tom || teamArmed === i) { setTeamArmed(null); removeTeamMember(i); return }
                    setTeamArmed(i)
                  }}
                  onBlur={() => setTeamArmed(null)}
                  title="Ta bort personen"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, alignSelf: 'stretch',
                    color: teamArmed === i ? '#f87171' : '#475569',
                    fontSize: teamArmed === i ? 11 : 17,
                    fontWeight: teamArmed === i ? 700 : 400,
                    padding: '0 2px 0 4px', lineHeight: 1, whiteSpace: 'nowrap',
                  }}
                >
                  {teamArmed === i ? 'Säker?' : '×'}
                </button>
              </div>
            ))}
          </div>
          {(content.team?.length ?? 0) < 8 ? (
            <button onClick={addTeamMember} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#eab308', background: 'none', border: '1px dashed #334155', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: F }}>
              + Lägg till person
            </button>
          ) : (
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, margin: 0 }}>
          Åtta personer är taket — fler blir en lista att skrolla i stället för ett team att känna igen.
        </p>
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


  /* On a phone the panel and the page take turns instead of sharing the row */
  const narrow = useNarrow()
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit')
  const showPanel   = !narrow || mobilePane === 'edit'
  const showPreview = !narrow || mobilePane === 'preview'

  return (
    // The dashboard's mobile top bar is 3.5rem (pt-14); on lg the sidebar sits
    // beside us instead, so the editor gets the full viewport height there.
    <SajtProvider värde={sajt}>
    <MediaProvider library={mediaLibrary} onAdd={addToLibrary} controlRef={mediaRef}>
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-dvh" style={{ background: '#020617' }}>

      {/* Textfyllaren ligger över redigeraren, som varningsrutan nedanför.
          Fristående och inte i någon av ternärerna: den ska kunna öppnas
          oavsett om en artikel redigeras eller bilder byts. */}
      {fyllare && (
        <Textfyllare
          nuvarande={{
            heroHeading:    content.heroHeading,
            heroBody:       content.heroBody,
            tagline:        content.tagline,
            ctaText:        content.ctaText,
            aboutTitle:     content.aboutTitle,
            aboutBody:      content.aboutBody,
            seoTitle:       content.seo?.title ?? '',
            seoDescription: content.seo?.description ?? '',
          }}
          onStäng={() => setFyllare(false)}
          onAnvänd={användText}
          onAnvändTjänst={användTjänst}
          onSättTeam={sättTeam}
        />
      )}

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
        {/* Salongens namn, inte mallens. Kunden vet vilken sajt de redigerar
            — de vet sällan vad designen heter, och behöver inte veta det. */}
        {!!content.businessName?.trim() && (
          <span style={{ fontSize: 11, color: '#64748b', fontFamily: F, border: '1px solid #1e293b', borderRadius: 6, padding: '2px 8px' }}>
            {content.businessName.trim()}
          </span>
        )}
        {/* Var sajten ligger, där kunden alltid ser det. Den går inte att ändra
            — den är tillfällig tills de kopplat sin domän — så den står som
            uppgift och inte som fält. Klickbar, för det första man vill göra
            med en adress är att titta på den. */}
        {!!currentSlug && (
          <ExternalLink href={liveUrl}>
            <span style={{ fontSize: 11, color: '#64748b', fontFamily: F, textDecoration: 'underline' }}>
              {egenDoman ?? `kiterank.se/s/${currentSlug}`}
            </span>
          </ExternalLink>
        )}

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
          {currentSlug && !dirty && (
            <ExternalLink href={liveUrl} className="panel-live-link">
              <span style={{ fontSize: 13, color: '#eab308', fontFamily: F }}>Se min sida live →</span>
            </ExternalLink>
          )}
          {saved && !dirty && <span style={{ fontSize: 13, color: '#4ade80', fontFamily: F }}>Sparat ✓</span>}
          {!dirty && <ÅngraPublicering />}
        </div>
      </div>

      {/*
       * Raden som dyker upp när något ändrats.
       *
       * Spara och Ångra låg tidigare som små knappar till höger i topraden —
       * lätta att missa, och den som redigerade långt ned i panelen visste inte
       * ens att de fanns. Nu bor de här: en egen rad direkt under topraden som
       * dyker upp i samma ögonblick något ändras och står kvar tills det är
       * sparat eller ångrat.
       *
       * Att den alltid syns är ingen skroll-mekanik utan layoutens förtjänst:
       * panelen och förhandsvisningen skrollar inuti sina egna kolumner, så
       * allt som ligger ovanför dem står stilla hur långt ned man än arbetat.
       */}
      {dirty && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '8px 16px', background: 'rgba(234,179,8,0.08)',
          borderBottom: '1px solid rgba(234,179,8,0.35)',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#eab308', fontFamily: F }}>
            Du har osparade ändringar
          </span>
          {saveError && <span style={{ fontSize: 12.5, color: '#f87171', fontFamily: F }}>Kunde inte spara — försök igen</span>}
          <span style={{ flex: 1 }} />
          <button
            onClick={() => {
              /* Förhandsvisningen börjar högst upp — och på en smal skärm
                 ligger den i en egen flik som först måste fram. */
              if (narrow) setMobilePane('preview')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            style={{
              padding: '7px 12px', fontSize: 12, fontWeight: 600, fontFamily: F,
              background: 'none', color: '#94a3b8', border: '1px solid #334155',
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            Förhandsvisning
          </button>
          {/* The way back. Knowing it exists is what makes the panel safe to
              poke around in — fear of breaking things keeps rookies from
              touching anything at all. */}
          <button
            onClick={() => {
              if (!confirmUndo) { setConfirmUndo(true); return }
              restoreSaved()
            }}
            onBlur={() => setConfirmUndo(false)}
            title="Backa alla ändringar sedan du senast sparade"
            style={{
              padding: '7px 12px', fontSize: 12, fontWeight: 600, fontFamily: F, background: 'none',
              color: confirmUndo ? '#f87171' : '#94a3b8',
              border: `1px solid ${confirmUndo ? 'rgba(239,68,68,0.45)' : '#334155'}`,
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            {confirmUndo ? 'Säker? Klicka igen' : 'Ångra ändringar'}
          </button>
          <button onClick={save} disabled={saving} style={{
            padding: '7px 18px', fontSize: 13, fontWeight: 700, fontFamily: F,
            background: '#eab308', color: '#0f172a', border: 'none', borderRadius: 8, cursor: 'pointer',
          }}>
            {saving ? 'Sparar…' : 'Spara'}
          </button>
        </div>
      )}

      {/* Adressen står i huvudet nu. Kvar här är det enda raden tillförde:
          varför sajten ännu inte syns på Google — och den försvinner så fort
          salongen kopplat sin domän, för då är den inte längre sann. */}
      {currentSlug && !egenDoman && !editing && !editingPage && !swapping && (
        <div style={{ padding: '6px 16px', borderBottom: '1px solid #1e293b', fontSize: 12, color: '#64748b', fontFamily: F }}>
          På Google syns sidan när den ligger på din egen domän — den kopplar du under{' '}
          {/* Knapp och inte bara ord: den som läser det här vill dit, och att
              be dem leta rätt på sektionen själva är att skriva en skylt utan
              pil. */}
          <button
            onClick={() => goTo('domain')}
            style={{
              background: 'none', border: 'none', padding: 0, fontSize: 12,
              fontFamily: F, color: '#eab308', textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Din domän
          </button>.
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
          /* Ingen `team` här: teamet redigeras i panelens Om oss-sektion. Två
             ställen att lägga till samma person på är två ställen att leta på. */
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
          {/* Brister före checklista. Den ena säger att något är trasigt för
              besökaren, den andra vad som återstår för att sidan ska bli bra —
              och det som är trasigt ska inte ligga under sju rader annat. */}
          <BristBand brister={sidansBrister({
            menuCategories: content.menuCategories,
            bransch:        industry,
            bookingUrl:     content.bookingUrl,
            harBokning:     siteFeatures.booking !== false,
          })} />

          <StartChecklist
            items={checklist}
            onGo={id => id === SWAP_IMAGES ? setSwapping(true) : goTo(id)}
            onAction={a => { if (a === 'fyllare') öppnaFyllare() }}
          />

          {Zone('Hela sajten', 'Gäller alla sidor')}
          {/* Thirteen sections in one run is past what anyone holds in their
              head. Three quiet dividers make the list explain itself: the top
              is the whole site, the middle IS the page in order, the bottom is
              rarely touched. */}
          {/*
            * Allt som avgör hur salongen ser ut, på ett ställe.
            *
            * Loggan låg tidigare i en egen sektion tillsammans med sidans
            * språk — två saker som inte har med varandra att göra, ihopsatta
            * för att båda var korta. Nu står loggan bredvid designen och
            * färgerna, där den som byter det ena oftast vill se det andra.
            */}
          <Section id="design" title="Branding" hint="Logga, färger och design" open={open === 'design'} onToggle={() => toggle('design')} flash={flashed === 'design'}>
            <BrandingSektion design={design} templates={templates ?? []} />
          </Section>

        {/* A salon on the booking track has its booking page set up already,
            and every button on the site resolves to it. Asking them where
            the buttons should lead is a question with one answer. The
            section belongs to the salons who book somewhere else. */}
        {/* Bokning har ingen egen sektion längre. Frågan "vart leder
            boka-knappen" var samma fråga som prislistevalet redan ställer, och
            två fält för samma sak är två fält som kan säga emot varandra.
            Länken efterfrågas nu i prislistan, där valet som kräver den görs. */}



        <Section id="bilder" title="Bilder" hint="Allt du laddat upp" open={open === 'bilder'} onToggle={() => toggle('bilder')} flash={flashed === 'bilder'}>
          <BilderSektion
            bilder={allaBilder}
            platser={bildPlatser}
            onAdd={addToLibrary}
            onRemove={removeFromLibrary}
            onGåTill={t => { setPreviewPage(t.sida as 'start' | SectionPageId); goTo(t.panel) }}
          />
          </Section>

          <Section id="contact" title="Kontakt & öppettider" hint="Visas längst ner på varje sida" open={open === 'contact'} onToggle={() => toggle('contact')} flash={flashed === 'contact'}>
            <KontaktSektion visasVar={() => visasVar('contact', 'Kontaktsidan', true)} />
          </Section>



          {/*
            * Domänen står för sig själv.
            *
            * Den låg tidigare inklämd under Inställningar tillsammans med
            * sökresultat och språk. Men domänkopplingen är inte en inställning
            * bland andra — det är den enda åtgärden i hela panelen som avgör
            * om sajten syns på Google, den tar dagar att genomföra, och den
            * kostar kunden pengar hos någon annan. Sådant ska inte ligga
            * bakom en rubrik som låter som en pappersback.
            *
            * Ingen adressruta här heller. /s/-adressen är tillfällig och
            * noindexad, och att låta dem byta den vore ett val som inte
            * förbättrar något men kan bryta länkar de redan delat. Den står i
            * toppen av panelen så de vet var sajten ligger — det räcker. */}
          <Section id="domain" title="Din domän" hint="Krävs för att synas på Google" open={open === 'domain'} onToggle={() => toggle('domain')} flash={flashed === 'domain'}>
            <DomanFalt namn={content.businessName} initial={domäner} />
          </Section>

          <Section id="google" title="Inställningar" hint="Sökresultat och språk" open={open === 'google'} onToggle={() => toggle('google')} flash={flashed === 'google'}>
            <GoogleSerpEditor
              content={content}
              siteSlug={currentSlug || 'din-salong'}
              industry={industry}
              onChange={seo => { setContent(p => ({ ...p, seo })); touch() }}
            />
            <div style={{ height: 1, background: '#1e293b' }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 6px' }}>Sidans språk</p>
              <select
                value={content.siteLang ?? 'sv'}
                onChange={e => { patch('siteLang', e.target.value) }}
                style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: F, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' }}
              >
                {SITE_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '6px 0 0' }}>
                Styr uppläsning och webbläsarens fråga om att översätta sidan. Texterna skriver du själv.
              </p>
            </div>
          </Section>

          {Zone('Sidans delar', 'Uppifrån och ner, i samma ordning som på sidan')}

          {/* Said once, at the top of the list it applies to. This is the rule
              the whole editor runs on: text is written where it stands, and
              the panel is left holding the settings. */}
          <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.6, margin: '0 2px 2px' }}>
            All text ändrar du genom att klicka på den i förhandsvisningen.
          </p>

          {/* Every part of the page in the customer's order — the panel
              mirrors the page, and the arrows move both at once. Only the
              footer (Kontakt & öppettider) stays put. */}
          {sectionOrder.map((sectionId, si) => {
            /* The full price list rides along in the Prislista panel, so its
               arrows need to know where it sits on the page. */
            /* Mallens tjänsteruta är prislistan på startsidan, och den ligger
               på 'services'. Pilarna flyttade tidigare 'pricelist', som inte
               ritas där längre — de gjorde alltså ingenting. */
            const priceAt = sectionOrder.indexOf('services')
            /* On desktop, moving lives on the page itself — hover a section
               and the tools appear. The panel arrows stay only on phones,
               where there is no hover to find them with. */
            const moveProps = narrow ? {
              onMoveUp:   si > 0                       ? () => moveSection(sectionId, -1) : undefined,
              onMoveDown: si < sectionOrder.length - 1 ? () => moveSection(sectionId, 1)  : undefined,
            } : {}
            /* Stora rubriken har ingen ruta. Den består bara av text, och text
               skrivs där den står — så rutan innehöll en enda mening om att gå
               någon annanstans. Den ligger dessutom alltid först och går inte
               att flytta, så den har inget att göra i en lista vars syfte är
               ordning och inställningar. */
            if (sectionId === 'hero') return null
            {/* One price list, one panel. It used to be two — the menu here
                and its placement in a second section — which meant a help text
                whose whole job was to say where the other panel was. */}
            if (sectionId === 'services') return (
          <Section
            key="pricelist" id="pricelist" title="Prislista"
            hint={promoOnly
              ? `${PLATSORD.charAt(0).toUpperCase()}${PLATSORD.slice(1)} tjänster som lockar vidare till din bokningssida`
              : `Dina tjänster och priser — stjärnmärk ${PLATSORD} som visas på startsidan`}
            open={open === 'pricelist'} onToggle={() => toggle('pricelist')} flash={flashed === 'pricelist'} {...moveProps}
          >

            {/* Prices kept on the booking page: there is no list to maintain
                here, only the services the start page shows off. Editing a
                full price list we never display would be busywork with a
                second copy of the truth as the prize. Antalet fält följer
                mallen — en mall med sex platser ska ge sex fält. */}
            {promoOnly ? (
              <>
                <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
                  De {PLATSORD} tjänster startsidan visar.
                </p>
                {Array.from({ length: PROMO_MAX }, (_, i) => i).map(i => {
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
              <>
              {/*
                Samma redigerare som i bokningssystemet, samma rader i databasen.
                Det var uppdelningen i två listor — en här som text, en i
                bokningens tabell — som gjorde att en prishöjning på hemsidan
                aldrig nådde kalendern.

                Bokningsfälten ritas inte här när salongen saknar bokningssystem.
                Bufferttid och max per dag betyder ingenting för den som bara har
                en hemsida.

                Sparas direkt mot sin egen rutt, inte genom panelens
                spara-knapp: tjänsterna är en egen tabell och inte ett fält i
                sidans innehåll.
              */}
              <TjanstEditor
                harBokning={hasBooking(plan)}
                utvalda={visadeTjanster(content).map(s => s.name)}
                onStjärna={toggleFeatured}
              />
              </>
            )}

            {/* Vilka fyra startsidan visar, och i vilken ordning.
                Den första står stor med tre under, så ordningen är ett verkligt
                val. Utan den här listan syns urvalet bara som stjärnor utspridda
                i en lång prislista — och ordningen inte alls. */}
            {!externalPricelist && content.menuCategories.length > 0 && (
              <>
                <div style={{ height: 1, background: '#1e293b' }} />
                {/* Ringen tänds när kunden försökt lägga till en femte. Den
                    sitter runt både rubriken och raderna: det är rutan som är
                    full, inte en enskild rad. */}
                <div
                  ref={urvalRef}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 8,
                    border: `1px solid ${urvalFullt ? '#ef4444' : 'transparent'}`,
                    borderRadius: 10, padding: 8, margin: -8,
                    transition: 'border-color 0.15s',
                  }}
                >
                <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>
                  Detta visas på startsidan
                </p>
                {urvalFullt && (
                  <p style={{ fontSize: 11, color: '#f87171', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                    {`Startsidan har ${PLATSORD} platser och alla är tagna. Ta bort en med × här nedan, så kan du lägga till en annan.`}
                  </p>
                )}

                {/* Samma funktion som sidan renderar ur, inte den sparade listan.
                    Ett namn som inte längre finns i prislistan visas aldrig på
                    startsidan — och får därför inte stå här heller. Listan sa
                    tidigare "Färgning & slingor — störst" om en rad som inte
                    fanns, medan besökaren såg något annat. */}
                {(() => {
                  /* Samma funktion som sidan renderar ur, så raderna här är de
                     som faktiskt står på startsidan — inte en sparad kopia. */
                  const visas = visadeTjanster(content)
                  const eget  = content.services.some(s => visas.some(v => v.name === s.name))

                  if (!visas.length) return (
                    <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                      {`Lägg till tjänster i prislistan — de ${PLATSORD} översta visas på startsidan.`}
                    </p>
                  )

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {visas.map((s, i) => (
                        <div key={s.name + i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', borderRadius: 8, padding: '7px 10px' }}>
                          <span style={{ fontSize: 11, color: '#64748b', fontFamily: F, minWidth: 14 }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: 12, color: '#e2e8f0', fontFamily: F }}>
                            {s.name}
                            {i === 0 && <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>störst</span>}
                          </span>
                          <button
                            onClick={() => moveFeatured(i, -1)}
                            disabled={i === 0}
                            title="Flytta upp"
                            style={{ background: 'none', border: 'none', color: i === 0 ? '#334155' : '#94a3b8', fontSize: 13, cursor: i === 0 ? 'default' : 'pointer', padding: '0 3px', fontFamily: F }}
                          >↑</button>
                          <button
                            onClick={() => moveFeatured(i, 1)}
                            disabled={i >= visas.length - 1}
                            title="Flytta ner"
                            style={{ background: 'none', border: 'none', color: i >= visas.length - 1 ? '#334155' : '#94a3b8', fontSize: 13, cursor: i >= visas.length - 1 ? 'default' : 'pointer', padding: '0 3px', fontFamily: F }}
                          >↓</button>
                          {/* Att ta bort här är samma sak som att släcka stjärnan
                              i prislistan — en plats blir ledig, inget annat. */}
                          <button
                            onClick={() => taBortUtvald(s.name)}
                            title="Ta bort från startsidan"
                            style={{ background: 'none', border: 'none', color: urvalFullt ? '#f87171' : '#94a3b8', fontSize: 15, cursor: 'pointer', padding: '0 2px 0 5px', lineHeight: 1, fontFamily: F }}
                          >×</button>
                        </div>
                      ))}
                      {!eget && (
                        <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '2px 0 0' }}>
                          {`Inget eget val ännu — de ${PLATSORD} översta ur din prislista. Stjärnmärk i listan ovan för att välja själv.`}
                        </p>
                      )}
                    </div>
                  )
                })()}
                </div>
              </>
            )}
            {/* Startsidan visar alltid ett urval — hela listan bor på prissidan
                eller hos bokningstjänsten. Kvar här är en enda fråga: ska
                priserna synas på startsidan över huvud taget? */}
            {/*
              * Prislistans val, i två uppsättningar.
              *
              * En salong med bokningssystemet här och en som bokar någon
              * annanstans har olika frågor att svara på, men fick tidigare
              * samma tre alternativ — där ett av dem krävde något de inte
              * köpt. Nu ställs bara de frågor som gäller dem.
              *
              * Gemensamt: var priserna syns. Sedan hur man bokar, och till
              * sist vart knappen högst upp leder.
              */}
            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>
              Var syns priserna?
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ flex: 1 }}>
                <Kryss
                  on={siteFeatures.pricelist}
                  onChange={v => { setSiteFeatures(prev => ({ ...prev, pricelist: v })); touch() }}
                  title="På startsidan"
                  hint="En tjänst lyfts fram stort med tre under, och därifrån går besökaren vidare."
                />
              </span>
              {narrow && (
                <>
                  <button onClick={() => moveSection('pricelist', -1)} disabled={priceAt <= 0} title="Flytta upp på sidan"
                    style={{ background: 'none', border: 'none', padding: '0 2px', fontSize: 13, color: priceAt <= 0 ? '#1e293b' : '#64748b', cursor: priceAt <= 0 ? 'default' : 'pointer' }}>↑</button>
                  <button onClick={() => moveSection('pricelist', 1)} disabled={priceAt >= sectionOrder.length - 1} title="Flytta ner på sidan"
                    style={{ background: 'none', border: 'none', padding: '0 2px', fontSize: 13, color: priceAt >= sectionOrder.length - 1 ? '#1e293b' : '#64748b', cursor: priceAt >= sectionOrder.length - 1 ? 'default' : 'pointer' }}>↓</button>
                </>
              )}
            </div>
            {/* Egen sida och "var priserna bor" var två frågor som kunde ge
                omöjliga svar — en egen prissida för en salong vars priser låg
                hos bokningstjänsten. Nu är det en fråga: kryssar de i sidan
                bor priserna här, kryssar de ur bor de bakom bokningslänken. */}
            <Kryss
              on={ownPricePage}
              onChange={v => {
                setContent(prev => ({ ...prev, pricelistMode: v ? 'site' : 'booking', pricelistPreview: 'promo' }))
                patchPage('pricelist', v
                  ? { enabled: true, title: content.sectionPages?.pricelist?.title || undefined }
                  : { enabled: false })
              }}
              title="Som en egen sida"
              hint="Hela prislistan får en sida för sig själv och en knapp i menyn. Det är den sidan Google kan visa på en prissökning."
            />
            {ownPricePage && (
              <span style={{ paddingLeft: 28 }}>
                <Field
                  label="Knappens text i menyn"
                  value={content.sectionPages?.pricelist?.title ?? ''}
                  onChange={v => patchPage('pricelist', v.trim() ? { title: v } : { title: v, enabled: false })}
                  placeholder={siteLabel(content.labels, SECTION_PAGES.pricelist.labelKey)}
                  max={30}
                />
              </span>
            )}

            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>
              Hur bokar besökaren?
            </p>
            {/* Bara den som har bokningssystemet har något att välja mellan.
                För övriga är bokningslänken hela svaret, och då är en fråga med
                ett alternativ bara en rad att läsa förbi. */}
            {hasBooking(plan) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Val
                  on={bokningsLäge === 'system'}
                  title="Bokningssystemet här"
                  märke="Vanligast"
                  hint="Kunden bokar utan att lämna sidan, och tiderna hamnar i din kalender."
                  onChange={() => { setBokningsVal('system'); patch('bookingUrl', '') }}
                />
                <Val
                  on={bokningsLäge === 'egen'}
                  title="Egen bokningslänk"
                  hint="Boka-knapparna leder till din bokningstjänst i stället."
                  onChange={() => setBokningsVal('egen')}
                />
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                Boka-knapparna leder till din bokningstjänst.
              </p>
            )}
            {bokningsLäge === 'egen' && (
              <>
                <Field label="Din bokningslänk" value={content.bookingUrl} onChange={v => patch('bookingUrl', v)} placeholder="https://www.bokadirekt.se/..." />
                {!ownBookingLink && (
                  <p style={{ fontSize: 11, color: '#eab308', fontFamily: F, lineHeight: 1.5, margin: '-6px 0 0' }}>
                    Länken behöver fyllas i för att bokningsknapparna ska fungera.
                  </p>
                )}
              </>
            )}

            <div style={{ height: 1, background: '#1e293b' }} />
            {/* Knappen namnges med sin egen text. "Toppknappen" säger ingenting
                för den som satt dit ordet "Boka tid" — de känner igen sin
                knapp, inte vårt ord för den. */}
            <p style={{ fontSize: 10, color: '#eab308', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>
              Knappen ”{knappText}” på startsidan leder till
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Val
                on={(content.ctaTarget ?? 'boka') === 'boka'}
                title="Bokningen"
                hint="Färrest steg till en bokad tid. Från undersidorna bokar knapparna alltid."
                onChange={() => patch('ctaTarget', 'boka')}
              />
              <Val
                on={content.ctaTarget === 'prislista' && ownPricePage}
                title={ownPricePage ? `Prissidan ”${prisSidNamn}”` : 'Prissidan'}
                hint={ownPricePage
                  ? 'Besökaren ser vad saker kostar först och bokar därifrån.'
                  : 'Kräver att prislistan har en egen sida — kryssa i den ovan.'}
                onChange={() => { if (ownPricePage) patch('ctaTarget', 'prislista') }}
              />
            </div>


            {/* Ingen rad om att en länk tas bort. Valet ovan säger vad som
                gäller medan det görs, och en varning om en biverkan av ett kort
                som inte finns kvar är bara en rad att läsa förbi. */}

            {/* Vad valet kostar i sökbarhet, sagt en gång. Google läser inte det
                som ligger bakom bokningslänken — så en salong som lägger
                priserna där har bara urvalet på startsidan som kan dyka upp på
                en prissökning. Det är inget fel val, men det ska vara ett
                medvetet. */}
            {externalPricelist && (
              <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: F, lineHeight: 1.6, margin: 0 }}>
                Google kan inte läsa priserna bakom bokningslänken. Bara urvalet på startsidan kan dyka upp på ”{priceQueryExample}”.
              </p>
            )}
          </Section>
            )
            if (sectionId === 'pricelist') return null
            if (sectionId === 'gallery') return (
          <Section
            key="gallery"
            id="gallery" title="Bildgalleri" hint="Foton från salongen och ditt arbete"
            open={open === 'gallery'} onToggle={() => toggle('gallery')} flash={flashed === 'gallery'}
            {...moveProps}
          >
            {/* Genomgången av varje exempelbild på sajten — även artiklarnas
                omslag och bilderna inne i texterna. Den låg tidigare i kom
                igång-listan, men den posten handlar nu bara om galleriet på
                startsidan. Verktyget hör ändå hemma här, där bilder hanteras. */}
            {placeholdersLeft > 0 && (
              <button
                onClick={() => setSwapping(true)}
                style={{ alignSelf: 'flex-start', fontSize: 12, color: '#eab308', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: F, padding: 0, textAlign: 'left' }}
              >
                Gå igenom alla exempelbilder på sajten ({placeholdersLeft} kvar)
              </button>
            )}
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
            {visasVar('gallery', 'Var syns galleriet?')}
          </Section>
            )
            if (sectionId === 'blog') return (
          <Section
            key="articles"
            id="articles" title="Artiklar" hint="Nyheter och blogginlägg som förbättrar din synlighet på Google"
            open={open === 'articles'} onToggle={() => toggle('articles')} flash={flashed === 'articles'}
            {...moveProps}
          >
            <ArticleList articles={articles} onEdit={setEditingId} onAdd={() => setEditingId(addArticle())} />
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
                Bilderna i exempelartiklarna är platshållare. Byt dem mot egna foton.
              </p>
            )}
            {visasVar('blog', 'Var syns artiklarna?')}
          </Section>
            )
            if (sectionId === 'reviews') return (
          <Section
            key="reviews"
            id="reviews" title="Recensioner" hint="Välj vilka omdömen som visas på sidan"
            open={open === 'reviews'} onToggle={() => toggle('reviews')} flash={flashed === 'reviews'}
            {...moveProps}
          >
            {featuredReviews.some(r => r.source === 'example') && (
              <div style={{ background: '#1e293b', borderLeft: '3px solid #eab308', borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: '#e2e8f0', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                  Exempelomdömen. <strong>De följer inte med när sidan publiceras.</strong>{' '}
                  Koppla din Google-profil så hämtas dina riktiga hit.
                </p>
              </div>
            )}
            <TestimonialEditor compact testimonials={featuredReviews} onAdd={addTestimonial} onRemove={removeTestimonial} />
            <ReviewPicker compact reviews={pickerReviews} selected={featuredReviews.filter(r => r.source !== 'manual') as MockReview[]} toggle={toggleFeaturedReview} loading={reviewsLoading} />
            {visasVar('reviews', 'Var syns omdömena?')}
          </Section>
            )
            return (
          <Section
            key="about"
            id="about" title="Om oss & teamet" hint="Er historia och personerna bakom"
            open={open === 'about'} onToggle={() => toggle('about')} flash={flashed === 'about'}
            {...moveProps}
          >
            {/* Numbers a business is proud of belong with the story about it,
                not filed under opening hours */}
            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Siffror om er</p>
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-8px 0 0' }}>
              Visas som en rad högst upp på sidan. Tomma rader syns inte.
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
                heaviest thing left in the panel.
             *
             * Det höll inte. Sektionen heter "Om oss & teamet" och innehöll
             * bara siffror plus en knapp som pratade om sidans namn — den som
             * letade efter att lägga till en person hittade ingenting och drog
             * slutsatsen att det inte gick. Teamet redigeras här igen, men som
             * rader i stället för kort, precis som prislistan. Det var
             * kortformatet som var tungt, inte platsen. */}
            {teamEditor}
            {visasVar('about', 'Var syns om oss?')}
          </Section>
            )
          })}


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
            /* Delar som gäller hela sajten skrivs i panelen, inte på sidan.
               Sidfoten är en av dem: namnet och sloganen står redan i toppen,
               och kontaktuppgifterna följer med varje sida. En skrivruta här
               hade betytt två ställen att ändra samma text på. */
            const baraPanel = !!el.closest?.('[data-panel-only]')
            // A known text: edit it right where it stands
            const field = baraPanel ? '' : fieldUnderCursor(el)
            if (field && (isLabelField(field) || isPageField(field) || FIELD_META[field])) {
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
            /* The label that says what a click here does — and, when the text
               under the cursor is one the customer has cleared, that what
               stands there is our name for the empty space rather than
               anything a visitor will ever see. */
            /* Samma spärr som klicket: lova ingen skrivruta där det inte
               kommer någon. */
            const baraPanel = !!el.closest?.('[data-panel-only]')
            const under = baraPanel ? '' : fieldUnderCursor(el)
            const label = baraPanel ? 'Ändras under Kontakt & öppettider'
              : el.tagName === 'IMG' ? 'Byt bild'
              : under && isEmptyField(under) ? 'Tom — syns inte på sidan. Klicka för att skriva'
              : under ? 'Redigera texten'
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
            const lKey  = isLabelField(bubble.field) ? labelKeyOf(bubble.field) : null
            const pId   = isPageField(bubble.field) ? pageIdOf(bubble.field) : null
            /* A heading falls back either to the trade's wording or to ours,
               depending on which family it belongs to. */
            const fallback = lKey
              ? (isCfgLabel(lKey) ? cfg[lKey] : SITE_LABELS[lKey as LabelKey])
              : ''
            const meta = pId
              ? { label: PAGE_LABEL[pId] + ' — namnet', max: 30, multiline: false }
              : lKey
              ? { ...(LABEL_FORM[lKey] ?? { max: 60, multiline: false }),
                  label: isCfgLabel(lKey) ? CFG_LABEL_NAMES[lKey] : LABEL_NAMES[lKey as LabelKey] }
              : FIELD_META[bubble.field]
            const value = pId
              ? (content.sectionPages?.[pId]?.title ?? sectionPageTitle(content as unknown as PublicContent, pId))
              : lKey
              ? (isCfgLabel(lKey) ? cfgLabel(content.labels, cfg[lKey], lKey) : siteLabel(content.labels, lKey as LabelKey))
              : (content[bubble.field as keyof SiteContent] as string | undefined) ?? ''
            /* Sidnamnet är också menyknappens namn — samma skrivning, ett namn.
               Töms det försvinner sidan, precis som i panelens fält, och det
               syns direkt i förhandsvisningen bredvid. */
            const write = (v: string) =>
              pId ? patchPage(pId, { title: v })
              : lKey ? patchLabel(lKey, v)
              : patch(bubble.field as keyof SiteContent, v)
            /* Only a heading has something to go back to. A cleared one stays
               cleared until they ask for the default again. */
            const canReset = !!lKey && value !== fallback
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
                      onChange={e => write(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') close() }}
                      style={inputStyle}
                    />
                  ) : (
                    <input
                      autoFocus value={value} maxLength={meta.max}
                      onChange={e => write(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') close() }}
                      style={inputStyle}
                    />
                  )}
                  <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                    Töm rutan så försvinner texten helt från den publicerade sidan.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {canReset && lKey && (
                      <button
                        onClick={() => patchLabel(lKey, fallback)}
                        style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: F, padding: 0 }}
                      >
                        Återställ
                      </button>
                    )}
                    <span style={{ flex: 1 }} />
                    <button onClick={close} style={{ background: '#eab308', color: '#0f172a', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                      Klar
                    </button>
                  </div>
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
    </SajtProvider>
  )
}
