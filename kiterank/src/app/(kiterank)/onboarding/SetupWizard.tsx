'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SALON_TEMPLATES, TEMPLATES_BY_INDUSTRY } from '@/lib/templates'
import { TRADES } from '@/lib/trades'
import { AboutFields, type AboutBusiness } from './AboutFields'
import { tradePack } from '@/lib/trades'
import { stegKedja, STEG_NAMN, type Steg, type Vilja } from '@/lib/onboarding'

/* ─── Stegen ────────────────────────────────────────────────────────────
 *
 * Registreringen frågar om tre saker och bygger sedan: vem är ni, vad vill ni
 * ha, och vad ska det handla om. Ordningen är inte godtycklig — vad de vill ha
 * avgör vilka steg som ens ska ställas. Den som inte ska ha en hemsida av oss
 * ska aldrig behöva välja mall eller berätta om sin verksamhet för att fylla en
 * sajt som inte skapas.
 *
 * Stegens namn och kedjan bor i lib/onboarding, samma som servern läser. Två
 * listor över samma steg glider isär den dag en av dem ändras.                */

type Step = Steg | 'done'

/* ─── Data ──────────────────────────────────────────────────────────── */

/* The trades we build sites for — the same six the content packs cover, so
   whichever door a customer comes in through, the site they get is written
   for their trade rather than approximated from a neighbouring one. */
const INDUSTRIES = TRADES.map(t => ({ id: t.id, label: t.pick.label, desc: t.pick.desc, icon: t.pick.icon }))

/* Everything ships switched on. A new customer cannot judge which parts of a
   site they need before they have seen the site — the editor is where that
   choice belongs, with the real thing in front of them. */
const ALL_FEATURES = { booking: true, pricelist: true, gallery: true, contact: true, blog: true, reviews: true }

/* What the customer tells us about their business. Every answer becomes text
   on the site — their words and their keywords, ready to edit instead of a
   blank page or someone else's example copy. */

/* ─── Progress bar ──────────────────────────────────────────────────── */

/* Stegräknaren följer kundens egen kedja. Väljer de bort hemsidan krymper den
   från fem steg till tre framför ögonen på dem, vilket är rätt besked: det
   blev kortare, inte att två steg gick förlorade. */
