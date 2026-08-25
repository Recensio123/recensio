'use client'
import { useCallback, useEffect, useState } from 'react'
import { KundAnteckning } from './KundAnteckning'
 import { kundNyckel } from '@/lib/kundNyckel'
import { kön, type KommandeBokning, type KöInst, type Planerat } from '@/lib/kommande'
import type { Booking, Status } from './data'
import type { Role } from '@/lib/access'

/*
 * Vad som är på väg ut.
 *
 * Listan svarar på frågan salongen faktiskt öppnar fliken med: vilka bokningar
 * är inte färdiga, vilka utskick ligger i kön till dem, och kan jag stoppa
 * något. Inget annat — det som styr *vad* som skickas hör hemma under
 * Meddelanden, och att beskriva det på två ställen betyder att de förr eller
 * senare säger emot varandra.
 *
 * En bokning vars tid inte passerat ligger alltid kvar, oavsett om något
 * meddelande är påslaget. Har tiden passerat ligger den kvar så länge något
 * väntar — i praktiken recensionsförfrågan, och det är just den salongen vill
 * hinna stoppa.
 *
 * Datan kommer färdig från servern och ritas direkt. Därefter läses den om:
 * när fliken öppnas, och när något ändrats som kön beror på. Skälet är att kön
 * hänger på inställningarna under Meddelanden — slår salongen på
 * recensionsförfrågan där ska den dyka upp här, inte vid nästa sidladdning.
 * Färdig data först och en tyst omläsning efteråt ger båda: ingen väntan, och
 * ingenting inaktuellt.
 *
 * Texterna går inte att röra härifrån. De är låsta och ligger i koden; se
 * MeddelandenTab för varför.
 */

