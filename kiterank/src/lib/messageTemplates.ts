/*
 * Salongens meddelanden till kunden.
 *
 * Fyra sorter, en definition. Vad de heter i panelen, vilka platshållare som
 * betyder något i var och en, och vad de säger om salongen inte skrivit något
 * eget — allt på ett ställe, så att en ny sort är en post i listan nedan och
 * inte en runda genom fem filer.
 *
 * Standardtexterna ligger i koden och inte i databasen. En salong som aldrig
 * öppnar fliken ska ändå skicka något vettigt, och en standardtext vi vill
 * förbättra ska förbättras för alla — inte bara för dem som registrerar sig
 * efter att vi ändrat den.
 */

import type { createAdminClient } from './supabase/admin'
import { fill, type PlaceholderValues } from './bookingText'
import type { Channel } from './sendMessage'
import { hämtaKanalval, type Kanalval } from './kontaktsatt'

type Admin = ReturnType<typeof createAdminClient>

export type TemplateKind = 'confirmation' | 'cancellation' | 'reminder' | 'review'

/** Kanalen en mall tillhör. Utan 'both': raden ÄR kanalen, och samma meddelande
 *  finns i två versioner med var sin text, sitt på/av och sin tidpunkt. Att
 *  skicka på båda är två rader som är påslagna, inte ett tredje val. */
export type TemplateChannel = Exclude<Channel, 'both'>

export type TemplateSpec = {
  kind:  TemplateKind
  namn:  string
  /** Vad meddelandet är till för, i en mening. */
  om:    string
  /** När det går ut. Kunden ska aldrig behöva gissa. */
  när:   string
  /** Platshållare som betyder något här. {medarbetare} finns inte i en
   *  påminnelse om vem som klipper inte är bestämt. */
  fält:  string[]
  /**
   * Vad kunden får om salongen inte skrivit eget — en text per kanal.
   *
   * De skiljer sig eftersom kanalerna bär olika mycket runt texten. Mailet får
   * en sammanställning med behandling, tid och bokningsnummer, så texten
   * behöver inte upprepa tiden. SMS:et har ingen sammanställning, så där måste
   * tiden stå i texten — annars står den ingenstans.
   */
  standard: { email: string; sms: string }
  /** Ämnesraden i mailet, om salongen inte skrivit egen. Finns bara för mail:
     ett SMS har ingen ämnesrad, och en påhittad sådan hade bara ätit av de 160
     tecknen. Ämnesraden avgör om mailet öppnas — den är inte en etikett utan
     första meningen kunden läser, och därför ska den gå att skriva om. */
  ämne: string
  /**
   * Platshållare som måste finnas kvar i texten.
   *
   * De ligger i standardtexten från början och går inte att spara bort. Ett
   * bokningsbesked utan tid är inget besked — kunden vet inte när de ska komma,
   * och ringer i stället. Salongen får flytta dem, skriva om allt runt omkring
   * och lägga till fler; det som inte går är att lämna någon av dem borta.
   *
   * Lägger de in samma platshållare två gånger får de ta bort den ena igen —
   * kontrollen är att minst en av varje finns, inte exakt en.
   *
   * Per kanal, och tomt för mail med flit. Varje uppgift ska ha en källa: bär
   * ramen den redan behöver texten inte göra det. Mailets sammanställning har
   * tiden, så ett krav där hade betytt att kunden läser samma tid två gånger —
   * och att salongen tvingas skriva in något systemet redan skrivit.
   */
  krav: { email: string[]; sms: string[] }
  /** Hur många timmar före besöket (påminnelse) eller efter det
   *  (recensionsförfrågan). Saknas för de meddelanden som utlöses av en
   *  händelse.
   *
   *  Bara timmar, och högst ett dygn. En påminnelse tre dagar i förväg är inte
   *  en påminnelse utan en notis man hinner glömma, och en recensionsförfrågan
   *  en vecka efter besöket möter en kund som inte längre minns hur det gick.
   *  Enheten fanns för att fältet såg ut att behöva den — inte för att någon
   *  ledtid någonsin var rätt i dagar. */
  ledtid?: { value: number; unit: 'h' }
  /** Påslaget från början, oavsett kanal. Bekräftelse och avbokning ja — en
   *  kund som bokar ska få veta att det gick igenom, och en kund vars tid
   *  försvinner ska få veta det. Påminnelse och recensionsförfrågan nej: de
   *  är utskick utöver det nödvändiga och ska väljas aktivt. */
  påslaget: boolean
}

const ALLA = ['{namn}', '{behandling}', '{datum}', '{tid}', '{medarbetare}', '{salong}']

