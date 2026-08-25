import { createAdminClient } from '@/lib/supabase/admin'
import { avtalAvslutat } from '@/lib/accountStatus'
import { kontoLäge, LÄGE_TEXT, PLAN_TEXT, ärPlan, SMS_PRIS_KR } from '@/lib/betalning'
import { betaldaMånader } from '@/lib/betaltid'
import { KRAV_MÅNADER, avdragGäller, AVBETALD_RABATT_KR } from '@/lib/exportRatt'
import type { DesignBrief } from '@/lib/onboarding'

/*
 * En kund, samlad.
 *
 * Uppgifterna om en salong ligger utspridda över fem tabeller och tre externa
 * tjänster — företagsraden, sajten, bokningarna, inloggningen, Stripe. Varje
 * adminvy visar sin skiva av det, vilket duger när man letar efter något
 * bestämt och inte alls när någon ringer.
 *
 * Den här sidan är svaret på "vem är det som ringer". Allt på ett ställe, i
 * den ordning frågorna brukar komma: vem, vad betalar de, vad har de, och vad
 * händer just nu.
 */

export const dynamic = 'force-dynamic'

function Rad({ etikett, värde, ton }: {
  etikett: string; värde: React.ReactNode; ton?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderTop: '1px solid #1e293b' }}>
      <span style={{ fontSize: 12, color: '#64748b', minWidth: 150, flexShrink: 0 }}>{etikett}</span>
      <span style={{ fontSize: 13, color: ton ?? '#cbd5e1', wordBreak: 'break-word' }}>{värde}</span>
    </div>
  )
}

function Kort({ rubrik, children }: { rubrik: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #1e293b', borderRadius: 11, padding: '13px 16px', background: '#0f172a' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>{rubrik}</h2>
      {children}
    </div>
  )
}

