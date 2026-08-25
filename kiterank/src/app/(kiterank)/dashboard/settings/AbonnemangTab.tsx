'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { riktning } from '@/lib/betalning'
import { AVBETALD_RABATT_KR, förlorarSidan } from '@/lib/exportRatt'
import type { KontoLäge, Plan, Intervall, Priser, Prislapp } from '@/lib/betalning'

/*
 * Abonnemangsfliken: läget, paketen, tillägget och vägen ut.
 *
 * Fyra frågor, uppifrån och ned: hur ligger jag till? vilken nivå kör jag och
 * kan jag byta? vill jag ha bokningen? hur säger jag upp? Den sista står sist
 * men döljs inte — en uppsägning som kräver detektivarbete är den sortens
 * knep som byter en lugn uppsägning mot en arg recension.
 *
 * Kort, kvitton, byten och uppsägning verkställs i Stripes portal. Vi ritar
 * läget och öppnar rätt dörr; själva pengarna rör vi aldrig i egna vyer.
 */

const T = {
  sv: {
    lägen: {
      prov:        (d: string) => `Du är på gratisprovet — det gäller till ${d}. Ingen betalning är registrerad än.`,
      'prov-slut': ()          => 'Gratisprovet har löpt ut. Välj ett paket nedan för att fortsätta.',
      aktiv:       (d: string) => d ? `Abonnemanget är aktivt och betalt till ${d}.` : 'Abonnemanget är aktivt.',
      förfallen:   ()          => 'Den senaste betalningen gick inte igenom. Uppdatera kortet under Hantera abonnemang så försöker vi igen.',
      uppsagd:     ()          => 'Abonnemanget är uppsagt.',
      ingen:       ()          => 'Inget abonnemang är igång ännu. Välj ett paket nedan.',
    } as Record<KontoLäge, (d: string) => string>,
    klar:       'Tack! Betalningen är genomförd — det kan dröja någon minut innan läget nedan hunnit uppdateras.',
    avbruten:   'Köpet avbröts. Inget har dragits.',
    paketRubrik: 'Paket',
    månad:      'Månadsvis',
    år:         'Årsvis',
    årsRabatt:  'Två månader gratis',
    plan: {
      mall: {
        namn: 'Hemsida + marknadsföringsplattform',
        om:   'Välj bland våra mallar och forma sajten efter ditt varumärke. Domän, SSL och drift ingår, plus hela marknadsföringsplattformen.',
      },
      design: {
        namn: 'Designad hemsida + marknadsföringsplattform',
        om:   'Vi designar sajten från grunden efter ert varumärke och startar upp er personligen. I övrigt allt som ingår i det första paketet.',
      },
      fullservice: {
        namn: 'Full service',
        om:   'Designad hemsida, hela plattformen och löpande hjälp med marknadsföringen — vi gör jobbet, ni driver salongen.',
      },
    } as Record<Plan, { namn: string; om: string }>,
    nuvarande:  'Ditt paket',
    provarNu:   'Prövas just nu',
    välj:       'Välj det här paketet',
    byt:        'Byt till det här paketet',
    bytNed:     'Byt ned vid periodens slut',
    fråga:      'Fråga om uppgradering',
    fråganSkickad: 'Vi hör av oss',
    fråganOm:   (p: string) => `Du har frågat om ${p}. Vi hör av oss med en offert — en designad sida börjar med ett samtal om hur den ska se ut.`,
    byteKöat:   (p: string, d: string) => `Du byter till ${p} den ${d}. Fram till dess gäller ditt nuvarande paket, som du redan betalat för.`,
    ångraByte:  'Ångra bytet',
    uppOm:      'Uppgraderingar sker inte automatiskt. En designad sida ska formges innan den kan levereras, så vi tar det per kund.',
    förlorar:   'Du förlorar din formgivna sida',
    förlorarOm: 'Din sida är formgiven för er och betalas av under det första året. Går du ned till mallpaketet innan dess byts den mot en mall — texter, bilder och tjänster följer med, men formgivningen gör det inte. Efter ett år som kund är sidan betald och följer med även på mallnivån.',
    avbetaldRubrik: 'Din hemsida är betald',
    avbetaldOm: (kr: number) => `Du har varit kund i över ett år, och därmed betalat färdigt formgivningen av din sida. ${kr} kr har dragits av från din månadsavgift — permanent, utan att du behöver göra något. Sidan är dessutom din att ta med dig om du någon gång slutar hos oss.`,
    offert:     'Offert — hör av dig så räknar vi på det',
    perMån:     '/mån',
    perÅr:      '/år',
    uppstart:   (p: string) => `+ ${p} i uppstartsavgift, en gång`,
    uppstartOm: 'Täcker formgivningen och uppstarten. Dras på första fakturan och aldrig igen.',
    uppstartFri: 'Ingen uppstartsavgift vid årsbetalning',
    bokningRubrik: 'Bokningssystem',
    bokningOm:  'Onlinebokning på hemsidan, kalender och personal, automatiska bekräftelser, påminnelser och omdömesfrågor efter besöket.',
    bokningPå:  'Ingår i ditt abonnemang',
    bokningProv: 'Ingår i provet',
    bokningLägg: 'Lägg till bokningssystemet',
    bokningPris: (p: string) => `${p} utöver paketet`,
    bokningSms: (kr: number) => `SMS kostar ${kr} kr per skickat meddelande och faktureras i efterskott. Mejl ingår.`,
    bokningSäg:   'Säg upp bokningssystemet',
    bokningSäker: 'Säkert? Klicka igen',
    bokningSlutar: (d: string) => `Bokningssystemet är uppsagt och gäller till ${d}. Kalendern och alla inbokade tider ligger kvar till dess.`,
    bokningÅngra: 'Ångra uppsägningen',
    bokningVillkor: 'Uppsägningen gäller från nästa faktura. Perioden du redan betalat använder du färdigt, och ingenting raderas — dina bokningar finns kvar även efteråt.',
    hantera:    'Hantera abonnemang',
    hanteraOm:  'Under Hantera abonnemang byter du kort, hämtar kvitton och säger upp. Det öppnas hos vår betalpartner — det är där kortuppgifterna bor, aldrig hos oss. Säger du upp löper allt som vanligt till periodens slut, och ingenting raderas.',
    öppnar:     'Öppnar…',
    fel:        'Kunde inte öppna just nu. Försök igen om en stund.',
    felBokning: 'Ändringen gick inte igenom. Ingenting har ändrats i ditt abonnemang — försök igen om en stund.',
    saknas:     'Priset är inte satt än',
  },
  en: {
    lägen: {
      prov:        (d: string) => `You are on the free trial — it runs until ${d}. No payment is registered yet.`,
      'prov-slut': ()          => 'The free trial has ended. Pick a plan below to continue.',
      aktiv:       (d: string) => d ? `Your subscription is active and paid until ${d}.` : 'Your subscription is active.',
      förfallen:   ()          => 'The last payment did not go through. Update your card under Manage subscription and we will retry.',
      uppsagd:     ()          => 'The subscription has been cancelled.',
      ingen:       ()          => 'No subscription yet. Pick a plan below.',
    } as Record<KontoLäge, (d: string) => string>,
    klar:       'Thank you! Payment completed — the status below may take a minute to catch up.',
    avbruten:   'The purchase was cancelled. Nothing has been charged.',
    paketRubrik: 'Plans',
    månad:      'Monthly',
    år:         'Yearly',
    årsRabatt:  'Two months free',
    plan: {
      mall: {
        namn: 'Website + marketing platform',
        om:   'Pick one of our templates and shape it around your brand. Domain, SSL and hosting included, plus the full marketing platform.',
      },
      design: {
        namn: 'Designed website + marketing platform',
        om:   'We design your site from scratch around your brand and onboard you personally. Everything in the template plan otherwise.',
      },
      fullservice: {
        namn: 'Full service',
        om:   'Designed website, the whole platform, and ongoing marketing help — we do the work, you run the salon.',
      },
    } as Record<Plan, { namn: string; om: string }>,
    nuvarande:  'Your plan',
    provarNu:   'Currently trying',
    välj:       'Choose this plan',
    byt:        'Switch to this plan',
    bytNed:     'Switch at end of period',
    fråga:      'Ask about upgrading',
    fråganSkickad: 'We will be in touch',
    fråganOm:   (p: string) => `You have asked about ${p}. We will get back to you with a quote — a designed site starts with a conversation about how it should look.`,
    byteKöat:   (p: string, d: string) => `You switch to ${p} on ${d}. Until then your current plan applies, which you have already paid for.`,
    ångraByte:  'Undo the switch',
    uppOm:      'Upgrades do not happen automatically. A designed site has to be designed before it can be delivered, so we handle it per customer.',
    förlorar:   'You lose your designed site',
    förlorarOm: 'Your site is designed for you and paid off over the first year. Switching to the template plan before then replaces it with a template — text, images and services carry over, but the design does not. After a year as a customer the site is paid off and stays with you even on the template plan.',
    avbetaldRubrik: 'Your website is paid off',
    avbetaldOm: (kr: number) => `You have been a customer for over a year, which means the design of your site is fully paid for. ${kr} kr has been deducted from your monthly fee — permanently, with nothing for you to do. The site is also yours to take with you should you ever leave.`,
    offert:     'By quote — get in touch and we will price it',
    perMån:     '/mo',
    perÅr:      '/yr',
    uppstart:   (p: string) => `+ ${p} one-time setup fee`,
    uppstartOm: 'Covers the design work and getting you started. Charged on the first invoice only.',
    uppstartFri: 'No setup fee with yearly billing',
    bokningRubrik: 'Booking system',
    bokningOm:  'Online booking on your site, calendar and staff, automatic confirmations, reminders and review requests after the visit.',
    bokningPå:  'Included in your subscription',
    bokningProv: 'Included in your trial',
    bokningLägg: 'Add the booking system',
    bokningPris: (p: string) => `${p} on top of your plan`,
    bokningSms: (kr: number) => `SMS costs ${kr} kr per message sent, billed in arrears. Email is included.`,
    bokningSäg:   'Cancel the booking system',
    bokningSäker: 'Sure? Click again',
    bokningSlutar: (d: string) => `The booking system is cancelled and runs until ${d}. Your calendar and every booked appointment stay until then.`,
    bokningÅngra: 'Undo the cancellation',
    bokningVillkor: 'The cancellation applies from your next invoice. You keep the period you have already paid for, and nothing is deleted — your bookings remain afterwards.',
    hantera:    'Manage subscription',
    hanteraOm:  'Manage subscription is where you change your card, fetch receipts and cancel. It opens with our payment partner — that is where card details live, never with us. If you cancel, everything runs until the end of the period, and nothing is deleted.',
    öppnar:     'Opening…',
    fel:        'Could not open right now. Try again shortly.',
    felBokning: 'The change did not go through. Nothing in your subscription has changed — try again shortly.',
    saknas:     'Price not set yet',
  },
}

