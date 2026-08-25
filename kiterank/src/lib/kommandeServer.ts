import type { createAdminClient } from '@/lib/supabase/admin'
import { fetchTemplates } from '@/lib/messageTemplates'
import { hämtaKontaktsätt } from '@/lib/kontaktsatt'
import { köInst, kön, type KommandeBokning, type KöInst } from '@/lib/kommande'
import { fetchPolicy, type BookingPolicy } from '@/lib/bookingPolicy'
import { kundNyckel } from '@/lib/kundNyckel'
import { hämtaAnteckningar } from '@/lib/kundanteckning'

/*
 * Kön hämtad ur databasen.
 *
 * Skild från kommande.ts, som är ren räkning: den här filen rör admin-klienten
 * och får därför aldrig hamna i webbläsarpaketet. Panelen importerar räkningen,
 * sidan och rutten importerar den här.
 */

type Admin = ReturnType<typeof createAdminClient>

export async function hämtaKö(
  admin: Admin, companyId: string, nu = Date.now(),
): Promise<{
  bookings: KommandeBokning[]
  inst:     KöInst
  notes:    Record<string, string>
  /* Policyn följer med tillbaka. Bokningssidan behöver samma rad till sina
     inställningar, och utan den här raden hämtade den companies en gång till —
     en extra tur till databasen för något vi just läst. */
  policy:   BookingPolicy
}> {
  /* Policyn hämtas här och inte av den som frågar. Två anropare betyder annars
     två ställen som kan glömma den, och den som glömmer får en lista där
     bokningar försvinner innan salongen hunnit bocka av dem. */
  const [mallar, kontakt, policy, notes] = await Promise.all([
    fetchTemplates(admin, companyId),
    hämtaKontaktsätt(admin, companyId),
    fetchPolicy(admin, companyId),
    hämtaAnteckningar(admin, companyId),
  ])
  const inst = köInst(mallar, kontakt)

  /* Fönstret bakåt räcker för att fånga besök vars omdömesfråga ännu inte gått.
     Längre tillbaka finns ingenting kvar att göra, och de raderna hör hemma i
     kundhistoriken. */
  const från = new Date(nu - 8 * 86_400_000).toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('bookings')
    .select('id, customer_name, customer_phone, customer_email, service_name, booking_date, start_time, status, staff_id, confirmation_sent_at, reminder_sent_at, review_sent_at, skip_reminder, skip_review')
    .eq('company_id', companyId)
    .in('status', ['confirmed', 'pending', 'completed'])
    .gte('booking_date', från)
    .order('booking_date')
    .order('start_time')
    .limit(300)

  if (error) return { bookings: [], inst, notes, policy }

  const bookings = kön((data ?? []).map(b => ({
    id:         b.id as string,
    kund:       (b.customer_name as string) ?? '',
    behandling: (b.service_name as string) ?? '',
    datum:      b.booking_date as string,
    tid:        String(b.start_time),
    status:     b.status as string,
    staffId:    (b.staff_id as string | null) ?? null,
    nyckel:     kundNyckel({
      telefon: b.customer_phone as string | null,
      epost:   b.customer_email as string | null,
      namn:    b.customer_name  as string | null,
    }),
    bekräftad:      Boolean(b.confirmation_sent_at),
    påmind:         Boolean(b.reminder_sent_at),
    omdömt:         Boolean(b.review_sent_at),
    överPåminnelse: Boolean(b.skip_reminder),
    överOmdöme:     Boolean(b.skip_review),
  })), inst, nu)

  return { bookings, inst, notes, policy }
}
