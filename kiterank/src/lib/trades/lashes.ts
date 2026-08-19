import type { TradePack } from './types'

/* Fransar & bryn — a trade that lives on refills, so the site's job is to
   make the rhythm of coming back feel obvious rather than pushy. */

export const LASHES: TradePack = {
  id: 'lashes',
  pick: { label: 'Fransar & bryn', desc: 'Fransförlängning, lyft och brynstyling', icon: '◡' },
  label: 'Fransstudio',
  work: 'behandlingen',
  varies: 'teknik och hur mycket som behöver fyllas på',
  heroKicker:  'Fransar & bryn',
  heroHeading: 'Vaknar färdig',
  heroBody:    'Fransar och bryn som sitter där de ska varje morgon. Vi anpassar längd och böj efter dina egna fransar — inte efter en mall.',
  aboutTitle:  'Detaljerna gör hela skillnaden',
  aboutBody:   'Ett par millimeter för långt eller en böj för kraftig och resultatet ser påklistrat ut. Vi lägger tid på att välja rätt från början, och tar hand om dina egna fransar under.',
  ctaText:     'Boka tid',
  featured: [
    { name: 'Fransförlängning Classic', desc: 'En extension per naturlig frans — naturlig look', price: 'från 1 200 kr' },
    { name: 'Lash lift & tint',         desc: 'Permanentar dina egna fransar, håller 6–8 v.',   price: '750 kr' },
    { name: 'Brynstyling',              desc: 'Formning, färg och lamination',                  price: 'från 350 kr' },
  ],
  categories: [
    {
      category: 'Fransförlängning',
      items: [
        { name: 'Classic — nytt set',      desc: 'En extension per naturlig frans, naturlig look',  duration: '120 min', price: '1 200 kr' },
        { name: 'Volume — nytt set',       desc: 'Handmade fans, 2D–6D för fylligare resultat',     duration: '150 min', price: '1 600 kr' },
        { name: 'Hybrid — nytt set',       desc: 'Blandning av classic och volume',                 duration: '135 min', price: '1 400 kr' },
        { name: 'Påfyllning 2 veckor',     desc: 'Rekommenderas för att behålla fylligheten',       duration: '60 min',  price: '600 kr' },
        { name: 'Påfyllning 3–4 veckor',   desc: 'När det gått lite längre mellan besöken',         duration: '90 min',  price: '800 kr' },
        { name: 'Avtagning',               desc: 'Skonsam borttagning utan att skada fransarna',    duration: '30 min',  price: '350 kr' },
      ],
    },
    {
      category: 'Egna fransar',
      items: [
        { name: 'Lash lift',        desc: 'Permanentar dina egna fransar i uppåtböj',   duration: '45 min', price: '650 kr' },
        { name: 'Lash lift & tint', desc: 'Lyft plus färgning — håller 6–8 veckor',     duration: '60 min', price: '750 kr' },
        { name: 'Fransfärgning',    desc: 'Mörkare fransar utan mascara',               duration: '20 min', price: '300 kr' },
      ],
    },
    {
      category: 'Bryn',
      items: [
        { name: 'Brynstyling',        desc: 'Vaxning eller pincett, formning och borstning', duration: '30 min', price: '350 kr' },
        { name: 'Bryn färg & form',   desc: 'Formning plus färgning eller henna',            duration: '45 min', price: '450 kr' },
        { name: 'Brow lamination',    desc: 'Permanentar brynen i önskat läge',              duration: '60 min', price: '650 kr' },
        { name: 'Bryn & fransfärg',   desc: 'Båda i samma besök',                            duration: '40 min', price: '500 kr' },
      ],
    },
  ],
  visit: [
    'Boka nytt set om du inte har fransar sedan tidigare, påfyllning om du har.',
    'Vi går igenom längd, böj och fyllighet — och tittar på dina egna fransar innan vi bestämmer.',
    'Du ligger ner i lugn och ro. Många somnar, och det är helt i sin ordning.',
  ],
  faq: [
    { q: 'Hur länge håller fransförlängning?', a: 'Med påfyllning var tredje vecka håller de så länge du vill. Utan påfyllning växer de ut med dina egna fransar på sex till åtta veckor.' },
    { q: 'Skadar det mina egna fransar?',      a: 'Nej, när vikten är rätt vald och avtagningen görs skonsamt. Vi väljer aldrig längre eller tyngre än vad din egen frans bär.' },
    { q: 'Kan jag sminka mig som vanligt?',    a: 'Ögonskugga och eyeliner går bra. Mascara och oljebaserad rengöring bör undvikas — de löser upp limmet.' },
    { q: 'Hur ska jag sköta dem?',             a: 'Borsta varje morgon, rengör med fransschampo ett par gånger i veckan och undvik att gnugga ögonen. Det är hela rutinen.' },
  ],
  teamTitles: ['Fransstylist & grundare', 'Fransstylist', 'Bryn- och fransstylist'],
  galleryAlts: [
    'Classic-set, naturlig längd', 'Volume-set i närbild', 'Bryn efter lamination',
    'Lash lift, före och efter', 'Behandlingsrummet', 'Fransar sorterade efter längd',
  ],
  reviews: [
    { author: "Josefin M.", rating: 5, text: "Vaknar färdig varje morgon nu. De valde en längd som passar mina egna fransar i stället för längsta möjliga." },
    { author: "Isabelle R.", rating: 5, text: "Har haft fransar hos flera studios och det här är första gången mina egna inte blivit skadade." },
    { author: "Klara B.", rating: 5, text: "Lash lift var precis vad jag behövde — mina egna fransar syns äntligen. Slipper mascara helt." },
    { author: "Matilda W.", rating: 4, text: "Jättenöjd med resultatet. Två timmar är länge att ligga still, men jag somnade faktiskt." },
    { author: "Ellen G.", rating: 5, text: "Brynlamination förändrade hela ansiktet. De formade efter mitt ansikte, inte efter en mall." },
    { author: "Alva T.", rating: 5, text: "Fick tydliga skötselråd och det gjorde att setet höll nästan en vecka längre än vanligt." },
  ],
  articles: [
    {
      title: 'Classic, hybrid eller volume — vilken ska du välja?',
      slug: 'classic-hybrid-volume',
      excerpt: 'Tre tekniker, tre helt olika uttryck. Här är skillnaden i fyllighet, tid och hur ofta du behöver fylla på.',
      sections: [
        { h: 'Classic — en per frans', p: 'En extension fästs på varje naturlig frans. Resultatet ser ut som dina egna fransar på en bra dag. Perfekt om du vill att ingen ska förstå att du gjort något.' },
        { h: 'Volume — flera per frans', p: 'Flera tunnare fransar sätts ihop till en solfjäder. Fylligare uttryck utan att bli tyngre, eftersom varje enskild frans väger mindre.' },
        { h: 'Hybrid — mitt emellan', p: 'En blandning som ger textur och fyllighet där det behövs. Det vanligaste valet hos oss för den som är osäker.' },
      ],
    },
    {
      title: 'Så sköter du fransarna hemma',
      slug: 'sa-skoter-du-fransarna',
      excerpt: 'Tre vanor avgör om ditt set håller två veckor eller fyra. Ingen av dem tar mer än en minut.',
      sections: [
        { h: 'Borsta på morgonen', p: 'Fransarna hamnar i olika riktningar under natten. En snabb borstning med spoolien räcker för att de ska ligga rätt hela dagen.' },
        { h: 'Rengör dem faktiskt', p: 'Många är rädda för vatten och undviker att tvätta. Resultatet blir smuts vid fransroten som lossar limmet snabbare. Fransschampo två gånger i veckan.' },
        { h: 'Undvik olja och gnuggande', p: 'Oljebaserad rengöring och att sova med ansiktet i kudden är de två snabbaste vägarna till glesa fransar.' },
      ],
    },
    {
      title: 'Lash lift — för dig som vill slippa förlängning',
      slug: 'lash-lift',
      excerpt: 'Dina egna fransar, permanentade i uppåtböj. Ingen påfyllning, ingen skötsel, håller sex till åtta veckor.',
      sections: [
        { h: 'Vad det är', p: 'Fransarna böjs uppåt över en silikonform och fixeras. Har du långa fransar som pekar rakt fram gör en lift enorm skillnad — de syns plötsligt.' },
        { h: 'Med eller utan färgning', p: 'De flesta lägger till en tint. Ljusa fransspetsar blir synliga och effekten blir betydligt tydligare, särskilt om du brukar använda mascara.' },
        { h: 'Efteråt', p: 'Undvik vatten och mascara första dygnet. Sedan behöver du inte göra någonting alls förrän de vuxit ut.' },
      ],
    },
    {
      title: 'Ditt första besök hos oss',
      slug: 'ditt-forsta-besok',
      excerpt: 'Två timmar liggande i lugn och ro. Så här förbereder du dig, och så går det till.',
      sections: [
        { h: 'Kom osminkad', p: 'Mascara och smink kring ögonen måste bort innan vi börjar — kommer du osminkad får du hela tiden till behandlingen i stället.' },
        { h: 'Vi väljer tillsammans', p: 'Längd, böj och fyllighet bestäms utifrån dina egna fransar och vad du vill ha. Ta gärna med en bild.' },
        { h: 'Två timmar', p: 'Ett nytt set tar upp till två timmar. Du ligger ner med slutna ögon — ta det som en stunds vila.' },
      ],
    },
    {
      title: 'Brynen — form, färg eller lamination?',
      slug: 'brynen-form-farg-lamination',
      excerpt: 'Tre behandlingar som ofta blandas ihop. Vilken du behöver beror på hur dina bryn växer.',
      sections: [
        { h: 'Formning räcker ofta', p: 'Har du täta bryn som växer åt rätt håll behöver du sällan mer än formning var fjärde till sjätte vecka.' },
        { h: 'Färg fyller ut', p: 'Ljusa eller glesa bryn vinner mest på färgning eller henna — de yttre stråna syns och formen blir tydligare utan penna.' },
        { h: 'Lamination lägger dem rätt', p: 'Växer stråna åt olika håll håller lamination dem på plats i sex till åtta veckor. Det är lösningen på bryn som aldrig vill lägga sig.' },
      ],
    },
    {
      title: 'Presentkort',
      slug: 'presentkort',
      excerpt: 'Gäller på alla våra behandlingar i ett år, och kan användas vid flera besök.',
      sections: [
        { h: 'Så fungerar det', p: 'Välj belopp eller en behandling. Kortet gäller i ett år från köpet.' },
        { h: 'Beställ', p: 'Kom förbi eller ring, så skickar vi det digitalt samma dag.' },
      ],
    },
  ],

  schemaType: 'BeautySalon',
}
