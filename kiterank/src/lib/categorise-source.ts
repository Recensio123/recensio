/**
 * Maps a GA4 source + sessionDefaultChannelGroup to a display category.
 *
 * Strategy:
 *  1. Use GA4's own sessionDefaultChannelGroup as the primary classification.
 *     This is the most accurate signal — Google uses signals we can't replicate.
 *  2. For "Referral" traffic specifically, apply a domain lookup to give
 *     richer sub-categories (Review Site, Community, Directory).
 *  3. Fall back to "Referral" for any domain not in the lookup table.
 */

// How GA4's channel group names map to our display labels
const CHANNEL_DISPLAY: Record<string, string> = {
  'Organic Search':  'Organic Search',
  'Direct':          'Direct',
  'Organic Social':  'Social Media',
  'Paid Search':     'Paid Search',
  'Paid Social':     'Social Media',
  'Email':           'Email',
  'Display':         'Display Ads',
  'Affiliates':      'Affiliate',
  'Unassigned':      'Other',
  '(Other)':         'Other',
}

// Domain-based sub-classification for Referral traffic.
// Add new domains here as you encounter them in client data.
const REFERRAL_CATEGORIES: Record<string, string> = {
  // Review platforms
  'trustpilot.com':       'Review Site',
  'yelp.com':             'Review Site',
  'tripadvisor.com':      'Review Site',
  'google.com':           'Review Site',   // Google Maps / review links via referral medium
  'reviews.io':           'Review Site',
  'sitejabber.com':       'Review Site',
  // Communities & forums
  'reddit.com':           'Community',
  'quora.com':            'Community',
  'flashback.org':        'Community',
  'stackoverflow.com':    'Community',
  // Social (some social platforms appear under referral medium, not social)
  'facebook.com':         'Social Media',
  'instagram.com':        'Social Media',
  'linkedin.com':         'Social Media',
  'twitter.com':          'Social Media',
  'x.com':                'Social Media',
  'youtube.com':          'Social Media',
  'tiktok.com':           'Social Media',
  'pinterest.com':        'Social Media',
  // Swedish directories
  'hitta.se':             'Directory',
  'eniro.se':             'Directory',
  'gulasidorna.se':       'Directory',
  'ratsit.se':            'Directory',
  '118100.se':            'Directory',
  'foretagsfakta.se':     'Directory',
  'allabolag.se':         'Directory',
  'foretaget.se':         'Directory',
  // General directories
  'yell.com':             'Directory',
  'checkatrade.com':      'Directory',
  'bark.com':             'Directory',
  'rated.people.com':     'Directory',
}

/**
 * Returns a display category for a traffic source.
 *
 * @param source       - GA4 sessionSource dimension value (e.g. "google.com", "reddit.com")
 * @param channelGroup - GA4 sessionDefaultChannelGroup dimension value (e.g. "Organic Search", "Referral")
 */
export function categoriseSource(source: string, channelGroup: string): string {
  // For non-referral traffic, trust GA4's own classification entirely
  if (channelGroup !== 'Referral') {
    return CHANNEL_DISPLAY[channelGroup] ?? channelGroup
  }

  // For referral traffic, try domain-based sub-classification
  const domain = source.toLowerCase().replace(/^www\./, '')
  return REFERRAL_CATEGORIES[domain] ?? 'Referral'
}
