import type { ServiceCategory } from '@/lib/services-data'

/*
 * Salongens tjänster — en lista, två ytor.
 *
 * Fram tills nu fanns två: hemsidans prislista i site_config.content som text,
 * och bokningens tjänster i en tabell som bara gick att fylla vid
 * registreringen. De föddes identiska ur branschpaketet och gled isär i samma
 * stund kunden ändrade ett pris. En salong som höjde klippningen till 750 på
 * sin hemsida hade kvar 650 i bokningen; kunden bokade för 650 och blev
 * ombedd att betala 750 vid stolen.
 *
 * Två format som betyder samma sak är två format som glider isär. Därför är
 * priset ett tal här, aldrig en färdig sträng — "från 2 200 kr" är hur det
 * skrivs, inte vad det är.
 *
 * Ren modul. Inläsningen av gamla textpriser körs i en migrering där ett fel
 * blir tyst och permanent, så den ska gå att prova.
 */

export type Tjanst = {
  id:          string
  kategori:    string
  namn:        string
  beskrivning: string

  /** Kronor. Null betyder pris på förfrågan — inte gratis. */
  pris_kr:     number | null
  /** Priset är ett golv, inte ett fast pris. "från 2 200 kr". */
  pris_fran:   boolean
  /** Får priset synas på hemsidan. Bokningen visar det alltid. */
  visa_pris:   boolean

  minuter:     number
  /** Får tiden synas på hemsidan. */
  visa_tid:    boolean

  /** Går att boka online. Falskt = syns i prislistan, men kräver kontakt. */
  bokningsbar: boolean
  /** Tak per dag. Null = inget tak. */
  max_per_dag: number | null
  /** Egen avbokningsregel i timmar. Null = salongens vanliga. */
  avbokning_timmar: number | null
  /** "Kom med tvättat hår." Visas när kunden bokar. */
  forberedelse: string

  aktiv:       boolean
  sort_order:  number
}

/* ── Inläsning ur den gamla textformen ───────────────────────────────────── */

/** "90 min" → 90, "1 h 30 min" → 90, "1h" → 60. Noll och skräp → null. */
export function läsMinuter(rå = ''): number | null {
  const h = rå.match(/(\d+)\s*(?:h|tim)/i)
  const m = rå.match(/(\d+)\s*min/i)
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
  return total > 0 ? total : null
}

/**
 * "1 350 kr" → 1350, "från 850 kr" → 850 med golv, "Pris på förfrågan" → null.
 *
 * Mellanrummet i tusental kan vara vanligt blanksteg, hårt blanksteg eller
 * smalt hårt blanksteg beroende på var texten kom ifrån — kopierad ur ett
 * mejl, skriven i panelen, eller genererad av oss. Alla tre plockas bort innan
 * siffran läses, annars blir "2 200 kr" till 2.
 */
export function läsPris(rå = ''): { kr: number | null; från: boolean } {
  const från = /\bfr[åa]n\b|\bfr\.?o\.?m\b/i.test(rå)
  const rent = rå.replace(/[\s   ]/g, '')
  const m    = rent.match(/(\d+)(?:kr|:-|sek)/i) ?? rent.match(/^(\d+)$/)
  return { kr: m ? Number(m[1]) : null, från }
}

/* ── Utskrift ────────────────────────────────────────────────────────────── */

const KR = (n: number) => `${n.toLocaleString('sv-SE')} kr`

/** Priset som det ska stå för en besökare. Tom sträng när det ska döljas. */
export function prisText(t: Pick<Tjanst, 'pris_kr' | 'pris_fran' | 'visa_pris'>, dölj = true): string {
  if (dölj && !t.visa_pris) return ''
  if (t.pris_kr === null)   return 'Pris på förfrågan'
  return t.pris_fran ? `från ${KR(t.pris_kr)}` : KR(t.pris_kr)
}

