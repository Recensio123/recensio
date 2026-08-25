import type { createAdminClient } from '@/lib/supabase/admin'
import { cfConfigured } from '@/lib/cloudflare'

/*
 * Salongens domäner, som panelen vill ha dem.
 *
 * Ligger för sig så att både sidan och rutten kan läsa dem: sidan vid
 * rendering, rutten vid omläsningen efter en ändring. Fältet blinkade tomt
 * medan det väntade på sitt eget anrop — en väntan för data sidan redan hade
 * en öppen anslutning för att hämta.
 */

type Admin = ReturnType<typeof createAdminClient>

export async function domänData(admin: Admin, companyId: string) {
  const { data } = await admin
    .from('custom_domains')
    /* En sammanhängande sträng. Delas den med + tappar klienten sin
       typinformation och varje fält blir okänt. */
    .select('domain, verified_at, is_primary, mode, nameservers, imported_zone, imported_at, mail_mode, mail_forward_to, mail_verified_at')
    .eq('company_id', companyId)
    .order('created_at')

  /* Zonläget visas bara när leverantören faktiskt är uppsatt. Annars vore det
     ett val kunden kan göra som inte leder någonstans. */
  return { domains: data ?? [], zones: cfConfigured() }
}
