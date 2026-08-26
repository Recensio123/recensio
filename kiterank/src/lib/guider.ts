import { BRANSCHGUIDER } from '@/lib/guiderBransch'
import { EXTRA_AMNEN } from '@/lib/guiderAmnen'

/*
 * Guiderna — vårt eget innehåll, och vår egen synlighet.
 *
 * Två syften som drar åt samma håll. Det första är att en salongsägare som
 * googlar "få fler kunder till salongen" ska hitta oss innan de hittar en
 * byrå; det andra är att den som redan är kund ska kunna slå upp hur något
 * fungerar utan att skriva till supporten.
 *
 * ─── Så är biblioteket byggt ───────────────────────────────────────────
 *
 * En pelare, nio ämnesguider, sex branschguider.
 *
 *   PELAREN är den breda: hur en salong får fler kunder, med ett avsnitt per
 *   område. Varje avsnitt slutar med en länk vidare.
 *
 *   ÄMNESGUIDERNA är djupdykningarna pelaren länkar till — en per område.
 *
 *   BRANSCHGUIDERNA är skrivna för en bransch i taget och bär det som bara
 *   gäller den: sökorden deras kunder skriver, säsongen de lever med, hur
 *   priset brukar sättas och frågan kunden googlar strax innan de bokar.
 *   De bor i guiderBransch.ts, och de fyra ämnen som växte fram ur dem —
 *   priser, bilder, återkommande kunder och säsong — i guiderAmnen.ts.
 *
 * Det är ingen slump att det ser ut så. En bred sida som länkar ned till
 * djupare sidor, och djupare sidor som länkar tillbaka, är det Google förstår
 * bäst — och det är dessutom hur en läsare vill röra sig: överblick först,
 * detaljer när de behöver dem.
 *
 * ─── Källorna ──────────────────────────────────────────────────────────
 *
 * Fem personer, och bara dessa fem, ligger till grund för råden här:
 *
 *   Joy Hawkins      — Google-företagsprofilen och lokal SEO
 *   Darren Shaw      — lokala rankningsfaktorer, kataloger och omdömen
 *   Greg Gifford     — lokal SEO för små tjänsteföretag
 *   Mike Blumenthal  — omdömen och hur folk söker lokalt
 *   Brad Geddes      — Google Ads
 *
 * Inga citat och inga siffror tillskrivs dem. Det som står här är principer
 * deras publicerade arbete vilar på, skrivna med våra ord för en läsare som
 * klipper hår för sitt levebröd. Ett påstående vi inte kan belägga hos någon
 * av de fem hör inte hemma i en guide.
 *
 * ─── Reglerna för vad som får stå ──────────────────────────────────────
 *
 *   Inga löften om placeringar. Den som lovar förstaplats på Google ljuger,
 *   och läsaren vet det.
 *
 *   Artikeln ska gå att följa utan att köpa något. Den som gör allt själv och
 *   aldrig blir kund har ändå läst något vi skrivit, och det är så den här
 *   sortens synlighet byggs.
 *
 *   Sökorden står i koden intill varje guide. En artikel utan ett uttalat
 *   sökord är en artikel ingen bett om.
 */

export type Stycke =
  | { sort: 'text'; text: string }
  | { sort: 'rubrik'; text: string }
  | { sort: 'lista'; poster: string[] }
  | { sort: 'ruta'; rubrik: string; text: string }
  /** Länk vidare till en djupare guide. Avslutar ett avsnitt i pelaren. */
  | { sort: 'vidare'; till: string; text: string }

export type Guidesort = 'pelare' | 'amne' | 'bransch'

export type Guide = {
  slug:      string
  sort:      Guidesort
  titel:     string
  ingress:   string
  /** Vad sidan heter i Googles resultat. Kortare och mer sökordsnära. */
  metaTitel: string
  metaText:  string
  amne:      string
  minuter:   number
  publicerad: string
  /*
   * Färg och bild, för pelaren och ämnesguiderna.
   *
   * Abstrakta bilder av samma skäl som kundernas exempelbilder är abstrakta:
   * de håller ihop layouten utan att påstå något, och de är uppenbart våra.
   * Stockfoton vore dessutom ohederligt — vi har just publicerat en guide som
   * säger åt salonger att aldrig använda sådana.
   *
   * Branschguiderna saknar båda med flit. De ligger i en egen rad där man
   * väljer sin bransch, och där vore en bild bara brus.
   */
  farg?:     string
  bild?:     string
  /** Sökorden sidan är skriven för. Det första är huvudordet. */
  sokord:    string[]
  innehall:  Stycke[]
}

/** Källorna, en gång. Visas sist i varje guide. */
export const KALLOR = [
  { namn: 'Joy Hawkins',     om: 'Google-företagsprofilen och lokal SEO' },
  { namn: 'Darren Shaw',     om: 'lokala rankningsfaktorer och omdömen' },
  { namn: 'Greg Gifford',    om: 'lokal SEO för små tjänsteföretag' },
  { namn: 'Mike Blumenthal', om: 'omdömen och lokalt sökbeteende' },
  { namn: 'Brad Geddes',     om: 'Google Ads' },
]

/* ═══════════════════════════════════════════════════════════════════════
   PELAREN
   ═══════════════════════════════════════════════════════════════════════ */

