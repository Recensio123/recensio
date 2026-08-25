import { createAdminClient } from '@/lib/supabase/admin'
import { avtalAvslutat } from '@/lib/accountStatus'
import {
  kontoLäge, LÄGE_TEXT, stripeKonfigurerad, PLAN_TEXT, SMS_PRIS_KR,
  ärPlan, type KontoLäge,
} from '@/lib/betalning'
import { RabattCell } from './RabattCell'
import { ForfraganRad } from './ForfraganRad'

/*
 * Kunderna, sedda genom pengarna.
 *
 * Kundvård svarar på "fungerar produkten för dem". Den här svarar på frågan
 * bredvid: betalar de, vad, och till när. En rad per kund — plan, läge,
 * provdagar kvar, betald till, månadens SMS — sorterad så att det som kräver
 * handling står överst: förfallna betalningar, sedan utgångna prov.
 *
 * Allt läses ur vår egen databas, dit webhooken skriver Stripes besked.
 * Sidan ringer aldrig Stripe: en adminvy som väntar på ett externt API är
 * långsam jämt och tom när API:t har en dålig dag. Länken per kund öppnar
 * Stripes egen kundvy för det som bara finns där — enskilda fakturor,
 * kortdetaljer, händelselogg.
 */

export const dynamic = 'force-dynamic'

type Rad = {
  id:        string
  namn:      string
  slug:      string
  läge:      KontoLäge
  plan:      string | null
  /** Dagar kvar på provet. Null när kontot inte är på prov. */
  provKvar:  number | null
  betaldTill: string | null
  stripeKund: string | null
  smsMånad:  number
  rabatt:    number
  bokning:   boolean
  intervall: string | null
  avslutat:  boolean
}

function datum(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('sv-SE') : '—'
}

