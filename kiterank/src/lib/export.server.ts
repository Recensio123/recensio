import type { createAdminClient } from '@/lib/supabase/admin'
import { kundNyckel } from '@/lib/kundNyckel'
import { hämtaAnteckningar } from '@/lib/kundanteckning'

/*
 * Vad en salong får med sig när de lämnar.
 *
 * Två skilda saker med två skilda regler, och skillnaden är juridisk och inte
 * kommersiell:
 *
 *   Kundhistoriken är deras kunders personuppgifter. Salongen är
 *   personuppgiftsansvarig och vi biträde, vilket betyder att uppgifterna ska
 *   tillbaka när avtalet tar slut — oavsett paket, oavsett hur länge de varit
 *   kund. Det är inte en förmån att förtjäna.
 *
 *   Hemsidan är arbete vi utfört. Den får knytas till betalningstid, och gör
 *   det i punkt två nedan.
 *
 * Formatet är CSV, och avskiljaren följer kundens land.
 *
 * Excel väljer avskiljare efter datorns språkinställning, inte efter filen. I
 * större delen av Europa är kommat decimaltecken och Excel väntar sig
 * semikolon; i Storbritannien, Irland och Nordamerika är det tvärtom. Samma
 * fil öppnas alltså rätt i Stockholm och som en enda kolumn i London.
 *
 * En fil som ser trasig ut vid första dubbelklicket blir ett supportärende
 * oavsett hur korrekt den är, så valet görs efter landet på företagsraden.
 */

type Admin = ReturnType<typeof createAdminClient>

/*
 * Länder där Excel väntar sig komma. Alla andra får semikolon, vilket täcker
 * hela kontinentaleuropa och Norden.
 */
const KOMMALÄNDER = new Set(['uk', 'ireland', 'us', 'canada', 'australia'])

export function avskiljare(land: string | null | undefined): ';' | ',' {
  return KOMMALÄNDER.has((land ?? '').toLowerCase()) ? ',' : ';'
}

