import type { Layout } from '@/lib/templates'

/*
 * Datadelen av layoutregistret.
 *
 * Registret lever i två filer av ett skäl som inte syns förrän det bryts:
 * komponenterna — sajten och menyn — bor i PreviewSite, som är en klientmodul,
 * och en funktion i en klientmodul kan inte anropas från serverrenderad kod.
 * Tjänstesidan renderas på servern och behöver bara veta *vilken* variant den
 * ska rita, inte hur; den kunskapen är ren data och bor därför här, där båda
 * världarna når den.
 *
 * Record<Layout, …> är kontraktet, här precis som i komponentdelen: en ny
 * layout i unionen vägrar bygga tills raden finns i båda registren. Det är
 * hela vitsen — sex växlar som kunde glömmas har blivit två poster som inte
 * kan det.
 */

/** Bildplatserna en layout faktiskt ritar. Editorn erbjuder inga andra —
 *  en uppladdning som inte syns är värre än ingen uppladdning alls. */
export type ImageSlot = 'heroImage' | 'featureImage' | 'aboutImage'

export type LayoutInfo = {
  imageSlots: ImageSlot[]
  /** Tjänstesidans introduktion. Färre former än layouter — de flesta delar. */
  serviceIntro: 'poster' | 'stage' | 'banner' | 'plain' | 'plainCentered'
  /** Tjänstelistans form på den egna sidan. */
  serviceList: 'editorial' | 'luxury' | 'standard'
}

const LAYOUT_INFO: Record<Layout, LayoutInfo> = {
  centered:  { imageSlots: [],               serviceIntro: 'plainCentered', serviceList: 'standard'  },
  split:     { imageSlots: ['heroImage'],    serviceIntro: 'plain',         serviceList: 'standard'  },
  editorial: { imageSlots: ['aboutImage'],   serviceIntro: 'poster',        serviceList: 'editorial' },
  heritage:  { imageSlots: ['aboutImage'],   serviceIntro: 'banner',        serviceList: 'standard'  },
  luxury:    { imageSlots: ['featureImage'], serviceIntro: 'stage',         serviceList: 'luxury'    },
  showcase:  { imageSlots: [],               serviceIntro: 'plain',         serviceList: 'standard'  },
  direct:    { imageSlots: [],               serviceIntro: 'plain',         serviceList: 'standard'  },
  team:      { imageSlots: [],               serviceIntro: 'plain',         serviceList: 'standard'  },
  pole:      { imageSlots: [],               serviceIntro: 'plain',         serviceList: 'standard'  },
  grid:      { imageSlots: [],               serviceIntro: 'plain',         serviceList: 'standard'  },
  workshop:  { imageSlots: [],               serviceIntro: 'plain',         serviceList: 'standard'  },
  sign:      { imageSlots: [],               serviceIntro: 'plain',         serviceList: 'standard'  },
  foyer:     { imageSlots: [],               serviceIntro: 'plain',         serviceList: 'standard'  },
}

/** Raden för en layout. Tar emot en sträng eftersom lagrade mallval är data —
 *  en gammal rad kan bära ett namn som inte längre finns, och den ska ge
 *  standardlayouten, inte en krasch. */
export function layoutInfo(layout: string): LayoutInfo {
  return LAYOUT_INFO[layout as Layout] ?? LAYOUT_INFO.centered
}
