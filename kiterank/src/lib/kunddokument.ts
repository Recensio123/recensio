import { createAdminClient } from '@/lib/supabase/admin'
import { tradePack } from '@/lib/trades'

/*
 * Kunddokumentet — metoden först, kundens siffror i den.
 *
 * Ett dokument som bara refererar kundens egen statistik är inget kunden
 * behöver köpa; de har redan sina siffror. Värdet ligger i vad man gör med
 * dem, och det är mallen. Den bär arbetssättet — hur en annonsstrategi för en
 * lokal salong byggs, i vilken ordning, med vilka regler — och kundens data
 * går in som förutsättningar, inte som innehåll.
 *
 * Därför två delar som hålls isär:
 *
 *   MALLEN är samma för alla kunder och ändras när metoden ändras. Den bor i
 *   databasen och redigeras i admin, precis som avtalen, så att en förbättring
 *   slår igenom på nästa dokument för varje kund utan att något byggs om.
 *
 *   UNDERLAGET hämtas per kund vid varje körning: tjänster, priser, ort,
 *   sökord de redan syns på, vad annonserna kostat, vad profilen visar, och —
 *   det ingen byrå kan visa — hur många bokningar det faktiskt blev.
 *
 * Siffror som inte går att mäta lämnas tomma. Ett underlag som gissar en
 * sökvolym gör resten av dokumentet lika mycket värt som gissningen.
 */

/* ─── Underlaget ───────────────────────────────────────────────────────── */

export type Underlag = {
  företag: {
    namn: string; ort: string | null; postort: string | null
    land: string; bransch: string; branschNamn: string; webbplats: string | null
  }
  tjänster: { namn: string; kategori: string | null; pris: string }[]
  sökord:   { fras: string; klick: number; visningar: number; ctr: number; position: number }[]
  annonser: {
    kopplat:   boolean
    kampanjer: { namn: string; status: string; kostnad: number; klick: number; visningar: number; cpc: number; konverteringar: number }[]
    slöseri:   { fras: string; kostnad: number; klick: number }[]
    kostnad30: number
  }
  profil: {
    betyg: number | null; antalOmdömen: number | null; besvarade: number | null
    visningar: number | null; webbklick: number | null; vägbeskrivningar: number | null
  } | null
  bokningar: { senaste30: number; värde30: number; föregående30: number } | null
  saknas: string[]
}

const kr = (mikro: number) => Math.round(mikro / 1_000_000)

/** Allt vi vet om en kund, hämtat på en gång. Fel i en källa får aldrig
 *  släcka dokumentet — den delen blir tom och hamnar i `saknas`. */