/** En cell, säkrad mot avskiljare, citattecken och radbrytningar i fritext. */
function cell(v: unknown, sep: string): string {
  const s = v == null ? '' : String(v)
  return s.includes(sep) || /["\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csv(rubriker: string[], rader: unknown[][], sep: ';' | ','): string {
  /* BOM först. Den handlar om teckenkodning och inte om avskiljare, och
     behövs i alla länder: utan den läser Excel å, ä, ö, ü och é som
     teckensallad oavsett språkinställning. */
  return '﻿' + [rubriker, ...rader].map(r => r.map(c => cell(c, sep)).join(sep)).join('\r\n') + '\r\n'
}

export type Kundfiler = { namn: string; innehall: string }[]

/**
 * Kundregistret och bokningshistoriken som två CSV-filer.
 *
 * Kunderna räknas fram ur bokningarna i stället för att läsas ur en egen
 * tabell: samma person kan ha bokat med olika stavning och olika nummerformat,
 * och kundnyckeln är det som redan håller ihop dem i panelen. Exporten ska ge
 * samma bild som salongen är van vid, inte en rådatadump som ser ut att
 * innehålla dubbletter.
 */
export async function kundhistorik(
  admin: Admin, companyId: string, land: string | null,
): Promise<Kundfiler> {
  const sep = avskiljare(land)

  const { data: bokningar } = await admin
    .from('bookings')
    .select('booking_date, start_time, end_time, service_name, customer_name, customer_phone, customer_email, status, staff_id, created_at')
    .eq('company_id', companyId)
    .order('booking_date', { ascending: true })
    .limit(20_000)

  /* Personalen med, inaktiva inkluderade: en bokning från i fjol utförd av
     någon som slutat ska ändå ha ett namn i historiken. */
  let namnFör = new Map<string, string>()
  try {
    const { data } = await admin.from('staff').select('id, name').eq('company_id', companyId)
    namnFör = new Map((data ?? []).map(p => [p.id as string, (p.name as string) ?? '']))
  } catch { /* salongen har ingen personaltabell */ }

  const rader = bokningar ?? []

  /* Anteckningarna hör till kunden, inte till bokningen. */
  const anteckningar = await hämtaAnteckningar(admin, companyId)

  type Kund = {
    namn: string; telefon: string; mejl: string
    besök: number; avbokade: number; först: string; senast: string
  }
  const kunder = new Map<string, Kund>()

  for (const b of rader) {
    const nyckel = kundNyckel({
      telefon: b.customer_phone as string | null,
      epost:   b.customer_email as string | null,
      namn:    b.customer_name as string | null,
    })
    if (!nyckel) continue
    const nu = kunder.get(nyckel) ?? {
      namn: (b.customer_name as string) ?? '', telefon: (b.customer_phone as string) ?? '',
      mejl: (b.customer_email as string) ?? '', besök: 0, avbokade: 0,
      först: b.booking_date as string, senast: b.booking_date as string,
    }
    if (b.status === 'cancelled' || b.status === 'no_show') nu.avbokade++
    else nu.besök++
    if ((b.booking_date as string) < nu.först)  nu.först  = b.booking_date as string
    if ((b.booking_date as string) > nu.senast) nu.senast = b.booking_date as string
    /* Senaste stavningen vinner — den är oftast den kunden själv rättade. */
    if (b.customer_name) nu.namn = b.customer_name as string
    kunder.set(nyckel, nu)
  }

  const kundfil = csv(
    ['Namn', 'Telefon', 'E-post', 'Antal besök', 'Avbokade eller uteblivna', 'Första besök', 'Senaste besök', 'Anteckning'],
    [...kunder.entries()].map(([nyckel, k]) => [
      k.namn, k.telefon, k.mejl, k.besök, k.avbokade, k.först, k.senast, anteckningar[nyckel] ?? '',
    ]),
    sep,
  )

  const bokningsfil = csv(
    ['Datum', 'Tid', 'Sluttid', 'Tjänst', 'Personal', 'Kund', 'Telefon', 'E-post', 'Status', 'Bokad den'],
    rader.map(b => [
      b.booking_date,
      String(b.start_time ?? '').slice(0, 5),
      String(b.end_time ?? '').slice(0, 5),
      b.service_name,
      namnFör.get(b.staff_id as string) ?? '',
      b.customer_name,
      b.customer_phone,
      b.customer_email,
      STATUS[b.status as string] ?? b.status,
      b.created_at ? String(b.created_at).slice(0, 10) : '',
    ]),
    sep,
  )

  return [
    { namn: 'kunder.csv',    innehall: kundfil },
    { namn: 'bokningar.csv', innehall: bokningsfil },
  ]
}

/* ── Hemsidan som filer ──────────────────────────────────────────────────── */

export type Sidfil = { namn: string; innehall: string }

/**
 * Skriver om en exporterad sida så att den lever utan oss.
 *
 * Tre saker måste hända, och alla tre av samma skäl: sidan ska fungera när den
 * ligger hos någon annan.
 *
 *   Boknings-knapparna pekar in i vårt bokningssystem och skulle leda till en
 *   död adress. De byts mot salongens telefonnummer, så att sidan fortsätter
 *   fungera som säljsida — vilket är hela poängen med att ta den med sig. Den
 *   som vill koppla ett nytt bokningssystem byter adressen i filen; läs-mig
 *   pekar ut exakt vad man söker efter.
 *
 *   Absoluta länkar tillbaka till oss blir relativa, annars leder navigationen
 *   hem till en sajt de sagt upp.
 *
 *   Vår egen skriptkod plockas bort. Den gör ingen nytta utanför appen och ser
 *   ut som fel i webbläsarens konsol.
 */
export function stadaSida(html: string, opts: {
  slug:    string
  telefon: string | null
}): string {
  const bokaMål = opts.telefon
    ? `tel:${opts.telefon.replace(/[^\d+]/g, '')}`
    : '#kontakt'

  return html
    /* Bokningslänkarna först, medan de fortfarande går att känna igen. */
    .replace(
      new RegExp(`(href=")(?:https?://[^"]*?)?/(?:boka|book)/${opts.slug}[^"]*(")`, 'gi'),
      `$1${bokaMål}$2`,
    )
    .replace(/(href=")(?:https?:\/\/[^"]*?)?\/(?:boka|book)\/[^"]*(")/gi, `$1${bokaMål}$2`)
    /* Egna absoluta länkar hem till plattformen blir relativa. */
    .replace(new RegExp(`(href|src)="https?://[^"]*?/s/${opts.slug}`, 'gi'), '$1="')
    /* Next.js egen laddningskod och dess data — meningslös utanför appen. */
    .replace(/<script[^>]*src="[^"]*\/_next\/[^"]*"[^>]*><\/script>/gi, '')
    .replace(/<script id="__NEXT_DATA__"[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*>self\.__next[\s\S]*?<\/script>/gi, '')
}

/** Läs-mig-filen som följer med paketet. */
export function läsMig(salong: string, telefon: string | null, sidor: string[]): string {
  return [
    `# ${salong} — din hemsida`,
    ``,
    `Det här är din hemsida som färdiga filer. Den fungerar utan Kiterank och`,
    `utan något abonnemang.`,
    ``,
    `## Titta på den`,
    ``,
    `Dubbelklicka på index.html. Sidan öppnas i webbläsaren precis som den såg ut.`,
    ``,
    `## Lägga upp den på nätet`,
    ``,
    `Ladda upp alla filer och mappen bilder/ till ditt webbhotell. Vilket som helst`,
    `fungerar — sidan behöver ingen databas och inget särskilt program.`,
    ``,
    `Ska din domän peka hit i stället för till Kiterank byter du DNS-inställningarna`,
    `hos den som håller domänen. Din nya leverantör gör det åt dig.`,
    ``,
    `## Boka tid-knappen`,
    ``,
    telefon
      ? `Bokningssystemet ingick i abonnemanget och följer inte med. Knapparna som`
        + `\nförut öppnade bokningen ringer nu i stället ${telefon}.`
      : `Bokningssystemet ingick i abonnemanget och följer inte med. Knapparna som`
        + `\nförut öppnade bokningen leder nu till kontaktavsnittet på sidan.`,
    ``,
    `Vill du koppla dem till ett annat bokningssystem: öppna filen i en textredigerare,`,
    `sök efter`,
    ``,
    `    ${telefon ? `href="tel:${telefon.replace(/[^\d+]/g, '')}"` : 'href="#kontakt"'}`,
    ``,
    `och byt ut adressen mot ditt nya bokningssystems länk. Den finns på varje sida`,
    `där en bokningsknapp syntes.`,
    ``,
    `## Vad som inte följer med`,
    ``,
    `Bokningssystemet, kalendern, omdömesbevakningen, statistiken och`,
    `marknadsföringsverktygen ingick i abonnemanget och finns inte i de här filerna.`,
    `Din kundhistorik får du separat som CSV-filer.`,
    ``,
    `## Sidor i paketet`,
    ``,
    ...sidor.map(s => `- ${s}`),
    ``,
  ].join('\n')
}

const STATUS: Record<string, string> = {
  confirmed: 'Bokad',
  completed: 'Genomförd',
  cancelled: 'Avbokad',
  no_show:   'Uteblev',
  pending:   'Väntar på godkännande',
}
