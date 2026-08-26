import type { Guide, Stycke } from '@/lib/guider'

/*
 * Branschguiderna.
 *
 * Ligger för sig eftersom de är den tyngsta delen av biblioteket och skrivs om
 * oftare än de andra — säsonger flyttar sig, behandlingar byter namn, priser
 * ändras.
 *
 * De var först korta och delade en identisk avslutning med sju länkar. Det var
 * ett misstag: sex sidor där fyrtio procent av texten är ordagrant densamma är
 * precis vad en sökmotor behandlar som tunna mallsidor, och det hjälpte varken
 * läsaren eller oss.
 *
 * Nu bär varje guide det som bara gäller sin bransch — de sökord just deras
 * kunder skriver, säsongen de lever med, hur priset brukar sättas, vilket
 * bevis som övertygar, och den fråga kunden googlar strax innan de bokar. Det
 * går inte att kopiera mellan branscher, vilket är hela poängen.
 *
 * Länkarna på slutet är valda per bransch. Två eller tre som faktiskt hör till
 * det de just läst, inte hela biblioteket radat.
 */

const publicerad = '2026-08-26'

/** Bygger en branschguide. Formen är gemensam, innehållet är det inte. */
function bransch(g: {
  slug: string; titel: string; metaTitel: string; metaText: string
  amne: string; ingress: string; minuter: number; sokord: string[]
  innehall: Stycke[]
}): Guide {
  return { ...g, sort: 'bransch', publicerad }
}

/* ═══════════════════════════════════════════════════════════════════════
   FRISÖRSALONG
   ═══════════════════════════════════════════════════════════════════════ */

