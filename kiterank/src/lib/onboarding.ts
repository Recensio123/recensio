import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * Igångsättningen — en sanning, på kontot.
 *
 * Tidigare avgjorde localStorage om en kund var uppsatt. Det gav olika svar på
 * datorn och telefonen, nollställdes när någon rensade webbläsardata, och mötte
 * varje ny medarbetare med en guide de inte skulle ha. Nu står svaret i
 * companies.onboarding och beslutet fattas på servern, innan något ritas.
 *
 * Två sorters kunskap, och bara den ena sparas:
 *
 *   Val och tidpunkter sparas. Vill de ha en hemsida? Vilken mall? När blev
 *   registreringen klar? Det går inte att räkna ut ur något.
 *
 *   Allt annat räknas ut. Om bilderna är utbytta syns i innehållet, om Google
 *   är kopplat syns i anslutningarna. En sparad klar-flagga blir osann i samma
 *   stund kunden ångrar sig, och då står det "klart" bredvid något som inte är
 *   gjort.
 */

export type Steg = 'kontakt' | 'vilja' | 'bransch' | 'om' | 'mall' | 'brief' | 'klar'

export type Vilja = {
  /** Vi bygger deras hemsida. */
  sajt:    boolean
  /** Bokningssystemet ska vara på. */
  bokning: boolean
}

export type Kontakt = { epost: string; telefon: string }

export type Onboarding = {
  steg:    Steg
  /** Satt när registreringen är avklarad. Är den null blockeras allt annat. */
  klartAt: string | null
  vill:    Vilja
  mall:    string | null
  /** De har redan en hemsida någon annanstans — påverkar vad vi kan mäta. */
  harSajt: boolean
  /* Uppgifterna de lämnade vid registreringen. De hamnar också på sajten när
     en sådan byggs, men originalet står här: en kund som valt bort hemsidan
     har ingen sajt att spara dem i, och e-posten är dit vi hör av oss. */
  kontakt: Kontakt
}

export const TOM: Onboarding = {
  steg: 'kontakt', klartAt: null,
  vill: { sajt: true, bokning: true },
  mall: null, harSajt: false,
  kontakt: { epost: '', telefon: '' },
}

/** Läser kolumnen som den är, oavsett vad som råkar ligga där.
 *
 *  Defensivt med flit: kolumnen är ny, gamla rader har `{}`, och en rad som
 *  skrivits av en tidigare version ska aldrig kunna kasta ut en betalande kund
 *  ur sitt konto. Saknas ett fält gäller förvalet. */
export function läsOnboarding(rå: unknown): Onboarding {
  if (!rå || typeof rå !== 'object') return TOM
  const o = rå as Record<string, unknown>
  const vill = (o.vill && typeof o.vill === 'object' ? o.vill : {}) as Record<string, unknown>
  const kon  = (o.kontakt && typeof o.kontakt === 'object' ? o.kontakt : {}) as Record<string, unknown>

  return {
    steg:    STEG.includes(o.steg as Steg) ? (o.steg as Steg) : TOM.steg,
    klartAt: typeof o.klartAt === 'string' ? o.klartAt : null,
    vill: {
      sajt:    typeof vill.sajt    === 'boolean' ? vill.sajt    : TOM.vill.sajt,
      bokning: typeof vill.bokning === 'boolean' ? vill.bokning : TOM.vill.bokning,
    },
    mall:    typeof o.mall    === 'string'  ? o.mall    : null,
    harSajt: typeof o.harSajt === 'boolean' ? o.harSajt : false,
    kontakt: {
      epost:   typeof kon.epost   === 'string' ? kon.epost   : '',
      telefon: typeof kon.telefon === 'string' ? kon.telefon : '',
    },
  }
}

const STEG: Steg[] = ['kontakt', 'vilja', 'bransch', 'mall', 'om', 'klar']

/**
 * Är registreringen avklarad?
 *
 * `harSiteConfig` finns för migreringens skull: ett företag som redan har en
 * sajt har uppenbarligen tagit sig igenom registreringen någon gång, och ska
 * inte mötas av den igen bara för att kolumnen är nyare än kontot. Att härleda
 * det är säkrare än att lita på att en engångsuppdatering nådde varje rad.
 */
export function ärKlar(o: Onboarding, harSiteConfig: boolean): boolean {
  return Boolean(o.klartAt) || harSiteConfig
}

/**
 * Nästa steg att visa, givet vad de svarat.
 *
 * Stegen hoppas över efter vad de valt, inte efter vad som råkar vara byggt:
 * den som inte vill ha en hemsida ska inte välja mall eller berätta om sin
 * verksamhet för att fylla en sajt som aldrig skapas.
 */
export function nästaSteg(o: Onboarding): Steg {
  const kedja: Steg[] = o.vill.sajt
    ? ['kontakt', 'vilja', 'bransch', 'mall', 'om', 'klar']
    : ['kontakt', 'vilja', 'bransch', 'klar']

  const i = kedja.indexOf(o.steg)
  /* Ett steg som fallit bort ur kedjan — de ångrade sajten efter att ha valt
     mall — landar på närmaste steg framåt i stället för att låsa flödet. */
  if (i === -1) return kedja[Math.min(kedja.length - 1, 1)]
  return kedja[Math.min(i + 1, kedja.length - 1)]
}

