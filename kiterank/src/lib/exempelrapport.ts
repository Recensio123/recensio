import { MOCK_BOOKINGS } from '@/app/(kiterank)/dashboard/bokningar/data'
import { månadsrader, type Rå } from '@/lib/bokningsstatistik'

/*
 * Månadsrapporten för exempelsalongen.
 *
 * Siffrorna är Studio Söders egna — samma kalender panelen visar i demoläget,
 * räknad om till en månad. De hittas inte på här: en rapport med andra tal än
 * dashboarden bredvid är det snabbaste sättet att förlora en kund som tittar
 * på båda, och den som upptäcker det slutar tro på resten också.
 *
 * Bokningarna räknas ur MOCK_BOOKINGS, som redan är exempelsalongens kalender
 * och som självtestet bevakar. Ändrar någon kalendern följer rapporten med.
 *
 * Övriga siffror står här som konstanter av ett tråkigare skäl: panelernas
 * exempeltal ligger i sexton olika filer, och fyra av dem beskriver en
 * rörmokare i Stockholm i stället för en frisörsalong på Södermalm. Att läsa
 * dem rakt av hade gett en rapport där bokningarna kommer från en salong och
 * annonserna från ett rörföretag. Talen nedan är valda så att de stämmer med
 * de siffror panelerna redan är överens om — 47 omdömen, 4,2 i betyg, 8 400
 * visningar, sökordet "frisör södermalm" — och resten är byggda kring dem.
 *
 * PLANEN OCH BUDGETEN är däremot påhittade med flit. Den delen bygger på
 * annonsdata vi inte har än, och den är dessutom förslaget kunden ska ta
 * ställning till — inte ett resultat vi påstår oss ha mätt.
 */

export type Rapportdata = {
  salong:  { namn: string; ort: string; period: string }
  bokning: { antal: number; värde: number; föregående: number; genomförda: number; uteblivna: number }
  annons:  { kostnad: number; klick: number; cpc: number; stoppat: { fras: string; kostnad: number }[] }
  profil:  { betyg: number; omdömen: number; nya: number; besvarade: number; visningar: number; samtal: number; vägbeskrivningar: number; webbklick: number }
  sökord:  { fras: string; position: number; förändring: number; visningar: number }[]
  gjort:   string[]
  plan:    { rubrik: string; text: string }[]
  budget:  { nu: number; föreslagen: number; motivering: string }
}

/** Månaden rapporten handlar om — den som gått, inte den som börjat. */
function förraMånaden(nu: Date): { nyckel: string; text: string } {
  const d = new Date(nu.getFullYear(), nu.getMonth() - 1, 1)
  return {
    nyckel: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    text:   d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' }),
  }
}

/** Bokningarna för en månad, räknade ur exempelsalongens kalender. */
function bokningarFör(nyckel: string) {
  const rå: Rå[] = MOCK_BOOKINGS.map(b => ({
    datum: b.date, status: b.status, pris: b.price ?? 0, minuter: b.duration ?? 0,
  }))
  const rad = månadsrader(rå, nyckel, nyckel)[0]
  return rad ?? { antal: 0, värde: 0, genomförda: 0, uteblivna: 0, avbokade: 0 }
}

export function exempelrapport(nu: Date = new Date()): Rapportdata {
  const månad = förraMånaden(nu)
  const denna = bokningarFör(månad.nyckel)

  const förraNyckel = (() => {
    const d = new Date(nu.getFullYear(), nu.getMonth() - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const förra = bokningarFör(förraNyckel)

  return {
    salong: { namn: 'Studio Söder', ort: 'Södermalm, Stockholm', period: månad.text },

    bokning: {
      antal:      denna.antal,
      värde:      denna.värde,
      föregående: förra.antal,
      genomförda: denna.genomförda,
      uteblivna:  denna.uteblivna,
    },

    /* Annonssiffrorna följer panelernas nivå — 3 200 kr i månaden — men är
       skrivna för en salong och inte för det rörföretag som ligger i
       paid-search-exemplet. */
    annons: {
      kostnad: 3_200,
      klick:   312,
      cpc:     10,
      stoppat: [
        { fras: 'frisörutbildning stockholm', kostnad: 410 },
        { fras: 'klippa håret själv',          kostnad: 265 },
        { fras: 'billig frisör',               kostnad: 180 },
      ],
    },

    profil: {
      betyg: 4.2, omdömen: 47, nya: 3, besvarade: 3,
      visningar: 8_400, samtal: 124, vägbeskrivningar: 98, webbklick: 90,
    },

    sökord: [
      { fras: 'frisör södermalm',       position: 3.2, förändring:  1.4, visningar: 1_240 },
      { fras: 'balayage stockholm',     position: 7.8, förändring:  2.1, visningar:   860 },
      { fras: 'slingor södermalm',      position: 5.1, förändring: -0.3, visningar:   420 },
      { fras: 'keratinbehandling',      position: 11.4, förändring: 3.0, visningar:   310 },
      { fras: 'frisör nära mig',        position: 14.2, förändring: 0.8, visningar: 2_100 },
    ],

    gjort: [
      '12 foton uppladdade på Google-profilen — lokalen och sex arbeten',
      '4 inlägg publicerade: höstfärger, ny keratinbehandling, lediga tider, öppettider allhelgonahelgen',
      '3 nya omdömen besvarade, samtliga inom ett dygn',
      '3 sökord pausade som kostat utan att ge en enda bokning',
      'Prislistan uppdaterad med de två nya behandlingarna',
      'Genomgång av texten på balayage-sidan — rubriken skriven för hur folk faktiskt söker',
    ],

    /* Förslaget, inte ett resultat. Den här delen bygger på annonsdata vi inte
       har än och är dessutom det kunden ska ta ställning till. */
    plan: [
      {
        rubrik: 'Flytta budget från "frisör nära mig" till balayage',
        text:   'Det breda sökordet ger flest visningar och minst bokningar. Balayage ligger på plats 7,8 och rör sig uppåt — där finns nästa vinst, och det är dessutom er dyraste behandling.',
      },
      {
        rubrik: 'Egen sida för keratinbehandling',
        text:   'Sökordet ger 310 visningar i månaden men ni landar på plats 11 med en delad tjänstesida. En egen sida är den enskilt största vinsten ni kan göra på sajten den här månaden.',
      },
      {
        rubrik: 'Utskick till kunder som inte varit här sedan i våras',
        text:   'Ett trettiotal personer i registret var här senast i mars eller april. Ett kort erbjudande i mitten av månaden, när kalendern är som glesast.',
      },
    ],

    budget: {
      nu:         3_200,
      föreslagen: 3_200,
      motivering: 'Oförändrad. Ni fyller redan kalendern de dagar annonserna går, och mer budget hade gett fler klick på tider ni inte kan ta emot. Vi flyttar pengarna mellan sökorden i stället.',
    },
  }
}
