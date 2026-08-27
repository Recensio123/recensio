import { createAdminClient } from '@/lib/supabase/admin'
import { platformAdmin } from '@/lib/admin'
import { avtalAvslutat } from '@/lib/accountStatus'
import { clearSiteEverywhere } from '@/app/s/[slug]/site-data'
import { revalidatePath } from 'next/cache'
import { KontoRad } from './KontoRad'

/*
 * Kunderna, och deras avtal.
 *
 * Uppsägning gjordes tidigare med ett terminalkommando och ett lösenord ur
 * .env.local. Det fungerar, men det är fel verktyg för något som ska göras med
 * lugn hand och rätt datum — och den dagen det är bråttom är det då det blir
 * fel. Här är det en rad, ett datum och en knapp.
 */

export const dynamic = 'force-dynamic'

type Företag = {
  id: string
  name: string | null
  slug: string
  created_at: string | null
  closed_at: string | null
}

/**
 * Tvinga fram sajten på nytt.
 *
 * Sidorna är cachade och rensas när kunden sparar i panelen. Ändras något
 * någon annan väg — en rad rättad direkt i databasen, ett fält satt med ett
 * skript — vet cachen ingenting om det, och sajten fortsätter visa det gamla
 * tills dygnsskyddet löper ut. Det är inte ett fel i cachen utan priset för
 * att ha en; det som saknades var ett sätt att säga till den.
 */
export async function rensaCache(formData: FormData) {
  'use server'
  if (!(await platformAdmin())) throw new Error('Ingen behörighet')
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Företag saknas')
  await clearSiteEverywhere(id)
  revalidatePath('/admin')
}

export async function sättStatus(formData: FormData) {
  'use server'

  /* Kontrollen görs om här. Att sidan visade knappen betyder inte att den som
     skickar formuläret är samma person — ett formulär går att skicka utan att
     ha sett sidan. */
  if (!(await platformAdmin())) throw new Error('Ingen behörighet')

  const id     = String(formData.get('id') ?? '')
  const stäng  = formData.get('closed') === 'true'
  const datum  = String(formData.get('date') ?? '').trim()
  if (!id) throw new Error('Företag saknas')

  let closedAt: string | null = null
  if (stäng) {
    const d = datum ? new Date(datum) : new Date()
    if (Number.isNaN(d.getTime())) throw new Error('Datumet gick inte att tolka')
    closedAt = d.toISOString()
  }

  const admin = createAdminClient()
  const { error } = await admin.from('companies').update({ closed_at: closedAt }).eq('id', id)
  if (error) throw new Error(error.message)

  /* Efter skrivningen: rensas cachen först hinner ett besök fylla den igen med
     det gamla svaret. Utan det här ligger sajten kvar i upp till ett dygn. */
  await clearSiteEverywhere(id)
  revalidatePath('/admin')
}

export default async function AdminHem() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('companies')
    .select('id, name, slug, created_at, closed_at')
    .order('created_at', { ascending: false })

  const företag = (data ?? []) as Företag[]
  const aktiva  = företag.filter(f => !avtalAvslutat(f.closed_at))

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'var(--font-brand-sans)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Kunder</h1>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
        {aktiva.length} av {företag.length} har ett aktivt avtal.
      </p>

      {företag.length === 0 && (
        <p style={{ fontSize: 13, color: '#64748b' }}>Inga företag i databasen ännu.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {företag.map(f => (
          <KontoRad
            key={f.id}
            id={f.id}
            namn={f.name ?? f.slug}
            slug={f.slug}
            closedAt={f.closed_at}
            avslutat={avtalAvslutat(f.closed_at)}
            action={sättStatus}
            rensa={rensaCache}
          />
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.6, marginTop: 24 }}>
        Ett slutdatum framåt betyder uppsägningstid: allt fungerar fram till den dagen
        och slutar sedan av sig självt. Ingenting raderas — öppnar du avtalet igen
        ligger sajten, prislistan och bokningarna kvar som de var.
      </p>
    </div>
  )
}
