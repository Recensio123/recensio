'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  TEMPLATES, settingsFor, kanalFor, MAX_LEDTID,
  type TemplateKind, type TemplateRow, type TemplateChannel,
} from '@/lib/messageTemplates'
import { läsKontaktsätt, type Kontaktsätt } from '@/lib/kontaktsatt'
import type { MeddelandeData } from '@/lib/meddelandenData'
import { OsparatRad, useOsparat } from '@/components/dashboard/Osparat'

import { previewOf } from '@/lib/bookingText'
import { rensaAvsandare } from '@/lib/smser'

/*
 * Meddelandena till kunden.
 *
 * Fyra besked utmed besöket: att tiden är klar, att den är borta, en påminnelse
 * före, och frågan om ett omdöme efter. Salongen bestämmer vilken kanal de
 * använder, vilka meddelanden som går ut, och när de tidsstyrda går. Texten
 * bestämmer de inte.
 *
 * Det är ett medvetet val och det största i den här fliken. Skälet är kostnaden:
 * ett SMS rymmer 160 tecken, men platshållarna sväller olika mycket för olika
 * kunder. Samma mall som ryms för Ann och Klippning blir två meddelanden för
 * Christoffer och Balayage med toning — dubbelt pris för just de kunderna.
 * Salongen ser aldrig det, eftersom panelen visar ett exempel, och upptäcker det
 * på fakturan tre månader senare utan att kunna peka på varför.
 *
 * Låsta texter tar också bort risken att ett bokningsbesked blir ett
 * erbjudande. Ett transaktionellt SMS får skickas utan marknadsföringssamtycke;
 * ett omskrivet gör det inte, och det är vårt avsändarnamn hos operatören som
 * stängs av när klagomålen kommer.
 *
 * Ingenting sparas förrän salongen säger till. Varje ändring läggs i ett utkast
 * ovanpå det som lästes in, raden högst upp säger att något väntar, och ett
 * försök att lämna sidan frågar först. Ett val som sparar sig självt känns
 * snabbt tills man klickar fel — då finns ingen väg tillbaka.
 */

/** Salongens val, i den form panelen arbetar med dem. Ett utkast är samma form
 *  med bara det som ändrats ifyllt. */
type Val = {
  kanal:     Kontaktsätt
  /** På/av och ledtid per meddelande. */
  mallar:    Record<string, { enabled: boolean; leadValue: number }>
  telefon:   string
  avsändare: string
  reviewUrl: string
}

/* Svaret i panelens form. Ren funktion, så att den serverrenderade datan och
   omläsningen efter en sparning går genom exakt samma tolkning. */
function urData(d: MeddelandeData) {
  const rader  = d.templates ?? []
  const kanal  = läsKontaktsätt(d.channel)
  const mallar: Val['mallar'] = {}
  for (const t of TEMPLATES) {
    const s = settingsFor(rader, t.kind, kanalFor(t.kind, kanal))
    mallar[t.kind] = { enabled: s.enabled, leadValue: s.leadValue }
  }
  return {
    rader,
    smsReady:    Boolean(d.smsReady),
    smsMånad:    d.smsMånad ?? { antal: 0, segment: 0, från: '' },
    mailRam:     d.mailRam  ?? {},
    smsExtra:    d.smsExtra ?? {},
    reviewLink:  d.reviewLink ?? '',
    telStandard: d.phoneUsed ?? '',
    avsStandard: d.smsSenderUsed ?? '',
    val: {
      kanal, mallar,
      telefon:   d.phoneOwn ?? '',
      avsändare: d.smsSenderOwn ?? '',
      reviewUrl: d.reviewUrl ?? '',
    } as Val,
  }
}

