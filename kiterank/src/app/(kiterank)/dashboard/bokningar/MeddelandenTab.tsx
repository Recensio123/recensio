'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  TEMPLATES, settingsFor, kanalFor, MAX_LEDTID,
  type TemplateKind, type TemplateRow, type TemplateChannel,
} from '@/lib/messageTemplates'
import { läsKontaktsätt, läsKanal, type Kontaktsätt, type Kanalval } from '@/lib/kontaktsatt'
import type { MeddelandeData } from '@/lib/meddelandenData'
import { OsparatRad, useOsparat } from '@/components/dashboard/Osparat'

import { previewOf } from '@/lib/bookingText'
import { rensaMailavsandare } from '@/lib/mailer'
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
  /* Kanal för de tidsstyrda. Null betyder att de följer kontaktsättet ovan —
     inte att inget är valt. En salong som byter kontaktsätt ska få med sig de
     två utan att gå in och ändra dem också. */
  påminnKanal: Kontaktsätt | null
  omdömeKanal: Kontaktsätt | null
  /** På/av och ledtid per meddelande. */
  mallar:    Record<string, { enabled: boolean; leadValue: number }>
  telefon:   string
  avsändare: string
  /* Avsändarnamnet i inkorgen. Eget fält och inte samma som SMS:ets: elva rena
     tecken där, fyrtio med å ä ö här. */
  mejlnamn:  string
  reviewUrl: string
}

/* Svaret i panelens form. Ren funktion, så att den serverrenderade datan och
   omläsningen efter en sparning går genom exakt samma tolkning. */
