import type { MetadataRoute } from 'next'
import { requestHost, requestOrigin, isOwnHost } from '@/lib/siteHost'

/*
 * What crawlers may touch — and the answer differs by who is asking.
 *
 * On our own address the private half of the product is closed off: the
 * dashboard, the API and above all the template previews, since every customer
 * site is built from the same demos and an indexed preview would compete with
 * the real ones as duplicate content.
 *
 * On a salon's own domain none of those paths exist. Listing them there would
 * publish the shape of our product on their site and point crawlers at
 * addresses that answer nothing, so their file says the simple truth: crawl
 * everything, and here is the sitemap for this domain.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await requestOrigin()
  const host   = await requestHost()

  if (host && !isOwnHost(host)) {
    return {
      rules:   { userAgent: '*', allow: '/' },
      sitemap: `${origin}/sitemap.xml`,
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/preview/', '/site-editor/', '/onboarding/', '/hub/', '/auth/'],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}
