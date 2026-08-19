import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * Är avtalet avslutat?
 *
 * En fråga, ett svar, ett ställe. Sajten frågar den när någon besöker en
 * kundadress, och inloggningen frågar den när någon försöker in i panelen. Två
 * uppsättningar villkor för samma sak är hur en salong slutar synas utåt men
 * fortsätter kunna redigera.
 *
 * Datumet är verksamt, inte bara en markering. Ett avtal som sägs upp den
 * femtonde med en månads uppsägningstid får slutdatumet en månad fram: fram
 * till dess fungerar allt, efter det ingenting. Sätts datumet till nu upphör
 * det direkt. Ett datum framåt är alltså ett schemalagt slut, och det behöver
 * ingen extra kolumn eller något jobb som kör vid midnatt — frågan ställs vid
 * varje besök och svaret ändras av sig självt när tiden passerar.
 */

/** Har slutdatumet passerat? Null betyder aktivt avtal. */
export function avtalAvslutat(closedAt: string | null | undefined): boolean {
  if (!closedAt) return false
  const t = new Date(closedAt).getTime()
  return Number.isFinite(t) && t <= Date.now()
}

/**
 * Företagets slutdatum, eller null.
 *
 * Läses för sig och tillåts misslyckas, som de andra kolumnerna som kommit
 * till i efterhand: saknas fältet är avtalet aktivt. En salong ska aldrig
 * släckas för att en migration inte hunnit köras.
 */
export async function closedAtFor(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<string | null> {
  try {
    const { data } = await admin
      .from('companies')
      .select('closed_at')
      .eq('id', companyId)
      .maybeSingle()
    return (data?.closed_at as string | null) ?? null
  } catch {
    return null
  }
}

/** Kortformen: är den här salongens avtal avslutat just nu? */
export async function isClosed(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<boolean> {
  return avtalAvslutat(await closedAtFor(admin, companyId))
}
