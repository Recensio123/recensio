import type { Guide } from '@/lib/guider'

/*
 * De fyra ämnena som växte fram ur branschguiderna.
 *
 * När de sex branschguiderna skrevs återkom fyra underrubriker i nästan alla:
 * priserna, bilderna, kunderna som ska tillbaka, och året som styr när man ska
 * synas. Ett ämne som dyker upp i sex texter är inte en underrubrik — det är
 * en artikel som saknas, och sex halva svar på samma fråga är sämre än ett
 * helt.
 *
 * De ligger här i stället för i huvudfilen av samma skäl som branschguiderna:
 * filen skulle annars bli omöjlig att arbeta i.
 *
 * Samma fem källor gäller här som överallt annars — Joy Hawkins, Darren Shaw,
 * Greg Gifford, Mike Blumenthal och Brad Geddes. Inget påstående som inte går
 * att belägga hos någon av dem hör hemma i texten.
 */

const publicerad = '2026-08-26'

/* ═══════════════════════════════════════════════════════════════════════
   PRISERNA
   ═══════════════════════════════════════════════════════════════════════ */

const PRISER: Guide = {
  slug:      'priser-pa-salongens-hemsida',
  farg:      '#4ade80',
  bild:      '/guider/priser.svg',
  sort:      'amne',
  publicerad,
  titel:     'Ska priserna stå på hemsidan?',
  metaTitel: 'Ska priserna stå på salongens hemsida? Kort svar: ja',
  metaText:  'Varför utskrivna priser ger fler bokningar och färre onödiga samtal — och hur ni skriver dem när priset beror på hårlängd eller tidsåtgång.',
  amne:      'Priser',
  ingress:   'Det är den vanligaste diskussionen på en salongshemsida och den enda där svaret är entydigt. Här är varför — och hur ni skriver priset när det faktiskt beror på hårlängd.',
  minuter:   6,
  sokord: [
    'priser på hemsidan',
    'ska man skriva ut priser',
    'prislista salong',
    'prislista frisör hemsida',
    'dölja priser hemsida',
  ],
  innehall: [
    { sort: 'text', text: 'Det är den vanligaste diskussionen på en salongshemsida, och den enda där svaret är entydigt: skriv ut priserna. Ändå saknas de på ungefär hälften av alla salongssidor, och alltid av samma tre skäl.' },

    { sort: 'rubrik', text: 'Skäl ett: "då ringer de och frågar"' },
    { sort: 'text', text: 'Det är precis vad som händer — och det är inte en fördel. Ett samtal om ett pris är ett samtal ni inte får betalt för, och det kommer mitt i en färgning. Den som ringer för att fråga bokar dessutom inte oftare än den som såg priset och bokade direkt.' },

    { sort: 'rubrik', text: 'Skäl två: "vi vill inte jämföras på pris"' },
    { sort: 'text', text: 'Ni blir jämförda ändå. Skillnaden är att den som inte hittar ert pris antar det värsta, och att jämförelsen sker utan att ni fått säga något om vad som ingår.' },
    { sort: 'text', text: 'Ett utskrivet pris med en mening om vad som ingår — konsultation, produkter, styling efteråt — är en jämförelse ni vinner. Ett osynligt pris är en jämförelse ni inte är med i.' },

    { sort: 'rubrik', text: 'Skäl tre: "det beror på hårlängd"' },
    { sort: 'text', text: 'Det stämmer, och det är den enda invändningen med substans. Lösningen är inte att utelämna priset utan att beskriva variationen.' },
    { sort: 'lista', poster: [
      'Tre nivåer: kort, axellångt, långt — med pris för varje',
      'Eller ett spann: "1 400–2 200 kr beroende på längd och tjocklek"',
      'Eller "från", med en mening om vad som gör att det blir mer',
      'Skriv ut vad en konsultation kostar, och om avgiften dras av vid bokning',
    ]},
    { sort: 'ruta', rubrik: 'Ett ungefärligt pris slår inget pris', text: 'Kunden vet att ett hårpris varierar. Det de inte accepterar är att inte få någon uppfattning alls — då antar de att det är dyrt, och går vidare.' },

    { sort: 'rubrik', text: 'Priset sorterar åt er' },
    { sort: 'text', text: 'En prislista tar bort fel kunder innan de bokar. Den som söker det billigaste hoppar över er, och det är en tjänst mot er själva — de bokar en gång, är missnöjda med att det kostade vad det stod, och skriver ett omdöme om det.' },
    { sort: 'text', text: 'Den som bokar efter att ha sett priset har redan accepterat det. Det samtalet behöver ni aldrig ta i stolen.' },

    { sort: 'rubrik', text: 'Där priset ska stå' },
    { sort: 'lista', poster: [
      'På behandlingens egen sida, nära bokningsknappen',
      'I tjänstelistan på Google-företagsprofilen — den syns innan någon klickat sig till er',
      'I en samlad prislista, som komplement men aldrig som enda plats',
      'Aldrig som en nedladdningsbar pdf. Ingen öppnar den, och Google läser den sämre',
    ]},

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Skriv ut priset på era tre största behandlingar, även som spann',
      'Lägg en mening om vad som ingår intill varje pris',
      'Fyll i tjänstelistan med priser på Google-profilen',
      'Ta bort prislistan som pdf om ni har en',
    ]},

    { sort: 'vidare', till: 'vad-en-salongshemsida-behover', text: 'Resten av det hemsidan behöver' },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════
   BILDERNA
   ═══════════════════════════════════════════════════════════════════════ */

