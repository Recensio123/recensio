import type { CSSProperties } from 'react'
import type { SiteContent } from '@/components/site/PreviewSite'

/*
 * The surface a site stands on, and the maths that keeps text readable on it.
 *
 * Plain functions in a plain module, not in PreviewSite — that file is a
 * client component, and a server page importing a value out of one gets an
 * empty stub instead of the value. The published sub-pages need these to wear
 * the same wall as the start page.
 */

export const BACKDROPS: Record<string, { label: string; src: string; dark: boolean }> = {
  tra:    { label: 'Trä',    src: '/exempel/bakgrund-tra.svg',    dark: true  },
  sten:   { label: 'Sten',   src: '/exempel/bakgrund-sten.svg',   dark: true  },
  tegel:  { label: 'Tegel',  src: '/exempel/bakgrund-tegel.svg',  dark: true  },
  betong: { label: 'Betong', src: '/exempel/bakgrund-betong.svg', dark: false },
  linne:  { label: 'Linne',  src: '/exempel/bakgrund-linne.svg',  dark: false },
}

/** The surface a backdrop layout stands on.
 *
 *  A picture of their own room beats any texture we can draw, so anything the
 *  customer has already uploaded is used before the drawn surface — the photo
 *  chosen for the backdrop, then the theme's own picture slot, then the first
 *  gallery shot. Only when they have given us nothing does the texture show. */
export function backdropSrc(content: SiteContent, fallback: string): string {
  const own = [content.backdropImage, content.heroImage, content.gallery_images?.find(s => s?.trim() && !s.startsWith('/exempel/'))]
    .find(s => s?.trim())
  return own?.trim() || BACKDROPS[content.backdrop ?? '']?.src || fallback
}

/** True when the surface is a drawn texture rather than a real photograph.
 *  A layout that hands the whole opening to a picture needs to know: an empty
 *  band of texture reads as a page that failed to load. */
export const isTexture = (src: string) => src.startsWith('/exempel/bakgrund-')

/** Background plus the scrim that keeps text readable over it. Photographs
 *  vary far more than a palette does, so the scrim is not optional — it is
 *  what stops a customer's bright window shot from eating their own headline.
 *
 *  `scrim` is the colour laid over the surface. Black darkens; passing an
 *  accent instead washes the whole opening in one colour, which is a look in
 *  its own right rather than a way of dimming a picture.
 *
 *  Our textures tile at their drawn size: stretched to cover down a long
 *  page, plank seams and brick courses grow to the height of a phone and the
 *  surface stops reading as a surface. An uploaded photograph is a picture of
 *  one thing, so that one still fills the frame. */
export function backdropStyle(src: string, tint = 0.55, scrim = '8,8,10'): CSSProperties {
  const ours = src.startsWith('/exempel/')
  return {
    backgroundImage: `linear-gradient(rgba(${scrim},${tint}), rgba(${scrim},${tint})), url('${src}')`,
    backgroundSize:     ours ? 'auto, 900px 600px' : 'auto, cover',
    backgroundPosition: 'center',
    backgroundRepeat:   ours ? 'no-repeat, repeat' : 'no-repeat, no-repeat',
  }
}

/** "#2f8f8a" → "47,143,138", so a template colour can be used as a scrim. */
export function rgbOf(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '8,8,10'
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(',')
}