function urData(d: MeddelandeData) {
  const rader  = d.templates ?? []
  const kanal  = läsKontaktsätt(d.channel)
  /* Kanalvalet först: vilken rad varje mall läses ur beror på det, och läser
     panelen ur fel rad visar den en text salongen aldrig skrivit. */
  const val: Kanalval = {
    kontakt:  kanal,
    reminder: läsKanal(d.reminderChannel),
    review:   läsKanal(d.reviewChannel),
  }
  const mallar: Val['mallar'] = {}
  for (const t of TEMPLATES) {
    const s = settingsFor(rader, t.kind, kanalFor(t.kind, val))
    mallar[t.kind] = { enabled: s.enabled, leadValue: s.leadValue }
  }
  return {
    rader,
    smsReady:    Boolean(d.smsReady),
    smsMånad:    d.smsMånad ?? { antal: 0, segment: 0, från: '' },
    mailRam:     d.mailRam  ?? {},
    smsExtra:    d.smsExtra ?? {},
    reviewLink:  d.reviewLink ?? '',
    avbokaExempel: d.avbokaExempel ?? '',
    telStandard: d.phoneUsed ?? '',
    avsStandard: d.smsSenderUsed ?? '',
    mejlStandard: d.mailSenderUsed ?? '',
    mejlMax:      d.mailSenderMax ?? 40,
    val: {
      kanal, mallar,
      påminnKanal: val.reminder,
      omdömeKanal: val.review,
      telefon:   d.phoneOwn ?? '',
      avsändare: d.smsSenderOwn ?? '',
      mejlnamn:  d.mailSenderOwn ?? '',
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
  const [avbokaExempel, setAvbokaExempel] = useState(start?.avbokaExempel ?? '')
  /* Vad hemsidan säger, när salongen inte skrivit något eget. */
  const [telStandard, setTelStandard] = useState(start?.telStandard ?? '')
  const [avsStandard, setAvsStandard] = useState(start?.avsStandard ?? '')
  const [mejlStandard, setMejlStandard] = useState(start?.mejlStandard ?? '')
  const [mejlMax, setMejlMax] = useState(start?.mejlMax ?? 40)

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
    setAvbokaExempel(x.avbokaExempel)
    setTelStandard(x.telStandard)
    setAvsStandard(x.avsStandard)
    setMejlStandard(x.mejlStandard)
    setMejlMax(x.mejlMax)
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

  /* Kanalvalet i den form regeln vill ha det. Samma funktion avgör här som ute
     i utskicket vilken kanal varje meddelande går i — panelen får aldrig räkna
     ut det på sitt eget sätt, för då visar den förr eller senare en annan kanal
     än den kunden får. */
  const kanalval: Kanalval = {
    kontakt: v.kanal, reminder: v.påminnKanal, review: v.omdömeKanal,
  }

  const ändrat = {
    kanal:     v.kanal       !== läst.kanal,
    påminnKanal: v.påminnKanal !== läst.påminnKanal,
    omdömeKanal: v.omdömeKanal !== läst.omdömeKanal,
    telefon:   v.telefon   !== läst.telefon,
    avsändare: v.avsändare !== läst.avsändare,
    mejlnamn:  v.mejlnamn  !== läst.mejlnamn,
    reviewUrl: v.reviewUrl !== läst.reviewUrl,
    mallar:    TEMPLATES.filter(t =>
      v.mallar[t.kind].enabled      !== läst.mallar[t.kind].enabled
      || v.mallar[t.kind].leadValue !== läst.mallar[t.kind].leadValue
      ),
  }
  const osparat = ändrat.kanal || ändrat.påminnKanal || ändrat.omdömeKanal
    || ändrat.telefon || ändrat.avsändare || ändrat.mejlnamn
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
      if (ändrat.kanal)       await skicka({ channel: v.kanal })
      if (ändrat.påminnKanal) await skicka({ kindChannel: 'reminder', value: v.påminnKanal })
      if (ändrat.omdömeKanal) await skicka({ kindChannel: 'review',   value: v.omdömeKanal })
      if (ändrat.telefon)   await skicka({ contactPhone: v.telefon })
      if (ändrat.avsändare) await skicka({ smsSender: v.avsändare })
      if (ändrat.mejlnamn)  await skicka({ mailSender: v.mejlnamn })
      if (ändrat.reviewUrl) await skicka({ reviewUrl: v.reviewUrl })

      for (const t of ändrat.mallar) {
        await skicka({
          kind:    t.kind,
          channel: kanalFor(t.kind, kanalval),
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
      mejlStandard={mejlStandard} mejlMax={mejlMax} avbokaExempel={avbokaExempel}
    />
  )
}

/* Själva vyn. Utbruten för att den ovanstående ska gå att läsa som det den är:
   vad som är sparat, vad som ändrats, och vad som händer när man trycker. */
function Innehåll({
  v, osparat, sparar, sparad, fel, spara, sätt, sättMall,
  rows, smsReady, smsMånad, mailRam, smsExtra, reviewLink, telStandard, avsStandard,
  mejlStandard, mejlMax, avbokaExempel,
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
  mejlStandard: string
  mejlMax: number
  /** Adressen till förhandsvisningen av kundens avbokningssida. */
  avbokaExempel: string
}) {
  useOsparat({ osparat, sparar, sparad, fel, spara })

  const kanalval: Kanalval = {
    kontakt: v.kanal, reminder: v.påminnKanal, review: v.omdömeKanal,
  }

  /* Går något som SMS över huvud taget? Kontaktsättet styr bekräftelsen och
     avbokningen, de tidsstyrda väljer själva — och ett påslaget meddelande som
     valt SMS räknas även när salongen i övrigt mailar. Det är svaret på om
     SMS-avsändaren är något salongen behöver se. */
  const smsAnvänds = v.kanal === 'sms'
    || TEMPLATES.some(t =>
      t.ledtid && v.mallar[t.kind].enabled && kanalFor(t.kind, kanalval) === 'sms')

  /* Fälten står ifyllda med hemsidans värden när salongen inte skrivit något
     eget. En ruta som ser tom ut läses som något man måste fylla i. */
  const telFält = v.telefon   || telStandard
  const avsFält  = v.avsändare || avsStandard
  const mejlFält = v.mejlnamn  || mejlStandard

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

        {/*
          * Uppgifterna kunden möter: numret de kan ringa och namnen de ser som
          * avsändare. Tre fält på en rad och inte tre staplade block — de gör
          * samma sak, de fylls i vid samma tillfälle, och staplade läser de som
          * tre separata ärenden.
          *
          * Två avsändarfält och inte ett, eftersom kanalerna inte tål samma
          * namn: SMS har GSM-standardens elva tecken utan å, ä, ö, mejlet har
          * inget sådant tvång. Ett gemensamt fält hade tvingat ner inkorgen
          * till SMS:ets form, och "SalongNords" i inkorgen är sämre än det
          * behöver vara.
          *
          * Alla tre hämtar sitt värde från hemsidan när fältet är tomt. Det som
          * skiljer är vad som händer på vägen: SMS-namnet tvättas och det
          * tvättade är vad kunden ser, mejlnamnet går fram som det stavas.
          */}
        <div className={`mt-5 pt-5 border-t border-navy-700 grid gap-x-6 gap-y-5 sm:grid-cols-2 ${
          smsAnvänds ? 'lg:grid-cols-3' : ''
        }`}>
          <Fält
            titel={T.phoneTitle}
            hjälp={T.phoneHelp}
            värde={telFält}
            onChange={x => sätt({ telefon: x })}
            maxLength={24}
            placeholder="070 123 45 67"
            fot={!telFält.trim()
              ? <span className="text-amber-400">{T.phoneMissing}</span>
              : null}
          />

          {smsAnvänds && (
            <Fält
              titel={T.senderTitle}
              hjälp={T.senderHelp}
              värde={avsFält}
              onChange={x => sätt({ avsändare: rensaAvsandare(x) })}
              maxLength={11}
              räknare
              fot={<>{T.senderShown} <span className="text-slate-200">{avsFält || avsStandard}</span></>}
            />
          )}

          <Fält
            titel={T.mailSender}
            hjälp={T.mailHelp}
            värde={mejlFält}
            onChange={x => sätt({ mejlnamn: rensaMailavsandare(x) })}
            maxLength={mejlMax}
            räknare
            fot={<>{T.senderShown} <span className="text-slate-200">{mejlFält || mejlStandard}</span></>}
          />
        </div>

        {/* Sidan bakom länken i meddelandet.
            Salongen skickar den till varenda kund utan att någonsin ha sett den
            själv — och den som inte vet vad kunden möter kan inte svara på
            frågor om den. Öppnas i egen flik: den ligger på kundsidan och inte
            i panelen, och ett klick ska inte kosta osparade ändringar. */}
        {avbokaExempel && (
          <div className="mt-5 pt-5 border-t border-navy-700">
            <p className="text-slate-400 text-xs leading-relaxed">
              {T.cancelPageHelp}{' '}
              <a
                href={avbokaExempel}
                target="_blank"
                rel="noopener noreferrer"
                className="text-mustard hover:text-mustard-light underline underline-offset-2"
              >
                {T.cancelPageLink}
              </a>
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {TEMPLATES.map(spec => {
          const tidsstyrd = Boolean(spec.ledtid)
          /* Bekräftelsen och avbokningen följer kontaktsättet. De tidsstyrda bär
             sitt eget val. */
          const c       = kanalFor(spec.kind, kanalval)
          const m       = v.mallar[spec.kind]
          const mall    = settingsFor(rows, spec.kind, c)
          const smsBara = c === 'sms'
          const extra   = smsExtra[spec.kind] ?? ''
          /* Bara SMS kräver en leverantör. Ett tidsstyrt meddelande som valt
             mail ska gå att slå på även innan SMS är påkopplat — annars är hela
             påminnelsen låst av något som inte rör den. */
          const låstAvSms = smsBara && !smsReady

          return (
            <div key={spec.kind} className={`bg-navy-800 border rounded-xl p-6 transition-colors ${
              m.enabled ? 'border-navy-700' : 'border-navy-800'
            }`}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold text-sm ${m.enabled ? 'text-white' : 'text-slate-500'}`}>
                    {spec.namn}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">{spec.när}</p>

                  {/*
                    * Kanalvalet, bara för de tidsstyrda.
                    *
                    * Bekräftelsen och avbokningen följer kontaktsättet högst upp
                    * och har inget val här — de är svar på något kunden just
                    * gjort, och de går i det format kunden nyss lämnade sina
                    * uppgifter för.
                    *
                    * De två andra är en annan sak. En påminnelse ska läsas inom
                    * några timmar och gör det bäst som SMS; en omdömesfråga mår
                    * bra av ett mail, där länken blir en knapp i stället för
                    * tecken som kostar.
                    */}
                  {tidsstyrd && (
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      {([['email', T.chEmail], ['sms', T.chSms]] as const).map(([k, namn]) => {
                        const vald = c === k
                        const låst = k === 'sms' && !smsReady
                        return (
                          <button
                            key={k}
                            onClick={() => {
                              if (låst) return
                              sätt(spec.kind === 'reminder'
                                ? { påminnKanal: k }
                                : { omdömeKanal: k })
                            }}
                            disabled={låst}
                            title={låst ? T.noSmsShort : undefined}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                              låst ? 'border-navy-800 text-slate-600 cursor-default'
                              : vald ? 'border-mustard bg-mustard/10 text-mustard'
                              : 'border-navy-600 text-slate-400 hover:text-white'
                            }`}
                          >
                            {namn}
                          </button>
                        )
                      })}
                      <span className="text-slate-500 text-xs ml-1">
                        {c === 'sms' ? T.smsWhy : T.mailWhy}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bekräftelsen och avbokningen går inte att stänga av. En kund
                    som bokar och inte får något besked ringer salongen, och då
                    har systemet skapat arbete i stället för att ta bort det. */}
                {tidsstyrd ? (
                  <button
                    onClick={() => { if (!låstAvSms) sättMall(spec.kind, { enabled: !m.enabled }) }}
                    disabled={låstAvSms}
                    title={låstAvSms ? T.noSmsShort : undefined}
                    role="switch"
                    aria-checked={m.enabled}
                    aria-label={spec.namn}
                    className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors ${
                      låstAvSms ? 'bg-navy-800' : m.enabled ? 'bg-mustard' : 'bg-navy-600'
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

/*
 * Ett av fälten på raden.
 *
 * Ligger på modulnivå och inte inne i vyn med flit: en komponent som deklareras
 * under renderingen får en ny identitet varje gång, och React river då fältet
 * och bygger det på nytt — markören hoppar ur efter varje tecken. Felet ser ut
 * som ett tangentbordsproblem och är ett struktursproblem.
 *
 * Hjälptexten tar den plats som blir över så att inmatningsfälten hamnar på
 * samma höjd i alla tre kolumnerna, trots att texterna är olika långa. Utan det
 * står fälten i trappa och raden ser slarvig ut även när den är rätt.
 */
function Fält({
  titel, hjälp, värde, onChange, maxLength, placeholder, räknare = false, fot,
}: {
  titel: string
  hjälp: string
  värde: string
  onChange: (v: string) => void
  maxLength: number
  placeholder?: string
  räknare?: boolean
  fot?: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      {/* Räknaren står vid etiketten och inte bredvid fältet: i en smal kolumn
          äter den bredd som namnet behöver, och uppe till höger läser den ändå
          som fältets egen. */}
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="text-white text-xs font-semibold">{titel}</label>
        {räknare && (
          <span className="text-slate-500 text-xs tabular-nums shrink-0">
            {värde.length}/{maxLength}
          </span>
        )}
      </div>
      <p className="text-slate-400 text-xs mb-2 leading-relaxed flex-1">{hjälp}</p>
      <input
        value={värde}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
      />
      {/* Fotraden reserverar två raders höjd i alla tre kolumnerna, även när
          den är tom. Utan det bestämmer den längsta foten var just det fältet
          hamnar, och inmatningsfälten står i trappa i stället för på linje —
          plus att raden rycker till i höjd så fort ett nummer fylls i. */}
      <p className="text-slate-500 text-xs mt-2 leading-relaxed min-h-10">{fot}</p>
    </div>
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
  mailSender:   'Avsändarnamn i e-post',
  mailHelp:     'Det som står som avsändare i inkorgen. Lämnar du fältet tomt används företagsnamnet från din hemsida.',
  senderHelp:   'Avsändare för sms. Lämnar du fältet tomt används företagsnamnet från din hemsida. Max 11 tecken',
  senderShown:  'Kunden ser:',
  cancelPageHelp: 'Bekräftelsen och påminnelsen bär en länk dit kunden kan avboka eller ändra sin tid.',
  cancelPageLink: 'Se sidan kunden kommer till',
  chEmail:      'E-post',
  chSms:        'SMS',
  emailWhat:    'Bekräftelser och påminnelser som mail. Kostar ingenting per utskick och rymmer hela texten.',
  smsWhat:      'Samma besked som SMS. Läses inom några minuter, men kostar per utskick och ryms i 160 tecken.',
  emailRequires:'Kunden fyller i sin e-postadress när de bokar',
  smsRequires:  'Kunden fyller i sitt mobilnummer när de bokar',
  always:       'Alltid på',
  smsWhy:       'Läses inom minuter, kostar per utskick.',
  mailWhy:      'Kostar ingenting, men läses när kunden öppnar sin inkorg.',
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
