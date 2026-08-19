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

type Admin = ReturnType<typeof createAdminClient>

export type TemplateKind = 'confirmation' | 'cancellation' | 'reminder' | 'review'

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
  /** Vad kunden får om salongen inte skrivit eget. */
  standard: string
  /** Kanalen salongen får som utgångspunkt. SMS för påminnelsen: den läses i
   *  tid, och en påminnelse som läses efter besöket är meningslös. */
  kanal: Channel
  /** Hur långt före besöket (påminnelse) eller efter (recensionsförfrågan).
   *  Saknas för de meddelanden som utlöses av en händelse. */
  ledtid?: { value: number; unit: 'h' | 'd' }
  /** Påslaget från början. Bekräftelse och avbokning ja — en kund som bokar ska
   *  få veta att det gick igenom. Påminnelse och recensionsförfrågan nej,
   *  eftersom de kostar per SMS och ska väljas aktivt. */
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
    standard: 'Din tid är bokad och klar. Välkommen!',
    kanal: 'email', påslaget: true,
  },
  {
    kind: 'cancellation',
    namn: 'Avbokning',
    om:   'Kvittensen på att tiden är borta.',
    när:  'Skickas när en tid avbokas — av kunden själv eller av dig.',
    fält: ALLA,
    standard: 'Din tid {datum} kl {tid} är avbokad. Välkommen att boka en ny tid när det passar.',
    kanal: 'email', påslaget: true,
  },
  {
    kind: 'reminder',
    namn: 'Påminnelse',
    om:   'Puffen dagen före, så tiden inte glöms bort.',
    när:  'Skickas före besöket, så tiden inte glöms bort.',
    fält: ALLA,
    /* Utan {salong}: namnet står redan som avsändare i SMS:et, och de 26
       tecknen är skillnaden mellan ett och två meddelanden. */
    standard: 'Hej {namn}! Påminnelse om din tid {datum} kl {tid}.',
    kanal: 'sms', ledtid: { value: 24, unit: 'h' }, påslaget: false,
  },
  {
    kind: 'review',
    namn: 'Recensionsförfrågan',
    om:   'Frågan efter besöket som ger salongen omdömen på Google.',
    när:  'Skickas efter ett avslutat besök.',
    fält: ['{namn}', '{behandling}', '{salong}'],
    /* Kort med flit: texten ska rymmas i ett SMS tillsammans med länken och
       svarsraden. Varje segment över det är en kostnad per kund. */
    standard: 'Tack {namn}! Ditt omdöme betyder mycket för oss.',
    kanal: 'email', ledtid: { value: 1, unit: 'd' }, påslaget: false,
  },
]

export function templateSpec(kind: TemplateKind): TemplateSpec | null {
  return TEMPLATES.find(t => t.kind === kind) ?? null
}

/* ── Läsa och skriva ────────────────────────────────────────────────────── */

export type TemplateRow = {
  kind:        TemplateKind
  body:        string
  channel?:    Channel
  enabled?:    boolean
  lead_value?: number | null
  lead_unit?:  'h' | 'd' | null
}

/** Allt salongen bestämt om ett meddelande, med standarderna ifyllda. Den form
 *  utskicken och panelen faktiskt vill ha — ingen av dem ska behöva veta vilka
 *  kolumner som råkade vara null. */
export type TemplateSettings = {
  body:      string
  channel:   Channel
  enabled:   boolean
  leadValue: number
  leadUnit:  'h' | 'd'
}

const KOLUMNER = 'kind, body, channel, enabled, lead_value, lead_unit'

/** Salongens egna inställningar. Sorter de inte rört saknas i svaret —
 *  anroparen faller tillbaka på standarden via `settingsFor`. */
export async function fetchTemplates(admin: Admin, companyId: string): Promise<TemplateRow[]> {
  /* Kanal- och tidkolumnerna är den nyare migrationen. En databas utan dem får
     raden den förstår, och standarderna gäller — samma nedstegning som
     bokningspolicyn gör. */
  for (const cols of [KOLUMNER, 'kind, body']) {
    const res = await admin.from('message_templates').select(cols).eq('company_id', companyId)
    if (!res.error) return (res.data ?? []) as unknown as TemplateRow[]
  }
  return []
}

/** Inställningarna som gäller, salongens val över standarden. */
export function settingsFor(rows: TemplateRow[], kind: TemplateKind): TemplateSettings {
  const spec = templateSpec(kind)
  const own  = rows.find(r => r.kind === kind)

  return {
    /* Osatt rad betyder standard; tom sträng betyder att salongen medvetet
       tömt texten — samma tre tillstånd som sidans rubriker följer. */
    body:      own === undefined ? (spec?.standard ?? '') : own.body,
    channel:   own?.channel ?? spec?.kanal ?? 'email',
    enabled:   own?.enabled ?? spec?.påslaget ?? false,
    leadValue: own?.lead_value ?? spec?.ledtid?.value ?? 24,
    leadUnit:  own?.lead_unit  ?? spec?.ledtid?.unit  ?? 'h',
  }
}

/** Ett enskilt meddelandes inställningar, hämtade direkt. */
export async function templateSettings(
  admin: Admin, companyId: string, kind: TemplateKind,
): Promise<TemplateSettings> {
  const rows = await fetchTemplates(admin, companyId)
  return settingsFor(rows, kind)
}

/** Texten som ska användas. Kvar för de anropare som bara behöver den. */
export function bodyFor(rows: TemplateRow[], kind: TemplateKind): string {
  return settingsFor(rows, kind).body
}

export async function templateBody(
  admin: Admin, companyId: string, kind: TemplateKind,
): Promise<string> {
  return (await templateSettings(admin, companyId, kind)).body
}

export type TemplatePatch = Partial<{
  body:       string
  channel:    Channel
  enabled:    boolean
  lead_value: number
  lead_unit:  'h' | 'd'
}>

/** Sparar det som ändrats. En upsert och inte en insert: unik-villkoret på
 *  (company_id, kind) gör att ett andra tryck på Spara uppdaterar raden i
 *  stället för att lägga en till. */
export async function saveTemplate(
  admin: Admin, companyId: string, kind: TemplateKind, patch: TemplatePatch,
): Promise<boolean> {
  /* Texten måste alltid finnas i raden — kolumnen är not null, och en upsert som
     bara sätter kanalen skulle annars skapa en rad med tom text och tysta
     salongens formulering. */
  const nuvarande = await templateSettings(admin, companyId, kind)

  const { error } = await admin
    .from('message_templates')
    .upsert(
      {
        company_id: companyId,
        kind,
        body:       patch.body ?? nuvarande.body,
        channel:    patch.channel ?? nuvarande.channel,
        enabled:    patch.enabled ?? nuvarande.enabled,
        lead_value: patch.lead_value ?? nuvarande.leadValue,
        lead_unit:  patch.lead_unit ?? nuvarande.leadUnit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,kind' },
    )
  return !error
}

/** Ledtiden i millisekunder, som cron-jobbet räknar med. */
export function leadMs(s: TemplateSettings): number {
  return s.leadValue * (s.leadUnit === 'h' ? 3_600_000 : 86_400_000)
}

/** Texten med bokningens värden isatta. Samma motor som bekräftelsen använder,
 *  så en struken platshållare städas bort likadant i alla meddelanden. */
export function renderTemplate(body: string, values: PlaceholderValues): string {
  return fill(body, values)
}
