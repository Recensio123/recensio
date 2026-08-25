import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { StartpageSwitch } from './StartpageSwitch'
import { SajtNotis } from '@/components/dashboard/SajtNotis'
import { GoogleConnectPanel } from '@/components/dashboard/GoogleConnectPanel'
import { dataläge } from '@/lib/datalage'
import { hämtaVy, visaExempel } from '@/lib/datalage.server'
import { hämtaGuide } from '@/lib/guideServer'
import { GuidePanel } from '@/components/dashboard/GuidePanel'
import { sajtSteg, andel } from '@/lib/komIgang'
import { CONTENT } from '@/lib/siteExampleContent'
import { baseIndustry } from '@/lib/industries'

/*
 * Startsidan.
 *
 * En kund som inte kopplat Google har ingen vecka att sammanfatta. Sidan har
 * då ett enda ärende, och det får ta plats: koppla Google. Allt annat är i
 * vägen för det.
 *
 * Hemsidan står som en rad överst i stället för som en lista. Den är viktig
 * men den är inte det som stoppar mätningen — och två uppmaningar som tävlar
 * om samma skärm blir ingen uppmaning alls.
 *
 * När kopplingen är gjord försvinner rutan och sammanfattningen tar över.
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const { data: company } = user
    ? await admin.from('companies').select('id, name, industry, city').eq('user_id', user.id).maybeSingle()
    : { data: null }

  const [{ data: conn }, { data: snap }, { data: cfg }] = await Promise.all([
    company
      ? admin.from('google_connections').select('refresh_token')
          .eq('company_id', company.id).maybeSingle()
      : Promise.resolve({ data: null }),
    company
      ? admin.from('gbp_snapshots').select('id').eq('company_id', company.id).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    company
      ? admin.from('site_config').select('content').eq('company_id', company.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const kopplat = !!conn?.refresh_token
  const läge = dataläge({ kopplat, harData: !!snap, exempel: await visaExempel() })

  /* Branschens exempeltext, så "har de skrivit sin egen Om oss" går att avgöra
     i stället för att gissa. */
  const innehåll = (cfg?.content ?? {}) as Parameters<typeof sajtSteg>[0]
  const standard = CONTENT[baseIndustry(company?.industry ?? 'other')] ?? CONTENT.other
  const sajt     = andel(sajtSteg(innehåll, standard.aboutBody ?? ''))
  const sajtKvar = sajt.av - sajt.klara

  /* Guiden ritas när läget är påslaget. Den läser sina egna uppgifter — sju
     frågor parallellt — och gör det bara när den faktiskt ska visas, så att
     kundens vanliga startsida inte betalar för något den inte ritar. */
  const guide = (await hämtaVy()) === 'guide' && company
    ? await hämtaGuide(admin, company.id, company.industry)
    : null

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">{company?.name ?? 'Din verksamhet'}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {kopplat ? 'Vad som hänt, och vad du gör härnäst' : 'Ett steg kvar innan du ser något här'}
          </p>
        </div>
      </div>

      {guide && <GuidePanel steg={guide} />}

      {/* Notisen och kopplingsrutan delar spalt. Två block i olika bredder
          under varandra ser ut som två olika sidor — och det breda drar till
          sig blicken, vilket är fel: det smala är det som ska göras.

          Sammanfattningen får däremot hela ytan. Den är en instrumentpanel och
          ska inte trängas ihop i en spalt byggd för en knapp. */}
      {kopplat ? (
        <>
          <SajtNotis kvar={sajtKvar} />
          <StartpageSwitch companyName={company?.name ?? 'Din verksamhet'} läge={läge} />
        </>
      ) : (
        <div className="max-w-xl space-y-5">
          <SajtNotis kvar={sajtKvar} />
          <GoogleConnectPanel
            salonName={company?.name ?? ''}
            city={company?.city ?? ''}
            isConnected={false}
          />
          {/* Demot står under kopplingen och inte bredvid den. Det är svaret på
              frågan man ställer sig efter att ha läst rutan — "vad får jag
              egentligen?" — och det ska inte konkurrera med den gula knappen
              innan frågan hunnit uppstå. */}
          <Link
            href="/dashboard/demo"
            className="block text-center text-sm text-slate-400 hover:text-white transition-colors"
          >
            Se ett demokonto — så fungerar plattformen →
          </Link>
        </div>
      )}
    </div>
  )
}
