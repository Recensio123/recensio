import type { TradePack } from './types'

/* Barbershop — same craft as a salon, entirely different room and language. */

export const BARBER: TradePack = {
  id: 'barber',
  pick: { label: 'Barberare', desc: 'Herrklippning, skägg och rakning', icon: '⌁' },
  label: 'Barbershop',
  work: 'klippningen eller skägget',
  varies: 'hårlängd och hur mycket som ska göras',
  heroKicker:  'Barbershop',
  heroHeading: 'Klippning, skägg och en stunds lugn',
  heroBody:    'Vi gör en sak och gör den ordentligt: klippning och skäggvård där formen håller tills du kommer tillbaka. Boka en tid eller kom förbi.',
  aboutTitle:  'Hantverk, inte löpande band',
  aboutBody:   'Här får du samma barberare varje gång om du vill. Vi tar den tid som behövs, för en klippning som ser bra ut i fyra veckor är värd mer än en som ser bra ut i fyra dagar.',
  ctaText:     'Boka tid',
  featured: [
    { name: 'Klippning',          desc: 'Sax eller maskin, avslutad med styling',        price: '450 kr' },
    { name: 'Skägg & rakning',    desc: 'Formning med kniv, varma handdukar och balsam', price: '400 kr' },
    { name: 'Klippning & skägg',  desc: 'Hela paketet i ett besök',                      price: '750 kr' },
  ],
  categories: [
    {
      category: 'Klippning',
      items: [
        { name: 'Klippning',            desc: 'Sax eller maskin, avslutad med styling',       duration: '45 min', price: '450 kr' },
        { name: 'Maskinklippning',      desc: 'En längd över hela huvudet, snabbt och prydligt', duration: '20 min', price: '300 kr' },
        { name: 'Fade / skinfade',      desc: 'Mjuk övergång från hud till längd',            duration: '45 min', price: '500 kr' },
        { name: 'Klippning barn <12 år', desc: 'Lugnt tempo och full koll på tiden',           duration: '30 min', price: '300 kr' },
        { name: 'Snagg & putsning',     desc: 'Uppfräschning mellan besöken',                 duration: '15 min', price: '200 kr' },
      ],
    },
    {
      category: 'Skägg',
      items: [
        { name: 'Skäggtrim',        desc: 'Formning och konturering med maskin och sax',     duration: '25 min', price: '300 kr' },
        { name: 'Rakning med kniv', desc: 'Klassisk rakning med varma handdukar och balsam', duration: '45 min', price: '450 kr' },
        { name: 'Skägg & konturering', desc: 'Trim plus rakade konturer i nacke och kinder',  duration: '30 min', price: '400 kr' },
        { name: 'Skäggfärgning',    desc: 'Jämnar ut grått eller ojämn färg',                duration: '30 min', price: '350 kr' },
      ],
    },
    {
      category: 'Paket',
      items: [
        { name: 'Klippning & skägg',    desc: 'Klippning, skäggtrim och styling i ett besök',    duration: '60 min', price: '750 kr' },
        { name: 'Hela paketet',         desc: 'Klippning, rakning med kniv och ansiktsbehandling', duration: '90 min', price: '1 100 kr' },
        { name: 'Far & son',            desc: 'Två klippningar samma besök',                     duration: '60 min', price: '650 kr' },
      ],
    },
  ],
  visit: [
    'Boka en tid online eller kom förbi och fråga om vi har en lucka.',
    'Vi går igenom vad du vill ha och hur det ska växa ut innan maskinen startar. Har du en bild med dig är det enklast.',
    'Du får med dig ett tips på hur du sköter formen hemma — och när det är läge att komma tillbaka.',
  ],
  faq: [
    { q: 'Behöver jag boka?',              a: 'Bokat besök är säkrast, men vi tar emot drop-in när det finns plats. Ring gärna först.' },
    { q: 'Hur ofta bör jag klippa mig?',   a: 'Med en fade håller formen tre till fyra veckor. Har du längre hår klarar du dig ofta sex till åtta veckor.' },
    { q: 'Vad är skillnaden mot ett skäggtrim?', a: 'Ett trim formar skägget med maskin och sax. En rakning med kniv tar bort håret helt, med varma handdukar före och balsam efter.' },
    { q: 'Kan jag betala med kort?',       a: 'Kort och Swish fungerar båda. Kontanter tar vi också.' },
  ],
  teamTitles: ['Barberare & grundare', 'Barberare', 'Barberare'],
  galleryAlts: [
    'Fade i sidorna', 'Skägg efter formning', 'Rakning med kniv',
    'Klassisk sidbena', 'Butiken inifrån', 'Verktygen på hyllan',
  ],
  reviews: [
    { author: "Marcus H.", rating: 5, text: "Bästa fade jag haft. De tog sig tid att fråga hur jag brukar styla håret innan de började klippa." },
    { author: "Peter N.", rating: 5, text: "Gick in utan tid en tisdag och fick klippning direkt. Snabbt utan att det kändes stressat." },
    { author: "Ali R.", rating: 5, text: "Rakning med kniv och varm handduk — värt varenda krona. Kommer tillbaka varje månad nu." },
    { author: "Fredrik W.", rating: 4, text: "Riktigt bra skäggtrimning och bra snack. Lite trångt i lokalen när det är fullt, men det är en del av charmen." },
    { author: "David O.", rating: 5, text: "De sa ifrån när jag ville ha en modell som inte skulle funka med min hårväxt och föreslog något annat. Blev mycket bättre." },
    { author: "Tobias E.", rating: 5, text: "Tog med sonen och vi klippte oss samtidigt. Han var nervös men de fixade det direkt." },
  ],
  articles: [
    {
      title: 'Fade, taper eller undercut — vad är skillnaden?',
      slug: 'fade-taper-undercut',
      excerpt: 'Tre ord som används om vartannat. Här är vad de faktiskt betyder, och vilken som håller formen längst.',
      sections: [
        { h: 'Fade går ner i huden', p: 'En fade tonas gradvis från längre hår ner mot hud. Den ser skarp ut från dag ett — men växer också snabbast, så räkna med besök var tredje vecka.' },
        { h: 'Taper är mildare', p: 'En taper kortar bara av vid tinningar och nacke. Skillnaden är mindre dramatisk, och den växer ut betydligt snyggare om du inte vill komma in lika ofta.' },
        { h: 'Undercut är en tydlig gräns', p: 'Här finns ingen övergång — sidorna är korta, toppen lång, och skarven syns. Kräver styling för att sitta som det ska.' },
      ],
    },
    {
      title: 'Sköta skägget hemma — det som faktiskt behövs',
      slug: 'skota-skagget-hemma',
      excerpt: 'Fyra produkter räcker. Resten är ofta paketering. Så här ser en rutin ut som håller skägget i form mellan besöken.',
      sections: [
        { h: 'Tvätta, men inte som håret', p: 'Vanligt schampo torkar ut skägget och huden under. Ett milt skäggschampo två gånger i veckan räcker för de flesta.' },
        { h: 'Olja är för huden', p: 'Skäggolja gör mindre för skägget än för huden under — det är där klådan och fjällningen börjar. Några droppar efter duschen.' },
        { h: 'Kam och trimmer', p: 'Kamma nedåt och trimma bara det som sticker ut. Konturerna vid kinder och hals lämnar du till oss om du vill ha en linje som håller.' },
      ],
    },
    {
      title: 'Rakning med kniv — vad som faktiskt händer',
      slug: 'rakning-med-kniv',
      excerpt: 'Varma handdukar, klassisk kniv och tjugo minuter där du inte behöver göra någonting alls.',
      sections: [
        { h: 'Förberedelsen är halva jobbet', p: 'Varma handdukar mjukar upp skäggstråna och öppnar huden. Det är därför en riktig rakning inte svider som en snabb rakning hemma.' },
        { h: 'Två gånger över', p: 'Vi rakar med hårets riktning först, sedan mot. Resultatet blir slätare och håller längre — och risken för inåtväxande strån minskar.' },
        { h: 'Efteråt', p: 'Kall handduk, balsam och lite tid för huden att lugna sig. Du kan gå direkt tillbaka till jobbet.' },
      ],
    },
    {
      title: 'Ditt första besök hos oss',
      slug: 'ditt-forsta-besok',
      excerpt: 'Vad du behöver veta innan du sätter dig i stolen — och varför de första minuterna handlar om att prata.',
      sections: [
        { h: 'Ta med en bild', p: 'Ord som "kort på sidorna" betyder olika saker för olika personer. En bild löser det på tio sekunder.' },
        { h: 'Vi frågar hur det ska växa', p: 'En klippning som ser perfekt ut samma dag kan se rörig ut om tre veckor. Vi anpassar efter hur ofta du faktiskt kommer in.' },
        { h: 'Priset innan vi börjar', p: 'Du får veta vad det kostar och hur lång tid det tar innan maskinen startar. Inga tillägg på slutet.' },
      ],
    },
    {
      title: 'Hur ofta ska man egentligen klippa sig?',
      slug: 'hur-ofta-klippa-sig',
      excerpt: 'Det beror mindre på hur snabbt håret växer än på vilken frisyr du har. Här är en enkel tumregel per stil.',
      sections: [
        { h: 'Kort och skarpt: var tredje vecka', p: 'Fades och korta sidor tappar formen snabbt. Vill du att det ska se ut som dagen efter klippningen behöver du in ofta.' },
        { h: 'Medellångt: var sjätte vecka', p: 'Har du längd på toppen och mjuka sidor håller formen betydligt längre. En putsning emellan räcker ofta.' },
        { h: 'Långt: var tredje månad', p: 'Här handlar det mest om att hålla topparna friska. Vänta för länge och du klipper bort mer än du hade behövt.' },
      ],
    },
    {
      title: 'Presentkort',
      slug: 'presentkort',
      excerpt: 'Gäller på allt vi gör, i ett år, och kan användas vid flera besök.',
      sections: [
        { h: 'Så fungerar det', p: 'Välj belopp eller en specifik behandling. Kortet gäller i ett år från köpet.' },
        { h: 'Hämta eller få det digitalt', p: 'Kom förbi så skriver vi ut ett direkt, eller ring så skickar vi det digitalt samma dag.' },
      ],
    },
  ],
}