export function MeddelandenTab({ initial = null }: { initial?: MeddelandeData | null }) {
  /* Sidan har oftast redan räknat fram allt. Då ritas det direkt, och det här
     blir en flik som öppnas i stället för en som laddar. */
  const start = initial ? urData(initial) : null
  const [rows,       setRows]       = useState<TemplateRow[]>(start?.rader ?? [])
  const [smsReady,   setSmsReady]   = useState(start?.smsReady ?? false)
  const [smsMånad,   setSmsMånad]   = useState(start?.smsMånad ?? { antal: 0, segment: 0, från: '' })
  /* Raderna systemet lägger under texten, färdigbyggda av servern med samma
     funktioner som utskicket. */
  const [mailRam,    setMailRam]    = useState<Record<string, string[]>>(start?.mailRam ?? {})
  const [smsExtra,   setSmsExtra]   = useState<Record<string, string>>(start?.smsExtra ?? {})
  const [reviewLink, setReviewLink] = useState(start?.reviewLink ?? '')
  /* Vad hemsidan säger, när salongen inte skrivit något eget. */
  const [telStandard, setTelStandard] = useState(start?.telStandard ?? '')
  const [avsStandard, setAvsStandard] = useState(start?.avsStandard ?? '')

  /* Det som lästes in, och det salongen ändrat ovanpå. Skillnaden mellan dem är
     precis det som ska sparas. */
  const [läst,   setLäst]   = useState<Val | null>(start?.val ?? null)
  const [utkast, setUtkast] = useState<Partial<Val>>({})
  const [sparar, setSparar] = useState(false)
  const [sparad, setSparad] = useState(false)
  const [fel,    setFel]    = useState('')

  /* Hämtningen och tillämpningen ligger isär.
     Effekten får då sätta state i en callback i stället för rakt i sin kropp,
     vilket är skillnaden mellan att synkronisera mot något yttre och att starta
     en kedja av omritningar. Uppdelningen bär dessutom sitt eget skäl: en
     komponent som lämnats innan svaret kom ska inte skriva i state som inte
     längre finns. */
  const hämta = useCallback(async () => {
    const res = await fetch('/api/message-templates')
    if (!res.ok) throw new Error(String(res.status))
    return res.json() as Promise<MeddelandeData>
  }, [])

  const tillämpa = useCallback((d: MeddelandeData) => {
    const x = urData(d)
    setRows(x.rader)
    setSmsReady(x.smsReady)
    setSmsMånad(x.smsMånad)
    setMailRam(x.mailRam)
    setSmsExtra(x.smsExtra)
    setReviewLink(x.reviewLink)
    setTelStandard(x.telStandard)
    setAvsStandard(x.avsStandard)
    setLäst(x.val)
    setUtkast({})
  }, [])

  /* Hämtas bara när sidan inte hann räkna fram den — annars ritas den
     serverrenderade datan direkt, utan väntan. */
  useEffect(() => {
    if (initial) return
    let aktiv = true
    hämta()
      .then(d => { if (aktiv) tillämpa(d) })
      .catch(() => { if (aktiv) setFel(T.failed) })
    return () => { aktiv = false }
  }, [initial, hämta, tillämpa])

  if (!läst) return null

  /* Det som gäller just nu: det inlästa med utkastet ovanpå. */
  const v: Val = {
    ...läst, ...utkast,
    mallar: { ...läst.mallar, ...utkast.mallar },
  }

  const ändrat = {
    kanal:     v.kanal     !== läst.kanal,
    telefon:   v.telefon   !== läst.telefon,
    avsändare: v.avsändare !== läst.avsändare,
    reviewUrl: v.reviewUrl !== läst.reviewUrl,
    mallar:    TEMPLATES.filter(t =>
      v.mallar[t.kind].enabled      !== läst.mallar[t.kind].enabled
      || v.mallar[t.kind].leadValue !== läst.mallar[t.kind].leadValue
      ),
  }
  const osparat = ändrat.kanal || ändrat.telefon || ändrat.avsändare
    || ändrat.reviewUrl || ändrat.mallar.length > 0

  /* Ändra ett fält i utkastet. */
  const sätt = (d: Partial<Val>) => { setSparad(false); setUtkast(u => ({ ...u, ...d })) }
  const sättMall = (kind: TemplateKind, d: Partial<Val['mallar'][string]>) =>
    sätt({ mallar: { ...utkast.mallar, [kind]: { ...v.mallar[kind], ...d } } })

  async function spara() {
    setSparar(true); setFel('')
    try {
      /* En begäran per sak som ändrats. Rutten sparar en sak i taget, och att
         slå ihop dem hade betytt en ny form att hålla i synk med panelen. */
      const skicka = async (kropp: Record<string, unknown>) => {
        const res = await fetch('/api/message-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(kropp),
        })
        if (!res.ok) throw new Error(String(res.status))
      }

      /* Kanalen först: den avgör vilken rad de andra ändringarna hör till. */
      if (ändrat.kanal)     await skicka({ channel: v.kanal })
      if (ändrat.telefon)   await skicka({ contactPhone: v.telefon })
      if (ändrat.avsändare) await skicka({ smsSender: v.avsändare })
      if (ändrat.reviewUrl) await skicka({ reviewUrl: v.reviewUrl })

      for (const t of ändrat.mallar) {
        await skicka({
          kind:    t.kind,
          channel: kanalFor(t.kind, v.kanal),
          enabled: v.mallar[t.kind].enabled,
          ...(t.ledtid ? { lead_value: v.mallar[t.kind].leadValue } : {}),
        })
      }

      tillämpa(await hämta())
      setSparad(true)
      setTimeout(() => setSparad(false), 3000)
    } catch {
      setFel(T.failed)
    } finally {
      setSparar(false)
    }
  }

  return (
    <Innehåll
      v={v} osparat={osparat} sparar={sparar} sparad={sparad} fel={fel}
      spara={spara} sätt={sätt} sättMall={sättMall}
      rows={rows} smsReady={smsReady} smsMånad={smsMånad} mailRam={mailRam} smsExtra={smsExtra}
      reviewLink={reviewLink} telStandard={telStandard} avsStandard={avsStandard}
    />
  )
}

