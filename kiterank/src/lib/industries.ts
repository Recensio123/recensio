/*
 * Trade → wording set.
 *
 * The salon trades we sell to are finer-grained than the built-in sets of
 * headings and example copy: a nail studio and a lash studio both read as
 * "beauty" there, a barbershop as a salon. A trade's own vocabulary comes from
 * its content pack (lib/trades); this only decides which built-in set it
 * borrows for the headings and demo text the renderer ships with.
 *
 * It lives here rather than beside the renderer because both the server (the
 * published page, the editor's page component) and the client (the renderer
 * itself) need it, and a 'use client' module cannot hand a function to the
 * server.
 */

const ALIAS: Record<string, string> = {
  barber: 'salon',
  nails:  'beauty',
  lashes: 'beauty',
}

/** The wording set a stored industry borrows. Unknown values pass through. */
export function baseIndustry(industry?: string | null): string {
  const key = industry ?? 'other'
  return ALIAS[key] ?? key
}
