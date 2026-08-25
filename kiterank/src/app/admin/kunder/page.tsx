import { createAdminClient } from '@/lib/supabase/admin'
import { platformAdmin } from '@/lib/admin'
import { avtalAvslutat } from '@/lib/accountStatus'
import { hämtaOnboarding, ärKlar } from '@/lib/onboarding'
import { kundstatus, värstaLäget, type Fynd, type Underlag } from '@/lib/kundstatus'
import { syncSearchConsole, syncGA4, syncAds, syncReviews } from '@/lib/sync'
import { revalidatePath } from 'next/cache'
import { KundKort } from './KundKort'

/*
 * Kundvård.
 *
 * Konton svarar på vilka som är kunder. Den här sidan svarar på den fråga som
 * kommer efter: fungerar produkten för dem just nu.
 *
 * Skälet att den behövs är att de dyra felen är tysta. En Google-koppling som
 * dött ger ingen varning någonstans — panelen ritar en kurva som ligger still,
 * och kunden läser det som att ingen sökte. En domän som aldrig verifierades ser
 * ut som en domän. Ett bokningssystem utan tjänster ser ut som ett
 * bokningssystem tills någon försöker boka. Inget av det syns förrän kunden
 * ringer, och då har det pågått ett tag.
 *
 * Sidan hämtar därför inte ett värde per kund utan ett läge, och sorterar de
 * trasiga överst.
 */

export const dynamic = 'force-dynamic'

