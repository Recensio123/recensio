import type { createAdminClient } from '@/lib/supabase/admin'
import type { GBPLocation, GBPPeriod } from '@/lib/google'

/*
 * Uppgifterna från Google, inskrivna på hemsidan.
 *
 * Tre fält som en nybyggd sida saknar och som är tråkigast att skriva in för
 * hand: telefon, öppettider och gatuadress. Alla tre står redan på salongens
 * Google-profil, och de ligger i samma svar som vi ändå hämtar när kopplingen
 * görs.
 *
 * En regel styr allt här: vi skriver aldrig över något kunden själv skrivit.
 * Ett tomt fält fylls, ett ifyllt lämnas. Skälet är att Google-profilen inte
 * alltid är den sanna versionen — numret där kan vara en gammal fast telefon,
 * och den som ändrat på hemsidan har gjort det med avsikt. En koppling som
 * tyst byter ut deras nummer mot ett de slutat använda är värre än ingen
 * ifyllning alls.
 *
 * Omdömena fylls med flit inte i. Vilka omdömen som ska stå på sidan är ett
 * val salongen gör — det finns en egen post för det i listan — och att välja
 * åt dem vore att publicera citat de inte läst.
 */

type Admin = ReturnType<typeof createAdminClient>

/* Google svarar med engelska dagkoder. Ordningen är veckans, inte Googles. */
const DAGAR: { kod: string; kort: string }[] = [
  { kod: 'MONDAY',    kort: 'Mån' },
  { kod: 'TUESDAY',   kort: 'Tis' },
  { kod: 'WEDNESDAY', kort: 'Ons' },
  { kod: 'THURSDAY',  kort: 'Tors' },
  { kod: 'FRIDAY',    kort: 'Fre' },
  { kod: 'SATURDAY',  kort: 'Lör' },
  { kod: 'SUNDAY',    kort: 'Sön' },
]

function klockslag(t?: { hours?: number; minutes?: number }): string {
  const h = t?.hours ?? 0
  const m = t?.minutes ?? 0
  return m ? `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}` : String(h).padStart(2, '0')
}

/**
 * Öppettiderna som en rad text.
 *
 * Dagar med samma tider slås ihop till ett spann — "Mån–Fre 09–18" och inte
 * fem rader som säger samma sak. En salong med lunchstängt får två intervall
 * på sin dag, och de skrivs ut båda; att slå ihop dem till ett hade gjort
 * texten kortare och fel.
 *
 * Tomma perioder betyder stängt. Google skickar ingen period alls för en
 * stängd dag, så en dag som saknas i svaret är en dag salongen har stängt.
 */
export function öppettiderText(periods: GBPPeriod[] | undefined): string {
  if (!periods?.length) return ''

  /* Tiderna per dag, i den ordning de kom. En dag kan ha flera. */
  const perDag = new Map<string, string[]>()
  for (const p of periods) {
    if (!p.openDay) continue
    const tid = `${klockslag(p.openTime)}–${klockslag(p.closeTime)}`
    perDag.set(p.openDay, [...(perDag.get(p.openDay) ?? []), tid])
  }
  if (!perDag.size) return ''

  /* En rad per dag, som en sträng att jämföra grannar med. */
  const rader = DAGAR.map(d => ({
    kort: d.kort,
    tid:  (perDag.get(d.kod) ?? []).join(', ') || 'stängt',
  }))

  /* Grannar med samma tider blir ett spann. */
  const bitar: string[] = []
  let i = 0
  while (i < rader.length) {
    let j = i
    while (j + 1 < rader.length && rader[j + 1].tid === rader[i].tid) j++

    const namn = j > i ? `${rader[i].kort}–${rader[j].kort}` : rader[i].kort
    bitar.push(`${namn} ${rader[i].tid}`)
    i = j + 1
  }

  /* Punkt mellan dagar, komma inom en dag. Med komma på båda ställena blir
     "Mån 09–12, 13–18, Tis 09–18" omöjlig att läsa — man ser inte var måndagen
     slutar och tisdagen börjar. */
  return bitar.join(' · ')
}

/** Adressen på en rad, som den skrivs på ett brev. */
export function adressText(addr: GBPLocation['storefrontAddress']): string {
  if (!addr) return ''
  const gata = (addr.addressLines ?? []).filter(Boolean).join(', ')
  const ort  = [addr.postalCode, addr.locality || addr.sublocality].filter(Boolean).join(' ')
  return [gata, ort].filter(Boolean).join(', ')
}

/** Vad Google kan bidra med, i sajtens egna fält. */
export function frånLocation(loc: GBPLocation): { phone?: string; hours?: string; address?: string } {
  const ut: { phone?: string; hours?: string; address?: string } = {}

  const tel = loc.phoneNumbers?.primaryPhone?.trim()
  if (tel) ut.phone = tel

  const tider = öppettiderText(loc.regularHours?.periods)
  if (tider) ut.hours = tider

  const adress = adressText(loc.storefrontAddress)
  if (adress) ut.address = adress

  return ut
}

/**
 * Skriver in det som saknas, och rör inte resten.
 *
 * Returnerar fälten som faktiskt fylldes, så att den som anropar kan säga det
 * till kunden i stället för att påstå att något hände.
 *
 * Fel sväljs. Kopplingen till Google är gjord i det ögonblick den här körs, och
 * en misslyckad ifyllning får inte se ut som en misslyckad koppling — kunden
 * skulle trycka på knappen igen.
 */
export async function autofyllFrånGoogle(
  admin: Admin, companyId: string, loc: GBPLocation,
): Promise<string[]> {
  const nytt = frånLocation(loc)
  if (!Object.keys(nytt).length) return []

  try {
    const { data, error } = await admin
      .from('site_config').select('content').eq('company_id', companyId).maybeSingle()

    /* Ingen sajt: inget att fylla i. En kund som valt bort hemsidan har ändå
       nytta av kopplingen, den skriver bara inte någonstans. */
    if (error || !data) return []

    const innehåll = (data.content ?? {}) as Record<string, unknown>

    const patch: Record<string, string> = {}
    for (const [fält, värde] of Object.entries(nytt)) {
      const fanns = String(innehåll[fält] ?? '').trim()
      if (!fanns && värde) patch[fält] = värde
    }
    if (!Object.keys(patch).length) return []

    const { error: skrivfel } = await admin
      .from('site_config')
      .update({ content: { ...innehåll, ...patch }, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)

    return skrivfel ? [] : Object.keys(patch)
  } catch {
    return []
  }
}
