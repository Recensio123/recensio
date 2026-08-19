import { cache } from 'react'
import { unstable_cache, revalidateTag } from 'next/cache'
import { permanentRedirect } from 'next/navigation'
import { viaOwnDomain, siteOrigin } from '@/lib/siteHost'
import { isClosed } from '@/lib/accountStatus'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTemplatesForIndustry, resolveTemplate, type Template } from '@/lib/templates'
import { type SiteContent } from '@/components/site/PreviewSite'
import { CONTENT } from '@/lib/siteExampleContent'
import { baseIndustry } from '@/lib/industries'
import { SERVICES, slugifyService } from '@/lib/services-data'
import {
  publishedArticles, articleSummary, articleImages, formatArticleDate, type Article,
} from '@/lib/articles'
import { sectionPageEnabled, sectionPageTitle, sectionPageBlocks, type SectionPageId } from '@/lib/sectionPages'
import { withExamples } from '@/lib/exampleContent'

/*
 * The published customer site, resolved from a slug.
 *
 * This is the moment the editor's work becomes real: everything the customer
 * saved in site_config, rendered at a public address Google can reach. The
 * page and its metadata both need the same resolution, so it lives here once.
 */

export type PublishedSite = {
  slug:     string
  industry: string
  template: Template
  content:  SiteContent
  /** Wellness or treatment — decides which schema.org parent the markup uses
   *  for trades that straddle the two. Null when the question never applied. */
  care:     'wellness' | 'care' | null
  /** How the request found this site. A visitor on the salon's own domain
   *  arrived by domain, and must not be redirected to our address — that is
   *  what the rename-redirect below would otherwise do to every one of them. */
  matchedBy: 'slug' | 'domain'
  /**
   * Adressen begäran faktiskt kom in på — vår slug eller salongens domän.
   *
   * Varje intern länk, varje kanonisk adress och menyns bas byggs ur den här,
   * inte ur `slug`. Skillnaden syns bara för en salong med egen domän: på
   * salongen.se heter prissidan /tjanster, hos oss /s/salongen/tjanster.
   * Byggs länken av `slug` pekar menyn på vår adress mitt inne på deras sajt,
   * och proxyn hittar ingenting där.
   */
  key: string
  /** The salon's verified own domain, when they have connected one. This is
   *  what flips the site from a temporary address to a real one: /s/<slug>
   *  starts 301-redirecting here, and indexing switches on. Null until a
   *  domain is verified — nothing a visitor typed can set it. */
  ownDomain: string | null
  /** Mätströmmens id för salongens egen GA4-property, när Google är kopplat.
   *  Null betyder att sajten inte mäter något — inte att den mäter fel. */
  mätId: string | null
}

/*
 * Cachen, i två steg.
 *
 * Steg ett översätter adressen till ett företag. Steg två läser företagets
 * sajt. Uppdelningen finns för att de två har olika livslängd: adressen ändras
 * när en domän kopplas, innehållet varje gång kunden sparar.
 *
 * Etiketten på steg två är företagets id, inte adressen. Det är hela poängen:
 * en salong med egen domän nås på två adresser — /s/salongen och
 * /s/salongen.se — och får därmed två cacheposter. Båda bär samma etikett, så
 * ett enda anrop vid sparning rensar dem allihop. Regeln blir densamma för
 * kunder med egen domän som för kunder utan, för domänen ingår inte i den.
 *
 * Livslängden är ett dygn som skyddsnät. Den ska aldrig behövas — rensningen
 * sker vid sparning — men om ett anrop någon gång missas ska en sajt inte
 * kunna visa gammalt innehåll för alltid.
 */
const DYGN = 86_400

/** Adressen → företaget. Egen etikett: en domän som just verifierats måste
 *  kunna slå sönder ett cachat "den här adressen finns inte". */
const companyForKey = (key: string) => unstable_cache(
  async () => resolveCompany(key),
  ['site-key', key],
  { tags: [`site-key:${key}`], revalidate: DYGN },
)()

/** Företaget → sajten. Etiketten är id:t, så den täcker alla adresser. */
const siteForCompany = (id: string) => unstable_cache(
  async () => loadSite(id),
  ['site', id],
  { tags: [`site:${id}`], revalidate: DYGN },
)()

/* Wrapped in cache(): within one request the layout and the page must share
   one lookup. Utanför begäran tar unstable_cache över. */
export const getPublishedSite = cache(async (key: string): Promise<PublishedSite | null> => {
  const träff = await companyForKey(key)
  if (!träff) return null
  const site = await siteForCompany(träff.id)
  return site ? { ...site, matchedBy: träff.matchedBy, key } : null
})

