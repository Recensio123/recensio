import { createAdminClient } from '@/lib/supabase/admin'
import { AVTALSMALLAR } from '@/lib/avtalsmallar'
import { AvtalEditor } from './AvtalEditor'

/*
 * Avtalen, samlade och redigerbara.
 *
 * De bor i databasen och inte i koden av ett enkelt skäl: ett avtal ändras när
 * juridiken kräver det, inte när en release råkar gå. Att behöva en deploy för
 * att rätta en klausul är att skjuta upp rättelsen.
 *
 * Sidan är din, inte kundernas. Det som visas för en salong är den sparade
 * texten — den här vyn är där den skrivs.
 */

export const dynamic = 'force-dynamic'

type Rad = {
  slug:       string
  titel:      string
  beskrivning: string | null
  innehall:   string
  version:    string | null
  uppdaterad: string
}

export default async function AvtalPage({
  searchParams,
}: {
  searchParams: Promise<{ öppna?: string }>
}) {
  const params = await searchParams
  const admin = createAdminClient()

  let rader: Rad[] = []
  let migrerad = true
  try {
    const läs = async () => {
      const { data, error } = await admin
        .from('avtal')
        .select('slug, titel, beskrivning, innehall, version, uppdaterad')
        .order('titel')
      if (error) throw error
      return (data ?? []) as Rad[]
    }

    rader = await läs()

    /*
     * Saknade mallar läggs in första gången sidan öppnas.
     *
     * Texterna bor i koden som utgångsläge och seedas hit i stället för att
     * klistras genom en SQL-editor — ett flera tusen tecken långt avtal som
     * ska passera ett textfält är ett avtal som förr eller senare klistras
     * halvt. `do nothing` gör att en text du redan ändrat aldrig skrivs över.
     */
    const finns = new Set(rader.map(r => r.slug))
    const saknade = AVTALSMALLAR.filter(m => !finns.has(m.slug))
    if (saknade.length) {
      await admin.from('avtal').upsert(
        saknade.map(m => ({
          slug: m.slug, titel: m.titel, beskrivning: m.beskrivning,
          version: m.version, innehall: m.innehall,
        })),
        { onConflict: 'slug', ignoreDuplicates: true },
      )
      rader = await läs()
    }
  } catch {
    migrerad = false
  }

  if (!migrerad) {
    return (
      <div style={{ maxWidth: 900, fontFamily: 'var(--font-brand-sans)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Avtal</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
          Kör migrationen <code>20260909_avtal.sql</code> i Supabase, så fylls sidan.
        </p>
      </div>
    )
  }

  const öppen = rader.find(r => r.slug === params.öppna) ?? rader[0] ?? null

  return (
    <div style={{ maxWidth: 900, fontFamily: 'var(--font-brand-sans)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Avtal</h1>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 18px' }}>
        Dina avtalstexter, redigerbara här. Ändringar slår igenom direkt utan att något behöver
        byggas om. Texterna är utkast — låt en jurist läsa igenom innan de används skarpt.
      </p>

      {/* Flikraden. En rad även när det bara finns ett avtal: nästa hamnar
          bredvid i stället för att kräva en ny sida. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
        {rader.map(r => {
          const aktiv = r.slug === öppen?.slug
          return (
            <a
              key={r.slug}
              href={`/admin/avtal?öppna=${encodeURIComponent(r.slug)}`}
              style={{
                padding: '7px 13px', borderRadius: 9, fontSize: 13,
                fontWeight: aktiv ? 700 : 500, textDecoration: 'none',
                background: aktiv ? '#1e293b' : 'transparent',
                border: `1px solid ${aktiv ? '#334155' : '#1e293b'}`,
                color: aktiv ? '#f1f5f9' : '#94a3b8',
              }}
            >
              {r.titel}
            </a>
          )
        })}
      </div>

      {öppen ? (
        <div style={{ marginTop: 16 }}>
          {öppen.beskrivning && (
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 6px' }}>
              {öppen.beskrivning}
            </p>
          )}
          <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
            Senast ändrad {new Date(öppen.uppdaterad).toLocaleString('sv-SE')}
            {öppen.version ? ` · version ${öppen.version}` : ''}
          </p>

          <AvtalEditor
            slug={öppen.slug}
            titel={öppen.titel}
            innehall={öppen.innehall}
            version={öppen.version}
          />
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 16 }}>Inga avtal upplagda än.</p>
      )}
    </div>
  )
}
