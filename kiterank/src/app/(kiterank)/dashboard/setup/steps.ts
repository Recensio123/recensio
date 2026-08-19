/**
 * What the customer already has when they sign up. One decision drives the
 * whole setup flow: keep the website they have, or let us build one.
 *
 * It matters because Google does not backfill. A site that has existed for
 * years still carries no history unless someone set measurement up on it, so
 * the two paths differ in what we can measure and who has to do the work.
 *
 * Collected on the first step of the flow; stored per company once the
 * backend catches up.
 */
export type SetupProfile = {
  hasWebsite:   boolean
  /** True when we are building the site — whether or not one already exists. */
  wantsNewSite: boolean
  hasProfile:   boolean | null   // settled on the Google profile step, not up front
  hasAds:       boolean
}

export const BLANK_PROFILE: SetupProfile = {
  hasWebsite: false, wantsNewSite: false, hasProfile: null, hasAds: false,
}

/** Whether the site we will be measuring is one we build ourselves. */
export function siteIsOurs(p: SetupProfile): boolean {
  return !p.hasWebsite || p.wantsNewSite
}

export const SETUP_DONE_KEY    = 'kiterank_setup_done'
export const SETUP_PROFILE_KEY = 'kiterank_setup_profile'
