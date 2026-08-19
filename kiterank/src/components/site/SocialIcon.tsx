import type { SocialKey } from '@/lib/siteSocial'

/*
 * Plattformarnas märken, ritade i koden.
 *
 * Inte hämtade utifrån. En kundsajt får aldrig be en främmande server om något
 * för att kunna ritas färdigt: det är en tredje part som kan vara nere, som ser
 * besökaren, och som gör sidan långsammare. Fem små banor väger mindre än en
 * enda bildförfrågan.
 *
 * Allt ritas i `currentColor`, så märket tar färgen från texten omkring. Samma
 * ikon fungerar därför i sidfoten på en mörk mall och i menyn på en ljus, utan
 * att någon behöver välja variant.
 *
 * Namnet står kvar för skärmläsare via aria-label på länken — en ikon utan ord
 * är tyst för den som inte ser den.
 */

const BANOR: Record<SocialKey, React.ReactNode> = {
  instagram: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" />
    </>
  ),
  facebook: (
    <path
      fill="currentColor"
      d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"
    />
  ),
  tiktok: (
    <path
      fill="currentColor"
      d="M16.7 5.8a4.8 4.8 0 0 1-1.1-2.3h-2.9v11.8a2.7 2.7 0 1 1-2-2.6V9.6a5.7 5.7 0 1 0 4.9 5.6V9.7a7.6 7.6 0 0 0 4.4 1.4V8.2a4.7 4.7 0 0 1-3.3-2.4z"
    />
  ),
  pinterest: (
    <path
      fill="currentColor"
      d="M12 2a10 10 0 0 0-3.7 19.3c-.1-.8-.2-2 0-2.9l1.2-5.1s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.5 2.2-.8 3.4-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1a4.8 4.8 0 0 0-5 4.8c0 1 .4 2 .9 2.5.1.1.1.2.1.3l-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4 0-3.2 2.3-6.2 6.7-6.1 3.5 0 6.2 2.5 6.2 5.8 0 3.5-2.2 6.3-5.2 6.3-1 0-2-.5-2.3-1.2l-.6 2.4c-.2.9-.8 2-1.2 2.6A10 10 0 1 0 12 2z"
    />
  ),
  /* Triangeln är ett hål, inte en vit form ovanpå. En vit triangel försvinner
     i samma stund ikonen själv blir vit — vilket den blir i sidfoten på varje
     mörk mall. Ett hål visar alltid ytan bakom, oavsett färg på båda. */
  youtube: (
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M22.5 7.6a2.9 2.9 0 0 0-2-2C18.7 5 12 5 12 5s-6.7 0-8.5.5a2.9 2.9 0 0 0-2 2A30 30 0 0 0 1 12a30 30 0 0 0 .5 4.4 2.9 2.9 0 0 0 2 2C5.3 19 12 19 12 19s6.7 0 8.5-.5a2.9 2.9 0 0 0 2-2A30 30 0 0 0 23 12a30 30 0 0 0-.5-4.4zM10 15.2V8.8l5.4 3.2z"
    />
  ),
}

export function SocialIcon({ kind, size = 20 }: { kind: SocialKey; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {BANOR[kind]}
    </svg>
  )
}
