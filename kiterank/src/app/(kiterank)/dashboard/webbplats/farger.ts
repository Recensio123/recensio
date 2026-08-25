
/*
 * Färgräkningen bakom panelens val.
 *
 * Rena funktioner, utan React. De låg i redigeraren, vilket tvingade hooken
 * som äger innehållet att ta emot två av dem som argument — en omväg som fanns
 * bara för att filerna låg fel. Nu importerar båda dem härifrån.
 */
/* Color helpers for the palette derivation below */
export const hexLum = (hex: string) => {
  const h = hex.replace('#', '')
  if (h.length < 6) return 0
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000
}
export const hexIsDark = (hex: string) => hexLum(hex) < 128
/** WCAG contrast ratio between two hex colors — 1 (none) to 21 (max). */
export const contrastRatio = (hexA: string, hexB: string) => {
  const rel = (hex: string) => {
    const h = hex.replace('#', '')
    if (h.length < 6) return 0
    const [r, g, b] = [0, 2, 4]
      .map(i => parseInt(h.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [rel(hexA), rel(hexB)].sort((m, n) => n - m)
  return (hi + 0.05) / (lo + 0.05)
}
const shade = (hex: string, amount: number) => {
  const h = hex.replace('#', '')
  const ch = [0, 2, 4].map(i => Math.min(255, Math.max(0, parseInt(h.slice(i, i + 2), 16) + amount)))
  return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('')
}
/** Blend two hex colors — t is the weight of the second. */
export const mix = (hexA: string, hexB: string, t: number) => {
  const a = hexA.replace('#', ''), b = hexB.replace('#', '')
  const ch = [0, 2, 4].map(i => Math.round(
    parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t
  ))
  return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('')
}

/** A whole readable palette from one background choice. Text and section
 *  colors follow along, so no combination the customer picks can produce
 *  white text on a white page. */
export function paletteFromBg(bg: string) {
  const dark = hexIsDark(bg)
  return {
    bg,
    nav: bg,
    b:   dark ? shade(bg, 16) : shade(bg, -10),
    h:   dark ? '#ffffff' : '#131313',
    s:   dark ? '#9a9a9a' : '#666666',
  }
}
