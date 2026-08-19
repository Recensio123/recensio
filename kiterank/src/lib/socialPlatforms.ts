/*
 * The places a salon's work gets found, and the exact figures each one hands
 * over once it is connected.
 *
 * `gives` is a plain list of what the platform's own API returns — not a pitch.
 * Nothing is listed there that we cannot actually fetch.
 *
 * Every entry names the environment variable that has to hold our app
 * credentials before the platform can be connected at all. Until it is set the
 * card says the connection is not switched on yet, rather than offering a
 * button that leads nowhere — the same rule the ad extensions now follow.
 *
 * Facebook is absent by choice: a salon's page is an address sign rather than a
 * channel. 'facebook' stays in the type and in the database check constraint so
 * it can be added back without a migration.
 *
 * Snapchat is absent for a different reason. Its open APIs cover advertising
 * and sharing only; there is no way to read a business account's own post
 * statistics, so a card for it could never show anything.
 */

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'pinterest'

export type PlatformSpec = {
  id:      SocialPlatform
  label:   string
  /** The server variable that must hold our app id for this platform. */
  envKey:  string
  /** What the salon has to have before connecting can work at all. */
  requires: { sv: string; en: string }
  /** The figures the connection delivers, in their language. */
  gives:    { sv: string; en: string }
}

export const SOCIAL_PLATFORMS: PlatformSpec[] = [
  {
    id:     'instagram',
    /* Connects on its own, with an Instagram login. No Facebook page has to
       exist and none has to be linked — which is why this has its own app
       credentials rather than sharing Facebook's. */
    label:  'Instagram',
    envKey: 'INSTAGRAM_CLIENT_ID',
    requires: {
      sv: 'Kräver ett företags- eller skaparkonto. Du loggar in med Instagram — ingen Facebook-sida behövs. Ett privatkonto går inte att hämta statistik från.',
      en: 'Needs a business or creator account. You log in with Instagram — no Facebook page required. Statistics cannot be read from a personal account.',
    },
    gives: {
      sv: 'Följare och hur många som tillkommit. Per inlägg och reel: räckvidd, gilla, kommentarer, sparningar och delningar. Dessutom besök på profilen och klick vidare till din hemsida.',
      en: 'Followers and how many were added. Per post and reel: reach, likes, comments, saves and shares. Plus profile visits and clicks through to your website.',
    },
  },
  {
    id:     'tiktok',
    label:  'TikTok',
    envKey: 'TIKTOK_CLIENT_KEY',
    requires: {
      sv: 'Kopplingen förnyas automatiskt, men måste göras om en gång per år.',
      en: 'The connection refreshes itself, but has to be renewed once a year.',
    },
    gives: {
      sv: 'Följare och totalt antal gilla på kontot. Per video: visningar, gilla, kommentarer och delningar.',
      en: 'Followers and total likes on the account. Per video: views, likes, comments and shares.',
    },
  },
  {
    id:     'pinterest',
    label:  'Pinterest',
    envKey: 'PINTEREST_CLIENT_ID',
    requires: {
      sv: 'Kräver ett företagskonto, vilket är gratis att byta till.',
      en: 'Needs a business account, which is free to switch to.',
    },
    gives: {
      sv: 'Följare. Per pin: visningar, sparningar och klick vidare till din hemsida.',
      en: 'Followers. Per pin: impressions, saves and clicks through to your website.',
    },
  },
]

/** Is our app registered with this platform yet? Read on the server only. */
export function platformConfigured(spec: PlatformSpec): boolean {
  return !!process.env[spec.envKey]
}
