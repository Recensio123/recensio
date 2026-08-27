import { körTester } from '@/lib/sjalvtest'
import { smsConfigured } from '@/lib/smser'
import { mailerConfigured, platformFrom } from '@/lib/mailer'
import { Utskickstest } from './Utskickstest'

/*
 * Proven, körda när sidan öppnas.
 *
 * Behörigheten sitter i adminlayouten, som redan avvisar den som inte hör hit —
 * en andra kontroll här hade varit ett andra ställe att glömma.
 *
 * Serverrenderad med flit: resultatet ska vara sant i samma stund du tittar på
 * det, inte hämtat efteråt. Proven är rena funktioner utan databas, så de kostar
 * millisekunder. Ingen körknapp heller — ett svar som kräver ett klick är ett
 * svar någon glömmer att hämta.
 */
/* Miljön läses vid varje besök. Bakas sidan in vid bygget står det "nycklarna
   saknas" kvar långt efter att de lagts in. */
export const dynamic = 'force-dynamic'

export default function TesterPage() {
  const utfall = körTester()
  const fel    = utfall.filter(u => !u.ok)

  const F = 'var(--font-brand-sans)'

  return (
    <div style={{ maxWidth: 720, fontFamily: F }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Tester</h1>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 20px' }}>
        Kontroller på bokningsrutnätet och utskickskön — de två ställen där ett
        fel kostar pengar. Körs varje gång du öppnar sidan.
      </p>

      <div style={{
        borderRadius: 12, padding: '13px 16px', marginBottom: 18,
        border: `1px solid ${fel.length ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.4)'}`,
        background: fel.length ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)',
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: fel.length ? '#fca5a5' : '#86efac' }}>
          {fel.length === 0
            ? `Alla ${utfall.length} går igenom.`
            : `${fel.length} av ${utfall.length} går inte igenom.`}
        </p>
      </div>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {utfall.map((u, i) => (
          <li
            key={u.namn}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 11,
              borderRadius: 10, padding: '11px 14px',
              border: `1px solid ${u.ok ? '#1e293b' : 'rgba(239,68,68,0.4)'}`,
              background: u.ok ? '#0f172a' : '#1a1113',
            }}
          >
            <span style={{
              flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              background: u.ok ? 'rgba(74,222,128,0.16)' : 'rgba(239,68,68,0.16)',
              color: u.ok ? '#4ade80' : '#f87171',
            }}>
              {u.ok ? '✓' : '✕'}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, color: u.ok ? '#cbd5e1' : '#f1f5f9', fontWeight: u.ok ? 400 : 700 }}>
                <span style={{ color: '#475569', marginRight: 8 }}>{i + 1}</span>
                {u.namn}
              </span>
              {/* Skälet står bara när något gick fel. Ett grönt prov behöver
                  ingen förklaring; ett rött ska gå att laga utan att man först
                  läser koden. */}
              {!u.ok && (
                <span style={{ display: 'block', fontSize: 12, color: '#fca5a5', marginTop: 5, lineHeight: 1.6 }}>
                  {u.varför}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginTop: 22 }}>
        Proven ligger i <code style={{ color: '#64748b' }}>src/lib/sjalvtest.ts</code>. De rör
        ingen databas och skickar ingenting — de matar reglerna med påhittade
        bokningar och kontrollerar vad som kommer ut.
      </p>

      {/* Bara om nycklarna finns, aldrig vad de innehåller. En adminsida är
          inte ett ställe att skriva ut hemligheter på. */}
      <Utskickstest smsKlart={smsConfigured()} mailKlart={mailerConfigured() && !!platformFrom()} />
    </div>
  )
}
