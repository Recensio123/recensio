import Link from 'next/link'
import { ALL_TEMPLATES } from '@/lib/mallprov'

/*
 * Provgalleriets register: varje mall, i varje läge.
 *
 * Sidan finns för ögat — den enda kontroll som fångar en rubrik som kolliderar
 * med en bild eller ett kort som spricker. Typkontrollen ser strukturen,
 * kontrastproven ser färgerna; det här är där layoutfelen syns.
 *
 * Lägena är matrisens rader: elakt långt innehåll, avskalat till nästan
 * ingenting, och det vanliga demoinnehållet som referens. En mall är granskad
 * när alla tre sett rätt ut — i panelens bredd och i mobilens.
 */

const LÄGEN = [
  ['demo',  'Demo',      'Det vanliga demoinnehållet — referensen.'],
  ['elak',  'Elakt',     'Långt namn med å ä ö &, fjorton tjänster, långa texter, inga bilder.'],
  ['tom',   'Avskalat',  'Nästan tomt: kortaste namn, en tjänst, varje valbar sektion av.'],
] as const

export const dynamic = 'force-dynamic'

export default function MallprovIndex() {
  return (
    <div style={{ maxWidth: 860, fontFamily: 'var(--font-brand-sans)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Mallprov</h1>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 20px', maxWidth: 640 }}>
        Varje mall renderad med innehåll som letar efter fel. En ny eller ändrad mall är
        granskad när alla tre lägena sett rätt ut — brett fönster och smalt.
      </p>

      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            {['Mall', 'Layout', ...LÄGEN.map(l => l[1])].map(h => (
              <th key={h} style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, padding: '6px 10px', borderBottom: '1px solid #1e293b' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_TEMPLATES.map(t => (
            <tr key={t.id}>
              <td style={{ color: '#e2e8f0', padding: '7px 10px', borderBottom: '1px solid #16233b' }}>
                {t.name} <span style={{ color: '#475569' }}>({t.id})</span>
              </td>
              <td style={{ color: '#64748b', padding: '7px 10px', borderBottom: '1px solid #16233b' }}>{t.layout}</td>
              {LÄGEN.map(([läge]) => (
                <td key={läge} style={{ padding: '7px 10px', borderBottom: '1px solid #16233b' }}>
                  <Link
                    href={`/admin/mallprov/${t.id}?lage=${läge}`}
                    style={{ color: '#eab308', textDecoration: 'none' }}
                  >
                    öppna →
                  </Link>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginTop: 20, maxWidth: 640 }}>
        Innehållet i lägena definieras i <code style={{ color: '#64748b' }}>src/lib/mallprov.ts</code>.
        Hittar du ett fel som lägena inte framkallade: gör felets innehåll till ett nytt läge,
        så fångas det för varje mall framöver.
      </p>
    </div>
  )
}
