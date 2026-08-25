import type { createAdminClient } from '@/lib/supabase/admin'
import { sendMail, platformFrom } from '@/lib/mailer'

/*
 * Påminnelsen om att provperioden snart tar slut.
 *
 * Den enskilt billigaste konverteringsåtgärd som finns i ett prov, av ett
 * trist skäl: de flesta som inte betalar har inte bestämt sig för att låta bli.
 * De har glömt bort att provet löper, och märker det först när panelen är
 * stängd — vilket är sämsta tänkbara ögonblick att be någon om pengar.
 *
 * Skickas en gång, tre dagar innan. Tidigare och den kommer innan salongen
 * hunnit se värdet; senare och det är för sent att hinna testa klart.
 */

type Admin = ReturnType<typeof createAdminClient>

/** Dagar innan provets slut som påminnelsen går ut. */
export const PÅMINN_DAGAR = 3

export type Provrad = {
  trial_ends_at:          string | null
  subscription_status:    string | null
  provpaminnelse_skickad: string | null
  closed_at?:             string | null
}

/**
 * Ska den här kunden påminnas nu?
 *
 * Ren funktion med klockan inskickad, så regeln går att prova. En påminnelse
 * som går till en betalande kund läser som ett hot om avstängning, och en som
 * går två gånger läser som skräppost — båda kostar mer än tystnad.
 */
export function skaPåminnas(rad: Provrad, nu: Date = new Date()): boolean {
  if (rad.provpaminnelse_skickad) return false
  if (rad.closed_at)              return false
  /* Har de redan betalat finns inget prov att påminna om. */
  if (rad.subscription_status)    return false
  if (!rad.trial_ends_at)         return false

  const dagar = Math.ceil((new Date(rad.trial_ends_at).getTime() - nu.getTime()) / 86_400_000)
  return dagar > 0 && dagar <= PÅMINN_DAGAR
}

const TEXT = (salong: string, dagar: number, adress: string) => {
  const när = dagar === 1 ? 'i morgon' : `om ${dagar} dagar`
  return {
    subject: `Din provperiod hos Kiterank tar slut ${när}`,
    text: [
      `Hej!`,
      ``,
      `Provperioden för ${salong} tar slut ${när}. Väljer du ett paket innan dess fortsätter allt utan avbrott — hemsidan, bokningarna och statistiken står kvar precis som de är.`,
      ``,
      `Välj paket här: ${adress}`,
      ``,
      `Gör du ingenting stängs panelen när provet löper ut. Ingenting raderas: kommer du tillbaka senare finns allt kvar och öppnas igen så fort en betalning är på plats.`,
      ``,
      `Vänliga hälsningar`,
      `Kiterank`,
    ].join('\n'),
  }
}

/**
 * Går igenom kunderna och påminner dem vars prov snart tar slut.
 *
 * Körs från nattsvepet. Returnerar antalet skickade, för loggen.
 */
export async function påminnOmProv(admin: Admin, nu: Date = new Date()): Promise<number> {
  if (!platformFrom()) return 0

  let rader: (Provrad & { id: string; name: string | null; user_id: string })[] = []
  try {
    const { data, error } = await admin
      .from('companies')
      .select('id, name, user_id, trial_ends_at, subscription_status, provpaminnelse_skickad, closed_at')
      .not('trial_ends_at', 'is', null)
      .is('subscription_status', null)
      .is('provpaminnelse_skickad', null)
    if (error) throw error
    rader = data ?? []
  } catch {
    /* Migrationen inte körd — nattsvepet ska gå ändå. */
    return 0
  }

  const bas = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || ''
  const adress = `${bas}/dashboard/settings?flik=abonnemang`

  let skickade = 0
  for (const rad of rader) {
    if (!skaPåminnas(rad, nu)) continue

    /* Ägarens adress finns hos inloggningstjänsten, inte på företagsraden. */
    const { data: användare } = await admin.auth.admin.getUserById(rad.user_id)
    const till = användare?.user?.email
    if (!till) continue

    const dagar = Math.max(1, Math.ceil(
      (new Date(rad.trial_ends_at!).getTime() - nu.getTime()) / 86_400_000))
    const brev = TEXT(rad.name ?? 'din salong', dagar, adress)

    const svar = await sendMail({
      to: till, from: { email: platformFrom(), name: 'Kiterank' },
      subject: brev.subject, text: brev.text,
    })

    /* Stämpeln sätts bara när mailet gick. Ett misslyckat försök ska tas om
       nästa natt, inte räknas som avklarat. */
    if (svar.sent) {
      await admin.from('companies')
        .update({ provpaminnelse_skickad: nu.toISOString() })
        .eq('id', rad.id)
      skickade++
    }
  }

  return skickade
}
