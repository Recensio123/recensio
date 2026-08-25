'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PreviewSite, type SiteContent } from '@/components/site/PreviewSite'
import type { Template } from '@/lib/templates'
import { F } from '../fields'

/*
 * Varje tema, med salongens egen sida i sig.
 *
 * Förhandsvisningen renderas i full bredd och skalas ned — inte ritas om i
 * litet format. Det som visas är alltså exakt samma komposition som den
 * publicerade sidan får, med samma text och samma bilder.
 *
 * Höjden är beskuren till toppen av sidan. Det är där ett tema skiljer sig från
 * ett annat; hela sidan i varje ruta hade betytt tolv gånger skrollning för att
 * jämföra det som ändå syns först.
 */

const BREDD = 1280
const RUTA  = 420
const HÖJD  = 560

export function TemaVal({ teman, nuvarandeId, innehåll, industry, slug }: {
  teman:       Template[]
  nuvarandeId: string
  innehåll:    SiteContent
  industry:    string
  slug:        string
}) {
  const router = useRouter()
  const [valt,   setValt]   = useState<Template | null>(null)
  const [sparar, setSparar] = useState(false)
  const [fel,    setFel]    = useState('')

  const skala = RUTA / BREDD

  /*
   * Bytet startar det nya temat från noll.
   *
   * Att bära över de gamla valen låter generöst och är det inte: en rubrikfärg
   * vald för att synas mot en mörk botten försvinner mot en gräddvit, och en
   * bild uppladdad i en plats det nya temat inte har försvinner utan
   * förklaring. Varje tema är ritat som en helhet, så kunden får det helt och
   * justerar därifrån. Ingenting förstörs — bilderna ligger kvar under Bilder.
   */
  async function byt(t: Template) {
    setSparar(true); setFel('')
    try {
      const res = await fetch('/api/webbplats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: t.id,
          content: {
            ...innehåll,
            colorOverrides:  {},
            textColorPicked: false,
            heroImage:     undefined,
            featureImage:  undefined,
            aboutImage:    undefined,
            backdropImage: undefined,
            backdrop:      undefined,
          },
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      router.push('/dashboard/webbplats')
      router.refresh()
    } catch {
      setFel('Kunde inte byta tema. Försök igen.')
      setSparar(false)
    }
  }

  return (
    <div style={{ background: '#020617', minHeight: '100dvh', padding: '20px 4% 60px', fontFamily: F }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h1 style={{ flex: 1, fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Teman</h1>
        <a href="/dashboard/webbplats" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}>
          ← Tillbaka till redigeraren
        </a>
      </div>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 22px', maxWidth: 640, lineHeight: 1.7 }}>
        Din egen sida, ritad i varje tema. Texter, priser och bilder följer med
        när du byter — färgerna och bakgrunden börjar om från det nya temat.
      </p>

      {fel && <p style={{ fontSize: 13, color: '#f87171', margin: '0 0 16px' }}>{fel}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${RUTA}px, 1fr))`, gap: 20 }}>
        {teman.map(t => {
          const aktivt = t.id === nuvarandeId
          return (
            <div key={t.id}>
              <div
                style={{
                  border: `2px solid ${aktivt ? '#eab308' : '#1e293b'}`,
                  borderRadius: 12, overflow: 'hidden', background: '#0f172a',
                  height: HÖJD, position: 'relative',
                }}
              >
                {/* Renderad i full bredd och nedskalad, så att det som visas är
                    samma komposition som den publicerade sidan — inte en
                    förenkling ritad för småformat. */}
                <div style={{
                  width: BREDD, transform: `scale(${skala})`, transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}>
                  <PreviewSite
                    template={t}
                    industry={industry}
                    contentOverride={innehåll}
                    tjansterBase={slug ? `/s/${slug}` : undefined}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 9 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: aktivt ? '#eab308' : '#f1f5f9' }}>
                    {t.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 1 }}>
                    {t.tagline}
                  </span>
                </span>

                {aktivt ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#eab308', whiteSpace: 'nowrap' }}>
                    Ditt tema
                  </span>
                ) : (
                  <button
                    onClick={() => setValt(t)}
                    disabled={sparar}
                    style={{
                      padding: '7px 13px', fontSize: 12, fontWeight: 700, fontFamily: F,
                      borderRadius: 8, border: '1px solid #334155', background: 'none',
                      color: '#eab308', cursor: sparar ? 'default' : 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Välj
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bytet frågar först. Det nollställer färger och tre bildplatser, och det
          är inte något man ska kunna göra med ett felklick på en knapp som
          ligger under varje ruta. */}
      {valt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.75)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: '100%' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>
              Byt till {valt.name}?
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 18px' }}>
              Dina texter, priser, artiklar och galleribilder följer med. Färger,
              bakgrund och de tre stora bildplatserna börjar om från det nya
              temat — bilderna ligger kvar under Bilder.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={() => setValt(null)}
                disabled={sparar}
                style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, fontFamily: F, background: 'none', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer' }}
              >
                Avbryt
              </button>
              <button
                onClick={() => void byt(valt)}
                disabled={sparar}
                style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: F, background: '#eab308', color: '#0f172a', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                {sparar ? 'Byter…' : 'Byt tema'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
