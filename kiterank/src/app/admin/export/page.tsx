import { createAdminClient } from '@/lib/supabase/admin'
import { avtalAvslutat } from '@/lib/accountStatus'
import { PLAN_TEXT, ärPlan } from '@/lib/betalning'
import { betaldaMånader } from '@/lib/betaltid'
import { fårTaMedHemsidan, KRAV_MÅNADER, FÖNSTER_DAGAR } from '@/lib/exportRatt'

/*
 * Utlämning av en kunds egna uppgifter.
 *
 * Görs för hand här så länge — du hinner prata med den som är på väg att lämna,
 * och det är ibland värt mer än automatiken. Insamlingen bakom knapparna är
 * densamma som en självbetjäningsknapp kommer att använda, så flytten dit blir
 * en behörighetsändring och inget mer.
 *
 * Månadsräkningen bor i lib/betaltid och delas med avdraget för avbetald
 * formgivning. Samma löfte sett från två håll ska mätas på ett sätt.
 */

export const dynamic = 'force-dynamic'

type Rad = {
  id: string
  namn: string
  slug: string
  plan: string | null
  månader: number
  avslutat: string | null
  harBokningar: boolean
}

/**
 * Betalda månader, räknade ur Stripes betalda fakturor.
 *
 * Fakturorna och inte ett datum i vår databas: en kund kan ha pausat, bytt
 * kort mitt i, eller haft en månad som aldrig gick igenom. Det enda som räknas
 * är vad de faktiskt betalat för, och det vet Stripe exakt.
 */
export default async function ExportPage() {
  const admin = createAdminClient()

  let rader: Rad[] = []
  try {
    const { data } = await admin
      .from('companies')
      .select('id, name, slug, plan, closed_at, stripe_customer_id')
      .order('created_at', { ascending: false })
      .limit(200)

    const { data: bokningar } = await admin
      .from('bookings').select('company_id').limit(20_000)
    const medBokningar = new Set((bokningar ?? []).map(b => b.company_id as string))

    rader = await Promise.all((data ?? []).map(async f => ({
      id:      f.id as string,
      namn:    (f.name as string | null) ?? (f.slug as string),
      slug:    f.slug as string,
      plan:    f.plan as string | null,
      månader: await betaldaMånader(f.stripe_customer_id as string | null),
      avslutat: avtalAvslutat(f.closed_at as string | null) ? (f.closed_at as string) : null,
      harBokningar: medBokningar.has(f.id as string),
    })))
  } catch { /* kolumner saknas — listan blir tom, sidan lever */ }

  const knapp = {
    display: 'inline-block', padding: '6px 11px', borderRadius: 8,
    fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' as const,
  }

  return (
    <div style={{ maxWidth: 1000, fontFamily: 'var(--font-brand-sans)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Utlämning</h1>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 18px' }}>
        Kundens egna uppgifter, att lämna ut när de frågar. Kundhistoriken gäller alla — det är
        deras kunders personuppgifter och de ska tillbaka oavsett paket och oavsett tid.
        Hemsidan kräver ett designat paket och {KRAV_MÅNADER} betalda månader, och går att
        hämta i {FÖNSTER_DAGAR} dagar efter att avtalet avslutats.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', textAlign: 'left' }}>
              {['Kund', 'Paket', 'Betalda månader', 'Kundhistorik', 'Hemsida'].map(h => (
                <th key={h} style={{ padding: '6px 10px 6px 0', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rader.map(r => {
              const svar = fårTaMedHemsidan({
                plan: r.plan, betaldaMånader: r.månader, avslutat: r.avslutat,
              })
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #1e293b', opacity: r.avslutat ? 0.65 : 1 }}>
                  <td style={{ padding: '9px 10px 9px 0' }}>
                    <a href={`/admin/kund/${r.id}`} style={{ color: '#f1f5f9', fontWeight: 600, textDecoration: 'none' }}>
                      {r.namn}
                    </a>
                    <span style={{ color: '#475569', fontSize: 11, marginLeft: 8 }}>/{r.slug}</span>
                    {r.avslutat && <span style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>avslutat</span>}
                  </td>
                  <td style={{ padding: '9px 10px 9px 0', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {ärPlan(r.plan) ? PLAN_TEXT[r.plan].kort : '—'}
                  </td>
                  <td style={{ padding: '9px 10px 9px 0', color: r.månader >= KRAV_MÅNADER ? '#4ade80' : '#94a3b8', whiteSpace: 'nowrap' }}>
                    {r.månader}
                  </td>
                  <td style={{ padding: '9px 10px 9px 0' }}>
                    {r.harBokningar ? (
                      <a href={`/api/admin/export?sort=kunder&företag=${r.id}`}
                         style={{ ...knapp, background: '#1e293b', color: '#f1f5f9' }}>
                        Hämta CSV
                      </a>
                    ) : (
                      <span style={{ color: '#475569', fontSize: 12 }}>ingen historik</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 0' }}>
                    {svar.får ? (
                      <a href={`/api/admin/export?sort=hemsida&företag=${r.id}`}
                         style={{ ...knapp, background: '#f0b429', color: '#0f172a' }}>
                        Hämta hemsida
                      </a>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: 12 }}>{svar.text}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.7, marginTop: 22 }}>
        Hemsidepaketet innehåller sidorna som färdig HTML med en läs-mig. Bokningsknapparna
        skrivs om till salongens telefonnummer, eftersom bokningssystemet ingår i abonnemanget
        och inte följer med — läs-mig visar var man byter adressen om kunden vill koppla ett
        annat system. Bokningssystemet, statistiken och marknadsföringsverktygen ingår aldrig
        i utlämningen.
      </p>
    </div>
  )
}
