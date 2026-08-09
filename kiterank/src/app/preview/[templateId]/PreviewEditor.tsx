'use client'

import { useState, useCallback } from 'react'
import type { Template, TemplateColors } from '@/app/onboarding/templates'
import { CONTENT, PreviewSite, type SiteContent } from './PreviewSite'

const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'

const COLOR_FIELDS: { key: keyof TemplateColors; label: string }[] = [
  { key: 'bg',  label: 'Bakgrundsfärg'  },
  { key: 'nav', label: 'Navigationsfärg' },
  { key: 'h',   label: 'Rubrikfärg'     },
  { key: 'a',   label: 'Accentfärg'     },
  { key: 's',   label: 'Brödtextfärg'   },
  { key: 'b',   label: 'Kortfärg'       },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 2,
      textTransform: 'uppercase' as const, color: '#475569',
      fontFamily: F, margin: '20px 0 10px',
    }}>
      {children}
    </p>
  )
}

function TF({
  label, value, onChange, rows,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const base: React.CSSProperties = {
    width: '100%', background: '#1e293b', border: '1px solid #334155',
    borderRadius: 6, color: '#e2e8f0', fontSize: 12, fontFamily: F,
    padding: '7px 10px', boxSizing: 'border-box', outline: 'none',
  }
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 10, color: '#64748b', fontFamily: F, display: 'block', marginBottom: 3 }}>
        {label}
      </label>
      {rows
        ? <textarea value={value} rows={rows} onChange={e => onChange(e.target.value)} style={{ ...base, resize: 'vertical' as const }} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} style={base} />
      }
    </div>
  )
}

export function PreviewEditor({ template, industry }: { template: Template; industry: string }) {
  const [tab,     setTab]     = useState<'colors' | 'text' | 'services'>('colors')
  const [content, setContent] = useState<SiteContent>(() => ({ ...(CONTENT[industry] ?? CONTENT.other) }))
  const [colors,  setColors]  = useState<TemplateColors>(() => ({ ...template.colors }))

  const setField = useCallback(<K extends keyof SiteContent>(key: K, value: SiteContent[K]) => {
    setContent(prev => ({ ...prev, [key]: value }))
  }, [])

  const setSvc = useCallback((i: number, key: keyof SiteContent['services'][0], value: string) => {
    setContent(prev => ({
      ...prev,
      services: prev.services.map((s, j) => j === i ? { ...s, [key]: value } : s),
    }))
  }, [])

  const setColor = useCallback((key: keyof TemplateColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }))
  }, [])

  const mergedTemplate = { ...template, colors }

  function tabBtn(id: typeof tab, label: string) {
    const active = tab === id
    return (
      <button
        key={id}
        onClick={() => setTab(id)}
        style={{
          flex: 1, padding: '11px 0', background: 'transparent', border: 'none',
          borderBottom: `2px solid ${active ? '#f59e0b' : 'transparent'}`,
          color: active ? '#fbbf24' : '#64748b',
          fontSize: 12, fontWeight: active ? 600 : 400,
          fontFamily: F, cursor: 'pointer', transition: 'color .15s',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Live preview ────────────────────────────────────────── */}
      <div
        style={{ flex: 1, overflow: 'auto', background: '#fff' }}
        onClick={e => { if ((e.target as HTMLElement).closest('a')) e.preventDefault() }}
      >
        <PreviewSite template={mergedTemplate} industry={industry} contentOverride={content} />
      </div>

      {/* ── Editor panel ────────────────────────────────────────── */}
      <div style={{
        width: 300, background: '#0f172a', display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid #1e293b', overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
          {tabBtn('colors',   'Färger')}
          {tabBtn('text',     'Text')}
          {tabBtn('services', 'Tjänster')}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 40px' }}>

          {/* ── COLORS ── */}
          {tab === 'colors' && (
            <>
              <SectionLabel>Brandcolors</SectionLabel>
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  {/* Color swatch + hidden native picker */}
                  <label style={{ position: 'relative', display: 'block', width: 32, height: 24, flexShrink: 0, cursor: 'pointer' }}>
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={e => setColor(key, e.target.value)}
                      style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', padding: 0, border: 'none' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: colors[key], border: '1px solid rgba(255,255,255,0.15)' }} />
                  </label>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{colors[key]}</span>
                </div>
              ))}
              <div style={{ marginTop: 20, padding: 12, background: '#1e293b', borderRadius: 8, fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.6 }}>
                Klicka på en färgruta för att öppna färgväljaren. Förhandsvisningen uppdateras direkt.
              </div>
            </>
          )}

          {/* ── TEXT ── */}
          {tab === 'text' && (
            <>
              <SectionLabel>Företag</SectionLabel>
              <TF label="Företagsnamn"       value={content.businessName} onChange={v => setField('businessName', v)} />
              <TF label="Tagline"            value={content.tagline}      onChange={v => setField('tagline', v)} />
              <TF label="Kicker / undertitel" value={content.kicker}      onChange={v => setField('kicker', v)} />

              <SectionLabel>Hero-sektion</SectionLabel>
              <TF label="Rubrik"    value={content.heroHeading} onChange={v => setField('heroHeading', v)} rows={2} />
              <TF label="Brödtext" value={content.heroBody}    onChange={v => setField('heroBody', v)}    rows={3} />
              <TF label="Knapp"    value={content.ctaText}     onChange={v => setField('ctaText', v)} />

              <SectionLabel>Om oss</SectionLabel>
              <TF label="Rubrik" value={content.aboutTitle} onChange={v => setField('aboutTitle', v)} />
              <TF label="Text"   value={content.aboutBody}  onChange={v => setField('aboutBody', v)} rows={4} />

              <SectionLabel>Kontakt</SectionLabel>
              <TF label="Telefon"     value={content.phone}   onChange={v => setField('phone', v)} />
              <TF label="Öppettider" value={content.hours}   onChange={v => setField('hours', v)} />
              <TF label="Adress"     value={content.address} onChange={v => setField('address', v)} />
            </>
          )}

          {/* ── SERVICES ── */}
          {tab === 'services' && (
            <>
              {content.services.map((s, i) => (
                <div key={i}>
                  <SectionLabel>Tjänst {i + 1}</SectionLabel>
                  <TF label="Namn"        value={s.name}  onChange={v => setSvc(i, 'name', v)} />
                  <TF label="Beskrivning" value={s.desc}  onChange={v => setSvc(i, 'desc', v)} rows={2} />
                  <TF label="Pris"        value={s.price} onChange={v => setSvc(i, 'price', v)} />
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 12, background: '#1e293b', borderRadius: 8, fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.6 }}>
                Ändringarna syns direkt i förhandsvisningen till vänster.
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
