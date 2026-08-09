'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTemplatesForIndustry, TEMPLATES_BY_INDUSTRY } from './templates'

/* ─── Step definitions ──────────────────────────────────────────────── */

type Step = 'industry' | 'template' | 'features' | 'settings' | 'done'

const STEP_LIST: { key: Step; label: string }[] = [
  { key: 'industry', label: 'Bransch'       },
  { key: 'template', label: 'Mall'          },
  { key: 'features', label: 'Funktioner'    },
  { key: 'settings', label: 'Inställningar' },
]

/* ─── Data ──────────────────────────────────────────────────────────── */

const INDUSTRIES = [
  { id: 'salon',       label: 'Frisörsalonger',    icon: '✂'  },
  { id: 'beauty',      label: 'Skönhetssalonger',  icon: '◈'  },
  { id: 'restaurant',  label: 'Restaurang & Café', icon: '⊕'  },
  { id: 'craftsman',   label: 'Bygg & Hantverk',  icon: '⊡'  },
  { id: 'cleaning',    label: 'Städservice',       icon: '✦'  },
  { id: 'other',       label: 'Annat',             icon: '⊞'  },
]

type FeatureId = 'booking' | 'blog' | 'gallery' | 'contact' | 'pricelist' | 'reviews'

const FEATURES: { id: FeatureId; label: string; desc: string; icon: string; defaultOn: boolean }[] = [
  { id: 'booking',   label: 'Bokningssystem',  desc: 'Kunder bokar tider direkt på sidan',     icon: '◻', defaultOn: true  },
  { id: 'pricelist', label: 'Prislista / Meny', desc: 'Visa tjänster och priser tydligt',      icon: '◈', defaultOn: true  },
  { id: 'gallery',   label: 'Bildgalleri',      desc: 'Visa upp ditt arbete med foton',         icon: '⬡', defaultOn: true  },
  { id: 'contact',   label: 'Kontaktformulär',  desc: 'Kunder kan skicka meddelanden',          icon: '✉', defaultOn: true  },
  { id: 'blog',      label: 'Blogg & Artiklar', desc: 'Dela nyheter, tips och guider',          icon: '▤', defaultOn: false },
  { id: 'reviews',   label: 'Kundrecensioner',  desc: 'Lyft fram dina bästa omdömen',           icon: '✦', defaultOn: false },
]

/* ─── Toggle switch ─────────────────────────────────────────────────── */

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={e => { e.stopPropagation(); onChange(!on) }}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-mustard' : 'bg-navy-700'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

/* ─── Progress bar ──────────────────────────────────────────────────── */