const PLANER: Plan[] = ['mall', 'design', 'fullservice']

function belopp(p: Prislapp): string | null {
  if (!p || p.belopp == null) return null
  return `${p.belopp.toLocaleString('sv-SE')} ${p.valuta === 'SEK' ? 'kr' : p.valuta}`
}

export function AbonnemangTab({
  läge, plan, harBokning, bokningTill, byte, förfrågan, avbetald,
  intervall, datum, harStripeKund, priser, kvitto, utanLäge,
}: {
  läge:  KontoLäge
  plan:  Plan | null
  harBokning: boolean
  /** Uppsagt tillägg som löper perioden ut, färdigformaterat datum. */
  bokningTill?: string | null
  /** Köad nedgradering som verkställs vid periodens slut. */
  byte?: { till: Plan; datum: string } | null
  /** Obesvarad uppgraderingsförfrågan. */
  förfrågan?: Plan | null
  /** Formgivningen avbetald efter ett år — avdraget gäller. */
  avbetald?: boolean
  /** Kundens nuvarande intervall, när det finns. Styr vad växeln startar på. */
  intervall: Intervall | null
  /** Datumet läget hänvisar till, färdigformaterat. */
  datum: string
  harStripeKund: boolean
  priser: Priser
  /** Kassans återhopp: ?betalning=klar eller avbruten. */
  kvitto?: 'klar' | 'avbruten' | null
  /** Utan lägesrutan — betalväggen har redan sagt samma sak i sin rubrik. */
  utanLäge?: boolean
}) {
  const { lang } = useLang()
  const t = T[lang]
  const [valtIntervall, setValtIntervall] = useState<Intervall>(intervall ?? 'manad')
  const [öppnar, setÖppnar] = useState<string | null>(null)
  /* Två sorters fel med två sorters besked. Ett misslyckat paketbyte handlar
     om en dörr som inte öppnades; en misslyckad ändring av tillägget handlar
     om ett avtal som inte ändrades — och där är det viktigaste budskapet att
     ingenting hänt, så att kunden vågar trycka igen. */
  const [fel, setFel] = useState<false | 'öppna' | 'bokning'>(false)
  /* Uppsägningen i två steg. Ett felklick här kostar salongen sin kalender. */
  const [bekräftar, setBekräftar] = useState(false)

  /*
   * Tillägget läggs till och sägs upp här, inte i Stripes portal.
   *
   * Portalen kan byta paket och säga upp hela abonnemanget, men den kan varken
   * lägga till eller ta bort en extra rad. En salong som bara ville sluta med
   * kalendern hade där bara knappen som säger upp hemsidan också.
   */
  /*
   * Paketbyte, med riktningen som avgör vad som händer.
   *
   * Nedåt köas hos Stripe till periodens slut. Uppåt blir en förfrågan som
   * landar hos Jakob — en designad sida ska formges innan den kan levereras,
   * och att låta någon köpa den med ett klick vore att sälja något som inte
   * finns än.
   */
  async function bytPaket(kropp: Record<string, unknown>, märke: string) {
    setÖppnar(märke); setFel(false)
    try {
      const res = await fetch('/api/betalning/paketbyte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kropp),
      })
      if (!res.ok) throw new Error()
      window.location.reload()
    } catch {
      setFel('bokning')
      setÖppnar(null)
    }
  }

  async function ändraBokning(på: boolean) {
    setÖppnar(på ? 'bok-på' : 'bok-av'); setFel(false)
    try {
      const res = await fetch('/api/betalning/bokningstillagg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ på }),
      })
      if (!res.ok) throw new Error()
      window.location.reload()
    } catch {
      setFel('bokning')
      setÖppnar(null)
      setBekräftar(false)
    }
  }

  async function tillStripe(mål: 'portal' | { plan: Plan; bokning: boolean }) {
    setÖppnar(typeof mål === 'string' ? 'portal' : mål.plan + (mål.bokning ? '-b' : ''))
    setFel(false)
    try {
      /*
       * Med ett aktivt abonnemang går allt via portalen — även paketbyte och
       * tillägg, så att Stripe räknar mellanskillnaden på innevarande period
       * i stället för att vi startar ett andra abonnemang bredvid det första.
       * Utan abonnemang finns inget att hantera, och då är kassan rätt dörr.
       */
      const res = mål === 'portal' || harAbonnemang
        ? await fetch('/api/betalning/portal', { method: 'POST' })
        : await fetch('/api/betalning/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: mål.plan, intervall: valtIntervall, bokning: mål.bokning }),
          })
      const d = await res.json().catch(() => null)
      if (!res.ok || !d?.url) throw new Error()
      window.location.href = d.url
    } catch {
      setFel('öppna')
      setÖppnar(null)
    }
  }

  /*
   * Skillnaden mellan "har" och "provar".
   *
   * Ett provkonto bär redan en plannivå — den sattes vid registreringen — men
   * betalar ingenting. Markerar man det kortet som "ditt paket" och döljer
   * knappen har man låst provkunden ute från precis det köp provet skulle
   * leda till. Bara ett riktigt abonnemang hos Stripe räknas som att man har
   * paketet.
   */
  const harAbonnemang = läge === 'aktiv' || läge === 'förfallen' || läge === 'uppsagd'

  const per = valtIntervall === 'ar' ? t.perÅr : t.perMån
  /* Beloppet bär sitt eget intervall — utan det läser årspriset som en
     månadskostnad, vilket är fyra gånger så dyrt som kunden tror. */
  const bokningsRå = belopp(priser.bokning[`${plan ?? 'mall'}_${valtIntervall}`] ?? null)
  const bokningsPris = bokningsRå ? `${bokningsRå}${per}` : null

  return (
    <div className="space-y-5">
      {kvitto && (
        <div className={`rounded-2xl p-4 border text-sm ${
          kvitto === 'klar'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-navy-900 border-navy-700 text-slate-400'
        }`}>
          {t[kvitto]}
        </div>
      )}

      {/* Avbetald formgivning. Står högt och i grönt med flit: det är en
          rabatt kunden fått utan att be om den, och en rabatt ingen känner
          till är bortkastade pengar. */}
      {avbetald && !utanLäge && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <h2 className="text-emerald-300 font-semibold text-sm">{t.avbetaldRubrik}</h2>
          <p className="text-emerald-200/80 text-sm mt-1.5 leading-relaxed">
            {t.avbetaldOm(AVBETALD_RABATT_KR)}
          </p>
        </div>
      )}

      {/* Läget, i klartext överst. */}
      {!utanLäge && (
        <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5">
          <p className="text-slate-300 text-sm leading-relaxed">{t.lägen[läge](datum)}</p>
          {fel && <p className="text-red-400 text-xs mt-2">{fel === 'bokning' ? t.felBokning : t.fel}</p>}
        </div>
      )}
      {utanLäge && fel && (
        <p className="text-red-400 text-xs">{fel === 'bokning' ? t.felBokning : t.fel}</p>
      )}

      {/* Paketen, med intervallväxeln ovanför så att beloppen på korten byter
          betydelse på ett ställe i stället för tre. */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-white font-semibold text-sm">{t.paketRubrik}</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-navy-900 border border-navy-700 rounded-lg p-1">
              {(['manad', 'ar'] as const).map(i => (
                <button
                  key={i}
                  onClick={() => setValtIntervall(i)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    valtIntervall === i ? 'bg-mustard/15 text-mustard' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {i === 'manad' ? t.månad : t.år}
                </button>
              ))}
            </div>
            {valtIntervall === 'ar' && (
              <span className="text-emerald-400 text-[11px] font-semibold">{t.årsRabatt}</span>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {PLANER.map(p => {
            const är  = plan === p
            const kr  = belopp(priser.paket[`${p}_${valtIntervall}`] ?? null)
            const upp = belopp(priser.uppstart[`${p}_${valtIntervall}`] ?? null)
            /* Att avgiften försvinner på årsbetalning är ett säljargument, men
               bara om det står där valet görs. Visas den bara som frånvaro
               ser årspriset bara ut som ett större belopp. */
            const uppFriÅr = !upp && valtIntervall === 'ar'
              && Boolean(priser.uppstart[`${p}_manad`])
            const upptagen = öppnar !== null
            return (
              <div key={p} className={`rounded-2xl p-5 border flex flex-col ${
                är ? 'bg-mustard/5 border-mustard/30' : 'bg-navy-900 border-navy-700'
              }`}>
                {/* Etiketten står överst till vänster, ovanför namnet — den
                    svarar på "var är jag" innan ögat börjar jämföra paket. */}
                {är && (harAbonnemang || läge === 'prov') && (
                  <p className="text-mustard text-[11px] font-bold uppercase tracking-wide mb-1.5">
                    {harAbonnemang ? t.nuvarande : t.provarNu}
                  </p>
                )}
                <h3 className="text-white font-semibold text-sm">{t.plan[p].namn}</h3>

                <p className="text-white text-xl font-bold mt-2">
                  {kr ? <>{kr}<span className="text-slate-500 text-sm font-normal">{per}</span></> : (
                    <span className="text-slate-500 text-sm font-normal">{t.offert}</span>
                  )}
                </p>

                {upp && (
                  <p className="text-mustard text-xs font-semibold mt-1" title={t.uppstartOm}>
                    {t.uppstart(upp)}
                  </p>
                )}
                {uppFriÅr && (
                  <p className="text-emerald-400 text-xs font-semibold mt-1">{t.uppstartFri}</p>
                )}

                <p className="text-slate-400 text-sm mt-1.5 leading-relaxed flex-1">{t.plan[p].om}</p>

                {upp && <p className="text-slate-500 text-xs mt-2 leading-relaxed">{t.uppstartOm}</p>}

                {/* Kortet man redan betalar för bär vägen till hanteringen, på
                    samma plats som de andra korten bär bytesknappen. Låg den
                    tidigare i en egen ruta längre ned, vilket gjorde det aktiva
                    kortet till det enda utan handling — och kvitton och
                    uppsägning till något man fick leta efter. */}
                {kr && är && harAbonnemang && (
                  <button
                    onClick={() => tillStripe('portal')}
                    disabled={upptagen}
                    className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 bg-mustard hover:bg-mustard/90 text-navy-950"
                  >
                    {öppnar === 'portal' ? t.öppnar : t.hantera}
                  </button>
                )}

                {/* Betalande kund: knappen beror på riktningen. Nedåt går att
                    trycka på; uppåt är en fråga, inte ett köp. */}
                {kr && harAbonnemang && !är && (
                  riktning(plan, p) === 'ned' ? (
                    <>
                      {/* Varningen står ovanför knappen, inte i en ruta som
                          dyker upp efter klicket. Den som förlorar ett arbete
                          ska veta det innan de bestämmer sig. */}
                      {förlorarSidan(plan, p, avbetald ? 'ja' : null) && (
                        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                          <p className="text-amber-300 text-xs font-semibold">{t.förlorar}</p>
                          <p className="text-amber-200/70 text-xs mt-1 leading-relaxed">{t.förlorarOm}</p>
                        </div>
                      )}
                      <button
                        onClick={() => void bytPaket({ plan: p }, p)}
                        disabled={upptagen || Boolean(byte)}
                        className="mt-3 px-4 py-2 bg-navy-800 border border-navy-600 hover:border-navy-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                      >
                        {öppnar === p ? t.öppnar : t.bytNed}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => void bytPaket({ plan: p }, p)}
                      disabled={upptagen || förfrågan === p}
                      className="mt-4 px-4 py-2 bg-navy-800 border border-navy-600 hover:border-navy-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                    >
                      {öppnar === p ? t.öppnar : förfrågan === p ? t.fråganSkickad : t.fråga}
                    </button>
                  )
                )}

                {/* Prov eller inget abonnemang: alla paket köps i kassan. Där
                    finns inget att uppgradera från, så ingen förfrågan behövs. */}
                {kr && !harAbonnemang && (
                  <button
                    onClick={() => tillStripe({ plan: p, bokning: harBokning })}
                    disabled={upptagen}
                    className={`mt-4 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                      är
                        ? 'bg-mustard hover:bg-mustard/90 text-navy-950'
                        : 'bg-navy-800 border border-navy-600 hover:border-navy-500 text-white'
                    }`}
                  >
                    {öppnar?.startsWith(p) ? t.öppnar : t.välj}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Köat byte och obesvarad förfråga står under korten, inte inuti
            dem — de gäller abonnemanget som helhet och inte ett enskilt kort. */}
        {byte && (
          <div className="mt-3 rounded-2xl border border-mustard/30 bg-mustard/5 p-4 flex items-start justify-between gap-4 flex-wrap">
            <p className="text-mustard text-sm leading-relaxed flex-1 min-w-[240px]">
              {t.byteKöat(t.plan[byte.till].namn, byte.datum)}
            </p>
            <button
              onClick={() => void bytPaket({ ångra: true }, 'ångra')}
              disabled={öppnar !== null}
              className="px-4 py-2 bg-navy-800 border border-navy-600 hover:border-navy-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {öppnar === 'ångra' ? t.öppnar : t.ångraByte}
            </button>
          </div>
        )}

        {förfrågan && !byte && (
          <p className="mt-3 rounded-2xl border border-navy-700 bg-navy-900 p-4 text-slate-300 text-sm leading-relaxed">
            {t.fråganOm(t.plan[förfrågan].namn)}
          </p>
        )}

        {/* Vad knappen på det egna kortet leder till, och att uppsägningen
            bor där. Utan raden är portalen en dörr utan skylt. */}
        {harAbonnemang && (
          <p className="text-slate-500 text-xs mt-2.5 leading-relaxed">
            {t.uppOm} {t.hanteraOm}
          </p>
        )}
      </div>

      {/* Bokningen som tillägg — samma ruta oavsett nivå, eftersom den nu är
          samma produkt för alla tre. */}
      <div className={`rounded-2xl p-5 border space-y-3 ${
        harBokning ? 'bg-mustard/5 border-mustard/30' : 'bg-navy-900 border-navy-700'
      }`}>
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h2 className="text-white font-semibold text-sm">{t.bokningRubrik}</h2>
          {/* "Ingår i ditt abonnemang" bara när det finns ett abonnemang. Under
              provet ingår bokningen i provet, och efter ett utgånget prov ingår
              den ingenstans — då ska priset stå där i stället. */}
          {harBokning && (harAbonnemang || läge === 'prov')
            ? <span className="text-mustard text-[11px] font-bold uppercase tracking-wide">
                {harAbonnemang ? t.bokningPå : t.bokningProv}
              </span>
            : bokningsPris && <span className="text-slate-400 text-xs">{t.bokningPris(bokningsPris)}</span>}
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">{t.bokningOm}</p>
        <p className="text-slate-500 text-xs leading-relaxed">{t.bokningSms(priser.sms)}</p>

        {/* Uppsagt men löpande: datumet, och vägen tillbaka. */}
        {bokningTill && (
          <>
            <p className="text-amber-300 text-sm leading-relaxed">{t.bokningSlutar(bokningTill)}</p>
            <button
              onClick={() => void ändraBokning(true)}
              disabled={öppnar !== null}
              className="px-4 py-2 bg-navy-800 border border-navy-600 hover:border-navy-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {öppnar === 'bok-på' ? t.öppnar : t.bokningÅngra}
            </button>
          </>
        )}

        {/* Betalande kund utan tillägg: lägg till direkt, inte via portalen. */}
        {!harBokning && harAbonnemang && plan && bokningsPris && (
          <button
            onClick={() => void ändraBokning(true)}
            disabled={öppnar !== null}
            className="px-4 py-2 bg-navy-800 border border-navy-600 hover:border-navy-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {öppnar === 'bok-på' ? t.öppnar : t.bokningLägg}
          </button>
        )}

        {/* Prov eller inget abonnemang: tillägget köps i kassan tillsammans
            med paketet — det finns inget abonnemang att hänga en rad på. */}
        {!harBokning && !harAbonnemang && plan && bokningsPris && (
          <button
            onClick={() => tillStripe({ plan, bokning: true })}
            disabled={öppnar !== null}
            className="px-4 py-2 bg-navy-800 border border-navy-600 hover:border-navy-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {öppnar === plan + '-b' ? t.öppnar : t.bokningLägg}
          </button>
        )}

        {/* Uppsägning av bara tillägget. Två steg, och villkoren utskrivna
            bredvid — inte gömda bakom knappen. */}
        {harBokning && harAbonnemang && !bokningTill && (
          <div className="pt-1 space-y-2">
            <button
              onClick={() => bekräftar ? void ändraBokning(false) : setBekräftar(true)}
              onBlur={() => setBekräftar(false)}
              disabled={öppnar !== null}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                bekräftar
                  ? 'bg-red-500/20 border border-red-500/40 text-red-200'
                  : 'bg-navy-800 border border-navy-600 hover:border-navy-500 text-slate-300'
              }`}
            >
              {öppnar === 'bok-av' ? t.öppnar : bekräftar ? t.bokningSäker : t.bokningSäg}
            </button>
            <p className="text-slate-500 text-xs leading-relaxed">{t.bokningVillkor}</p>
          </div>
        )}
      </div>

    </div>
  )
}