export default async function KundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: f } = await admin
    .from('companies')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!f) {
    return (
      <div style={{ maxWidth: 900, fontFamily: 'var(--font-geist-sans)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Kunden hittades inte</h1>
        <a href="/admin" style={{ fontSize: 13, color: '#94a3b8' }}>← Tillbaka</a>
      </div>
    )
  }

  /* Inloggningsadressen bor hos inloggningstjänsten, inte på företagsraden.
     Den är skild från kontaktadressen med flit: den ena loggar in, den andra
     står på hemsidan, och de är sällan samma. */
  let inloggning: string | null = null
  try {
    const { data } = await admin.auth.admin.getUserById(f.user_id as string)
    inloggning = data?.user?.email ?? null
  } catch { /* går inte att slå upp — resten av sidan lever ändå */ }

  const [sajt, personal, bokningar, arkiv, sms, koppling] = await Promise.all([
    admin.from('site_config').select('template, language, content, updated_at').eq('company_id', id).maybeSingle(),
    admin.from('staff').select('id', { count: 'exact', head: true }).eq('company_id', id),
    admin.from('bookings').select('status').eq('company_id', id).limit(5000),
    admin.from('site_arkiv').select('id', { count: 'exact', head: true }).eq('company_id', id),
    admin.from('message_events').select('id', { count: 'exact', head: true })
      .eq('company_id', id).eq('channel', 'sms')
      .gte('sent_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    admin.from('google_connections').select('refresh_token, ga4_property_id, sc_site_url, ads_customer_id')
      .eq('company_id', id).maybeSingle(),
  ])

  const rader   = bokningar.data ?? []
  const kommande = rader.filter(b => b.status === 'confirmed').length
  const gjorda   = rader.filter(b => b.status === 'completed').length

  const läge = kontoLäge({
    subscription_status: f.subscription_status as string | null,
    trial_ends_at:       f.trial_ends_at as string | null,
    current_period_end:  f.current_period_end as string | null,
  })
  const månader = await betaldaMånader(f.stripe_customer_id as string | null)
  const avslutat = avtalAvslutat(f.closed_at as string | null)

  const datum = (v: unknown) => v ? new Date(String(v)).toLocaleDateString('sv-SE') : '—'
  const innehåll = (sajt.data?.content ?? {}) as Record<string, unknown>

  const brief = (f.design_brief ?? null) as DesignBrief | null

  /* Paketnamnet genom typvakten. Kolumnen är fri text i databasen, och en rad
     från byggtiden kan bära vad som helst. */
  const paketnamn = (v: unknown, kort = false) =>
    ärPlan(v) ? (kort ? PLAN_TEXT[v].kort : PLAN_TEXT[v].namn) : String(v ?? '—')

  return (
    <div style={{ maxWidth: 900, fontFamily: 'var(--font-geist-sans)' }}>
      <a href="/admin" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>← Konton</a>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', margin: '6px 0 4px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
          {(f.name as string | null) ?? (f.slug as string)}
        </h1>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: LÄGE_TEXT[läge].färg }} />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{LÄGE_TEXT[läge].ord}</span>
        </span>
        {avslutat && <span style={{ fontSize: 12, color: '#f87171' }}>avtalet avslutat</span>}
      </div>

      <p style={{ fontSize: 12, color: '#475569', margin: '0 0 18px' }}>
        Kund sedan {datum(f.created_at)} · {månader} betalda månader
      </p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>

        <Kort rubrik="Kontakt">
          <Rad etikett="Inloggning" värde={inloggning ?? '—'} />
          <Rad etikett="Kontaktadress" värde={(f.contact_email as string | null) ?? '—'} />
          <Rad etikett="Telefon" värde={(f.contact_phone as string | null) ?? '—'} />
          <Rad etikett="Ort" värde={[f.postal_code, f.city].filter(Boolean).join(' ') || '—'} />
          <Rad etikett="Land" värde={(f.country as string | null) ?? '—'} />
        </Kort>

        <Kort rubrik="Abonnemang">
          <Rad
            etikett="Paket"
            värde={`${paketnamn(f.plan)}${f.faktureringsintervall === 'ar' ? ' · årsvis' : ''}`}
          />
          <Rad
            etikett="Bokningssystem"
            värde={f.har_bokning ? 'Ja' : f.bokning_till ? `Uppsagt, gäller till ${datum(f.bokning_till)}` : 'Nej'}
            ton={f.har_bokning ? '#4ade80' : undefined}
          />
          {f.plan_byte_till ? (
            <Rad
              etikett="Köat byte"
              värde={`${paketnamn(f.plan_byte_till, true)} den ${datum(f.plan_byte_datum)}`}
              ton="#f0b429"
            />
          ) : null}
          <Rad etikett="Prov till" värde={datum(f.trial_ends_at)} />
          <Rad etikett="Betald till" värde={datum(f.current_period_end)} />
          <Rad
            etikett="Rabatt"
            värde={[
              Number(f.rabatt_procent ?? 0) > 0 ? `${f.rabatt_procent} %` : null,
              avdragGäller(f.plan as string | null, f.sida_avbetald as string | null)
                ? `${AVBETALD_RABATT_KR} kr (sidan avbetald)` : null,
            ].filter(Boolean).join(' + ') || 'Ingen'}
          />
          <Rad
            etikett="Sidan avbetald"
            värde={f.sida_avbetald
              ? `Ja, ${datum(f.sida_avbetald)}`
              : `Nej — ${månader} av ${KRAV_MÅNADER} månader`}
          />
          <Rad
            etikett="Stripe"
            värde={f.stripe_customer_id ? (
              <a
                href={`https://dashboard.stripe.com/customers/${f.stripe_customer_id}`}
                target="_blank" rel="noopener noreferrer"
                style={{ color: '#94a3b8', textDecoration: 'underline' }}
              >
                Öppna kunden →
              </a>
            ) : 'ingen kund än'}
          />
        </Kort>

        <Kort rubrik="Hemsidan">
          <Rad
            etikett="Adress"
            värde={
              <a href={`/s/${f.slug}`} target="_blank" rel="noopener noreferrer"
                 style={{ color: '#94a3b8', textDecoration: 'underline' }}>
                /s/{f.slug as string}
              </a>
            }
          />
          <Rad etikett="Bransch" värde={(f.industry as string | null) ?? '—'} />
          <Rad etikett="Mall" värde={sajt.data?.template ?? '—'} />
          <Rad etikett="Språk" värde={sajt.data?.language ?? '—'} />
          <Rad etikett="Rubrik på sidan" värde={String(innehåll.heroTitle ?? innehåll.headline ?? '—').slice(0, 80)} />
          <Rad etikett="Senast ändrad" värde={sajt.data?.updated_at ? new Date(String(sajt.data.updated_at)).toLocaleString('sv-SE') : '—'} />
          <Rad
            etikett="Sparade kopior"
            värde={
              <a href="/admin/sidor" style={{ color: '#94a3b8', textDecoration: 'underline' }}>
                {arkiv.count ?? 0} st →
              </a>
            }
          />
        </Kort>

        {/* Designunderlaget, när det finns. Bara premiumkunder svarar på det,
            och det är arbetsordern för sidan du ska bygga — därför utskrivet
            i klartext och inte som en JSON-klump att tyda. */}
        {brief && (
          <Kort rubrik="Designunderlag">
            <Rad etikett="Känsla" värde={brief.kansla?.length ? brief.kansla.join(', ') : '—'} />
            {/* Färgkoderna, och rutorna intill. En hexkod går inte att bedöma
                genom att läsa den — du ska se färgen du ska rita med. */}
            <Rad
              etikett="Färger"
              värde={
                (brief.farger ?? []).filter(Boolean).length ? (
                  <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {(brief.farger ?? []).filter(Boolean).map(f => (
                      <span key={f} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: 4, background: f,
                          border: '1px solid #334155', display: 'inline-block',
                        }} />
                        <code style={{ fontSize: 12 }}>{f}</code>
                      </span>
                    ))}
                  </span>
                ) : '—'
              }
            />
            {(brief.forebilder ?? []).filter(f => f?.url?.trim()).map((f, i) => (
              <Rad
                key={i}
                etikett={`Förebild ${i + 1}`}
                värde={f.kommentar?.trim() ? `${f.url} — ${f.kommentar}` : f.url}
              />
            ))}
            <Rad etikett="Övrigt" värde={brief.ovrigt || '—'} />
          </Kort>
        )}

        <Kort rubrik="Verksamheten">
          <Rad etikett="Personal" värde={`${personal.count ?? 0} st`} />
          <Rad etikett="Bokningar" värde={`${kommande} kommande · ${gjorda} genomförda`} />
          <Rad
            etikett="SMS denna månad"
            värde={`${sms.count ?? 0} st${(sms.count ?? 0) > 0 ? ` · ${((sms.count ?? 0) * SMS_PRIS_KR).toLocaleString('sv-SE')} kr` : ''}`}
          />
          <Rad
            etikett="Google kopplat"
            värde={koppling.data?.refresh_token ? 'Ja' : 'Nej'}
            ton={koppling.data?.refresh_token ? '#4ade80' : '#f87171'}
          />
          <Rad etikett="Besöksmätning" värde={koppling.data?.ga4_property_id ? 'Ja' : 'Nej'} />
          <Rad etikett="Sökdata" värde={koppling.data?.sc_site_url ? 'Ja' : 'Nej'} />
          <Rad etikett="Annonskonto" värde={koppling.data?.ads_customer_id ? 'Ja' : 'Nej'} />
        </Kort>
      </div>

      <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.7, marginTop: 20 }}>
        Inloggningsadressen kommer från inloggningstjänsten och är skild från kontaktadressen
        med flit — den ena loggar in, den andra står på hemsidan, och de är sällan samma.
        Betalda månader räknas ur Stripes betalda fakturor och styr både avdraget och rätten
        att ta med sig hemsidan.
      </p>
    </div>
  )
}