/** Serverns dygn. Reglerna får datumet inskickat, inte hämtat. */
function idag(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Kör om hämtningen för en kund, här och nu.
 *
 * Det är den enda åtgärd som faktiskt lagar något härifrån. Allt annat på sidan
 * är besked — det här är verktyget: står siffrorna still säger en körning
 * direkt om det var ett tillfälligt fel eller om åtkomsten är borta.
 */
export async function synkaNu(formData: FormData) {
  'use server'
  if (!(await platformAdmin())) throw new Error('Ingen behörighet')
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Företag saknas')

  await Promise.allSettled([
    syncSearchConsole(id),
    syncGA4(id),
    syncAds(id),
    syncReviews(id),
  ])
  revalidatePath('/admin/kunder')
}

type Tillhör = { company_id: string }

type Koppling = Tillhör & {
  refresh_token:      string | null
  connected_at:       string | null
  sc_site_url:        string | null
  ads_customer_id:    string | null
  ga4_property_id:    string | null
  ga4_measurement_id: string | null
  gbp_location_id:    string | null
}

type Sajt = Tillhör & {
  published: boolean | null
  content: {
    menuCategories?: Underlag['prislista']
    bookingUrl?:     string
    logo?:           string
    siteFeatures?:   { booking?: boolean }
  } | null
}

type Domän = Tillhör & {
  domain:      string
  verified_at: string | null
  created_at:  string | null
}

type Rad = {
  id:        string
  namn:      string
  slug:      string
  skapad:    string | null
  avslutat:  boolean
  fynd:      Fynd[]
  kopplad:   boolean
}

export default async function KundvårdPage() {
  const admin = createAdminClient()
  const dag   = idag()

  const { data: företagRader } = await admin
    .from('companies')
    .select('id, name, slug, created_at, closed_at, industry')
    .order('created_at', { ascending: false })

  const företag = företagRader ?? []
  if (!företag.length) {
    return (
      <div style={{ maxWidth: 900, fontFamily: 'var(--font-geist-sans)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Kundvård</h1>
        <p style={{ fontSize: 13, color: '#64748b' }}>Inga företag i databasen ännu.</p>
      </div>
    )
  }

  const ids = företag.map(f => f.id as string)

  /*
   * Bulkhämtning där det går, en fråga per kund bara där det inte går.
   *
   * "Senaste raden per företag" finns det ingen bra form för i PostgREST, och
   * att hämta hela tabellen och sortera i minnet skulle bli tyngre ju längre
   * historiken växer. De tre nyaste-frågorna är indexslagningar och går
   * samtidigt.
   */
  /* En tabell som inte migrerats ska ge en tom lista, inte fälla hela sidan.
     Supabase frågebyggare är en thenable utan catch, därav resolve. */
  async function alla<T extends Koppling | Sajt | Domän | Tillhör>(
    q: PromiseLike<{ data: unknown }>,
  ): Promise<T[]> {
    try {
      const { data } = await Promise.resolve(q)
      return (data ?? []) as T[]
    } catch { return [] }
  }

  const [koppl, sajter, domäner, tjänster, personal] = await Promise.all([
    alla<Koppling>(admin.from('google_connections')
      .select('company_id, refresh_token, connected_at, sc_site_url, ads_customer_id, ga4_property_id, ga4_measurement_id, gbp_location_id')
      .in('company_id', ids)),
    alla<Sajt>(admin.from('site_config').select('company_id, published, content').in('company_id', ids)),
    alla<Domän>(admin.from('custom_domains').select('company_id, domain, verified_at, created_at').in('company_id', ids)),
    alla<Tillhör>(admin.from('services').select('company_id').in('company_id', ids).eq('aktiv', true)),
    alla<Tillhör>(admin.from('staff').select('company_id').in('company_id', ids).eq('is_active', true)),
  ])

  const per = <T extends Tillhör>(rader: T[]) => {
    const m = new Map<string, T[]>()
    for (const r of rader) m.set(r.company_id, [...(m.get(r.company_id) ?? []), r])
    return m
  }
  const kopplPer  = new Map(koppl.map(k => [k.company_id, k]))
  const sajtPer   = new Map(sajter.map(s => [s.company_id, s]))
  const domänPer  = per(domäner)
  const tjänstPer = per(tjänster)
  const personPer = per(personal)

  const senaste = async (tabell: string, kolumn: string, id: string): Promise<string | null> => {
    try {
      const { data } = await admin.from(tabell).select(kolumn)
        .eq('company_id', id).order(kolumn, { ascending: false }).limit(1).maybeSingle()
      return (data as Record<string, string> | null)?.[kolumn] ?? null
    } catch { return null }
  }

  const rader: Rad[] = await Promise.all(företag.map(async f => {
    const id     = f.id as string
    const k      = kopplPer.get(id)
    const sajt   = sajtPer.get(id)
    const stängt = avtalAvslutat(f.closed_at as string | null)

    const [onboarding, scSenaste, ga4Senaste, gbpSenaste] = await Promise.all([
      hämtaOnboarding(admin, id).catch(() => null),
      stängt ? null : senaste('search_console_daily', 'date',       id),
      stängt ? null : senaste('ga4_snapshots',        'synced_at',  id),
      stängt ? null : senaste('gbp_snapshots',        'created_at', id),
    ])

    const innehåll = sajt?.content ?? {}

    const u: Underlag = {
      avslutat:       stängt,
      onboardingKlar: onboarding ? ärKlar(onboarding, !!sajt) : false,
      kopplad:        !!k?.refresh_token,
      kopplatSedan:   k?.connected_at ?? null,
      scSajt:         k?.sc_site_url ?? null,
      scSenaste,
      ga4Property:    k?.ga4_property_id ?? null,
      ga4Mätström:    k?.ga4_measurement_id ?? null,
      ga4Senaste,
      adsKonto:       k?.ads_customer_id ?? null,
      gbpPlats:       k?.gbp_location_id ?? null,
      gbpSenaste,
      sajtPublicerad: !!sajt?.published,
      harLogga:       !!innehåll.logo?.trim(),
      prislista:      innehåll.menuCategories,
      bransch:        (f.industry as string | null) ?? null,
      bokningsUrl:    innehåll.bookingUrl,
      harBokning:     innehåll.siteFeatures?.booking ?? false,
      antalTjänster:  (tjänstPer.get(id) ?? []).length,
      antalPersonal:  (personPer.get(id) ?? []).length,
      domäner: (domänPer.get(id) ?? []).map(d => ({
        domän:      d.domain,
        verifierad: !!d.verified_at,
        tillagd:    d.created_at,
      })),
      idag: dag,
    }

    return {
      id,
      namn:     (f.name as string | null) ?? (f.slug as string),
      slug:     f.slug as string,
      skapad:   f.created_at as string | null,
      avslutat: stängt,
      kopplad:  u.kopplad,
      fynd:     kundstatus(u),
    }
  }))

  /* Trasigt först. En lista sorterad på namn är en lista man läser igenom; en
     sorterad på allvar är en lista man arbetar av uppifrån. */
  const vikt = (r: Rad) => {
    const v = värstaLäget(r.fynd)
    return v === 'kritiskt' ? 0 : v === 'varning' ? 1 : r.avslutat ? 3 : 2
  }
  rader.sort((a, b) => vikt(a) - vikt(b) || a.namn.localeCompare(b.namn, 'sv'))

  const kritiska = rader.filter(r => värstaLäget(r.fynd) === 'kritiskt').length
  const rena     = rader.filter(r => !r.fynd.length).length

  return (
    <div style={{ maxWidth: 900, fontFamily: 'var(--font-geist-sans)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Kundvård</h1>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 18px' }}>
        Vad som slutat fungera hos kunderna, innan de hinner höra av sig. Trasigt
        först. Läses vid varje besök — ingenting cachas.
      </p>

      <div style={{
        display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap',
      }}>
        {[
          { tal: kritiska,                 text: kritiska === 1 ? 'kund behöver åtgärd' : 'kunder behöver åtgärd', färg: kritiska ? '#f87171' : '#4ade80' },
          { tal: rena,                     text: 'utan anmärkning', färg: '#94a3b8' },
          { tal: rader.filter(r => !r.avslutat).length, text: 'aktiva avtal', färg: '#94a3b8' },
        ].map(({ tal, text, färg }) => (
          <div key={text} style={{
            flex: '1 1 160px', borderRadius: 11, padding: '11px 14px',
            border: '1px solid #1e293b', background: '#0f172a',
          }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: färg }}>{tal}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{text}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rader.map(r => (
          <KundKort
            key={r.id}
            id={r.id}
            namn={r.namn}
            slug={r.slug}
            skapad={r.skapad}
            avslutat={r.avslutat}
            kopplad={r.kopplad}
            fynd={r.fynd}
            synka={synkaNu}
          />
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.7, marginTop: 22 }}>
        Reglerna ligger i <code style={{ color: '#64748b' }}>src/lib/kundstatus.ts</code> och
        provas i Tester. &quot;Synka nu&quot; kör om hämtningen från Google för den kunden —
        går den igenom var felet tillfälligt, svarar den nej är åtkomsten borta och
        kunden behöver koppla om.
      </p>
    </div>
  )
}
