import type { TradePack } from './types'

/* Spa & massage — the one trade where the site's job is to lower the pulse
   before the visitor has even booked. */

export const SPA: TradePack = {
  id: 'spa',
  pick: { label: 'Spa & massage', desc: 'Massage, kroppsbehandlingar och avkoppling', icon: '◍' },
  label: 'Spa',
  work: 'behandlingen',
  varies: 'behandlingens längd',
  heroKicker:  'Spa & massage',
  heroHeading: 'Ro för kropp och sinne',
  heroBody:    'En timme där ingen når dig. Vi anpassar tryck och teknik efter hur kroppen mår just den dagen — inte efter vad som stod i bokningen.',
  aboutTitle:  'En paus från allt annat',
  aboutBody:   'Vi har byggt en plats som är tyst på riktigt. Behandlingarna är hantverk, men den viktigaste delen är att du får landa innan de börjar och sitta kvar en stund efteråt.',
  ctaText:     'Boka behandling',
  featured: [
    { name: 'Klassisk massage',   desc: 'Avslappnande helkroppsmassage',           price: 'från 950 kr' },
    { name: 'Djupvävnadsmassage', desc: 'Intensivt tryck mot spänningar',          price: 'från 1 100 kr' },
    { name: 'Hot stone',          desc: 'Varma stenar som löser upp muskler',      price: 'från 1 350 kr' },
  ],
  categories: [
    {
      category: 'Massage',
      items: [
        { name: 'Klassisk massage 60 min', desc: 'Avslappnande helkroppsmassage',              duration: '60 min', price: '950 kr' },
        { name: 'Klassisk massage 90 min', desc: 'Samma behandling med tid för hela kroppen',  duration: '90 min', price: '1 300 kr' },
        { name: 'Djupvävnadsmassage',      desc: 'Kraftigare tryck mot djupa spänningar',      duration: '60 min', price: '1 100 kr' },
        { name: 'Rygg & nacke 30 min',     desc: 'Fokuserad behandling när tiden är knapp',    duration: '30 min', price: '650 kr' },
        { name: 'Gravidmassage',           desc: 'Sidoläge med stöd, från vecka 13',           duration: '60 min', price: '1 000 kr' },
      ],
    },
    {
      category: 'Kropp & ansikte',
      items: [
        { name: 'Hot stone',           desc: 'Massage med varma stenar för djup värme',    duration: '75 min', price: '1 350 kr' },
        { name: 'Kroppsskrubb',        desc: 'Peeling och inoljning av hela kroppen',      duration: '45 min', price: '850 kr' },
        { name: 'Ansiktsbehandling',   desc: 'Rengörande och återfuktande, med massage',   duration: '60 min', price: '1 050 kr' },
        { name: 'Fotbehandling',       desc: 'Fotbad, peeling och massage',                duration: '45 min', price: '750 kr' },
      ],
    },
    {
      category: 'Paket',
      items: [
        { name: 'Halvdag för två',  desc: 'Massage, ansiktsbehandling och tid i relaxen',  duration: '180 min', price: '3 900 kr' },
        { name: 'Lugn & ro',        desc: 'Kroppsskrubb och klassisk massage',             duration: '105 min', price: '1 700 kr' },
        { name: 'Presentkort',      desc: 'Valfritt belopp, gäller i ett år',              duration: '—',       price: 'från 500 kr' },
      ],
    },
  ],
  visit: [
    'Kom gärna tio minuter innan så hinner du landa innan behandlingen börjar.',
    'Vi frågar hur du mår och vad kroppen behöver. Trycket anpassas hela vägen — säg till när som helst.',
    'Efteråt får du sitta kvar en stund med vatten eller te. Det är en del av behandlingen, inte en artighet.',
  ],
  faq: [
    { q: 'Vad ska jag ha på mig?',      a: 'Du får låna det du behöver. Klä av dig till den nivå du är bekväm med — vi täcker alltid allt som inte behandlas.' },
    { q: 'Hur hårt masseras jag?',      a: 'Precis så hårt du vill. Vi börjar lugnt och ökar på om du vill ha mer. Djupvävnad ska kännas, men aldrig göra ont.' },
    { q: 'Hur ofta bör jag komma?',     a: 'Vid spänningar gör tätare besök störst nytta i början. Sedan brukar en gång i månaden räcka för att hålla kroppen i schack.' },
    { q: 'Kan jag komma som gravid?',   a: 'Ja, från vecka 13. Vi masserar i sidoläge med stöd och undviker vissa punkter — berätta bara när du bokar.' },
  ],
  teamTitles: ['Massör & grundare', 'Massageterapeut', 'Spaterapeut'],
  galleryAlts: [
    'Behandlingsrummet', 'Relaxavdelningen', 'Varma stenar',
    'Oljor och handdukar', 'Entrén', 'Detalj från behandlingsbänken',
  ],
  reviews: [
    { author: "Henrik A.", rating: 5, text: "Bästa massagen jag fått. De frågade var det gjorde ont och anpassade trycket hela vägen." },
    { author: "Lena F.", rating: 5, text: "Gick hit med nacke och axlar som varit spända i månader. Fick både behandling och råd om vad jag skulle ändra vid skrivbordet." },
    { author: "Oskar B.", rating: 5, text: "Hot stone var värt varje krona. Tystare och lugnare lokal än något annat spa jag varit på." },
    { author: "Birgitta S.", rating: 4, text: "Underbar behandling och trevlig personal. Hade gärna suttit kvar längre i relaxen." },
    { author: "Malin H.", rating: 5, text: "Gravidmassage från vecka 20 och de visste exakt hur de skulle lägga upp det. Kände mig trygg hela tiden." },
    { author: "Erik L.", rating: 5, text: "Köpte presentkort till min fru och hon bokade direkt. Nu går vi båda hit." },
  ],
  articles: [
    {
      title: 'Klassisk eller djupvävnad — vilken behöver du?',
      slug: 'klassisk-eller-djupvavnad',
      excerpt: 'Den ena får dig att somna, den andra löser upp knutar. Här är skillnaden, och vad du bör välja när.',
      sections: [
        { h: 'Klassisk massage lugnar', p: 'Långa, mjuka grepp över hela kroppen. Målet är avslappning och bättre cirkulation — de flesta somnar minst en gång.' },
        { h: 'Djupvävnad går längre ner', p: 'Kraftigare tryck mot de djupare muskellagren, ofta koncentrerat till rygg, nacke och axlar. Det ska kännas, men aldrig göra ont.' },
        { h: 'Osäker?', p: 'Boka klassisk och säg till på plats om du vill ha hårdare tryck. Vi anpassar under behandlingens gång.' },
      ],
    },
    {
      title: 'Därför värker du dagen efter — och vad du gör åt det',
      slug: 'darfor-varker-du-dagen-efter',
      excerpt: 'Ömhet efter en djup massage är normalt. Här är varför det händer och hur du kortar ner tiden.',
      sections: [
        { h: 'Musklerna har jobbat', p: 'Djupt tryck skapar en mild inflammation i vävnaden, ungefär som efter träning. Ömheten brukar släppa inom ett till två dygn.' },
        { h: 'Drick och rör dig', p: 'Vatten och lätt rörelse hjälper kroppen att transportera bort restprodukterna. Stillasittande gör att stelheten sitter kvar längre.' },
        { h: 'När det inte är normalt', p: 'Skarp smärta, domningar eller ömhet som håller i sig mer än tre dagar är inte förväntat. Hör av dig så pratar vi om det.' },
      ],
    },
    {
      title: 'Nacke och axlar — varför spänningarna kommer tillbaka',
      slug: 'nacke-och-axlar',
      excerpt: 'En behandling löser upp knuten. Det som avgör om den stannar borta händer vid ditt skrivbord.',
      sections: [
        { h: 'Statisk belastning', p: 'Musklerna i nacke och axlar är byggda för rörelse, inte för att hålla samma position i timmar. Det är därför kontorsarbete gör mer ont än fysiskt arbete.' },
        { h: 'Två minuter varje timme', p: 'Res dig, rulla axlarna, titta bort från skärmen. Det låter enkelt för att det är det — och det slår varje behandling i förebyggande effekt.' },
        { h: 'När massage gör mest nytta', p: 'Vid akuta spänningar hjälper tätare besök i början. Sedan räcker underhåll en gång i månaden för de flesta.' },
      ],
    },
    {
      title: 'Ditt första besök hos oss',
      slug: 'ditt-forsta-besok',
      excerpt: 'Vad som händer från att du kliver in tills du går ut igen — och varför du bör komma tio minuter tidigare.',
      sections: [
        { h: 'Kom i tid — för din egen skull', p: 'Tio minuter innan hinner pulsen gå ner. En behandling som börjar med att du precis sprungit hit ger inte samma resultat.' },
        { h: 'Vi frågar först', p: 'Hur du mår, var det gör ont, vad du helst vill att vi undviker. Behandlingen läggs upp efter svaret.' },
        { h: 'Efteråt', p: 'Vatten eller te i relaxen. Boka inte in något direkt efteråt om du kan undvika det — effekten sitter i bäst om du får landa.' },
      ],
    },
    {
      title: 'Presentkort som faktiskt används',
      slug: 'presentkort',
      excerpt: 'De flesta spapresentkort ligger i en byrålåda tills de går ut. Så gör du för att ditt inte ska bli ett av dem.',
      sections: [
        { h: 'Ge en tid, inte bara ett belopp', p: 'Ett kort på en specifik behandling blir bokat betydligt oftare än ett med ett belopp — mottagaren slipper välja.' },
        { h: 'Våra gäller i ett år', p: 'Och kan användas vid flera besök om beloppet räcker. Vi påminner gärna om det börjar närma sig.' },
        { h: 'Beställ', p: 'Kom förbi eller ring, så skickar vi det digitalt samma dag.' },
      ],
    },
    {
      title: 'Vinterns kropp behöver annat',
      slug: 'vinterns-kropp',
      excerpt: 'Kyla, mörker och axlar som dras upp mot öronen. Så anpassar vi behandlingarna under årets tuffaste månader.',
      sections: [
        { h: 'Kylan drar ihop', p: 'Muskler i kyla spänner sig instinktivt. Det är därför nacke och axlar nästan alltid är stelare i januari än i juni.' },
        { h: 'Värme gör jobbet', p: 'Hot stone och varma handdukar öppnar vävnaden så att vi kommer åt djupare utan hårdare tryck.' },
        { h: 'Håll igång emellan', p: 'Rörelse, även lite, är det som håller effekten kvar mellan besöken. Promenaden räknas.' },
      ],
    },
  ],

  schemaType: 'DaySpa',
}