const FRISOR = bransch({
  slug:      'marknadsforing-for-frisorsalonger',
  titel:     'Marknadsföring för frisörsalonger',
  metaTitel: 'Marknadsföring för frisörsalong — så får du fler kunder',
  metaText:  'Vad som ger en frisörsalong fler bokningar: färgbehandlingarna som egna sidor, säsongen som styr året, priser efter hårlängd och frisörer med namn.',
  amne:      'Frisör',
  minuter:   9,
  ingress:   'Frisör är den mest sökta salongstjänsten som finns, och därför den mest konkurrensutsatta. Det gör bredden värdelös och det specifika värdefullt — här är vad som faktiskt avgör vem kunden väljer.',
  sokord: [
    'marknadsföring frisörsalong',
    'fler kunder frisör',
    'frisörsalong google',
    'marknadsföra frisör',
    'få fler kunder till frisörsalongen',
  ],
  innehall: [
    { sort: 'text', text: 'En frisörsalong konkurrerar sällan med hela staden. Den konkurrerar med fyra andra salonger inom tio minuters promenad, och kunden väljer på tre saker: hur nära det är, hur betyget ser ut, och om bilderna visar något de själva skulle vilja ha.' },
    { sort: 'text', text: 'Det betyder att den stora, breda sökningen — yrket plus staden — är fel strid att ta. Den är dyr, den är full av kedjor, och den som söker så vet inte vad de vill ha. Striden ni kan vinna står om behandlingen plus stadsdelen.' },

    { sort: 'rubrik', text: 'Färgen är både er intäkt och ert sökord' },
    { sort: 'text', text: 'En klippning kostar sex- till åttahundra kronor och tar en timme. En balayage kostar två tusen och tar tre. Ändå har de flesta salonger en enda sida som heter Tjänster, där balayage är en rad i en prislista.' },
    { sort: 'text', text: 'Färgbehandlingarna ska ha egna sidor, och de ska ha dem först. Det är där pengarna finns, det är där sökningarna är mest specifika, och det är där konkurrensen är svagast — för alla andra har också bara en prislista.' },
    { sort: 'lista', poster: [
      'Balayage, slingor, ombré, toning och hårfärgning är fem olika sökningar, inte en',
      'Skriv ut vad som skiljer dem. Kunden vet ofta inte, och den som förklarar får bokningen',
      'Keratinbehandling och hårförlängning är egna världar med egen efterfrågan',
      'Lägg stadsdelen i rubriken: "Balayage på Södermalm" slår "Våra färgbehandlingar"',
    ]},

    { sort: 'rubrik', text: 'Priset sätts efter hårlängd — skriv det ändå' },
    { sort: 'text', text: 'Den vanligaste ursäkten för att inte skriva ut priser i den här branschen är att de beror på hårlängd. Det stämmer, och det är ingen ursäkt. Skriv tre nivåer — kort, axellångt, långt — eller ett spann med "från". Ett ungefärligt pris är oändligt mycket bättre än inget.' },
    { sort: 'text', text: 'Den som inte hittar priset antar antingen att det är dyrt eller går vidare till någon som skrivit ut sitt. Ni förlorar aldrig kunden ni ville ha på ett utskrivet pris — ni förlorar den ni inte ville ha, vilket är en tjänst mot er själva.' },
    { sort: 'ruta', rubrik: 'Paketera färg och klippning', text: 'Nästan alla som färgar vill klippas samtidigt. Ett paketpris med båda gör det lättare att välja och höjer snittet per bokning, utan att ni behöver sälja något i stolen.' },

    { sort: 'rubrik', text: 'Kunder följer frisören, inte salongen' },
    { sort: 'text', text: 'Det här är branschens viktigaste egenhet och den som utnyttjas minst. En kund som hittat rätt frisör bokar samma person i åratal och söker på deras namn. Men på de flesta salongshemsidor står inte ett enda namn.' },
    { sort: 'lista', poster: [
      'Namnge era frisörer på sidan, med bild och vad de är bäst på',
      'Låt kunden välja frisör i bokningen — den som inte får välja bokar ofta inte alls',
      'En egen sida per frisör fångar sökningar på deras namn, och de sökningarna kommer',
      'Nyanställda behöver synas direkt, annars bokas de aldrig',
    ]},

    { sort: 'rubrik', text: 'Året har fyra lägen' },
    { sort: 'text', text: 'Frisörsäsongen är förutsägbar, och den som planerar efter den slipper reagera på en tom kalender.' },
    { sort: 'lista', poster: [
      'Mars till maj: alla vill bli ljusare. Balayage och slingor toppar. Lägg annonspengarna här',
      'Maj och juni: bal, student och bröllop. Uppsättningar bokas i god tid — synas i april',
      'Augusti och september: tillbaka från semestern, solblekt hår ska rättas till. Årets näst bästa period',
      'November och december: fest och jul. Sista veckan före jul är årets tyngsta — sluta ta emot i tid',
    ]},
    { sort: 'text', text: 'Januari och februari är lugna hos alla. Det är där återaktivering av gamla kunder gör mest nytta, och där ni har tid att fotografera och skriva.' },

    { sort: 'rubrik', text: 'Bilderna är hela försäljningen' },
    { sort: 'text', text: 'Ingen annan salongsbransch säljer så mycket på före- och efterbilder. Men de flesta gör dem fel: olika ljus, olika vinkel, olika avstånd — och då syns inte skillnaden, bara att bilderna är olika.' },
    { sort: 'lista', poster: [
      'Samma plats, samma ljus, samma vinkel före och efter. Tejpa ett kryss i golvet om det behövs',
      'Fråga alltid om lov innan ni publicerar. Det är kundens ansikte, inte ert',
      'Lägg upp löpande. En bild i veckan slår tjugo bilder en gång per år',
      'Både på Google-profilen och på behandlingens egen sida — de läses av olika personer',
    ]},

    { sort: 'rubrik', text: 'Frågan de googlar innan de bokar' },
    { sort: 'text', text: 'Innan någon bokar en färgbehandling för två tusen kronor söker de på hur länge den håller, hur ofta den behöver fyllas på, och om håret tar skada. Svaren finns sällan på salongernas egna sidor — de finns i forum och på produktsajter.' },
    { sort: 'text', text: 'Skriv svaren på era egna behandlingssidor. Det är samma frågor ni ändå får i stolen varje dag, det tar en halvtimme, och det är precis den sortens innehåll som får någon att välja er framför någon som bara listat ett pris.' },

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Ge er största färgbehandling en egen sida med pris, tidsåtgång och tre vanliga frågor',
      'Skriv ut priser i tre hårlängder i stället för ingenting',
      'Lägg upp namn och bild på varje frisör, och gör dem valbara i bokningen',
      'Fotografera nästa färgning före och efter, från samma plats',
    ]},

    { sort: 'vidare', till: 'synas-hogre-i-lokal-sok', text: 'Så bygger ni sidorna per behandling — hela guiden om lokal SEO' },
    { sort: 'vidare', till: 'fler-omdomen-till-salongen', text: 'Omdömena avgör ordningen mellan er och grannen' },
  ],
})

/* ═══════════════════════════════════════════════════════════════════════
   BARBERSHOP
   ═══════════════════════════════════════════════════════════════════════ */

