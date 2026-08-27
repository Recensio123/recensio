import type { CSSProperties } from 'react'
import { SITE_FONTS } from '@/lib/siteFonts'

/*
 * The site's typography choice, applied to a page.
 *
 * Every text style on the sites resolves through the --font-brand-sans
 * variable, so overriding it on a page's root swaps the typography of
 * everything inside. An uploaded font wins over a picked one — owning a
 * brand font is the stronger statement of the two.
 */

type FontContent = {
  customFont?: { url: string; name: string }
  fontPreset?: string
}

/** Style for the page root — spread it into the wrapper's style.
 *
 *  `templateFont` is the typography a theme was designed around: a serif
 *  theme has to arrive set in its serif, or it is just another sans-serif
 *  page. It is only a fallback — the moment the customer picks a font of
 *  their own, theirs wins. */
export function siteFontVars(content: FontContent, templateFont?: string): CSSProperties {
  if (content.customFont?.url) {
    return { ['--font-brand-sans' as never]: `'KundFont', system-ui, sans-serif` }
  }
  const preset = SITE_FONTS[content.fontPreset ?? ''] ?? SITE_FONTS[templateFont ?? '']
  if (preset) {
    return { ['--font-brand-sans' as never]: preset.family }
  }
  return {}
}

/** The @font-face for an uploaded font — render once per page when set.
 *  Library fonts need none: next/font ships their faces with the bundle. */
export function SiteFontFace({ content }: { content: FontContent }) {
  if (!content.customFont?.url) return null
  /* Adressen läggs i en <style>-tagg och måste tvättas innan. Fältet fylls
     normalt av vår egen uppladdning, men det lagras som data och kan skrivas
     via API:t — och ett citattecken eller `</style>` i det bryter sig ur CSS:en
     och kör som markup hos varje besökare på salongens sida. En riktig
     lagringsadress innehåller inget av tecknen som tas bort. */
  const url = content.customFont.url.replace(/['"()<>\\\s]/g, '')
  if (!/^https?:\/\//.test(url)) return null
  return (
    <style dangerouslySetInnerHTML={{ __html:
      `@font-face { font-family: 'KundFont'; src: url('${url}'); font-display: swap; }` }} />
  )
}
