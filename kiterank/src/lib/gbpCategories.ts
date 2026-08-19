/*
 * The category on the Google Business Profile — shown, not judged.
 *
 * The first version of this mapped every trade we sell to the Google category
 * id we thought it should have, then told the customer when the two disagreed.
 * Two things were wrong with it. The ids were ours, written from memory
 * against a list we could not see, so the product was asserting something it
 * had not verified. And it assumed the choice made in our setup wizard was the
 * truth and the profile the mistake, when a customer who clicked the wrong
 * trade in a five-step form is at least as likely as one who filed their own
 * business wrong on Google.
 *
 * So there is no mapping any more. The website's markup follows the trade
 * chosen here; the profile's category is Google's business and the customer's.
 * We show it in their own words and offer two ways out: confirm it, or change
 * it to something else from Google's own list.
 *
 * What remains here is the small amount of judgement that is honest: sorting
 * the picker so the categories nearest their trade come first. Ordering a list
 * is a convenience, not a claim, and it never says anything is wrong.
 */

export type GoogleCategory = { id: string; label: string }

/* Words that tend to sit in the category a salon is looking for. Only used to
   float likely options to the top of the picker — never to accept or reject. */
const HINTS: Record<string, string[]> = {
  salon:  ['frisör', 'hair', 'salong'],
  barber: ['barber', 'frisör', 'herr'],
  beauty: ['skönhet', 'beauty', 'hud'],
  nails:  ['nagel', 'nail', 'manikyr'],
  lashes: ['fransar', 'lash', 'ögonfrans', 'bryn'],
  spa:    ['spa', 'massage', 'wellness'],
}

/**
 * Google's categories, with the ones nearest this trade first.
 *
 * Everything stays in the list — a salon that has branched into something we
 * never anticipated still finds it, just further down.
 */
export function sortForTrade(categories: GoogleCategory[], tradeId?: string | null): GoogleCategory[] {
  const hints = HINTS[tradeId ?? ''] ?? []
  if (!hints.length) return categories

  const score = (c: GoogleCategory) => {
    const label = c.label.toLowerCase()
    const i = hints.findIndex(h => label.includes(h))
    return i === -1 ? hints.length : i
  }
  return [...categories].sort((a, b) => score(a) - score(b) || a.label.localeCompare(b.label, 'sv'))
}
