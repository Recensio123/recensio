import { slotsForDay, type Availability, type StaffRow, type BookingRow, type BlockedRow } from '@/lib/bookingSlots'
import { köFor, type Rå, type KöInst } from '@/lib/kommande'
import { kundNyckel } from '@/lib/kundNyckel'
import { läsAntal } from '@/lib/textfyllare'
import { tradePack } from '@/lib/trades'
import { sidansBrister } from '@/lib/sidansBrister'
import { läsPris, läsMinuter, tolkaPrislista, upptagenTid, somPrislista, type Tjanst } from '@/lib/tjanster'
import { månadsrader, gruppera, summering, halvor, slåIhop, type Rå as StatRå } from '@/lib/bokningsstatistik'
import { MOCK_BOOKINGS } from '@/app/(kiterank)/dashboard/bokningar/data'
import { väljSCSajt } from '@/lib/google'
import { hinkar, summa, spann, type Dag } from '@/lib/sokhistorik'
import { kundstatus, värstaLäget, type Underlag } from '@/lib/kundstatus'
import { kontoLäge, tolkaNyckel, tillgång, riktning } from '@/lib/betalning'
import { skaPåminnas, type Provrad } from '@/lib/provpaminnelse'
import {
  fårTaMedHemsidan, designAvbetald, avdragGäller, förlorarSidan, KRAV_MÅNADER,
} from '@/lib/exportRatt'
import { stadaSida, avskiljare } from '@/lib/export.server'
import { smsSender } from '@/lib/smser'
import { mailSender } from '@/lib/mailer'
import { kanalFor } from '@/lib/messageTemplates'
import { golvFor } from '@/lib/kontaktsatt'

/*
 * Kontroller på det som kostar pengar när det går sönder.
 *
 * Urvalet är inte "täck koden" utan "täck det som är dyrt när det går sönder".
 * En trasig vy syns direkt och kostar ingenting; en dubbelbokad tid kostar en
 * behandling, och ett utskick som går två gånger kostar per SMS och lite av
 * salongens trovärdighet hos deras kund.
 *
 * Rena funktioner, utan ramverk och utan databas. Skälet är dels att reglerna
 * ligger i rena funktioner redan — bokningsrutnätet och utskickskön tar emot
 * allt de behöver som argument — dels att de här ska gå att köra i webbläsaren
 * på en sida i panelen, inte i en terminal.
 *
 * Flera av dem finns för fel som redan inträffat. Antalet lästes med ett
 * reguljärt uttryck som tappat sitt snedstreck och letade efter bokstaven d;
 * ingenting kraschade, knappen slutade bara gå att trycka på. Och priserna låg
 * i två listor som gled isär, så att hemsidan sa 750 medan bokningen tog 650.
 */

export type Utfall = {
  namn:   string
  ok:     boolean
  /** Vad som gick fel, för den som ska laga det. Tom när provet gick igenom. */
  varför: string
}

type Test = {
  namn: string
  /** Null när det gick bra, annars vad som blev fel. */
  kör:  () => string | null
}

/* ── Underlag ─────────────────────────────────────────────────────────── */

const SALONG: Availability = {
  open_time: '09:00', close_time: '17:00', slot_duration_minutes: 60, is_active: true,
}

const stol = (id: string): StaffRow => ({ id, name: id, schedule: null })

function tider(opts: {
  staff?:    StaffRow[]
  staffId?:  string | null
  bookings?: BookingRow[]
  blocked?:  BlockedRow[]
}) {
  return slotsForDay({
    salon: SALONG, dow: 1, duration: 60,
    staff:    opts.staff    ?? [],
    staffId:  opts.staffId  ?? null,
    bookings: opts.bookings ?? [],
    blocked:  opts.blocked  ?? [],
  })
}

const ledig = (lista: { time: string; available: boolean }[], klockan: string) =>
  lista.find(s => s.time === klockan)?.available

/* Kön: allt påslaget, ledtiderna satta så att proven blir läsbara. */
const KÖ: KöInst = {
  confirmation: { enabled: true, channel: 'sms' },
  reminder:     { enabled: true, ms: 24 * 3_600_000, channel: 'sms' },
  review:       { enabled: true, ms: 2 * 3_600_000,  channel: 'sms' },
}

const bokning = (extra: Partial<Rå> = {}): Rå => ({
  id: 'b1', kund: 'Anna', behandling: 'Klippning',
  datum: '2026-08-20', tid: '10:00', status: 'confirmed',
  ...extra,
})

/* Klockan i proven: dagen efter besöket, alltså långt efter att allt förfallit. */
const EFTER = new Date('2026-08-21T10:00:00').getTime()
const INNAN = new Date('2026-08-19T10:00:00').getTime()

/* ── Proven ───────────────────────────────────────────────────────────── */