/**
 * Sajtens rot sett från adressen den serveras på.
 *
 * Tom sträng på salongens egen domän — där ÄR sajten roten. `/s/<slug>` hos
 * oss. Allt som bygger en intern länk går genom den här, så de två aldrig
 * blandas ihop.
 */
export function siteRootOf(site: PublishedSite): string {
  return viaOwnDomain(site.key) ? '' : `/s/${site.slug}`
}

/** En intern sökväg på sajten. */
export function sitePathOf(site: PublishedSite, path = ''): string {
  return siteRootOf(site) + path || '/'
}

/** Samma, absolut — för kanoniska adresser, sitemap och strukturerad data. */
export function siteAbsUrlOf(site: PublishedSite, path = ''): string {
  return `${siteOrigin(site.key)}${sitePathOf(site, path)}`
}

/**
 * /s/<slug> är en tillfällig adress. Har salongen kopplat sin egen domän ska
 * varje begäran hit sluta där i stället — 301, så att både besökare och det
 * Google redan hunnit lära sig följer med.
 *
 * Låg tidigare i layouten, som läste sökvägen ur en request-header. Just det
 * anropet gjorde varenda kundsida omöjlig att cacha. Sidan vet sin egen väg,
 * så den skickar in den och ingen behöver fråga.
 */
export function redirectToOwnDomain(site: PublishedSite | null, slug: string, path = '') {
  if (!site?.ownDomain) return
  if (viaOwnDomain(slug)) return   // redan framme
  permanentRedirect(`https://${site.ownDomain}${path || '/'}`)
}

/**
 * Rensa cachen för en salong. Anropas när kunden sparar i panelen.
 *
 * Ett anrop räcker för alla deras adresser: /s/<slug>, /s/<domän> och varje
 * undersida bär samma etikett.
 */
export function clearSiteCache(companyId: string) {
  /* expire: 0, inte "max". Skillnaden syns för kunden: "max" serverar den
     gamla sidan medan den nya hämtas i bakgrunden, så den som sparar och
     direkt öppnar sin sajt ser sin gamla text och tror att det inte funkade.
     Här ska nästa besökare vänta in det nya i stället. */
  revalidateTag(`site:${companyId}`, { expire: 0 })
}

/**
 * Rensa en adress. Behövs när en domän kopplas eller kopplas bort.
 *
 * Utan den ligger ett cachat "den här adressen finns inte" kvar, och sajten
 * är död på sin nya domän tills dygnsskyddet löper ut.
 */
export function clearSiteAddress(key: string) {
  revalidateTag(`site-key:${key.toLowerCase()}`, { expire: 0 })
}

/**
 * Rensa varje adress salongen någonsin nåtts på.
 *
 * `clearSiteCache` räcker för innehåll: alla sidor bär företagets etikett. Men
 * frågan "vilket företag hör den här adressen till" är cachad per adress, och
 * det är den som ändrar svar när ett konto sägs upp. Då måste varje adress
 * rensas var för sig — nuvarande, gamla och alla kopplade domäner.
 *
 * Missas en av dem svarar just den adressen kvar med sajten i upp till ett
 * dygn, vilket är precis det uppsägningen ska stoppa.
 */
export async function clearSiteEverywhere(companyId: string) {
  clearSiteCache(companyId)
  const admin = createAdminClient()

  const { data: co } = await admin
    .from('companies').select('slug').eq('id', companyId).maybeSingle()
  if (co?.slug) clearSiteAddress(co.slug)

  try {
    const { data } = await admin
      .from('companies').select('old_slugs').eq('id', companyId).maybeSingle()
    for (const s of (data?.old_slugs ?? []) as string[]) clearSiteAddress(s)
  } catch { /* old_slugs inte migrerad */ }

  try {
    const { data } = await admin
      .from('custom_domains').select('domain').eq('company_id', companyId)
    for (const d of data ?? []) clearSiteAddress(d.domain)
  } catch { /* custom_domains inte migrerad */ }
}

type Träff = { id: string; matchedBy: 'slug' | 'domain' }

