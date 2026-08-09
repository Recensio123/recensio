import { NextRequest, NextResponse } from 'next/server'

export interface HealthCheckResult {
  url:                    string
  isHttps:                boolean
  title:                  string | null
  titleLen:               number
  description:            string | null
  descLen:                number
  h1Count:                number
  h1Text:                 string | null
  hasViewport:            boolean
  canonical:              string | null
  hasPhoneLink:           boolean
  phoneNumber:            string | null
  imgTotal:               number
  imgNoAlt:               number
  hasLocalBusinessSchema: boolean
  schemaTypes:            string[]
  hasOgTitle:             boolean
  hasOgDesc:              boolean
}

function analyzeHtml(html: string, url: string): HealthCheckResult {
  const isHttps = url.startsWith('https://')

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title      = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : null

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)[^>]+name=["']description["']/i)
  const description = descMatch ? descMatch[1].trim() : null

  const h1Matches  = [...html.matchAll(/<h1[^>]*>/gi)]
  const h1Count    = h1Matches.length
  const h1TextMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const h1Text     = h1TextMatch ? h1TextMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 80) : null

  const hasViewport  = /<meta[^>]+name=["']viewport["']/i.test(html)

  const canonicalMatch =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)/i) ??
    html.match(/<link[^>]+href=["']([^"']*)[^>]+rel=["']canonical["']/i)
  const canonical = canonicalMatch ? canonicalMatch[1] : null

  const phoneLinks   = [...html.matchAll(/href=["']tel:([^"'\s]+)/gi)]
  const hasPhoneLink = phoneLinks.length > 0
  const phoneNumber  = phoneLinks[0]?.[1] ?? null

  const allImages    = [...html.matchAll(/<img[^>]+>/gi)]
  const imgTotal     = allImages.length
  const imgNoAlt     = allImages.filter(m => !/\balt=["'][^"']+["']/i.test(m[0])).length

  const jsonLdScripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  let hasLocalBusinessSchema = false
  const schemaTypes: string[] = []
  const LOCAL_TYPES = new Set([
    'LocalBusiness', 'Plumber', 'Electrician', 'HomeAndConstructionBusiness',
    'ProfessionalService', 'GeneralContractor', 'CleaningService', 'Locksmith',
    'Painter', 'Roofer', 'Landscaper', 'HVACBusiness', 'Dentist', 'MedicalBusiness',
    'AutoRepair', 'AutomotiveBusiness', 'Store', 'Restaurant', 'FoodEstablishment',
  ])
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script[1])
      const entries = Array.isArray(data) ? data : [data]
      for (const entry of entries) {
        const types: string[] = Array.isArray(entry['@type']) ? entry['@type'] : [entry['@type']].filter(Boolean)
        schemaTypes.push(...types)
        if (types.some(t => LOCAL_TYPES.has(t))) hasLocalBusinessSchema = true
      }
    } catch { /* malformed JSON-LD — skip */ }
  }

  const hasOgTitle = /<meta[^>]+property=["']og:title["']/i.test(html)
  const hasOgDesc  = /<meta[^>]+property=["']og:description["']/i.test(html)

  return {
    url, isHttps,
    title, titleLen: title?.length ?? 0,
    description, descLen: description?.length ?? 0,
    h1Count, h1Text,
    hasViewport, canonical,
    hasPhoneLink, phoneNumber,
    imgTotal, imgNoAlt,
    hasLocalBusinessSchema, schemaTypes,
    hasOgTitle, hasOgDesc,
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const raw  = typeof body?.url === 'string' ? body.url.trim() : ''

  if (!raw) return NextResponse.json({ error: 'URL is required.' }, { status: 400 })

  let targetUrl = raw
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl

  // Block non-public URLs
  try {
    const parsed = new URL(targetUrl)
    const host = parsed.hostname
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
      return NextResponse.json({ error: 'Only public URLs can be checked.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
  }

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KiterankBot/1.0; +https://kiterank.com)' },
      signal:  AbortSignal.timeout(12000),
      redirect: 'follow',
    })
    const html     = await res.text()
    const finalUrl = res.url
    return NextResponse.json(analyzeHtml(html, finalUrl))
  } catch (err: unknown) {
    const msg = err instanceof Error && err.name === 'TimeoutError'
      ? 'The page took too long to respond. Try again.'
      : 'Could not reach that URL. Check the address and try again.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