const BARBER = bransch({
  slug:      'marknadsforing-for-barbershop',
  titel:     'Marknadsföring för barbershop',
  metaTitel: 'Marknadsföring för barbershop — fler kunder till barberaren',
  metaText:  'Så syns en barbershop på Google: rätt kategori, drop in-tider som framgår, skägg som eget sökord och varför kartan avgör mer för er än för andra.',
  amne:      'Barberare',
  minuter:   8,
  ingress:   'En barbershop lever på kunder som kommer ofta och på dem som råkar gå förbi. Google avgör vilka som går förbi — och för er väger kartan tyngre än för någon annan salongsbransch.',
  sokord: [
    'marknadsföring barbershop',
    'fler kunder barberare',
    'barberare google',
    'drop in barberare',
    'marknadsföring herrfrisör',
  ],
  innehall: [
    { sort: 'text', text: 'Barbershops har två fördelar få utnyttjar. Kunderna kommer var tredje till fjärde vecka, alltså tolv till sjutton gånger om året. Och beslutet fattas ofta samma dag — någon inser på lunchen att det är dags och söker efter någon som kan ta emot nu.' },
    { sort: 'text', text: 'Båda leder till samma slutsats: närhet och tillgänglighet är er marknadsföring. Allt annat kommer efter.' },

    { sort: 'rubrik', text: 'Stå som barberare, inte som frisörsalong' },
    { sort: 'text', text: 'Det här är den vanligaste och dyraste felinställningen i branschen. "Barberare" och "Frisörsalong" är två olika kategorier hos Google och två olika sökningar. Står ni i fel kategori tävlar ni mot damsalonger om kunder som inte söker efter er, och syns inte alls för dem som gör det.' },
    { sort: 'text', text: 'Kontrollera det i dag. Sök på "barberare" plus er stadsdel i ett inkognitofönster och se om ni finns med på kartan. Gör ni inte det är kategorin nästan alltid förklaringen.' },

    { sort: 'rubrik', text: 'Drop in är ert starkaste säljargument — om det framgår' },
    { sort: 'text', text: 'Den vanligaste frågan ni får är om man kan komma nu. Den ställs på telefon, i dörren, och i Googles sökruta — och den som inte får svar går vidare till nästa.' },
    { sort: 'lista', poster: [
      'Skriv ut om ni tar drop in, och vilka tider. Inte "välkommen in" — faktiska timmar',
      'Har ni både bokning och drop in ska båda synas. Många tror att bokning utesluter drop in',
      'Skriv ut ungefärlig väntetid om ni kan. "Sällan mer än en kvart" är ett löfte som fungerar',
      'Är ni fullbokade i dag ska det gå att se, inte upptäckas i dörren',
    ]},

    { sort: 'rubrik', text: 'Skägg är en egen affär' },
    { sort: 'text', text: 'Skäggtrimning, rakning med kniv och skäggformning söks separat från klippning, har egen efterfrågan och högre marginal per minut. Ändå ligger de nästan alltid begravda i en prislista under klippningen.' },
    { sort: 'text', text: 'Ge skägget en egen sida. Samma sak med fade, som är det mest sökta enskilda klippordet i branschen och som många barbershops inte nämner med ett ord.' },
    { sort: 'ruta', rubrik: 'Kombinationen säljer sig själv', text: 'Klippning plus skägg är den vanligaste bokningen hos en välskött barbershop. Prissätt den som ett paket och gör den valbar i ett klick — det höjer snittet utan att någon behöver sälja.' },

    { sort: 'rubrik', text: 'Kartan avgör mer för er än för andra' },
    { sort: 'text', text: 'Den som klipper sig varje månad väljer nästan alltid det som ligger nära. Avstånd är en av de tyngsta faktorerna i lokal sökning, och det är den enda ni inte kan påverka — men ni kan påverka allt annat som avgör vem av de närliggande som visas.' },
    { sort: 'lista', poster: [
      'Fullständig profil: öppettider, telefon, tjänster, egenskaper — allt ifyllt',
      'Bilder på lokalen. Stolarna, skylten, väntytan. En barbershop säljs på känsla',
      'Omdömen i jämn takt. Ni har fler besök än de flesta — utnyttja det',
      'Ett inlägg i veckan. Lediga tider på fredag är ett fullgott inlägg',
    ]},

    { sort: 'rubrik', text: 'Året är jämnare än hos andra — men inte platt' },
    { sort: 'text', text: 'Ni slipper de stora svängningarna, men två perioder sticker ut. December, när alla ska klippa sig före helgerna, och maj till juni inför sommaren. Movember i november ger dessutom ett naturligt skäl att synas för skäggkunder.' },
    { sort: 'text', text: 'Januari är lugnast. Det är då ni fotograferar, skriver och ber om omdömen från alla som varit där i december.' },

    { sort: 'rubrik', text: 'Frågan de googlar innan de kommer' },
    { sort: 'text', text: 'Kan man betala med kort. Hur lång tid tar en fade. Behöver man boka. Tar ni barn. Fyra frågor som avgör om någon går in genom dörren, och som nästan aldrig står besvarade någonstans.' },
    { sort: 'text', text: 'Lägg dem som frågor och svar på Google-profilen och på sidan. Det tar tjugo minuter och det är precis den friktion som annars gör att någon väljer stället bredvid.' },

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Kontrollera att kategorin är Barberare och inte Frisörsalong',
      'Skriv ut era drop in-tider på sidan och på profilen',
      'Ge skägg och fade varsin sida med pris och tidsåtgång',
      'Fotografera lokalen — entré, stolar, väntyta — och lägg upp bilderna',
    ]},

    { sort: 'vidare', till: 'fler-bokningar-fran-google', text: 'Kategori, bilder och inlägg — hela guiden om Google-profilen' },
    { sort: 'vidare', till: 'fler-omdomen-till-salongen', text: 'Ni har fler besök än de flesta. Så förvandlar ni dem till omdömen' },
  ],
})

