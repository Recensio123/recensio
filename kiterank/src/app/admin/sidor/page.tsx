import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_TEXT, ärPlan } from '@/lib/betalning'
import { PUBLICERING, PUBLICERINGAR_KVAR } from '@/lib/sidarkiv'
import { ArkiveraKnapp, ÅterställKnapp } from './SidarkivKnappar'

/*
 * Sidarkivet — allt du byggt åt kunder, sparat.
 *
 * Formgivning är arbete som utförts en gång, och det ska aldrig behöva göras
 * om. En kund som gick ned till mallpaketet, ändrade sig, eller själv råkade
 * förstöra sin sida ska kunna få tillbaka den.
 *
 * Kunder utan kopia listas också, och med flit överst i sin grupp. En lista
 * som bara visar det som finns sparat döljer det enda som faktiskt är
 * brådskande: det som inte gör det.
 */

export const dynamic = 'force-dynamic'

type Kopia = {
  id:        string
  etikett:   string | null
  anledning: string | null
  template:  string | null
  skapad:    string
}

type Kund = {
  id:       string
  namn:     string
  slug:     string
  plan:     string | null
  harSajt:  boolean
  mall:     string | null
  kopior:   Kopia[]
}

export default async function SidorPage() {
  const admin = createAdminClient()

  let kunder: Kund[] = []
  let migrerad = true

  try {
    const { data: företag } = await admin
      .from('companies')
      .select('id, name, slug, plan')
      .order('created_at', { ascending: false })
      .limit(300)

    const ids = (företag ?? []).map(f => f.id as string)

    const { data: sajter } = await admin
      .from('site_config')
      .select('company_id, template, content')
      .in('company_id', ids)

    const sajtFör = new Map((sajter ?? []).map(s => [
      s.company_id as string,
      { mall: s.template as string | null, harInnehåll: Boolean(s.content) },
    ]))

    const { data: arkiv, error } = await admin
      .from('site_arkiv')
      .select('id, company_id, etikett, anledning, template, skapad')
      .in('company_id', ids)
      .order('skapad', { ascending: false })
      .limit(1000)
    if (error) throw error

    const kopiorFör = new Map<string, Kopia[]>()
    for (const k of arkiv ?? []) {
      const lista = kopiorFör.get(k.company_id as string) ?? []
      lista.push({
        id: k.id as string, etikett: k.etikett as string | null,
        anledning: k.anledning as string | null,
        template: k.template as string | null, skapad: k.skapad as string,
      })
      kopiorFör.set(k.company_id as string, lista)
    }

    kunder = (företag ?? []).map(f => {
      const sajt = sajtFör.get(f.id as string)
      return {
        id:      f.id as string,
        namn:    (f.name as string | null) ?? (f.slug as string),
        slug:    f.slug as string,
        plan:    f.plan as string | null,
        harSajt: Boolean(sajt?.harInnehåll),
        mall:    sajt?.mall ?? null,
        kopior:  kopiorFör.get(f.id as string) ?? [],
      }
    })
  } catch {
    migrerad = false
  }

  if (!migrerad) {
    return (
      <div style={{ maxWidth: 940, fontFamily: 'var(--font-geist-sans)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Sidor</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
          Kör migrationen <code>20260912_sidarkiv.sql</code> i Supabase, så fylls sidan.
        </p>
      </div>
    )
  }

  /* Formgivna sidor utan kopia överst — det är de som är värda arbete att
     återskapa och de enda som kräver något av dig. */
  const vikt = (k: Kund) => {
    const formgiven = k.plan === 'design' || k.plan === 'fullservice'
    if (formgiven && k.harSajt && !k.kopior.length) return 0
    if (formgiven) return 1
    if (k.harSajt && !k.kopior.length) return 2
    return 3
  }
  kunder.sort((a, b) => vikt(a) - vikt(b) || a.namn.localeCompare(b.namn, 'sv'))

  const utanKopia = kunder.filter(k => vikt(k) === 0).length

  return (
    <div style={{ maxWidth: 940, fontFamily: 'var(--font-geist-sans)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Sidor</h1>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 18px' }}>
        Allt du byggt åt kunder, sparat. En kopia innehåller mall, språk, funktioner och hela
        innehållet — den överlever att kunden ändrar sin sajt, går ned ett paket eller säger upp.
        Varje gång en kund sparar sin sida tas en kopia av den publicerade versionen; de{' '}
        {PUBLICERINGAR_KVAR} senaste behålls, och sparningar inom samma halvtimme räknas som en.
        Grå prick är en sådan automatisk kopia, gul är en du eller en nedgradering skapat — de
        gallras aldrig.
      </p>

      {utanKopia > 0 && (
        <p style={{
          margin: '0 0 16px', padding: '10px 13px', borderRadius: 10, fontSize: 13,
          border: '1px solid rgba(240,180,41,0.3)', background: 'rgba(240,180,41,0.06)',
          color: '#f0b429', lineHeight: 1.6,
        }}>
          {utanKopia === 1
            ? 'En formgiven sida saknar kopia.'
            : `${utanKopia} formgivna sidor saknar kopia.`}
          {' '}De ligger överst.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {kunder.map(k => (
          <div key={k.id} style={{
            border: '1px solid #1e293b', borderRadius: 11, padding: '12px 15px',
            background: vikt(k) === 0 ? 'rgba(240,180,41,0.04)' : '#0f172a',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <a href={`/admin/kund/${k.id}`} style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                {k.namn}
              </a>
              <a
                href={`/s/${k.slug}`} target="_blank" rel="noopener noreferrer"
                style={{ color: '#64748b', fontSize: 11, textDecoration: 'underline' }}
              >
                /{k.slug}
              </a>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>
                {ärPlan(k.plan) ? PLAN_TEXT[k.plan].kort : '—'}
              </span>
              {k.mall && <span style={{ color: '#475569', fontSize: 11 }}>mall: {k.mall}</span>}
              <span style={{ marginLeft: 'auto' }}>
                <ArkiveraKnapp companyId={k.id} harSajt={k.harSajt} />
              </span>
            </div>

            {k.kopior.length ? (
              <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {k.kopior.map(kop => (
                  <div key={kop.id} style={{
                    display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap',
                    fontSize: 12, color: '#94a3b8',
                    paddingTop: 5, borderTop: '1px solid #1e293b',
                  }}>
                    {/* Prick på de automatiska. De är många och likadana; de
                        avsiktliga är få och betyder något. */}
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: kop.anledning === PUBLICERING ? '#334155' : '#f0b429',
                    }} />
                    <span style={{ color: '#cbd5e1' }}>
                      {kop.etikett ?? 'Kopia'}
                    </span>
                    <span style={{ color: '#475569', fontSize: 11 }}>
                      {new Date(kop.skapad).toLocaleString('sv-SE')}
                    </span>
                    {kop.template && (
                      <span style={{ color: '#475569', fontSize: 11 }}>{kop.template}</span>
                    )}
                    <span style={{ marginLeft: 'auto' }}>
                      <ÅterställKnapp arkivId={kop.id} etikett={kop.etikett ?? 'kopian'} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: '7px 0 0', fontSize: 12, color: '#64748b' }}>
                {k.harSajt ? 'Ingen kopia sparad än.' : 'Kunden har ingen sajt.'}
              </p>
            )}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.7, marginTop: 22 }}>
        Lägg tillbaka skriver över kundens nuvarande sajt med den valda kopian, och tar först en
        kopia av det som skrivs över — så går även en felaktig återställning att ångra. Kunden
        ser ändringen direkt.
      </p>
    </div>
  )
}