async function resolveCompany(key: string): Promise<Träff | null> {
  const admin = createAdminClient()

  /* The segment carries either the address we gave the salon or the domain
     they bought. A dot tells them apart: our slugs never contain one. */
  const looksLikeDomain = key.includes('.')
  let matchedBy: 'slug' | 'domain' = 'slug'

  let company: { id: string; name: string | null; industry: string | null; slug: string } | null = null

  if (looksLikeDomain) {
    try {
      const { data: row } = await admin
        .from('custom_domains')
        .select('company_id, verified_at')
        .eq('domain', key.toLowerCase())
        .maybeSingle()
      /* An unverified domain is not served. Anyone can point DNS at us; only a
         checked record proves the salon owns the name. */
      if (row?.verified_at) {
        const { data: byDomain } = await admin
          .from('companies')
          .select('id, name, industry, slug')
          .eq('id', row.company_id)
          .maybeSingle()
        if (byDomain) { company = byDomain; matchedBy = 'domain' }
      }
    } catch { /* custom_domains not migrated yet — own domains simply 404 */ }
  }

  if (!company) {
    const { data: bySlug } = await admin
      .from('companies')
      .select('id, name, industry, slug')
      .eq('slug', key)
      .maybeSingle()
    company = bySlug
  }

  /* A renamed site answers on its old addresses too — the page compares the
   * requested slug against site.slug and 308-redirects to the current one,
   * so links Google indexed before the rename keep their value. */
  if (!company) {
    try {
      const { data: renamed } = await admin
        .from('companies')
        .select('id, name, industry, slug')
        .contains('old_slugs', [key])
        .limit(1)
        .maybeSingle()
      company = renamed
    } catch { /* old_slugs not migrated yet — old addresses 404 until then */ }
  }

  if (!company) return null

  /*
   * Uppsagt avtal: sajten finns inte längre, på någon adress.
   *
   * Grinden sitter här och inte i sidorna, för här går alla vägar in — vår
   * adress, salongens domän och deras gamla adresser. En sida som slutar
   * hittas 404:ar av sig själv, och omdirigeringen till den egna domänen
   * upphör i samma stund. Det senare är hela poängen: en permanent
   * omdirigering till en domän vi inte äger ska inte överleva relationen.
   * Går domänen ut och köps av någon annan skickar vi annars besökare dit i
   * åratal, utan att veta vad som ligger där.
   *
   * Läses för sig och tillåts misslyckas, som de andra kolumnerna som kommit
   * till efterhand. Saknas fältet är kontot aktivt — en sajt får aldrig slockna
   * för att en migration inte hunnit köras.
   */
  if (await isClosed(admin, company.id)) return null

  return { id: company.id, matchedBy }
}

async function loadSite(companyId: string): Promise<Omit<PublishedSite, 'matchedBy' | 'key'> | null> {
  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id, name, industry, slug')
    .eq('id', companyId)
    .maybeSingle()
  if (!company) return null

  /* Read on its own, and allowed to fail. A published customer site must not
   * 404 because a migration has not run yet — the same reason the old_slugs
   * lookup above is wrapped. Without the column the answer is simply null and
   * the markup falls back to the sector parent. */
  let care: 'wellness' | 'care' | null = null
  try {
    const { data: row } = await admin
      .from('companies')
      .select('schema_care')
      .eq('id', company.id)
      .maybeSingle()
    care = (row?.schema_care as 'wellness' | 'care' | null) ?? null
  } catch { /* schema_care not migrated yet */ }

  const { data: config } = await admin
    .from('site_config')
    .select('template, content')
    .eq('company_id', company.id)
    .single()

  // A company without a site setup has nothing published
  if (!config?.template) return null

  const industry = company.industry ?? 'other'

  /* resolveTemplate also answers for retired ids, so a site built on a
   * design we have since merged away keeps the design it was built with. */
  let template: Template = resolveTemplate(config.template) ?? getTemplatesForIndustry(industry)[0]

  // Saved content wins field by field; defaults fill anything never edited.
  // A site that has never been given a team or articles gets the examples, so
  // no page is thin the day it goes live — see lib/exampleContent.
  const defaults = CONTENT[baseIndustry(industry)] ?? CONTENT.other
  const content: SiteContent = withExamples({
    ...defaults,
    businessName: company.name ?? defaults.businessName,
    ...((config.content as Partial<SiteContent>) ?? {}),
  }, industry)

  // The customer's colors baked into the template here, once — every page
  // that renders from this (articles, service pages) gets them for free
  if (content.colorOverrides && Object.keys(content.colorOverrides).length) {
    template = { ...template, colors: { ...template.colors, ...content.colorOverrides } }
  }

  /* Every booking button on every template resolves through bookingUrl. A
   * customer who pasted an external link (Bokadirekt and the like) keeps it;
   * everyone else gets Kiterank's own booking page — so no published site
   * ever ships a booking button that goes nowhere. */
  if (!content.bookingUrl?.trim()) {
    content.bookingUrl = `/book/${company.slug}`
  }

  /* The verified own domain, when one exists. Only verified rows count — an
   * unverified one must never trigger the redirect, or anyone could point a
   * domain at us and hijack a salon's traffic. Allowed to fail like every
   * other pending-migration read. */
  let ownDomain: string | null = null
  try {
    const { data: doms } = await admin
      .from('custom_domains')
      .select('domain, is_primary')
      .eq('company_id', company.id)
      .not('verified_at', 'is', null)
    if (doms?.length) {
      ownDomain = (doms.find(d => d.is_primary) ?? doms[0]).domain
    }
  } catch { /* custom_domains not migrated yet */ }

  /* Mät-id:t för salongens egen GA4-property. Läses här och inte i layouten,
     så det följer med samma cachade uppslag som allt annat — och rensas av
     samma etikett den dag kopplingen ändras. Allowed to fail, som varje annan
     läsning av en kolumn som kan sakna migrering. */
  let mätId: string | null = null
  try {
    const { data: conn } = await admin
      .from('google_connections')
      .select('ga4_measurement_id')
      .eq('company_id', company.id)
      .maybeSingle()
    mätId = (conn?.ga4_measurement_id as string | null) ?? null
  } catch { /* ga4_measurement_id not migrated yet */ }

  return { slug: company.slug, industry, template, content, care, ownDomain, mätId }
}

