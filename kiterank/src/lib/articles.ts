/*
 * Articles — the part of the site the customer keeps adding to.
 *
 * Service pages answer "balayage stockholm". Articles answer everything a
 * salon knows that no price list can carry: how a colour holds through a
 * summer, what a styling looks like from three angles. That makes them both
 * the strongest ongoing SEO surface and the most photo-heavy thing on the
 * site, so an article is built as a sequence of blocks — text and image
 * groups in any order — rather than one text field with a picture on top.
 */

export type ArticleImage = { src: string; alt: string }

export type ArticleBlock =
  | { type: 'heading'; text: string }
  | { type: 'text';    text: string }
  | { type: 'images';  images: ArticleImage[] }

export type Article = {
  id:        string
  title:     string
  /** Frozen once published so a rename can't break a live address. */
  slug:      string
  excerpt:   string
  cover:     string
  coverAlt:  string
  blocks:    ArticleBlock[]
  published: boolean
  /** ISO date — what the article is dated on the site and in search results. */
  date:      string
}

const CHARS: Record<string, string> = { å: 'a', ä: 'a', ö: 'o', é: 'e', ü: 'u', ø: 'o', æ: 'ae' }

export function slugifyArticle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[åäöéüøæ]/g, ch => CHARS[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function emptyArticle(id: string, date: string): Article {
  return {
    id,
    title:     '',
    slug:      '',
    excerpt:   '',
    cover:     '',
    coverAlt:  '',
    blocks:    [{ type: 'text', text: '' }],
    published: false,
    date,
  }
}

/** Only articles with a title and a slug can be reached, so only those go live. */
export function publishedArticles(articles?: Article[]): Article[] {
  return (articles ?? [])
    .filter(a => a.published && a.title.trim() && a.slug)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

/** Every image in an article, cover first — used for previews and schema. */
export function articleImages(a: Article): ArticleImage[] {
  const inBlocks = a.blocks.flatMap(b => b.type === 'images' ? b.images : [])
  const all = a.cover ? [{ src: a.cover, alt: a.coverAlt }, ...inBlocks] : inBlocks
  return all.filter(i => i.src)
}

/** First words of the article — the fallback when no excerpt is written. */
export function articleSummary(a: Article, max = 155): string {
  if (a.excerpt.trim()) return a.excerpt.trim()
  const firstText = a.blocks.find(b => b.type === 'text' && b.text.trim())
  const text = firstText && firstText.type === 'text' ? firstText.text.trim() : ''
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text
}

/** "3 mars 2026" — how a date reads on a Swedish site. */
export function formatArticleDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })
}