const BILDER: Guide = {
  slug:      'bilder-som-ger-bokningar',
  farg:      '#818cf8',
  bild:      '/guider/bilder.svg',
  sort:      'amne',
  publicerad,
  titel:     'Bilder som ger bokningar',
  metaTitel: 'Bilder på salongens behandlingar — så tar du dem rätt',
  metaText:  'Varför före- och efterbilder säljer mer än allt annat i en salong, hur ni tar dem så att skillnaden syns, och vad ni måste fråga kunden om först.',
  amne:      'Bilder',
  ingress:   'Bilder är den enda marknadsföring i en salong som kostar noll kronor och som ändå görs sämst. Så tar ni dem så att skillnaden syns — och så att ni får publicera dem.',
  minuter:   7,
  sokord: [
    'före och efter bilder salong',
    'bilder på hemsidan salong',
    'fota behandlingar',
    'bilder google företagsprofil',
    'samtycke bilder kunder',
  ],
  innehall: [
    { sort: 'text', text: 'Två salonger med samma betyg, samma pris och samma avstånd är inte likvärdiga i kundens ögon. Den med tolv färska bilder på riktiga arbeten vinner över den med tre suddiga från invigningen, varje gång.' },
    { sort: 'text', text: 'Bilder är den enda marknadsföring i en salong som kostar noll kronor och som ändå görs sämst.' },

    { sort: 'rubrik', text: 'Före och efter måste vara jämförbara' },
    { sort: 'text', text: 'Det vanligaste felet är inte dåliga bilder, det är obesläktade bilder. Före-bilden tas i dagsljus vid fönstret, efter-bilden i spotlight vid stolen, från en annan vinkel och en halvmeter närmare. Då syns inte behandlingen — bara att belysningen ändrats.' },
    { sort: 'lista', poster: [
      'Samma plats varje gång. Märk ut var kunden ska stå, gärna med tejp i golvet',
      'Samma ljus. Undvik fönster som ändrar sig med vädret och tiden på dygnet',
      'Samma avstånd och vinkel. Bestäm en och håll den för alla bilder',
      'Ingen retusch. Den som ser retuscherat blir besviken i stolen',
    ]},

    { sort: 'rubrik', text: 'Fråga alltid först — och fråga rätt' },
    { sort: 'text', text: 'Ett ansikte är en personuppgift. Att publicera bilder på en kund kräver att kunden sagt ja, och ett muntligt "javisst" i stolen är svårt att belägga sex månader senare när någon ändrat sig.' },
    { sort: 'lista', poster: [
      'Fråga innan ni fotograferar, inte efter',
      'Var tydlig med var bilden ska användas: hemsidan, Google, sociala medier',
      'Anteckna svaret i kundkortet så att det går att hitta',
      'Ångrar sig någon: ta bort bilden, utan diskussion',
    ]},
    { sort: 'ruta', rubrik: 'Bilder utan ansikte fungerar också', text: 'Nacke, hårlängd, naglar, en detalj. Många kunder som säger nej till sitt ansikte säger gärna ja till bakhuvudet — och för att visa en färgning är det ofta den bättre bilden ändå.' },

    { sort: 'rubrik', text: 'Var bilderna ska ligga' },
    { sort: 'text', text: 'De flesta lägger alla bilder på Instagram och inga på Google. Det är fel ände: flödet ses av dem som redan känner till er, profilen av dem som inte gör det.' },
    { sort: 'lista', poster: [
      'Google-företagsprofilen först. Det är där nya kunder tittar',
      'Behandlingens egen sida — bilder på balayage hör hemma på balayage-sidan',
      'Lokalen och teamet på startsidan. De besvarar frågan "hur är det där?"',
      'Instagram sist. Det är underhåll av befintliga kunder, inte nyförsäljning',
    ]},

    { sort: 'rubrik', text: 'Takt slår mängd' },
    { sort: 'text', text: 'Tjugo bilder uppladdade en gång per år ser ut som en salong som stängt. En bild i veckan ser ut som en salong som jobbar. Google visar dessutom oftare profiler som uppdateras, och regelbundenheten väger mer än volymen.' },

    { sort: 'rubrik', text: 'Stockbilder gör aktiv skada' },
    { sort: 'text', text: 'De känns igen. Samma leende modell finns på hundra salongssidor, och den som sett henne förut drar en slutsats om er: att ni inte har egna arbeten att visa, eller inte brytt er. Ingen bild alls är bättre än en köpt.' },

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Bestäm en fotoplats i salongen och märk ut var kunden ska stå',
      'Fotografera nästa behandling före och efter från exakt samma läge',
      'Lägg upp fem bilder på Google-profilen i dag',
      'Byt ut varje stockbild ni har mot en egen',
    ]},

    { sort: 'vidare', till: 'fler-bokningar-fran-google', text: 'Vad mer som avgör hur profilen presterar' },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════
   ÅTERKOMMANDE KUNDER
   ═══════════════════════════════════════════════════════════════════════ */

