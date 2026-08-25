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

export async function sparaKontaktsätt(
  admin: Admin, companyId: string, k: Kontaktsätt,
): Promise<boolean> {
  const { error } = await admin
    .from('companies').update({ contact_channel: läsKontaktsätt(k) }).eq('id', companyId)
  return !error
}