const PELARE: Guide = {
  slug:      'fler-kunder-till-salongen',
  farg:      '#f0b429',
  bild:      '/guider/oversikt.svg',
  sort:      'pelare',
  titel:     'Så får din salong fler kunder — hela guiden',
  metaTitel: 'Fler kunder till salongen — komplett guide 2026',
  metaText:  'Allt som avgör om nya kunder hittar din salong: Google-profilen, omdömena, sökningen, hemsidan och annonserna. Konkret, i ordning, utan jargong.',
  ingress:   'Nästan alla som ska boka en tid börjar i samma ruta: Google. Den här guiden går igenom vad som avgör om de hittar just er — område för område, i den ordning de är värda att ta.',
  amne:      'Översikt',
  minuter:   12,
  publicerad: '2026-08-26',
  sokord: [
    'fler kunder till salongen',
    'marknadsföring för salonger',
    'få fler kunder frisörsalong',
    'synas på google salong',
    'marknadsföring frisör',
  ],
  innehall: [
    { sort: 'text', text: 'Det finns ingen enskild knapp som ger fler kunder. Men det finns fem saker som avgör nästan allt, och de är olika mycket värda. Tar man dem i fel ordning lägger man pengar på annonser som leder till en sida ingen bokar från, eller tid på en hemsida ingen hittar.' },
    { sort: 'text', text: 'Ordningen nedan är den ordning de är värda att ta. Varje avsnitt går att göra klart på en eftermiddag, och varje avsnitt har en egen guide om ni vill gå djupare.' },

    { sort: 'rubrik', text: '1. Google-företagsprofilen — börja här' },
    { sort: 'text', text: 'När någon söker på "frisör" och en ort visar Google tre företag på en karta, ovanför alla vanliga träffar. De tre får merparten av klicken, och profilen är det enda som avgör vilka tre det blir. Den är också gratis.' },
    { sort: 'text', text: 'De flesta salonger har en profil men rör den aldrig. Kategorin är fel eller för bred, bilderna är tre stycken från när de öppnade, och den senaste uppdateringen är två år gammal. Att rätta det tar en eftermiddag och är det billigaste ni kan göra för er synlighet.' },
    { sort: 'lista', poster: [
      'Huvudkategorin ska beskriva det ni tjänar mest pengar på — inte det bredaste ni hittar',
      'Bilder på lokalen, teamet och era arbeten, påfyllda löpande',
      'Öppettider, telefon och tjänster ifyllda och riktiga',
      'Ett inlägg i veckan räcker för att profilen ska se levande ut',
    ]},
    { sort: 'vidare', till: 'fler-bokningar-fran-google', text: 'Läs hela guiden om Google-företagsprofilen' },

    { sort: 'rubrik', text: '2. Omdömena — det andra som avgör ordningen' },
    { sort: 'text', text: 'Två salonger på samma gata med samma kategori sorteras av omdömena. Både hur många ni har och hur nya de är väger, och takten väger tyngre än totalen: fyrtio omdömen där hälften är från i år står starkare än hundratjugo där det senaste är två år gammalt.' },
    { sort: 'text', text: 'Det som skiljer salonger med många omdömen från salonger med få är sällan kvaliteten på arbetet. Det är att den ena frågar och den andra hoppas.' },
    { sort: 'ruta', rubrik: 'Svara på alla, särskilt de sura', text: 'Ett sakligt svar på ett dåligt omdöme läses av alla som kommer efter — och det är dem ni skriver för, inte för den missnöjda kunden. En obesvarad enstjärnig recension gör mer skada än själva klagomålet.' },
    { sort: 'vidare', till: 'fler-omdomen-till-salongen', text: 'Läs hela guiden om omdömen' },

    { sort: 'rubrik', text: '3. Synligheten i sök — bortom kartan' },
    { sort: 'text', text: 'Kartan är en del av Google. Den andra delen är de vanliga träffarna, och där avgörs synligheten av vad som står på er hemsida och av vad andra sajter säger om er.' },
    { sort: 'text', text: 'Det viktigaste enskilda greppet är enkelt: ge varje behandling en egen sida. Den som söker på "balayage" vill inte landa på en allmän startsida, och Google har inget att matcha sökningen mot om balayage bara är en rad i en prislista.' },
    { sort: 'text', text: 'Sedan kommer uppgifterna om er utanför den egna sajten — namn, adress och telefonnummer på kataloger, kartor och branschsidor. De behöver stämma överens överallt. Står ni med tre olika telefonnummer på fyra ställen blir Google osäker på vilket som gäller, och osäkerhet kostar placeringar.' },
    { sort: 'vidare', till: 'synas-hogre-i-lokal-sok', text: 'Läs hela guiden om lokal SEO' },

    { sort: 'rubrik', text: '4. Hemsidan — där beslutet fattas' },
    { sort: 'text', text: 'Besökaren kommer nästan alltid från Google, har redan sett er profil, och har en enda fråga kvar: är det här rätt ställe för mig? De ger er några sekunder att svara.' },
    { sort: 'text', text: 'Två saker fäller fler salongshemsidor än allt annat: inga utskrivna priser, och ingen bokning som går att göra på kvällen. Den som inte hittar priset går till en salong som skrivit ut sitt, och den som vill boka klockan nio på kvällen bokar inte alls om det bara står ett telefonnummer.' },
    { sort: 'vidare', till: 'vad-en-salongshemsida-behover', text: 'Läs hela guiden om salongshemsidan' },

    { sort: 'rubrik', text: '5. Annonserna — sist, inte först' },
    { sort: 'text', text: 'Annonser fungerar. Men de fungerar bara ovanpå det andra: en annons leder till en sida, och är sidan otydlig betalar ni för besök som inte blir bokningar. Därför kommer de sist i den här listan.' },
    { sort: 'text', text: 'När grunden är på plats är annonser det snabbaste sättet att fylla en lucka i kalendern. Nyckeln är att köpa få och rätt sökord — de som beskriver en behandling plus en plats — och att stänga av de breda innan de hinner äta budgeten.' },
    { sort: 'vidare', till: 'google-annonser-for-salonger', text: 'Läs hela guiden om Google Ads för salonger' },

    { sort: 'rubrik', text: 'Och en sak som inte står med här' },
    { sort: 'text', text: 'Sociala medier. Inte för att de är oviktiga, utan för att de gör något annat: de håller kvar dem som redan varit hos er. Ny synlighet kommer från Google. Har ni begränsat med tid är det den ordningen som gäller — Google först, Instagram när det finns tid över.' },

    { sort: 'rubrik', text: 'Om ni bara gör en sak den här veckan' },
    { sort: 'text', text: 'Öppna er Google-företagsprofil och titta på tre saker: står rätt huvudkategori, finns det bilder från i år, och är det senaste omdömet besvarat? Det tar tio minuter och flyttar fler salonger uppåt än något annat på listan.' },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════
   ÄMNESGUIDERNA
   ═══════════════════════════════════════════════════════════════════════ */

const AMNEN: Guide[] = [
  {
    slug:      'fler-bokningar-fran-google',
  farg:      '#38bdf8',
  bild:      '/guider/google-profil.svg',
    sort:      'amne',
    titel:     'Google-företagsprofilen för salonger',
    metaTitel: 'Google företagsprofil för salong — så syns du på kartan',
    metaText:  'Konkret guide: kategori, bilder, inlägg och frågor på din Google-företagsprofil — så hamnar salongen bland de tre på kartan.',
    ingress:   'De flesta som letar efter en frisör, nagelterapeut eller massör börjar på Google — och de flesta bokar hos någon av de tre som visas överst på kartan. Här är vad som faktiskt avgör vem de tre blir.',
    amne:      'Google-profilen',
    minuter:   8,
    publicerad: '2026-08-26',
    sokord: [
      'google företagsprofil salong',
      'google business profile frisör',
      'synas på google maps salong',
      'google företagsprofil kategori',
      'lägga upp bilder google företagsprofil',
    ],
    innehall: [
      { sort: 'text', text: 'När någon söker "frisör" plus en ort visar Google tre företag på en karta, långt ovanför de vanliga träffarna. Att komma dit är inte en fråga om tur, och inte heller om att betala — det handlar om ett fåtal saker som ni kan påverka själva, och som de flesta salonger struntar i.' },

      { sort: 'rubrik', text: 'Profilen är er viktigaste sida — inte hemsidan' },
      { sort: 'text', text: 'Många lägger tid och pengar på hemsidan och rör aldrig sin företagsprofil. Det är bakvänt. Profilen är det första en kund ser, den visas oftare än hemsidan, och den innehåller allt kunden behöver för att bestämma sig: bilder, betyg, öppettider och ett telefonnummer.' },
      { sort: 'text', text: 'Hemsidan spelar roll — men i andra hand, som det ni länkar till från profilen och som det Google läser för att förstå vad ni erbjuder.' },

      { sort: 'rubrik', text: 'Kategorin avgör vilka sökningar ni ens är med i' },
      { sort: 'text', text: 'Huvudkategorin är den enskilt starkaste signalen om vad ni är. En salong som står som "Skönhetssalong" när verksamheten i praktiken är fransförlängning tävlar i fel klass, och kommer aldrig upp på de sökningar som gäller.' },
      { sort: 'text', text: 'Välj den kategori som beskriver det ni tjänar mest pengar på, inte den bredaste ni hittar. Lägg sedan till underkategorier för det övriga. Bredd i huvudkategorin gör er inte synligare — den gör er otydligare.' },
      { sort: 'ruta', rubrik: 'Testa er kategori', text: 'Sök på er huvudtjänst plus orten i ett inkognitofönster. Dyker det upp salonger som gör något annat än ni? Då konkurrerar ni om fel sökning, och kategorin är oftast förklaringen.' },

      { sort: 'rubrik', text: 'Bilder är det som får någon att välja er framför grannen' },
      { sort: 'text', text: 'Två salonger med samma betyg och samma avstånd är inte likvärdiga i kundens ögon om den ena har tolv bilder på lokalen och arbeten och den andra har tre suddiga från 2019.' },
      { sort: 'lista', poster: [
        'Fotografera lokalen — entrén, stolarna, väntytan. Kunden vill veta hur det ser ut innan de kommer.',
        'Lägg upp arbeten löpande, inte i en klump en gång per år. Färska bilder väger tyngre än gamla.',
        'Ta med teamet. Ansikten gör en salong till en plats man vågar gå in på.',
        'Undvik stockbilder helt. De känns igen, och de säger till kunden att ni inte brytt er.',
      ]},

      { sort: 'rubrik', text: 'Inlägg och frågor: det som håller profilen levande' },
      { sort: 'text', text: 'Google visar oftare profiler som uppdateras. Ett inlägg i veckan om en ny behandling, en lucka på fredag eller en säsongskampanj räcker. Det behöver inte vara påkostat — det behöver vara regelbundet.' },
      { sort: 'text', text: 'Frågor och svar är underskattade. Vem som helst kan ställa en fråga på er profil, och vem som helst kan svara — även någon som inte jobbar hos er. Lägg upp de vanligaste frågorna själva med korrekta svar, så står rätt information där när någon undrar.' },

      { sort: 'rubrik', text: 'Tjänster och egenskaper' },
      { sort: 'text', text: 'Fyll i tjänstelistan med era faktiska behandlingar och priser. Den används när Google matchar er mot mer specifika sökningar, och den syns för kunden innan de klickat sig vidare. Egenskaper som "bokning online" och "tillgänglig entré" är små men de besvarar frågor som annars stoppar ett besök.' },

      { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
      { sort: 'lista', poster: [
        'Kontrollera huvudkategorin. Beskriver den det ni faktiskt lever på?',
        'Räkna era bilder. Färre än tio, eller inga från i år? Fotografera i morgon.',
        'Skriv ett inlägg. Vad som helst som är sant och aktuellt.',
        'Lägg upp fem vanliga frågor med era egna svar.',
      ]},
      { sort: 'vidare', till: 'fler-omdomen-till-salongen', text: 'Nästa steg: omdömena, som avgör ordningen mellan er och grannen' },
    ],
  },

  {
    slug:      'fler-omdomen-till-salongen',
  farg:      '#fb7185',
  bild:      '/guider/omdomen.svg',
    sort:      'amne',
    titel:     'Fler omdömen — och vad du svarar när de kommer',
    metaTitel: 'Så får salongen fler Google-omdömen (och svarar rätt)',
    metaText:  'Praktisk metod för att be om omdömen utan att det känns påträngande, plus hur du svarar på både beröm och kritik.',
    ingress:   'Omdömen är det enda på din profil som andra skriver åt dig. Därför väger de tyngst — och därför är de också det svåraste att påverka. Här är metoden som fungerar.',
    amne:      'Omdömen',
    minuter:   7,
    publicerad: '2026-08-26',
    sokord: [
      'fler google omdömen',
      'be kunder om recension',
      'svara på dåliga omdömen',
      'google recensioner företag',
      'omdömen frisörsalong',
    ],
    innehall: [
      { sort: 'text', text: 'Nästan alla salongsägare vet att de borde ha fler omdömen. Nästan ingen har ett system för att få dem. Skillnaden mellan salongen med 15 omdömen och den med 150 är sällan kvaliteten på arbetet — den är att den ena frågar och den andra hoppas.' },

      { sort: 'rubrik', text: 'Fråga samma dag, inte samma vecka' },
      { sort: 'text', text: 'Nöjdheten är som störst när kunden går ut genom dörren och ser sig själv i skyltfönstret. Ett dygn senare är den kvar men blek; en vecka senare är besöket något som hände.' },
      { sort: 'text', text: 'Skicka därför frågan samma kväll. Kort text, en länk, ingen förklaring om varför det är viktigt för er — kunden gör er en tjänst, och en tjänst ska vara lätt att göra.' },

      { sort: 'rubrik', text: 'Gör vägen så kort att den inte går att tappa bort' },
      { sort: 'lista', poster: [
        'Länka direkt till omdömesformuläret, inte till er profil.',
        'Skicka i den kanal kunden redan bokade i — SMS öppnas i princip alltid, e-post ofta inte.',
        'Fråga en gång. En påminnelse är acceptabel, två är påträngande.',
        'Be aldrig om "ett bra omdöme". Be om ett omdöme. Det andra är både förbjudet och genomskinligt.',
      ]},

      { sort: 'rubrik', text: 'Be inte alla — be de rätta' },
      { sort: 'text', text: 'Den som kommit tredje gången är en bättre kandidat än den som var här första gången och verkade tveksam. Ett systematiskt "alla får frågan" ger fler omdömen; ett urval ger bättre. Börja med urvalet tills ni har trettio, gå sedan över till alla.' },

      { sort: 'rubrik', text: 'Svaret är skrivet för nästa kund, inte för den som klagade' },
      { sort: 'text', text: 'Det här är den enskilt vanligaste missen. Ett svar på ett dåligt omdöme läses av hundratals personer som överväger att boka, och av en person som redan är missnöjd. Skriv för de hundra.' },
      { sort: 'lista', poster: [
        'Tacka för att de hörde av sig, utan ironi.',
        'Beklaga upplevelsen — inte nödvändigtvis handlingen, om ni inte håller med.',
        'Säg vad ni gör åt det, konkret.',
        'Erbjud att ta det vidare utanför tråden, med en riktig kontaktväg.',
        'Håll det under fyra meningar. Långa svar läses som försvarstal.',
      ]},
      { sort: 'ruta', rubrik: 'Aldrig detta', text: 'Skriv aldrig ut vad kunden köpt, när de var där eller något annat om deras besök. Det är deras uppgifter, inte era att publicera — och det är dessutom det snabbaste sättet att förvandla ett klagomål till en skandal.' },

      { sort: 'rubrik', text: 'Positiva omdömen förtjänar också svar' },
      { sort: 'text', text: 'Ett kort tack räcker, men det ska vara personligt nog att synas som skrivet av en människa. Salonger som svarar på allt signalerar närvaro, och närvaro är precis vad någon letar efter när de väljer var de ska lämna sitt hår i två timmar.' },

      { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
      { sort: 'lista', poster: [
        'Hämta er omdömeslänk och spara den där ni når den på tre sekunder.',
        'Bestäm vem som frågar och när — annars blir det ingen.',
        'Svara på allt som står obesvarat i dag.',
        'Sätt ett mått: antal omdömen per månad, inte totalen. Det är takten som räknas.',
      ]},
      { sort: 'vidare', till: 'synas-hogre-i-lokal-sok', text: 'Nästa steg: synligheten utanför kartan' },
    ],
  },

  {
    slug:      'synas-hogre-i-lokal-sok',
  farg:      '#a78bfa',
  bild:      '/guider/lokal-seo.svg',
    sort:      'amne',
    titel:     'Lokal SEO för salonger — synas högre i sök',
    metaTitel: 'Lokal SEO för salong — ranka högre på Google lokalt',
    metaText:  'Vad som avgör var salongen hamnar i lokal sökning: egna tjänstesidor, enhetliga uppgifter, sökord med plats och vad grannarna gör bättre.',
    ingress:   'Kartan är en del av Google. Den andra delen är de vanliga träffarna — och där avgörs allt av vad som står på er egen sajt och vad andra sidor säger om er.',
    amne:      'Lokal SEO',
    minuter:   13,
    publicerad: '2026-08-26',
    sokord: [
      'lokal seo',
      'ranka högre på google lokalt',
      'sökord frisörsalong',
      'seo för salonger',
      'synas på google utan att betala',
    ],
    innehall: [
      { sort: 'text', text: 'Lokal SEO låter tekniskt men är det knappt. Det handlar om tre saker: att ni har en sida per sak ni säljer, att era uppgifter ser likadana ut överallt, och att andra sidor nämner er.' },

      { sort: 'rubrik', text: 'En egen sida per behandling' },
      { sort: 'text', text: 'Det här är den största vinsten en salong kan göra på sin egen sajt, och den är också den mest ignorerade. De flesta salongshemsidor har tre sidor och tjugo behandlingar. Google har då inget att matcha "balayage södermalm" mot, mer än en prislista där ordet står en gång.' },
      { sort: 'text', text: 'En egen sida per behandling gör två saker samtidigt: den svarar exakt på det besökaren sökte, och den ger Google något konkret att visa. Sidan behöver inte vara lång — vad behandlingen är, vad den kostar, hur lång tid den tar, vem som gör den och en bokningsknapp.' },
      { sort: 'lista', poster: [
        'Börja med de tre behandlingar ni tjänar mest på',
        'Använd orden kunderna själva använder, inte facktermerna',
        'Skriv ut priset, även ungefärligt',
        'Lägg bilder på ert eget arbete, inte köpta',
      ]},

      { sort: 'rubrik', text: 'Samma uppgifter överallt' },
      { sort: 'text', text: 'Namn, adress och telefonnummer ska stå identiskt på er sajt, på Google-profilen och på de kataloger där ni finns. Har ni bytt lokal eller nummer någon gång ligger de gamla uppgifterna kvar på ställen ni glömt, och varje motsägelse gör Google mindre säker på vem ni är.' },
      { sort: 'text', text: 'Gå igenom det en gång ordentligt: sök på ert salongsnamn, era gamla nummer och er gamla adress, och rätta det ni hittar. Det är tråkigt arbete som ger mer än de flesta tror.' },

      { sort: 'rubrik', text: 'Ortsnamnet hör hemma i texten' },
      { sort: 'text', text: 'Rubriken på startsidan ska säga vad ni är och var ni finns. "Frisörsalong i Gamla stan" gör mer nytta än en poetisk mening om skönhet — för besökaren, som vill veta om det är nära, och för Google, som annars får gissa.' },
      { sort: 'ruta', rubrik: 'Stadsdelen slår staden', text: 'Konkurrensen om "frisör stockholm" är stenhård och sökaren kan vara fem mil bort. "Frisör södermalm" är färre sökningar men rätt personer — och betydligt lättare att synas på.' },

      { sort: 'rubrik', text: 'Andra sidor som nämner er' },
      { sort: 'text', text: 'Lokala kataloger, branschregister, kommunens företagslista, samarbeten med grannbutiker. Varje ställe som nämner ert namn och er adress är en liten bekräftelse på att ni finns. Det behöver inte vara många, men de ska vara riktiga — köpta länkar från sidor ingen läser gör mer skada än nytta.' },

      { sort: 'rubrik', text: 'De tre sakerna Google väger' },
      { sort: 'text', text: 'Lokal sökning avgörs av tre saker, och det är värt att veta vilken av dem ni kan påverka.' },
      { sort: 'lista', poster: [
        'Relevans — hur väl ni matchar det som söks. Kategorin, tjänsterna och texten på sidan styr den',
        'Avstånd — hur nära den som söker befinner sig. Den kan ni inte påverka alls',
        'Prominens — hur känt och etablerat företaget verkar. Omdömen, omnämnanden och sidans styrka styr den',
      ]},
      { sort: 'text', text: 'Att avståndet är oföränderligt är befriande snarare än nedslående: det betyder att striden står mellan er och de salonger som ligger ungefär lika nära, och där avgör de två andra. Ingen vinner på att försöka synas i en stadsdel de inte finns i.' },

      { sort: 'rubrik', text: 'Sökordet ska vara det kunden skriver' },
      { sort: 'text', text: 'Den vanligaste texten på en salongssida är skriven på branschspråk. "Vi erbjuder avancerade färgtekniker" fångar ingen sökning. "Balayage" gör det, för det är ordet kunden skriver.' },
      { sort: 'lista', poster: [
        'Skriv behandlingens vanligaste namn, inte leverantörens produktnamn',
        'Ta med varianterna: slingor och highlights söks av olika personer',
        'Lägg orten eller stadsdelen i rubriken, inte bara i sidfoten',
        'Skriv som ni pratar i stolen. Den texten matchar hur folk söker',
      ]},

      { sort: 'rubrik', text: 'Rubrik och beskrivning i sökresultatet' },
      { sort: 'text', text: 'Två rader text avgör om någon klickar på er eller på salongen under. De styrs av sidans titel och beskrivning, och de är oftast helt bortglömda — många salongssidor har samma titel på varenda sida.' },
      { sort: 'text', text: 'Ge varje sida en egen titel som säger vad sidan handlar om plus var ni finns, och en beskrivning som ger en anledning att klicka: pris, att bokning finns online, eller att konsultation ingår.' },

      { sort: 'rubrik', text: 'Sidan måste fungera i telefonen' },
      { sort: 'text', text: 'De allra flesta lokala sökningar görs i mobilen, ofta stående på gatan. Är sidan långsam eller kräver den att man zoomar för att läsa priset, spelar det ingen roll hur bra texten är — besökaren är borta innan de läst den.' },
      { sort: 'ruta', rubrik: 'Testa själv, på riktigt', text: 'Öppna er sida i mobilen på mobildata, inte på salongens wifi. Räkna sekunderna tills priset syns. Är det mer än tre är hastigheten ert största problem, inte sökorden.' },

      { sort: 'rubrik', text: 'Titta på vad grannarna gör' },
      { sort: 'text', text: 'Sök på era viktigaste behandlingar plus orten och se vilka tre som ligger överst. Öppna deras profiler och deras sajter. Har de fler bilder? Fler omdömen? Egna sidor per behandling? Skillnaden mellan er och dem är oftast inte hemlig — den står utskriven.' },

      { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
      { sort: 'lista', poster: [
        'Ge er största behandling en egen sida.',
        'Sök på ert eget namn och rätta alla gamla uppgifter ni hittar.',
        'Skriv om startsidans rubrik så att ort och verksamhet står i den.',
        'Öppna de tre som ligger över er och skriv ned vad de har som ni saknar.',
      ]},
      { sort: 'vidare', till: 'vad-en-salongshemsida-behover', text: 'Nästa steg: vad hemsidan måste innehålla' },
    ],
  },

  {
    slug:      'vad-en-salongshemsida-behover',
  farg:      '#2dd4bf',
  bild:      '/guider/hemsida.svg',
    sort:      'amne',
    titel:     'Vad en salongshemsida faktiskt behöver innehålla',
    metaTitel: 'Hemsida för salong: vad den måste innehålla för att ge bokningar',
    metaText:  'De sex delarna som avgör om besökaren bokar eller går vidare — och de vanligaste misstagen på salongshemsidor.',
    ingress:   'En salongshemsida har ett jobb: förvandla någon som är nyfiken till någon som har bokat en tid. Det mesta som brukar hamna på sådana sidor bidrar inte till det.',
    amne:      'Hemsidan',
    minuter:   7,
    publicerad: '2026-08-26',
    sokord: [
      'hemsida frisörsalong',
      'salongshemsida',
      'boka tid online frisör',
      'hemsida skönhetssalong',
      'vad ska en hemsida innehålla',
    ],
    innehall: [
      { sort: 'text', text: 'Besökaren kommer nästan alltid från Google, har redan sett er profil, och har en enda fråga kvar: är det här rätt ställe för mig? De ger er några sekunder att svara. Allt på sidan ska tjäna det svaret.' },

      { sort: 'rubrik', text: '1. Vad ni gör och var — högst upp, i klartext' },
      { sort: 'text', text: 'Rubriken ska säga vad ni är och var ni finns. Sparar ni orten till kontaktsidan har ni gjort det svårare för både besökaren och Google.' },

      { sort: 'rubrik', text: '2. Priser, utskrivna' },
      { sort: 'text', text: 'Att inte skriva ut priser är det vanligaste misstaget på salongshemsidor. Tanken är att kunden ska höra av sig; det som faktiskt händer är att de går till en salong som skrivit ut sina. Priser sorterar dessutom bort fel kunder innan de bokar, vilket är en tjänst mot er själva.' },
      { sort: 'text', text: 'Är priset beroende av hårlängd eller tidsåtgång — skriv "från" och ett spann. Ett ungefärligt pris är oändligt mycket bättre än inget.' },

      { sort: 'rubrik', text: '3. En egen sida per tjänst' },
      { sort: 'text', text: 'Den som söker på en behandling vill inte landa på en allmän startsida. Egna sidor svarar exakt på sökningen och ger Google något att matcha mot.' },
      { sort: 'vidare', till: 'synas-hogre-i-lokal-sok', text: 'Mer om varför tjänstesidor väger så tungt' },

      { sort: 'rubrik', text: '4. Bilder på ert arbete, inte på någon annans' },
      { sort: 'text', text: 'Stockbilder på perfekta modeller övertygar ingen. Bilder på era egna kunder, i er egen lokal, med ert eget ljus gör det. De behöver inte vara tagna av en fotograf — de behöver vara äkta och färska.' },

      { sort: 'rubrik', text: '5. Bokning som är synlig hela vägen ned' },
      { sort: 'text', text: 'Bokningsknappen ska finnas där beslutet fattas, inte bara högst upp. Den som just läst om en behandling och tänker "ja, det där" ska kunna boka på stället utan att leta sig tillbaka.' },
      { sort: 'ruta', rubrik: 'Onlinebokning slår telefonnummer', text: 'En stor del av bokningarna sker på kvällar och helger, när salongen är stängd. Ett telefonnummer tar inte emot dem. En kalender gör det.' },

      { sort: 'rubrik', text: '6. Omdömen och kontaktuppgifter, synligt' },
      { sort: 'text', text: 'Hämta in era Google-omdömen på sidan, och lägg adress, öppettider och telefonnummer där de går att se utan att klicka. Samma uppgifter ska stå identiskt här som på företagsprofilen.' },

      { sort: 'rubrik', text: 'Det som inte behövs' },
      { sort: 'lista', poster: [
        'En bildkarusell som byter bild var tredje sekund. Ingen läser dem.',
        'En lång text om salongens filosofi ovanför tjänsterna.',
        'Nyhetsflöden som senast uppdaterades för två år sedan — de daterar sidan.',
        'Musik, popup-fönster och allt annat som besökaren måste stänga.',
      ]},

      { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
      { sort: 'lista', poster: [
        'Öppna er sida i telefonen. Ser ni vad ni gör, var ni finns och vad det kostar utan att scrolla? Om inte, börja där.',
        'Skriv ut priserna, även ungefärliga.',
        'Ge era tre största tjänster varsin sida.',
        'Byt ut varje stockbild mot något ni fotograferat själva.',
      ]},
      { sort: 'vidare', till: 'google-annonser-for-salonger', text: 'Nästa steg: annonser, när grunden står' },
    ],
  },

  {
    slug:      'google-annonser-for-salonger',
  farg:      '#fb923c',
  bild:      '/guider/annonser.svg',
    sort:      'amne',
    titel:     'Google Ads för salonger — utan att bränna budgeten',
    metaTitel: 'Google Ads för salong — vad det kostar och hur du gör rätt',
    metaText:  'Så bygger en salong sina första Google-annonser: vilka sökord som ger bokningar, vilka som kostar utan att ge något, och vad en rimlig budget är.',
    ingress:   'Annonser fungerar för en salong, men bara ovanpå det andra — och bara om ni köper få och rätt sökord. Här är hur ni gör det utan att elda upp tre tusen kronor på en månad.',
    amne:      'Annonser',
    minuter:   13,
    publicerad: '2026-08-26',
    sokord: [
      'google ads salong',
      'annonsera på google frisör',
      'vad kostar google annonser',
      'google ads små företag',
      'annonsering skönhetssalong',
    ],
    innehall: [
      { sort: 'text', text: 'Google Ads är byggt för företag med en marknadsavdelning, och det märks. Standardinställningarna passar den som har hundratusen i månaden att lägga — inte den som har tre tusen och sex stolar. Här är vad som gäller för en salong.' },

      { sort: 'rubrik', text: 'Börja aldrig med annonser' },
      { sort: 'text', text: 'En annons leder till en sida. Är sidan otydlig, saknar priser eller inte går att boka från på kvällen, betalar ni för besök som inte blir bokningar. Ordningen är alltid profilen, omdömena och sidan först — annonserna sedan.' },
      { sort: 'text', text: 'Det finns ett undantag: en glesare period ni vill fylla nu. Då är annonser det snabbaste verktyget som finns, förutsatt att det ni skickar folk till håller.' },

      { sort: 'rubrik', text: 'Köp behandling plus plats — inget annat' },
      { sort: 'text', text: 'Det breda sökordet — ert yrke plus staden — är dyrast, mest omtvistat och ger sämst bokningar. Den som söker så vet inte vad de vill ha. Den som söker på en behandling plus en stadsdel vet exakt.' },
      { sort: 'lista', poster: [
        'Bra: behandlingen plus stadsdelen eller orten',
        'Bra: behandlingen plus "boka" eller "pris"',
        'Dåligt: bara yrket, bara staden, eller något med "billig"',
        'Dåligt: konkurrenternas namn — dyrt, och de svarar med att köpa ert',
      ]},

      { sort: 'rubrik', text: 'Negativa sökord innan ni startar, inte efter' },
      { sort: 'text', text: 'Det här är den enskilt viktigaste inställningen, och den som oftast hoppas över. Utan negativa sökord betalar ni för folk som söker efter utbildningar, jobb, produkter att köpa hem, eller hur man gör det själv.' },
      { sort: 'text', text: 'Skriv listan innan första annonsen går live: utbildning, kurs, jobb, lön, själv, hemma, produkter, grossist, och "billig" om ni inte är billiga. Den listan sparar mer pengar än något annat ni gör i kontot.' },

      { sort: 'rubrik', text: 'En kampanj per behandlingsområde — och högst fyra' },
      { sort: 'text', text: 'En enda kampanj med allt i gör att Google fördelar pengarna åt er, och det blir sällan som ni tänkt. Fler än fyra kampanjer gör att ingen av dem får tillräckligt med data för att bli bra. Färg, klippning och en för det ni tjänar mest på räcker långt.' },

      { sort: 'rubrik', text: 'Vad ska det kosta?' },
      { sort: 'text', text: 'Sätt en dagsbudget ni skulle kunna förlora utan att det gör ont, och räkna baklänges. Kostar ett klick tio kronor och var femte som klickar bokar, kostar en bokning femtio kronor. Är den bokningen värd niohundra kronor har ni råd att fortsätta. Är den värd fyrahundraåttio, och ni får tillbaka kunden två gånger till, har ni fortfarande råd.' },
      { sort: 'ruta', rubrik: 'Mät bokningar, inte klick', text: 'Klick och visningar säger ingenting om ni tjänade pengar. Det enda talet som betyder något är vad en bokning kostade. Går det inte att mäta är det första ni ska lösa — inte något att skjuta på.' },

      { sort: 'rubrik', text: 'Titta på sökordsrapporten varannan vecka' },
      { sort: 'text', text: 'Rapporten över vad folk faktiskt sökte på när er annons visades är den mest lönsamma kvarten ni lägger. Där ser ni de sökningar ni betalat för utan att ha valt dem — och varje sådan ni lägger till som negativ gör kontot bättre.' },

      { sort: 'rubrik', text: 'Matchningstyperna avgör vad ni faktiskt köper' },
      { sort: 'text', text: 'Ett sökord i Google Ads är inte ett sökord — det är en instruktion om hur brett Google får tolka det. Den inställningen heter matchningstyp, och den är den vanligaste anledningen till att en liten budget försvinner utan att någon förstår vart.' },
      { sort: 'lista', poster: [
        'Exakt: annonsen visas i princip bara på just den frasen. Tryggast för en liten budget',
        'Frasmatchning: frasen ska ingå, men något får stå runt. Rimlig när ni har lite data',
        'Bred matchning: Google visar er på det de tror är besläktat. Använd den inte',
      ]},
      { sort: 'text', text: 'Bred matchning är standardvalet när man skapar en kampanj, och det är gjort för konton med stor budget och mycket historik. Med tre tusen i månaden hinner ni bränna hälften innan Google lärt sig något.' },

      { sort: 'rubrik', text: 'Kontot måste veta vad en bokning är' },
      { sort: 'text', text: 'Utan konverteringsmätning vet varken ni eller Google vilka klick som ledde till något. Google optimerar då mot klick — alltså mot att göra av med pengarna — i stället för mot bokningar.' },
      { sort: 'text', text: 'Det här är den enskilt viktigaste tekniska inställningen i hela kontot, och den som oftast saknas. Är den inte på plats är allt annat gissningar.' },

      { sort: 'rubrik', text: 'Tillägg kostar ingenting och tar plats' },
      { sort: 'text', text: 'Annonstillägg — extra länkar, telefonnummer, adressen, korta säljargument — gör annonsen fysiskt större i resultatet och trycker ned konkurrenten. De kostar inget extra och de flesta salonger har inga alls.' },
      { sort: 'lista', poster: [
        'Länkar till era tre största behandlingssidor',
        'Telefonnummer, så att man kan ringa direkt från annonsen',
        'Adressen, kopplad till företagsprofilen — den visar avståndet',
        'Korta argument: "Boka online", "Konsultation ingår", "Öppet till 19"',
      ]},

      { sort: 'rubrik', text: 'När ni ska pausa' },
      { sort: 'text', text: 'Annonser ska inte gå året runt i en salong. De ska gå när ni har luckor att fylla och när efterfrågan är stigande. Att annonsera veckan före jul, när kalendern ändå är full, är att betala för bokningar ni hade fått gratis.' },
      { sort: 'text', text: 'Pausa när ni är fullbokade. Slå på igen fyra till sex veckor före nästa topp. Det låter enkelt och är det — men det kräver att någon tittar, vilket är hela skälet till att de flesta konton bara rullar på.' },

      { sort: 'rubrik', text: 'Annonstexten' },
      { sort: 'text', text: 'Skriv behandlingen och platsen i rubriken, och det som skiljer er i beskrivningen: att konsultation ingår, att ni har kvällstider, att man kan boka online. Undvik superlativ. "Bäst i stan" övertygar ingen; "lediga tider den här veckan" gör det.' },

      { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
      { sort: 'lista', poster: [
        'Kontrollera att sidan annonsen ska leda till har pris och bokningsknapp.',
        'Skriv listan med negativa sökord innan ni startar något.',
        'Välj tre behandlingar och deras stadsdelsvarianter — inget bredare.',
        'Bestäm vad en bokning får kosta innan ni sätter budgeten.',
      ]},
      { sort: 'vidare', till: 'fler-kunder-till-salongen', text: 'Tillbaka till översikten över allt som ger fler kunder' },
    ],
  },
]

/* Branschguiderna bor i en egen fil. De är bibliotekets tyngsta del och
   skrivs om oftare än de andra — säsonger flyttar sig och behandlingar byter
   namn. Importen är i botten av filen med flit: guiderBransch importerar bara
   typerna härifrån, och en typimport försvinner vid kompilering, så det finns
   ingen cirkel vid körning. */
export const GUIDER: Guide[] = [PELARE, ...AMNEN, ...EXTRA_AMNEN, ...BRANSCHGUIDER]

export function hittaGuide(slug: string): Guide | undefined {
  return GUIDER.find(g => g.slug === slug)
}

export function guiderAv(sort: Guidesort): Guide[] {
  return GUIDER.filter(g => g.sort === sort)
}
