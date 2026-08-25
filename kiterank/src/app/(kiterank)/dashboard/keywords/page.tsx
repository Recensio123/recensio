import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SEODashboardTest2 }      from './SEODashboardTest2'
import { dataläge, harSiffror } from '@/lib/datalage'
import { visaExempel } from '@/lib/datalage.server'
import { TomtLage } from '@/components/dashboard/TomtLage'
import { PageHeader } from '@/components/dashboard/PageHeader'

const mockQueries = [
  { query: 'frisör södermalm',              clicks: 45, impressions:  880, ctr: 0.051, position:  3.2, clicksChange:  18, positionChange: -1 },
  { query: 'frisör stockholm',              clicks: 18, impressions:  860, ctr: 0.021, position:  2.4, clicksChange:   5, positionChange:  0 },
  { query: 'klippning dam södermalm',       clicks: 12, impressions:  320, ctr: 0.038, position:  8.1, clicksChange:  33, positionChange: -2 },
  { query: 'balayage stockholm',            clicks:  8, impressions:  210, ctr: 0.038, position:  6.3, clicksChange: -12, positionChange:  1 },
  { query: 'klippning pris stockholm',      clicks:  4, impressions:  590, ctr: 0.007, position:  5.1, clicksChange:   0, positionChange:  0 },
  { query: 'hårfärgning stockholm',         clicks:  2, impressions: 1200, ctr: 0.002, position: 34,   clicksChange: -25, positionChange:  4 },
  { query: 'keratinbehandling stockholm',   clicks:  1, impressions:  590, ctr: 0.002, position: 28,   clicksChange:   0, positionChange:  0 },
  { query: 'drop in frisör södermalm',      clicks:  0, impressions:  210, ctr: 0,     position:  9.4, clicksChange:   0, positionChange: -1 },
  { query: 'boka frisör online',            clicks:  6, impressions:  140, ctr: 0.043, position:  4.7, clicksChange:  50, positionChange: -3 },
  { query: 'billig frisör stockholm',       clicks:  3, impressions:  440, ctr: 0.007, position:  7.2, clicksChange:  -8, positionChange:  2 },
]

/*
 * Exempelsalongens söktrafik, dygn för dygn.
 *
 * Samma form som det synken sparar, så att exempelläget och ett skarpt konto
 * går genom exakt samma räkning. Förut var exemplet en färdig månadskurva som
 * bara exempelläget kunde rita — och som därför aldrig blev provad mot den
 * väg riktig data tar.
 *
 * Formen är en salongs år: sommaren tunn, hösten stark, en långsam tillväxt
 * ovanpå. Veckodagen räknas med, för söktrafik faller på söndagar.
 */
function exempelDagar(idag: string, antal = 400) {
  const ut: { date: string; clicks: number; impressions: number; position: number }[] = []
  const start = new Date(`${idag}T12:00:00`)

  for (let i = antal - 1; i >= 0; i--) {
    const d = new Date(start)
    d.setDate(d.getDate() - i)
    const datum = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const säsong  = [0.95, 0.92, 1.02, 1.05, 1.10, 1.00, 0.62, 1.08, 1.06, 1.00, 1.04, 1.28][d.getMonth()]
    const veckdag = [0.55, 1.15, 1.12, 1.08, 1.05, 0.95, 0.70][d.getDay()]
    const växt    = 1 + (antal - i) * 0.0009
    const våg     = 1 + 0.12 * Math.sin(i / 3.4)

    const impressions = Math.max(0, Math.round(180 * säsong * veckdag * växt * våg))
    const ctr         = 0.031 + 0.004 * Math.sin(i / 11)
    ut.push({
      date: datum,
      impressions,
      clicks:   Math.round(impressions * ctr),
      position: Math.round((9.4 - (antal - i) * 0.004 + Math.sin(i / 7)) * 10) / 10,
    })
  }
  return ut
}

export default async function SEOPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin.from('companies').select('id, name').eq('user_id', user.id).single()
    : { data: null }

  const { data: conn } = company
    ? await admin.from('google_connections').select('refresh_token').eq('company_id', company.id).maybeSingle()
    : { data: null }

  const { data: rows } = company
    ? await admin
        .from('search_console_queries')
        .select('*')
        .eq('company_id', company.id)
        .order('impressions', { ascending: false })
        .limit(100)
    : { data: null }

  /* Dygnsraderna trendgrafen ritas ur. Drygt tre år bakåt — årsvyn visar tre
     staplar, och mer än så finns ingen vy som frågar efter. */
  const { data: dagRader } = company
    ? await admin
        .from('search_console_daily')
        .select('date, clicks, impressions, position')
        .eq('company_id', company.id)
        .order('date')
        .limit(1200)
    : { data: null }
  /* Tre lägen, inte två.
   *
   * Tidigare stod det `isLive ? rows : mockQueries` — mockdatan var reserven
   * när riktig data saknades, alltså det en kund utan koppling faktiskt fick
   * se. Nu visas exempel bara när exempelläget är påslaget; utan koppling och
   * utan data visas ingenting alls, med en väg vidare. */
  const kopplat = !!conn?.refresh_token
  const harData = !!rows?.length
  const läge    = dataläge({ kopplat, harData, exempel: await visaExempel() })

  /* Rubriken står kvar även utan siffror — annars ser fliken trasig ut i
     stället för tom. */
  if (!harSiffror(läge)) return (
    <div className="px-4 sm:px-8 py-6 space-y-6">
      <PageHeader
        titleSv="Synlighet på Google"
        titleEn="Google visibility"
        subSv="Vilka sökningar folk hittar dig med och hur högt du visas"
        subEn="Which searches people find you with and how high you appear"
      />
      <TomtLage källa="search" läge={läge} />
    </div>
  )

  /*
   * Dagens datum bestäms här och skickas ner.
   *
   * Vyn räknar hinkar och jämförelser ur det, och en komponent som frågar
   * webbläsaren vad klockan är under rendering ritar en sak på servern och en
   * annan hos kunden. Dessutom är det serverns dygn som gäller: det är samma
   * dygn synken skrev.
   */
  const idag = new Date()
  const idagIso = `${idag.getFullYear()}-${String(idag.getMonth() + 1).padStart(2, '0')}-${String(idag.getDate()).padStart(2, '0')}`

  return (
    <SEODashboardTest2
      queries={läge === 'egen' ? rows! : mockQueries}
      dagar={läge === 'egen' ? (dagRader ?? []) : exempelDagar(idagIso)}
      idag={idagIso}
      isLive={läge === 'egen'}
    />
  )
}