/* ── Service pages ──────────────────────────────────────────────────────────
   One page per service is the advice the Synlighet tab gives ("create a page
   for balayage stockholm") made real. The slug is derived from the service
   name, so the URL itself carries the keyword. */

export { slugifyService }

/** True when the customer keeps their price list on the booking page — the
 *  internal price pages then step aside so two versions never compete. */
export function pricelistIsExternal(site: PublishedSite): boolean {
  return site.content.pricelistMode === 'booking' && !!site.content.bookingUrl?.trim()
}

/** Does this section have an own page? The choice sits on each section's
 *  panel — off means the section lives only on the start page, and the
 *  dedicated URL, menu button and sitemap entry all disappear together. */
export function sectionHasPage(site: PublishedSite, id: SectionPageId): boolean {
  return sectionPageEnabled(site.content, id)
}

/** The page's name — the customer's if they set one, the section's otherwise. */
export function sectionPageName(site: PublishedSite, id: SectionPageId): string {
  return sectionPageTitle(site.content, id)
}

/** What sits below the section on its own page — the customer's own words, or
 *  the filled-in starting point until they write their own. */
export function sectionPageExtra(site: PublishedSite, id: SectionPageId) {
  return sectionPageBlocks(site.content, id, site.industry)
}

export type ServiceOnSite = {
  slug:      string
  name:      string
  desc:      string
  price:     string
  duration?: string
  category:  string
}

/** Every service on a published site, flattened from its menu categories. */
export function servicesOf(site: PublishedSite): ServiceOnSite[] {
  // Same fallback order as the visible services page: the customer's edited
  // menu first, the industry defaults until they have touched it
  const cats = site.content.menuCategories?.length
    ? site.content.menuCategories
    : SERVICES[baseIndustry(site.industry)] ?? SERVICES.other ?? []
  const seen = new Set<string>()
  const out: ServiceOnSite[] = []
  for (const cat of cats) {
    for (const item of cat.items) {
      const slug = slugifyService(item.name)
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      out.push({
        slug,
        name:     item.name,
        desc:     item.desc,
        price:    item.price,
        duration: item.duration,
        category: cat.category,
      })
    }
  }
  return out
}

/* ── Articles ───────────────────────────────────────────────────────────────
   Written in the editor, published one at a time. Each becomes its own page,
   which is what makes them the site's ongoing route into search — a price
   list is finished the day it is written, an article never is. */

export { publishedArticles, articleSummary, articleImages, formatArticleDate }
export type { Article }

/** The articles a visitor can actually reach on this site, newest first. */
export function articlesOf(site: PublishedSite): Article[] {
  return publishedArticles(site.content.articles)
}

/** Every published site — feeds the sitemap. */
export async function getPublishedSlugs(): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('site_config')
    .select('template, companies!inner(slug)')
    .not('template', 'is', null)

  type Row = { companies: { slug: string | null } | { slug: string | null }[] }
  return (data as Row[] | null ?? [])
    .flatMap(r => Array.isArray(r.companies) ? r.companies : [r.companies])
    .map(c => c.slug)
    .filter((s): s is string => !!s)
}
