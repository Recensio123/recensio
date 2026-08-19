/*
 * The map on the contact page.
 *
 * There is nothing to set up: the salon writes its address in the editor, and
 * the map follows. Google's Embed API takes a plain address string and finds
 * the place itself, so no coordinates are stored and nothing has to be kept in
 * step when the salon moves.
 *
 * The embed needs an API key of ours — a Maps key, not the OAuth connection
 * the Google profile uses. Until one is in the server environment there is no
 * map, and the page falls back to the address plus the "Hitta hit" link, which
 * has always worked without a key. A missing key must never show a broken grey
 * frame on a customer's published site.
 */

/** The address as one line, with the salon's name so the pin lands on them
 *  rather than on the building. */
export function mapQuery(businessName: string, address: string): string {
  return [businessName.trim(), address.trim()].filter(Boolean).join(', ')
}

/** The embed URL, or null when we have no key or no address to look up. */
export function mapEmbedUrl(businessName: string, address?: string): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
  const q   = address?.trim() ? mapQuery(businessName, address) : ''
  if (!key || !q) return null
  return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(q)}&zoom=15&language=sv&region=SE`
}

/** Where "Hitta hit" leads — no key needed, so this works everywhere. */
export function mapLinkUrl(businessName: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery(businessName, address))}`
}