export const TEMPLATES: TemplateSpec[] = [
  {
    kind: 'confirmation',
    namn: 'Bokningsbekräftelse',
    om:   'Beskedet att tiden är klar.',
    när:  'Skickas när tiden är godkänd — direkt vid bokningen, eller när du bekräftat den.',
    fält: ALLA,
    standard: {
      email: 'Hej {namn}! Din tid är bokad och klar. Vi ser fram emot ditt besök.',
      sms:   'Hej {namn}! Din tid {datum} kl {tid} är bokad. Välkommen!',
    },
    ämne: 'Din tid {datum} kl {tid} — {salong}',
    krav: { email: [], sms: ['{datum}', '{tid}'] },
    påslaget: true,
  },
  {
    kind: 'cancellation',
    namn: 'Avbokning',
    om:   'Kvittensen på att tiden är borta.',
    när:  'Skickas när en tid avbokas — av kunden själv eller av dig.',
    fält: ALLA,
    standard: {
      email: 'Hej {namn}! Din tid är nu avbokad. Välkommen att boka en ny tid när det passar dig.',
      sms:   'Hej {namn}! Din tid {datum} kl {tid} är avbokad. Välkommen att boka ny tid.',
    },
    ämne: 'Din tid {datum} är avbokad — {salong}',
    krav: { email: [], sms: ['{datum}', '{tid}'] },
    påslaget: true,
  },
  {
    kind: 'reminder',
    namn: 'Påminnelse',
    om:   'Puffen dagen före, så tiden inte glöms bort.',
    när:  'Skickas före besöket, så tiden inte glöms bort.',
    fält: ALLA,
    /* Utan {salong}: namnet står redan som avsändare i SMS:et, och de 26
       tecknen är skillnaden mellan ett och två meddelanden. */
    standard: {
      email: 'Hej {namn}! En påminnelse om din tid hos oss. Kan du inte komma får du gärna avboka i god tid, så någon annan hinner ta tiden.',
      sms:   'Hej {namn}! Påminnelse om din tid {datum} kl {tid}.',
    },
    ämne: 'Påminnelse: din tid {datum} kl {tid} — {salong}',
    krav: { email: [], sms: ['{datum}', '{tid}'] },
    ledtid: { value: 24, unit: 'h' }, påslaget: false,
  },
  {
    kind: 'review',
    namn: 'Recensionsförfrågan',
    om:   'Frågan efter besöket som ger salongen omdömen på Google.',
    när:  'Skickas efter ett avslutat besök.',
    fält: ['{namn}', '{behandling}', '{salong}', '{omdömeslänk}'],
    /* Kort med flit: texten ska rymmas i ett SMS tillsammans med länken och
       svarsraden. Varje segment över det är en kostnad per kund. */
    standard: {
      email: 'Hej {namn}! Tack för ditt besök. Är du nöjd får du gärna lämna ett omdöme — det tar en halv minut och betyder mycket för oss.\n{omdömeslänk}',
      sms:   'Tack för ditt besök, {namn}! Lämna gärna ett omdöme, det betyder mycket för oss. {omdömeslänk}',
    },
    ämne: 'Hur var ditt besök hos {salong}?',
    /* Tiden hör inte hit — besöket har varit. Länken däremot är hela
       meddelandets syfte, och den ligger i texten så att salongen kan skriva
       meningen runt den. Att den är obligatorisk är samma regel som för tiden i
       ett bokningsbesked: utan den är meddelandet något kunden inte kan agera
       på. I mailet blir en länk som står ensam på sin rad en knapp. */
    krav: { email: ['{omdömeslänk}'], sms: ['{omdömeslänk}'] },
    ledtid: { value: 24, unit: 'h' }, påslaget: false,
  },
]

/** Högsta ledtid. Ett dygn: längre fram är en påminnelse inte en påminnelse,
 *  och en recensionsförfrågan möter någon som glömt besöket. */
export const MAX_LEDTID = 24

/** Ledtiden i timmar, oavsett hur den råkar ligga i databasen. */
function timmar(value: number, unit: 'h' | 'd' | null): number {
  const t = unit === 'd' ? value * 24 : value
  return Math.max(0, Math.min(MAX_LEDTID, t))
}

export function templateSpec(kind: TemplateKind): TemplateSpec | null {
  return TEMPLATES.find(t => t.kind === kind) ?? null
}

/**
 * Vilka obligatoriska platshållare som saknas i en text.
 *
 * Texterna är låsta, så ingen salong kan bryta mot kravet. Funktionen finns
 * kvar för att verifiera våra egna: den som ändrar en standardtext och råkar
 * ta bort {tid} ska märka det innan salongerna gör det.
 *
 * Tom lista betyder att texten duger.
 */
