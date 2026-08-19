/*
 * Reading a domain the customer typed.
 *
 * Where the domain is pointed is no longer decided here: the salon hands over
 * its nameservers and we write the records ourselves, in the zone we hold, so
 * DOMAIN_TARGET_CNAME is read at the one place that writes them.
 */

/** Bare domain, lower case — the shape a Host header arrives in, which is what
 *  the lookup matches against. Anything else the customer pastes is trimmed
 *  down to it: protocols, paths, trailing dots, stray spaces. */
export function normaliseDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '')
}

/** A plausible hostname, and not one of ours. */
export function domainLooksValid(domain: string): boolean {
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return false
  if (domain.length > 253) return false
  // Ours are not theirs to claim.
  return !/(^|\.)kiterank\.se$/.test(domain) && !/(^|\.)vercel\.app$/.test(domain)
}
