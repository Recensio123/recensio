/*
 * The salon's own profiles, as they appear on the website.
 *
 * This is the link list, not the statistics connection — nothing here talks to
 * any platform. A customer pastes an address, and every place on the site that
 * shows profiles reads the same list from here: the footer, the mobile menu,
 * the gallery, the contact page and the sameAs field in the structured data.
 *
 * Whatever they paste is turned into a working address before it is rendered.
 * A field filled in as "@salongen" or "instagram.com/salongen" would otherwise
 * become a relative link and take the visitor to a page on the salon's own site
 * that does not exist — a small mistake with a dead end at the end of it.
 */

export type SocialKey = 'instagram' | 'facebook' | 'tiktok' | 'pinterest' | 'youtube'

export type SocialLinks = Partial<Record<SocialKey, string>>

export const SOCIAL_FIELDS: {
  key:         SocialKey
  name:        string
  placeholder: string
  /** The host a bare handle is attached to. */
  base:        string
  /** True where the handle carries an @ in the address itself. */
  at?:         boolean
}[] = [
  { key: 'instagram', name: 'Instagram', placeholder: 'instagram.com/dinsalong',  base: 'https://instagram.com/' },
  { key: 'facebook',  name: 'Facebook',  placeholder: 'facebook.com/dinsalong',   base: 'https://facebook.com/'  },
  { key: 'tiktok',    name: 'TikTok',    placeholder: 'tiktok.com/@dinsalong',    base: 'https://tiktok.com/',   at: true },
  { key: 'pinterest', name: 'Pinterest', placeholder: 'pinterest.com/dinsalong',  base: 'https://pinterest.com/' },
  { key: 'youtube',   name: 'YouTube',   placeholder: 'youtube.com/@dinsalong',   base: 'https://youtube.com/',  at: true },
]

/** A pasted address, a bare handle or a host without a scheme → a real URL. */
export function socialHref(key: SocialKey, raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v

  const spec = SOCIAL_FIELDS.find(f => f.key === key)
  if (!spec) return v

  // "instagram.com/x", "www.instagram.com/x", bare "instagram.com" — a host,
  // just missing the scheme.
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v)) return `https://${v.replace(/^www\./i, '')}`

  // Anything else is treated as the handle itself.
  const handle = v.replace(/^@/, '')
  return `${spec.base}${spec.at ? '@' : ''}${handle}`
}

/** The profiles that are actually filled in, in a fixed order. */
export function socialLinks(social?: SocialLinks): { key: SocialKey; name: string; href: string }[] {
  return SOCIAL_FIELDS
    .map(f => ({ key: f.key, name: f.name, href: socialHref(f.key, social?.[f.key] ?? '') }))
    .filter(l => !!l.href)
}
