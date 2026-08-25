import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * Salongens anteckningar om sina kunder.
 *
 * En rad per kund och salong, nycklad på samma sträng som kundhistoriken och
 * gallringen räknar fram. Anteckningen följer alltså personen mellan besöken i
 * stället för att fastna på en bokning — vilket är hela poängen: färgformeln
 * och doftallergin gäller nästa gång också.
 *
 * Läses som en uppslagstabell och inte per kund. Både kommandelistan och
 * historiken visar många kunder på en skärm, och en fråga per rad hade blivit
 * trettio frågor för en vy som ritas en gång.
 *
 * Uppgifterna är interna. De går aldrig in i ett utskick, och de ligger med
 * flit i en egen tabell i stället för i ett fält på bokningen som en mall skulle
 * kunna råka läsa.
 */

type Admin = ReturnType<typeof createAdminClient>

/** Anteckningar per kundnyckel. Tom tabell och saknad tabell ger samma svar. */
export async function hämtaAnteckningar(
  admin: Admin, companyId: string,
): Promise<Record<string, string>> {
  const { data, error } = await admin
    .from('customer_notes')
    .select('customer_key, note')
    .eq('company_id', companyId)
    .limit(5000)

  /* Migrationen inte körd: inga anteckningar, inget fel. Vyn ska rita sig
     ändå — en salong ska inte mötas av ett trasigt kundregister för att en
     tabell saknas. */
  if (error || !data) return {}

  const ut: Record<string, string> = {}
  for (const r of data) {
    const text = String(r.note ?? '')
    if (text) ut[String(r.customer_key)] = text
  }
  return ut
}

/**
 * Skriver en anteckning. Tom text raderar raden.
 *
 * Raderar i stället för att spara en tom sträng: en anteckning salongen tagit
 * bort ska inte ligga kvar som en tom rad med kundens telefonnummer i nyckeln.
 */
export async function sparaAnteckning(
  admin: Admin, companyId: string, nyckel: string, text: string, av?: string | null,
): Promise<boolean> {
  const rent = text.trim().slice(0, MAX_ANTECKNING)

  if (!rent) {
    const { error } = await admin
      .from('customer_notes').delete()
      .eq('company_id', companyId).eq('customer_key', nyckel)
    return !error
  }

  const { error } = await admin
    .from('customer_notes')
    .upsert({
      company_id:   companyId,
      customer_key: nyckel,
      note:         rent,
      updated_at:   new Date().toISOString(),
      updated_by:   av ?? null,
    }, { onConflict: 'company_id,customer_key' })

  return !error
}

/* Ett stycke, inte en journal. Behöver salongen skriva mer än så är det något
   annat de för — och en ruta utan gräns blir förr eller senare ett ställe där
   känsliga uppgifter hamnar utan att någon bestämt det. */
export const MAX_ANTECKNING = 500
