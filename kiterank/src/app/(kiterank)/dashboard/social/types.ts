import { type SocialPlatform } from '@/lib/socialPlatforms'

export type { SocialPlatform }

/* One account, and whether it can be connected at all. */
export type Connection = {
  platform:   SocialPlatform
  label:      string
  /** Our app is registered with the platform, so the button can do something. */
  configured: boolean
  connected:  boolean
  account?:   string | null
  syncedAt?:  string | null
  /* Both languages travel from the server, since the page is rendered there
     and the language toggle lives in the browser. */
  requires:   { sv: string; en: string }
  /** The figures this connection delivers, listed plainly. */
  gives:      { sv: string; en: string }
}

/* One post, as every platform reports it: what it is and what it got. */
export type SocialPost = {
  platform:  SocialPlatform
  /** ISO date, the day it was published. */
  date:      string
  text:      string
  /** Reel, video, pin, photo — the platform's own word, already translated. */
  kind:      string
  likes:     number
  comments:  number
  /** Instagram saves, TikTok shares, Pinterest saves — absent where unreported. */
  saves?:    number
}

/* The totals a platform answers with when asked about the account itself. */
export type SocialStats = {
  platform:     SocialPlatform
  followers?:   number
  posts30d?:    number
  likes30d?:    number
  comments30d?: number
}