export async function hämtaUnderlag(companyId: string): Promise<Underlag | null> {
  const admin = createAdminClient()

  const { data: företag } = await admin
    .from('companies')
    .select('id, name, industry, city, postal_code, country, website')
    .eq('id', companyId)
    .maybeSingle()

  if (!företag) return null

  const sedan = (dagar: number) => {
    const d = new Date()
    d.setDate(d.getDate() - dagar)
    return d.toISOString().slice(0, 10)
  }

  const [tjänster, sökord, kampanjer, adsOrd, profil, bokningar] = await Promise.all([
    admin.from('services')
      .select('namn, kategori, pris_kr, pris_fran')
      .eq('company_id', companyId).eq('aktiv', true).order('sort_order'),
    admin.from('search_console_queries')
      .select('query, clicks, impressions, ctr, position')
      .eq('company_id', companyId).order('impressions', { ascending: false }).limit(25),
    admin.from('ads_campaigns')
      .select('name, status, spend_micros, clicks, impressions, ctr, avg_cpc_micros, conversions')
      .eq('company_id', companyId),
    admin.from('ads_keywords')
      .select('keyword, spend_micros, clicks, conversions, is_wasted')
      .eq('company_id', companyId).eq('is_wasted', true).order('spend_micros', { ascending: false }).limit(10),
    admin.from('gbp_snapshots')
      .select('rating, review_count, reviews_responded, impressions_last_30_days, website_clicks, direction_requests')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('bookings')
      .select('service_price_sek, source, booking_date')
      .eq('company_id', companyId).gte('booking_date', sedan(60)).neq('status', 'cancelled'),
  ].map(q => q.then(r => r, () => ({ data: null }))) as Promise<{ data: unknown }>[]) as [
    { data: { namn: string; kategori: string | null; pris_kr: number | null; pris_fran: boolean | null }[] | null },
    { data: { query: string; clicks: number; impressions: number; ctr: number; position: number }[] | null },
    { data: { name: string; status: string; spend_micros: number; clicks: number; impressions: number; ctr: number; avg_cpc_micros: number; conversions: number }[] | null },
    { data: { keyword: string; spend_micros: number; clicks: number }[] | null },
    { data: { rating: number | null; review_count: number | null; reviews_responded: number | null; impressions_last_30_days: number | null; website_clicks: number | null; direction_requests: number | null } | null },
    { data: { service_price_sek: number | null; source: string | null; booking_date: string | null }[] | null },
  ]

  const saknas: string[] = []

  /* Bokningar räknas i två fönster så att dokumentet kan säga om det går upp
     eller ned. Manuellt inlagda räknas bort — de kom inte från marknadsföring
     och skulle få varje siffra att se bättre ut än den är. */
  let bok: Underlag['bokningar'] = null
  if (bokningar.data) {
    const frånSajten = bokningar.data.filter(b => b.source !== 'manual')
    const gräns30 = sedan(30)
    const senaste = frånSajten.filter(b => (b.booking_date ?? '') >= gräns30)
    const tidigare = frånSajten.filter(b => (b.booking_date ?? '') < gräns30)
    bok = {
      senaste30:    senaste.length,
      värde30:      senaste.reduce((s, b) => s + (b.service_price_sek ?? 0), 0),
      föregående30: tidigare.length,
    }
  } else {
    saknas.push('bokningar — bokningssystemet är inte påkopplat')
  }

  const kampanjrader = (kampanjer.data ?? []).map(k => ({
    namn: k.name, status: k.status,
    kostnad: kr(k.spend_micros ?? 0), klick: k.clicks ?? 0,
    visningar: k.impressions ?? 0, cpc: kr(k.avg_cpc_micros ?? 0),
    konverteringar: k.conversions ?? 0,
  }))

  if (!kampanjrader.length) saknas.push('annonsdata — Google Ads är inte kopplat eller har inga kampanjer')
  if (!(sökord.data ?? []).length) saknas.push('sökord — Search Console är inte kopplat eller har ingen data än')
  if (!profil.data) saknas.push('Google-profilen — ingen hämtning gjord än')
  if (!(tjänster.data ?? []).length) saknas.push('tjänstelistan — kunden har inte lagt in sina tjänster')

  const pack = tradePack(företag.industry ?? undefined)

  return {
    företag: {
      namn: företag.name, ort: företag.city, postort: företag.postal_code,
      land: företag.country ?? 'SE', bransch: företag.industry ?? 'salon',
      branschNamn: pack.pick?.label ?? 'Salong',
      webbplats: företag.website,
    },
    tjänster: (tjänster.data ?? []).map(t => ({
      namn: t.namn, kategori: t.kategori,
      pris: t.pris_kr == null ? 'pris på förfrågan' : `${t.pris_fran ? 'från ' : ''}${t.pris_kr} kr`,
    })),
    sökord: (sökord.data ?? []).map(s => ({
      fras: s.query, klick: s.clicks ?? 0, visningar: s.impressions ?? 0,
      ctr: Math.round((s.ctr ?? 0) * 1000) / 10, position: Math.round((s.position ?? 0) * 10) / 10,
    })),
    annonser: {
      kopplat: kampanjrader.length > 0,
      kampanjer: kampanjrader,
      slöseri: (adsOrd.data ?? []).map(o => ({ fras: o.keyword, kostnad: kr(o.spend_micros ?? 0), klick: o.clicks ?? 0 })),
      kostnad30: kampanjrader.reduce((s, k) => s + k.kostnad, 0),
    },
    profil: profil.data
      ? {
          betyg: profil.data.rating, antalOmdömen: profil.data.review_count,
          besvarade: profil.data.reviews_responded,
          visningar: profil.data.impressions_last_30_days,
          webbklick: profil.data.website_clicks,
          vägbeskrivningar: profil.data.direction_requests,
        }
      : null,
    bokningar: bok,
    saknas,
  }
}

