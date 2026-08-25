'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Paketval, type Paketpriser } from './Paketval'
import { SALON_TEMPLATES, TEMPLATES_BY_INDUSTRY } from '@/lib/templates'
import { TRADES } from '@/lib/trades'
import { tradePack } from '@/lib/trades'
import { DesignBriefFalt } from './DesignBriefFalt'
import { EgenDesign } from './EgenDesign'
import {
  stegKedja, STEG_NAMN, TOM_BRIEF,
  type Steg, type Vilja, type Paketväg, type DesignBrief,
} from '@/lib/onboarding'

/* ─── Stegen ────────────────────────────────────────────────────────────
 *
 * Fyra steg för mallkunden, fyra för premiumkunden, och tre av dem är samma:
 * vilka är ni, vilken bransch, och era egna ord om verksamheten. Först på det
 * tredje skiljer det sig — välj en design, eller berätta hur er ska se ut.
 *
 * Domänen frågas inte här. Sidan publiceras på en adress hos oss direkt, och
 * en egen webbadress kopplar man när sidan är färdig — inte det första någon
 * vill fundera på.
 *
 * Stegens namn och kedjan bor i lib/onboarding, samma som servern läser. Två
 * listor över samma steg glider isär den dag en av dem ändras.                */

type Step = Steg | 'done'

/* ─── Data ──────────────────────────────────────────────────────────── */

/* The trades we build sites for — the same six the content packs cover, so
   whichever door a customer comes in through, the site they get is written
   for their trade rather than approximated from a neighbouring one. */
const INDUSTRIES = [
  ...TRADES.map(t => ({ id: t.id, label: t.pick.label, desc: t.pick.desc, icon: t.pick.icon })),
  /*
   * Annat, sist i listan.
   *
   * Ingen egen innehållsuppsättning — sidan fylls med den bredaste vi har och
   * skrivs om av kunden. Men Google får rätt besked: ett okänt id ger
   * LocalBusiness i stället för ett påstående om att de är en frisörsalong,
   * vilket är sant och därmed bättre än en gissning.
   *
   * Finns med för att alternativet är värre. Utan det väljer den som driver
   * något vi inte listat närmaste grannen, och då bygger vi en sida för fel
   * verksamhet utan att någonsin få veta det.
   */
  { id: 'other', label: 'Annat', desc: 'Något annat inom skönhet och välbefinnande', icon: '◌' },
]

/* Everything ships switched on. A new customer cannot judge which parts of a
   site they need before they have seen the site — the editor is where that
   choice belongs, with the real thing in front of them. */
const ALL_FEATURES = { booking: true, pricelist: true, gallery: true, contact: true, blog: true, reviews: true }

/* ─── Progress bar ──────────────────────────────────────────────────── */

/* Stegräknaren följer kundens egen kedja, och de två vägarna har olika sista
   steg — Design eller Er design.
 *
 * Listan står lodrätt vid sidan av innehållet och visar alla tre stegen från
 * första skärmen. Den som ser "Konto" ensamt tror att kontot är hela ärendet;
 * den som ser 1–3 vet att det är tre skärmar och att sidan står uppe efter
 * den sista. Kommande steg är därför lika synliga som det man står på. */
