/*
 * Kalenderfilen.
 *
 * ICS är ett gammalt format med gamla regler, och de flesta av dem spelar roll
 * i praktiken: en rad som är för lång tappas av Outlook, ett kommatecken som
 * inte flyktats delar en rubrik i två, och en tid utan tidszon läses som UTC —
 * vilket i Sverige blir en eller två timmar fel beroende på årstid.
 *
 * Ren strängbyggnad, utan bibliotek. Formatet ändras inte, och den enda delen
 * som är knepig — radbrytningen — är fem rader kod.
 */

/** Tecken som betyder något i formatet och därför måste flyktas. */
function text(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Radbrytning enligt RFC 5545.
 *
 * En rad får vara 75 oktetter. Längre rader bryts och fortsättningen inleds med
 * ett mellanslag. Räkningen sker i oktetter och inte i tecken, för att å, ä och
 * ö är två oktetter var i UTF-8 — en gräns räknad i tecken bryter mitt i ett
 * tecken den dag en behandling heter "Slingor & färg på långt hår".
 */
function vik(rad: string): string {
  const bytes = Buffer.from(rad, 'utf8')
  if (bytes.length <= 75) return rad

  const delar: string[] = []
  let i = 0
  let gräns = 75
  while (i < bytes.length) {
    let slut = Math.min(i + gräns, bytes.length)
    /* Backa till en teckengräns: fortsättningsbytes i UTF-8 börjar med 10xxxxxx. */
    while (slut > i && slut < bytes.length && (bytes[slut] & 0xc0) === 0x80) slut--
    delar.push(bytes.subarray(i, slut).toString('utf8'))
    i = slut
    gräns = 74 // fortsättningsrader börjar med ett mellanslag
  }
  return delar.join('\r\n ')
}

/** Tidsstämpel i UTC, formatet ICS vill ha den. */
export function icsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Lokal tid utan zon, för användning tillsammans med TZID. */
function lokal(datum: string, tid: string): string {
  return `${datum.replace(/-/g, '')}T${tid.replace(/:/g, '').slice(0, 6).padEnd(6, '0')}`
}

/*
 * Europe/Stockholm, skriven ut.
 *
 * Google slår upp zonnamnet själv, men Outlook gör det inte alltid — en kalender
 * utan VTIMEZONE kan hamna en timme fel där, och en frisör som möter sin kund en
 * timme för sent bryr sig inte om vems fel det var. Reglerna är EU:s: sista
 * söndagen i mars och sista söndagen i oktober.
 */
const ZON = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Stockholm',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

export type IcsHändelse = {
  /** Stabil över tid. Ändras den blir varje uppdatering en ny post i kalendern
   *  i stället för en ändring av den gamla. */
  uid:         string
  datum:       string   // YYYY-MM-DD
  start:       string   // HH:MM
  slut:        string   // HH:MM
  rubrik:      string
  beskrivning?: string
  plats?:      string
  /** Ändringsnummer. Höjs när posten ändrats, annars kan klienten strunta i
   *  uppdateringen. */
  sekvens?:    number
  avbokad?:    boolean
}

/**
 * Hela kalendern som en sträng.
 *
 * `ttl` är en önskan och inte en regel — varje klient bestämmer själv hur ofta
 * den hämtar. iPhone går att ställa på fem minuter, Outlook hämtar ungefär var
 * tredje timme, Google när det passar Google. Det är priset för att slippa en
 * inloggning per leverantör, och värt att säga rakt ut i gränssnittet i stället
 * för att låta salongen upptäcka det själv.
 */
export function icsKalender({ namn, händelser, nu, ttlMinuter = 15 }: {
  namn:       string
  händelser:  IcsHändelse[]
  nu:         Date
  ttlMinuter?: number
}): string {
  const stämpel = icsUtc(nu)

  const rader: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kiterank//Bokningar//SV',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${text(namn)}`,
    'X-WR-TIMEZONE:Europe/Stockholm',
    `X-PUBLISHED-TTL:PT${ttlMinuter}M`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${ttlMinuter}M`,
    ...ZON,
  ]

  for (const h of händelser) {
    rader.push(
      'BEGIN:VEVENT',
      `UID:${h.uid}`,
      `DTSTAMP:${stämpel}`,
      `DTSTART;TZID=Europe/Stockholm:${lokal(h.datum, h.start)}`,
      `DTEND;TZID=Europe/Stockholm:${lokal(h.datum, h.slut)}`,
      `SUMMARY:${text(h.rubrik)}`,
      `SEQUENCE:${h.sekvens ?? 0}`,
      `STATUS:${h.avbokad ? 'CANCELLED' : 'CONFIRMED'}`,
      'TRANSP:OPAQUE',
    )
    if (h.beskrivning) rader.push(`DESCRIPTION:${text(h.beskrivning)}`)
    if (h.plats)       rader.push(`LOCATION:${text(h.plats)}`)
    rader.push('END:VEVENT')
  }

  rader.push('END:VCALENDAR')

  /* CRLF, inte LF. Ett par klienter läser en fil med enbart radmatning som en
     enda lång rad. */
  return rader.map(vik).join('\r\n') + '\r\n'
}