/* ═══════════════════════════════════════════════════════════════════════
   NAGELSALONG
   ═══════════════════════════════════════════════════════════════════════ */

const NAGLAR = bransch({
  slug:      'marknadsforing-for-nagelsalonger',
  titel:     'Marknadsföring för nagelsalonger',
  metaTitel: 'Marknadsföring för nagelsalong — fler bokningar',
  metaText:  'Vad som ger nagelsalongen fler kunder: bilder på era egna arbeten, fyllning som återkommande intäkt, tydliga priser per teknik och synlighet utanför Instagram.',
  amne:      'Naglar',
  minuter:   8,
  ingress:   'Nagelsalonger säljer något kunden ser innan de bokar. Det gör bilderna till er viktigaste marknadsföring — och det gör beroendet av Instagram till er största risk.',
  sokord: [
    'marknadsföring nagelsalong',
    'fler kunder nagelsalong',
    'nagelsalong google',
    'boka naglar online',
    'marknadsföring nagelteknolog',
  ],
  innehall: [
    { sort: 'text', text: 'Ingen annan salongsbransch är lika visuell. Kunden har ofta en bild i telefonen på exakt vad de vill ha innan de ens söker, och de letar efter någon som visat att de kan göra just det. Det förändrar vad marknadsföring betyder här: det handlar mindre om att beskriva och mer om att visa.' },

    { sort: 'rubrik', text: 'Instagram räcker inte, och det är ert största hål' },
    { sort: 'text', text: 'Nagelsalonger är den bransch som byggt mest på Instagram och minst på Google. Det är begripligt — flödet är gjort för bilder. Men det lämnar över hälften av kunderna gratis.' },
    { sort: 'text', text: 'Den som redan följer er hittar er på Instagram. Den som just flyttat till området, eller vars vanliga salong inte hade tider, söker på Google. Har ni ingen profil där finns ni inte för dem, hur fint flödet än är.' },
    { sort: 'ruta', rubrik: 'Ni äger inte ert flöde', text: 'Ett konto kan låsas ute, en räckvidd kan halveras över en natt, och ingen av de sakerna kan ni överklaga. En Google-profil och en egen sida är det enda i er marknadsföring ni faktiskt kontrollerar.' },

    { sort: 'rubrik', text: 'Teknikerna är olika sökningar' },
    { sort: 'text', text: 'Gel, akryl, förstärkning, förlängning, fyllning och avtagning är sex olika saker med sex olika priser, och kunden söker på det de vill ha — inte på "naglar".' },
    { sort: 'lista', poster: [
      'Skilj teknikerna åt i prislistan, inte bara i huvudet',
      'Fyllning ska ha eget pris och egen bokningsbar tid — det är er återkommande intäkt',
      'Avtagning kostar tid och ska kosta pengar. Skriv ut det, så slipper ni diskussionen',
      'Nail art och design prissätts ofta per svårighetsgrad — ge exempel med bilder',
    ]},

    { sort: 'rubrik', text: 'Fyllningen är hela affären' },
    { sort: 'text', text: 'En ny kund är dyr att skaffa. En kund som kommer tillbaka var tredje vecka i två år är verksamheten. Ändå är fyllningen ofta det som är sämst beskrivet och krångligast att boka.' },
    { sort: 'lista', poster: [
      'Boka nästa fyllning innan kunden lämnar salongen. Det är den enskilt mest lönsamma vanan',
      'Skicka en påminnelse när det är dags, inte en vecka efter att det var dags',
      'Gör det lika lätt att boka fyllning som nyläggning — samma antal klick',
      'Skriv ut hur ofta ni rekommenderar påfyllning, så vet kunden vad de tackar ja till',
    ]},

    { sort: 'rubrik', text: 'Bilder: många, färska och era egna' },
    { sort: 'text', text: 'En nagelsalong utan bilder är en nagelsalong ingen bokar. Men mängden spelar mindre roll än ni tror — det som avgör är om kunden ser något som liknar det de själva vill ha.' },
    { sort: 'lista', poster: [
      'Fotografera varje set ni är nöjda med. En bild i veckan räcker för att flödet ska leva',
      'Visa bredden: enkelt och naturligt lika mycket som det påkostade. De flesta vill ha det enkla',
      'Samma ljus varje gång. Naglar fotograferade i olika ljus ser ut som olika kvalitet',
      'Lägg upp dem på Google-profilen också, inte bara på Instagram',
    ]},

    { sort: 'rubrik', text: 'Året: två toppar och en lång sommar' },
    { sort: 'text', text: 'December är årets tyngsta månad — fest, jul och nyår i följd. Maj och juni är den andra toppen med student, bal och bröllop, och de bokas veckor i förväg. Sommaren är jämnare men förskjuts mot pedikyr och naturligare uttryck.' },
    { sort: 'text', text: 'Praktiskt: synas i november för december, och i april för maj. Den som annonserar först i december annonserar mot en fullbokad kalender.' },

    { sort: 'rubrik', text: 'Frågan de googlar innan de bokar' },
    { sort: 'text', text: 'Hur länge håller det. Förstör det mina egna naglar. Hur ofta måste jag fylla. Gör avtagningen ont. Fyra frågor som avgör om någon bokar en behandling för tusen kronor, och som besvaras av forum i stället för av er.' },
    { sort: 'text', text: 'Skriv era egna svar på behandlingssidan. Ni får frågorna varje dag — ni behöver bara skriva ned det ni redan säger.' },

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Skapa eller komplettera Google-företagsprofilen om ni bara har Instagram',
      'Lägg upp tio av era bästa bilder på profilen',
      'Sätt eget pris och egen bokningsbar tid på fyllning',
      'Skriv svaren på de fyra vanligaste frågorna på er behandlingssida',
    ]},

    { sort: 'vidare', till: 'fler-bokningar-fran-google', text: 'Kom igång med Google-profilen — steg för steg' },
    { sort: 'vidare', till: 'vad-en-salongshemsida-behover', text: 'Vad sidan behöver för att en bild ska bli en bokning' },
  ],
})

