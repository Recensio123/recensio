import type { createAdminClient } from '@/lib/supabase/admin'
import type { TemplateChannel } from '@/lib/messageTemplates'

/*
 * Hur salongen håller kontakt med sina kunder.
 *
 * Ett val för hela salongen: mail eller SMS. Inte per meddelande, och inte båda.
 *
 * Skälet är att kanalen inte är en stilfråga utan en följd av vad salongen
 * frågar efter när kunden bokar. Väljer de SMS måste numret finnas, väljer de
 * mail måste adressen göra det. Med en kanal per meddelande hade formuläret
 * behövt kräva båda uppgifterna för säkerhets skull — vilket är fler fält att
 * fylla i, fler avhopp i formuläret, och en kund som lämnar en mejladress hon
 * aldrig läser bara för att komma vidare.
 *
 * Alla fyra meddelandena går alltså i samma format. Salongen skriver sina texter
 * en gång, för den kanal de faktiskt använder, och slipper hålla två versioner
 * aktuella.
 *
 * Kanalen kan bytas när som helst. Texterna ligger kvar per kanal i databasen,
 * så en salong som prövar SMS och går tillbaka till mail får sina gamla
 * mailtexter tillbaka i stället för standardtexterna.
 */

type Admin = ReturnType<typeof createAdminClient>

/** Salongens kanal. Ett värde, inte en lista. */
export type Kontaktsätt = TemplateChannel

/**
 * Vilken kanal varje meddelande går i.
 *
 * `kontakt` styr bekräftelsen och avbokningen och är det val som avgör vilken
 * uppgift bokningsformuläret kräver. De två tidsstyrda bär sitt eget val.
 *
 * Null betyder "samma som bekräftelsen" och är inte samma sak som ett tomt
 * val: en salong som byter kontaktsätt ska få med sig påminnelsen och
 * recensionsförfrågan utan att gå in och ändra dem också. Bara null kan
 * uttrycka det — hade vi skrivit ned kanalen vid varje sparning hade bytet
 * lämnat de två kvar på den gamla.
 */
export type Kanalval = {
  kontakt:  Kontaktsätt
  reminder: Kontaktsätt | null
  review:   Kontaktsätt | null
}

/** Ett val där allt följer kontaktsättet. Formen de flesta salonger har. */
export function bara(kontakt: Kontaktsätt): Kanalval {
  return { kontakt, reminder: null, review: null }
}

/** Läser ett kanalval ur en rad, med samma misstro som läsKontaktsätt. Null
 *  och skräp betyder båda "följer kontaktsättet". */
export function läsKanal(rå: unknown): Kontaktsätt | null {
  return rå === 'sms' ? 'sms' : rå === 'email' ? 'email' : null
}

/** Mail som utgångspunkt. Det kostar ingenting per utskick, kräver ingen
 *  leverantör, och varje kund har en adress. SMS väljs aktivt. */
export const STANDARD_KONTAKT: Kontaktsätt = 'email'

/** Läser värdet ur databasen och gör det till något som går att lita på.
 *  Tomt, trasigt eller saknat blir standarden — aldrig ingen kanal alls, för
 *  en salong utan kontaktväg kan ta emot bokningar men aldrig bekräfta dem. */
export function läsKontaktsätt(rå: unknown): Kontaktsätt {
  return rå === 'sms' ? 'sms' : 'email'
}

/**
 * Golvet när påminnelsen eller recensionsförfrågan går på egen kanal.
 *
 * De två väljer kanal själva, och det valet flyttar golvet. En salong som
 * mailar sina bekräftelser men skickar påminnelsen som SMS behöver numret —
 * annars är påminnelsen påslagen för alla och når ingen.
 */
export function golvFor(kontakt: Kontaktsätt, kanaler: Kontaktsätt[]): Krav {
  const alla = [kontakt, ...kanaler]
  return { epost: alla.includes('email'), telefon: alla.includes('sms') }
}

/** Vad kunden måste fylla i utöver namnet. */
export type Krav = { epost: boolean; telefon: boolean }

/* ── Läsa och skriva ────────────────────────────────────────────────────── */

export async function hämtaKontaktsätt(admin: Admin, companyId: string): Promise<Kontaktsätt> {
  const res = await admin
    .from('companies').select('contact_channel').eq('id', companyId).maybeSingle()
  if (res.error) return STANDARD_KONTAKT
  return läsKontaktsätt(res.data?.contact_channel)
}

/**
 * Hela kanalvalet i en fråga.
 *
 * Kolumnerna för de två tidsstyrda är en sen migration. Saknas de faller
 * frågan tillbaka på kontaktsättet ensamt — annars hade en okörd migration
 * stoppat varje utskick i stället för att bara sakna ett val som ingen ännu
 * gjort.
 */
export async function hämtaKanalval(admin: Admin, companyId: string): Promise<Kanalval> {
  const nytt = await admin
    .from('companies')
    .select('contact_channel, reminder_channel, review_channel')
    .eq('id', companyId).maybeSingle()

  if (!nytt.error) {
    return {
      kontakt:  läsKontaktsätt(nytt.data?.contact_channel),
      reminder: läsKanal(nytt.data?.reminder_channel),
      review:   läsKanal(nytt.data?.review_channel),
    }
  }

  return bara(await hämtaKontaktsätt(admin, companyId))
}

/** Sparar kanalen för ett av de tidsstyrda. Null lägger tillbaka det under
 *  kontaktsättet. */
export async function sparaKanal(
  admin: Admin, companyId: string, kind: 'reminder' | 'review', k: Kontaktsätt | null,
): Promise<boolean> {
  const kolumn = kind === 'reminder' ? 'reminder_channel' : 'review_channel'
  const { error } = await admin
    .from('companies').update({ [kolumn]: läsKanal(k) }).eq('id', companyId)
  return !error
}

export async function sparaKontaktsätt(
  admin: Admin, companyId: string, k: Kontaktsätt,
): Promise<boolean> {
  const { error } = await admin
    .from('companies').update({ contact_channel: läsKontaktsätt(k) }).eq('id', companyId)
  return !error
}