function Progress({ step, vill }: { step: Step; vill: Vilja }) {
  const kedja = stegKedja(vill)
  const idx   = kedja.indexOf(step as Steg)
  return (
    <div className="flex items-center gap-0">
      {kedja.map((s, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done   ? 'bg-mustard text-navy-950' :
                  active ? 'bg-mustard/20 text-mustard ring-2 ring-mustard/50' :
                           'bg-navy-800 text-slate-600'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap
                ${active ? 'text-mustard' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                {STEG_NAMN[s]}
              </span>
            </div>
            {i < kedja.length - 1 && (
              <div className={`w-16 h-0.5 mb-5 mx-1 transition-colors ${done ? 'bg-mustard' : 'bg-navy-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Val ───────────────────────────────────────────────────────────── */

/* Ett val beskrivs efter vad kunden får, inte efter vad det heter internt.
   "Ja, bygg en åt oss" säger mer till en salongsägare än "webbplats: på". */
function Fraga({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5">
      <p className="text-white text-sm font-semibold mb-3">{titel}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Val({ vald, titel, om, onClick }: {
  vald: boolean; titel: string; om: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all
        ${vald ? 'border-mustard bg-mustard/10' : 'border-navy-700 hover:border-navy-500'}`}
    >
      <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
        ${vald ? 'border-mustard' : 'border-navy-600'}`}>
        {vald && <span className="w-2 h-2 rounded-full bg-mustard" />}
      </span>
      <span>
        <span className={`block text-sm font-semibold ${vald ? 'text-mustard' : 'text-white'}`}>{titel}</span>
        <span className="block text-xs text-slate-400 mt-0.5">{om}</span>
      </span>
    </button>
  )
}

/* ─── Main wizard ───────────────────────────────────────────────────── */

export function SetupWizard() {
  const router = useRouter()

  const [step,        setStep]        = useState<Step>('kontakt')
  const [vill,        setVill]        = useState<Vilja>({ sajt: true, bokning: true })
  /* De har redan en hemsida någon annanstans. Sparas separat från `vill.sajt`
     eftersom svaren inte är samma fråga: en salong kan ha en hemsida de vill
     byta ut, och en annan kan sakna hemsida utan att vilja ha en av oss. Det
     avgör dessutom vad vi kan mäta — Google fyller inte i historik i efterhand. */
  const [harSajt,     setHarSajt]     = useState(false)
  const [epost,       setEpost]       = useState('')
  const [telefon,     setTelefon]     = useState('')
  const [industry,    setIndustry]    = useState<string | null>(null)
  const [template,    setTemplate]    = useState<string | null>(null)
  /* Wellness or treatment — asked only for the trades that genuinely straddle
     it, because the trade name cannot tell them apart and guessing would put
     the site under the wrong half of the vocabulary. */
  const [care,        setCare]        = useState<'wellness' | 'care'>('wellness')
  /* Only the trades that genuinely straddle wellness and treatment ask. */
  const asksCare = !!tradePack(industry).askCare
  const [about,       setAbout]       = useState<AboutBusiness>({ description: '', services: '', area: '', special: '', years: '', team: '' })
  const [lang,        setLang]        = useState<'sv' | 'en'>('sv')
  const [bizName,     setBizName]     = useState('')
  const [slug,        setSlug]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [previewId,   setPreviewId]   = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('')

  /* Kedjan styr riktningen, inte en trappa av if-satser. Ändras stegen på ett
     ställe följer fram, bak och stegräknaren med av sig själva. */
  const kedja  = stegKedja(vill)
  const sista  = kedja[kedja.length - 1]

  async function nextStep() {
    if (step !== sista) {
      const i = kedja.indexOf(step as Steg)
      if (i !== -1) setStep(kedja[i + 1])
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/setup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          industry, template, about, language: lang, bizName,
          care: asksCare ? care : null,
          /* Bokningen följer vad de svarat, inte ett förval. Att slå på ett
             bokningssystem åt någon som sagt nej är att bygga en knapp de får
             leta rätt på och stänga av. */
          features: { ...ALL_FEATURES, booking: vill.bokning },
          vill, harSajt, epost, telefon,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setSaveError(json.error ?? 'Något gick fel.'); return }
      /* Heter en annan salong likadant valde servern en adress med orten
         i — och då är det den kunden ska se på klarsidan, inte förslaget. */
      if (json.slug) setSlug(json.slug)
      setStep('done')
    } finally {
      setSaving(false)
    }
  }

  function prevStep() {
    const i = kedja.indexOf(step as Steg)
    if (i > 0) setStep(kedja[i - 1])
  }

  function canNext(): boolean {
    if (step === 'kontakt') return bizName.trim().length > 0 && epost.trim().includes('@')
    if (step === 'vilja')   return true
    if (step === 'bransch') return !!industry
    if (step === 'mall')    return !!template
    if (step === 'om')      return true
    return false
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
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <div className="w-20 h-20 rounded-full bg-mustard/15 border-2 border-mustard/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-mustard text-3xl">✓</span>
          </div>
          {/* Klarsidan säger vad som faktiskt hänt. Den som valt bort hemsidan
              ska inte mötas av "din hemsida är klar" och en knapp till en
              redigerare för en sida som inte finns. */}
          <h2 className="text-3xl font-bold text-white mb-2">
            {vill.sajt ? 'Din hemsida är klar!' : 'Kontot är klart!'}
          </h2>
          <p className="text-slate-400 mb-8">
            {vill.sajt
              ? 'Texterna är skrivna utifrån det du berättade — öppna redigeraren och gör dem till dina.'
              : 'Nu sätter vi igång med din synlighet. Börja med att koppla din Google-profil.'}
          </p>

          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 text-left space-y-4 mb-8">
            <Row label="Bransch"  value={industryLabel} />
            {vill.sajt && <Row label="Design" value={templateLabel} />}
            <Row label="Tidbokning" value={vill.bokning ? 'På' : 'Av'} />
            <Row label="Språk"    value={lang === 'sv' ? 'Svenska' : 'English'} />
            {vill.sajt && <Row label="Adress" value={`kiterank.se/s/${slug}`} mono />}
          </div>

          <button
            onClick={() => router.push(vill.sajt ? '/dashboard/webbplats' : '/dashboard')}
            className="w-full py-3.5 bg-mustard text-navy-950 font-bold rounded-xl text-base hover:bg-mustard/90 transition-colors"
          >
            {vill.sajt ? 'Öppna din hemsida →' : 'Till din översikt →'}
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
          <Progress step={step} vill={vill} />
        </div>

        {/* ── Steg: Vad du vill ha ──────────────────────────────── */}
        {step === 'vilja' && (
          <div className="w-full max-w-xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Vad ska vi göra åt er?</h2>
              <p className="text-slate-400">
                Svaren avgör vad du får se härnäst. Du kan lägga till det andra när som helst.
              </p>
            </div>

            {/* Hemsidan. Tre svar och inte två: den som redan har en sida och
                vill behålla den är ett annat fall än den som inte har någon,
                och skillnaden avgör vad vi kan mäta åt dem sedan. */}
            <Fraga titel="Ska vi bygga er hemsida?">
              {([
                [true,  false, 'Ja, bygg en åt oss',        'Vi sätter ihop en färdig sida av det du berättar i nästa steg.'],
                [true,  true,  'Ja, vi har en vi vill byta', 'Samma sak — och vi hjälper dig flytta din domän till den nya.'],
                [false, true,  'Nej, vi har redan en',       'Vi lämnar sidan i fred och jobbar med din synlighet i stället.'],
              ] as const).map(([sajt, redan, titel, om]) => {
                const vald = vill.sajt === sajt && harSajt === redan
                return (
                  <Val key={titel} vald={vald} titel={titel} om={om}
                       onClick={() => { setVill(v => ({ ...v, sajt })); setHarSajt(redan) }} />
                )
              })}
            </Fraga>

            {/* Bokningen frågas separat. En salong kan mycket väl vilja ha en
                sida utan tidbokning — och tvärtom. */}
            <Fraga titel="Ska kunder kunna boka tid själva?">
              {([
                [true,  'Ja, med tidbokning',  'Kunder bokar dygnet runt, du ser allt i en kalender.'],
                [false, 'Nej, de ringer oss',  'Vi visar telefonnumret tydligt i stället.'],
              ] as const).map(([b, titel, om]) => (
                <Val key={titel} vald={vill.bokning === b} titel={titel} om={om}
                     onClick={() => setVill(v => ({ ...v, bokning: b }))} />
              ))}
            </Fraga>
          </div>
        )}

        {/* ── Step: Bransch ─────────────────────────────────────── */}
        {step === 'bransch' && (
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Vilken sorts salong driver du?</h2>
            <p className="text-slate-400 mb-8">
              Alla designer är öppna för alla — valet fyller hemsidan med prislista, artiklar och texter
              skrivna för just din bransch.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.id}
                  onClick={() => { setIndustry(ind.id); setTemplate(null) }}
                  className={`text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all
                    ${industry === ind.id
                      ? 'border-mustard bg-mustard/10'
                      : 'border-navy-700 bg-navy-900 hover:border-navy-500'}`}
                >
                  <span className={`text-xl shrink-0 ${industry === ind.id ? 'text-mustard' : 'text-slate-500'}`}>{ind.icon}</span>
                  <span>
                    <span className={`block text-sm font-semibold ${industry === ind.id ? 'text-mustard' : 'text-white'}`}>{ind.label}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">{ind.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Mall ────────────────────────────────────────── */}
        {step === 'mall' && (
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Välj en mall</h2>
            <p className="text-slate-400 mb-6">Du kan alltid byta mall och anpassa färger och text senare.</p>
            <div className="grid grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-1">
              {SALON_TEMPLATES.map(t => {
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

        {/* ── Step: Om din verksamhet ───────────────────────────── */}
        {step === 'om' && (
          <div className="w-full max-w-xl">
            <h2 className="text-2xl font-bold text-white mb-1">Berätta om din verksamhet</h2>
            <p className="text-slate-400 mb-2">
              Vi sätter ihop hela hemsidan av det du skriver här — dina ord, dina tjänster, din ort.
            </p>
            <p className="text-mustard text-sm font-medium mb-8">
              Av dina svar bygger vi startsida, om oss, prislista och sex artiklar. Ju mer du berättar, desto mer blir dina egna ord. Allt går att ändra sen.
            </p>
            {asksCare && (
              <div className="mb-8 bg-navy-800 rounded-xl border border-navy-700 p-5">
                <p className="text-white text-sm font-medium mb-1">Vad är det för slags behandlingar?</p>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                  Svaret avgör hur Google förstår din verksamhet. Friskvård och behandling av besvär hör till olika kategorier, och det går inte att läsa ut av branschnamnet.
                </p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ['wellness', 'Friskvård och avkoppling'],
                    ['care',     'Behandling av besvär och skador'],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setCare(id)}
                      className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                        care === id
                          ? 'bg-mustard text-navy-950 border-mustard font-semibold'
                          : 'text-slate-300 border-navy-600 hover:border-navy-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AboutFields about={about} onChange={setAbout} />
          </div>
        )}

        {/* ── Step: Inställningar ───────────────────────────────── */}
        {step === 'kontakt' && (
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-1">Vilka är ni?</h2>
            <p className="text-slate-400 mb-8">Namnet blir rubriken på din sida, och e-posten är dit vi hör av oss.</p>

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
                    setSlug(autoSlug(e.target.value))
                  }}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-mustard/50 focus:ring-1 focus:ring-mustard/30 transition-colors"
                />
              </div>

              {/* E-post. Obligatorisk, och det är inte en formalitet: hit går
                  beskedet när något går sönder på deras sida och påminnelsen
                  innan domänen löper ut. En adress ingen läser är samma sak
                  som ingen adress. */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">E-post</label>
                <input
                  type="email"
                  value={epost}
                  placeholder="du@dinsalong.se"
                  onChange={e => setEpost(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-mustard/50 focus:ring-1 focus:ring-mustard/30 transition-colors"
                />
                <p className="text-slate-500 text-xs mt-1.5">Använd en adress du läser. Hit går viktiga besked om din sida.</p>
              </div>

              {/* Telefonen är frivillig här men hamnar på sidan om den fylls i —
                  därför står det, i stället för att den tyst dyker upp publikt. */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telefon <span className="text-slate-500 font-normal">(frivilligt)</span>
                </label>
                <input
                  type="tel"
                  value={telefon}
                  placeholder="070-123 45 67"
                  onChange={e => setTelefon(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-mustard/50 focus:ring-1 focus:ring-mustard/30 transition-colors"
                />
                <p className="text-slate-500 text-xs mt-1.5">Visas på din hemsida så kunder kan ringa. Kan ändras senare.</p>
              </div>

              {/* Adressen, som en uppgift och inte en fråga. Den är
                  tillfällig tills salongen kopplar sin egen domän, och den
                  bestäms av servern — det är det enda stället som vet vad
                  som är ledigt när två salonger heter likadant. */}
              {slug && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Din webbadress</label>
                  <p className="bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-mono">
                    kiterank.se/s/{slug}
                  </p>
                  <p className="text-slate-500 text-xs mt-1.5">
                    Tillfällig adress. Kopplar du din egen domän blir den din riktiga — och det är den Google visar.
                  </p>
                </div>
              )}

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
            {step !== kedja[0] ? (
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
              {saving ? 'Skapar…' : step === sista ? (vill.sajt ? 'Skapa webbplats →' : 'Skapa konto →') : 'Nästa →'}
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
