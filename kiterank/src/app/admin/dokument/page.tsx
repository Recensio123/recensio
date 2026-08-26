import { createAdminClient } from '@/lib/supabase/admin'
import { DOKUMENTMALLAR, hämtaUnderlag } from '@/lib/kunddokument'
import { Dokumentverktyg } from './Dokumentverktyg'
import { Mallredigerare } from './Mallredigerare'

/*
 * Kunddokumenten.
 *
 * Två flikar med olika livslängd. Mallen är arbetssättet — den skrivs en gång,
 * förbättras när metoden förbättras, och gäller alla kunder. Dokumentet är en
 * leverans till en namngiven kund en given månad.
 *
 * Sidan visar underlaget innan något skapas. Det är med flit: ser du att
 * bokningarna saknas och annonserna inte är kopplade vet du att dokumentet
 * kommer att sakna sin viktigaste siffra, och då är det bättre att koppla
 * först än att skicka något halvt.
 */

export const dynamic = 'force-dynamic'

type Kund = { id: string; name: string; plan: string | null; city: string | null }

export default async function DokumentPage({
  searchParams,
}: {
  searchParams: Promise<{ kund?: string; flik?: string }>
}) {
  const params = await searchParams
  const admin  = createAdminClient()

  const { data: kunder } = await admin
    .from('companies')
    .select('id, name, plan, city')
    .is('closed_at', null)
    .order('name')

  const lista = (kunder ?? []) as Kund[]
  const vald  = params.kund ? lista.find(k => k.id === params.kund) ?? null : null
  const flik  = params.flik === 'mall' ? 'mall' : 'dokument'

  /*
   * Mallarna seedas första gången sidan öppnas, precis som avtalen. Texterna
   * är långa och ska inte klistras genom en SQL-editor.
   */
  let mallar: { slug: string; titel: string; beskrivning: string | null; innehall: string; version: string | null }[] = []
  let migrerad = true
  try {
    const läs = async () => {
      const { data, error } = await admin
        .from('dokumentmallar').select('slug, titel, beskrivning, innehall, version').order('titel')
      if (error) throw error
      return data ?? []
    }
    mallar = await läs()
    const finns = new Set(mallar.map(m => m.slug))
    const saknade = DOKUMENTMALLAR.filter(m => !finns.has(m.slug))
    if (saknade.length) {
      await admin.from('dokumentmallar').upsert(saknade, { onConflict: 'slug', ignoreDuplicates: true })
      mallar = await läs()
    }
  } catch {
    migrerad = false
  }

  const underlag = vald ? await hämtaUnderlag(vald.id) : null

  const tidigare = vald
    ? (await admin
        .from('kunddokument')
        .select('id, titel, period, status, skapad')
        .eq('company_id', vald.id)
        .order('skapad', { ascending: false })
        .limit(10)
        .then(r => r.data ?? [], () => [])) as { id: string; titel: string; period: string | null; status: string; skapad: string }[]
    : []

  if (!migrerad) {
    return (
      <div style={{ maxWidth: 900, fontFamily: 'var(--font-geist-sans)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Kunddokument</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
          Kör migrationen <code>20260915_kunddokument.sql</code> i Supabase, så fylls sidan.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, fontFamily: 'var(--font-geist-sans)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Kunddokument</h1>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 18px' }}>
        Mallen är arbetssättet och gäller alla kunder. Kundens siffror går in som förutsättningar.
        Du redigerar alltid dokumentet innan det går ut.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {([['dokument', 'Skapa dokument'], ['mall', 'Mallarna']] as const).map(([id, namn]) => (
          <a
            key={id}
            href={`/admin/dokument?flik=${id}${vald ? `&kund=${vald.id}` : ''}`}
            style={{
              padding: '7px 13px', borderRadius: 9, fontSize: 13, textDecoration: 'none',
              fontWeight: flik === id ? 700 : 500,
              background: flik === id ? '#1e293b' : 'transparent',
              border: `1px solid ${flik === id ? '#334155' : '#1e293b'}`,
              color: flik === id ? '#f1f5f9' : '#94a3b8',
            }}
          >
            {namn}
          </a>
        ))}
      </div>

      {flik === 'mall' ? (
        <Mallredigerare mallar={mallar} />
      ) : (
        <>
          {/* Kundvalet. Full service-kunder först — det är dem dokumentet är
              till för, och listan blir lång när kunderna blir många. */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {lista
              .slice()
              .sort((a, b) => Number(b.plan === 'fullservice') - Number(a.plan === 'fullservice'))
              .map(k => {
                const aktiv = vald?.id === k.id
                return (
                  <a
                    key={k.id}
                    href={`/admin/dokument?kund=${k.id}`}
                    style={{
                      padding: '6px 11px', borderRadius: 8, fontSize: 12.5, textDecoration: 'none',
                      background: aktiv ? '#1e293b' : 'transparent',
                      border: `1px solid ${aktiv ? '#334155' : '#1e293b'}`,
                      color: aktiv ? '#f1f5f9' : '#94a3b8',
                    }}
                  >
                    {k.name}
                    {k.plan === 'fullservice' && (
                      <span style={{ color: '#f0b429', marginLeft: 6, fontSize: 11 }}>full service</span>
                    )}
                  </a>
                )
              })}
          </div>

          {!vald && (
            <p style={{ fontSize: 13, color: '#64748b' }}>Välj en kund för att se underlaget.</p>
          )}

          {vald && underlag && (
            <Dokumentverktyg
              kundId={vald.id}
              kundNamn={vald.name}
              mallar={mallar.map(m => ({ slug: m.slug, titel: m.titel }))}
              underlag={underlag}
              tidigare={tidigare}
            />
          )}
        </>
      )}
    </div>
  )
}