function Progress({ step }: { step: Step }) {
  const idx = STEP_LIST.findIndex(s => s.key === step)
  return (
    <div className="flex items-center gap-0">
      {STEP_LIST.map((s, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done   ? 'bg-mustard text-navy-950' :
                  active ? 'bg-mustard/20 text-mustard ring-2 ring-mustard/50' :
                           'bg-navy-800 text-slate-600'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap
                ${active ? 'text-mustard' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                {s.label}
              </span>
            </div>
            {i < STEP_LIST.length - 1 && (
              <div className={`w-16 h-0.5 mb-5 mx-1 transition-colors ${done ? 'bg-mustard' : 'bg-navy-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main wizard ───────────────────────────────────────────────────── */

export function SetupWizard() {
  const router = useRouter()

  const [step,        setStep]        = useState<Step>('industry')
  const [industry,    setIndustry]    = useState<string | null>(null)
  const [template,    setTemplate]    = useState<string | null>(null)
  const [features,    setFeatures]    = useState<Record<FeatureId, boolean>>(
    () => Object.fromEntries(FEATURES.map(f => [f.id, f.defaultOn])) as Record<FeatureId, boolean>
  )
  const [lang,        setLang]        = useState<'sv' | 'en'>('sv')
  const [bizName,     setBizName]     = useState('')
  const [slug,        setSlug]        = useState('')
  const [slugEdited,  setSlugEdited]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [previewId,   setPreviewId]   = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('')

  async function nextStep() {
    if (step === 'industry')  { setStep('template'); return }
    if (step === 'template')  { setStep('features'); return }
    if (step === 'features')  { setStep('settings'); return }
    if (step === 'settings') {
      setSaving(true)
      setSaveError(null)
      try {
        const res = await fetch('/api/setup', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ industry, template, features, language: lang, bizName, slug }),
        })
        const json = await res.json()
        if (!res.ok) { setSaveError(json.error ?? 'Något gick fel.'); return }
        setStep('done')
      } finally {
        setSaving(false)
      }
    }
  }

  function prevStep() {
    if (step === 'template') setStep('industry')
    else if (step === 'features') setStep('template')
    else if (step === 'settings') setStep('features')
  }

  function canNext(): boolean {
    if (step === 'industry') return !!industry
    if (step === 'template') return !!template
    if (step === 'features') return true
    if (step === 'settings') return bizName.trim().length > 0 && slug.trim().length > 0
    return false
  }

  function handleSlugInput(val: string) {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-'))
  }

  function autoSlug(name: string) {
    return name.toLowerCase()
      .replace(/å/g,'a').replace(/ä/g,'a').replace(/ö/g,'o')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
  }

  /* Done screen */
  if (step === 'done') {
    const industryLabel = INDUSTRIES.find(i => i.id === industry)?.label ?? ''
    const templateLabel = Object.values(TEMPLATES_BY_INDUSTRY).flat().find(t => t.id === template)?.name ?? ''
    const enabledFeatures = FEATURES.filter(f => features[f.id])
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <div className="w-20 h-20 rounded-full bg-mustard/15 border-2 border-mustard/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-mustard text-3xl">✓</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Allt klart!</h2>
          <p className="text-slate-400 mb-8">Din webbplats sätts upp nu. Här är en sammanfattning:</p>

          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 text-left space-y-4 mb-8">
            <Row label="Bransch"   value={industryLabel} />
            <Row label="Mall"      value={templateLabel} />
            <Row label="Språk"     value={lang === 'sv' ? 'Svenska' : 'English'} />
            <Row label="Funktioner" value={enabledFeatures.map(f => f.label).join(', ')} />
            <Row label="Adress"    value={`${slug}.kiterank.se`} mono />
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 bg-mustard text-navy-950 font-bold rounded-xl text-base hover:bg-mustard/90 transition-colors"
          >
            Öppna instrumentpanelen →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-navy-800 px-6 py-4 flex items-center justify-between">
        <span className="text-white font-bold text-lg tracking-tight">Kiterank</span>
        <span className="text-slate-500 text-sm">Konfigurera din webbplats</span>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-6 py-10">
        {/* Progress */}
        <div className="mb-10">
          <Progress step={step} />
        </div>

        {/* ── Step: Bransch ─────────────────────────────────────── */}
        {step === 'industry' && (
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Vad driver du för verksamhet?</h2>
            <p className="text-slate-400 mb-8">Vi anpassar din webbplats och bokningssystem efter din bransch.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.id}
                  onClick={() => setIndustry(ind.id)}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all
                    ${industry === ind.id
                      ? 'border-mustard bg-mustard/10 text-mustard'
                      : 'border-navy-700 bg-navy-900 text-slate-400 hover:border-navy-500 hover:text-white'}`}
                >
                  <span className="text-2xl">{ind.icon}</span>
                  <span className="text-xs font-medium text-center leading-tight">{ind.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Mall ────────────────────────────────────────── */}
        {step === 'template' && (
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Välj en mall</h2>
            <p className="text-slate-400 mb-6">Du kan alltid byta mall och anpassa färger och text senare.</p>
            <div className="grid grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-1">
              {getTemplatesForIndustry(industry).map(t => {
                const active = template === t.id
                return (
                  <div
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`rounded-xl border-2 overflow-hidden transition-all cursor-pointer
                      ${active ? 'border-mustard' : 'border-navy-700 hover:border-navy-500'}`}
                  >
                    {/* Scaled iframe thumbnail — shows real homepage preview */}
                    <div
                      className="relative overflow-hidden"
                      style={{ height: 200, backgroundColor: t.colors.bg }}
                    >
                      <iframe
                        src={`/preview/${t.id}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 1280,
                          height: 860,
                          transform: 'scale(0.25)',
                          transformOrigin: 'top left',
                          border: 'none',
                          pointerEvents: 'none',
                        }}
                        loading="lazy"
                        title={`Preview: ${t.name}`}
                      />
                    </div>
                    {/* Card label + preview link */}
                    <div className={`px-3 py-2.5 flex items-center justify-between gap-2 ${active ? 'bg-mustard/10' : 'bg-navy-900'}`}>
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm ${active ? 'text-mustard' : 'text-white'}`}>{t.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5 truncate">{t.tagline}</p>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setPreviewId(t.id)
                          setPreviewName(t.name)
                        }}
                        className="shrink-0 text-xs text-slate-500 hover:text-mustard transition-colors whitespace-nowrap bg-transparent border-0 p-0 cursor-pointer"
                      >
                        Förhandsgranska
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step: Funktioner ──────────────────────────────────── */}
        {step === 'features' && (
          <div className="w-full max-w-xl">
            <h2 className="text-2xl font-bold text-white mb-1">Vilka funktioner vill du ha?</h2>
            <p className="text-slate-400 mb-8">Aktivera eller inaktivera sidor och funktioner. Du kan ändra detta när som helst.</p>
            <div className="space-y-3">
              {FEATURES.map(f => (
                <div
                  key={f.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer
                    ${features[f.id] ? 'bg-navy-900 border-navy-600' : 'bg-navy-900/50 border-navy-800'}`}
                  onClick={() => setFeatures(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
                >
                  <span className={`text-xl w-7 text-center ${features[f.id] ? 'text-mustard' : 'text-slate-600'}`}>{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${features[f.id] ? 'text-white' : 'text-slate-500'}`}>{f.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{f.desc}</p>
                  </div>
                  <Toggle on={features[f.id]} onChange={v => setFeatures(prev => ({ ...prev, [f.id]: v }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Inställningar ───────────────────────────────── */}
        {step === 'settings' && (
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-1">Grundinställningar</h2>
            <p className="text-slate-400 mb-8">Ange ditt företagsnamn, din webbadress och vilket språk webbplatsen ska vara på.</p>

            <div className="space-y-6">
              {/* Business name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Företagsnamn</label>
                <input
                  type="text"
                  value={bizName}
                  placeholder="T.ex. Atelier Hair"
                  onChange={e => {
                    setBizName(e.target.value)
                    if (!slugEdited) setSlug(autoSlug(e.target.value))
                  }}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-mustard/50 focus:ring-1 focus:ring-mustard/30 transition-colors"
                />
              </div>

              {/* URL / slug */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Din webbadress</label>
                <div className="flex items-center bg-navy-900 border border-navy-700 rounded-xl overflow-hidden focus-within:border-mustard/50 focus-within:ring-1 focus-within:ring-mustard/30 transition-colors">
                  <span className="px-3 py-3 text-slate-500 text-sm border-r border-navy-700 select-none whitespace-nowrap">kiterank.se/</span>
                  <input
                    type="text"
                    value={slug}
                    placeholder="din-salong"
                    onChange={e => { setSlugEdited(true); handleSlugInput(e.target.value) }}
                    className="flex-1 bg-transparent px-3 py-3 text-white placeholder-slate-600 focus:outline-none text-sm"
                  />
                </div>
                {slug && (
                  <p className="text-slate-500 text-xs mt-1.5">Din bokningslänk blir: <span className="text-slate-300">{slug}.kiterank.se/boka</span></p>
                )}
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Webbplatsens språk</label>
                <div className="flex gap-3">
                  {([
                    { id: 'sv' as const, label: 'Svenska',  flag: '🇸🇪' },
                    { id: 'en' as const, label: 'English',  flag: '🇬🇧' },
                  ]).map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLang(l.id)}
                      className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 text-sm font-medium transition-all
                        ${lang === l.id
                          ? 'border-mustard bg-mustard/10 text-mustard'
                          : 'border-navy-700 bg-navy-900 text-slate-400 hover:border-navy-500 hover:text-white'}`}
                    >
                      <span>{l.flag}</span>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Nav buttons ───────────────────────────────────────── */}
        <div className="mt-10 w-full max-w-2xl">
          {saveError && (
            <p className="text-red-400 text-sm text-center mb-4">{saveError}</p>
          )}
          <div className="flex items-center gap-4 justify-between">
            {step !== 'industry' ? (
              <button
                onClick={prevStep}
                disabled={saving}
                className="px-6 py-2.5 text-slate-400 hover:text-white border border-navy-700 hover:border-navy-500 rounded-xl text-sm transition-colors disabled:opacity-40"
              >
                ← Tillbaka
              </button>
            ) : <div />}

            <button
              onClick={nextStep}
              disabled={!canNext() || saving}
              className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${canNext() && !saving
                  ? 'bg-mustard text-navy-950 hover:bg-mustard/90'
                  : 'bg-navy-800 text-slate-600 cursor-not-allowed'}`}
            >
              {saving ? 'Skapar…' : step === 'settings' ? 'Skapa webbplats →' : 'Nästa →'}
            </button>
          </div>
        </div>
      </main>

      {/* ── Full-screen preview overlay ──────────────────────────── */}
      {previewId && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
          <div className="flex items-center gap-4 px-5 shrink-0" style={{ height: 56, background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
            <button
              onClick={() => setPreviewId(null)}
              className="flex items-center gap-2 px-4 py-2 bg-mustard text-navy-950 font-semibold text-sm rounded-lg hover:bg-mustard/90 transition-colors shrink-0"
            >
              ← Tillbaka till mallval
            </button>
            <span className="text-slate-500 text-sm">
              Förhandsgranskar: <strong className="text-slate-300">{previewName}</strong>
            </span>
          </div>
          <iframe
            src={`/preview/${previewId}`}
            className="flex-1 w-full border-0"
            title={`Förhandsgranskning: ${previewName}`}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Helper ────────────────────────────────────────────────────────── */

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500 text-sm shrink-0">{label}</span>
      <span className={`text-slate-200 text-sm text-right ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )
}