export function saknadeKrav(
  body: string, kind: TemplateKind, channel: TemplateChannel = 'email',
): string[] {
  const spec = templateSpec(kind)
  if (!spec) return []
  return spec.krav[channel].filter(k => !body.includes(k))
}

/* ── Läsa och skriva ────────────────────────────────────────────────────── */

export type TemplateRow = {
  kind:        TemplateKind
  body:        string | null
  subject?:    string | null
  channel?:    TemplateChannel
  enabled?:    boolean
  lead_value?: number | null
  lead_unit?:  'h' | 'd' | null
  updated_at?: string | null
}

/** Allt salongen bestämt om ett meddelande, med standarderna ifyllda. Den form
 *  utskicken och panelen faktiskt vill ha — ingen av dem ska behöva veta vilka
 *  kolumner som råkade vara null. */
export type TemplateSettings = {
  body:      string
  /** Ämnesraden. Tom vid SMS — där finns ingen. */
  subject:   string
  channel:   TemplateChannel
  enabled:   boolean
  leadValue: number
  /** Alltid timmar. Fältet finns kvar eftersom kolumnen gör det. */
  leadUnit:  'h'
}

const KOLUMNER = 'kind, body, subject, channel, enabled, lead_value, lead_unit, updated_at'

/** Salongens egna inställningar. Sorter de inte rört saknas i svaret —
 *  anroparen faller tillbaka på standarden via `settingsFor`. */
export async function fetchTemplates(admin: Admin, companyId: string): Promise<TemplateRow[]> {
  /* Kanal- och tidkolumnerna är den nyare migrationen. En databas utan dem får
     raden den förstår, och standarderna gäller — samma nedstegning som
     bokningspolicyn gör. */
  for (const cols of [KOLUMNER, 'kind, body, channel, enabled, lead_value, lead_unit', 'kind, body']) {
    const res = await admin.from('message_templates').select(cols).eq('company_id', companyId)
    if (!res.error) return (res.data ?? []) as unknown as TemplateRow[]
  }
  return []
}

/** Inställningarna som gäller, salongens val över standarden. */
export function settingsFor(rows: TemplateRow[], kind: TemplateKind, channel: TemplateChannel = 'email'): TemplateSettings {
  const spec = templateSpec(kind)
  /* Kanalen ingår i uppslaget. Samma meddelande finns i två versioner med var
     sin text, sitt på/av och sin tidpunkt — utan kanalen här hade mailets
     inställningar visats för SMS och tvärtom. */
  const own  = rows.find(r => r.kind === kind && (r.channel ?? 'email') === channel)

  return {
    /* Texten kommer alltid härifrån. Salongen väljer om ett meddelande går ut
       och när, inte vad det säger.

       Skälet är kostnaden. Ett SMS rymmer 160 tecken, men platshållarna sväller
       olika mycket för olika kunder: samma mall som ryms för Ann och Klippning
       blir två meddelanden för Christoffer och Balayage med toning. Salongen ser
       aldrig det — panelen visar ett exempel — och upptäcker det på fakturan tre
       månader senare utan att kunna peka på varför.

       Kolumnerna body och subject ligger kvar orörda i databasen. Skulle
       redigering någon gång bli rätt igen finns texterna kvar. */
    body:      spec?.standard[channel] ?? '',
    /* Ämnesraden finns bara i mailet. Att bära den vidare till SMS hade gett
       en ruta som ser redigerbar ut men inte används någonstans. */
    /* Här gäller inte de tre tillstånden som för brödtexten. En tömd text är ett
       giltigt val — kunden får tiden och behandlingen ändå — men ett mail utan
       ämnesrad ser ut som skräppost och riskerar att aldrig öppnas. Tomt
       betyder därför standardämnet, inte inget ämne. */
    subject:   channel === 'sms' ? '' : (spec?.ämne ?? ''),
    channel,
    /* Standarden gäller oavsett kanal. Salongen har en kanal, och valet av den
       är också valet att betala för SMS — den kostnaden bestäms i kontaktrutan
       och inte meddelande för meddelande. Knöts standarden till en viss kanal
       stod bekräftelsen och avbokningen avslagna för en SMS-salong, utan
       strömbrytare att slå på dem med. */
    enabled:   own?.enabled ?? spec?.påslaget ?? false,
    /* Timmar, alltid. En rad som ligger kvar i dygn räknas om och kapas till
       ett dygn — det är taket, och en gammal inställning på tre dagar var
       ändå ingen påminnelse. */
    leadValue: timmar(own?.lead_value ?? spec?.ledtid?.value ?? 24, own?.lead_unit ?? 'h'),
    leadUnit:  'h',
  }
}

/** Ett enskilt meddelandes inställningar, hämtade direkt. */
export async function templateSettings(
  admin: Admin, companyId: string, kind: TemplateKind, channel: TemplateChannel = 'email',
): Promise<TemplateSettings> {
  const rows = await fetchTemplates(admin, companyId)
  return settingsFor(rows, kind, channel)
}

