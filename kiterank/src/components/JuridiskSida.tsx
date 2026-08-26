import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AVTALSMALLAR } from '@/lib/avtalsmallar'
import { Markdown } from '@/components/Markdown'

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

