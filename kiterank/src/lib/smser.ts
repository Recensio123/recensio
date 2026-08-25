/*
 * Att skicka ett SMS.
 *
 * Samma form som mailer.ts, med flit: den som skickar ett meddelande ska inte
 * behöva veta vilken kanal det blev. Kastar aldrig, och utan nycklar skickas
 * ingenting tyst med angivet skäl.
 *
 * Två skillnader mot mail som styr allt annat här:
 *
 *   SMS kostar pengar per stycke. Ett mail som råkar gå ut två gånger är
 *   pinsamt; ett SMS är en kostnad, och 300 kunder gånger fel gånger 40 öre är
 *   en faktura salongen inte förstår. Därför räknas segmenten före sändning och
 *   ett meddelande som svämmar över avvisas i stället för att delas i fyra.
 *
 *   SMS kräver samtycke. Kunden kryssar i det när de bokar, och den kryssrutan
 *   är enda skälet vi får skicka — den kontrollen sitter hos anroparen, som är
 *   den som vet vilken kund det gäller.
 */

const API = 'https://api.46elks.com/a1/sms'

export type SmsResult = { sent: boolean; reason?: string; id?: string; segments?: number }

export function smsConfigured(): boolean {
  return Boolean(
    process.env.SMS_API_USERNAME?.trim() &&
    process.env.SMS_API_PASSWORD?.trim(),
  )
}

/**
 * Får panelen visa SMS som ett val?
 *
 * Skilt från `smsConfigured()` med flit. Den frågan är "går det att skicka", och
 * på den får svaret aldrig vara påhittat — ett ja skulle sluta i utskick som
 * loggas som lyckade och aldrig når någon. Den här frågan är "får salongen se
 * och ställa in kanalen", och den kan besvaras ja innan leverantören är kopplad.
 *
 * I utveckling är gränssnittet därför öppet, så hela flödet går att bygga och
 * granska innan avtalet är på plats. I drift krävs riktiga nycklar: en salong
 * ska aldrig kunna välja en kanal som tyst inte skickar något.
 */
export function smsUiUnlocked(): boolean {
  return smsConfigured() || process.env.NODE_ENV !== 'production'
}

/**
 * Ett avsändarnamn som operatörerna släpper igenom.
 *
 * Elva tecken, bokstäver och siffror. Gränsen är GSM-standardens och inte vår.
 * Diakriter skalas hellre än stryks — "Nordström" blir "Nordstrom" och inte
 * "Nordstrm" — eftersom namnet ska gå att känna igen även när det inte går att
 * stava rätt.
 */
export function rensaAvsandare(rå: string): string {
  return rå
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // å → a, ö → o
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 11)
}

/** Avsändaren kunden ser. Salongens eget val när de gjort ett, annars namnet
 *  skalat till samma form — ett namn i stället för ett okänt nummer, vilket
 *  avgör om meddelandet öppnas. */
export function smsSender(salonName: string, eget?: string | null): string {
  return rensaAvsandare(eget ?? '') || rensaAvsandare(salonName) || 'Salong'
}

/*
 * Hur många SMS texten blir — alltså vad den kostar.
 *
 * Ett SMS rymmer 140 byte. I GSM-7 blir det 160 tecken, men bara så länge
 * meddelandet får plats i ett enda. Delas det upp måste varje del bära ett
 * huvud som talar om hur bitarna sitter ihop, och då återstår 153 tecken per
 * del. Samma sak i UCS-2: 70 tecken i ett enskilt SMS, 67 per del i ett delat.
 *
 * Skillnaden mellan 160 och 153 låter försumbar men är den inte. En text på 320
 * tecken blir tre SMS, inte två, och en räknare som säger två får salongen att
 * planera en tredjedel för lågt.
 *
 * Några tecken kostar dessutom dubbelt i GSM-7 — de ligger i en utökningstabell
 * och skickas som två. Klammer och måsvingar hör dit, och de finns i mallarna
 * eftersom platshållarna använder dem. En platshållare som inte blivit ersatt
 * kostar alltså mer än den ser ut att göra.
 */

/** Tecknen som skickas som två i GSM-7. */
const DUBBLA = /[\^{}\\[\]~|\u20ac]/g

/** Allt utanför detta tvingar hela meddelandet till UCS-2. Radbrytning och
 *  vagnretur ryms i GSM-7 och ska inte utlösa bytet. */
const UTANFOR_GSM7 = /[^\u000a\u000d\u0020-\u00ff\u20ac]/

export function smsSegments(text: string): number {
  if (!text) return 0

  /* UCS-2: varje tecken kostar två byte, oavsett vilket. */
  if (UTANFOR_GSM7.test(text)) {
    return text.length <= 70 ? 1 : Math.ceil(text.length / 67)
  }

  const langd = text.length + (text.match(DUBBLA)?.length ?? 0)
  return langd <= 160 ? 1 : Math.ceil(langd / 153)
}

