import { tradePack, type TradePack, type TradeArticle } from './trades'
import { EXAMPLE_IMAGES, exampleTeam } from './exampleContent'
import type { Article, ArticleBlock } from './articles'
import type { ServiceCategory } from '@/lib/services-data'

/*
 * Six answers in, a whole website out.
 *
 * The trade pack (lib/trades) decides what a site of this kind looks like:
 * its price list, its articles, the questions its customers ask. The answers
 * decide whose site it is: their services in the headline, their town in the
 * search phrases, their words in the about text.
 *
 * Everything a visitor reads is either something the customer told us or a
 * plain description of how a visit works. Nothing here ever claims something
 * about the business that they did not say themselves.
 */

export type SiteAnswers = {
  description?: string
  services?:    string
  area?:        string
  special?:     string
  years?:       string
  team?:        string
}

export type SiteDraft = {
  kicker?:      string
  heroHeading?: string
  heroBody?:    string
  ctaText?:     string
  tagline?:     string
  aboutTitle?:  string
  aboutBody?:   string
  address?:     string
  services?:      { name: string; desc: string; price: string }[]
  menuCategories?: ServiceCategory[]
  team?:        { name: string; title: string; image: string }[]
  articles?:    Article[]
  gallery_images?: string[]
  gallery_alts?: string[]
  galleryCount?: 3 | 6
  featured_reviews?: { author: string; rating: number; text: string; source: 'example' }[]
  stats?:       { num: string; label: string }[]
  seo?:         { title?: string; description?: string }
  sectionPages?: Record<string, { blocks: ArticleBlock[] }>
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

const clean = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : ''

/** "balayage, klippning och slingor" → ["Balayage", "Klippning", "Slingor"] */
function serviceList(raw: string): string[] {
  return raw.split(/[,·/]| och /).map(s => s.trim()).filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 6)
}

/** "Södermalm, Stockholm" → "Södermalm" */
const shortArea = (area: string) => area.split(',')[0]?.trim() ?? ''

const heading = (text: string): ArticleBlock => ({ type: 'heading', text })
const para    = (text: string): ArticleBlock => ({ type: 'text', text })

/** A trade's article, built out with photos between the sections. */
function buildArticle(a: TradeArticle, i: number, alts: string[]): Article {
  const blocks: ArticleBlock[] = []
  a.sections.forEach((s, si) => {
    blocks.push(heading(s.h))
    blocks.push(para(s.p))
    // One photo group in the middle of every article — the place a reader
    // slows down, and the reason a salon's own pictures earn their keep.
    if (si === 0 && a.sections.length > 2) {
      const from = (i * 2) % EXAMPLE_IMAGES.length
      blocks.push({
        type: 'images',
        images: [0, 1].map(n => ({
          src: EXAMPLE_IMAGES[(from + n) % EXAMPLE_IMAGES.length],
          alt: alts[(from + n) % alts.length] ?? '',
        })),
      })
    }
  })
  const d = new Date('2026-01-15')
  d.setMonth(d.getMonth() - i)
  return {
    id:        `exempel-${i + 1}`,
    title:     a.title,
    slug:      a.slug,
    excerpt:   a.excerpt,
    cover:     EXAMPLE_IMAGES[i % EXAMPLE_IMAGES.length],
    coverAlt:  alts[i % alts.length] ?? '',
    blocks,
    published: true,
    date:      d.toISOString().slice(0, 10),
  }
}

/* ── The generator ───────────────────────────────────────────────────── */