export default async function BetalningPage() {
  const admin = createAdminClient()
  const nu = new Date()

  let rader: Rad[] = []
  let migrerad = true

  try {
    const { data: företag, error } = await admin
      .from('companies')
      .select('id, name, slug, plan, har_bokning, faktureringsintervall, subscription_status, trial_ends_at, current_period_end, stripe_customer_id, closed_at, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error

    /* Månadens SMS per kund, i en fråga: utskicksloggen sedan den första.
       Det är raden som blir fakturarad — ett pris per skickat SMS, oavsett
       längd — så samma räkning som Stripe kommer att få. */
    const månadsstart = new Date(nu.getFullYear(), nu.getMonth(), 1).toISOString()
    const smsPer = new Map<string, number>()
    try {
      const { data: sms } = await admin
        .from('message_events')
        .select('company_id')
        .eq('channel', 'sms')
        .gte('sent_at', månadsstart)
        .limit(10000)
      for (const r of sms ?? []) {
        smsPer.set(r.company_id as string, (smsPer.get(r.company_id as string) ?? 0) + 1)
      }
    } catch { /* utskicksloggen inte migrerad — kolumnen visar noll */ }

    /* Rabatterna, i en egen fråga som får misslyckas: en databas utan
       rabattmigrationen ska visa betalvyn ändå, bara utan rabattkolumnen
       ifylld. */
    const rabattPer = new Map<string, number>()
    try {
      const { data: rab } = await admin.from('companies').select('id, rabatt_procent')
      for (const r of rab ?? []) rabattPer.set(r.id as string, (r.rabatt_procent as number | null) ?? 0)
    } catch { /* rabattmigrationen inte körd */ }

    rader = (företag ?? []).map(f => {
      const läge = kontoLäge({
        subscription_status: f.subscription_status as string | null,
        trial_ends_at:       f.trial_ends_at as string | null,
        current_period_end:  f.current_period_end as string | null,
      }, nu)

      const provKvar = läge === 'prov' && f.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(f.trial_ends_at as string).getTime() - nu.getTime()) / 86_400_000))
        : null

      return {
        id:        f.id as string,
        namn:      (f.name as string | null) ?? (f.slug as string),
        slug:      f.slug as string,
        läge,
        plan:      f.plan as string | null,
        provKvar,
        betaldTill: läge === 'aktiv' ? (f.current_period_end as string | null) : null,
        stripeKund: f.stripe_customer_id as string | null,
        smsMånad:  smsPer.get(f.id as string) ?? 0,
        rabatt:    rabattPer.get(f.id as string) ?? 0,
        bokning:   Boolean(f.har_bokning),
        intervall: f.faktureringsintervall as string | null,
        avslutat:  avtalAvslutat(f.closed_at as string | null),
      }
    })
  } catch {
    migrerad = false
  }

  if (!migrerad) {
    return (
      <div style={{ maxWidth: 940, fontFamily: 'var(--font-geist-sans)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Betalning</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
          Betalkolumnerna saknas ännu — kör migrationerna <code>20260903_betalning.sql</code>,{' '}
          <code>20260904_rabatt.sql</code> och <code>20260905_paketmodell.sql</code> i Supabase,
          i den ordningen. Redan körda filer gör ingen skada att köra igen.
        </p>
      </div>
    )
  }

  /* Obesvarade uppgraderingsförfrågningar. Egen fråga som får misslyckas — en
     databas utan tabellen ska visa betalvyn ändå. */
  type Förfrågan = { id: string; namn: string; från: string | null; till: string; skapad: string }
  let förfrågningar: Förfrågan[] = []
  try {
    const { data } = await admin
      .from('paket_forfragan')
      .select('id, company_id, fran_plan, till_plan, skapad')
      .is('hanterad', null)
      .order('skapad', { ascending: true })
      .limit(50)
    const namnFör = new Map(rader.map(r => [r.id, r.namn]))
    förfrågningar = (data ?? []).map(f => ({
      id:     f.id as string,
      namn:   namnFör.get(f.company_id as string) ?? '—',
      från:   ärPlan(f.fran_plan) ? PLAN_TEXT[f.fran_plan].kort : null,
      till:   ärPlan(f.till_plan) ? PLAN_TEXT[f.till_plan].kort : String(f.till_plan),
      skapad: f.skapad as string,
    }))
  } catch { /* tabellen inte skapad */ }

  /* Handling överst: förfallna, sedan utgångna prov, sedan löpande prov (kortast
     kvar först), sedan betalande. Avslutade sist — de är historik. */
  const vikt: Record<KontoLäge, number> = {
    förfallen: 0, 'prov-slut': 1, prov: 2, ingen: 3, aktiv: 4, uppsagd: 5,
  }
  rader.sort((a, b) =>
    (a.avslutat ? 1 : 0) - (b.avslutat ? 1 : 0)
    || vikt[a.läge] - vikt[b.läge]
    || (a.provKvar ?? 99) - (b.provKvar ?? 99)
    || a.namn.localeCompare(b.namn, 'sv'))

  const räkna = (l: KontoLäge) => rader.filter(r => !r.avslutat && r.läge === l).length
  const stripeBas = 'https://dashboard.stripe.com/customers/'

  return (
    <div style={{ maxWidth: 940, fontFamily: 'var(--font-geist-sans)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Betalning</h1>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 18px' }}>
        Vem som betalar, vad, och till när. Skrivet av Stripes besked via webhooken —
        raden här är kontots läge, länken öppnar kunden hos Stripe.
        {!stripeKonfigurerad() && ' Stripe är inte konfigurerat ännu, så lägena kommer från registreringen (prov) tills nycklarna finns.'}
      </p>

      {/* Obesvarade uppgraderingar först. De är det enda på sidan som väntar
          på dig — resten är läsning. */}
      {förfrågningar.length > 0 && (
        <div style={{
          marginBottom: 18, borderRadius: 11, padding: '12px 15px',
          border: '1px solid rgba(240,180,41,0.3)', background: 'rgba(240,180,41,0.06)',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#f0b429' }}>
            {förfrågningar.length === 1 ? 'En kund vill uppgradera' : `${förfrågningar.length} kunder vill uppgradera`}
          </p>
          {förfrågningar.map(f => (
            <ForfraganRad key={f.id} {...f} />
          ))}
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
            Uppgraderingar verkställs för hand — en designad sida ska formges först. Lägg om
            abonnemanget hos Stripe när ni kommit överens, så följer panelen med. Hanterad
            tar bort raden härifrån men sparar frågan; en kund som frågar igen om ett halvår
            säger något.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {([
          ['aktiv',      räkna('aktiv')],
          ['prov',       räkna('prov')],
          ['prov-slut',  räkna('prov-slut')],
          ['förfallen',  räkna('förfallen')],
        ] as [KontoLäge, number][]).map(([l, n]) => (
          <div key={l} style={{
            flex: '1 1 140px', borderRadius: 11, padding: '11px 14px',
            border: '1px solid #1e293b', background: '#0f172a',
          }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: n ? LÄGE_TEXT[l].färg : '#334155' }}>{n}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{LÄGE_TEXT[l].ord.toLowerCase()}</p>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', textAlign: 'left' }}>
              {['Kund', 'Läge', 'Paket', 'Bokning', 'Prov kvar', 'Betald till', 'SMS i månad', 'Rabatt', 'Stripe'].map(h => (
                <th key={h} style={{ padding: '6px 10px 6px 0', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rader.map(r => (
              <tr key={r.id} style={{
                borderTop: '1px solid #1e293b',
                opacity: r.avslutat ? 0.55 : 1,
              }}>
                <td style={{ padding: '9px 10px 9px 0' }}>
                  <a href={`/admin/kund/${r.id}`} style={{ color: '#f1f5f9', fontWeight: 600, textDecoration: 'none' }}>
                    {r.namn}
                  </a>
                  <span style={{ color: '#475569', fontSize: 11, marginLeft: 8 }}>/{r.slug}</span>
                  {r.avslutat && <span style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>avslutat</span>}
                </td>
                <td style={{ padding: '9px 10px 9px 0', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: LÄGE_TEXT[r.läge].färg }} />
                    <span style={{ color: '#cbd5e1' }}>{LÄGE_TEXT[r.läge].ord}</span>
                  </span>
                </td>
                <td style={{ padding: '9px 10px 9px 0', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {ärPlan(r.plan) ? PLAN_TEXT[r.plan].kort : r.plan ?? '—'}
                  {r.intervall === 'ar' && <span style={{ color: '#64748b', fontSize: 11, marginLeft: 6 }}>årsvis</span>}
                </td>
                <td style={{ padding: '9px 10px 9px 0', whiteSpace: 'nowrap' }}>
                  <span style={{ color: r.bokning ? '#4ade80' : '#475569' }}>{r.bokning ? 'Ja' : '—'}</span>
                </td>
                <td style={{ padding: '9px 10px 9px 0', color: r.provKvar !== null && r.provKvar <= 2 ? '#fb923c' : '#94a3b8', whiteSpace: 'nowrap' }}>
                  {r.provKvar !== null ? `${r.provKvar} ${r.provKvar === 1 ? 'dag' : 'dagar'}` : '—'}
                </td>
                <td style={{ padding: '9px 10px 9px 0', color: '#94a3b8', whiteSpace: 'nowrap' }}>{datum(r.betaldTill)}</td>
                <td style={{ padding: '9px 10px 9px 0', color: r.smsMånad ? '#cbd5e1' : '#475569', whiteSpace: 'nowrap' }}>
                  {r.smsMånad} st
                  {r.smsMånad > 0 && (
                    <span style={{ color: '#64748b', fontSize: 11, marginLeft: 6 }}>
                      {(r.smsMånad * SMS_PRIS_KR).toLocaleString('sv-SE')} kr
                    </span>
                  )}
                </td>
                <td style={{ padding: '9px 10px 9px 0' }}>
                  <RabattCell companyId={r.id} procent={r.rabatt} />
                </td>
                <td style={{ padding: '9px 0', whiteSpace: 'nowrap' }}>
                  {r.stripeKund ? (
                    <a
                      href={`${stripeBas}${r.stripeKund}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: '#94a3b8', fontSize: 12, textDecoration: 'underline' }}
                    >
                      Öppna hos Stripe →
                    </a>
                  ) : (
                    <span style={{ color: '#475569', fontSize: 12 }}>ingen kund än</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.7, marginTop: 22 }}>
        SMS-kolumnen räknar skickade meddelanden ur utskicksloggen sedan den första i
        månaden, à {SMS_PRIS_KR} kr. Varje skickat SMS rapporteras samtidigt till Stripes
        mätare och hamnar på nästa faktura, så talet här är en avstämning mot det Stripe
        redan räknat — inte ett underlag du behöver föra över någonstans.
        Rabatten gäller hela fakturan,
        SMS-raderna inräknade: löpande abonnemang får kupongen direkt, kunder som inte
        börjat betala får den i kassan. Uppsägningar och avstängningar görs under
        Konton; det här är läsning, plus dörren in till Stripe.
      </p>
    </div>
  )
}