/** Underlaget som text, så att mallen kan läsa det utan att någon klistrar. */
export function underlagSomText(u: Underlag): string {
  const rader: string[] = []
  const f = u.företag

  rader.push(`FÖRETAG: ${f.namn}`)
  rader.push(`Bransch: ${f.branschNamn} (${f.bransch})`)
  rader.push(`Ort: ${[f.ort, f.postort].filter(Boolean).join(', ') || 'okänd'} · Land: ${f.land}`)
  rader.push(`Webbplats: ${f.webbplats ?? 'saknas'}`)

  rader.push('', 'TJÄNSTER OCH PRISER:')
  rader.push(u.tjänster.length
    ? u.tjänster.map(t => `- ${t.namn}${t.kategori ? ` (${t.kategori})` : ''}: ${t.pris}`).join('\n')
    : '- inga tjänster inlagda')

  rader.push('', 'SÖKORD DE REDAN SYNS PÅ (Search Console, 28 dagar):')
  rader.push(u.sökord.length
    ? u.sökord.map(s => `- "${s.fras}": position ${s.position}, ${s.visningar} visningar, ${s.klick} klick, ${s.ctr}% ctr`).join('\n')
    : '- ingen data')

  rader.push('', 'ANNONSER (senaste 30 dagarna):')
  if (u.annonser.kopplat) {
    rader.push(`Total kostnad: ${u.annonser.kostnad30} kr`)
    rader.push(...u.annonser.kampanjer.map(k =>
      `- ${k.namn} [${k.status}]: ${k.kostnad} kr, ${k.klick} klick, ${k.cpc} kr/klick, ${k.konverteringar} konverteringar`))
    if (u.annonser.slöseri.length) {
      rader.push('Sökord som kostat utan att ge något:')
      rader.push(...u.annonser.slöseri.map(o => `- "${o.fras}": ${o.kostnad} kr på ${o.klick} klick, 0 konverteringar`))
    }
  } else {
    rader.push('- inga annonser kopplade')
  }

  rader.push('', 'GOOGLE-PROFILEN:')
  rader.push(u.profil
    ? [
        `Betyg: ${u.profil.betyg ?? '–'} av ${u.profil.antalOmdömen ?? '–'} omdömen`,
        `Besvarade omdömen: ${u.profil.besvarade ?? '–'}`,
        `Visningar 30 dagar: ${u.profil.visningar ?? '–'}`,
        `Klick till webbplatsen: ${u.profil.webbklick ?? '–'}`,
        `Vägbeskrivningar: ${u.profil.vägbeskrivningar ?? '–'}`,
      ].join('\n')
    : '- ingen data')

  rader.push('', 'BOKNINGAR VIA SAJTEN:')
  rader.push(u.bokningar
    ? `Senaste 30 dagarna: ${u.bokningar.senaste30} bokningar till ett värde av ${u.bokningar.värde30} kr. Föregående 30 dagar: ${u.bokningar.föregående30} bokningar.`
    : '- bokningssystemet är inte påkopplat')

  if (u.saknas.length) {
    rader.push('', 'SAKNAS I UNDERLAGET (skriv aldrig siffror för det här — säg att det inte går att mäta):')
    rader.push(...u.saknas.map(s => `- ${s}`))
  }

  return rader.join('\n')
}

/* ─── Mallarna ─────────────────────────────────────────────────────────── */

export type Dokumentmall = {
  slug: string; titel: string; beskrivning: string; version: string; innehall: string
}

