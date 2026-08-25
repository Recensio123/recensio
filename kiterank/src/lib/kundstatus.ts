import { sidansBrister } from '@/lib/sidansBrister'
import type { ServiceCategory } from '@/lib/services-data'

/*
 * Vad som är trasigt hos en kund, och vad du gör åt det.
 *
 * Kundpanelen visar salongen hur det går för dem. Den här listan visar dig något
 * annat: var produkten slutat leverera utan att någon märkt det. Det är två
 * olika frågor, och den andra syns inte i den första — en salong vars
 * Google-koppling dött ser inte en varning, den ser en kurva som ligger still.
 * Ligger den still för att ingen sökte, eller för att vi slutade fråga? Kunden
 * kan inte veta. Du ska kunna se det utan att logga in som dem.
 *
 * Ren funktion med flit. Reglerna avgör vad du ringer en kund om, och de ska gå
 * att prova utan databas.
 *
 * Ordningen i utfallet är den ordning saker kostar pengar. Kritiskt betyder att
 * kunden betalar för något de inte får just nu.
 */

export type Allvar = 'kritiskt' | 'varning' | 'info'

export type Fynd = {
  id:     string
  allvar: Allvar
  rubrik: string
  /** Vad det betyder för kunden. Deras synvinkel, inte systemets. */
  följd:  string
  /** Vad du gör åt det. */
  åtgärd: string
}

export type Underlag = {
  avslutat:        boolean
  onboardingKlar:  boolean
  /** Refresh-token finns, alltså har kunden kopplat Google någon gång. */
  kopplad:         boolean
  kopplatSedan:    string | null

  scSajt:          string | null
  /** Senaste dygnet vi har söksiffror för, 'YYYY-MM-DD'. */
  scSenaste:       string | null

  ga4Property:     string | null
  /** Mätströmmens id — det som börjar med G- och som taggen på sajten behöver. */
  ga4Mätström:     string | null
  ga4Senaste:      string | null

  adsKonto:        string | null
  gbpPlats:        string | null
  gbpSenaste:      string | null

  sajtPublicerad:  boolean
  /** Har salongen laddat upp en logga. Utan den visar Google en bokstavsikon. */
  harLogga:        boolean
  prislista?:      ServiceCategory[]
  bransch?:        string | null
  bokningsUrl?:    string
  harBokning:      boolean
  antalTjänster:   number
  antalPersonal:   number

  domäner:         { domän: string; verifierad: boolean; tillagd: string | null }[]

  /** Serverns datum, 'YYYY-MM-DD'. Skickas in så regeln går att prova. */
  idag:            string
}

const DAG = 86_400_000

function dygnSedan(datum: string | null, idag: string): number | null {
  if (!datum) return null
  const d = new Date(`${datum.slice(0, 10)}T12:00:00`).getTime()
  const n = new Date(`${idag}T12:00:00`).getTime()
  return Math.max(0, Math.round((n - d) / DAG))
}

/*
 * Hur gammal data får vara innan den räknas som stannad.
 *
 * Google räknar om sitt eget en gång per dygn och ligger dessutom två till tre
 * dagar efter för söktrafiken. Fyra dygn är alltså normalt slitage; fem är att
 * något gått sönder. Profilen och hemsidemätningen uppdateras snabbare, så där
 * räcker tre.
 */
const TAK = { sök: 5, profil: 3, hemsida: 3 }

