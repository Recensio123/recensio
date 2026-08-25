'use client'
import { KANSLOR, ANTAL_FOREBILDER, type DesignBrief, type Forebild } from '@/lib/onboarding'

/*
 * Designfrågorna för den som köpt en formgiven sida.
 *
 * Frågorna är valda efter vad som faktiskt saknas när man ska rita en sida åt
 * någon man inte träffat — och efter vad en salongsägare kan svara på. Inte
 * "vilken font vill ni ha": det vet de inte, och att fråga får dem att känna
 * sig fel. Färgen, känslan och tre sidor de gillar räcker för att komma igång.
 *
 * Färgerna frågas som koder och inte som ord. "Dammig rosa" är sex olika
 * färger beroende på vem som läser det, och den som redan har en logotyp har
 * en bestämd färg — inte en beskrivning av en.
 *
 * Allt är frivilligt. Tomma fält blir ett samtal, inte ett hinder.
 */

const box = 'w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-mustard/50 focus:ring-1 focus:ring-mustard/30 transition-colors text-sm leading-relaxed'
const label = 'block text-sm font-medium text-slate-300 mb-2'

/* Förvalen i färgväljaren när inget är valt. De är bara det rutan står på
   innan någon rör den — inget sparas förrän kunden valt själv. */
const UTGANGSFARG = ['#1f2937', '#c9a227']

const HEX = /^#[0-9a-f]{6}$/i

export function DesignBriefFalt({ brief, onChange }: {
  brief:    DesignBrief
  onChange: (next: DesignBrief) => void
}) {
  const sätt = (d: Partial<DesignBrief>) => onChange({ ...brief, ...d })

  const växlaKänsla = (k: string) => {
    const har = brief.kansla.includes(k)
    /* Tak på tre. Väljer man allt har man inte valt något, och en riktning som
       är "elegant, lekfull och lyxig" går inte att rita. */
    if (!har && brief.kansla.length >= 3) return
    sätt({ kansla: har ? brief.kansla.filter(x => x !== k) : [...brief.kansla, k] })
  }

  const sättFärg = (i: number, värde: string) => {
    const nya: [string, string] = [...brief.farger] as [string, string]
    nya[i] = värde
    sätt({ farger: nya })
  }

  const sättFörebild = (i: number, d: Partial<Forebild>) => {
    const nya = brief.forebilder.map((f, j) => (j === i ? { ...f, ...d } : f))
    sätt({ forebilder: nya })
  }

  /* Underlaget kan ha sparats av en tidigare version, eller av en flik som
     stod öppen när fälten ändrades. Rutorna ritas efter listans längd och
     inte efter vad som råkar ligga i objektet. */
  const förebilder = Array.from(
    { length: ANTAL_FOREBILDER },
    (_, i) => brief.forebilder[i] ?? { url: '', kommentar: '' },
  )

  return (
    <div className="space-y-6">
      {/* ── Färgerna ─────────────────────────────────────────────────── */}
      <div>
        <label className={label}>Har ni några färger ni vill jobba med?</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {([0, 1] as const).map(i => {
            const värde = brief.farger[i] ?? ''
            const vald  = HEX.test(värde)
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors ${
                  vald ? 'border-mustard/40 bg-mustard/5' : 'border-navy-700 bg-navy-900'
                }`}
              >
                {/* Rutan är webbläsarens egen färgväljare. Den ger kunden ett
                    hjul att peka i och oss en exakt kod — den som redan vet
                    sin kod skriver in den i fältet bredvid i stället.
                 *
                 * Väljaren ritar alltid en färg, även innan någon valt. Den
                 * låg därför och såg vald ut med en färg vi hittat på, och
                 * kunden som tyckte den var ful trodde att vi bestämt den.
                 * Nu ligger den osynlig över en tom ruta med ett plus, och en
                 * färg syns först när den är kundens. */}
                <div className="relative w-10 h-10 shrink-0">
                  <div
                    className="w-10 h-10 rounded-lg border border-navy-600 flex items-center justify-center"
                    style={vald ? { background: värde } : { background: '#0f1729' }}
                  >
                    {!vald && <span className="text-slate-500 text-lg leading-none">+</span>}
                  </div>
                  <input
                    type="color"
                    aria-label={i === 0 ? 'Huvudfärg' : 'Andra färg'}
                    value={vald ? värde : UTGANGSFARG[i]}
                    onChange={e => sättFärg(i, e.target.value.toLowerCase())}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 mb-0.5">
                    {i === 0 ? 'Huvudfärg' : 'Andra färg'}
                  </p>
                  <input
                    value={värde}
                    onChange={e => {
                      const v = e.target.value.trim().toLowerCase()
                      sättFärg(i, v && !v.startsWith('#') ? `#${v}` : v)
                    }}
                    placeholder="#000000"
                    maxLength={7}
                    spellCheck={false}
                    className="w-full bg-transparent text-white text-sm font-mono placeholder-slate-600 focus:outline-none"
                  />
                </div>
                {värde && (
                  <button
                    onClick={() => sättFärg(i, '')}
                    className="shrink-0 text-xs text-slate-500 hover:text-mustard transition-colors"
                  >
                    Rensa
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Klicka i rutan för att välja, eller skriv färgkoden om ni redan har en. Har ni inga
          färger än lämnar ni det tomt, då föreslår vi ett par som ni kan redigera senare.
        </p>
      </div>

      {/* ── Känslan ──────────────────────────────────────────────────── */}
      <div>
        <label className={label}>Vilken känsla ska sidan ge?</label>
        <div className="flex gap-2 flex-wrap">
          {KANSLOR.map(k => {
            const vald = brief.kansla.includes(k)
            return (
              <button
                key={k}
                onClick={() => växlaKänsla(k)}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                  vald
                    ? 'border-mustard bg-mustard/10 text-mustard'
                    : 'border-navy-700 text-slate-300 hover:border-navy-500'
                }`}
              >
                {k}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">Välj upp till tre.</p>
      </div>

      {/* ── Förebilderna ─────────────────────────────────────────────── */}
      <div>
        <label className={label}>Sidor eller designer ni gärna liknar</label>
        <div className="space-y-3">
          {förebilder.map((f, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2">
              <input
                value={f.url}
                onChange={e => sättFörebild(i, { url: e.target.value })}
                placeholder={`Adress ${i + 1}`}
                inputMode="url"
                spellCheck={false}
                className={`${box} sm:w-2/5`}
              />
              {/* Kommentaren är den värdefulla halvan. En adress säger att de
                  gillar sidan; kommentaren säger vad de gillar på den — och
                  det är skillnaden mellan att kopiera och att förstå. */}
              <input
                value={f.kommentar}
                onChange={e => sättFörebild(i, { kommentar: e.target.value })}
                placeholder="Vad är det ni gillar med den?"
                className={`${box} sm:flex-1`}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Behöver inte vara salonger — det här säger mer om vad ni vill ha än något annat vi
          kan fråga om.
        </p>
      </div>

      {/* ── Övrigt ───────────────────────────────────────────────────── */}
      <div>
        <label className={label}>Övrigt</label>
        <textarea
          value={brief.ovrigt}
          onChange={e => sätt({ ovrigt: e.target.value })}
          rows={3}
          placeholder="T.ex. något ni absolut vill ha med, något ni helst slipper, eller sådant vi bör känna till om er."
          className={box}
        />
      </div>
    </div>
  )
}
