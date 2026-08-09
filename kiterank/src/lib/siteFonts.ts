import {
  Playfair_Display, Cormorant_Garamond, Lora, Montserrat, Poppins, Inter,
} from 'next/font/google'

/*
 * The font library customers pick from.
 *
 * Every family here is licensed under the SIL Open Font License, which
 * explicitly allows commercial use, embedding and self-hosting — bundling
 * them in a paid product is what the license is for. next/font downloads the
 * files at build time and serves them from our own domain, so no visitor
 * data ever reaches a font CDN.
 *
 * Curated for salon sites: two voices per direction — elegant serif, soft
 * serif, clean sans — not a wall of two hundred choices.
 */

const playfair  = Playfair_Display({ subsets: ['latin'], display: 'swap' })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' })
const lora      = Lora({ subsets: ['latin'], display: 'swap' })
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap' })
const poppins   = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap' })
const inter     = Inter({ subsets: ['latin'], display: 'swap' })

export const SITE_FONTS: Record<string, { name: string; hint: string; family: string }> = {
  playfair:   { name: 'Playfair Display', hint: 'Elegant serif',     family: playfair.style.fontFamily },
  cormorant:  { name: 'Cormorant',        hint: 'Exklusiv serif',    family: cormorant.style.fontFamily },
  lora:       { name: 'Lora',             hint: 'Mjuk serif',        family: lora.style.fontFamily },
  montserrat: { name: 'Montserrat',       hint: 'Ren & modern',      family: montserrat.style.fontFamily },
  poppins:    { name: 'Poppins',          hint: 'Rund & vänlig',     family: poppins.style.fontFamily },
  inter:      { name: 'Inter',            hint: 'Neutral & tydlig',  family: inter.style.fontFamily },
}
