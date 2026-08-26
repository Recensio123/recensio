import { headers } from 'next/headers'

/*
 * Which address a page is being served on, and which address it should call
 * its own.
 *
 * A customer site answers on two kinds of address: ours, at
 * kiterank.se/s/<slug>, and their own, at salongen.se. The same page renders
 * both. What must not be the same is what it tells Google: a page served on
 * the salon's domain that names kiterank.se as the canonical is telling search
 * engines that the real page is ours — which would hand the salon's own
 * visibility to us. So every absolute address a page emits is built from the
 * request it is answering, not from a fixed setting.
 */

/*
 * Our own addresses. Everything else that reaches us is a customer domain.
 *
 * The loopback addresses are here for a reason that costs an afternoon to
 * rediscover: with only `localhost` listed, opening the dev server on
 * 127.0.0.1 makes the middleware treat the IP as a salon's own domain and
 * rewrite every page to /s/127.0.0.1/…, which answers 404 for the whole site.
 * The page looks broken; nothing is. Some tools reach the dev server on the IP
 * rather than the name, and they should get the same site.
 */
const OWN_HOSTS = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
    'kiterank.se',
    'www.kiterank.se',
    'localhost',
    '127.0.0.1',
    '[::1]',
    '0.0.0.0',
  ].filter(Boolean) as string[],
)

/** True when this host is ours rather than a salon's own domain. */
export function isOwnHost(host: string): boolean {
  const bare = host.split(':')[0].toLowerCase()
  // Preview deployments and the dev server are ours by definition.
  if (OWN_HOSTS.has(bare) || bare.endsWith('.vercel.app')) return true
  return false
}

/** The origin of the request being answered, protocol included. */
export async function requestOrigin(): Promise<string> {
  const h     = await headers()
  const host  = h.get('x-forwarded-host') ?? h.get('host') ?? ''
  /* Bara utvecklingsmaskinen svarar över http. Förhandsdriftsättningar på
     vercel.app är också våra men körs över https, så listan ovan duger inte
     som villkor här. */
  const bare  = host.split(':')[0].toLowerCase()
  const lokal = bare === 'localhost' || bare === '127.0.0.1' || bare === '[::1]' || bare === '0.0.0.0'
  const proto = h.get('x-forwarded-proto') ?? (lokal ? 'http' : 'https')
  if (!host) return process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiterank.se'
  return `${proto}://${host}`
}

/** The host the request arrived on, without port. */
export async function requestHost(): Promise<string> {
  const h = await headers()
  return (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(':')[0].toLowerCase()
}

/**
 * Kom begäran in på salongens egen domän?
 *
 * Proxyn skriver om salongen.se/tjanster till /s/salongen.se/tjanster, så
 * segmentet bär redan svaret: våra slugar innehåller aldrig en punkt, ett
 * domännamn gör det alltid.
 *
 * Frågan ställdes tidigare till request-headern. Det fungerade, men ett anrop
 * till headers() gör sidan dynamisk — den måste renderas om vid varje besök
 * och kan aldrig cachas. Samma svar finns i adressen vi redan fått, och det
 * kostar ingenting.
 */
export function viaOwnDomain(slug: string): boolean {
  return slug.includes('.')
}

/** Sajtens ursprung sett från adressen den serveras på. */
export function siteOrigin(slug: string): string {
  return viaOwnDomain(slug)
    ? `https://${slug}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiterank.se').replace(/\/$/, '')
}

/**
 * Where a customer page lives, seen from the address it is being served on.
 *
 * On the salon's own domain the site is the root, so its pages are `/kontakt`
 * and `/tjanster`. On ours they sit under `/s/<slug>`. Everything that builds
 * a link or a canonical goes through here so the two never get mixed.
 */
export async function sitePath(slug: string, path = ''): Promise<string> {
  return viaOwnDomain(slug) ? (path || '/') : `/s/${slug}${path}`
}

/** The same, absolute — for canonicals, sitemaps and structured data. */
export async function siteAbsUrl(slug: string, path = ''): Promise<string> {
  return `${siteOrigin(slug)}${await sitePath(slug, path)}`
}
