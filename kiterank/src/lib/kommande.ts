import { TEMPLATES, settingsFor, kanalFor, leadMs, type TemplateRow, type TemplateChannel } from '@/lib/messageTemplates'
import { läsKontaktsätt } from '@/lib/kontaktsatt'

/*
 * Kön av utskick per bokning.
 *
 * Ren räkning, utan databas. Skälet är att tre ställen behöver samma svar:
 * sidan som serverrenderar listan, rutten som läser om den efter en ändring,
 * och panelen som räknar fram exempelveckan i demoläget. Tre uträkningar av
 * samma regel blir förr eller senare tre olika regler.
 *
 * Regeln i sin helhet:
 *
 *   En bokning vars tid inte passerat ligger alltid kvar. Alltid — oavsett om
 *   något meddelande är påslaget. Listan heter Kommande och inte Utskick.
 *
 *   En bokning vars tid passerat ligger kvar så länge något utskick väntar.
 *   Det är i praktiken recensionsförfrågan, och det är just den salongen vill
 *   hinna stoppa: kunden som klagade i stolen ska inte få en vänlig fråga om
 *   att sätta betyg.
 *
 *   När tiden passerat och ingenting väntar är bokningen färdig och hör hemma
 *   i kundhistoriken — men bara när salongen låtit besök avslutas automatiskt.
 *   Har de valt att markera avslutat själva ligger bokningen kvar tills någon
 *   tryckt på knappen. Den är listans enda påminnelse om att någon ska titta
 *   på den, och försvinner den innan dess får kunden aldrig sin omdömesfråga.
 */

export type Planerat = {
  kind:    'confirmation' | 'reminder' | 'review'
  channel: TemplateChannel
  /** När det går ut. Null för bekräftelsen, som hänger på bokningen och inte
   *  på klockan. */
  när:     string | null
  skickat: boolean
  /** Avstängt för just den här bokningen. */
  över:    boolean
}

export type KommandeBokning = {
  id:         string
  kund:       string
  behandling: string
  datum:      string
  tid:        string
  status:     string
  /** Vems stol. En medarbetare får bara röra sina egna tider. */
  staffId:    string | null
  /** Personen bakom bokningen — telefon, annars mejl, annars namn. Samma
   *  nyckel som kundhistoriken och gallringen, så anteckningen hittas av alla
   *  tre. */
  nyckel:     string
  /** Besöket är över, men ingen har sagt om det blev av. Räknas här och inte i
   *  panelen: klockan är inte panelens att fråga om mitt i en rendering. */
  planerat:   Planerat[]
}

/** Salongens inställningar i den form räkningen behöver dem. Serialiserbar med
 *  flit: den skickas från servern till panelen. */
export type KöInst = {
  confirmation: { enabled: boolean; channel: TemplateChannel }
  reminder:     { enabled: boolean; ms: number }
  review:       { enabled: boolean; ms: number }
}

export function köInst(rader: TemplateRow[], kontakt: unknown): KöInst {
  const k = läsKontaktsätt(kontakt)
  const s = Object.fromEntries(
    TEMPLATES.map(t => [t.kind, settingsFor(rader, t.kind, kanalFor(t.kind, k))]),
  )
  return {
    confirmation: { enabled: s.confirmation.enabled, channel: s.confirmation.channel },
    reminder:     { enabled: s.reminder.enabled, ms: leadMs(s.reminder) },
    review:       { enabled: s.review.enabled,   ms: leadMs(s.review) },
  }
}

/** Bokningen som räkningen behöver den, oavsett var raden kommer ifrån. */
export type Rå = {
  id:         string
  kund:       string
  behandling: string
  datum:      string
  tid:        string
  status:     string
  staffId?:   string | null
  nyckel?:    string
  bekräftad?: boolean
  påmind?:    boolean
  omdömt?:    boolean
  överPåminnelse?: boolean
  överOmdöme?:     boolean
}

/**
 * Bokningen med sin kö, eller null när den är färdig.
 *
 * Null och inte en flagga: den som frågar ska inte kunna glömma att filtrera.
 */
export function köFor(b: Rå, inst: KöInst, nu: number): KommandeBokning | null {
  /* Avbokad eller utebliven: färdig, oavsett läge. Ingen av dem ska stå kvar
     och vänta på ett avslut som inte betyder något. */
  if (b.status === 'cancelled' || b.status === 'no_show') return null

  const start = new Date(`${b.datum}T${b.tid.slice(0, 5)}:00`).getTime()
  const planerat: Planerat[] = []

  if (inst.confirmation.enabled) {
    planerat.push({
      kind: 'confirmation', channel: inst.confirmation.channel,
      när: null, skickat: b.bekräftad ?? false, över: false,
    })
  }
  if (inst.reminder.enabled) {
    const när = start - inst.reminder.ms
    planerat.push({
      kind: 'reminder', channel: 'sms', när: new Date(när).toISOString(),
      skickat: b.påmind ?? false, över: b.överPåminnelse ?? false,
    })
  }
  if (inst.review.enabled) {
    const när = start + inst.review.ms
    planerat.push({
      kind: 'review', channel: 'sms', när: new Date(när).toISOString(),
      skickat: b.omdömt ?? false, över: b.överOmdöme ?? false,
    })
  }

  /* Något som varken gått eller stängts av. Bekräftelsen räknas inte — den
     hänger på bokningen och inte på en tidpunkt som kan passeras. */
  const väntar = planerat.some(p => p.när && !p.skickat && !p.över)

  /* Tiden inte passerad: kvar, oavsett kö. Passerad: kvar bara så länge något
     utskick återstår. Besöket stängs av sig självt en stund efter sluttiden,
     så listan behöver aldrig hålla kvar rader i väntan på en avbockning. */
  if (nu <= start) return form(b, planerat)
  return väntar ? form(b, planerat) : null
}

function form(b: Rå, planerat: Planerat[]): KommandeBokning {
  return {
    id: b.id, kund: b.kund, behandling: b.behandling,
    datum: b.datum, tid: b.tid.slice(0, 5), status: b.status,
    staffId: b.staffId ?? null, nyckel: b.nyckel ?? '', planerat,
  }
}

/** Hela listan, sorterad som en kalender läses. */
export function kön(rader: Rå[], inst: KöInst, nu: number): KommandeBokning[] {
  return rader
    .map(b => köFor(b, inst, nu))
    .filter((b): b is KommandeBokning => b !== null)
    .sort((a, b) => (a.datum + a.tid).localeCompare(b.datum + b.tid))
}
