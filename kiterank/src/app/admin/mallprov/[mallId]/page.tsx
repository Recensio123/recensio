import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PreviewSite } from '@/components/site/PreviewSite'
import { CONTENT } from '@/lib/siteExampleContent'
import { ALL_TEMPLATES, provInnehåll, type ProvLäge } from '@/lib/mallprov'

/*
 * En mall i ett läge, i full storlek.
 *
 * Renderar exakt samma komponent som kundens riktiga sida — inte en kopia och
 * inte en miniatyr. Ett galleri som ritar sin egen version av mallen granskar
 * sin egen version, och felen bor i den riktiga.
 *
 * Remsan högst upp bär bytena mellan lägen och mallar, så en granskning är
 * pilknappar i stället för adressredigering: nästa läge, nästa mall.
 */

export const dynamic = 'force-dynamic'

const LÄGEN: ProvLäge[] = ['demo', 'elak', 'tom']

export default async function MallprovSida({
  params, searchParams,
}: {
  params:       Promise<{ mallId: string }>
  searchParams: Promise<{ lage?: string }>
}) {
  const { mallId } = await params
  const { lage }   = await searchParams

  const mall = ALL_TEMPLATES.find(t => t.id === mallId)
  if (!mall) notFound()

  const läge: ProvLäge = LÄGEN.includes(lage as ProvLäge) ? (lage as ProvLäge) : 'demo'
  const extra = provInnehåll(läge)

  /* Elaka och tomma läget läggs ovanpå salongsdemon: fälten lägena inte bryr
     sig om ska vara ifyllda, annars provar varje läge också "fält saknas" och
     inget läge provar bara sin egen sak. */
  const innehåll = extra ? { ...CONTENT.salon, ...extra } : undefined

  const index = ALL_TEMPLATES.findIndex(t => t.id === mallId)
  const förra = ALL_TEMPLATES[(index - 1 + ALL_TEMPLATES.length) % ALL_TEMPLATES.length]
  const nästa = ALL_TEMPLATES[(index + 1) % ALL_TEMPLATES.length]

  const knapp: React.CSSProperties = {
    color: '#eab308', textDecoration: 'none', padding: '2px 8px',
    border: '1px solid #333', borderRadius: 6,
  }

  return (
    <div>
      {/* Remsan. Mörk och kompakt — den ska synas men aldrig kunna förväxlas
          med mallens eget innehåll. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: '#0b1220',
        borderBottom: '1px solid #1e293b', padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        fontFamily: 'var(--font-brand-sans)', fontSize: 13,
      }}>
        <Link href="/admin/mallprov" style={{ color: '#64748b', textDecoration: 'none' }}>← alla</Link>
        <strong style={{ color: '#f1f5f9' }}>{mall.name}</strong>
        <span style={{ color: '#475569' }}>{mall.id} · {mall.layout}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {LÄGEN.map(l => (
            <Link
              key={l}
              href={`/admin/mallprov/${mall.id}?lage=${l}`}
              style={{ ...knapp, ...(l === läge ? { background: '#eab308', color: '#0b1220', borderColor: '#eab308' } : {}) }}
            >
              {l}
            </Link>
          ))}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Link href={`/admin/mallprov/${förra.id}?lage=${läge}`} style={knapp}>← {förra.name}</Link>
          <Link href={`/admin/mallprov/${nästa.id}?lage=${läge}`} style={knapp}>{nästa.name} →</Link>
        </span>
      </div>

      <PreviewSite template={mall} industry="salon" contentOverride={innehåll} />
    </div>
  )
}
