import type { createAdminClient } from '@/lib/supabase/admin'
import { kundNyckel } from '@/lib/kundNyckel'

/*
 * Gallring av kunduppgifter.
 *
 * En bokningsrad bär två saker med olika livslängd. Bokföringsunderlaget —
 * datum, behandling, belopp — ska sparas i sju år; det är bokföringslagen och
 * där finns inget val. Personuppgifterna — namn, telefon, mejl, anteckning —
 * får bara sparas så länge de behövs för sitt syfte.
 *
 * Så raden raderas inte, den avidentifieras. Siffrorna står kvar och stämmer
 * med bokföringen; personen försvinner.
 *
 * Tjugofyra månader från senaste besöket. En salongskund har en cykel på sex
 * till tio veckor, så två år är ungefär tio uteblivna besök — då är det inte
 * längre en paus utan ett avslut. Den som ändå kommer tillbaka efter det är
 * en ny kundrelation och lämnar sina uppgifter på nytt, vilket tar tio
 * sekunder. Att spara dem i väntan på det kostar mer än det smakar.
 *
 * Räknat per kund, inte per rad. Någon som var här för fyra år sedan och igen
 * i våras är en aktiv kund, och då ska ingenting av deras historik gallras.
 * En cutoff rad för rad hade tömt halva deras historia och lämnat resten.
 */

/** Månader från senaste besök innan uppgifterna gallras. */
export const GALLRINGSMANADER = 24

/** Det som ersätter namnet. Ett ord, inte en tom sträng: en tom rad ser ut som
 *  ett fel i systemet, det här ser ut som ett beslut — vilket det är. */
export const GALLRAD = 'Avidentifierad'

type Rad = {
  id:             string
  customer_name:  string | null
  customer_phone: string | null
  customer_email: string | null
  booking_date:   string
}

/**
 * Vilka rader som ska gallras, givet allt som ännu inte gallrats.
 *
 * Ren funktion med flit: det här är regeln som avgör vems uppgifter som
 * raderas, och den ska gå att läsa och testa utan en databas.
 */
export function attGallra(rader: Rad[], idag: Date): string[] {
  const gräns = new Date(idag)
  gräns.setMonth(gräns.getMonth() - GALLRINGSMANADER)
  const gränsDatum = gräns.toISOString().slice(0, 10)

  const perKund = new Map<string, Rad[]>()
  for (const r of rader) {
    const n = kundNyckel({ telefon: r.customer_phone, epost: r.customer_email, namn: r.customer_name })
    perKund.set(n, [...(perKund.get(n) ?? []), r])
  }

  const ut: string[] = []
  for (const rader of perKund.values()) {
    const senaste = rader.reduce((m, r) => r.booking_date > m ? r.booking_date : m, '')
    /* Ett enda besök inom gränsen räddar hela historiken.
     *
     * Själva gränsdagen räknas som innanför: "efter 24 månader" betyder dagen
     * efter att de gått, inte dagen de går. Skillnaden är ett dygn och spelar
     * ingen praktisk roll — men en gräns som ingen bestämt är en gräns som
     * ändras nästa gång någon skriver om raden. */
    if (senaste >= gränsDatum) continue
    for (const r of rader) ut.push(r.id)
  }
  return ut
}

/**
 * Gallrar en salongs bokningshistorik.
 *
 * Returnerar antalet avidentifierade rader. Fel sväljs per salong — en salong
 * med en trasig rad ska inte stoppa gallringen för alla andra, och en gallring
 * som inte blir av är ett problem som växer varje natt den uteblir.
 */
export async function gallraForetag(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  idag = new Date(),
): Promise<number> {
  try {
    const { data, error } = await admin
      .from('bookings')
      .select('id, customer_name, customer_phone, customer_email, booking_date')
      .eq('company_id', companyId)
      .is('anonymised_at', null)
    if (error || !data?.length) return 0

    const ids = attGallra(data as Rad[], idag)
    if (!ids.length) return 0

    const { error: skrivfel } = await admin
      .from('bookings')
      .update({
        customer_name:  GALLRAD,
        customer_phone: '',
        customer_email: '',
        customer_note:  '',
        anonymised_at:  idag.toISOString(),
      })
      .in('id', ids)

    if (skrivfel) return 0

    /* Anteckningarna om kunden gallras med henne. De ligger i en egen tabell
       och hade annars blivit kvar med telefonnumret i nyckeln — precis de
       uppgifter raden ovanför just tagit bort. */
    await raderaAnteckningar(admin, companyId, data as Rad[], new Set(ids))

    return ids.length
  } catch {
    /* Kolumnen inte migrerad ännu — gallringen börjar när den finns. */
    return 0
  }
}

/*
 * Anteckningarna om de kunder som just gallrats.
 *
 * Nyckeln räknas fram ur de rader som avidentifierades — de innehåller
 * fortfarande kundens uppgifter här i minnet, vilket är den enda stunden de går
 * att slå upp på. Efter skrivningen ovan är de borta ur databasen, och en
 * anteckning ingen kan koppla till en person är en personuppgift utan ägare.
 *
 * Fel sväljs: tabellen kan sakna migrering, och en gallring som avbryts för
 * det hade lämnat bokningarna halvgjorda.
 */
async function raderaAnteckningar(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  rader: Rad[],
  gallrade: Set<string>,
): Promise<void> {
  const nycklar = [...new Set(
    rader
      .filter(r => gallrade.has(r.id))
      .map(r => kundNyckel({ telefon: r.customer_phone, epost: r.customer_email, namn: r.customer_name })),
  )]
  if (!nycklar.length) return

  try {
    await admin
      .from('customer_notes').delete()
      .eq('company_id', companyId).in('customer_key', nycklar)
  } catch { /* tabellen finns inte ännu */ }
}
