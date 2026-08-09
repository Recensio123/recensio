import { createAdminClient } from '@/lib/supabase/admin'
import { TEMPLATES_BY_INDUSTRY, type Template } from '@/app/onboarding/templates'
import { CONTENT, type SiteContent } from '@/app/preview/[templateId]/PreviewSite'
import { SERVICES, slugifyService } from '@/app/preview/[templateId]/tjanster/services-data'
import {
  publishedArticles, articleSummary, articleImages, formatArticleDate, type Article,
} from '@/lib/articles'

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
}

export async function getPublishedSite(slug: string): Promise<PublishedSite | null> {
  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id, name, industry, slug')
    .eq('slug', slug)
    .single()

  if (!company) return null

  const { data: config } = await admin
    .from('site_config')
    .select('template, content')
    .eq('company_id', company.id)
    .single()

  // A company without a site setup has nothing published
  if (!config?.template) return null

  const industry = company.industry ?? 'other'

  let template: Template | null = null
  for (const templates of Object.values(TEMPLATES_BY_INDUSTRY)) {
    const found = templates.find(t => t.id === config.template)
    if (found) { template = found; break }
  }
  if (!template) {
    template = (TEMPLATES_BY_INDUSTRY[industry] ?? TEMPLATES_BY_INDUSTRY.other)[0]
  }

  // Saved content wins field by field; defaults fill anything never edited
  const defaults = CONTENT[industry] ?? CONTENT.other
  const content: SiteContent = {
    ...defaults,
    businessName: company.name ?? defaults.businessName,
    ...((config.content as Partial<SiteContent>) ?? {}),
  }

  // The customer's colors baked into the template here, once — every page
  // that renders from this (articles, service pages) gets them for free
  if (content.colorOverrides && Object.keys(content.colorOverrides).length) {
    template = { ...template, colors: { ...template.colors, ...content.colorOverrides } }
  }

  return { slug: company.slug, industry, template, content }
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
    : SERVICES[site.industry] ?? SERVICES.other ?? []
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
