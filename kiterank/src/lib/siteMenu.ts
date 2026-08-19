/*
 * Sidans meny.
 *
 * Tidigare var menyn en lista med ord, och vart varje ord ledde gissades ur
 * texten: innehöll etiketten "pris" eller "behandl" gick den till prislistan,
 * annars till kontakt. Det fungerade så länge salongen använde våra ord. Döpte
 * de om "Prislista" till "Utbud" föll gissningen igenom och knappen hamnade på
 * kontaktuppgifterna — utan att något syntes fel i panelen.
 *
 * Här är målet i stället uttalat. En menyplats vet vilken sida den pekar på,
 * och etiketten är fri att vara vad som helst.
 *
 * Namnet är dessutom sidans namn. Skriver salongen "Utbud" i menyn heter sidan
 * Utbud, rubriken säger Utbud och läs mer-länken säger Utbud. Ett namn på ett
 * ställe, i stället för tre fält som kan säga olika saker om samma sida.
 */

import { SECTION_PAGES, sectionPageEnabled, sectionPageTitle, type SectionPageId } from './sectionPages'
import { siteLabel } from './siteLabels'

/*
 * Vad en menyplats kan peka på.
 *
 * Bokning finns inte med. Varje mall ritar sin egen boka-knapp, så ett menyval
 * dit hade blivit en andra knapp bredvid den som redan gör samma sak — och
 * vart den leder bestäms under Bokning, inte här.
 */
export type MenuTarget = SectionPageId | 'contact' | 'start' | 'custom'

export type MenuItem = {
  target: MenuTarget
  /** Salongens ord. Tomt betyder sidans eget namn. */
  label?: string
  /** Bara för 'custom': adressen dit. */
  url?: string
}

type ContentSlice = {
  menu?:         MenuItem[]
  navLinks?:     string[]
  labels?:       Record<string, string>
  siteFeatures?: Record<string, boolean>
  sectionPages?: Record<string, { enabled?: boolean; title?: string }>
  articles?:     unknown[]
}

/* Vad varje mål heter och var det ligger. `anchor` är avsnittet på startsidan,
   `path` är den egna sidan — samma mål når båda beroende på var besökaren är. */
export const MENU_TARGETS: Record<Exclude<MenuTarget, 'custom'>, {
  namn: string; path?: string; anchor?: string
}> = {
  pricelist: { namn: 'Prislistan',    path: 'tjanster', anchor: '#tjanster' },
  about:     { namn: 'Om oss',        path: 'om-oss',   anchor: '#om-oss' },
  blog:      { namn: 'Artiklar',      path: 'artiklar', anchor: '#artiklar' },
  contact:   { namn: 'Kontakta oss',  path: 'kontakt',  anchor: '#kontakt' },
  start:     { namn: 'Startsidan' },
}

/** Målen salongen kan välja mellan i panelen, i den ordning de erbjuds. */
export const MENU_TARGET_IDS: MenuTarget[] =
  ['pricelist', 'about', 'blog', 'contact', 'start', 'custom']

/* ── Från de gamla ordlistan till uttalade mål ──────────────────────────── */

/*
 * Sidor som sparats innan menyn fick mål har bara ord. De tolkas en gång, med
 * samma nyckelord som förr, så att en befintlig sida ser likadan ut efter
 * uppgraderingen. Så fort salongen rör menyn i panelen skrivs den nya formen
 * och gissningen behövs aldrig mer.
 */
function targetFromLabel(label: string, first: boolean): MenuTarget | 'skip' {
  const l = label.toLowerCase()
  /* Boka-etiketter fanns i de gamla ordlistorna men filtrerades bort vid
     rendering. De försvinner här i stället, en gång. */
  if (l.includes('boka'))                                  return 'skip'
  if (l.includes('kontakt'))                               return 'contact'
  if (l.includes('om oss') || l === 'om')                  return 'about'
  if (l.includes('artikel') || l.includes('artiklar') ||
      l.includes('blogg') || l.includes('nyhet'))          return 'blog'
  if (first)                                               return 'pricelist'
  if (l.includes('pris') || l.includes('lista') || l.includes('behandl') ||
      l.includes('träning') || l.includes('schema') || l.includes('meny') ||
      l.includes('tjänst') || l.includes('service'))       return 'pricelist'
  /* Case, projekt och referenser låg närmast Om oss på en ensidig sajt. */
  if (l.includes('case') || l.includes('projekt') ||
      l.includes('portfolio') || l.includes('referens'))   return 'about'
  return 'contact'
}

/** Menyn som salongen satt den, eller tolkad ur den gamla ordlistan. */
export function menuOf(content: ContentSlice): MenuItem[] {
  if (content.menu?.length) return content.menu

  const items: MenuItem[] = []
  ;(content.navLinks ?? []).forEach((label, i) => {
    const target = targetFromLabel(label, i === 0)
    if (target !== 'skip') items.push({ target, label })
  })
  return items
}

/* ── Vad menyn blir på sidan ────────────────────────────────────────────── */

export type ResolvedLink = { label: string; href: string }

/** Namnet på en menyplats: salongens ord först, annars sidans eget namn. */
export function menuLabel(content: ContentSlice, item: MenuItem): string {
  const eget = item.label?.trim()
  if (eget) return eget

  if (item.target === 'contact') return siteLabel(content.labels, 'contactTitle')
  if (item.target in SECTION_PAGES) {
    return sectionPageTitle(content as never, item.target as SectionPageId)
  }
  return item.target === 'custom' ? '' : MENU_TARGETS[item.target].namn
}

/*
 * Menyn är densamma på varje sida — det är samma meny, inte en per sida.
 *
 * Det enda som skiljer är vart den pekar: på startsidan räcker ett ankare ner
 * till avsnittet, på en undersida måste det vara en väg tillbaka. `base` är
 * sidans rot när vi står på en undersida, och tomt på startsidan.
 */
export function menuLinks(content: ContentSlice, base = ''): ResolvedLink[] {
  return menuOf(content)
    .map(item => {
      const label = menuLabel(content, item)
      if (!label) return null

      const href = hrefFor(content, item, base)
      return href ? { label, href } : null
    })
    .filter((x): x is ResolvedLink => x !== null)
}

function hrefFor(content: ContentSlice, item: MenuItem, base: string): string | null {
  if (item.target === 'custom') return item.url?.trim() || null
  if (item.target === 'start')  return base || '/'

  const spec = MENU_TARGETS[item.target]

  /* En egen sida om sektionen har en, annars avsnittet på startsidan. En
     menyplats som pekar på en avstängd sida tas bort helt — en knapp som leder
     till ett tomrum är sämre än ingen knapp. */
  if (item.target !== 'contact') {
    const id = item.target as SectionPageId
    if (sectionPageEnabled(content as never, id)) return `${base}/${spec.path}`
    if (!(content.siteFeatures?.[id] ?? true)) return null
    return base ? `${base}${spec.anchor}` : spec.anchor!
  }

  /* Kontakt: egen sida när den är påslagen, annars avsnittet. */
  if (content.siteFeatures?.contact === false) return null
  if (sectionPageEnabled(content as never, 'contact' as SectionPageId)) return `${base}/${spec.path}`
  return base ? `${base}${spec.anchor}` : spec.anchor!
}
