import type { TradePack } from './types'

/* Frisörsalong — the trade most Kiterank customers come from. */

export const SALON: TradePack = {
  id: 'salon',
  pick: { label: 'Frisörsalong', desc: 'Klippning, färg och styling', icon: '✂' },
  label: 'Frisörsalong',
  work: 'klippningen eller färgningen',
  varies: 'hårlängd och tidsåtgång',
  heroKicker:  'Frisörsalong',
  heroHeading: 'Hår som speglar dig',
  heroBody:    'Från klassiska klippningar till modern balayage. Vi lyssnar först, klipper sedan — och du går härifrån med ett resultat du kan sköta själv hemma.',
  aboutTitle:  'Ditt hem för hårvård',
  aboutBody:   'Vi är en salong där ingen behöver känna sig obekväm. Oavsett om du vill ha en trimning eller en helt ny färg börjar vi med att prata igenom vad du vill ha och vad som fungerar med ditt hår.',
  ctaText:     'Boka din tid',
  featured: [
    { name: 'Klippning & styling', desc: 'Tvätt, klippning och läggning anpassad till ditt hår', price: 'från 650 kr' },
    { name: 'Balayage',            desc: 'Mjuka ljusningar som växer ut utan skarp ansats',      price: 'från 2 200 kr' },
    { name: 'Färgning & slingor',  desc: 'Naturliga nyanser eller en tydlig förändring',         price: 'från 1 200 kr' },
  ],
  categories: [
    {
      category: 'Klippning',
      items: [
        { name: 'Klippning dam',        desc: 'Tvätt, klippning och enkel inläggning',        duration: '45 min', price: '650 kr' },
        { name: 'Klippning herr',       desc: 'Klippning med sax eller maskin, exkl. tvätt',  duration: '30 min', price: '450 kr' },
        { name: 'Klippning barn <12 år', desc: 'Snabb och enkel klippning för de minsta',      duration: '20 min', price: '290 kr' },
        { name: 'Lugg & putsning',      desc: 'Snabb justering mellan besöken',               duration: '15 min', price: '200 kr' },
      ],
    },
    {
      category: 'Färgning & slingor',
      items: [
        { name: 'Helfärg',             desc: 'Heltäckande färg från rot till topp',            duration: '90 min',  price: 'från 1 200 kr' },
        { name: 'Ansatsfärg',          desc: 'Färgar utväxten och jämnar ut nyansen',          duration: '60 min',  price: 'från 950 kr' },
        { name: 'Slingor (halvhuvud)', desc: 'Ljusare partier kring ansiktet och toppen',      duration: '120 min', price: 'från 1 500 kr' },
        { name: 'Slingor (helhuvud)',  desc: 'Ljusning i hela håret med folieteknik',          duration: '150 min', price: 'från 1 900 kr' },
        { name: 'Balayage',            desc: 'Frihandsmålad ljusning med mjuk övergång',       duration: '150 min', price: 'från 2 200 kr' },
        { name: 'Toning',              desc: 'Friskar upp nyansen mellan färgningarna',        duration: '30 min',  price: '450 kr' },
      ],
    },
    {
      category: 'Behandlingar',
      items: [
        { name: 'Keratinbehandling', desc: 'Glättar och reparerar, håller upp till 3 månader', duration: '120 min', price: 'från 2 500 kr' },
        { name: 'Djupnärande mask',  desc: 'Intensiv återfuktning för torrt eller slitet hår', duration: '30 min',  price: '450 kr' },
        { name: 'Hårbottenbehandling', desc: 'Rengör och lugnar en känslig hårbotten',         duration: '30 min',  price: '350 kr' },
      ],
    },
    {
      category: 'Styling',
      items: [
        { name: 'Läggning & blow-dry', desc: 'Fönad styling inför fest eller fotografering', duration: '45 min', price: '550 kr' },
        { name: 'Uppsättning',         desc: 'Uppsatt hår för bröllop och högtid',           duration: '60 min', price: 'från 900 kr' },
        { name: 'Lockning',            desc: 'Vågor eller lockar som håller hela kvällen',   duration: '45 min', price: '600 kr' },
      ],
    },
  ],
  visit: [
    'Du bokar tid när det passar dig, online eller på telefon.',
    'Vi börjar med en konsultation: vad du vill ha, vad som fungerar med ditt hår och vad det kostar. Du får priset innan vi börjar.',
    'Efteråt går vi igenom hur du får till samma resultat hemma — och vilka produkter som faktiskt behövs.',
  ],
  faq: [
    { q: 'Hur ofta bör jag klippa mig?', a: 'De flesta trivs med var åttonde till tolfte vecka. Har du en kort frisyr som ska hålla formen ligger sanningen närmare sex till åtta veckor.' },
    { q: 'Vad kostar en färgning?',      a: 'Priset beror på hårets längd och hur stor förändringen är. Du får alltid ett exakt pris innan vi sätter igång.' },
    { q: 'Kan jag komma utan att boka?', a: 'Vi tar helst emot bokade besök så att du slipper vänta, men hör av dig — ibland finns en lucka samma dag.' },
    { q: 'Hur länge håller en balayage?', a: 'Eftersom den växer ut utan skarp ansats klarar sig många med två besök om året, med en toning emellan.' },
  ],
  teamTitles: ['Frisör & grundare', 'Frisör och färgspecialist', 'Frisör'],
  galleryAlts: [
    'Balayage i varma toner', 'Klippning med lugg', 'Uppsättning inför bröllop',
    'Slingor kring ansiktet', 'Salongens entré', 'Färgning under arbete',
  ],
  reviews: [
    { author: "Emma L.", rating: 5, text: "Första gången jag går härifrån och känner att färgen blev precis som jag tänkt mig. De lyssnade på vad jag ville i stället för att köra sin egen grej." },
    { author: "Andreas P.", rating: 5, text: "Har gått hit i tre år nu. Samma frisör varje gång, och hon kommer ihåg exakt hur jag vill ha det. Slipper förklara om från början." },
    { author: "Sofia M.", rating: 5, text: "Bokade balayage och fick en ordentlig konsultation innan. De sa rakt ut att det skulle behövas två besök för att komma dit jag ville — uppskattade ärligheten." },
    { author: "Karin B.", rating: 4, text: "Väldigt nöjd med klippningen. Fick vänta tio minuter över tiden, men de sa till direkt och bjöd på kaffe." },
    { author: "Johan S.", rating: 5, text: "Tog med min dotter för hennes första riktiga klippning. De hade tålamod hela vägen och hon gick därifrån jättestolt." },
    { author: "Linnea K.", rating: 5, text: "Bästa hårbottenbehandlingen jag testat. Fick också konkreta tips på vad jag skulle göra hemma i stället för att bara bli sålda produkter." },
  ],
  articles: [
    {
      title: 'Balayage eller slingor — vad passar ditt hår?',
      slug: 'balayage-eller-slingor',
      excerpt: 'Två tekniker som ofta blandas ihop. Här är skillnaden, vad de kostar att underhålla och hur du väljer rätt från början.',
      sections: [
        { h: 'Slingor ger jämnhet', p: 'Slingor läggs i folie från hårbotten och ut. Resultatet blir jämnt och förutsägbart — precis vad du vill ha vid en tydlig ljusning eller för att täcka grått.\n\nBaksidan är att ansatsen syns när håret växer. Räkna med att boka om var åttonde till tionde vecka.' },
        { h: 'Balayage ger mjukhet', p: 'Balayage målas på fritt hand och börjar en bit ner i håret. Övergången blir mjuk, och framför allt: den växer ut utan skarp linje.\n\nDärför fungerar balayage bra om du vill komma in mer sällan. Många klarar sig med två besök om året.' },
        { h: 'Så väljer du', p: 'Vill du ha en tydlig förändring och kommer gärna in ofta — välj slingor. Vill du ha något som håller länge och växer ut snyggt — välj balayage.\n\nÄr du osäker, boka en konsultation. Den är kostnadsfri och tar tjugo minuter.' },
      ],
    },
    {
      title: 'Så håller färgen längre — fem saker som faktiskt spelar roll',
      slug: 'sa-haller-fargen-langre',
      excerpt: 'Färgen bleknar snabbast de första två veckorna. Det mesta som avgör hur länge den håller händer hemma, inte i salongen.',
      sections: [
        { h: 'Vänta två dygn med första tvätten', p: 'Färgen fortsätter att sätta sig efter att du lämnat salongen. Tvättar du håret samma kväll sköljer du bort en del av arbetet.' },
        { h: 'Sänk temperaturen och byt schampo', p: 'Hett vatten öppnar hårets yttre lager och pigmenten följer med ut. Ljummet räcker — avsluta gärna kallt.\n\nSulfater rengör effektivt, lite för effektivt för färgat hår. Ett milt schampo förlänger färgen märkbart.' },
        { h: 'Skydda mot sol och klor', p: 'En sommarvecka vid poolen tar ut sin rätt. Ett leave in-skydd före badet gör mer nytta än någon behandling efteråt.\n\nBoka gärna en toning mellan färgningarna — tjugo minuter som friskar upp nyansen till en bråkdel av priset.' },
      ],
    },
    {
      title: 'Vårens färger — det vi ser mest av just nu',
      slug: 'varens-farger',
      excerpt: 'Varma bruna toner, mjuka ljusningar och nyanser som växer ut utan skarp linje. En titt på vad kunderna frågar efter i år.',
      sections: [
        { h: 'Varmt brunt tar över', p: 'Efter flera år av kalla, askiga toner går pendeln tillbaka. Varma bruna nyanser med en gnutta kopparglöd klär de flesta — och är skonsammare mot håret, eftersom vi inte behöver ljusa lika mycket.' },
        { h: 'Ljusningar som får växa', p: 'Det som förenar årets förfrågningar är att ingen vill ha en skarp ansats. Balayage, babylights och mjuka ljusningar kring ansiktet är alla byggda för att växa ut fint.' },
        { h: 'Vill du prova?', p: 'Ta med en bild på det du gillar när du kommer. Det säger mer än någon beskrivning, och vi kan direkt säga vad som är realistiskt utifrån ditt hår.' },
      ],
    },
    {
      title: 'Din första gång hos oss — så går besöket till',
      slug: 'din-forsta-gang',
      excerpt: 'Från konsultationen till sista koll i spegeln. Vad som händer, hur lång tid det tar och vad du behöver ta med dig.',
      sections: [
        { h: 'Vi börjar med att prata', p: 'De första tio minuterna handlar inte om hår utan om dig: hur mycket tid du lägger en vanlig morgon, vad som fungerat och vad som inte gjort det. Har du bilder med dig tittar vi på dem tillsammans.' },
        { h: 'Sedan sätter vi igång', p: 'Du får veta ungefär hur lång tid behandlingen tar och vad den kostar innan vi börjar. Blir det ändringar under vägen säger vi till först.' },
        { h: 'Innan du går', p: 'Vi går igenom hur du får till samma resultat hemma, och vilka produkter som behövs — och vilka som inte behövs. Vill du boka nästa besök direkt fixar vi det på plats.' },
      ],
    },
    {
      title: 'Torrt hår på vintern? Det här hjälper',
      slug: 'torrt-har-pa-vintern',
      excerpt: 'Inomhusvärme, mössor och långa varma duschar. Vintern är hård mot håret — men det mesta går att förebygga.',
      sections: [
        { h: 'Torr luft inomhus', p: 'Element som går för fullt sänker luftfuktigheten rejält. Håret tappar fukt hela dagen utan att du märker det. En inpackning i veckan väger upp mycket av det.' },
        { h: 'Friktion från mössan', p: 'Mössan i sig är inte problemet — materialet är det. Ull och grova stickningar sliter på hårytan. Ett foder i siden eller satin gör stor skillnad.' },
        { h: 'Det du kan göra i salongen', p: 'En återfuktande behandling tar tjugo minuter i samband med klippningen och håller i flera veckor. Under vinterhalvåret rekommenderar vi den till de flesta — särskilt om håret är färgat.' },
      ],
    },
    {
      title: 'Presentkort — en tid att se fram emot',
      slug: 'presentkort',
      excerpt: 'Ett presentkort som gäller på allt vi gör, utan sista förbrukningsdag att hålla reda på.',
      sections: [
        { h: 'Så fungerar det', p: 'Du väljer själv belopp eller en specifik behandling. Kortet gäller i ett år och kan användas vid flera tillfällen om beloppet räcker till mer än ett besök.' },
        { h: 'Var får jag tag på det?', p: 'Kom förbi salongen så skriver vi ut ett direkt, eller ring oss så löser vi det över telefon och skickar det digitalt samma dag.' },
      ],
    },
  ],
}