/* Själva vyn. Utbruten för att den ovanstående ska gå att läsa som det den är:
   vad som är sparat, vad som ändrats, och vad som händer när man trycker. */
function Innehåll({
  v, osparat, sparar, sparad, fel, spara, sätt, sättMall,
  rows, smsReady, smsMånad, mailRam, smsExtra, reviewLink, telStandard, avsStandard,
}: {
  v:           Val
  osparat:     boolean
  sparar:      boolean
  sparad:      boolean
  fel:         string
  spara:       () => void
  sätt:        (d: Partial<Val>) => void
  sättMall:    (kind: TemplateKind, d: Partial<Val['mallar'][string]>) => void
  rows:        TemplateRow[]
  smsReady:    boolean
  /* Vad som gått ut hittills i månaden. Salongen betalar per SMS, och utan
     talet är påminnelsernas kostnad en gissning. */
  smsMånad:    { antal: number; segment: number; från: string }
  mailRam:     Record<string, string[]>
  smsExtra:    Record<string, string>
  reviewLink:  string
  telStandard: string
  avsStandard: string
}) {
  useOsparat({ osparat, sparar, sparad, fel, spara })

  /* Går något som SMS över huvud taget? Kontaktsättet styr bekräftelsen och
     avbokningen, de tidsstyrda väljer själva. */
  const smsAnvänds = v.kanal === 'sms'
    || TEMPLATES.some(t => t.ledtid && v.mallar[t.kind].enabled)

  /* Fälten står ifyllda med hemsidans värden när salongen inte skrivit något
     eget. En ruta som ser tom ut läses som något man måste fylla i. */
  const telFält = v.telefon   || telStandard
  const avsFält = v.avsändare || avsStandard

  const omdömeslänk = reviewLink || v.reviewUrl.trim()
  const egnaVärden  = omdömeslänk ? { '{omdömeslänk}': omdömeslänk } : undefined

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-white font-semibold text-lg mb-1">{T.title}</h2>
        <p className="text-slate-400 text-sm">{T.intro}</p>
        <SmsRäknare {...smsMånad} />
      </div>

      {/* Kanalen. Gäller bekräftelsen och avbokningen — svaren på något kunden
          just gjort — och avgör vilken uppgift som blir obligatorisk vid
          bokningen. */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <h3 className="text-white font-semibold text-sm mb-1">{T.contactTitle}</h3>
        <p className="text-slate-400 text-xs mb-4">{T.contactHelp}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ['email', T.chEmail, T.emailWhat, T.emailRequires],
            ['sms',   T.chSms,   T.smsWhat,   T.smsRequires],
          ] as [TemplateChannel, string, string, string][]).map(([c, namn, vad, krav]) => {
            const på   = v.kanal === c
            const låst = c === 'sms' && !smsReady

            return (
              <button
                key={c}
                onClick={() => { if (!låst) sätt({ kanal: c }) }}
                disabled={låst}
                title={låst ? T.noSmsShort : undefined}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  på    ? 'bg-navy-900 border-mustard'
                  : låst ? 'bg-navy-900/40 border-navy-700 cursor-default'
                  : 'bg-navy-900 border-navy-600 hover:border-navy-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    på ? 'bg-mustard text-navy-950' : 'border border-navy-600 text-transparent'
                  }`}>
                    ✓
                  </span>
                  <span className={`text-sm font-semibold ${låst ? 'text-slate-500' : 'text-white'}`}>{namn}</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{vad}</p>
                <p className={`text-xs mt-1.5 ${på ? 'text-mustard/80' : 'text-slate-500'}`}>
                  {låst ? T.noSmsShort : krav}
                </p>
              </button>
            )
          })}
        </div>

        {/* Numret kunden kan ringa. Våra utskick går inte att svara på, så det
            här är den enda vägen tillbaka för den som vill prata med någon.
            Hämtas från hemsidans kontaktuppgifter, men går att skriva över. */}
        <div className="mt-5 pt-5 border-t border-navy-700">
          <label className="block text-white text-xs font-semibold mb-1">{T.phoneTitle}</label>
          <p className="text-slate-400 text-xs mb-2 leading-relaxed">{T.phoneHelp}</p>
          <input
            value={telFält}
            onChange={e => sätt({ telefon: e.target.value })}
            placeholder="070 123 45 67"
            maxLength={24}
            className="w-44 bg-navy-900 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
          />
          {!telFält.trim() && (
            <p className="text-amber-400 text-xs mt-2 leading-relaxed">{T.phoneMissing}</p>
          )}
        </div>

        {/* Avsändarnamnet. Det första kunden ser i sitt SMS, och elva tecken är
            GSM-standardens gräns — inte vår. Visas bara när något går som SMS. */}
        {smsAnvänds && (
          <div className="mt-5 pt-5 border-t border-navy-700">
            <label className="block text-white text-xs font-semibold mb-1">{T.senderTitle}</label>
            <p className="text-slate-400 text-xs mb-2 leading-relaxed">{T.senderHelp}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={avsFält}
                onChange={e => sätt({ avsändare: rensaAvsandare(e.target.value) })}
                maxLength={11}
                className="w-32 bg-navy-900 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
              />
              <span className="text-slate-500 text-xs tabular-nums">{avsFält.length}/11</span>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              {T.senderShown} <span className="text-slate-200">{avsFält || avsStandard}</span>
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {TEMPLATES.map(spec => {
          const tidsstyrd = Boolean(spec.ledtid)
          /* Bekräftelsen och avbokningen följer kontaktsättet. De tidsstyrda bär
             sitt eget val. */
          const c       = kanalFor(spec.kind, v.kanal)
          const m       = v.mallar[spec.kind]
          const mall    = settingsFor(rows, spec.kind, c)
          const smsBara = c === 'sms'
          const extra   = smsExtra[spec.kind] ?? ''

          return (
            <div key={spec.kind} className={`bg-navy-800 border rounded-xl p-6 transition-colors ${
              m.enabled ? 'border-navy-700' : 'border-navy-800'
            }`}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold text-sm ${m.enabled ? 'text-white' : 'text-slate-500'}`}>
                    {spec.namn}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    {spec.när}{tidsstyrd && <> {T.smsOnly}</>}
                  </p>
                </div>

                {/* Bekräftelsen och avbokningen går inte att stänga av. En kund
                    som bokar och inte får något besked ringer salongen, och då
                    har systemet skapat arbete i stället för att ta bort det. */}
                {tidsstyrd ? (
                  <button
                    onClick={() => { if (smsReady) sättMall(spec.kind, { enabled: !m.enabled }) }}
                    disabled={!smsReady}
                    title={smsReady ? undefined : T.noSmsShort}
                    role="switch"
                    aria-checked={m.enabled}
                    aria-label={spec.namn}
                    className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors ${
                      !smsReady ? 'bg-navy-800' : m.enabled ? 'bg-mustard' : 'bg-navy-600'
                    }`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                      m.enabled ? 'translate-x-5' : ''
                    }`} />
                  </button>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
                    {T.always}
                  </span>
                )}
              </div>

              {m.enabled && (
                <>
                  {/* Tidpunkten. Timmar, och högst ett dygn: en påminnelse tre
                      dagar i förväg är ingen påminnelse, och en
                      recensionsförfrågan en vecka efteråt möter en kund som
                      glömt hur det gick. */}
                  {tidsstyrd && (
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      <span className="text-slate-400 text-xs">
                        {spec.kind === 'reminder' ? T.before : T.after}
                      </span>
                      <input
                        type="number"
                        min={spec.kind === 'review' ? 0 : 1}
                        max={MAX_LEDTID}
                        value={m.leadValue}
                        onChange={e => sättMall(spec.kind, {
                          leadValue: Math.min(MAX_LEDTID, Math.max(0, Number(e.target.value))),
                        })}
                        className="w-16 bg-navy-900 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-2 py-1 focus:outline-none"
                      />
                      <span className="text-slate-400 text-xs">{T.hours}</span>
                      {spec.kind === 'review' && m.leadValue === 0 && (
                        <span className="text-slate-500 text-xs">{T.rightAfter}</span>
                      )}
                    </div>
                  )}

                  {/* Meddelandet, som kunden får det. En färg och en stil rakt
                      igenom: kunden ser en enda text, och nu gör salongen det
                      också. */}
                  <div className="mt-4 rounded-lg bg-navy-900 border border-navy-700 p-3">
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-2">{T.preview}</p>

                    {!smsBara && (
                      <>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider">{T.subject}</p>
                        <p className="text-slate-200 text-sm leading-relaxed mb-2">
                          {previewOf(mall.subject, egnaVärden)}
                        </p>
                      </>
                    )}

                    <div className="space-y-1">
                      {previewOf(mall.body, egnaVärden).split('\n').map((rad, i) => (
                        <p key={i} className="text-slate-200 text-sm leading-relaxed">{rad}</p>
                      ))}
                      {smsBara
                        ? extra && <p className="text-slate-200 text-sm leading-relaxed">{extra}</p>
                        : (mailRam[spec.kind] ?? []).map((rad, i) => (
                            <p key={i} className="text-slate-200 text-sm leading-relaxed">{rad}</p>
                          ))}
                    </div>
                  </div>

                  {/* Recensionslänken. Utan den skickas ingen förfrågan alls, så
                      den står i rutan den styr. */}
                  {spec.kind === 'review' && (
                    <div className="mt-3 rounded-lg bg-navy-900 border border-navy-700 p-3">
                      <label className="block text-white text-xs font-semibold mb-1">{T.linkTitle}</label>
                      <p className="text-slate-400 text-xs mb-2 leading-relaxed">{T.linkHelp}</p>
                      <input
                        value={v.reviewUrl}
                        onChange={e => sätt({ reviewUrl: e.target.value })}
                        placeholder="https://g.page/r/..."
                        className="w-full bg-navy-950 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
                      />
                      {!v.reviewUrl.trim() && (
                        <p className="text-amber-400 text-xs mt-2 leading-relaxed">{T.linkMissing}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-slate-500 text-xs leading-relaxed">{T.locked}</p>
      <OsparatRad osparat={osparat} sparar={sparar} sparad={sparad} fel={fel} spara={spara} />

    </div>
  )
}


/*
 * Vad månadens utskick kostat, i antal.
 *
 * Står här och inte på en egen statistiksida: det är på den här skärmen
 * påminnelser och recensionsförfrågningar slås på, och det är i den stunden
 * frågan "vad kostar det?" uppstår.
 *
 * Segmenten nämns bara när de skiljer sig från antalet. Ett SMS över 160
 * tecken skickas som flera och debiteras som flera — men att förklara det för
 * en salong vars meddelanden alla får plats vore att lära ut ett problem de
 * inte har.
 */
function SmsRäknare({ antal, segment, från }: { antal: number; segment: number; från: string }) {
  const månad = från
    ? new Date(från + 'T12:00:00').toLocaleDateString('sv-SE', { month: 'long' })
    : ''

  return (
    <p className="text-slate-500 text-xs mt-2">
      <span className="text-slate-300 font-semibold tabular-nums">{antal}</span>
      {' '}SMS skickade{månad ? ` i ${månad}` : ''}
      {segment > antal && (
        <span className="text-slate-600"> · {segment} delar debiterade</span>
      )}
    </p>
  )
}

const T = {
  title:        'Meddelanden till kunden',
  intro:        'Fyra besked utmed besöket. Du väljer vilka som går ut och när — texterna sköter vi.',
  contactTitle: 'Hur vill du hålla kontakt med dina kunder?',
  contactHelp:  'Gäller bekräftelsen och avbokningen — svaren på något kunden just gjort. Uppgiften formatet kräver blir obligatorisk när de bokar. Påminnelsen och recensionsförfrågan väljer kanal var för sig.',
  phoneTitle:   'Telefonnummer till dig',
  phoneHelp:    'Numret kunden kan ringa när de vill ändra något — våra utskick går inte att svara på. Hämtas från kontaktuppgifterna på din hemsida, men du kan skriva ett annat här.',
  phoneMissing: 'Utan nummer står kunden utan väg tillbaka om de vill prata med någon.',
  senderTitle:  'Avsändarnamn i SMS',
  senderHelp:   'Det första kunden ser. Max 11 tecken, bokstäver och siffror — det är vad mobilnäten släpper igenom. Lämnar du fältet tomt används företagsnamnet från din hemsida.',
  senderShown:  'Kunden ser:',
  chEmail:      'E-post',
  chSms:        'SMS',
  emailWhat:    'Bekräftelser och påminnelser som mail. Kostar ingenting per utskick och rymmer hela texten.',
  smsWhat:      'Samma besked som SMS. Läses inom några minuter, men kostar per utskick och ryms i 160 tecken.',
  emailRequires:'Kunden fyller i sin e-postadress när de bokar',
  smsRequires:  'Kunden fyller i sitt mobilnummer när de bokar',
  always:       'Alltid på',
  smsOnly:      'Går som SMS — det läses inom minuter, och båda de här är beroende av att läsas i tid.',
  before:       'Före besöket:',
  after:        'Efter besöket:',
  hours:        'timmar',
  rightAfter:   'direkt när besöket markeras som avslutat',
  preview:      'Så ser det ut för kunden',
  subject:      'Ämne',
  noSmsShort:   'SMS är inte påslaget ännu',
  linkTitle:    'Din länk för omdömen',
  linkHelp:     'Dit kunden skickas för att lämna sitt omdöme. Hämta den i din Google-företagsprofil under Be om omdömen.',
  linkMissing:  'Förfrågan är påslagen men saknar länk, så ingenting skickas. Klistra in länken ovan.',
  locked:       'Texterna är skrivna och testade av oss, och förbättras löpande utan att du behöver göra något. Det håller varje SMS inom ett meddelande — hur långt kundens namn eller behandling än är — och håller beskeden åtskilda från erbjudanden, vilket krävs av utskick som går utan marknadsföringssamtycke.',
  failed:       'Kunde inte spara. Försök igen.',
}
