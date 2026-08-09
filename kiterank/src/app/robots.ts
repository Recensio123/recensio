import type { MetadataRoute } from 'next'

/*
 * What crawlers may touch. The dashboard and API are private, and the
 * template previews must stay out of the index — every customer site is
 * built from the same demos, so an indexed preview would compete with the
 * real sites as duplicate content.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiterank.se'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/preview/', '/site-editor/', '/onboarding/', '/hub/', '/auth/'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
