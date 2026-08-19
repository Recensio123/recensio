/*
 * Språken en salongssida kan stå på.
 *
 * Ett språkval och inte ett landsval: fyrtio länder delar på de här dryga
 * tjugo språken, och en salong i Wien ska välja tyska och inte Österrike.
 * Därför står språknamnen här och inte landsnamnen.
 *
 * Vad valet gör: sätter sidans `lang`, vilket avgör hur en skärmläsare uttalar
 * texten och om webbläsaren erbjuder att översätta den. Det är inte en
 * Google-signal — söktjänsten läser innehållet, inte attributet.
 *
 * Ordningen är inte alfabetisk hela vägen. Norden och engelska ligger först
 * eftersom det är där kunderna finns; resten följer i bokstavsordning. En
 * svensk frisör ska hitta sitt språk utan att skrolla, och en lettisk ska
 * kunna leta på L.
 *
 * Listan bor i ett eget bibliotek och inte i panelen, eftersom en `'use
 * client'`-modul importerad av serverkod ger tomma värden utan att något
 * klagar — samma fälla mallarnas innehåll gick i tre gånger.
 */

export type SiteLanguage = {
  /** ISO 639-1, det värde som hamnar i `lang`. */
  code: string
  /** Språkets namn på svenska, eftersom panelen är svensk. */
  name: string
}

/* Norden och engelska först — marknaden som finns idag och den som ligger
   närmast. */
const NÄRMAST: SiteLanguage[] = [
  { code: 'sv', name: 'Svenska' },
  { code: 'no', name: 'Norska' },
  { code: 'da', name: 'Danska' },
  { code: 'fi', name: 'Finska' },
  { code: 'is', name: 'Isländska' },
  { code: 'en', name: 'Engelska' },
]

/* Resten i bokstavsordning på svenska. Samtliga vänsterlästa: det som skulle
   krävas för ett högerläst språk är inte bara `lang` utan `dir` och en layout
   som speglas, och en halv lösning där vore sämre än ingen. */
const ÖVRIGA: SiteLanguage[] = [
  { code: 'bg', name: 'Bulgariska' },
  { code: 'et', name: 'Estniska' },
  { code: 'fr', name: 'Franska' },
  { code: 'el', name: 'Grekiska' },
  { code: 'ga', name: 'Irländska' },
  { code: 'it', name: 'Italienska' },
  { code: 'ca', name: 'Katalanska' },
  { code: 'hr', name: 'Kroatiska' },
  { code: 'lv', name: 'Lettiska' },
  { code: 'lt', name: 'Litauiska' },
  { code: 'lb', name: 'Luxemburgiska' },
  { code: 'mt', name: 'Maltesiska' },
  { code: 'nl', name: 'Nederländska' },
  { code: 'pl', name: 'Polska' },
  { code: 'pt', name: 'Portugisiska' },
  { code: 'ro', name: 'Rumänska' },
  { code: 'sk', name: 'Slovakiska' },
  { code: 'sl', name: 'Slovenska' },
  { code: 'es', name: 'Spanska' },
  { code: 'cs', name: 'Tjeckiska' },
  { code: 'de', name: 'Tyska' },
  { code: 'hu', name: 'Ungerska' },
]

export const SITE_LANGUAGES: SiteLanguage[] = [...NÄRMAST, ...ÖVRIGA]

/** Namnet på ett språk, eller koden om den inte finns i listan. En sida som
 *  sparats med ett språk vi sedan tagit bort ska visa något läsbart. */
export function languageName(code: string | undefined): string {
  if (!code) return SITE_LANGUAGES[0].name
  return SITE_LANGUAGES.find(l => l.code === code)?.name ?? code
}
