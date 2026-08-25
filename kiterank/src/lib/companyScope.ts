/*
 * Vilken salong anropet gäller.
 *
 * Varje domän-, zon- och mailrutt måste svara på samma fråga innan den gör
 * någonting: vem frågar, och vilket företag hör de till. Frågan ställs på ett
 * ställe så att inget svar kan glida isär från de andra — en rutt som råkar
 * hämta företaget på ett eget sätt är en rutt som kan råka nå någon annans zon.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isClosed } from '@/lib/accountStatus'

export type Scope = {
  id:    string
  admin: ReturnType<typeof createAdminClient>
}

export async function currentCompany(): Promise<Scope | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  /*
   * Ett företag per inloggning håller databasen numera (unikt index på
   * user_id). Frågan ställs ändå deterministiskt och inte med .single():
   *
   * .single() svarar med ett fel så fort det finns mer än en rad, och felet
   * blev här "ingen behörighet". En kund med en dubblett — vilket gick att få
   * innan indexet fanns — blev alltså utelåst från varje rutt som går genom
   * den här, utan att något sa varför.
   *
   * Samma ordning som currentAccess använder, så de två aldrig kan peka på
   * olika företag för samma person.
   */
  const { data } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null

  /* Avslutat avtal ger ingen behörighet. Samma svar som currentAccess ger, av
     samma skäl: ingen zon, ingen domän och ingen brevlåda ska gå att röra av
     ett konto som slutat hos oss. */
  if (await isClosed(admin, data.id as string)) return null

  return { id: data.id as string, admin }
}

/** Domänraden, men bara om den hör till den som frågar. Allt som rör en zon går
 *  genom den här: hittas ingen rad finns ingen behörighet, och de två fallen
 *  behöver inte hållas isär av anroparen. */
export async function ownDomainRow(scope: Scope, domain: string) {
  const { data } = await scope.admin
    .from('custom_domains')
    .select('*')
    .eq('company_id', scope.id)
    .eq('domain', domain)
    .single()
  return data
}
