import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { currentCompany } from '@/lib/companyScope'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { visaExempel } from '@/lib/datalage.server'
import { exempelrapport } from '@/lib/exempelrapport'
import { exempelkvartal } from '@/lib/exempelkvartal'
import { Rapport } from './Rapport'
import { Kvartalsrapport } from './Kvartalsrapport'
import { Kunddokument, type Dokument } from './Kunddokument'

/*
 * Rapporterna.
 *
 * Två dokument med olika uppgift, och därför två flikar i stället för ett
 * långt papper:
 *
 *   MÅNADSRAPPORTEN svarar på vad som hände och vad vi gjorde, och bär planen
 *   med budgeten som ska godkännas. Den kommer den första i månaden.
 *
 *   KVARTALSRAPPORTEN svarar på åt vilket håll det går. Den jämför tre månader
 *   mot tre månader och mot samma kvartal i fjol, tittar på kundstocken, och
 *   föreslår vad nästa kvartal ska ägnas åt. Två månader i rad säger ingenting
 *   om en trend; ett kvartal gör det.
 *
 * I demoläget ritas båda ur exempelsalongens egen kalender — samma bokningar
 * som panelen visar bredvid. En rapport som säger något annat än dashboarden
 * är det snabbaste sättet att förlora en kund som tittar på båda.
 */

export const dynamic = 'force-dynamic'

/*
 * Kundens egna dokument.
 *
 * Bara det som skickats. Ett utkast ligger i admin tills du är nöjd med det,
 * och ska aldrig kunna dyka upp hos kunden halvfärdigt — den som en gång sett
 * en rapport med fel siffra litar inte på nästa heller.
 *
 * Fel sväljs och ger en tom lista. Tabellen är ny, migrationen körs för hand,
 * och en osynlig rapport är bättre än en släckt sida.
 */
async function hämtaDokument(): Promise<{ lista: Dokument[]; epost: string }> {
  const scope = await currentCompany()
  if (!scope) return { lista: [], epost: '' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { data } = await scope.admin
      .from('kunddokument')
      .select('id, titel, period, innehall, status, skickad_at, godkand_at, godkand_av')
      .eq('company_id', scope.id)
      .in('status', ['skickad', 'godkand'])
      .order('skapad', { ascending: false })
      .limit(12)
    return { lista: (data ?? []) as Dokument[], epost: user?.email ?? '' }
  } catch {
    return { lista: [], epost: user?.email ?? '' }
  }
}

export default async function RapportPage({
  searchParams,
}: {
  searchParams: Promise<{ vy?: string; dok?: string }>
}) {
  const params  = await searchParams
  const exempel = await visaExempel()
  const kvartal = params.vy === 'kvartal'

  /* Demoläget visar exempelsalongen och rör aldrig kundens egna dokument. */
  const { lista, epost } = exempel ? { lista: [], epost: '' } : await hämtaDokument()
  const valt = lista.length
    ? (params.dok ? lista.find(d => d.id === params.dok) ?? lista[0] : lista[0])
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        titleSv={kvartal ? 'Kvartalsrapport' : 'Månadsrapport'}
        titleEn={kvartal ? 'Quarterly report' : 'Monthly report'}
        subSv={kvartal
          ? 'Åt vilket håll det går — kvartalet mot förra, och mot samma kvartal i fjol.'
          : 'Vad som hände, vad vi gjorde, och planen för nästa månad.'}
        subEn={kvartal
          ? 'The direction of travel — this quarter against the last, and against the same quarter last year.'
          : 'What happened, what we did, and the plan for next month.'}
        sample={exempel}
      />

      {exempel ? (
        <>
          {/* Flikarna. Adressen bär valet så att en delad länk öppnar rätt
              dokument — en rapport man skickar vidare ska landa rätt. */}
          <div className="flex gap-2">
            {([
              ['manad',   'Månadsrapport',   '/dashboard/rapport'],
              ['kvartal', 'Kvartalsrapport', '/dashboard/rapport?vy=kvartal'],
            ] as const).map(([id, namn, href]) => {
              const aktiv = (id === 'kvartal') === kvartal
              return (
                <Link
                  key={id}
                  href={href}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    aktiv
                      ? 'bg-navy-800 text-white border border-navy-600'
                      : 'text-slate-400 hover:text-white border border-navy-800'
                  }`}
                >
                  {namn}
                </Link>
              )
            })}
          </div>

          {kvartal
            ? <Kvartalsrapport data={exempelkvartal()} exempel />
            : <Rapport data={exempelrapport()} exempel />}
        </>
      ) : valt ? (
        <>
          {/* Har kunden fler än ett dokument väljer de här. Nyast först — det
              är det de kommit för; äldre finns kvar för att gå tillbaka till. */}
          {lista.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {lista.map(d => {
                const aktiv = d.id === valt.id
                return (
                  <Link
                    key={d.id}
                    href={`/dashboard/rapport?dok=${d.id}`}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      aktiv
                        ? 'bg-navy-800 text-white border border-navy-600'
                        : 'text-slate-400 hover:text-white border border-navy-800'
                    }`}
                  >
                    {d.period ?? d.titel}
                    {d.status === 'godkand' && <span className="text-green-400 ml-2">✓</span>}
                  </Link>
                )
              })}
            </div>
          )}
          <Kunddokument dok={valt} epost={epost} />
        </>
      ) : (
        /*
         * Skarpt konto utan full service.
         *
         * Rapporterna skrivs av oss och bygger på arbete vi utfört — de kan
         * inte genereras åt någon vi inte arbetar för. Att visa en tom mall
         * med nollor hade sett ut som ett fel i stället för som ett erbjudande.
         */
        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-8 max-w-2xl">
          <h2 className="text-white font-bold text-lg">Rapporterna ingår i Full service</h2>
          <p className="text-slate-400 text-sm leading-relaxed mt-2">
            Varje månad får du en genomgång av vad som hände, vad vi gjorde åt det, och vad vi
            föreslår för månaden som kommer — med en budget du godkänner med ett klick.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mt-2">
            Varje kvartal kommer den större: tre månader mot tre månader, hur många kunder som
            tillkom och hur många som slutade komma, hur ni ligger mot de närmaste salongerna, och
            vad kvartalet som kommer bör ägnas åt.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed mt-3">
            Vill du se hur de ser ut kan du slå på demoläget, så visas rapporterna för
            exempelsalongen med riktiga siffror ur deras kalender.
          </p>
          <div className="flex flex-wrap gap-4 items-center mt-5">
            <a
              href="/dashboard/demo"
              className="bg-mustard hover:bg-mustard-light text-navy-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Visa exempelrapporterna →
            </a>
            <a href="/priser" className="text-slate-400 hover:text-white text-sm transition-colors">
              Läs om Full service
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
