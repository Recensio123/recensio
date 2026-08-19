/*
 * Bekräftelsens text och dess platshållare.
 *
 * Låg här och inte i redigeraren, eftersom både panelen och utskicket behöver
 * den. En server som importerar ur en `'use client'`-modul får tomma värden
 * utan att något klagar — samma fälla som mallarnas innehåll gick i tre gånger,
 * och den syns inte förrän ett riktigt mail går ut utan text i.
 */

export const CONFIRM_MAX = 320

/** Delarna av bokningen salongen kan väva in i sin formulering. */
export const PLACEHOLDERS = ['{namn}', '{behandling}', '{datum}', '{tid}', '{medarbetare}', '{salong}'] as const

export type PlaceholderValues = Partial<Record<(typeof PLACEHOLDERS)[number], string>>

/* Exempelbesöket i panelens förhandsvisning. Aldrig i ett riktigt mail. */
const PREVIEW_VALUES: PlaceholderValues = {
  '{namn}':        'Anna',
  '{behandling}':  'Klippning dam',
  '{datum}':       'torsdag 21 augusti',
  '{tid}':         '14:00',
  '{medarbetare}': 'Maria',
  '{salong}':      'Din salong',
}

export function previewOf(text: string): string {
  return fill(text, PREVIEW_VALUES)
}

/* Småorden som bara finns för platshållarens skull. Skriver salongen "hos
   {medarbetare}" och ingen medarbetare valdes räcker det inte att stryka
   klammern — kvar står "hos är bokad". Ordet framför måste följa med.

   Panelens förhandsvisning fyller alltid i ett namn, så salongen får aldrig se
   det trasiga fallet själv. Därför måste det hanteras här. */
const BÄRORD = ['hos', 'med', 'av', 'för', 'till', 'kl']

/** Sätter in bokningens verkliga värden. En platshållare utan värde — salongen
 *  skrev {medarbetare} men ingen valdes — tas bort tillsammans med det småord
 *  som bara stod där för dess skull. */
export function fill(text: string, values: PlaceholderValues): string {
  let out = text

  for (const key of PLACEHOLDERS) {
    const value = values[key]?.trim() ?? ''
    if (value) {
      out = out.replaceAll(key, value)
      continue
    }
    /* Tomt värde: ta med ett eventuellt bärord framför, och skiljetecknet som
       blir hängande efter. */
    const bär = BÄRORD.join('|')
    out = out.replace(
      new RegExp(`(\\s+(?:${bär}))?\\s*${escapeRe(key)}`, 'gi'),
      '',
    )
  }

  /* Dubbla mellanslag och skiljetecken som glidit ihop efter en strykning. */
  return out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,!?:;])/g, '$1')
    .replace(/([.,!?:;])\1+/g, '$1')
    .trim()
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/*
 * Samma värden, kortade för SMS.
 *
 * Ett mail har hur mycket plats som helst; ett SMS har 160 tecken och kostar
 * dubbelt vid 161. Det som svämmar över är sällan salongens formulering — den
 * är de själva herre över — utan värdena vi sätter in: ett besök med tre
 * behandlingar ger "Klippning dam + Slingor helhuvud + Balayage", och ett
 * fullständigt kundnamn kan vara vad som helst.
 *
 * Så i SMS används tilltalsnamnet och den första behandlingen. Det är dessutom
 * hur folk skriver till varandra — "Hej Anna" läser bättre än "Hej Anna-Karin
 * Söderström" — så kortningen kostar ingenting i ton.
 */
export function smsVärden(values: PlaceholderValues): PlaceholderValues {
  const ut = { ...values }

  const namn = values['{namn}']?.trim()
  if (namn) ut['{namn}'] = namn.split(/\s+/)[0]

  const behandling = values['{behandling}']?.trim()
  if (behandling?.includes(' + ')) {
    ut['{behandling}'] = `${behandling.split(' + ')[0]} m.fl.`
  }

  return ut
}

/* ── Bokningens värden i läsbar svensk form ─────────────────────────────── */

/** "torsdag 21 augusti". Utan årtal: en bokning ligger alltid nära i tiden, och
 *  årtalet gör bara raden längre. */
export function datumText(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(d)
}

/** "14:00" ur databasens "14:00:00". */
export function tidText(time: string): string {
  return time.slice(0, 5)
}
