import { SALON }  from './salon'
import { BARBER } from './barber'
import { BEAUTY } from './beauty'
import { NAILS }  from './nails'
import { LASHES } from './lashes'
import { SPA }    from './spa'
import type { TradePack } from './types'

export type { TradePack, TradeArticle } from './types'

/* Every salon trade Kiterank builds sites for, in the order they are offered.
   Adding one is adding a file and a line here — nothing downstream changes. */
export const TRADES: TradePack[] = [SALON, BARBER, BEAUTY, NAILS, LASHES, SPA]

const BY_ID = Object.fromEntries(TRADES.map(t => [t.id, t])) as Record<string, TradePack>

/** The pack for a trade id, falling back to the hair salon — the trade most
 *  customers come from, and the one whose wording reads least oddly if the
 *  stored id is something unexpected. */
export function tradePack(id?: string | null): TradePack {
  return BY_ID[id ?? ''] ?? SALON
}

/* ── Bokningsbara tjänster ────────────────────────────────────────────────
   The price list is already the real thing — every treatment with its time
   and its price. Rather than keep a second, hand-maintained list of bookable
   services that drifts from it, the booking calendar is seeded straight from
   the price list. Anything without a real duration (gift cards, add-ons
   priced per unit) is not a slot anyone books, so it is left out. */

export type BookingSeed = {
  name: string
  description: string
  duration_minutes: number
  price_sek: number
}

/** "90 min" → 90, "1 h 30 min" → 90, "—" and missing → null */
function minutes(raw = ''): number | null {
  const h = raw.match(/(\d+)\s*(?:h|tim)/i)
  const m = raw.match(/(\d+)\s*min/i)
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
  return total > 0 ? total : null
}

/** "1 350 kr" → 1350, "från 850 kr" → 850, "0 kr" → 0 */
function sek(raw: string): number | null {
  const m = raw.replace(/\s| /g, '').match(/(\d+)kr/i)
  return m ? Number(m[1]) : null
}

type CategoryLike = { items: { name: string; desc?: string; duration?: string; price?: string }[] }

/** A price list — the customer's own or a pack's — as bookable services. */
export function bookingSeedsFrom(categories: CategoryLike[]): BookingSeed[] {
  return categories
    .flatMap(c => c.items)
    .map(item => {
      const duration_minutes = minutes(item.duration)
      const price_sek = sek(item.price ?? '')
      if (duration_minutes === null || price_sek === null) return null
      return { name: item.name, description: item.desc ?? '', duration_minutes, price_sek }
    })
    .filter((s): s is BookingSeed => s !== null)
}

export function bookingServices(id?: string | null): BookingSeed[] {
  return bookingSeedsFrom(tradePack(id).categories)
}