const TESTER: Test[] = [
  {
    namn: 'En upptagen tid visas inte som ledig',
    kör: () => {
      const s = tider({ bookings: [{ staff_id: null, start_time: '10:00', end_time: '11:00' }] })
      return ledig(s, '10:00') === false ? null : '10:00 räknades som ledig trots en bokning på samma tid'
    },
  },
  {
    namn: 'Tider som gränsar till varandra krockar inte',
    kör: () => {
      const s = tider({ bookings: [{ staff_id: null, start_time: '10:00', end_time: '11:00' }] })
      return ledig(s, '11:00') === true ? null : '11:00 spärrades av en bokning som slutar 11:00'
    },
  },
  {
    namn: 'En spärrad tid blockerar',
    kör: () => {
      const s = tider({ blocked: [{ staff_id: null, start_time: '12:00', end_time: '13:00' }] })
      return ledig(s, '12:00') === false ? null : '12:00 var bokningsbar trots en spärr'
    },
  },
  {
    namn: 'Med två stolar räcker det att en är ledig',
    kör: () => {
      const s = tider({
        staff:    [stol('a'), stol('b')],
        bookings: [{ staff_id: 'a', start_time: '10:00', end_time: '11:00' }],
      })
      return ledig(s, '10:00') === true ? null : '10:00 spärrades trots att stol b var ledig'
    },
  },
  {
    namn: 'En stol som är upptagen kan inte bokas',
    kör: () => {
      const s = tider({
        staff:    [stol('a'), stol('b')],
        staffId:  'a',
        bookings: [{ staff_id: 'a', start_time: '10:00', end_time: '11:00' }],
      })
      return ledig(s, '10:00') === false ? null : '10:00 gick att boka hos stol a som redan var upptagen'
    },
  },
  {
    namn: 'En avbokad tid har ingen kö',
    kör: () => {
      const k = köFor(bokning({ status: 'cancelled' }), KÖ, INNAN)
      return k === null ? null : 'en avbokad bokning låg kvar i kommandelistan'
    },
  },
  {
    namn: 'Ett skickat utskick köas inte igen',
    kör: () => {
      const k = köFor(bokning({ påmind: true, omdömt: true }), KÖ, EFTER)
      return k === null ? null : 'bokningen låg kvar trots att alla utskick redan gått'
    },
  },
  {
    namn: 'Ett stoppat utskick håller inte kvar bokningen',
    kör: () => {
      const k = köFor(bokning({ påmind: true, överOmdöme: true }), KÖ, EFTER)
      return k === null ? null : 'bokningen låg kvar trots att omdömesfrågan var avstängd'
    },
  },
  {
    namn: 'En omdömesfråga som väntar håller kvar bokningen',
    kör: () => {
      const k = köFor(bokning({ påmind: true }), KÖ, EFTER)
      if (!k) return 'bokningen försvann trots att omdömesfrågan inte gått ut'
      return k.planerat.some(p => p.kind === 'review' && !p.skickat && !p.över)
        ? null : 'omdömesfrågan saknades i kön'
    },
  },
  {
    namn: 'Samma person med olika nummerformat är en kund',
    kör: () => {
      const a = kundNyckel({ telefon: '+46 70 123 45 67', namn: 'Anna' })
      const b = kundNyckel({ telefon: '070-123 45 67',    namn: 'Anna A' })
      return a === b ? null : `\`${a}\` och \`${b}\` blev två kunder — gallringen skulle tömma halva historiken`
    },
  },
  {
    namn: 'Antalet läses ur ett fritextsvar',
    kör: () => {
      const a = läsAntal('4')
      const b = läsAntal('vi är 4 stycken')
      if (a !== 4) return `"4" lästes som ${a}`
      if (b !== 4) return `"vi är 4 stycken" lästes som ${b}`
      return läsAntal('') === 0 ? null : 'ett tomt svar gav ett antal'
    },
  },
  {
    namn: 'Utan prislista och utan bokning varnar panelen',
    kör: () => {
      const brister = sidansBrister({
        menuCategories: [],          // salongen har inte lagt upp några tjänster
        bransch: 'salon', bookingUrl: '', harBokning: false,
      })
      return brister.some(b => b.id === 'ingen-vag-vidare')
        ? null
        : 'ingen varning trots att boka-knappen inte hade något mål — kunden hade publicerat en död knapp'
    },
  },
  {
    namn: 'Textpriser tolkas rätt när de flyttas till tal',
    kör: () => {
      /* Priserna låg som text i den gamla prislistan. Tusenavskiljaren kan vara
         vanligt blanksteg, hårt blanksteg eller smalt hårt beroende på om det
         skrevs i panelen, klistrades in ur ett mejl eller genererades av oss.
         Läses den inte bort blir "2 200 kr" till 2, och flytten sätter priset
         till två kronor — tyst, en gång, för alla rader samtidigt. */
      const fall: [string, number | null, boolean][] = [
        ['1 350 kr',          1350, false],
        ['2 200 kr',     2200, false],   // hårt blanksteg
        ['2 200 kr',     2200, false],   // smalt hårt blanksteg
        ['från 850 kr',        850, true ],
        ['Från 2 500 kr',     2500, true ],
        ['650:-',              650, false],
        ['0 kr',                 0, false],
        ['Pris på förfrågan', null, false],
        ['',                  null, false],
      ]
      for (const [text, kr, från] of fall) {
        const p = läsPris(text)
        if (p.kr !== kr)     return `"${text}" lästes som ${p.kr}, inte ${kr}`
        if (p.från !== från) return `"${text}" fick från=${p.från}`
      }
      if (läsMinuter('1 h 30 min') !== 90) return '"1 h 30 min" blev inte 90'
      return läsMinuter('') === null ? null : 'en tom tid gav ett antal minuter'
    },
  },
  {
    namn: 'Städtiden spärrar stolen men står inte i priset',
    kör: () => {
      /* En färgning på 90 minuter med salongens kvart efter sig håller stolen i
         105. Kunden har bokat 90 och ska se 90 — men bokas nästa kund in på
         minut 91 städar salongen medan kunden väntar, och de ligger efter resten
         av dagen.

         Regeln är salongens och inte tjänstens: samma städtid läggs efter varje
         bokning, oavsett behandling. */
      if (upptagenTid(90, 15) !== 105) return `stolen räknades som upptagen i ${upptagenTid(90, 15)} minuter`
      if (upptagenTid(45, 0)  !== 45)  return 'en salong utan städtid fick ändå påslag'
      return upptagenTid(45, 15) === 60
        ? null : 'städtiden läggäs inte på en kort behandling'
    },
  },
  {
    namn: 'Tjänsterna blir samma prislista hemsidan redan kan rita',
    kör: () => {
      /* Mallarna tar ServiceCategory[]. Tabellen är källan; formen måste hålla,
         annars ritar en publicerad sajt ingenting alls. */
      const rad = (n: number, kat: string, namn: string): Tjanst => ({
        id: `t${n}`, kategori: kat, namn, beskrivning: '',
        pris_kr: 650, pris_fran: false, visa_pris: true,
        minuter: 45, visa_tid: true,
        bokningsbar: true, max_per_dag: null, avbokning_timmar: null, forberedelse: '',
        aktiv: true, sort_order: n,
      })
      const lista = somPrislista([
        rad(0, 'Klippning', 'Dam'),
        rad(1, 'Färg', 'Balayage'),
        rad(2, 'Klippning', 'Herr'),
        { ...rad(3, 'Färg', 'Dold behandling'), aktiv: false },
      ])

      if (lista.length !== 2)               return `${lista.length} kategorier i stället för 2`
      if (lista[0].category !== 'Klippning') return 'kategorierna kom i fel ordning'
      if (lista[0].items.length !== 2)       return 'raderna hamnade i fel kategori'
      if (lista[1].items.length !== 1)       return 'en dold tjänst publicerades'
      return lista[0].items[0].price === '650 kr'
        ? null : `priset skrevs som "${lista[0].items[0].price}"`
    },
  },
  {
    namn: 'En tolkad prislista behåller sina från-priser',
    kör: () => {
      const tolkad = tolkaPrislista([{
        category: 'Färg',
        items: [
          { name: 'Balayage', desc: '', duration: '150 min', price: 'från 2 200 kr' },
          { name: 'Toning',   desc: '', duration: '',        price: '450 kr' },
        ],
      }])
      if (tolkad.length !== 2) return `${tolkad.length} rader tolkades`
      const b = tolkad[0], t = tolkad[1]
      if (b.pris_kr !== 2200 || !b.pris_fran) return 'balayagens golvpris tappades'
      if (b.minuter !== 150)                  return `tiden blev ${b.minuter}`
      /* Utan tid får raden sextio minuter — synligt i torrkörningen, för noll
         hade gjort den bokningsbar på ett sätt som spräcker dagen. */
      return t.minuter === 60 ? null : `en rad utan tid fick ${t.minuter} minuter`
    },
  },
  {
    namn: 'En egen bokningslänk räcker för att knappen ska ha ett mål',
    kör: () => {
      const brister = sidansBrister({
        menuCategories: tradePack('salon').categories,
        bransch: 'salon', bookingUrl: 'https://bokadirekt.se/x', harBokning: false,
      })
      return brister.length === 0
        ? null
        : 'varnade trots att salongen klistrat in en egen bokningslänk'
    },
  },
  {
    namn: 'En avbokad tid räknas som återbud och inte som bokning',
    kör: () => {
      const rader: StatRå[] = [
        { datum: '2026-03-04', status: 'completed', pris: 650, minuter: 45 },
        { datum: '2026-03-11', status: 'cancelled', pris: 650, minuter: 45 },
      ]
      const m = månadsrader(rader, '2026-03-01', '2026-03-31')[0]
      if (m.antal !== 1)    return `${m.antal} bokningar — den avbokade räknades med och gjorde månaden bättre än den var`
      if (m.värde !== 650)  return `${m.värde} kr — en avbokad tid lades till omsättningen`
      return m.avbokade === 1 ? null : 'återbudet försvann helt i stället för att räknas som återbud'
    },
  },
  {
    namn: 'En månad utan bokningar blir ett hål och inte ett hopp',
    kör: () => {
      const rader: StatRå[] = [
        { datum: '2026-01-15', status: 'completed', pris: 500, minuter: 60 },
        { datum: '2026-03-15', status: 'completed', pris: 500, minuter: 60 },
      ]
      const m = månadsrader(rader, '2026-01-01', '2026-03-31')
      if (m.length !== 3) return `${m.length} månader i stället för 3 — februari saknades, och diagrammet hade dragit ihop tiden`
      return m[1].månad === '2026-02' && m[1].antal === 0
        ? null : 'den tomma månaden hamnade fel i ordningen'
    },
  },
  {
    namn: 'Kvartalet är summan av sina månader',
    kör: () => {
      const rader = ['2026-01', '2026-02', '2026-03'].map(m => ({
        månad: m, antal: 10, värde: 1000, minuter: 600,
        genomförda: 9, uteblivna: 1, avbokade: 2,
      }))
      const k = gruppera(rader, 'kvartal', () => 1200)
      if (k.length !== 1)     return `${k.length} staplar — tre månader i samma kvartal delades upp`
      if (k[0].antal !== 30)  return `${k[0].antal} bokningar i stället för 30`
      /* Kapaciteten frågas per månad, så kvartalet ska ha tre månaders. 1800
         av 3600 minuter är femtio procent. */
      return k[0].beläggning === 50
        ? null
        : `${k[0].beläggning}% beläggning — kapaciteten räknades på kvartalet i stället för per månad`
    },
  },
  {
    namn: 'Uteblivna mäts mot avgjorda tider och inte mot allt bokat',
    kör: () => {
      /* Nio genomförda, en utebliven, och nittio tider som ännu inte varit.
         Mot allt bokat blir det 1%, mot det avgjorda 10% — och det är den
         senare siffran salongen kan göra något åt. */
      const s = summering(gruppera([{
        månad: '2026-05', antal: 100, värde: 0, minuter: 0,
        genomförda: 9, uteblivna: 1, avbokade: 0,
      }], 'manad', () => 0))
      return s.uteblivnaAndel === 10
        ? null
        : `${s.uteblivnaAndel}% — kommande bokningar räknades in i nämnaren och gjorde siffran finare`
    },
  },
  {
    namn: 'Den pågående månaden drar inte ner jämförelsen',
    kör: () => {
      /* Tolv hela månader med tjugo bokningar var, och en trettonde som bara
         hunnit halvvägs. Utan undantaget för den pågående perioden hade
         jämförelsen sagt att det går utför — varje gång någon tittar före den
         sista i månaden. */
      const rader = ['2025-08','2025-09','2025-10','2025-11','2025-12','2026-01',
                     '2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08']
        .map((m, i) => ({
          månad: m, antal: i === 12 ? 9 : 20, värde: 0, minuter: 0,
          genomförda: 0, uteblivna: 0, avbokade: 0,
        }))

      const staplar = gruppera(rader, 'manad', () => 0, 'sv', '2026-08')
      const h = halvor(staplar)
      if (!h) return 'ingen jämförelse alls trots tolv färdiga månader'
      if (h.nu.some(s => s.pågår)) return 'den halvfärdiga månaden räknades med i jämförelsen'
      if (h.nu.length !== 6 || h.förra.length !== 6) {
        return `${h.nu.length} mot ${h.förra.length} månader — halvorna blev olika långa`
      }
      const nu = summering(h.nu).antal, förra = summering(h.förra).antal
      return nu === förra ? null : `${nu} mot ${förra} — tolv lika månader gav ändå en förändring`
    },
  },
  {
    namn: 'En ny bokning syns i statistiken utan omladdning',
    kör: () => {
      /* Servern summerade när sidan laddades. Sedan bokade salongen in någon.
         Månaden panelen har hel ska räknas om ur dess egen lista; månaden före,
         som panelen bara har slutet av, ska behålla serverns siffra. */
      const server = [
        { månad: '2026-07', antal: 40, värde: 40_000, minuter: 2400, genomförda: 40, uteblivna: 0, avbokade: 3 },
        { månad: '2026-08', antal: 12, värde: 12_000, minuter:  720, genomförda: 12, uteblivna: 0, avbokade: 1 },
      ]
      /* Panelen har augusti helt, och i den ligger nu tretton bokningar. */
      const klient: StatRå[] = Array.from({ length: 13 }, (_, i) => ({
        datum: `2026-08-${String(i + 1).padStart(2, '0')}`, status: 'confirmed', pris: 1000, minuter: 60,
      }))

      const ut = slåIhop(server, klient, '2026-08-01')
      if (ut[0].antal !== 40) return 'juli räknades om trots att panelen bara har halva månaden — siffran hade halverats'
      return ut[1].antal === 13
        ? null
        : `augusti stod kvar på ${ut[1].antal} — den nya bokningen syntes inte förrän vid omladdning`
    },
  },
  {
    namn: 'Exempelsalongens diagram är dess egen kalender',
    kör: () => {
      /* Statistiken får inte vara en egen sifferserie bredvid bokningarna.
         Provet räknar exempelbokningarna för en månad mitt i historiken och
         kontrollerar att det blev något — annars visar exempelläget ett år som
         ingen av dess kalenderrader kan förklara. */
      const d = new Date()
      d.setMonth(d.getMonth() - 6)
      const månad = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      const rader = MOCK_BOOKINGS
        .filter(b => b.date.slice(0, 7) === månad)
        .map(b => ({ datum: b.date, status: b.status, pris: b.price, minuter: b.duration }))

      if (rader.length < 20) {
        return `bara ${rader.length} exempelbokningar i ${månad} — statistiken skulle visa en tom månad ett halvår bak`
      }
      const m = månadsrader(rader, `${månad}-01`, `${månad}-28`)[0]
      if (!m.antal)  return 'månaden summerade till noll bokningar'
      if (!m.värde)  return 'månaden summerade till noll kronor'
      return m.avbokade > 0 ? null : 'inga återbud alls — andelarna under diagrammet blir noll i exempelläget'
    },
  },
  {
    namn: 'Ett kvartal som saknar en månad räknas inte som helt',
    kör: () => {
      /* Minnet börjar i augusti, alltså mitt i tredje kvartalet. Q3 2025 har
         två månader i sig och skulle utan kontrollen se ut som ett ras — och,
         värre, göra den senare halvan av jämförelsen bättre än den var. */
      const rader = ['2025-08','2025-09','2025-10','2025-11','2025-12',
                     '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08']
        .map(m => ({ månad: m, antal: 20, värde: 0, minuter: 0, genomförda: 0, uteblivna: 0, avbokade: 0 }))

      const k = gruppera(rader, 'kvartal', () => 0, 'sv', '2026-08')
      const q3 = k.find(s => s.nyckel === '2025-K3')
      if (!q3)     return 'det första kvartalet saknades helt'
      if (q3.hel)  return 'ett kvartal med två månader räknades som helt'
      if (!k.find(s => s.nyckel === '2025-K4')?.hel) return 'ett helt kvartal räknades som stympat'

      const h = halvor(k)
      if (!h) return 'ingen jämförelse trots tre hela kvartal'
      return h.nu.every(s => s.hel) && h.förra.every(s => s.hel)
        ? null : 'ett stympat kvartal kom med i jämförelsen'
    },
  },
  {
    namn: 'Search Console väljer salongens egen sajt, inte första bästa',
    kör: () => {
      /* Byråns property ligger först i listan. Tas den mäter vi någon annans
         sajt, och ingenting ser fel ut — samma fälla som annonskontot hade. */
      const sites = ['https://byran.se/', 'sc-domain:salongen.se', 'https://gammal.se/']
      const vald  = väljSCSajt(sites, ['salongen.se'], null)
      if (vald !== 'sc-domain:salongen.se') return `valde ${vald} i stället för salongens egen`

      /* Ingen träff och flera att välja mellan: hellre ingen mätning än fel. */
      if (väljSCSajt(sites, ['annan.se'], null) !== null) {
        return 'gissade bland flera properties trots att ingen matchade salongens adress'
      }
      /* Finns bara en är gissningen ofarlig. */
      if (väljSCSajt(['https://enda.se/'], [], null) !== 'https://enda.se/') {
        return 'vägrade den enda property som fanns'
      }
      /* Ett sparat val som fortfarande finns kvar ska stå fast. */
      return väljSCSajt(sites, ['salongen.se'], 'https://gammal.se/') === 'https://gammal.se/'
        ? null : 'kastade om ett sparat val som fortfarande var giltigt'
    },
  },
  {
    namn: 'En månad utan mätning ritas inte som en månad utan trafik',
    kör: () => {
      /* Mätningen började den 10 juli. Juni finns inte, och ska inte ritas —
         en nollstapel där påstår att ingen sökte, vilket vi inte vet. */
      const dagar: Dag[] = []
      for (let d = 10; d <= 31; d++) {
        dagar.push({ date: `2026-07-${String(d).padStart(2, '0')}`, clicks: 2, impressions: 60, position: 8 })
      }
      for (let d = 1; d <= 20; d++) {
        dagar.push({ date: `2026-08-${String(d).padStart(2, '0')}`, clicks: 3, impressions: 80, position: 7 })
      }

      const h = hinkar(dagar, 'Monthly', '2026-08-20')
      if (h.some(x => x.etikett === 'jun')) return 'juni ritades som en tom månad trots att vi inte mätt då'

      const juli = h.find(x => x.etikett === 'jul')
      const aug  = h.find(x => x.etikett === 'aug')
      if (!juli || !aug)  return 'juli eller augusti saknades'
      if (juli.hel)       return 'juli räknades som hel trots att mätningen började den tionde'
      if (aug.hel)        return 'augusti räknades som hel trots att månaden inte är slut'
      return juli.clicks === 44 && aug.clicks === 60
        ? null : `${juli.clicks} och ${aug.clicks} klick — dygnen summerades fel`
    },
  },
  {
    namn: 'Månadstalet räknar månaden, och jämför mot lika många dagar',
    kör: () => {
      /* "Klick denna månad" måste vara samma tal som sista stapeln visar,
         annars säger nyckeltalet och diagrammet emot varandra på samma skärm.
         Och halva augusti får inte ställas mot hela juli — det vore inte en
         jämförelse utan en dom över att månaden inte tagit slut. */
      const s = spann('Monthly', '2026-08-14')
      if (s.från !== '2026-08-01')      return `perioden började ${s.från} i stället för den första`
      if (s.till !== '2026-08-14')      return `perioden slutade ${s.till}`
      if (s.förraFrån !== '2026-07-01') return `jämförelsen började ${s.förraFrån}`
      if (s.förraTill !== '2026-07-14') return `jämförelsen gick till ${s.förraTill} — inte lika många dagar in`

      /* Den 31:e mot en månad som bara har 30 dagar kapas av månadsslutet. */
      const kort = spann('Monthly', '2026-03-31')
      if (kort.förraTill !== '2026-02-28') return `31 mars jämfördes mot ${kort.förraTill}, ett datum februari inte har`

      /* Veckan är rullande sju dygn, samma som veckostaplarna. */
      const v = spann('Weekly', '2026-08-14')
      return v.från === '2026-08-08' && v.förraFrån === '2026-08-01' && v.förraTill === '2026-08-07'
        ? null : `veckan blev ${v.från}–${v.till} mot ${v.förraFrån}–${v.förraTill}`
    },
  },
  {
    namn: 'Nyckeltalet och sista stapeln visar samma tal',
    kör: () => {
      /* Det som faktiskt gick fel: nyckeltalet räknade ett rullande
         trettiodagarsfönster medan stapeln räknade kalendermånaden. 225 stod
         över ett diagram vars sista stapel sa 189. */
      const dagar: Dag[] = []
      for (let m = 6; m <= 8; m++) {
        for (let d = 1; d <= 28; d++) {
          dagar.push({
            date: `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            clicks: m, impressions: m * 20, position: 9,
          })
        }
      }
      const idag = '2026-08-20'
      const s    = spann('Monthly', idag)
      const kpi  = summa(dagar, s.från, s.till).clicks
      const sista = hinkar(dagar, 'Monthly', idag).at(-1)
      return kpi === sista?.clicks
        ? null
        : `nyckeltalet sa ${kpi}, sista stapeln ${sista?.clicks} — samma skärm, två svar`
    },
  },
  {
    namn: 'Snittpositionen viktas med visningar och inte med dygn',
    kör: () => {
      /* En dag med tre visningar på plats 2 och en med tusen på plats 40 är
         inte plats 21 i snitt. Ovägt blir siffran smickrande och fel. */
      const dagar: Dag[] = [
        { date: '2026-08-01', clicks: 0, impressions: 3,    position: 2  },
        { date: '2026-08-02', clicks: 0, impressions: 1000, position: 40 },
      ]
      const p = summa(dagar, '2026-08-01', '2026-08-02').position
      return p !== null && p > 39
        ? null
        : `snittposition ${p} — dygnen vägde lika tungt oavsett hur många som såg dem`
    },
  },
  {
    namn: 'En kund vars koppling dött larmar i kundvården',
    kör: () => {
      /* Det tysta felet: allt ser kopplat ut, siffrorna har bara slutat komma.
         Kunden ser en kurva som ligger still och läser det som att ingen sökte. */
      const bas: Underlag = {
        avslutat: false, onboardingKlar: true, kopplad: true, kopplatSedan: '2026-01-01',
        scSajt: 'sc-domain:salongen.se', scSenaste: '2026-08-20',
        ga4Property: '123', ga4Mätström: 'G-ABC', ga4Senaste: '2026-08-22',
        adsKonto: '456', gbpPlats: 'locations/1', gbpSenaste: '2026-08-22',
        sajtPublicerad: false, harLogga: true, harBokning: false, antalTjänster: 0, antalPersonal: 0,
        domäner: [], idag: '2026-08-23',
      }

      /* Färsk data: inget att larma om. */
      if (kundstatus(bas).some(f => f.allvar === 'kritiskt')) {
        return 'larmade på en kund där allt fungerade'
      }

      /* Tio dygn gammal söktrafik är inte säsong, det är ett trasigt konto. */
      const död = kundstatus({ ...bas, scSenaste: '2026-08-13' })
      if (!död.some(f => f.id === 'sok-stannat' && f.allvar === 'kritiskt')) {
        return 'tio dygn gammal sökdata gick förbi utan varning'
      }

      /* Men fyra dygn är normalt: Google räknar en gång per dygn och ligger
         två till tre dagar efter. Larmar vi där larmar vi varje dag. */
      return kundstatus({ ...bas, scSenaste: '2026-08-19' }).some(f => f.id === 'sok-stannat')
        ? 'larmade på fyra dygn gammal data — det är normalt slitage, inte ett fel'
        : null
    },
  },
  {
    namn: 'Ett avslutat avtal larmar inte om att det slutat leverera',
    kör: () => {
      /* Allt är trasigt hos en uppsagd kund — det är meningen. En lista som
         fylls av avslutade konton är en lista man slutar läsa. */
      const u: Underlag = {
        avslutat: true, onboardingKlar: false, kopplad: false, kopplatSedan: null,
        scSajt: null, scSenaste: null, ga4Property: null, ga4Mätström: null, ga4Senaste: null,
        adsKonto: null, gbpPlats: null, gbpSenaste: null,
        sajtPublicerad: true, harLogga: true, harBokning: true, antalTjänster: 0, antalPersonal: 0,
        domäner: [{ domän: 'salongen.se', verifierad: false, tillagd: '2026-01-01' }],
        idag: '2026-08-23',
      }
      const f = kundstatus(u)
      if (f.some(x => x.allvar !== 'info')) return `${f.length} fynd på ett avslutat avtal`
      return värstaLäget(f) === 'info' ? null : 'avslutat avtal gav inget besked alls'
    },
  },
  {
    namn: 'Bokning utan tjänster är kritiskt, inte en detalj',
    kör: () => {
      /* Bokningssidan öppnar och tar slut direkt. Varje besökare som klickar
         Boka tid vänder i dörren, och ingenting i produkten säger till. */
      const u: Underlag = {
        avslutat: false, onboardingKlar: true, kopplad: true, kopplatSedan: '2026-08-01',
        scSajt: 'x', scSenaste: '2026-08-23', ga4Property: '1', ga4Mätström: 'G-1',
        ga4Senaste: '2026-08-23', adsKonto: '1', gbpPlats: 'l/1', gbpSenaste: '2026-08-23',
        sajtPublicerad: true, harLogga: true, harBokning: true, antalTjänster: 0, antalPersonal: 2,
        domäner: [], idag: '2026-08-23',
      }
      const f = kundstatus(u)
      if (!f.some(x => x.id === 'inga-tjanster' && x.allvar === 'kritiskt')) {
        return 'ett bokningssystem utan tjänster gick förbi'
      }
      /* Och med tjänster upplagda ska det vara tyst. */
      return kundstatus({ ...u, antalTjänster: 6 }).some(x => x.id === 'inga-tjanster')
        ? 'larmade trots att tjänsterna fanns' : null
    },
  },
  {
    namn: 'Abonnemangsläget läser Stripe först och provet sedan',
    kör: () => {
      /* Regeln avgör vad admin ser och vad betalväggen kommer att göra — en
         kund som stängs av fel dag är en kund som ringer arg, med rätta. */
      const nu = new Date('2026-08-24T12:00:00')
      const rad = (över: Partial<Parameters<typeof kontoLäge>[0]>) => kontoLäge({
        subscription_status: null, trial_ends_at: null, current_period_end: null, ...över,
      }, nu)

      if (rad({ subscription_status: 'active' })   !== 'aktiv')     return 'ett betalande konto lästes fel'
      if (rad({ subscription_status: 'past_due' }) !== 'förfallen') return 'en missad betalning syntes inte'
      if (rad({ subscription_status: 'canceled' }) !== 'uppsagd')   return 'en uppsägning lästes fel'

      /* Ett aktivt abonnemang vinner över ett utgånget prov — kunden som
         betalade dag fem ska inte mötas av "provet har löpt ut". */
      if (rad({ subscription_status: 'active', trial_ends_at: '2026-08-20' }) !== 'aktiv') {
        return 'ett gammalt provdatum trumfade en aktiv betalning'
      }

      if (rad({ trial_ends_at: '2026-08-30' }) !== 'prov')      return 'ett löpande prov lästes fel'
      if (rad({ trial_ends_at: '2026-08-20' }) !== 'prov-slut') return 'ett utgånget prov såg aktivt ut'
      return rad({}) === 'ingen' ? null : 'ett konto utan allt fick ett läge'
    },
  },
  {
    namn: 'Avdraget för avbetald sida gäller rätt kunder',
    kör: () => {
      /* Efter tolv betalda månader har kunden betalat av formgivningen och
         slutar betala för den. Mallpaketet innehåller ingen formgivning att
         betala av — ger vi avdraget där skänker vi bort hundrafemtio kronor
         i månaden av ren slarv. */
      if (!designAvbetald('design', 12))      return 'en designkund med tolv månader fick inget avdrag'
      if (!designAvbetald('fullservice', 20)) return 'en fullservicekund med tjugo månader fick inget avdrag'

      if (designAvbetald('mall', 60))  return 'mallpaketet fick avdrag trots ingen formgivning'
      if (designAvbetald(null, 60))    return 'ett konto utan paket fick avdrag'

      if (designAvbetald('design', 11)) return 'elva månader räckte'
      if (designAvbetald('design', 0))  return 'noll månader räckte'

      /* Samma gräns som rätten att ta med sig sidan. Skulle de glida isär
         kunde en kund få sidan utan avdraget, eller tvärtom. */
      return designAvbetald('design', KRAV_MÅNADER) ? null : 'gränsen stämmer inte med exporträtten'
    },
  },
  {
    namn: 'Mallpaketet kan aldrig bli billigare',
    kör: () => {
      /* Avdraget hör till paketet, inte till kunden. En avbetald designkund
         som går ned till mall betalar mallpriset — 150 kr bort från 129 vore
         att betala kunden för att vara kund. */
      const betald = '2026-01-01'

      if (!avdragGäller('design', betald))      return 'en avbetald designkund fick inget avdrag'
      if (!avdragGäller('fullservice', betald)) return 'en avbetald fullservicekund fick inget avdrag'
      if (avdragGäller('mall', betald))         return 'mallpaketet fick avdraget och blev billigare än sitt pris'
      if (avdragGäller('design', null))         return 'avdrag gavs utan att sidan var avbetald'

      /* Sidan förloras vid nedgradering till mall — men bara innan den är
         betald. Efter ett år följer den med. */
      if (!förlorarSidan('design', 'mall', null))       return 'en obetald sida följde med ned till mall'
      if (!förlorarSidan('fullservice', 'mall', null))  return 'en obetald fullservicesida följde med ned'
      if (förlorarSidan('design', 'mall', betald))      return 'en avbetald sida togs ifrån kunden'
      if (förlorarSidan('mall', 'mall', null))          return 'en mallkund varnades om en sida de aldrig haft'
      return förlorarSidan('fullservice', 'design', null)
        ? 'varnade vid nedgradering mellan två formgivna nivåer' : null
    },
  },
  {
    namn: 'Paketbytets riktning avgör vad som händer',
    kör: () => {
      /* Riktningen styr om ett klick blir ett köat byte eller en förfrågan.
         Läses den fel kan en mallkund köpa en designad sida med ett klick —
         en sida som inte finns förrän någon formgett den. */
      if (riktning('mall', 'design')         !== 'upp')   return 'mall → design lästes inte som uppgradering'
      if (riktning('mall', 'fullservice')    !== 'upp')   return 'mall → full service lästes inte som uppgradering'
      if (riktning('design', 'fullservice')  !== 'upp')   return 'design → full service lästes inte som uppgradering'

      if (riktning('fullservice', 'design')  !== 'ned')   return 'full service → design lästes inte som nedgradering'
      if (riktning('design', 'mall')         !== 'ned')   return 'design → mall lästes inte som nedgradering'
      if (riktning('fullservice', 'mall')    !== 'ned')   return 'full service → mall lästes inte som nedgradering'

      if (riktning('design', 'design')       !== 'samma') return 'samma paket räknades som ett byte'
      /* Utan paket finns inget att gå ned från — allt är en uppgradering. */
      return riktning(null, 'mall') === 'upp' ? null : 'ett konto utan paket fick nedgradering'
    },
  },
  {
    namn: 'Kundfilen öppnas rätt i kundens eget land',
    kör: () => {
      /* Excel väljer avskiljare efter datorns språkinställning, inte efter
         filen. Fel val ger en fil som ser trasig ut vid första dubbelklicket,
         och det blir ett supportärende oavsett hur korrekt innehållet är. */
      if (avskiljare('sweden')      !== ';') return 'svensk kund fick komma'
      if (avskiljare('germany')     !== ';') return 'tysk kund fick komma'
      if (avskiljare('netherlands') !== ';') return 'nederländsk kund fick komma'
      if (avskiljare('uk')          !== ',') return 'brittisk kund fick semikolon'
      if (avskiljare('us')          !== ',') return 'amerikansk kund fick semikolon'
      /* Okänt eller osatt land: semikolon, eftersom kundbasen är europeisk. */
      if (avskiljare(null)     !== ';') return 'utan land valdes komma'
      return avskiljare('UK') === ',' ? null : 'landet lästes skiftlägeskänsligt'
    },
  },
  {
    namn: 'Exporterad sida lever utan oss',
    kör: () => {
      /* En sida som lämnas ut ska fungera hos någon annan. Går omskrivningen
         fel märks det inte här utan hos en kund som redan slutat betala och
         inte har någon anledning att höra av sig snällt. */
      const html = [
        '<a href="https://kiterank.se/boka/salongx">Boka tid</a>',
        '<a href="/boka/salongx?tjanst=klippning">Boka klippning</a>',
        '<a href="https://kiterank.se/s/salongx/priser">Priser</a>',
        '<a href="tel:070-123 45 67">Ring oss</a>',
        '<script src="/_next/static/chunk.js"></script>',
      ].join('\n')

      const ut = stadaSida(html, { slug: 'salongx', telefon: '070-123 45 67' })

      if (ut.includes('/boka/salongx')) return 'en bokningslänk lämnades kvar och leder ingenstans'
      if ((ut.match(/href="tel:0701234567"/g) ?? []).length !== 2) {
        return 'bokningsknapparna pekar inte på telefonnumret'
      }
      if (ut.includes('kiterank.se/s/salongx')) return 'navigationen pekar hem till en uppsagd sajt'
      if (!ut.includes('href="/priser"'))       return 'undersidan tappade sin länk'
      if (ut.includes('_next'))                 return 'vår egen skriptkod följde med'

      /* Utan telefonnummer får knappen inte bli en död länk. */
      const utan = stadaSida(html, { slug: 'salongx', telefon: null })
      return utan.includes('href="#kontakt"') ? null : 'utan telefonnummer blev knappen tom'
    },
  },
  {
    namn: 'Rätten att ta med hemsidan gäller rätt kunder',
    kör: () => {
      /* Regeln avgör vad du lämnar ut och vad du inte gör. Ett fel åt ena
         hållet ger bort designarbete gratis; åt andra hållet nekar du en kund
         något de har rätt till, vilket blir en dålig historia i deras nästa
         samtal med en branschkollega. */
      const nu = new Date('2026-08-25T12:00:00')
      const f = (över: Partial<Parameters<typeof fårTaMedHemsidan>[0]>) => fårTaMedHemsidan({
        plan: 'design', betaldaMånader: 12, avslutat: null, ...över,
      }, nu)

      if (!f({}).får) return 'en designkund med tolv månader nekades'
      if (!f({ plan: 'fullservice' }).får) return 'en fullservicekund nekades'

      /* Mallpaketet innehåller ingen formgivning att ta med sig. */
      if (f({ plan: 'mall' }).får) return 'mallpaketet fick hemsidan'
      if (f({ plan: null }).får)   return 'ett konto utan paket fick hemsidan'

      /* Tiden mäts i betalda månader. */
      if (f({ betaldaMånader: 11 }).får) return 'elva månader räckte'
      if (f({ betaldaMånader: 0 }).får)  return 'noll månader räckte'

      /* Fönstret efter uppsägningen: öppet i trettio dagar, sedan stängt. */
      if (!f({ avslutat: '2026-08-10' }).får) return 'fönstret stängde efter femton dagar'
      if (f({ avslutat: '2026-06-01' }).får)  return 'ett avtal avslutat i juni gav fortfarande ut sidan'
      return null
    },
  },
  {
    namn: 'Sent bokade tider slipper påminnelsen',
    kör: () => {
      /* Regeln som kronjobbet tillämpar, i klartext: en bokning gjord närmare
         tiden än gränsen får ingen påminnelse. Utan den får kunden som bokar
         på morgonen för eftermiddagen två meddelanden inom en minut, och
         salongen betalar för det andra. */
      const gräns = (timmar: number) => timmar * 3_600_000
      const slipper = (bokadTimmarFöre: number, gränsTimmar: number) => {
        const start = new Date('2026-09-01T14:00:00').getTime()
        const bokadesVid = start - gräns(bokadTimmarFöre)
        return gränsTimmar > 0 && start - bokadesVid < gräns(gränsTimmar)
      }

      if (!slipper(1, 4))  return 'en bokning gjord en timme innan påmindes ändå'
      if (!slipper(3, 4))  return 'en bokning gjord tre timmar innan påmindes ändå'
      if (slipper(5, 4))   return 'en bokning gjord fem timmar innan tappade sin påminnelse'
      if (slipper(48, 4))  return 'en bokning gjord två dygn innan tappade sin påminnelse'

      /* Noll stänger av regeln: alla ska påminnas, även den som bokar sist. */
      return slipper(1, 0) ? 'gränsen noll hoppade ändå över en påminnelse' : null
    },
  },
  {
    namn: 'Betalväggen låser rätt konton och bara dem',
    kör: () => {
      /* Den dyraste buggen i hela betalsystemet vore att låsa ute någon som
         betalar. Den näst dyraste är att aldrig låsa någon alls. */
      const nu = new Date('2026-08-24T12:00:00')
      const t = (över: Partial<Parameters<typeof tillgång>[0]>) => tillgång({
        subscription_status: null, trial_ends_at: null, current_period_end: null, ...över,
      }, nu)

      if (t({ subscription_status: 'active' }).låst)   return 'en betalande kund låstes ute'
      if (t({ subscription_status: 'trialing' }).låst) return 'ett Stripe-prov låstes ute'

      /* En nekad betalning ger varning men inte stängd dörr: Stripe gör
         omförsök i ett par veckor och de flesta fall är utgångna kort. */
      const nekad = t({ subscription_status: 'past_due' })
      if (nekad.låst)                    return 'en nekad betalning stängde av direkt'
      if (nekad.varning !== 'förfallen') return 'en nekad betalning varnade inte'

      /* När Stripe gett upp stängs den. */
      if (!t({ subscription_status: 'unpaid' }).låst)   return 'ett uppgivet abonnemang släpptes in'
      if (!t({ subscription_status: 'canceled' }).låst) return 'ett uppsagt abonnemang släpptes in'

      /* Provet: löper, snart slut, slut. */
      const löper = t({ trial_ends_at: '2026-09-10' })
      if (löper.låst || löper.varning !== 'ingen') return 'ett prov med två veckor kvar varnade'

      const snart = t({ trial_ends_at: '2026-08-26' })
      if (snart.låst)                       return 'ett löpande prov låstes'
      if (snart.varning !== 'prov-slutar')  return 'ett prov som tar slut om två dagar varnade inte'
      if (snart.dagarKvar !== 2)            return `räknade ${snart.dagarKvar} dagar i stället för 2`

      if (!t({ trial_ends_at: '2026-08-20' }).låst) return 'ett utgånget prov släpptes in'

      /* Ett aktivt abonnemang trumfar ett gammalt provdatum — kunden som
         betalade dag fem ska inte mötas av betalväggen dag åtta. */
      if (t({ subscription_status: 'active', trial_ends_at: '2026-08-20' }).låst) {
        return 'ett gammalt prov låste ute en betalande kund'
      }

      /* Konton från tiden före betalsystemet får aldrig låsas retroaktivt. */
      return t({}).låst ? 'ett konto utan prov och utan abonnemang låstes' : null
    },
  },
  {
    namn: 'Provpåminnelsen går en gång, och bara till rätt konton',
    kör: () => {
      /* Nattsvepet läser den här varje dygn. En påminnelse som upprepas blir
         skräppost, och en som går till en betalande kund läser som ett hot. */
      const nu = new Date('2026-08-24T12:00:00')
      const p = (över: Partial<Provrad>) => skaPåminnas({
        trial_ends_at: null, subscription_status: null,
        provpaminnelse_skickad: null, closed_at: null, ...över,
      }, nu)

      if (!p({ trial_ends_at: '2026-08-26' })) return 'ett prov med två dagar kvar påmindes inte'
      if (!p({ trial_ends_at: '2026-08-27' })) return 'ett prov med tre dagar kvar påmindes inte'

      /* För tidigt och för sent ska vara tyst. */
      if (p({ trial_ends_at: '2026-09-05' })) return 'påminde två veckor i förväg'
      if (p({ trial_ends_at: '2026-08-20' })) return 'påminde om ett prov som redan tagit slut'

      /* En gång. */
      if (p({ trial_ends_at: '2026-08-26', provpaminnelse_skickad: '2026-08-23' })) {
        return 'påminde en andra gång'
      }

      /* Den som betalat har inget prov att påminnas om. */
      if (p({ trial_ends_at: '2026-08-26', subscription_status: 'active' })) {
        return 'påminde en betalande kund'
      }
      return p({ trial_ends_at: '2026-08-26', closed_at: '2026-08-01' })
        ? 'påminde ett avslutat konto' : null
    },
  },
  {
    namn: 'Prisetiketten avgör paket och bokning rätt',
    kör: () => {
      /* Webhooken läser abonnemangets rader genom den här tolkningen. Går den
         fel får kunden fel paket i panelen, eller — värre — en kalender som
         släcks trots att bokningen är betald. */
      const p = tolkaNyckel('design_ar')
      if (p?.sort !== 'paket' || p.plan !== 'design' || p.intervall !== 'ar') {
        return 'ett årspaket lästes fel'
      }

      const b = tolkaNyckel('bokning_mall_manad')
      if (b?.sort !== 'bokning' || b.plan !== 'mall' || b.intervall !== 'manad') {
        return 'bokningstillägget lästes fel'
      }

      /* Prefixet får inte förväxlas: 'bokning_mall_manad' är tillägget, medan
         ett paket som hette 'bokning' vore den gamla modellen. */
      if (tolkaNyckel('mall_manad')?.sort !== 'paket') return 'ett paket lästes som tillägg'
      if (tolkaNyckel('sms')?.sort !== 'sms')          return 'förbrukningspriset lästes fel'

      /* Uppstartsavgiften är ett engångspris och får aldrig läsas som ett
         paket — då hade webhooken trott att kunden bytt nivå varje gång en
         avgift dök upp på fakturan. */
      const u = tolkaNyckel('uppstart_fullservice_manad')
      if (u?.sort !== 'uppstart' || u.plan !== 'fullservice') return 'uppstartsavgiften lästes som paket'

      /* Okända etiketter ska ge null, inte ett gissat paket — ett pris som
         Jakob lagt upp för hand ska aldrig tyst byta kundens nivå. */
      if (tolkaNyckel('kampanj_2026') !== null) return 'en okänd etikett tolkades ändå'
      if (tolkaNyckel(null) !== null)           return 'ett saknat pris gav ett paket'
      return null
    },
  },
  {
    namn: 'Saknad logga är en notering, aldrig ett larm',
    kör: () => {
      /* Utan logga visar Google en bokstavsikon i salongens färger — det
         fungerar, så det får aldrig se ut som ett fel i kundvården. Men det
         ska synas, för salongen vet sällan att ikonen i sökresultaten är
         deras att bestämma över. */
      const bas: Underlag = {
        avslutat: false, onboardingKlar: true, kopplad: true, kopplatSedan: '2026-08-01',
        scSajt: 'x', scSenaste: '2026-08-23', ga4Property: '1', ga4Mätström: 'G-1',
        ga4Senaste: '2026-08-23', adsKonto: '1', gbpPlats: 'l/1', gbpSenaste: '2026-08-23',
        sajtPublicerad: true, harLogga: false, harBokning: false,
        antalTjänster: 4, antalPersonal: 1, domäner: [], idag: '2026-08-23',
      }
      const utan = kundstatus(bas).find(f => f.id === 'ingen-logga')
      if (!utan)                    return 'en publicerad sajt utan logga gick förbi'
      if (utan.allvar !== 'info')   return `fick allvarsgrad ${utan.allvar} — en bokstavsikon är inte ett fel`
      if (kundstatus({ ...bas, harLogga: true }).some(f => f.id === 'ingen-logga')) {
        return 'larmade trots att loggan fanns'
      }
      /* Opublicerad sajt: ingen ser ikonen än, ingenting att notera. */
      return kundstatus({ ...bas, sajtPublicerad: false }).some(f => f.id === 'ingen-logga')
        ? 'noterade logga på en sajt som inte är publicerad' : null
    },
  },
  {
    namn: 'En overifierad domän larmar först när DNS hunnit slå igenom',
    kör: () => {
      const bas: Underlag = {
        avslutat: false, onboardingKlar: true, kopplad: false, kopplatSedan: null,
        scSajt: null, scSenaste: null, ga4Property: null, ga4Mätström: null, ga4Senaste: null,
        adsKonto: null, gbpPlats: null, gbpSenaste: null,
        sajtPublicerad: false, harLogga: true, harBokning: false, antalTjänster: 0, antalPersonal: 0,
        domäner: [{ domän: 'salongen.se', verifierad: false, tillagd: '2026-08-23' }],
        idag: '2026-08-23',
      }
      /* Samma dag: DNS kan ta timmar. Att ringa då är att ringa för tidigt. */
      if (kundstatus(bas).some(f => f.id === 'doman-salongen.se')) {
        return 'larmade på en domän som lades till idag'
      }
      /* Tre dagar senare har ingen satt posterna, och kunden tror att sajten
         ligger på deras adress. */
      const sen = kundstatus({ ...bas, domäner: [{ domän: 'salongen.se', verifierad: false, tillagd: '2026-08-20' }] })
      if (!sen.some(f => f.id === 'doman-salongen.se' && f.allvar === 'kritiskt')) {
        return 'en domän som stått overifierad i tre dagar gick förbi'
      }
      /* Verifierad: tyst. */
      return kundstatus({ ...bas, domäner: [{ domän: 'salongen.se', verifierad: true, tillagd: '2026-01-01' }] })
        .some(f => f.id === 'doman-salongen.se')
        ? 'larmade på en verifierad domän' : null
    },
  },
  {
    namn: 'Utan två hela år finns ingen årsjämförelse',
    kör: () => {
      /* Ett år i minnet räcker aldrig till två färdiga år. Den som ändå räknar
         får åtta månader av i år mot fem av i fjol och kallar det tillväxt. */
      const rader = ['2025-08','2025-09','2025-10','2025-11','2025-12',
                     '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08']
        .map(m => ({ månad: m, antal: 20, värde: 0, minuter: 0, genomförda: 0, uteblivna: 0, avbokade: 0 }))

      const staplar = gruppera(rader, 'ar', () => 0, 'sv', '2026-08')
      if (staplar.length !== 2) return `${staplar.length} årsstaplar i stället för 2`
      return halvor(staplar) === null
        ? null
        : 'jämförde ett halvt år mot fem månader och kallade skillnaden en förändring'
    },
  },

  /*
   * Avsändarnamnen.
   *
   * De hör hit av samma skäl som utskickskön: avsändaren är det enda kunden
   * läser innan de bestämmer sig för att öppna, och den syns aldrig i panelen
   * på det sätt kunden ser den. Ett namn som tappat sin form upptäcks alltså
   * först ute hos kunderna.
   */
  /*
   * Kanalregeln.
   *
   * Hör hit eftersom den avgör två saker samtidigt: vad kunden får, och vilken
   * uppgift bokningsformuläret gör obligatorisk. Går den fel åt ena hållet
   * skickas ingenting; åt det andra kräver formuläret ett nummer ingen behöver,
   * och avhoppen syns inte som ett fel utan som färre bokningar.
   */
  {
    namn: 'Bekräftelse och avbokning följer alltid kontaktsättet',
    kör() {
      /* De två kan inte välja egen kanal, och ett kanalval på salongen får
         inte råka gälla dem — kunden lämnade sina uppgifter för ett format. */
      const val = { kontakt: 'email', reminder: 'sms', review: 'sms' } as const
      if (kanalFor('confirmation', val) !== 'email') return 'bekräftelsen lämnade kontaktsättet'
      if (kanalFor('cancellation', val) !== 'email') return 'avbokningen lämnade kontaktsättet'
      return null
    },
  },
  {
    namn: 'Tidsstyrda utan eget val följer kontaktsättet',
    kör() {
      /* Null betyder "samma som bekräftelsen" och inte "inget val". Tolkas det
         som SMS börjar varje ny salong kräva telefonnummer vid bokning. */
      const mail = { kontakt: 'email', reminder: null, review: null } as const
      const sms  = { kontakt: 'sms',   reminder: null, review: null } as const
      if (kanalFor('reminder', mail) !== 'email') return 'påminnelsen följde inte kontaktsättet mail'
      if (kanalFor('review',   mail) !== 'email') return 'omdömesfrågan följde inte kontaktsättet mail'
      if (kanalFor('reminder', sms)  !== 'sms')   return 'påminnelsen följde inte kontaktsättet sms'
      return null
    },
  },
  {
    namn: 'Tidsstyrda med eget val går sin egen väg',
    kör() {
      /* Fallet hela funktionen finns för: salongen mailar sina bekräftelser men
         påminner via SMS, och skickar omdömesfrågan som mail. */
      const val = { kontakt: 'email', reminder: 'sms', review: 'email' } as const
      if (kanalFor('reminder', val) !== 'sms')   return 'påminnelsen tappade sitt val'
      if (kanalFor('review',   val) !== 'email') return 'omdömesfrågan tappade sitt val'
      return null
    },
  },
  {
    namn: 'Golvet kräver den uppgift varje påslagen kanal faktiskt använder',
    kör() {
      /* En salong som mailar men påminner via SMS behöver båda uppgifterna.
         Kräver formuläret bara adressen är påminnelsen påslagen för alla och
         når ingen — och salongen betalar för en tjänst som är tyst. */
      const båda = golvFor('email', ['sms'])
      if (!båda.epost || !båda.telefon) return 'mail + SMS-påminnelse krävde inte båda uppgifterna'

      /* Inget tidsstyrt påslaget: bara kontaktsättets uppgift. Ett extra
         obligatoriskt fält är avhopp i bokningsformuläret. */
      const bara = golvFor('email', [])
      if (!bara.epost || bara.telefon) return 'mail utan påslagna utskick krävde ändå telefonnummer'
      return null
    },
  },
  {
    namn: 'SMS-avsändaren skalar diakriter i stället för att stryka dem',
    kör() {
      const ut = smsSender('Salong Nordström & Co')
      if (ut.length > 11)        return `${ut.length} tecken — operatören kapar vid 11`
      if (!/^[A-Za-z0-9]+$/.test(ut)) return `"${ut}" innehåller tecken som inte överlever hos alla operatörer`
      /* Strykning i stället för skalning ger SalongNrds — namnet blir
         oläsbart av ett fel som ser ut som en detalj. */
      return ut === 'SalongNords' ? null : `blev "${ut}" i stället för "SalongNords"`
    },
  },
  {
    namn: 'Mejlavsändaren behåller å, ä, ö och mellanslag',
    kör() {
      const namn = 'Salong Nordström & Co'
      const ut   = mailSender(namn)
      return ut === namn ? null : `skrev om "${namn}" till "${ut}"`
    },
  },
  {
    namn: 'Mejlavsändaren släpper inte igenom tecken som bryter avsändarhuvudet',
    kör() {
      /* Vägen man förfalskar en avsändare: bryta raden och skriva ett eget
         huvud under. Tas det inte bort här räcker det att en salong klistrar in
         fel sak i fältet för att våra utskick ska se förfalskade ut. */
      const ut = mailSender('Salong\r\nBcc: alla@exempel.se <chef@banken.se>')
      if (/[\r\n"<>]/.test(ut)) return `"${ut}" bär fortfarande ett tecken som bryter huvudet`
      return null
    },
  },
  {
    namn: 'Tomt avsändarfält faller tillbaka på företagsnamnet',
    kör() {
      /* Tomt fält betyder "härled namnet", inte "skicka utan avsändare". Faller
         det i stället tillbaka på ordet Salong har varenda kund som inte fyllt i
         fältet fått fel namn i inkorgen. */
      if (mailSender('Studio Söder', '')   !== 'Studio Söder') return 'mejlet tappade företagsnamnet'
      if (mailSender('Studio Söder', null) !== 'Studio Söder') return 'mejlet tappade företagsnamnet vid null'
      if (smsSender('Studio Söder', '')    !== 'StudioSoder')  return 'SMS:et tappade företagsnamnet'
      /* Utan något namn alls måste det ändå stå något: ett tomt avsändarfält
         avvisas av både operatören och mottagarens skräppostfilter. */
      return mailSender('', '') === 'Salong' ? null : 'utan namn blev avsändaren tom'
    },
  },
]

/**
 * Kör alla prov.
 *
 * Ett prov som kastar räknas som underkänt med felmeddelandet som skäl — annars
 * hade ett undantag i ett prov släckt hela sidan i stället för att synas som
 * det det är.
 */
export function körTester(): Utfall[] {
  return TESTER.map(t => {
    try {
      const fel = t.kör()
      return { namn: t.namn, ok: fel === null, varför: fel ?? '' }
    } catch (err) {
      return { namn: t.namn, ok: false, varför: err instanceof Error ? err.message : String(err) }
    }
  })
}