/* ═══════════════════════════════════════════════════════════════════════
   FRANSAR & BRYN
   ═══════════════════════════════════════════════════════════════════════ */

const FRANSAR = bransch({
  slug:      'marknadsforing-for-fransar-och-bryn',
  titel:     'Marknadsföring för fransar och bryn',
  metaTitel: 'Marknadsföring fransförlängning & bryn — fler kunder',
  metaText:  'Så hittar kunder en fransstylist: rätt kategori, teknikerna som egna sökningar, påfyllning som återkommande intäkt och svar på frågan om egna fransar tar skada.',
  amne:      'Fransar & bryn',
  minuter:   8,
  ingress:   'Fransförlängning har den tydligaste återkommande intäkten av alla salongstjänster — samma kund var tredje vecka i åratal. Marknadsföringen ska därför göra två saker: hitta nya, och göra det omöjligt för de gamla att glömma bort påfyllningen.',
  sokord: [
    'marknadsföring fransförlängning',
    'fler kunder fransstylist',
    'brynstylist google',
    'boka fransar online',
    'marknadsföring fransstylist',
  ],
  innehall: [
    { sort: 'text', text: 'Den här branschen har den mest specifika sökningen av alla salongstjänster. Ingen söker på "skönhetssalong" när de vill ha volymfransar — de söker på tekniken. Det är både en möjlighet och ett krav: syns ni inte på teknikens namn syns ni inte alls.' },

    { sort: 'rubrik', text: 'Kategorin ska vara så nära som Google tillåter' },
    { sort: 'text', text: 'Står ni som "Skönhetssalong" konkurrerar ni med hudvård, naglar och massage om en sökning ingen av er egentligen vill ha. Välj den kategori som ligger närmast fransförlängning, och lägg skönhetssalong som underkategori om ni gör mer.' },
    { sort: 'text', text: 'Samma sak gäller bryn. Brynlaminering och brynstyling har vuxit snabbt och söks separat från fransar — behandlar ni dem som en fotnot till fransarna missar ni en hel efterfrågan.' },

    { sort: 'rubrik', text: 'Teknikerna är era sökord' },
    { sort: 'lista', poster: [
      'Klassiska, volym och hybrid är tre olika behandlingar med tre olika priser — och tre sökningar',
      'Franslyft och fransbehandling söks av dem som inte vill ha förlängning alls',
      'Brynlaminering, brynfärgning och brynstyling är egna behandlingar med egen kundgrupp',
      'Skriv ut skillnaden mellan teknikerna. De flesta kunder vet inte, och den som förklarar vinner',
    ]},
    { sort: 'text', text: 'En sida per teknik är inte överambitiöst i den här branschen — det är minimum. Sökningarna är så pass specifika att en samlingssida sällan matchar någon av dem.' },

    { sort: 'rubrik', text: 'Påfyllningen är verksamheten' },
    { sort: 'text', text: 'Nyläggning är hur en kund börjar. Påfyllning var andra till fjärde vecka är hur ni lever. En kund som fortsätter i ett år är värd mångdubbelt mer än nyläggningen, och det enda som avgör om de fortsätter är hur lätt det är att komma tillbaka.' },
    { sort: 'lista', poster: [
      'Boka påfyllningen innan kunden går. Kalendern i handen slår en påminnelse i efterhand',
      'Prissätt påfyllning efter intervall — två, tre och fyra veckor kostar olika mycket arbete',
      'Skicka påminnelse några dagar innan intervallet går ut, inte efter',
      'En kund som missat två påfyllningar är på väg bort. Hör av er innan de är det',
    ]},
    { sort: 'ruta', rubrik: 'Det som räddar mest', text: 'En automatisk påminnelse kopplad till senaste besöket är den enskilt mest lönsamma automatiken i den här branschen. Den kräver bara att ni vet när kunden var här sist — vilket ni gör, om bokningarna ligger i ett system.' },

    { sort: 'rubrik', text: 'Bilderna måste visa skillnaden, inte bara resultatet' },
    { sort: 'text', text: 'En bild på färdiga fransar säger lite. Två bilder — före och efter, samma öga, samma vinkel — säger allt. Det är den enda branschen där skillnaden är hela produkten.' },
    { sort: 'lista', poster: [
      'Nära, samma öga, samma ljus. Ett steg för långt bort och skillnaden försvinner',
      'Visa flera stilar: naturligt och dramatiskt drar helt olika kunder',
      'Fråga alltid om lov. Det är ett ansikte på nära håll',
      'Lägg upp på Google-profilen, inte bara i flödet',
    ]},

    { sort: 'rubrik', text: 'Frågan som stoppar bokningen' },
    { sort: 'text', text: 'Skadar det mina egna fransar. Det är den fråga som avgör om någon bokar sin första behandling, den ställs i varje forum, och den besvaras nästan aldrig av salongerna själva.' },
    { sort: 'text', text: 'Svara ärligt och utförligt på er egen sida: vad som händer med de egna fransarna, vad som avgör om de tar skada, och vad ni gör för att de inte ska göra det. Lägg till hur lång tid en nyläggning tar — två till tre timmar överraskar många — och om det gör ont.' },

    { sort: 'rubrik', text: 'Året' },
    { sort: 'text', text: 'Jämnare än de flesta salongsbranscher, med två toppar: maj och juni för bal, student och bröllop, och december för fest. Sommaren dippar något — bad, svett och sol sliter på fransarna, och en del pausar. Det är den period där påminnelser gör mest nytta.' },

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Kontrollera kategorin — står det Skönhetssalong ska det bytas',
      'Ge klassiska, volym och hybrid varsin sida med pris och tidsåtgång',
      'Skriv ett ärligt svar på frågan om egna fransar tar skada',
      'Sätt upp en påminnelse kopplad till påfyllningsintervallet',
    ]},

    { sort: 'vidare', till: 'fler-bokningar-fran-google', text: 'Rätt kategori och bilder på profilen — hela guiden' },
    { sort: 'vidare', till: 'synas-hogre-i-lokal-sok', text: 'Så bygger ni en sida per teknik' },
  ],
})

