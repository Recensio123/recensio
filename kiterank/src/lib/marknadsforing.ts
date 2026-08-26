import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * Vem som får ett erbjudande, och vem som inte får det.
 *
 * Salongen får marknadsföra sina egna tjänster till någon som redan varit
 * kund — undantaget för befintligt kundförhållande. Men undantaget bär fyra
 * villkor, och tre av dem är kod:
 *
 *   Kunden ska ha fått tacka nej när uppgifterna samlades in. Det sker i
 *   bokningsformuläret, och ett kryss där sätter `marknadsforing_nej` direkt.
 *
 *   Kunden ska kunna tacka nej i varje utskick. Avanmälan hör därför till
 *   varje meddelande, och svaret skriver samma kolumn.
 *
 *   Kundförhållandet ska vara befintligt. Den som inte varit där på två år är
 *   inte längre en kund som väntar sig att höra av oss — de undrar vem vi är,
 *   och de anmäler oftare än de bokar.
 *
 * Det fjärde villkoret är att det ska vara salongens egna, liknande tjänster.
 * Det kan koden inte avgöra, och därför står det i avtalet i stället.
 *
 * Allt går genom `mottagare`. Två vägar in i ett utskick är en väg för mycket
 * — den dag någon lägger till en andra glömmer den ena kontrollen.
 */

/** Så länge ett kundförhållande räknas som befintligt. */
export const BEFINTLIG_KUND_MANADER = 24

type Admin = ReturnType<typeof createAdminClient>

export type Nejkälla = 'bokning' | 'svar' | 'salong' | 'kund'

export type Mottagare = {
  id:       string
  namn:     string
  telefon:  string | null
  epost:    string | null
  /** Senaste besöket, YYYY-MM-DD. */
  senast:   string | null
}

/**
 * Salongens instruktion enligt artikel 28, som en inställning.
 *
 * Står den av skickas ingenting — oavsett vad någon kommit överens om
 * muntligt. Fel vid läsning tolkas som av: kan vi inte visa att instruktionen
 * finns har vi ingen rätt att behandla.
 */
export async function återaktiveringPå(admin: Admin, companyId: string): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from('companies').select('aterakti_pa').eq('id', companyId).maybeSingle()
    if (error) return false
    return Boolean(data?.aterakti_pa)
  } catch {
    return false
  }
}

/**
 * De som får ett erbjudande just nu.
 *
 * En fråga, inte en per kund: listan filtreras i databasen på det som går att
 * filtrera där, och besöksdatumet räknas fram ur bokningarna. Returnerar tom
 * lista om salongen inte slagit på det — aldrig ett fel, eftersom den vanliga
 * orsaken är att de helt enkelt inte vill.
 */
export async function mottagare(
  admin: Admin,
  companyId: string,
  opts: { inteBesöktPåMånader?: number; nu?: Date } = {},
): Promise<{ lista: Mottagare[]; avstängt: boolean; skäl?: string }> {
  if (!(await återaktiveringPå(admin, companyId))) {
    return { lista: [], avstängt: true, skäl: 'salongen har inte slagit på återaktivering' }
  }

  const nu = opts.nu ?? new Date()
  const dag = (månaderTillbaka: number) => {
    const d = new Date(nu)
    d.setMonth(d.getMonth() - månaderTillbaka)
    return d.toISOString().slice(0, 10)
  }

  /* Fönstret: varit här inom 24 månader, men inte de senaste N. Den som var
     här förra veckan ska inte få ett "vi saknar dig". */
  const äldstaTillåtna = dag(BEFINTLIG_KUND_MANADER)
  const senasteTillåtna = dag(opts.inteBesöktPåMånader ?? 4)

  const { data: kunder, error } = await admin
    .from('customers')
    .select('id, name, phone, email')
    .eq('company_id', companyId)
    .eq('marknadsforing_nej', false)

  /* Ett fel här får inte betyda "skicka till alla". Kan vi inte läsa nejen
     skickar vi ingenting. */
  if (error) return { lista: [], avstängt: false, skäl: 'kundregistret kunde inte läsas' }

  const kandidater = (kunder ?? []).filter(k => k.phone || k.email)
  if (!kandidater.length) return { lista: [], avstängt: false }

  /* Senaste besöket per kund, ur bokningarna. Avbokade räknas inte som besök. */
  const { data: besök } = await admin
    .from('bookings')
    .select('customer_id, booking_date')
    .eq('company_id', companyId)
    .in('customer_id', kandidater.map(k => k.id))
    .neq('status', 'cancelled')
    .gte('booking_date', äldstaTillåtna)
    .lte('booking_date', nu.toISOString().slice(0, 10))

  const senaste = new Map<string, string>()
  for (const b of besök ?? []) {
    const id = b.customer_id as string | null
    const d  = b.booking_date as string | null
    if (!id || !d) continue
    if (!senaste.has(id) || d > senaste.get(id)!) senaste.set(id, d)
  }

  const lista = kandidater
    .map(k => ({
      id: k.id as string, namn: (k.name as string) ?? '',
      telefon: (k.phone as string | null) ?? null,
      epost:   (k.email as string | null) ?? null,
      senast:  senaste.get(k.id as string) ?? null,
    }))
    .filter(k => k.senast && k.senast <= senasteTillåtna)

  return { lista, avstängt: false }
}

/** Skriver in ett nej. Idempotent — samma person kan tacka nej två gånger. */
export async function tackaNej(
  admin: Admin,
  companyId: string,
  kundId: string,
  kalla: Nejkälla = 'kund',
): Promise<boolean> {
  try {
    const { error } = await admin
      .from('customers')
      .update({
        marknadsforing_nej:       true,
        marknadsforing_nej_at:    new Date().toISOString(),
        marknadsforing_nej_kalla: kalla,
      })
      .eq('id', kundId)
      .eq('company_id', companyId)
    return !error
  } catch {
    return false
  }
}

/** Texten som måste finnas i varje marknadsföringsutskick. */
export function avanmälanText(kanal: 'sms' | 'epost'): string {
  return kanal === 'sms'
    ? 'Svara STOPP om du inte vill ha fler erbjudanden.'
    : 'Vill du inte ha fler erbjudanden kan du tacka nej längst ned i mejlet.'
}
