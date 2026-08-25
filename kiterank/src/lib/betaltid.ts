import { stripe, stripeKonfigurerad } from '@/lib/betalning'

/*
 * Hur länge en kund faktiskt betalat.
 *
 * Två regler hänger på det här talet, och båda handlar om samma sak: att
 * designarbetet är avbetalt efter ett år.
 *
 *   Rätten att ta med sig hemsidan vid uppsägning.
 *   Avdraget på månadsavgiften som börjar gälla när sidan är betald.
 *
 * Mätningen sker mot Stripes betalda fakturor och inte mot ett datum i vår
 * databas. En kund kan ha pausat, bytt kort mitt i, eller haft en månad som
 * aldrig gick igenom — och då är "kund sedan augusti förra året" inte samma
 * sak som "har betalat i tolv månader". Bara det senare räknas.
 */

const DYGN = 86_400

export async function betaldaMånader(kundId: string | null | undefined): Promise<number> {
  if (!kundId || !stripeKonfigurerad()) return 0

  /*
   * Perioden varje fakturarad täcker, inte prisets intervall.
   *
   * Perioden finns på varje rad oavsett hur Stripe råkar namnge prisfälten i
   * en given API-version, och den beskriver dessutom det vi vill veta: hur
   * lång tid kunden betalat för. Ett år blir tolv månader, en månad blir en.
   *
   * Rader kortare än tjugofem dagar hoppas över — det är proportionerliga
   * justeringar vid paketbyten och tillägg mitt i en period. De är betalning,
   * men inte avtalstid, och skulle annars räknas dubbelt.
   */
  let dagar = 0
  try {
    for await (const f of stripe().invoices.list({ customer: kundId, status: 'paid', limit: 100 })) {
      /* En faktura kan ha flera rader för samma period — paket, bokning, SMS.
         Bara den längsta räknas, annars blir en månad tre. */
      let längst = 0
      for (const rad of f.lines.data) {
        const start = rad.period?.start, slut = rad.period?.end
        if (!start || !slut) continue
        längst = Math.max(längst, (slut - start) / DYGN)
      }
      if (längst >= 25) dagar += längst
    }
  } catch { /* Stripe svarar inte — noll hellre än ett fel som fäller sidan */ }

  return Math.floor(dagar / 30)
}