/* ═══════════════════════════════════════════════════════════════════════
   HUDVÅRD
   ═══════════════════════════════════════════════════════════════════════ */

const HUDVARD = bransch({
  slug:      'marknadsforing-for-hudvard',
  titel:     'Marknadsföring för hudvårdssalonger',
  metaTitel: 'Marknadsföring hudvårdssalong — fler behandlingar bokade',
  metaText:  'Vad som får kunder att välja er hudterapeut: behandlingssidor som förklarar, svar på frågorna de googlar, och vad ni inte får lova.',
  amne:      'Hudvård',
  minuter:   9,
  ingress:   'Hudvård är den bransch där kunden googlar mest innan de bokar. De läser om behandlingen, om vad den gör, om det gör ont och om det finns nedtid. Den som svarar på det får bokningen.',
  sokord: [
    'marknadsföring hudvårdssalong',
    'fler kunder hudterapeut',
    'ansiktsbehandling google',
    'boka hudvård online',
    'marknadsföring hudterapeut',
  ],
  innehall: [
    { sort: 'text', text: 'Er kund fattar ett övervägt beslut, ofta efter flera dagars läsande, och ofta om en behandling som kostar tusentals kronor och upprepas i en kur. Det gör innehållet till er viktigaste marknadsföring — inte bilderna, inte annonserna.' },
    { sort: 'text', text: 'Det är också goda nyheter. Kunder som läser är kunder som går att övertyga med kunskap, och kunskap är det ni har.' },

    { sort: 'rubrik', text: 'Varje behandling behöver en sida som förklarar' },
    { sort: 'text', text: 'En prislista med "Kemisk peeling 1 400 kr" säljer ingenting. Kunden vet inte vad en kemisk peeling är, för vem den passar, hur många gånger den behöver göras eller vad som händer med huden dagarna efter.' },
    { sort: 'lista', poster: [
      'Vad behandlingen gör, i klarspråk och utan varumärkesnamn på apparaten',
      'För vem den passar — och för vem den inte gör det',
      'Hur lång tid den tar, hur många gånger som behövs, och med vilket mellanrum',
      'Vad som händer efteråt: rodnad, fjällning, hur länge, vad man ska undvika',
      'Vad den kostar, styckvis och som kur',
    ]},
    { sort: 'text', text: 'Behandlingsnamnen är dessutom era sökord. Ansiktsbehandling, kemisk peeling, microneedling, aknebehandling och hudanalys söks var för sig, och den som bara har en sida som heter Behandlingar syns för ingen av dem.' },

    { sort: 'rubrik', text: 'Konsultationen är er bästa säljkanal' },
    { sort: 'text', text: 'De flesta hudvårdssalonger erbjuder en hudanalys eller konsultation, och de flesta nämner den knappt. Det är bakvänt — det är den enklaste bokningen en tveksam kund kan göra, och den som suttit hos er en gång bokar oftast en behandling.' },
    { sort: 'text', text: 'Ge konsultationen en egen sida, skriv ut om den kostar något och om avgiften dras av vid en bokad behandling. Gör den bokningsbar online. En osäker kund bokar hellre en analys än en peeling.' },

    { sort: 'rubrik', text: 'Var försiktig med vad ni lovar' },
    { sort: 'text', text: 'Det här är den enda salongsbranschen där formuleringar kan bli ett juridiskt problem. Påståenden om att en behandling botar, läker eller ger ett medicinskt resultat är hälsopåståenden, och de får inte användas hur som helst i marknadsföring.' },
    { sort: 'ruta', rubrik: 'Två skäl att hålla igen', text: 'Det ena är reglerna. Det andra är att överdrivna löften skapar besvikna kunder — och en besviken hudvårdskund skriver ett långt omdöme. Beskriv vad behandlingen gör, inte vad den botar.' },

    { sort: 'rubrik', text: 'Bevisa kompetensen, inte resultatet' },
    { sort: 'text', text: 'Före- och efterbilder är svårare här än i andra branscher: ljus och kameror förändrar hud, och en bild kan lova mer än en behandling håller. Låt i stället kompetensen bära förtroendet.' },
    { sort: 'lista', poster: [
      'Skriv ut hudterapeutens utbildning och certifieringar — de betyder något för den som läst på',
      'Beskriv era metoder och produktserier sakligt, utan superlativ',
      'Låt omdömen göra jobbet bilderna inte kan göra',
      'Publicerar ni bilder: samma ljus, ingen retusch, och alltid med samtycke',
    ]},

    { sort: 'rubrik', text: 'Året styrs av solen' },
    { sort: 'text', text: 'Peelingar och behandlingar som gör huden ljuskänslig hör hemma under den mörka halvan av året, och det vet era kunder inte. Skriv ut det — det är både bra rådgivning och en anledning för dem att boka nu i stället för i maj.' },
    { sort: 'lista', poster: [
      'September till mars: peelingar, microneedling och kurer. Er tyngsta säsong',
      'April och maj: inför sommaren, ljusare behandlingar och underhåll',
      'Juni till augusti: lugnare. Fokus på fukt, skydd och underhåll',
      'Januari: många vill göra om efter helgerna. Kurer säljs bäst här',
    ]},

    { sort: 'rubrik', text: 'Frågan de googlar innan de bokar' },
    { sort: 'text', text: 'Gör det ont. Hur ser jag ut efteråt och hur länge. Hur många gånger behövs. Passar det min hudtyp. Kan jag jobba dagen efter.' },
    { sort: 'text', text: 'Fem frågor, samma varje gång, och de avgör hela bokningen. Skriv svaren på varje behandlingssida. Det tar en eftermiddag och det är den bästa eftermiddagen ni kan lägga på er marknadsföring.' },

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Ge er mest sålda behandling en egen sida med de fem frågorna besvarade',
      'Gör konsultationen bokningsbar online och skriv ut vad den kostar',
      'Gå igenom er text och stryk allt som lovar ett medicinskt resultat',
      'Skriv ut hudterapeutens utbildning där den syns',
    ]},

    { sort: 'vidare', till: 'vad-en-salongshemsida-behover', text: 'Så byggs sidorna som svarar på frågorna' },
    { sort: 'vidare', till: 'synas-hogre-i-lokal-sok', text: 'Varför en sida per behandling avgör synligheten' },
  ],
})

