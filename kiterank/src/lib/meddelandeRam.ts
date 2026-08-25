import type { TemplateKind } from './messageTemplates'

/*
 * Sammanställningen i mailet.
 *
 * Raderna med behandling, datum, tid och bokningsnummer som ligger under
 * salongens text. De byggdes tidigare på tre ställen — bekräftelsen,
 * avbokningen och påminnelsen hade var sin lista — och panelen beskrev dem på
 * ett fjärde, i ord. Fyra beskrivningar av samma sak, och de hann gå isär: en
 * salong kunde läsa att tiden alltid står i sammanställningen och samtidigt
 * tvingas skriva in den i texten.
 *
 * Nu står de här, och panelens förhandsvisning bygger sin bild av meddelandet
 * med samma funktion som utskicket använder. Det som visas är därför det som
 * skickas, inte en beskrivning av det.
 */

export type RamVärden = {
  behandling:   string
  datum:        string
  tid:          string
  medarbetare?: string | null
  referens?:    string | null
}

/**
 * Raderna systemet lägger under salongens text.
 *
 * Skiljer sig per meddelande av samma skäl som texterna gör. Bekräftelsen bär
 * bokningsnumret — det är kvittot kunden hänvisar till. Påminnelsen gör det
 * inte: den som redan har en bokad tid har numret i bekräftelsen, och en rad
 * till är en rad att läsa förbi. Recensionsförfrågan har ingen sammanställning
 * alls, eftersom besöket varit och tiden inte längre betyder något.
 */
export function ramRader(kind: TemplateKind, v: RamVärden): [string, string][] {
  if (kind === 'review') return []

  const rader: [string, string][] = [
    ['Behandling', v.behandling],
    ['Datum',      v.datum],
    ['Tid',        v.tid],
  ]

  /* Vem som tar emot, när kalendern har medarbetare. Inte i avbokningen: tiden
     är borta, och vem som skulle ha tagit emot spelar ingen roll längre. */
  if (v.medarbetare && kind !== 'cancellation') rader.push(['Hos', v.medarbetare])

  if (v.referens && kind !== 'reminder') rader.push(['Bokningsnr', v.referens])

  return rader
}

/** Samma rader som löptext, för förhandsvisningen och för mailets textversion. */
export function ramText(kind: TemplateKind, v: RamVärden): string[] {
  return ramRader(kind, v).map(([k, x]) => `${k}: ${x}`)
}