/** Stegen i ordning för den här kunden, till stegräknaren i guiden. */
/*
 * Två kedjor, och paketet avgör vilken.
 *
 * De fyra första stegen är samma för alla — vem ni är, adressen, branschen och
 * era egna ord om verksamheten. Det är underlaget som blir sidans texter
 * oavsett vem som bygger den.
 *
 * Sedan skiljer det sig, och skillnaden är hela affären:
 *
 *   Mallkunden väljer sin design själv. Där ligger också frågan om de hellre
 *   vill att vi formger åt dem — det är den enda minuten då de aktivt tänker
 *   på hur deras hemsida ska se ut.
 *
 *   Premiumkunden har redan betalat för att slippa välja. Att visa dem ett
 *   mallgalleri vore att be dem göra jobbet de köpt sig fria från, och att
 *   försöka sälja uppåt vore att sälja något de redan har. I stället frågar vi
 *   det vi behöver för att bygga: varumärke, färger, förebilder, önskemål.
 */
export type Paketväg = 'mall' | 'premium'

export function vägFörPlan(plan: string | null | undefined): Paketväg {
  return plan === 'design' || plan === 'fullservice' ? 'premium' : 'mall'
}

/*
 * Domänen frågas inte i registreringen.
 *
 * Sidan publiceras på en adress hos oss direkt, och en egen webbadress är
 * något man kopplar när sidan är färdig och man är nöjd med den — inte det
 * första någon vill fundera på. Frågan hörde hemma i plattformen, där både
 * inställningen och hjälpen finns.
 */
/*
 * Frågorna om verksamheten ställs inte heller här.
 *
 * De blir sidans texter, men de tar tid att svara på — och en registrering är
 * fel plats att be någon skriva sex stycken om sin salong. Målet här är att få
 * upp sidan så fort som möjligt, så att de ser något riktigt att utgå från.
 * Texterna fylls i panelen efteråt, där textfyllaren hjälper till och sidan
 * står bredvid.
 */
export function stegKedja(väg: Paketväg): Steg[] {
  const gemensamt: Steg[] = ['kontakt', 'bransch']
  return väg === 'premium' ? [...gemensamt, 'brief'] : [...gemensamt, 'mall']
}

export const STEG_NAMN: Record<Steg, string> = {
  /* Steg 1 skapar kontot och samlar uppgifterna i samma skärm. "Kontakt" sa
     inget om att det var där man blev kund. */
  kontakt: 'Konto',
  vilja:   'Webbadress',
  bransch: 'Bransch',
  om:      'Om er',
  mall:    'Design',
  brief:   'Er design',
  klar:    'Klart',
}

/*
 * Designunderlaget.
 *
 * Frågorna är valda efter vad som faktiskt saknas när man ska rita en sida åt
 * någon man inte träffat: hur varumärket ser ut i dag, vilken känsla de vill
 * ha, vad de tittat på och gillat, och om det finns bilder att arbeta med.
 *
 * Allt är frivilligt. En salongsägare som inte kan svara på färgkoder ska inte
 * blockeras från att komma igång — tomma fält är ett samtal, inte ett hinder.
 */
/** En sida de tittat på, med sina egna ord om varför. */
export type Forebild = {
  url:       string
  kommentar: string
}

export type DesignBrief = {
  /*
   * Färgerna som exakta koder, inte som ord.
   *
   * "Dammig rosa" är sex olika färger beroende på vem som läser det, och den
   * som redan har en logotyp och ett skyltfönster har en bestämd färg — inte
   * en beskrivning av en. Två räcker: en huvudfärg och en att bryta med.
   * Tomma strängar betyder att de inte valt, och då väljer vi.
   */
  farger:     [string, string]
  /** Känslan de vill att sidan ska ge. */
  kansla:     string[]
  /** Sidor de tittat på och gillat, med kommentar till varje. */
  forebilder: Forebild[]
  /** Allt annat de vill säga innan vi börjar rita. */
  ovrigt:     string
}

export const ANTAL_FOREBILDER = 3

export const TOM_BRIEF: DesignBrief = {
  farger: ['', ''],
  kansla: [],
  forebilder: Array.from({ length: ANTAL_FOREBILDER }, () => ({ url: '', kommentar: '' })),
  ovrigt: '',
}

/*
 * Känslorna man kan välja. Fler än tre val säger ingenting om riktningen.
 *
 * Listan täcker medvetet hela kundstocken. Bara "elegant, lyxig, lekfull" var
 * skriven för skönhetssalongen, och barberaren som läste den hittade ingenting
 * som beskrev hans lokal — vilket i praktiken betyder att vi ritar fel sida åt
 * varannan kund. Inget alternativ pekar ut ett kön; det gör "rå och
 * industriell" lika användbar för nagelsalongen som för barberaren.
 */
export const KANSLOR = [
  'Elegant och avskalad',
  'Varm och personlig',
  'Modern och skarp',
  'Lyxig och exklusiv',
  'Lekfull och färgstark',
  'Naturlig och lugn',
  'Rå och industriell',
  'Klassisk och tidlös',
  'Mörk och stilren',
  'Ljus och nordisk',
  'Sportig och rak',
  'Konstnärlig och egen',
] as const

/**
 * Kolumnen, hämtad så att en databas utan den inte släcker sidan.
 *
 * Migreringen körs för hand, och koden når produktionen före den. Utan
 * fallbacken hade varje inloggning kastat fel i glappet.
 */
export async function hämtaOnboarding(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<Onboarding> {
  try {
    const { data, error } = await admin
      .from('companies')
      .select('onboarding')
      .eq('id', companyId)
      .maybeSingle()
    if (error) return TOM
    return läsOnboarding(data?.onboarding)
  } catch {
    return TOM
  }
}

/** Skriver tillbaka hela objektet. Delvisa skrivningar mot jsonb är en väg att
 *  tappa fält som en annan flik just satt. */
export async function sparaOnboarding(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  o: Onboarding,
): Promise<void> {
  try {
    await admin.from('companies').update({ onboarding: o }).eq('id', companyId)
  } catch {
    /* Kolumnen saknas ännu — registreringen får gå vidare ändå. */
  }
}
