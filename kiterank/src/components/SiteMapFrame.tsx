import { mapEmbedUrl } from '@/lib/siteMap'

/*
 * Where the salon is, shown rather than linked.
 *
 * A "Hitta hit"-link hands the visitor to Google and they carry on browsing
 * there; a map in the page answers the same question without anyone leaving.
 * So this sits on the pages a visitor actually reads — the story about the
 * salon, and the contact page — and the link stays as the way to get a route
 * once they have decided to come.
 *
 * Renders nothing at all without an address or without our Maps key. A grey
 * broken frame on a customer's published site is worse than no map.
 */
export function SiteMapFrame({ businessName, address, borderColor, height = 320 }: {
  businessName: string
  address?:     string
  borderColor:  string
  height?:      number
}) {
  const src = mapEmbedUrl(businessName, address)
  if (!src) return null

  return (
    <div style={{ marginTop: 32, marginBottom: 32, borderRadius: 12, overflow: 'hidden', border: `1px solid ${borderColor}` }}>
      <iframe
        src={src}
        title={`Karta till ${businessName}`}
        /* The heaviest thing on the page, and never the reason someone opened
           it — the phone number above loads first. */
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        style={{ display: 'block', width: '100%', height, border: 0 }}
      />
    </div>
  )
}