export function buildSiteDraft(answers: SiteAnswers | undefined, trade: string | null | undefined, bizName: string): SiteDraft {
  const t = tradePack(trade)
  const description = clean(answers?.description, 600)
  const special     = clean(answers?.special, 300)
  const area        = clean(answers?.area, 60)
  const town        = shortArea(area)
  const services    = serviceList(clean(answers?.services, 120))
  const years       = clean(answers?.years, 10)
  const teamSize    = clean(answers?.team, 10)
  const name        = bizName.trim() || t.label

  const draft: SiteDraft = {}

  /* ── Start page ── */
  draft.kicker      = (town ? `${t.heroKicker} i ${town}` : t.heroKicker).slice(0, 40)
  draft.heroHeading = services[0] ? `${services[0]}${town ? ` i ${town}` : ''}`.slice(0, 60) : t.heroHeading
  draft.heroBody    = (special || description || t.heroBody).slice(0, 220)
  draft.ctaText     = t.ctaText
  if (services.length) {
    const lower = services.map((s, i) => i === 0 ? s : s.toLowerCase())
    draft.tagline = (lower.length > 1
      ? `${lower.slice(0, -1).join(', ')} & ${lower[lower.length - 1]}`
      : lower[0]).slice(0, 60)
  }
  if (area) draft.address = area

  /* ── Services and the full price list ── */
  draft.services = services.length
    ? services.slice(0, 3).map((s, i) => ({
        name:  s,
        desc:  t.featured[i]?.desc ?? '',
        price: t.featured[i]?.price ?? '',
      }))
    : t.featured
  draft.menuCategories = t.categories

  /* ── About ── */
  draft.aboutTitle = t.aboutTitle
  draft.aboutBody  = [description, special].filter(Boolean).join('\n\n').slice(0, 600) || t.aboutBody

  /* ── Their figures, never ours ── */
  const stats: { num: string; label: string }[] = []
  if (years)    stats.push({ num: /^\d+$/.test(years) ? `${years} år` : years, label: 'i branschen' })
  if (teamSize) stats.push({ num: teamSize, label: teamSize === '1' ? 'som tar hand om dig' : 'i teamet' })
  if (stats.length) draft.stats = stats

  /* ── Team ──
     Two people is the fewest that reads as a team section rather than a
     mistake, so that is the floor — except for the owner who told us they
     work alone. Their own answer beats our example every time. */
  const solo    = teamSize === '1'
  const members = solo ? 1
    : teamSize && /^\d+$/.test(teamSize) ? Math.max(2, Math.min(3, Number(teamSize)))
    : 3
  draft.team = exampleTeam().slice(0, members).map((m, i) => ({ ...m, title: t.teamTitles[i] ?? m.title }))

  /* ── The gallery ──
     Six pictures, because a grid of three looks like a site that was never
     finished. Ours are neutral placeholders from /exempel — they hold the
     layout together and the editor marks every one as ours to replace. */
  draft.gallery_images = EXAMPLE_IMAGES
  draft.gallery_alts   = t.galleryAlts
  draft.galleryCount   = 6

  /* ── The reviews ──
     Marked as examples, which is what keeps them honest: they fill the
     section while the customer edits and are dropped the moment the site is
     published. Real ones come from the salon's Google profile. */
  draft.featured_reviews = t.reviews.map(r => ({ ...r, source: 'example' as const }))
  draft.articles = t.articles.map((a, i) => {
    const built = buildArticle(a, i, t.galleryAlts)
    // Their top service leads the first article, their town the fourth —
    // the two places a local search phrase does the most good.
    if (i === 0 && services[0]) return { ...built, title: `${services[0]} — så väljer du rätt` }
    if (i === 3 && town)        return { ...built, title: `Ditt första besök hos oss i ${town}` }
    return built
  })

  /* ── Search result ── */
  draft.seo = {
    title: [t.label, town, services[0] ? `— ${services[0].toLowerCase()}` : `— ${name}`]
      .filter(Boolean).join(' ').slice(0, 60),
    description: [
      services.length ? `${services.join(', ')}.` : '',
      town ? `${t.label} i ${town}.` : '',
      special || description,
    ].filter(Boolean).join(' ').slice(0, 155) || undefined,
  }

  /* ── The own pages ── */
  draft.sectionPages = {
    about:     { blocks: aboutPageBlocks(t, { description, special, area, years, teamSize, name }) },
    pricelist: { blocks: [
      heading('Bra att veta om priserna'),
      para(`Priserna ovan är utgångspriser och kan variera med ${t.varies}. Du får alltid veta vad det kostar innan vi börjar — inga överraskningar på slutet.`),
      heading('Boka tid'),
      para('Boka online när det passar dig, eller ring oss så hittar vi en tid tillsammans.'),
    ] },
    blog:      { blocks: [
      para(`Här skriver vi om sådant vi får frågor om — tips, nyheter och lite inspiration från ${name}.`),
    ] },
  }

  return draft
}

function aboutPageBlocks(
  t: TradePack,
  d: { description: string; special: string; area: string; years: string; teamSize: string; name: string },
): ArticleBlock[] {
  const blocks: ArticleBlock[] = [
    heading('Så går det till hos oss'),
    para(t.visit.join('\n\n')),
    { type: 'images', images: EXAMPLE_IMAGES.slice(0, 3).map((src, i) => ({ src, alt: t.galleryAlts[i] ?? '' })) },
  ]

  if (d.special) {
    blocks.push(heading('Det här kan du förvänta dig'))
    blocks.push(para(d.special))
  }

  if (d.years || d.teamSize) {
    const since = /^\d+$/.test(d.years) ? `${new Date().getFullYear() - Number(d.years)}` : d.years
    const bits = [
      d.years    ? `${d.name} har funnits sedan ${since}.` : '',
      d.teamSize ? (d.teamSize === '1' ? 'Här är det jag som tar hand om dig från början till slut.' : `Vi är ${d.teamSize} som jobbar här.`) : '',
    ].filter(Boolean).join(' ')
    if (bits) {
      blocks.push(heading('Vilka vi är'))
      blocks.push(para(bits))
    }
  }

  blocks.push(heading('Vanliga frågor'))
  blocks.push(para(t.faq.map(f => `${f.q} ${f.a}`).join('\n\n')))

  if (d.area) {
    blocks.push(heading('Hitta hit'))
    blocks.push(para(`Du hittar oss på ${d.area}. Ring oss om du undrar över något innan du kommer.`))
  }

  return blocks
}