/* ═══════════════════════════════════════════════════════════════════════
   MASSAGE & SPA
   ═══════════════════════════════════════════════════════════════════════ */

const MASSAGE = bransch({
  slug:      'marknadsforing-for-massage-och-spa',
  titel:     'Marknadsföring för massage och spa',
  metaTitel: 'Marknadsföring massage & spa — fler bokade behandlingar',
  metaText:  'Så hittar kunder er massör: rätt kategori för friskvård eller behandling, friskvårdsbidraget utskrivet, presentkort i tid och bokning som fungerar på kvällen.',
  amne:      'Massage & spa',
  minuter:   8,
  ingress:   'Massage delar sig i två helt olika kunder — den som vill koppla av och den som har ont. Google behandlar dem som olika sökningar, och det bör ni också.',
  sokord: [
    'marknadsföring massage',
    'fler kunder massör',
    'boka massage online',
    'friskvårdsbidrag massage',
    'marknadsföring spa',
  ],
  innehall: [
    { sort: 'text', text: 'Den viktigaste frågan i den här branschen ställs innan ni skrivit en enda rad marknadsföring: vilken av två verksamheter är ni? Friskvård och avkoppling, eller behandling av besvär och skador?' },
    { sort: 'text', text: 'Svaret avgör vilken kategori Google sätter er i, vilka sökningar ni är med i, vilka ord ni ska skriva, och vilken sorts kund som bokar. Försöker ni vara båda blir ni sämre synliga för båda.' },

    { sort: 'rubrik', text: 'Kategorin: välj efter vad ni faktiskt gör mest av' },
    { sort: 'text', text: 'En massör som mest jobbar med nack- och ryggbesvär hör hemma i en annan kategori än ett spa som säljer avkoppling i två timmar. Väljer ni den bredaste kategorin för att inte utesluta någon blir resultatet att ingen sökning matchar er riktigt.' },
    { sort: 'text', text: 'Gör ni verkligen båda: välj huvudkategori efter var pengarna kommer ifrån, och lägg den andra som underkategori. Skriv sedan skilda sidor för de två — de läses av olika personer med olika frågor.' },

    { sort: 'rubrik', text: 'Friskvårdsbidraget är er vanligaste fråga' },
    { sort: 'text', text: 'Om massagen går att betala med friskvårdsbidrag avgör bokningen för en stor del av era kunder, och de flesta salonger nämner det inte alls eller nämner det på fel ställe.' },
    { sort: 'lista', poster: [
      'Skriv ut om ni tar emot friskvårdsbidrag, och via vilka system',
      'Lägg det på behandlingssidan, inte begravt på en kontaktsida',
      'Förklara hur det går till — många har bidraget men har aldrig använt det',
      'Ta med det i Google-profilens frågor och svar. Det söks ofta direkt där',
    ]},
    { sort: 'ruta', rubrik: 'Ett sökord i sig', text: '"Friskvårdsbidrag massage" plus ort är en egen sökning med tydlig köpavsikt. Den som söker så har pengar avsatta och letar bara efter någon som tar emot dem.' },

    { sort: 'rubrik', text: 'Behandlingslängderna är egna sökningar' },
    { sort: 'text', text: 'Trettio, sextio och nittio minuter är olika produkter med olika pris och olika kund. Den som söker "massage 30 min" har en lunchrast; den som söker nittio minuter planerar en eftermiddag.' },
    { sort: 'text', text: 'Prissätt dem separat, gör dem valbara var för sig i bokningen, och skriv ut vad som hinns med i varje. En kund som inte vet skillnaden bokar ofta den kortaste, och blir mindre nöjd.' },

    { sort: 'rubrik', text: 'Presentkorten avgör december' },
    { sort: 'text', text: 'Presentkort är en betydande del av årsintäkten i den här branschen, och nästan hela den delen säljs på tre veckor i december. Ändå görs de oftast synliga först när kunderna redan börjat leta.' },
    { sort: 'lista', poster: [
      'Gör presentkortet synligt på sidan från början av november',
      'Sälj det online. Den som ska köpa en julklapp klockan tio på kvällen ringer inte',
      'Skriv ut giltighetstiden — det är den vanligaste frågan, och den lagen är reglerad',
      'Januari är inlösenmånad. Räkna med den när ni planerar kalendern',
    ]},

    { sort: 'rubrik', text: 'Kvällar och helger är ert säljargument' },
    { sort: 'text', text: 'En stor del av era kunder jobbar dagtid och kan inte boka en behandling klockan två på tisdagen. Har ni sena tider eller helgöppet är det förmodligen det starkaste ni har att säga — och det står nästan alltid bara i en kalender ingen ser.' },
    { sort: 'text', text: 'Skriv ut det i rubriken på sidan och i öppettiderna på profilen. En kund som tror att ni stänger klockan fem söker vidare.' },

    { sort: 'rubrik', text: 'Frågan de googlar innan de bokar' },
    { sort: 'text', text: 'Hur klär man sig. Gör det ont. Är det pinsamt. Vad händer om jag inte vill prata. Fyra frågor som ingen ställer i telefon och som stoppar fler förstagångsbokningar än priset gör.' },
    { sort: 'text', text: 'Skriv ett stycke om hur ett besök går till, från dörren till efteråt. Det är enkelt att skriva, det är inget någon annan har, och det tar bort exakt den osäkerhet som får någon att skjuta upp bokningen i ett halvår.' },

    { sort: 'rubrik', text: 'Vad ni gör den här veckan' },
    { sort: 'lista', poster: [
      'Bestäm om ni är friskvård eller behandling och sätt kategorin därefter',
      'Skriv ut om friskvårdsbidrag går att använda, på behandlingssidan',
      'Prissätt 30, 60 och 90 minuter separat och gör dem valbara i bokningen',
      'Skriv stycket om hur ett besök går till',
    ]},

    { sort: 'vidare', till: 'fler-bokningar-fran-google', text: 'Kategorin och profilen — hela guiden' },
    { sort: 'vidare', till: 'vad-en-salongshemsida-behover', text: 'Vad sidan behöver för att en tveksam kund ska boka' },
  ],
})

export const BRANSCHGUIDER: Guide[] = [FRISOR, BARBER, NAGLAR, FRANSAR, HUDVARD, MASSAGE]
