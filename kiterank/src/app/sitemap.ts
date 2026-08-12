import type { MetadataRoute } from 'next'
import { getPublishedSite, getPublishedSlugs, servicesOf, articlesOf, pricelistIsExternal, sectionHasPage } from './s/[slug]/site-data'

/*
 * The sitemap is what gets submitted to Search Console during onboarding, so
 * it has to carry every published customer site — the marketing pages matter
 * for Kiterank itself, but the customer pages are the ones whose indexing we
 * are accountable for.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiterank.se'

  const marketing: MetadataRoute.Sitemap = [
    { url: `${base}/`,         changeFrequency: 'weekly',  priority: 1 },
    { url: `${base}/features`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/pricing`,  changeFrequency: 'monthly', priority: 0.7 },
  ]

  const slugs = await getPublishedSlugs()
  const sites: MetadataRoute.Sitemap = []
  for (const slug of slugs) {
    sites.push({ url: `${base}/s/${slug}`, changeFrequency: 'weekly', priority: 0.9 })
    const site = await getPublishedSite(slug)
    if (site) {
      // The section pages exist only where the customer chose an own page
      if (sectionHasPage(site, 'about')) {
        sites.push({ url: `${base}/s/${slug}/om-oss`, changeFrequency: 'monthly', priority: 0.6 })
      }
      sites.push({ url: `${base}/s/${slug}/kontakt`, changeFrequency: 'monthly', priority: 0.6 })
      // The price pages exist only when the price list lives on the site — a
      // customer pointing at their booking page has no internal versions.
      if (!pricelistIsExternal(site) && sectionHasPage(site, 'pricelist')) {
        sites.push({ url: `${base}/s/${slug}/tjanster`, changeFrequency: 'weekly', priority: 0.8 })
        // The keyword pages — one per service on the menu
        for (const service of servicesOf(site)) {
          sites.push({
            url: `${base}/s/${slug}/tjanster/${service.slug}`,
            changeFrequency: 'monthly',
            priority: 0.7,
          })
        }
      }
      // Articles — the pages that keep being added, so they matter most for
      // recrawling. Only listed once the customer has published something.
      const articles = articlesOf(site)
      if (articles.length) {
        // The list page only when the customer keeps articles as an own page —
        // each published article keeps its address either way.
        if (sectionHasPage(site, 'blog')) {
          sites.push({ url: `${base}/s/${slug}/artiklar`, changeFrequency: 'weekly', priority: 0.7 })
        }
        for (const article of articles) {
          sites.push({
            url: `${base}/s/${slug}/artiklar/${article.slug}`,
            changeFrequency: 'monthly',
            priority: 0.6,
            ...(article.date ? { lastModified: new Date(article.date) } : {}),
          })
        }
      }
    }
  }

  return [...marketing, ...sites]
}
