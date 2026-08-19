import type { MetadataRoute } from 'next'
import { getPublishedSite, servicesOf, articlesOf, pricelistIsExternal, sectionHasPage } from './s/[slug]/site-data'
import { requestHost, requestOrigin, isOwnHost } from '@/lib/siteHost'

/*
 * One sitemap per address.
 *
 * On kiterank.se it lists the marketing pages and every published customer
 * site under /s/<slug> — that is the file submitted to Search Console during
 * onboarding, and the customer pages are the ones whose indexing we are
 * accountable for.
 *
 * On a salon's own domain it lists that salon's pages and nothing else, at
 * their addresses. A sitemap listing other people's sites on their domain
 * would be nonsense to a crawler, and one listing their pages at our addresses
 * would point Google away from the site it is standing on.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await requestOrigin()
  const host   = await requestHost()

  /* On their own domain the site is the root, so every path is written from
     there. On ours the same pages sit under /s/<slug>. */
  const ownDomain = !!host && !isOwnHost(host)

  const pagesFor = async (slug: string, at: (path?: string) => string): Promise<MetadataRoute.Sitemap> => {
    const out: MetadataRoute.Sitemap = [{ url: at(), changeFrequency: 'weekly', priority: 0.9 }]
    const site = await getPublishedSite(slug)
    if (!site) return out

    // The section pages exist only where the customer chose an own page
    if (sectionHasPage(site, 'about')) {
      out.push({ url: at('/om-oss'), changeFrequency: 'monthly', priority: 0.6 })
    }
    out.push({ url: at('/kontakt'), changeFrequency: 'monthly', priority: 0.6 })

    // The price pages exist only when the price list lives on the site — a
    // customer pointing at their booking page has no internal versions.
    if (!pricelistIsExternal(site) && sectionHasPage(site, 'pricelist')) {
      out.push({ url: at('/tjanster'), changeFrequency: 'weekly', priority: 0.8 })
      for (const service of servicesOf(site)) {
        out.push({ url: at(`/tjanster/${service.slug}`), changeFrequency: 'monthly', priority: 0.7 })
      }
    }

    // Articles — the pages that keep being added, so they matter most for
    // recrawling. Only listed once the customer has published something.
    const articles = articlesOf(site)
    if (articles.length) {
      if (sectionHasPage(site, 'blog')) {
        out.push({ url: at('/artiklar'), changeFrequency: 'weekly', priority: 0.7 })
      }
      for (const article of articles) {
        out.push({
          url: at(`/artiklar/${article.slug}`),
          changeFrequency: 'monthly',
          priority: 0.6,
          ...(article.date ? { lastModified: new Date(article.date) } : {}),
        })
      }
    }
    return out
  }

  if (ownDomain) {
    /* The host is the segment the middleware rewrites to, so the same lookup
       that serves the pages resolves the sitemap. */
    const site = await getPublishedSite(host)
    if (!site) return []
    return pagesFor(site.slug, (path = '') => `${origin}${path || '/'}`)
  }

  /* Our own sitemap carries only our own pages. The customer sites under /s/
     are temporary addresses — noindexed until a domain is connected, and
     301-redirecting once one is — so listing them here would be inviting
     Google to pages we are simultaneously telling it to ignore. Each salon's
     sitemap lives on their domain, where their pages actually are. */
  return [
    { url: `${origin}/`,         changeFrequency: 'weekly',  priority: 1 },
    { url: `${origin}/features`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${origin}/pricing`,  changeFrequency: 'monthly', priority: 0.7 },
  ]
}