const STRATEGI = `# Annonsstrategi — arbetsmall

Du är en digital marknadsförare med tio års erfarenhet av lokala tjänsteföretag i Sverige. Du skriver för en salongsägare som klipper hela dagen och inte kan branschtermer. Skriv på svenska, i klarspråk, utan engelska låneord där det finns ett svenskt.

## Så här arbetar vi

Fem steg, alltid i den här ordningen.

**1. Utgå från vad de tjänar pengar på.** Den dyraste behandlingen med bäst marginal ska ha den första kampanjen — inte den mest sökta. En salong med sex stolar kan inte ta emot obegränsat med "klippning herr" för 39 kr i marginal.

**2. Bygg på det de redan syns på.** Sökord där de ligger på plats 4–15 organiskt är billigast att köpa, för Google belönar relevans och de har redan bevisat den. Sökord de rankar etta på ska normalt inte annonseras på alls.

**3. En kampanj per behandlingsområde.** Aldrig en enda kampanj med allt i. Aldrig fler än fyra kampanjer för en salong — då räcker inte budgeten till att lära sig något per kampanj.

**4. Negativa sökord innan start, inte efter.** Utbildning, jobb, produkter att köpa, "själv", "hemma", "billigt" om de är dyra, konkurrenternas namn. Den här listan sparar mer pengar än något annat i strategin.

**5. Mät bokningar, inte klick.** Kostnad per bokning är enda siffran som betyder något. Har vi bokningsdata ska den räknas ut och stå överst.

## Regler för vad du får skriva

- Använd bara siffror som står i underlaget. Saknas en sökvolym, en kostnad eller ett betyg — skriv "går inte att mäta än" och förklara vad som behöver kopplas för att det ska gå. Uppfinn aldrig ett tal.
- Lova aldrig placeringar eller resultat. Skriv vad vi gör och vad det rimligen leder till.
- Rubriker i annonser: högst 30 tecken. Beskrivningar: högst 90 tecken. Räkna, gissa inte.
- Budgetförslag ska motiveras med kundens faktiska siffror, inte med en tumregel.
- Skriv inget om sociala medier — det ingår inte.

## Dokumentet du ska skriva

Håll det under två sidor. En rapport som inte läses skyddar ingen.

**1. Läget i dag** — tre till fyra meningar om var de står, med siffror ur underlaget.

**2. Vad vi satsar på och varför** — vilka behandlingar som ska ha kampanjer, i vilken ordning, med motivering ur deras egna tjänster och priser.

**3. Kampanjstruktur** — kampanj för kampanj, med sökordsgrupper och matchningstyp. Markera vilka sökord som kommer ur deras Search Console-data.

**4. Negativa sökord** — en färdig lista att klistra in.

**5. Annonstexter** — tre rubriker och två beskrivningar per kampanj, med teckenantal utskrivet.

**6. Budget** — förslag per kampanj och totalt i månaden, motiverat. Ange vad vi förväntar oss att en bokning kommer att kosta, eller varför det inte går att säga än.

**7. Så mäter vi** — vilka siffror vi följer, och när vi utvärderar.

**8. Vad kunden behöver göra** — högst tre punkter, konkreta.`

const MANADSRAPPORT = `# Månadsrapport — arbetsmall

Du är en digital marknadsförare med tio års erfarenhet av lokala tjänsteföretag i Sverige. Skriv på svenska, i klarspråk, till en salongsägare utan marknadsföringsbakgrund.

## Vad rapporten är till för

Kunden betalar för full service. De ser inte arbetet, bara fakturan. Rapporten är det enda tillfället i månaden då de får syn på vad de får — och den vanligaste orsaken till att en sådan kund säger upp är inte dåligt resultat, utan att de inte kan se vad de betalar för.

Därför är arbetsloggen viktigare än siffrorna. Skriv den först och stryk den aldrig.

## Regler

- Led med bokningar och kostnad per bokning. Visningar och klick är underlag, inte resultat.
- Bara siffror ur underlaget. Saknas något — säg att det inte går att mäta och vad som behöver kopplas.
- Skriv ut vad som gick sämre, inte bara vad som gick bra. En rapport utan en enda svag punkt läses som marknadsföring och inte som en rapport.
- Ett svagt resultat är alltid en diagnos, aldrig en anledning att lägga ned en kanal. Skriv vad som ska förbättras innan mer pengar läggs där.
- Håll det under två sidor.

## Dokumentet du ska skriva

**1. Sammanfattning** — tre meningar: vad hände, vad vi gjorde, vad vi gör härnäst.

**2. Bokningar** — antal via sajten, värde, jämfört med föregående månad. Kostnad per bokning om annonskostnaden finns. Går det inte att räkna: säg varför.

**3. Det här gjorde vi** — punktlista över månadens arbete: foton, inlägg, besvarade omdömen, pausade sökord, sidändringar, artiklar. Konkret, med antal.

**4. Synligheten** — vilka sökord som rört sig, vad som ligger på plats 4–15 och därmed är nästa vinst.

**5. Google-profilen** — betyg, nya omdömen, svarsfrekvens, visningar, vägbeskrivningar och klick.

**6. Annonserna** — spenderat, kostnad per klick, vad som stoppades och varför.

**7. Planen för nästa månad** — högst tre punkter, och den budget vi föreslår.

Avsluta med en mening om att planen godkänns i panelen, och att budgeten ligger kvar oförändrad om vi inte hör något.`

export const DOKUMENTMALLAR: Dokumentmall[] = [
  {
    slug: 'annonsstrategi', titel: 'Annonsstrategi',
    beskrivning: 'Första dokumentet för en ny full service-kund: vad vi annonserar på, hur kampanjerna byggs, med vilka texter och vilken budget.',
    version: '1.0', innehall: STRATEGI,
  },
  {
    slug: 'manadsrapport', titel: 'Månadsrapport',
    beskrivning: 'Det löpande dokumentet: vad som hände, vad vi gjorde, och planen med budget som kunden godkänner.',
    version: '1.0', innehall: MANADSRAPPORT,
  },
]