function Progress({ step, kedja }: { step: Step; kedja: Steg[] }) {
  const idx = kedja.indexOf(step as Steg)
  return (
    <ol className="space-y-0">
      {kedja.map((s, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <li key={s}>
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done   ? 'bg-mustard text-navy-950' :
                  active ? 'bg-mustard/20 text-mustard ring-2 ring-mustard/50' :
                           'bg-navy-800 text-slate-600'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-medium transition-colors
                ${active ? 'text-mustard' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                {STEG_NAMN[s]}
              </span>
            </div>
            {i < kedja.length - 1 && (
              <div className={`ml-3.5 w-0.5 h-6 transition-colors ${done ? 'bg-mustard' : 'bg-navy-700'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ─── Main wizard ───────────────────────────────────────────────────── */

export function SetupWizard({
  väg = 'mall', provTill = null, valtPaket = null,
  inloggad = false, behöverVälja = false,
  priser = { mall: null, design: null, fullservice: null },
  förifyllt = { bizName: '', epost: '' },
}: {
  /** Paketvägen. Premium hoppar över mallvalet och frågar om designen i stället. */
  väg?:      Paketväg
  /** Provets slutdatum, färdigformaterat — sätts av servern. */
  provTill?: string | null
  /** Paketet från länken, för den som ännu inte har ett konto. */
  valtPaket?: string | null
  /** Har besökaren redan ett konto? Styr om steg 1 skapar ett. */
  inloggad?: boolean
  /** Visa paketvalet före guiden — de kom utan att ha valt något. */
  behöverVälja?: boolean
  /** Månadspriserna ur Stripes katalog, till paketvalet. */
  priser?: Paketpriser
  /** Det kunden redan lämnat vid registreringen. */
  förifyllt?: { bizName: string; epost: string }
}) {
  const router = useRouter()

  /*
   * Paketvalet, om det inte redan är gjort.
   *
   * Skärmen ligger före steg 1 och räknas inte som ett steg — den är en
   * vägvisare, inte en fråga om verksamheten. Valet styr både vilken guide
   * som visas och vad som skickas till servern som önskat paket.
   */
  const [väljer,      setVäljer]      = useState(behöverVälja)
  const [nivå,        setNivå]        = useState<string | null>(valtPaket)
  const [vägen,       setVägen]       = useState<Paketväg>(väg)

  /* Kontot skapas i steg 1 om det inte redan finns. Flaggan följer med i
     klienten, så att den som just registrerat sig inte möts av lösenordsfältet
     igen när de backar tillbaka till första skärmen. */
  const [harKonto,    setHarKonto]    = useState(inloggad)
  const [losenord,    setLosenord]    = useState('')

  const [step,        setStep]        = useState<Step>('kontakt')
  /*
   * Hemsidan är alltid med, bokningen aldrig.
   *
   * Sajten ingår i varje paket vi säljer, så det finns inget att fråga om.
   * Bokningen är ett tillägg som köps i abonnemangsfliken där priset syns —
   * inte något kunden råkar få med sig från registreringen utan att ha sett
   * vad det kostar.
   */
  const [vill] = useState<Vilja>({ sajt: true, bokning: false })
  const [epost,       setEpost]       = useState(förifyllt.epost)
  const [telefon,     setTelefon]     = useState('')
  const [industry,    setIndustry]    = useState<string | null>(null)
  const [template,    setTemplate]    = useState<string | null>(null)
  /* Wellness or treatment — asked only for the trades that genuinely straddle
     it, because the trade name cannot tell them apart and guessing would put
     the site under the wrong half of the vocabulary. */
  const [care,        setCare]        = useState<'wellness' | 'care'>('wellness')
  /* Only the trades that genuinely straddle wellness and treatment ask. */
  const asksCare = !!tradePack(industry).askCare
  const [lang,        setLang]        = useState<'sv' | 'en'>('sv')
  const [bizName,     setBizName]     = useState(förifyllt.bizName)
  const [slug,        setSlug]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [previewId,   setPreviewId]   = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('')
  const [brief,       setBrief]       = useState<DesignBrief>(TOM_BRIEF)

  /* Kedjan styr riktningen, inte en trappa av if-satser. Ändras stegen på ett
     ställe följer fram, bak och stegräknaren med av sig själva. */
  const kedja  = stegKedja(vägen)
  const sista  = kedja[kedja.length - 1]

  /*
   * Kontot skapas här, inte på en sida före.
   *
   * Adressen och företagsnamnet i steg 1 är samma uppgifter en separat
   * registreringssida hade frågat om — att dela upp dem på två skärmar
   * betydde att kunden skrev sitt namn två gånger och trodde att det första
   * försöket gått förlorat.
   *
   * Lösenordet står bara här. Kommer de via Google finns kontot redan, och då
   * ska ingen be dem hitta på ett lösenord de aldrig kommer att använda.
   */
  async function skapaKonto(): Promise<boolean> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email:    epost.trim(),
      password: losenord,
      options:  { data: { biz_name: bizName.trim() || null } },
    })

    if (error) {
      setSaveError(felPåSvenska(error.message))
      return false
    }

    /*
     * Konto men ingen session betyder att e-postbekräftelsen är påslagen i
     * Supabase. Då kan guiden inte fortsätta — /api/setup skriver med kundens
     * egen session, och den finns inte förrän adressen är bekräftad.
     */
    if (!data.session) {
      setSaveError('Kolla din mejl och bekräfta adressen, så fortsätter vi här.')
      return false
    }

    setHarKonto(true)
    return true
  }

  async function nextStep() {
    setSaveError(null)

    /* Steg 1 gör två saker för den utan konto: skapar det, och går vidare
       först när det gick vägen. Ett misslyckat försök ska stanna kvar på
       skärmen med fälten ifyllda. */
    if (step === 'kontakt' && !harKonto) {
      setSaving(true)
      try {
        if (!(await skapaKonto())) return
      } finally {
        setSaving(false)
      }
    }

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
          /* Inget `about` längre. Sidan byggs på branschens innehåll, och
             kundens egna ord fylls i panelen där textfyllaren hjälper till
             och sidan står bredvid att jämföra med. */
          industry, template, language: lang, bizName,
          care: asksCare ? care : null,
          /* Sajten byggs utan bokningsknapp. Den tillkommer när kunden köper
             tillägget, och sätts då av samma svar som öppnar kalendern. */
          features: { ...ALL_FEATURES, booking: vill.bokning },
          vill, epost, telefon,
          /* Designunderlaget bara för den som köpt en formgiven sida. */
          brief: vägen === 'premium' ? brief : null,
          /* Paketet kunden valt — från länken eller från paketskärmen. Servern
             avgör om det får gälla; ett val i webbläsaren ska aldrig kunna
             uppgradera någon gratis. */
          valtPaket: nivå,
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
    if (step === 'kontakt') {
      const grunden = bizName.trim().length > 0 && epost.trim().includes('@')
      /* Åtta tecken är Supabases minimum. Att låta knappen se ut att fungera
         och sedan avvisa lösenordet är en omväg genom ett felmeddelande. */
      return harKonto ? grunden : grunden && losenord.length >= 8
    }
    if (step === 'bransch') return !!industry
    /* Designfrågorna går att hoppa förbi. Tomma fält blir ett samtal, inte ett
       hinder — och att låsa in någon i ett formulär är ett säkrare sätt att
       förlora dem än att sakna ett svar. */
    if (step === 'brief')   return true
    if (step === 'mall')    return !!template
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
          {/*
            * Klarsidan säger vad som faktiskt händer härnäst, och det skiljer
            * sig helt mellan vägarna.
            *
            * Mallkunden har en färdig sida att öppna. Premiumkunden har en
            * beställning hos oss — att säga "din hemsida är klar" till någon
            * vars sida ingen ritat än vore ett löfte vi bryter samma kväll.
            */}
          <h2 className="text-3xl font-bold text-white mb-2">
            {vägen === 'premium' ? 'Tack — nu tar vi över' : 'Din hemsida är klar!'}
          </h2>
          <p className="text-slate-400 mb-8">
            {vägen === 'premium'
              ? 'Vi ritar ert förslag utifrån svaren och hör av oss inom två arbetsdagar. Under tiden kan du koppla din Google-profil, så börjar mätningen samla data redan nu.'
              : 'Texterna är skrivna utifrån det du berättade — öppna redigeraren och gör dem till dina.'}
          </p>

          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 text-left space-y-4 mb-8">
            <Row label="Bransch"  value={industryLabel} />
            {vägen === 'mall' && <Row label="Design" value={templateLabel} />}
            <Row label="Språk"    value={lang === 'sv' ? 'Svenska' : 'English'} />
            <Row label="Adress" value={`kiterank.se/s/${slug}`} mono />
          </div>

          <button
            onClick={() => router.push(vägen === 'premium' ? '/dashboard' : '/dashboard/webbplats')}
            className="w-full py-3.5 bg-mustard text-navy-950 font-bold rounded-xl text-base hover:bg-mustard/90 transition-colors"
          >
            {vägen === 'premium' ? 'Till din översikt →' : 'Öppna din hemsida →'}
          </button>

          {/* Klockan, utskriven. Utan den upptäcker kunden att provet fanns
              först den dag panelen är låst. */}
          {provTill && (
            <p className="text-xs text-slate-500 leading-relaxed mt-4">
              Ditt prov gäller till {provTill}. Vi påminner dig innan det tar slut, och
              ingenting dras utan att du sagt ja.
            </p>
          )}
        </div>
      </div>
    )
  }

  /* ── Paketvalet, före steg 1 ─────────────────────────────────────────
     Egen skärm utan stegräknare. Den som inte valt paket har inte börjat
     registrera sig än — de bestämmer vilken registrering det ska bli. */
  if (väljer) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col">
        <header className="border-b border-navy-800 px-6 py-4 flex items-center justify-between">
          <span className="text-white font-bold text-lg tracking-tight">Kiterank</span>
          <span className="text-slate-500 text-sm">
            Har du redan ett konto?{' '}
            <Link href="/auth/login" className="text-mustard hover:text-mustard-light">Logga in</Link>
          </span>
        </header>
        <main className="flex-1 flex items-center px-6 py-12">
          <Paketval
            priser={priser}
            onVälj={n => {
              setNivå(n)
              setVägen(n === 'mall' ? 'mall' : 'premium')
              setVäljer(false)
            }}
          />
        </main>
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

      {/* Content — steglistan står lodrätt vid sidan av innehållet, så att alla
          tre stegen syns under hela guiden och inte bara det man står på. */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row md:gap-14">
        <aside className="shrink-0 mb-10 md:mb-0 md:w-44 md:pt-2">
          <Progress step={step} kedja={kedja} />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col items-center">

        {/* ── Step: Er design ───────────────────────────────────────
            Bara premium. De har betalat för att slippa välja mall, så här
            frågar vi det vi behöver för att rita åt dem i stället. */}
        {step === 'brief' && (
          <div className="w-full max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Hur ska sidan se ut?</h2>
              <p className="text-slate-400">
                Vi designar den åt er. De här svaren är vad vi utgår från — hoppa över det du
                är osäker på, vi tar resten i ett samtal.
              </p>
            </div>
            <DesignBriefFalt brief={brief} onChange={setBrief} />
          </div>
        )}

        {/* ── Step: Bransch ─────────────────────────────────────── */}
        {step === 'bransch' && (
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Vilken sorts salong driver du?</h2>
            <p className="text-slate-400 mb-8">
              Valet säger till Google vilken typ av företag ni är samt fyller hemsidan med
              innehåll relevant för er bransch.
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

            {/* Vad slags behandlingar det rör sig om avgör vilken kategori
                Google ska förstå verksamheten som — friskvård och behandling av
                besvär hör till olika. Det är en fråga om branschen och inte om
                texten, så den står här och inte hos textfyllaren. */}
            {asksCare && (
              <div className="mt-8 bg-navy-800 rounded-xl border border-navy-700 p-5">
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
          </div>
        )}

        {/* ── Step: Mall ────────────────────────────────────────── */}
        {step === 'mall' && (
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Välj en design</h2>
            {/* Vad de faktiskt får kontroll över, utskrivet.
                Den som tror att ett designval är slutgiltigt väljer försiktigt
                och blir sällan nöjd — och den som tror att bara färger går att
                ändra bygger aldrig om sin sida. */}
            <p className="text-slate-400 mb-6">
              Du kan byta design på din hemsida när du vill. Texter, bilder och färger ändrar
              du själv och sektioner kan redigeras eller tas bort.
            </p>
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

            {/* Erbjudandet ligger under mallarna, inte över dem.
                Den som är nöjd med en mall väljer klart först; den som inte
                hittar rätt har just konstaterat det och är då som mest
                mottaglig. Premiumkunder ser det aldrig — de har redan köpt
                det, och att sälja någon det de har är att verka ouppmärksam. */}
            <div className="mt-5">
              <EgenDesign
                titel="Vill du hellre att vi designar den åt er?"
                om="Ingen färdig design, utan en sida ritad kring ert varumärke — och vi bygger och fyller den åt er. Vi hör av oss med en offert."
                cta="Ja, hör av er"
                klar="Tack — vi hör av oss."
              />
            </div>
          </div>
        )}

        {/* ── Step: Inställningar ───────────────────────────────── */}
        {step === 'kontakt' && (
          <div className="w-full max-w-md">
            {/* Rubriken säger vad skärmen gör. Har de redan ett konto — via
                Google eller ett tidigare försök — är det inget konto som
                skapas, och då vore "Skapa ditt konto" ett löfte om en knapp
                som inte finns. */}
            <h2 className="text-2xl font-bold text-white mb-1">
              {harKonto ? 'Vilka är ni?' : 'Skapa ditt konto'}
            </h2>
            <p className="text-slate-400 mb-8">
              Namnet blir rubriken på din sida och e-post är dit vi vanligtvis hör av oss.
            </p>

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
                <p className="text-xs text-slate-500 mt-2">Kan ändras senare.</p>
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
                <p className="text-slate-500 text-xs mt-1.5">
                  {harKonto
                    ? 'Kontaktuppgifter för Kiterank, visas inte utåt.'
                    : 'Det här blir också din inloggning. Visas inte utåt.'}
                </p>
              </div>

              {/* Lösenordet, bara för den som inte redan är inne.
                  Kontot skapas när de trycker Nästa — därför står fältet mitt i
                  guiden och inte på en sida före den. */}
              {!harKonto && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lösenord</label>
                  <input
                    type="password"
                    value={losenord}
                    placeholder="Minst 8 tecken"
                    autoComplete="new-password"
                    onChange={e => setLosenord(e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-mustard/50 focus:ring-1 focus:ring-mustard/30 transition-colors"
                  />
                  <p className="text-slate-500 text-xs mt-1.5">
                    Har du redan ett konto?{' '}
                    <Link href="/auth/login" className="text-mustard hover:text-mustard-light">Logga in</Link>
                  </p>
                </div>
              )}

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
                <p className="text-slate-500 text-xs mt-1.5">Kontaktuppgifter för Kiterank, visas inte utåt.</p>
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
            {/* På steg 1 leder Tillbaka till paketvalet — men bara för den som
                kom den vägen och ännu inte skapat sitt konto. Efter det är
                paketet en beställning, och den ändras i abonnemangsfliken där
                priset och villkoren står, inte med en bakåtknapp. */}
            {step !== kedja[0] || (behöverVälja && !harKonto) ? (
              <button
                onClick={() => (step === kedja[0] ? setVäljer(true) : prevStep())}
                disabled={saving}
                className="px-6 py-2.5 text-slate-400 hover:text-white border border-navy-700 hover:border-navy-500 rounded-xl text-sm transition-colors disabled:opacity-40"
              >
                {step === kedja[0] ? '← Byt paket' : '← Tillbaka'}
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
              {/* Knappen säger vad som händer, och det är två olika saker.
                  Mallkunden får en sida i samma sekund; premiumkunden lämnar
                  in ett underlag och får svar av oss. "Skapa webbplats" på den
                  senare hade lovat något som inte fanns när de klickade. */}
              {saving
                ? (vägen === 'premium' ? 'Skickar…' : 'Skapar…')
                : step === sista
                  ? (vägen === 'premium' ? 'Begär design →' : vill.sajt ? 'Skapa webbplats →' : 'Skapa konto →')
                  : 'Nästa →'}
            </button>
            </div>
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

/* ─── Helpers ───────────────────────────────────────────────────────── */

/*
 * Inloggningstjänstens fel, på svenska.
 *
 * Meddelandena kommer på engelska och är skrivna för den som byggt systemet:
 * "email rate limit exceeded" säger ingenting till en salongsägare, och att
 * visa det mitt i en svensk registrering ser ut som ett haveri.
 *
 * Varje rad här nedan är ett fel en riktig kund kan råka ut för, och vart och
 * ett säger vad de ska göra i stället för vad som gick fel i vår kod. Det som
 * inte känns igen blir en neutral mening — hellre det än en engelsk teknisk
 * rad, för den skickar dem till supporten utan att hjälpa någon av oss.
 */
function felPåSvenska(rått: string): string {
  const m = rått.toLowerCase()
  if (/already registered|already exists|user already/.test(m))
    return 'Det finns redan ett konto på den adressen. Logga in så fortsätter vi där du var.'
  if (/rate limit/.test(m))
    return 'Vi kunde inte skapa kontot just nu. Vänta en minut och försök igen.'
  if (/invalid|not valid/.test(m) && /email/.test(m))
    return 'E-postadressen ser inte ut att fungera. Kontrollera stavningen.'
  if (/password/.test(m) && /short|least|weak/.test(m))
    return 'Lösenordet är för kort. Välj minst 8 tecken.'
  if (/network|fetch failed/.test(m))
    return 'Ingen kontakt med servern. Kontrollera uppkopplingen och försök igen.'
  return 'Något gick fel när kontot skulle skapas. Försök igen om en stund.'
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500 text-sm shrink-0">{label}</span>
      <span className={`text-slate-200 text-sm text-right ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )
}