/** "45 min", "1 h 30 min". Tom sträng när tiden ska döljas. */
export function tidText(t: Pick<Tjanst, 'minuter' | 'visa_tid'>, dölj = true): string {
  if (dölj && !t.visa_tid) return ''
  if (!t.minuter) return ''
  const h = Math.floor(t.minuter / 60)
  const m = t.minuter % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * Tiden en bokning faktiskt lägger beslag på i kalendern.
 *
 * Behandlingen plus salongens städtid. Kunden ser bara det första — de har
 * bokat en klippning på 45 minuter, inte 60 — men stolen är upptagen hela
 * tiden. Utan det bokas nästa kund in i städningen och salongen ligger efter
 * från förmiddagen.
 *
 * Städtiden är salongens regel och inte tjänstens. Som ett fält per tjänst blev
 * det tolv fält att fylla i med samma siffra och elva chanser att glömma ett —
 * den som vill ha en kvart mellan kunderna vill ha det mellan alla kunder.
 */
export function upptagenTid(minuter: number, städtid: number): number {
  return minuter + Math.max(0, städtid || 0)
}

/* ── Omvandling mot hemsidans form ───────────────────────────────────────── */

/**
 * Tjänsterna som den prislista hemsidans mallar redan kan rita.
 *
 * Sajtmallarna tar `ServiceCategory[]` och gör det bra. Att skriva om dem för
 * en ny form vore att byta ut det som fungerar för att kunna byta ut det som
 * inte gör det. Tabellen är källan; det här är formen den läses i.
 */
export function somPrislista(rader: Tjanst[]): ServiceCategory[] {
  const ordning: string[] = []
  const karta = new Map<string, ServiceCategory>()

  for (const t of [...rader].filter(t => t.aktiv).sort((a, b) => a.sort_order - b.sort_order)) {
    const namn = t.kategori?.trim() || 'Tjänster'
    if (!karta.has(namn)) {
      karta.set(namn, { category: namn, items: [] })
      ordning.push(namn)
    }
    karta.get(namn)!.items.push({
      name:     t.namn,
      desc:     t.beskrivning ?? '',
      duration: tidText(t),
      price:    prisText(t),
      hidePrice:    !t.visa_pris,
      hideDuration: !t.visa_tid,
    })
  }

  return ordning.map(n => karta.get(n)!)
}

/** Vad en rad i den gamla prislistan blir som tjänst. Används i migreringen. */
export type Tolkad = Omit<Tjanst, 'id'> & {
  /** Texten raden kom ur, så en torrkörning kan visa vad den tolkade. */
  källa: { pris: string; tid: string }
}

/**
 * Hela den gamla prislistan, tolkad.
 *
 * Rader utan tid får sextio minuter. Det är ett antagande, och det är med
 * flit synligt i torrkörningen: en tjänst utan tid går inte att lägga i en
 * kalender, och noll minuter hade gjort den bokningsbar på ett sätt som
 * spräcker dagen. Sextio är fel på ett sätt salongen upptäcker och rättar;
 * noll är fel på ett sätt som ser ut att fungera.
 */
export function tolkaPrislista(kategorier: ServiceCategory[] | undefined | null): Tolkad[] {
  const ut: Tolkad[] = []
  let n = 0

  for (const k of kategorier ?? []) {
    for (const rad of k.items ?? []) {
      const pris = läsPris(rad.price ?? '')
      ut.push({
        kategori:    k.category?.trim() || 'Tjänster',
        namn:        rad.name?.trim() ?? '',
        beskrivning: rad.desc?.trim() ?? '',
        pris_kr:     pris.kr,
        pris_fran:   pris.från,
        visa_pris:   rad.hidePrice !== true,
        minuter:     läsMinuter(rad.duration) ?? 60,
        visa_tid:    rad.hideDuration !== true,
        bokningsbar: true,
        max_per_dag: null,
        avbokning_timmar: null,
        forberedelse: '',
        aktiv:       true,
        sort_order:  n++,
        källa: { pris: rad.price ?? '', tid: rad.duration ?? '' },
      })
    }
  }

  return ut.filter(t => t.namn)
}