export function KommandeTab({
  initial, inst, demo = false, exempelBokningar = [],
  version = 0, role = 'admin', myStaffId = null, onStatusChange,
  noteringar = {}, onNotering,
}: {
  initial: KommandeBokning[]
  inst:    KöInst
  /* Demoläget räknar kön ur kalenderns exempelbokningar i stället för ur
     databasen. Samma räkning, samma inställningar — bara en annan källa, så att
     kalendern och listan aldrig kan visa olika veckor. */
  demo?:   boolean
  exempelBokningar?: Booking[]
  /** Bumpas av panelen när något ändrats som kön beror på. */
  version?: number
  role?:    Role
  /** Stolen en medarbetares inloggning talar för. */
  myStaffId?: string | null
  onStatusChange?: (id: string, status: Status) => void
  /** Salongens anteckningar per kundnyckel. */
  noteringar?: Record<string, string>
  onNotering?: (nyckel: string, text: string) => void
}) {
  const [bokningar, setBokningar] = useState<KommandeBokning[]>(
    demo ? demoKö(exempelBokningar, inst) : initial,
  )
  const [fel, setFel] = useState('')

  const hämta = useCallback(async () => {
    const res = await fetch('/api/kommande')
    if (!res.ok) throw new Error(String(res.status))
    return res.json() as Promise<{ bookings: KommandeBokning[]; inst: KöInst }>
  }, [])

  /* Läs om vid öppning och när panelen säger till. Inställningarna följer med i
     svaret, så demoläget räknar om sin exempelvecka på samma färska värden. */
  useEffect(() => {
    let aktiv = true
    hämta()
      .then(d => {
        if (!aktiv) return
        setBokningar(demo ? demoKö(exempelBokningar, d.inst) : d.bookings)
      })
      .catch(() => {})
    return () => { aktiv = false }
  }, [version, demo, exempelBokningar, hämta])

  /* Växlingen skrivs direkt. Den är ett enskilt val på en enskild bokning, inte
     ett formulär man fyller i — och den som stoppar ett utskick vill veta att
     det är stoppat, inte leta efter en Spara-knapp. */
  async function växla(id: string, kind: Planerat['kind'], över: boolean) {
    setBokningar(b => b.map(x => x.id !== id ? x : {
      ...x, planerat: x.planerat.map(p => p.kind === kind ? { ...p, över } : p),
    }))

    /* Demobokningarna finns inte i databasen. Växlingen syns, men den skrivs
       ingenstans — och ska inte göra det. */
    if (demo) return

    const res = await fetch('/api/kommande', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, kind, över }),
    })
    if (!res.ok) { setFel(T.failed); return }

    /* Läs om: ett stoppat sista utskick kan göra bokningen färdig, och då ska
       den lämna listan direkt och inte vid nästa besök. */
    const d = await hämta().catch(() => null)
    if (d) setBokningar(d.bookings)
  }

  /*
   * Skicka nu.
   *
   * Samma utskick som klockan skulle skickat, fast i klicket — rutten tar
   * samma väg och sätter samma stämpel, så pulsen ser en stämplad rad och
   * låter den vara. Raden markeras som skickad direkt i vyn; omläsningen
   * efteråt avgör om bokningen därmed är färdig och ska lämna listan.
   */
  async function skickaNu(id: string, kind: Planerat['kind']) {
    if (kind === 'confirmation') return
    setFel('')

    /* Demobokningarna finns inte i databasen — markeringen syns, inget går. */
    if (demo) {
      setBokningar(b => b.map(x => x.id !== id ? x : {
        ...x, planerat: x.planerat.map(p => p.kind === kind ? { ...p, skickat: true } : p),
      }))
      return
    }

    const res = await fetch('/api/kommande', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, kind }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => null)
      setFel(d?.reason === 'no_review_url' ? T.sendNoLink : T.sendFailed)
      return
    }

    /* Läs om: ett skickat sista utskick kan göra bokningen färdig, och då ska
       den lämna listan direkt. */
    const d = await hämta().catch(() => null)
    if (d) setBokningar(d.bookings)
  }

  /*
   * Uteblev och avboka, på plats i listan.
   *
   * Samma två beslut som i kalendern, och samma väg genom panelen — avbokningen
   * öppnar sitt meddelandeval, uteblev skrivs direkt. Att bygga en egen väg
   * härifrån hade betytt två ställen som avbokar, och det ena hade slutat
   * skicka besked den dagen någon ändrade det andra.
   *
   * Raden tas bort ur listan direkt. Båda statusarna gör bokningen färdig:
   * en utebliven kund får ingen recensionsförfrågan, och en avbokad tid har
   * ingenting kvar att skicka.
   */
  function sättStatus(id: string, status: Status) {
    if (!onStatusChange) return
    onStatusChange(id, status)

    /* En utebliven kund är färdig på en gång — det finns ingenting kvar att
       skicka till någon som inte kom. Ett avslutat besök kan däremot ha sin
       omdömesfråga kvar i kön, och då ska raden ligga kvar tills den gått.
       Panelen bumpar versionen, så omläsningen avgör vilket det blev. */
    if (status === 'no_show') setBokningar(b => b.filter(x => x.id !== id))
  }


  /* En medarbetare rör sina egna tider, salongen allas. Samma regel som
     kalendern, och samma som rutten upprätthåller. */
  const fårÄndra = (b: KommandeBokning) =>
    Boolean(onStatusChange) && (role !== 'staff' || (myStaffId != null && b.staffId === myStaffId))

  /* Grupperat på dag. En salong läser sin vecka dag för dag, inte som en rad
     bokningar i följd. */
  const dagar = [...new Set(bokningar.map(b => b.datum))]

  return (
    <div>
      <h2 className="text-white font-semibold text-lg mb-1">{T.title}</h2>
      <p className="text-slate-400 text-sm mb-5">{T.intro}</p>

      {fel && <p className="text-red-400 text-sm mb-4">{fel}</p>}

      {!bokningar.length && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <p className="text-slate-400 text-sm">{T.empty}</p>
        </div>
      )}

      <div className="space-y-6">
        {dagar.map(dag => (
          <div key={dag}>
            <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-2">{dagText(dag)}</h3>
            <div className="space-y-2">
              {bokningar.filter(b => b.datum === dag).map(b => (
                <div key={b.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-white text-sm font-semibold tabular-nums">{b.tid}</span>
                    <span className="text-white text-sm">{b.kund}</span>
                    <span className="text-slate-400 text-xs">{b.behandling}</span>
                    {b.status === 'pending' && (
                      <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wide">{T.pending}</span>
                    )}
                  </div>

                  {b.planerat.length ? (
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      {b.planerat.map(p => (
                        <Utskick
                          key={p.kind}
                          p={p}
                          onVäxla={() => void växla(b.id, p.kind, !p.över)}
                          onSkicka={() => void skickaNu(b.id, p.kind)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs mt-2">{T.nothingQueued}</p>
                  )}

                  {onNotering && b.nyckel && (
                    <div className="mt-3">
                      <KundAnteckning
                        nyckel={b.nyckel}
                        värde={noteringar[b.nyckel] ?? ''}
                        onSparad={text => onNotering(b.nyckel, text)}
                        låst={demo}
                      />
                    </div>
                  )}

                  {fårÄndra(b) && (
                    <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-navy-700">
                      {b.status !== 'completed' && (
                        <button
                          onClick={() => sättStatus(b.id, 'completed')}
                          title={T.doneHint}
                          className="px-3 py-1.5 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded-lg text-xs font-semibold"
                        >
                          {T.done}
                        </button>
                      )}
                      <button
                        onClick={() => sättStatus(b.id, 'no_show')}
                        className="px-3 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg text-xs font-semibold"
                      >
                        {T.noShow}
                      </button>
                      <button
                        onClick={() => sättStatus(b.id, 'cancelled')}
                        className="px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg text-xs font-semibold"
                      >
                        {T.cancel}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/*
 * Ett utskick i kön.
 *
 * Tre lägen, tre utseenden: det som gått, det som väntar, och det salongen
 * stängt av. Bekräftelsen går inte att stänga av — kunden som just bokat ska få
 * veta att det gick igenom.
 */
function Utskick({ p, onVäxla, onSkicka }: {
  p: Planerat
  onVäxla:  () => void
  onSkicka: () => void
}) {
  const låst = p.kind === 'confirmation' || p.skickat
  const när  = p.skickat ? T.sent : p.när ? klockslag(p.när) : ''

  /* Skicka nu bara där den betyder något: ett utskick som väntar. Skickat är
     skickat, ett stoppat har salongen just sagt nej till — knappen bredvid
     hade sagt emot dem — och bekräftelsen går alltid av sig själv. */
  const kanSkickas = !låst && !p.över

  return (
    <span className="inline-flex items-stretch">
      <button
        onClick={() => { if (!låst) onVäxla() }}
        disabled={låst}
        title={låst ? (p.skickat ? T.alreadySent : T.always) : p.över ? T.turnOn : T.turnOff}
        className={`text-xs border px-2.5 py-1.5 text-left transition-colors ${
          kanSkickas ? 'rounded-l-lg border-r-0' : 'rounded-lg'
        } ${
          p.skickat ? 'bg-navy-900 border-navy-700 text-slate-500'
          : p.över   ? 'bg-navy-900 border-navy-700 text-slate-600 line-through'
          : 'bg-mustard/10 border-mustard/50 text-mustard hover:border-mustard'
        }`}
      >
        <span className="font-medium">{T.kinds[p.kind]}</span>
        <span className="opacity-70"> · {p.channel === 'sms' ? T.sms : T.email}</span>
        {när && <span className="opacity-70"> · {när}</span>}
      </button>
      {kanSkickas && (
        <button
          onClick={onSkicka}
          title={T.sendNowHint}
          className="text-xs rounded-r-lg border border-mustard/50 bg-mustard/20 px-2.5 py-1.5 font-semibold text-mustard hover:bg-mustard/30 transition-colors"
        >
          {T.sendNow}
        </button>
      )}
    </span>
  )
}

/* Exempelveckan genom samma räkning som riktiga bokningar. Kalendern har inga
   stämplar att gå på, så vad som hunnit skickas räknas ur klockan i stället. */
function demoKö(bokningar: Booking[], inst: KöInst): KommandeBokning[] {
  const nu = Date.now()
  return kön(bokningar.map(b => {
    const start = new Date(`${b.date}T${b.time}:00`).getTime()
    return {
      id: b.id, kund: b.customerName, behandling: b.service,
      datum: b.date, tid: b.time, status: b.status, staffId: b.staffId ?? null,
      nyckel: kundNyckel({ telefon: b.phone, epost: b.email, namn: b.customerName }),
      bekräftad: true,
      påmind: nu > start - inst.reminder.ms,
      omdömt: nu > start + inst.review.ms,
    }
  }), inst, nu)
}

function dagText(datum: string): string {
  const d = new Date(datum + 'T12:00:00')
  return d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function klockslag(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

const T = {
  title:  'Kommande',
  intro:  'Bokningar som ännu inte är färdiga, och de utskick som ligger i kön. Tryck på ett utskick för att stoppa det för just den kunden.',
  empty:  'Inga bokningar ännu. Så fort någon bokar en tid dyker den upp här.',
  nothingQueued: 'Inga utskick planerade.',
  pending:'Väntar på godkännande',
  done:   'Avslutad',
  noShow: 'Uteblev',
  cancel: 'Avboka',
  doneHint: 'Markera besöket som genomfört',
  sent:   'skickat',
  sms:    'SMS',
  email:  'e-post',
  kinds: {
    confirmation: 'Bekräftelse',
    reminder:     'Påminnelse',
    review:       'Omdöme',
  } as Record<Planerat['kind'], string>,
  always:      'Bekräftelsen går alltid ut',
  alreadySent: 'Redan skickat',
  turnOff:     'Stoppa för den här kunden',
  turnOn:      'Skicka ändå',
  failed:      'Kunde inte spara. Försök igen.',
  sendNow:     'Skicka nu',
  sendNowHint: 'Skickar direkt i stället för vid den planerade tiden',
  sendFailed:  'Utskicket gick inte i väg. Försök igen.',
  sendNoLink:  'Ingen omdömeslänk inlagd — lägg in den under Meddelanden först.',
}
