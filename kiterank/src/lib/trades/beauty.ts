import type { TradePack } from './types'

/* Hud & skönhet — facials and skin treatments, where the customer's biggest
   question is always "is this right for my skin?" */

export const BEAUTY: TradePack = {
  id: 'beauty',
  pick: { label: 'Hudvård & skönhet', desc: 'Ansiktsbehandlingar och hudterapi', icon: '◈' },
  label: 'Hudvårdssalong',
  work: 'behandlingen',
  varies: 'behandlingens längd och innehåll',
  heroKicker:  'Hudvård & skönhet',
  heroHeading: 'Hud som mår bra syns',
  heroBody:    'Vi börjar med en hudanalys och bygger behandlingen därifrån. Ingen säljer dig något du inte behöver — målet är en hud du är nöjd med, inte en hylla med produkter.',
  aboutTitle:  'Kunskap före kvicka lösningar',
  aboutBody:   'Hudvård tar tid och tål inga genvägar. Vi jobbar med behandlingar som ger resultat över veckor och månader, och är ärliga med vad som går att åstadkomma och vad som inte gör det.',
  ctaText:     'Boka behandling',
  featured: [
    { name: 'Klassisk ansiktsbehandling', desc: 'Rengöring, peeling, mask och massage',       price: 'från 950 kr' },
    { name: 'Kemisk peeling',             desc: 'Jämnar ut ton och struktur i en kur',        price: 'från 1 200 kr' },
    { name: 'Microneedling',              desc: 'Stimulerar kollagen för fastare hud',        price: 'från 1 800 kr' },
  ],
  categories: [
    {
      category: 'Ansiktsbehandlingar',
      items: [
        { name: 'Klassisk ansiktsbehandling', desc: 'Rengöring, peeling, utrensning, mask och massage', duration: '60 min', price: '950 kr' },
        { name: 'Djuprengörande',             desc: 'För oren hud — fokus på porer och utrensning',     duration: '75 min', price: '1 100 kr' },
        { name: 'Återfuktande',               desc: 'För torr och stram hud, med intensiv mask',        duration: '60 min', price: '1 050 kr' },
        { name: 'Express 30 min',             desc: 'Rengöring och mask när tiden är knapp',            duration: '30 min', price: '650 kr' },
      ],
    },
    {
      category: 'Avancerade behandlingar',
      items: [
        { name: 'Kemisk peeling — mild',   desc: 'Fruktsyror som jämnar ut ton och struktur',        duration: '45 min', price: '1 200 kr' },
        { name: 'Kemisk peeling — medium', desc: 'Kraftfullare kur, rekommenderas i serie om tre',   duration: '60 min', price: '1 600 kr' },
        { name: 'Microneedling',           desc: 'Stimulerar hudens egen kollagenproduktion',        duration: '75 min', price: '1 800 kr' },
        { name: 'LED-terapi',              desc: 'Lugnar inflammation, ofta som tillägg',            duration: '20 min', price: '450 kr' },
      ],
    },
    {
      category: 'Hudanalys & rådgivning',
      items: [
        { name: 'Hudanalys',            desc: 'Genomgång av hudtyp, tillstånd och en plan framåt', duration: '30 min', price: '400 kr' },
        { name: 'Uppföljning i kur',    desc: 'Avstämning mellan behandlingarna i en kur',         duration: '20 min', price: '250 kr' },
      ],
    },
  ],
  visit: [
    'Vi börjar alltid med en hudanalys — utan den är en behandling en gissning.',
    'Du får veta vad vi ser, vad vi föreslår och varför. Och vad du kan förvänta dig, realistiskt.',
    'Efteråt får du en enkel hemmarutin. Fyra produkter som används rätt slår tolv som står oanvända.',
  ],
  faq: [
    { q: 'Hur förbereder jag mig?',            a: 'Kom med ren hud utan smink om du kan. Undvik stark solning och peeling hemma några dagar innan.' },
    { q: 'Blir huden röd efteråt?',            a: 'Efter en klassisk behandling brukar rodnaden lägga sig inom en timme. Efter peeling eller microneedling kan huden vara röd ett dygn.' },
    { q: 'Hur många behandlingar behöver jag?', a: 'Det beror på vad vi ska åtgärda. Vid pigment eller ärr jobbar vi i kurer om tre till sex, med några veckors mellanrum.' },
    { q: 'Kan jag komma om jag är gravid?',    a: 'Ja, men vissa syror och behandlingar väljer vi bort. Berätta bara när du bokar så anpassar vi.' },
  ],
  teamTitles: ['Hudterapeut & grundare', 'Hudterapeut', 'Hudterapeut'],
  galleryAlts: [
    'Behandlingsrummet', 'Hudanalys pågår', 'Produkter vi arbetar med',
    'Mask under behandling', 'Salongens väntrum', 'Detalj från behandlingsbänken',
  ],
  reviews: [
    { author: "Anna F.", rating: 5, text: "Den första hudanalysen där någon faktiskt förklarade vad de såg och varför. Har följt deras råd i ett halvår och ser skillnad." },
    { author: "Maria T.", rating: 5, text: "Ansiktsbehandlingen var underbar, men det som gjorde mest nytta var rutinen jag fick med mig hem." },
    { author: "Elin H.", rating: 5, text: "De sålde mig inte den dyraste behandlingen utan den jag faktiskt behövde. Ovanligt och väldigt skönt." },
    { author: "Camilla J.", rating: 4, text: "Mycket duktig hudterapeut. Hade gärna sett fler kvällstider, men det går att lösa om man bokar i god tid." },
    { author: "Sara V.", rating: 5, text: "Gick hit för problemhud efter att ha testat allt möjligt själv. Fick en plan i stället för en produkt." },
    { author: "Nina D.", rating: 5, text: "Lugnt, rent och professionellt hela vägen. Känner mig alltid omhändertagen här." },
  ],
  articles: [
    {
      title: 'Så läser du din egen hud',
      slug: 'sa-laser-du-din-hud',
      excerpt: 'Torr eller uttorkad? Känslig eller irriterad? Skillnaderna avgör vilken behandling som hjälper — och vilken som gör det värre.',
      sections: [
        { h: 'Torr är en hudtyp, uttorkad är ett tillstånd', p: 'Torr hud producerar för lite talg och är det livet ut. Uttorkad hud saknar vatten och kan drabba vem som helst, även den som är fet i T-zonen. Behandlingarna är olika.' },
        { h: 'Känslig eller bara irriterad?', p: 'Känslig hud reagerar på det mesta, alltid. Irriterad hud har blivit det av något — en ny produkt, för mycket peeling, en kall vinter. Det första anpassar vi oss efter, det andra åtgärdar vi.' },
        { h: 'När du är osäker', p: 'En hudanalys tar en halvtimme och sparar ofta både pengar och månader av fel produkter.' },
      ],
    },
    {
      title: 'Kemisk peeling — vad den gör och vad den inte gör',
      slug: 'kemisk-peeling',
      excerpt: 'Effektivt mot pigment, ojämn ton och grov struktur. Här är vad du realistiskt kan förvänta dig, och hur en kur läggs upp.',
      sections: [
        { h: 'Vad den gör', p: 'Syran löser upp bindningarna mellan de döda hudcellerna så att de släpper. Under kommer jämnare, klarare hud — och hudens egen förnyelse får en knuff.' },
        { h: 'Vad den inte gör', p: 'En peeling tar inte bort djupa rynkor eller ärr på egen hand, och den ersätter inte solskydd. Utan solskydd efteråt kan pigmentet till och med bli värre.' },
        { h: 'Så lägger vi upp en kur', p: 'Tre till sex behandlingar med två till fyra veckors mellanrum, med styrkan upptrappad efterhand. Vi stämmer av mellan varje.' },
      ],
    },
    {
      title: 'Fyra produkter som räcker',
      slug: 'fyra-produkter-som-racker',
      excerpt: 'En hudvårdsrutin behöver inte vara lång för att fungera. Det här är basen — resten är tillägg för specifika behov.',
      sections: [
        { h: 'Rengöring, morgon och kväll', p: 'En mild rengöring som inte lämnar huden stram. Stramhet är inte ett tecken på att den är ren, utan på att den är skalad.' },
        { h: 'Fukt och solskydd', p: 'En fuktkräm som passar din hudtyp, och solskydd varje dag året om. Solskyddet är den enskilt mest effektiva anti-age-produkt som finns.' },
        { h: 'En aktiv produkt', p: 'Vitamin A, C eller syra beroende på vad du vill åtgärda. En i taget, införd långsamt — flera aktiva samtidigt är den vanligaste orsaken till irriterad hud.' },
      ],
    },
    {
      title: 'Ditt första besök hos oss',
      slug: 'ditt-forsta-besok',
      excerpt: 'Hudanalys, behandling och en plan framåt. Så ser den första timmen ut.',
      sections: [
        { h: 'Analysen först', p: 'Vi tittar på huden i förstoring och går igenom din nuvarande rutin, mediciner och vad du vill åstadkomma. Det tar tjugo minuter och styr allt annat.' },
        { h: 'Behandlingen anpassas på plats', p: 'Vi väljer produkter och styrka efter vad huden tål just idag — inte efter vad som stod i bokningen.' },
        { h: 'Planen efteråt', p: 'Du får veta vad som är rimligt att uppnå, hur många besök det brukar ta och vad du behöver göra hemma.' },
      ],
    },
    {
      title: 'Vinterhud — därför beter den sig annorlunda',
      slug: 'vinterhud',
      excerpt: 'Kall luft ute, torr luft inne och långa varma duschar. Huden tappar fukt snabbare än den hinner bygga upp den.',
      sections: [
        { h: 'Barriären försvagas', p: 'Kyla drar ihop blodkärlen och torr inomhusluft drar ut fukt. Resultatet är en barriär som släpper igenom mer — därför svider produkter som fungerade i somras.' },
        { h: 'Byt till rikare, inte fler', p: 'En rikare fuktkräm och färre aktiva produkter under de kallaste månaderna. Trappa upp igen när våren kommer.' },
        { h: 'Behandling som hjälper', p: 'En återfuktande behandling var sjätte vecka under vintern håller barriären i skick — och gör att resten av rutinen fungerar bättre.' },
      ],
    },
    {
      title: 'Presentkort',
      slug: 'presentkort',
      excerpt: 'Gäller på alla våra behandlingar i ett år, och kan delas upp på flera besök.',
      sections: [
        { h: 'Så fungerar det', p: 'Välj belopp eller en behandling. Kortet gäller i ett år från köpet och kan användas vid flera tillfällen.' },
        { h: 'Beställ', p: 'Kom förbi eller ring oss, så skickar vi det digitalt samma dag.' },
      ],
    },
  ],
}