/**
 * Vilken kanal ett meddelande går på.
 *
 * Bekräftelsen och avbokningen följer salongens kontaktsätt. De är svar på något
 * kunden just gjort, och de måste komma fram — alltså till den uppgift kunden
 * lämnade när de bokade, den som är obligatorisk just därför.
 *
 * Påminnelsen och recensionsförfrågan går alltid som SMS. Båda är beroende av
 * att läsas vid rätt tillfälle: en påminnelse som ligger oläst i en inkorg till
 * dagen efter är ingen påminnelse, och en recensionsförfrågan besvaras medan
 * besöket är färskt eller inte alls. Ett SMS läses inom minuter, ett mail när
 * det passar. Salongen väljer därför bara om de ska skickas, inte hur.
 */
/**
 * Vilken kanal ett meddelande går i.
 *
 * Bekräftelsen och avbokningen följer salongens kontaktsätt utan undantag. De
 * är svar på något kunden just gjort, och de går i det format kunden nyss
 * lämnade sina uppgifter för.
 *
 * De två tidsstyrda bär sitt eget val, och null betyder att de följer
 * kontaktsättet. Skälet att de får välja: en påminnelse ska läsas inom några
 * timmar och gör det bäst som SMS, medan en recensionsförfrågan mår bra av ett
 * mail där länken blir en knapp i stället för tecken som kostar.
 */
export function kanalFor(kind: TemplateKind, val: Kanalval): TemplateChannel {
  if (kind === 'confirmation' || kind === 'cancellation') return val.kontakt
  return (kind === 'reminder' ? val.reminder : val.review) ?? val.kontakt
}

/**
 * Meddelandet som det ska gå ut, i sin kanal.
 *
 * Kanalen är salongens och inte meddelandets: alla fyra går i samma format,
 * eftersom det är det formatet kunden lämnat sina uppgifter för. `kanal` är
 * null när salongen slagit av just det här meddelandet — och då ska ingenting
 * skickas, inte en tom bekräftelse.
 *
 * Raderna finns kvar per kanal i databasen. En salong som prövar SMS och går
 * tillbaka till mail får därför sina gamla mailtexter tillbaka i stället för
 * standardtexterna.
 */
export async function aktivMall(
  admin: Admin, companyId: string, kind: TemplateKind,
): Promise<{ mall: TemplateSettings; kanal: TemplateChannel | null }> {
  const [rows, val] = await Promise.all([
    fetchTemplates(admin, companyId),
    hämtaKanalval(admin, companyId),
  ])
  const kanal = kanalFor(kind, val)
  const mall  = settingsFor(rows, kind, kanal)
  return { mall, kanal: mall.enabled ? kanal : null }
}

/** Texten som ska användas. Kvar för de anropare som bara behöver den. */
export function bodyFor(rows: TemplateRow[], kind: TemplateKind, channel: TemplateChannel = 'email'): string {
  return settingsFor(rows, kind, channel).body
}

export async function templateBody(
  admin: Admin, companyId: string, kind: TemplateKind,
): Promise<string> {
  return (await templateSettings(admin, companyId, kind)).body
}

export type TemplatePatch = Partial<{
  enabled:    boolean
  lead_value: number
}>

/** Sparar det som ändrats. En upsert och inte en insert: unik-villkoret på
 *  (company_id, kind) gör att ett andra tryck på Spara uppdaterar raden i
 *  stället för att lägga en till. */
export async function saveTemplate(
  admin: Admin, companyId: string, kind: TemplateKind, patch: TemplatePatch, channel: TemplateChannel = 'email',
): Promise<boolean> {
  /* Raden bär bara salongens val: om meddelandet går ut och när. Texten står i
     koden och skrivs aldrig härifrån. */
  const nuvarande = await templateSettings(admin, companyId, kind, channel)

  const { error } = await admin
    .from('message_templates')
    .upsert(
      {
        company_id: companyId,
        kind,
        channel,
        enabled:    patch.enabled ?? nuvarande.enabled,
        lead_value: patch.lead_value ?? nuvarande.leadValue,
        lead_unit:  'h',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,kind,channel' },
    )
  return !error
}

/** Ledtiden i millisekunder, som cron-jobbet räknar med. */
export function leadMs(s: TemplateSettings): number {
  return s.leadValue * 3_600_000
}

/** Texten med bokningens värden isatta. Samma motor som bekräftelsen använder,
 *  så en struken platshållare städas bort likadant i alla meddelanden. */
export function renderTemplate(body: string, values: PlaceholderValues): string {
  return fill(body, values)
}
