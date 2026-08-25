import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createAdminClient } from '@/lib/supabase/admin'
import { platformAdmin } from '@/lib/admin'
import { kundhistorik, stadaSida, läsMig } from '@/lib/export.server'

/*
 * Paketet en salong får med sig.
 *
 * Två sorter, med olika regler bakom sig — se kommentaren i export.server.
 * Rutten gör själva insamlingen; vem som har rätt till vad avgörs av sidan som
 * anropar den, och kontrolleras här igen.
 *
 * Bara plattformsadmin så länge. Kunden trycker inte själv än, men allt är
 * byggt som om de gjorde det: samma insamling, samma filer, samma namn. Den
 * dagen knappen flyttas till kundens panel är det bara behörigheten som byts.
 */

export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const companyId = url.searchParams.get('företag') ?? ''
  const sort = url.searchParams.get('sort') ?? 'kunder'
  if (!companyId) return NextResponse.json({ error: 'inget_företag' }, { status: 400 })

  const admin = createAdminClient()
  const { data: företag } = await admin
    .from('companies')
    .select('id, name, slug, country')
    .eq('id', companyId)
    .maybeSingle()
  if (!företag) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const salong = (företag.name as string) || (företag.slug as string)
  const filnamn = (företag.slug as string).replace(/[^a-z0-9-]/gi, '') || 'kund'

  const zip = new JSZip()

  if (sort === 'kunder') {
    const filer = await kundhistorik(
      admin, företag.id as string, företag.country as string | null,
    )
    for (const f of filer) zip.file(f.namn, f.innehall)
    zip.file('läs-mig.txt', [
      `${salong} — kundhistorik`,
      ``,
      `kunder.csv     ett kundregister med besöksräkning och anteckningar`,
      `bokningar.csv  varje bokning som gjorts, med datum, tjänst och status`,
      ``,
      `Filerna öppnas i Excel, Numbers eller Google Kalkylark genom att`,
      `dubbelklicka. De går också att läsa in i de flesta andra bokningssystem.`,
      ``,
      `Uppgifterna är dina kunders personuppgifter. Behandla dem därefter.`,
      ``,
    ].join('\n'))
  } else {
    const sidor = await hämtaSidor(req, företag.slug as string)
    if (!sidor.length) {
      return NextResponse.json({ error: 'ingen_sajt' }, { status: 409 })
    }
    /*
     * Numret läses ur den renderade sidan, inte ur databasen.
     *
     * Salongens telefonnummer bor i sajtens innehåll och kan dessutom vara
     * satt på flera ställen. Den publicerade sidan har redan gjort valet och
     * skrivit ut det som en tel-länk — att läsa där ger samma nummer som
     * kundens besökare faktiskt ser, utan att exporten behöver känna till hur
     * innehållet är strukturerat.
     */
    const telefon = sidor[0].html.match(/href="tel:([^"]+)"/i)?.[1]?.trim() ?? null
    for (const s of sidor) {
      zip.file(s.namn, stadaSida(s.html, { slug: företag.slug as string, telefon }))
    }
    zip.file('läs-mig.txt', läsMig(salong, telefon, sidor.map(s => s.namn)))
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer' })
  const datum = new Date().toISOString().slice(0, 10)

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition':
        `attachment; filename="${filnamn}-${sort === 'kunder' ? 'kundhistorik' : 'hemsida'}-${datum}.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Sidorna hämtade som färdig HTML.
 *
 * Vi läser vår egen publicerade sajt över HTTP i stället för att rendera om
 * den internt. Skälet är trovärdighet: det som hamnar i paketet är exakt de
 * byte en besökare får, inte en andra rendering som kan skilja sig på något
 * litet och göra exporten till en dålig kopia av originalet.
 */
async function hämtaSidor(req: NextRequest, slug: string): Promise<{ namn: string; html: string }[]> {
  const bas = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || new URL(req.url).origin

  const start = `${bas}/s/${slug}`
  const svar = await fetch(start, { cache: 'no-store' })
  if (!svar.ok) return []
  const första = await svar.text()

  const ut = [{ namn: 'index.html', html: första }]

  /*
   * Undersidorna hittas i den första sidans egna länkar. En lista över
   * sidtyper hade behövt uppdateras varje gång produkten får en ny sorts sida,
   * och den dagen någon glömmer det saknas sidor i en kunds paket utan att
   * någon märker det.
   */
  const adresser = new Set<string>()
  for (const m of första.matchAll(/href="([^"]+)"/g)) {
    const href = m[1]
    const stig = href.startsWith(bas) ? href.slice(bas.length) : href
    if (!stig.startsWith(`/s/${slug}/`)) continue
    if (/\.(png|jpe?g|webp|svg|ico|css|js)$/i.test(stig)) continue
    adresser.add(stig)
  }

  for (const stig of [...adresser].slice(0, 100)) {
    try {
      const r = await fetch(`${bas}${stig}`, { cache: 'no-store' })
      if (!r.ok) continue
      const namn = stig.replace(`/s/${slug}/`, '').replace(/\/$/, '') || 'sida'
      ut.push({ namn: `${namn.replace(/\//g, '-')}.html`, html: await r.text() })
    } catch { /* en sida som inte svarar stoppar inte resten */ }
  }

  return ut
}