const ATERKOMMANDE: Guide = {
  slug:      'fa-kunderna-att-komma-tillbaka',
  farg:      '#f472b6',
  bild:      '/guider/aterkommande.svg',
  sort:      'amne',
  publicerad,
  titel:     'Få kunderna att komma tillbaka',
  metaTitel: 'Få fler återkommande kunder till salongen',
  metaText:  'Den billigaste bokningen är den från någon som redan varit hos er. Så bokar ni nästa besök i stolen, påminner i rätt tid och väcker dem som slutat komma.',
  amne:      'Återkommande',
  ingress:   'Den billigaste bokningen är den från någon som redan varit hos er. Ändå läggs nästan all marknadsföring på att hitta nya. Så vänder ni på det.',
  minuter:   7,
  sokord: [
    'återkommande kunder salong',
    'få kunder att komma tillbaka',
    'påminnelse bokning salong',
    'stamkunder frisör',
    'kundvård salong',
  ],
  innehall: [
    { sort: 'text', text: 'En ny kund kostar pengar att skaffa — annonser, tid, synlighet. En kund som redan varit hos er kostar ett sms. Ändå läggs nästan all marknadsföring på den första gruppen.' },
    { sort: 'text', text: 'Det är inte fel att söka nya kunder. Det är fel att göra det medan trettio personer i registret var här senast i mars och aldrig hörde av sig igen.' },

    { sort: 'rubrik', text: 'Boka nästa besök innan de går' },
    { sort: 'text', text: 'Det här är den enskilt mest lönsamma vanan i en salong, och den kräver ingen teknik alls. Den som står vid kassan med resultatet i spegeln är som mest benägen att boka igen. Två dagar senare är de tillbaka i vardagen.' },
    { sort: 'lista', poster: [
      'Fråga alla, varje gång. "Ska vi boka in nästa på samma tid?" räcker',
      'Föreslå ett datum, be inte kunden räkna ut det själv',
      'Behandlingar med intervall — färg, fyllning, påfyllning — ska alltid bokas framåt',
      'Den som tackar nej ska ändå få påminnelsen. De sa nej till stunden, inte till salongen',
    ]},

    { sort: 'rubrik', text: 'Påminn i rätt tid, inte i efterhand' },
    { sort: 'text', text: 'En påminnelse som kommer när kunden redan börjat se ovårdad ut är för sen. Den ska komma några dagar innan intervallet går ut, medan det fortfarande är enkelt att boka.' },
    { sort: 'text', text: 'Intervallet skiljer sig mellan behandlingar: fyllning på naglar var tredje vecka, påfyllning av fransar varannan till var fjärde, färg var sjätte till åttonde, klippning var fjärde till åttonde. Använd behandlingens eget intervall och inte ett generellt.' },

    { sort: 'rubrik', text: 'De som slutat komma' },
    { sort: 'text', text: 'Varje salong har dem: kunder som kom regelbundet och sedan inte mer. De flesta har ingen dramatisk anledning — de flyttade tider en gång, sedan gick det en månad, och sedan kändes det pinsamt att höra av sig.' },
    { sort: 'lista', poster: [
      'Plocka ut alla som inte varit där på fyra till nio månader',
      'Skicka ett kort meddelande med en konkret anledning att boka, inte ett "vi saknar dig"',
      'Skicka när kalendern är som glesast, inte när ni ändå är fullbokade',
      'En gång i månaden räcker. Oftare blir det något folk stänger av',
    ]},
    { sort: 'ruta', rubrik: 'Reglerna gäller', text: 'Ni får skicka erbjudanden till någon som redan varit kund, men bara om de fick möjlighet att tacka nej när uppgifterna samlades in och får det i varje utskick. Det är inte formalia — det är skillnaden mellan ett tillåtet utskick och ett otillåtet.' },

    { sort: 'rubrik', text: 'Kundhistoriken är värd mer än ni tror' },
    { sort: 'text', text: 'Vilken färgformula, vilken längd, vad de sa sist. En anteckning som gör att nästa besök börjar med "vi gjorde ju en aning ljusare förra gången" är det som förvandlar en kund till en stamkund.' },
    { sort: 'text', text: 'Det kräver att anteckningarna finns där personalen ser dem när kunden sitter i stolen — inte i ett block i lådan.' },

    { sort: 'rubrik', text: 'Räkna på det' },
    { sort: 'text', text: 'En kund som kommer sex gånger om året i stället för fyra är femtio procent mer värd, utan att ni skaffat en enda ny kund. Det är den enklaste tillväxten som finns i en salong, och den syns aldrig i annonsstatistiken.' },

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Börja fråga varje kund om nästa bokning innan de lämnar salongen',
      'Ställ in påminnelser efter behandlingens eget intervall',
      'Plocka ut alla som inte varit här på ett halvår och skicka ett meddelande',
      'Se till att kundanteckningarna syns när kunden är på plats',
    ]},

    { sort: 'vidare', till: 'fler-omdomen-till-salongen', text: 'Samma kunder är också de bästa att be om omdömen' },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════
   SALONGSÅRET
   ═══════════════════════════════════════════════════════════════════════ */