export function kundstatus(u: Underlag): Fynd[] {
  const ut: Fynd[] = []

  /* Ett avslutat avtal ska inte larma om att det slutat leverera. Det är hela
     poängen med att det är avslutat. */
  if (u.avslutat) {
    return [{
      id: 'avslutat', allvar: 'info',
      rubrik: 'Avtalet är avslutat',
      följd:  'Sajten svarar inte längre och inga siffror hämtas. Allt ligger kvar och kommer tillbaka om avtalet öppnas igen.',
      åtgärd: 'Inget. Öppna avtalet på Konton om kunden hört av sig.',
    }]
  }

  /* ── Kunden har inte kommit igång ─────────────────────────────────────── */

  if (!u.onboardingKlar) {
    ut.push({
      id: 'onboarding', allvar: 'varning',
      rubrik: 'Registreringen är inte klar',
      följd:  'Kunden startade men kom aldrig i mål. De har ett konto och ingen sajt, och panelen skickar dem tillbaka till guiden varje gång de loggar in.',
      åtgärd: 'Hör av dig och fråga var det tog stopp. Fastnar flera på samma steg är det steget som är fel, inte kunderna.',
    })
  }

  if (!u.kopplad) {
    ut.push({
      id: 'ingen-google', allvar: 'varning',
      rubrik: 'Google är inte kopplat',
      följd:  'Rankningar, recensioner, annonser och besökssiffror står tomma. Halva produkten är osynlig för dem.',
      åtgärd: 'Kopplingen görs av kunden själv under Kopplingar — vi kan inte göra den åt dem. Ett samtal räcker oftast; de flesta vet inte att det tar en minut.',
    })
  }

  /* ── Kopplat, men något har slutat komma in ───────────────────────────── */

  if (u.kopplad) {
    const sök = dygnSedan(u.scSenaste, u.idag)

    if (!u.scSajt) {
      ut.push({
        id: 'ingen-sc-sajt', allvar: 'varning',
        rubrik: 'Ingen sökproperty vald',
        följd:  'Sidan Synlighet på Google är tom. Kunden ser inte vad folk söker på för att hitta dem.',
        åtgärd: 'Antingen har de ingen verifierad sajt i Search Console, eller flera och då väljer vi ingen med flit — vi vet inte vilken som är deras. Kolla vilka properties kontot har.',
      })
    } else if (sök === null) {
      ut.push({
        id: 'sok-aldrig', allvar: 'kritiskt',
        rubrik: 'Söksiffror har aldrig kommit in',
        följd:  'Kopplingen finns och en property är vald, men vi har inte en enda dag med data. Kunden ser en tom sida trots att allt ser kopplat ut.',
        åtgärd: 'Kör synken här nedanför och läs vad den svarar. Är sajten nyverifierad hos Google finns det ännu ingenting att hämta — då är det inget fel, bara för tidigt.',
      })
    } else if (sök > TAK.sök) {
      ut.push({
        id: 'sok-stannat', allvar: 'kritiskt',
        rubrik: `Söksiffrorna har stannat — senaste dygnet är ${sök} dagar gammalt`,
        följd:  'Kurvan ligger still i panelen. Kunden läser det som att ingen söker, inte som att vi slutat fråga.',
        åtgärd: 'Vanligaste orsaken är att kunden dragit tillbaka vår åtkomst i sitt Google-konto. Kör synken nedan: går den igenom var det ett tillfälligt fel, svarar den nej måste kunden koppla om.',
      })
    }

    if (!u.gbpPlats) {
      ut.push({
        id: 'ingen-gbp', allvar: 'varning',
        rubrik: 'Ingen Google-företagsprofil hittad',
        följd:  'Recensioner, inlägg och foton saknas. Det är den del av produkten en lokal salong har mest nytta av.',
        åtgärd: 'Antingen saknar kontot en företagsprofil, eller så är vår åtkomst till profil-API:et inte godkänd för det kontot. Kolla vilket innan du ringer.',
      })
    } else {
      const profil = dygnSedan(u.gbpSenaste, u.idag)
      if (profil !== null && profil > TAK.profil) {
        ut.push({
          id: 'gbp-stannat', allvar: 'kritiskt',
          rubrik: `Profilsiffrorna har stannat — ${profil} dagar sedan senaste hämtning`,
          följd:  'Nya recensioner dyker inte upp. En missnöjd kund kan ligga obesvarad i dagar utan att salongen vet om det.',
          åtgärd: 'Kör synken nedan. Håller felet i sig är åtkomsten borta och kunden behöver koppla om Google.',
        })
      }
    }

    if (u.ga4Property && !u.ga4Mätström) {
      ut.push({
        id: 'ingen-matstrom', allvar: 'kritiskt',
        rubrik: 'Hemsidan mäts inte',
        följd:  'Propertyn finns men saknar webbström, så taggen på sajten har inget att skicka till. Varje besök på kundens hemsida försvinner — och det går inte att hämta i efterhand.',
        åtgärd: 'Kunden behöver skapa en webbström i Google Analytics. Ju längre det dröjer desto mer historik är borta för alltid.',
      })
    } else if (!u.ga4Property) {
      ut.push({
        id: 'ingen-ga4', allvar: 'varning',
        rubrik: 'Ingen Analytics-property',
        följd:  'Besök på hemsidan står tom. Kunden ser inte om sajten vi byggt åt dem används.',
        åtgärd: 'De behöver skapa ett Analytics-konto — det är gratis — och koppla om.',
      })
    } else {
      const hemsida = dygnSedan(u.ga4Senaste, u.idag)
      if (hemsida !== null && hemsida > TAK.hemsida) {
        ut.push({
          id: 'ga4-stannat', allvar: 'kritiskt',
          rubrik: `Besökssiffrorna har stannat — ${hemsida} dagar sedan senaste hämtning`,
          följd:  'Kunden ser gamla siffror som om de vore dagens.',
          åtgärd: 'Kör synken nedan och läs svaret.',
        })
      }
    }

    if (!u.adsKonto) {
      ut.push({
        id: 'inget-adskonto', allvar: 'info',
        rubrik: 'Inget annonskonto valt',
        följd:  'Annonssidan är tom. Kör kunden inga annonser är det rätt.',
        åtgärd: 'Har de flera konton i sin åtkomst väljer vi inget med flit — en byrås konto skulle annars synas som deras. Behövs ett val får vi bygga det.',
      })
    }
  }

  /* ── Sajten ───────────────────────────────────────────────────────────── */

  const brister = sidansBrister({
    menuCategories: u.prislista,
    bransch:        u.bransch,
    bookingUrl:     u.bokningsUrl,
    harBokning:     u.harBokning,
  })

  if (u.sajtPublicerad) {
    for (const b of brister) {
      ut.push({
        id: `sajt-${b.id}`, allvar: 'kritiskt',
        rubrik: `Publicerad sajt: ${b.rubrik.toLowerCase()}`,
        följd:  b.följd,
        åtgärd: `Det står redan i deras panel. Hör av dig om det legat länge — ${b.åtgärd.charAt(0).toLowerCase()}${b.åtgärd.slice(1)}`,
      })
    }
  }

  /*
   * Tom tjänstelista.
   *
   * Sedan de två listorna blev en seedas ingenting vid registreringen: en tom
   * lista betyder att salongen inte satt sina priser, och det är hela hur
   * exempelläget känns igen numera.
   *
   * sidansBrister fångar det bara när det inte heller finns någon bokning —
   * den frågar om besökaren möter en återvändsgränd, och med bokningen påslagen
   * gör de inte det. Frågan här är en annan: får kunden det de betalar för.
   */
  if (u.antalTjänster === 0) {
    ut.push(u.sajtPublicerad
      ? {
          id: 'inga-tjanster-publicerad', allvar: 'kritiskt',
          rubrik: 'Sajten är publicerad utan priser',
          följd:  'Salongen har inte lagt upp en enda tjänst, så sajten har ingen prissida — och har de bokningssystemet går det inte att boka något heller. Besökaren möter en sida som beskriver en salong men inte säger vad något kostar.',
          åtgärd: 'Ring. De flesta har priserna i huvudet och behöver tio minuter, inte en förklaring. Det är det steg flest fastnar på.',
        }
      : {
          id: 'inga-tjanster-annu', allvar: 'varning',
          rubrik: 'Har inte lagt upp sina tjänster än',
          följd:  'Tjänstelistan är tom. Sajten är inte publicerad än, så ingen ser det — men den kan inte publiceras med priser förrän de finns.',
          åtgärd: 'Normalt för en ny kund. Ta upp det om det dröjer: sajten blir inte klar utan det.',
        })
  }

  for (const d of u.domäner) {
    if (d.verifierad) continue
    const dygn = dygnSedan(d.tillagd, u.idag)
    /* Ett dygn är rimlig väntan på att en DNS-ändring slår igenom. Längre än så
       betyder att någon aldrig gjorde ändringen. */
    if (dygn !== null && dygn >= 1) {
      ut.push({
        id: `doman-${d.domän}`, allvar: 'kritiskt',
        rubrik: `${d.domän} är inte verifierad — tillagd för ${dygn} dagar sedan`,
        följd:  'Kunden har lagt in sin domän hos oss och tror rimligen att sajten ligger där. Den som skriver adressen möter det som låg där förut, eller ingenting.',
        åtgärd: 'DNS-posterna är inte satta hos deras registrar. Ring — det här är det fel kunder blir argast över, och de vet oftast inte om att det inte är klart.',
      })
    }
  }

  /* ── Bokningssystemet ─────────────────────────────────────────────────── */

  if (u.harBokning) {
    if (u.antalTjänster === 0) {
      ut.push({
        id: 'inga-tjanster', allvar: 'kritiskt',
        rubrik: 'Bokningen är på men inga tjänster finns',
        följd:  'Bokningssidan öppnar och tar slut direkt — det finns ingenting att välja. Varje besökare som klickar Boka tid vänder i dörren.',
        åtgärd: 'Lägg upp tjänsterna åt dem, eller ring och gå igenom det tillsammans. Det tar tio minuter och är skillnaden mellan ett bokningssystem och en tom sida.',
      })
    }
    if (u.antalPersonal === 0) {
      ut.push({
        id: 'ingen-personal', allvar: 'varning',
        rubrik: 'Ingen personal upplagd',
        följd:  'Allt bokas på salongen som helhet. Det fungerar för en ensam frisör och blir fel så fort de är två.',
        åtgärd: 'Fråga hur många stolar de har. Är de flera bör personalen läggas upp innan kalendern fylls.',
      })
    }
  }

  /*
   * Logga saknas på en publicerad sajt.
   *
   * Inte trasigt — sajten och Google visar en bokstavsikon i salongens färger,
   * så ingen jordglob syns någonstans. Men en riktig logga är skillnaden mellan
   * "ett företag" och "det där stället jag känner igen", och salongen vet ofta
   * inte ens att ikonen i Googles sökresultat är deras att bestämma över.
   */
  if (u.sajtPublicerad && !u.harLogga) {
    ut.push({
      id: 'ingen-logga', allvar: 'info',
      rubrik: 'Ingen logga uppladdad',
      följd:  'Hemsidan och Googles sökresultat visar en bokstavsikon i salongens färger i stället för deras märke. Det fungerar — men känns igen gör det inte.',
      åtgärd: 'Nämn det vid nästa kontakt. Loggan laddas upp under Branding i webbplatspanelen och slår igenom överallt på en gång, ikonen i Google inräknad.',
    })
  }

  const rang: Record<Allvar, number> = { kritiskt: 0, varning: 1, info: 2 }
  return ut.sort((a, b) => rang[a.allvar] - rang[b.allvar])
}

/** Det värsta som hittades. Null när allt är som det ska. */
export function värstaLäget(fynd: Fynd[]): Allvar | null {
  if (fynd.some(f => f.allvar === 'kritiskt')) return 'kritiskt'
  if (fynd.some(f => f.allvar === 'varning'))  return 'varning'
  if (fynd.length) return 'info'
  return null
}