/*
 * Ett SMS per utskick, aldrig fler.
 *
 * Det är ett kostnadsbeslut och inte en teknisk gräns: två segment är dubbla
 * priset per kund, varje gång, och en salong med 300 kunder märker det på
 * fakturan långt innan de märker det i texten.
 *
 * Gränsen måste därför gälla det kunden får — inte det som står i rutan. En
 * mall är kortare än sitt resultat: `{datum}` är åtta tecken i panelen och
 * arton i mottagarens telefon, och därtill kommer länken och raden om att svar
 * inte går fram. Mäter man mallen underskattar man med femtio tecken.
 */
export const SMS_MAX = 160

/*
 * Vad varje platshållare kan svälla till.
 *
 * Generöst räknat, för poängen är att gränsen ska hålla i verkligheten och inte
 * i medeltal. "onsdag 21 september" är nitton tecken, ett dubbelnamn på en
 * behandling ("Slingor helhuvud + klippning") är tjugoåtta, och ett salongsnamn
 * kan vara vad som helst. Håller reserven inte för en enskild kund med ett
 * ovanligt långt namn blir det två SMS för just den — det loggas, och är
 * billigare än att kapa salongens ord mitt i en mening.
 */
const RESERV: Record<string, number> = {
  '{datum}':       20,
  '{tid}':          5,
  /* Tilltalsnamn, inte fullständigt namn — SMS-renderingen kortar det. */
  '{namn}':        14,
  /* Första behandlingen plus "m.fl." när besöket har flera. */
  '{behandling}':  26,
  '{medarbetare}': 18,
  '{salong}':      26,
  /* En Google-länk för omdömen: https://g.page/r/ plus id. */
  '{omdömeslänk}': 34,
}

/** Längden på det färdiga SMS:et, uppskattad. `extra` är det som läggs till vid
 *  sändning och inte syns i mallen: länken och svarsraden. */
export function smsEstimate(body: string, extra = ''): number {
  let ut = body
  for (const [nyckel, längd] of Object.entries(RESERV)) {
    ut = ut.replaceAll(nyckel, 'x'.repeat(längd))
  }
  const helt = extra ? `${ut} ${extra}` : ut
  /* Samma vägning som segmenträkningen: utökningstecken kostar dubbelt. */
  return helt.length + (helt.match(DUBBLA)?.length ?? 0)
}

/** Ryms mallen i ett enda SMS när allt lagts till? */
export function fitsOneSms(body: string, extra = ''): boolean {
  return smsEstimate(body, extra) <= SMS_MAX
}

/** Taket vid sändning. Ett segment är regeln; de tre extra finns för att ett
 *  ovanligt långt kundnamn inte ska tysta ett besked helt. */
const MAX_SEGMENTS = 4

export async function sendSms(x: { to: string; from: string; text: string }): Promise<SmsResult> {
  if (!smsConfigured())  return { sent: false, reason: 'not_configured' }

  const to = normaliseNumber(x.to)
  if (!to)               return { sent: false, reason: 'no_recipient' }
  if (!x.text.trim())    return { sent: false, reason: 'no_text' }

  const segments = smsSegments(x.text)
  if (segments > MAX_SEGMENTS) return { sent: false, reason: 'too_long', segments }

  /* Regeln är ett segment. Blir det fler har en reserv inte hållit — oftast ett
     ovanligt långt namn — och det ska synas, för det är en kostnad som annars
     bara dyker upp på fakturan. */
  if (segments > 1) {
    console.warn(`[sms] ${segments} segment (${x.text.length} tecken) till ${x.to}`)
  }

  try {
    const auth = Buffer.from(
      `${process.env.SMS_API_USERNAME!.trim()}:${process.env.SMS_API_PASSWORD!.trim()}`,
    ).toString('base64')

    const res = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization:  `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ from: x.from, to, message: x.text }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { sent: false, reason: body.slice(0, 120) || `http_${res.status}`, segments }
    }

    const body = await res.json().catch(() => null) as { id?: string } | null
    return { sent: true, id: body?.id, segments }
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : 'failed', segments }
  }
}

/*
 * Svenskt nummer i internationell form.
 *
 * Kunder skriver sina nummer som de känner dem: 070-123 45 67, 0701234567,
 * +46 70 123 45 67. Alla tre är samma person, och operatören tar bara det
 * sista formatet. Ett nummer vi inte kan tolka avvisas hellre än gissas på —
 * ett SMS till fel mottagare är värre än inget SMS.
 */
export function normaliseNumber(raw: string): string {
  const v = raw.replace(/[\s()-]/g, '')
  if (/^\+\d{8,15}$/.test(v))  return v
  if (/^00\d{8,15}$/.test(v))  return `+${v.slice(2)}`
  /* 0701234567 → +46701234567. Bara svenska nummer, eftersom det är den enda
     landskod vi kan anta utan att riskera fel land.

     Nio siffror efter nollan är minimum, vilket avsiktligt utesluter fasta
     nummer som 08-123 456. En fast telefon kan inte ta emot SMS, och att avvisa
     numret här är bättre än att betala för ett utskick som aldrig når fram. */
  if (/^0\d{8,12}$/.test(v))   return `+46${v.slice(1)}`
  return ''
}