const SASONG: Guide = {
  slug:      'salongsaret-nar-ni-ska-synas',
  farg:      '#facc15',
  bild:      '/guider/sasong.svg',
  sort:      'amne',
  publicerad,
  titel:     'Salongsåret — när ni ska synas',
  metaTitel: 'Salongsåret: när kunderna söker och när ni ska synas',
  metaText:  'Månad för månad: när efterfrågan toppar i salongsbranschen, hur långt i förväg ni behöver synas, och vad ni gör under de lugna veckorna.',
  amne:      'Säsong',
  ingress:   'Salongsårets toppar är förutsägbara, och den som planerar efter dem slipper reagera på en tom kalender. Månad för månad, med hur långt i förväg ni behöver synas.',
  minuter:   7,
  sokord: [
    'säsong salong',
    'lugna perioder frisörsalong',
    'när bokar kunder salong',
    'marknadsföring inför julen salong',
    'fylla luckor i kalendern',
  ],
  innehall: [
    { sort: 'text', text: 'Salongsbranschens år är förutsägbart, och det är den enda anledning ni behöver för att planera efter det. Den som annonserar i december annonserar mot en kalender som redan är full. Den som annonserar i november fyller den.' },
    { sort: 'text', text: 'Grundregeln: synas fyra till sex veckor före toppen, inte under den.' },

    { sort: 'rubrik', text: 'Januari och februari — det lugnaste' },
    { sort: 'text', text: 'Julen är betald, vädret är grått och ingen har något att gå på. Det här är årets svagaste period i nästan hela branschen, och därför den bästa för två saker: återaktivering av kunder som slutat komma, och allt det arbete ni aldrig hinner annars — fotografera, skriva behandlingssidor, be om omdömen.' },
    { sort: 'text', text: 'Undantaget är hudvård, som får en topp i januari av dem som vill göra om efter helgerna, och massage där presentkorten från december löses in.' },

    { sort: 'rubrik', text: 'Mars till maj — ljusare' },
    { sort: 'text', text: 'Solen kommer tillbaka och alla vill bli ljusare. Balayage, slingor och färgbehandlingar toppar, och det är årets bästa period för en frisörsalong. Lägg annonspengarna här om ni bara ska lägga dem någonstans.' },

    { sort: 'rubrik', text: 'Maj och juni — bal, student och bröllop' },
    { sort: 'text', text: 'Uppsättningar, provuppsättningar, naglar och fransar inför ett bestämt datum. Det som skiljer den här toppen från de andra är framförhållningen: kunderna bokar veckor i förväg, ofta redan i april.' },
    { sort: 'ruta', rubrik: 'Provuppsättningen är en egen bokning', text: 'Många salonger säljer bröllopsuppsättning men nämner aldrig provuppsättningen. Det är en extra bokning per kund, den bokas i god tid, och den gör själva dagen tryggare för båda parter.' },

    { sort: 'rubrik', text: 'Juli och augusti — delat' },
    { sort: 'text', text: 'Juli är dött i storstäderna och fullt i turistorterna. Augusti är däremot årets näst starkaste period nästan överallt: alla kommer tillbaka från semestern med solblekt hår och behöver rättas till innan skola och jobb börjar.' },

    { sort: 'rubrik', text: 'September och oktober — höstfärgen' },
    { sort: 'text', text: 'Mörkare toner, återgång till rutin, och den period då hudvård kan börja med behandlingar som gör huden ljuskänslig. En stabil och lönsam period som få planerar för, eftersom den inte känns som en säsong.' },

    { sort: 'rubrik', text: 'November och december — årets tyngsta' },
    { sort: 'text', text: 'Fest, jul och nyår i följd. Den sista veckan före jul är oftast årets enskilt tyngsta i hela branschen, och den fyller sig själv. Arbetet ligger i november: synas innan alla andra gör det, sälja presentkort, och sluta ta emot nya bokningar i tid så att personalen överlever.' },
    { sort: 'lista', poster: [
      'Presentkort ska vara synliga från början av november, inte i mitten av december',
      'Annonsera i november för december — inte tvärtom',
      'Bestäm i förväg när ni slutar ta emot, och skriv ut det',
      'Be om omdömen i januari, från alla som var här i december',
    ]},

    { sort: 'rubrik', text: 'Att fylla en lucka som uppstått i morgon' },
    { sort: 'text', text: 'Säsong är planering. Ett avbokat pass klockan tre i morgon är något annat, och där fungerar bara två saker: ett meddelande till dem som brukar komma vid den tiden, och ett inlägg på Google-profilen. Annonser hinner inte.' },

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Skriv ned era tre tyngsta månader och räkna sex veckor bakåt från varje',
      'Lägg in en påminnelse i kalendern om att börja synas då',
      'Bestäm vad ni gör under januari — det är den enda månad ni har tid',
      'Planera presentkorten till november, inte till december',
    ]},

    { sort: 'vidare', till: 'google-annonser-for-salonger', text: 'Så lägger ni annonsbudgeten på rätt månader' },
  ],
}

export const EXTRA_AMNEN: Guide[] = [PRISER, BILDER, ATERKOMMANDE, SASONG]
