import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AVTALSMALLAR } from '@/lib/avtalsmallar'

/*
 * Villkoren och integritetspolicyn, publikt.
 *
 * Texten hämtas ur samma tabell som adminsidan redigerar. Det är hela poängen:
 * ett villkor som ändras i admin ska gälla utåt samma sekund, utan att någon
 * behöver komma ihåg att ändra en andra kopia i koden. Saknas raden — ny
 * installation, migreringen inte körd — visas mallen ur koden i stället, för
 * en tom villkorssida är sämre än en oredigerad.
 *
 * Sidorna måste vara öppna. Stripes kundportal länkar till dem för varje kund,
 * och den som ska godkänna villkor ska kunna läsa dem innan de skapar ett
 * konto — inte efter.
 */

type Avtal = { titel: string; innehall: string; uppdaterad: string | null }

async function hämta(slug: string): Promise<Avtal | null> {
  const mall = AVTALSMALLAR.find(m => m.slug === slug)

  try {
    const admin = createAdminClient()
    /* Kolumnen heter `uppdaterad`, som resten av tabellen. Stod det
       `updated_at` här föll frågan igenom till mallen i koden — och då
       visades utkastet publikt medan den redigerade texten låg i databasen
       och aldrig syntes för någon. */
    const { data } = await admin
      .from('avtal')
      .select('titel, innehall, uppdaterad')
      .eq('slug', slug)
      .maybeSingle()

    if (data?.innehall) {
      return {
        titel:      (data.titel as string) ?? mall?.titel ?? '',
        innehall:   data.innehall as string,
        uppdaterad: (data.uppdaterad as string | null) ?? null,
      }
    }
  } catch { /* tabellen saknas ännu — mallen ur koden duger */ }

  return mall ? { titel: mall.titel, innehall: mall.innehall, uppdaterad: null } : null
}

export async function JuridiskSida({ slug }: { slug: string }) {
  const avtal = await hämta(slug)

  if (!avtal) {
    return (
      <main className="min-h-screen bg-[#080f1e] text-white/70 flex items-center justify-center px-6">
        <p>Dokumentet finns inte.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#080f1e] text-white">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-bold tracking-tight">Kiterank</Link>
          <Link href="/" className="text-sm text-white/45 hover:text-white transition-colors">
            Till startsidan →
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <Markdown text={avtal.innehall} />

        {avtal.uppdaterad && (
          <p className="text-xs text-white/25 mt-12 pt-6 border-t border-white/10">
            Senast ändrad {new Date(avtal.uppdaterad).toLocaleDateString('sv-SE')}.
          </p>
        )}
      </article>

      <footer className="border-t border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-6 flex gap-6 text-sm text-white/35">
          <Link href="/villkor" className="hover:text-white/60 transition-colors">Villkor</Link>
          <Link href="/integritetspolicy" className="hover:text-white/60 transition-colors">Integritetspolicy</Link>
        </div>
      </footer>
    </main>
  )
}

/* ─── Markdown ───────────────────────────────────────────────────────────
 *
 * Bara den delmängd avtalstexterna faktiskt använder: rubriker, stycken,
 * listor, tabeller, fet stil och avdelare.
 *
 * Ett bibliotek hade tagit hand om resten av markdown också, men avtalen
 * skrivs i en textruta i admin och ingen skriver bilder eller kodblock i ett
 * avtal. Den här gör inget vi inte kan se, och texten går aldrig genom
 * dangerouslySetInnerHTML — allt renderas som React-noder, så en klistrad
 * html-tagg i en avtalstext blir text och inte kod.                        */

function Markdown({ text }: { text: string }) {
  const rader = text.split(/\r?\n/)
  const ut: React.ReactNode[] = []
  let i = 0

  while (i < rader.length) {
    const rad = rader[i]

    if (!rad.trim())            { i++; continue }
    if (/^---+$/.test(rad.trim())) {
      ut.push(<hr key={i} className="border-white/10 my-8" />)
      i++; continue
    }

    if (rad.startsWith('# ')) {
      ut.push(<h1 key={i} className="text-3xl font-bold mb-6">{rad.slice(2)}</h1>)
      i++; continue
    }
    if (rad.startsWith('## ')) {
      ut.push(<h2 key={i} className="text-lg font-bold mt-10 mb-3">{rad.slice(3)}</h2>)
      i++; continue
    }
    if (rad.startsWith('### ')) {
      ut.push(<h3 key={i} className="text-base font-semibold mt-6 mb-2">{rad.slice(4)}</h3>)
      i++; continue
    }

    /* Tabell: rubrikrad, skiljerad, och sedan innehåll tills raderna tar slut. */
    if (rad.startsWith('|') && rader[i + 1]?.trim().startsWith('|')) {
      const celler = (r: string) => r.split('|').slice(1, -1).map(c => c.trim())
      const rubrik = celler(rad)
      let j = i + 2
      const kropp: string[][] = []
      while (j < rader.length && rader[j].trim().startsWith('|')) { kropp.push(celler(rader[j])); j++ }

      ut.push(
        <div key={i} className="my-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {rubrik.map((c, k) => (
                  <th key={k} className="text-left font-semibold text-white/80 border-b border-white/15 py-2 pr-4 align-top">
                    <Rad text={c} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kropp.map((r, k) => (
                <tr key={k}>
                  {r.map((c, l) => (
                    <td key={l} className="border-b border-white/5 py-2 pr-4 text-white/55 align-top">
                      <Rad text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      i = j; continue
    }

    /* Punktlista */
    if (/^[-*] /.test(rad)) {
      const poster: string[] = []
      while (i < rader.length && /^[-*] /.test(rader[i])) { poster.push(rader[i].slice(2)); i++ }
      ut.push(
        <ul key={`ul${i}`} className="space-y-1.5 my-4 ml-1">
          {poster.map((p, k) => (
            <li key={k} className="flex gap-2.5 text-white/55 leading-relaxed">
              <span className="text-[#f0b429] shrink-0">·</span>
              <span><Rad text={p} /></span>
            </li>
          ))}
        </ul>,
      )
      continue
    }

    /* Numrerad lista */
    if (/^\d+\. /.test(rad)) {
      const poster: string[] = []
      while (i < rader.length && /^\d+\. /.test(rader[i])) { poster.push(rader[i].replace(/^\d+\.\s/, '')); i++ }
      ut.push(
        <ol key={`ol${i}`} className="space-y-1.5 my-4 ml-1">
          {poster.map((p, k) => (
            <li key={k} className="flex gap-2.5 text-white/55 leading-relaxed">
              <span className="text-[#f0b429] shrink-0 tabular-nums">{k + 1}.</span>
              <span><Rad text={p} /></span>
            </li>
          ))}
        </ol>,
      )
      continue
    }

    ut.push(
      <p key={i} className="text-white/55 leading-relaxed my-3">
        <Rad text={rad} />
      </p>,
    )
    i++
  }

  return <>{ut}</>
}

/** Fet stil inuti en rad. Allt annat lämnas som text. */
function Rad({ text }: { text: string }) {
  const delar = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {delar.map((d, i) =>
        d.startsWith('**') && d.endsWith('**')
          ? <strong key={i} className="text-white font-semibold">{d.slice(2, -2)}</strong>
          : <span key={i}>{d}</span>,
      )}
    </>
  )
}
