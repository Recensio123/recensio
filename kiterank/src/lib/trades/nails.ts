import type { TradePack } from './types'

/* Nagelsalong — where the price list is the whole shop window and the
   questions are always about how long it lasts. */

export const NAILS: TradePack = {
  id: 'nails',
  pick: { label: 'Nagelsalong', desc: 'Manikyr, gel och förstärkning', icon: '◇' },
  label: 'Nagelsalong',
  work: 'behandlingen',
  varies: 'längd, form och om avtagning behövs',
  heroKicker:  'Nagelsalong',
  heroHeading: 'Naglar som håller hela månaden',
  heroBody:    'Förstärkning som inte lossnar, färger som inte flagnar och en form som passar dina händer. Boka en tid så tar vi hand om resten.',
  aboutTitle:  'Naglar är hantverk',
  aboutBody:   'Vi jobbar långsammare än många — för en nagel som är rätt förberedd sitter kvar i fyra veckor i stället för i två. Vi tar hand om naturnageln under, inte bara det som syns ovanpå.',
  ctaText:     'Boka tid',
  featured: [
    { name: 'Gel-lack',           desc: 'Håller 2–3 veckor utan att flagna',        price: '600 kr' },
    { name: 'Förstärkning i gel', desc: 'Stabil bas för dig med sköra naglar',      price: 'från 850 kr' },
    { name: 'Påfyllning',         desc: 'Var tredje vecka — behåller formen',       price: 'från 650 kr' },
  ],
  categories: [
    {
      category: 'Händer',
      items: [
        { name: 'Manikyr klassisk',   desc: 'Nagelform, nagelbandsvård och lack',              duration: '45 min', price: '450 kr' },
        { name: 'Gel-lack',           desc: 'Härdas under lampa, håller 2–3 veckor',           duration: '60 min', price: '600 kr' },
        { name: 'Förstärkning i gel', desc: 'Bygger stabilitet på egen nagel — inkl. lack',    duration: '90 min', price: 'från 850 kr' },
        { name: 'Förlängning',        desc: 'Tippar eller schabloner i önskad längd',          duration: '120 min', price: 'från 1 100 kr' },
        { name: 'Påfyllning',         desc: 'Rekommenderas var tredje vecka',                  duration: '75 min', price: 'från 650 kr' },
        { name: 'Avtagning',          desc: 'Skonsam borttagning utan att skada nageln',       duration: '30 min', price: '250 kr' },
      ],
    },
    {
      category: 'Fötter',
      items: [
        { name: 'Pedikyr klassisk', desc: 'Fotbad, nagelvård, hudfilning och lack',   duration: '60 min', price: '550 kr' },
        { name: 'Gel-lack fötter',  desc: 'Som pedikyr men med härdande lack',        duration: '60 min', price: '600 kr' },
        { name: 'Medicinsk fotvård', desc: 'Förhårdnader, nagelband och tryckpunkter', duration: '60 min', price: '750 kr' },
      ],
    },
    {
      category: 'Dekor & tillägg',
      items: [
        { name: 'French',        desc: 'Klassisk vit spets, handmålad',        duration: '15 min', price: '150 kr' },
        { name: 'Enkel dekor',   desc: 'Stenar, folie eller mönster per nagel', duration: '10 min', price: 'från 30 kr' },
        { name: 'Handmassage',   desc: 'Tio minuter extra i slutet',           duration: '10 min', price: '150 kr' },
      ],
    },
  ],
  visit: [
    'Boka den tid som matchar det du vill ha — behöver du avtagning, lägg till den i bokningen.',
    'Vi går igenom form, längd och färg innan vi börjar, och tittar på naturnagelns skick under.',
    'Du får med dig råd om nagelolja och när det är läge för påfyllning.',
  ],
  faq: [
    { q: 'Hur länge håller gel-lack?',        a: 'Två till tre veckor för de flesta. Jobbar du mycket med händerna kan det bli kortare — då är förstärkning ofta ett bättre val.' },
    { q: 'Förstör gel naturnageln?',          a: 'Nej, om den tas bort rätt. Skadorna uppstår nästan alltid när någon bänder eller river bort den. Boka avtagning i stället.' },
    { q: 'Måste jag boka påfyllning?',        a: 'Efter tre veckor har utväxten hunnit synas och nageln blir tyngre i toppen. Påfyllning då är både snyggare och skonsammare.' },
    { q: 'Kan jag ta med en bild?',           a: 'Gärna! Det är den snabbaste vägen till rätt form och färg. Säg till när du bokar om det är något avancerat.' },
  ],
  teamTitles: ['Nagelterapeut & grundare', 'Nagelterapeut', 'Nagelterapeut'],
  galleryAlts: [
    'French med kort form', 'Gel-lack i höstfärg', 'Förstärkning i mandelform',
    'Dekor med folie', 'Salongens arbetsplats', 'Färgpaletten',
  ],
  reviews: [
    { author: "Julia A.", rating: 5, text: "Mina naglar har aldrig hållit så länge. Tre veckor och fortfarande inga sprickor." },
    { author: "Rebecca S.", rating: 5, text: "De tog bort gelen ordentligt i stället för att bända, och förklarade varför det spelar roll. Naglarna mår mycket bättre nu." },
    { author: "Hanna P.", rating: 5, text: "Kom med en bild och fick exakt det jag ville ha, fast anpassat till min nagelform. Snyggare än bilden." },
    { author: "Mikaela L.", rating: 4, text: "Väldigt fint resultat och trevligt bemötande. Tog lite längre tid än jag räknat med, men det var värt det." },
    { author: "Amanda C.", rating: 5, text: "Har testat många ställen och det här är det enda där förstärkningen faktiskt håller på mina korta naglar." },
    { author: "Frida N.", rating: 5, text: "Bokade inför bröllop och de hjälpte mig välja något som passade klänningen. Höll hela helgen." },
  ],
  articles: [
    {
      title: 'Gel, akryl eller förstärkning — vad passar dina naglar?',
      slug: 'gel-akryl-forstarkning',
      excerpt: 'Tre olika material med olika styrkor. Här är vad de tål, hur de känns och vad de kostar över ett år.',
      sections: [
        { h: 'Gel är mjukare', p: 'Gel böjer sig med nageln och känns naturligare. Det gör den bekvämare i vardagen men något mer känslig för hårda smällar.' },
        { h: 'Akryl är hårdare', p: 'Akryl står emot mer och är förstahandsvalet vid längre förlängningar. Priset är att den känns styvare och kräver noggrann avtagning.' },
        { h: 'Förstärkning på egen nagel', p: 'Har du sköra naglar som spricker är förstärkning ofta bättre än förlängning — du behåller din egen längd men får stabilitet.' },
      ],
    },
    {
      title: 'Så får du naglarna att hålla längre',
      slug: 'sa-haller-naglarna-langre',
      excerpt: 'Det som lossnar först är nästan alltid kanten. Fem vanor som förlänger tiden mellan besöken.',
      sections: [
        { h: 'Nagelolja varje kväll', p: 'Torra nagelband drar i kanten och lyfter lacket. Olja tar tio sekunder och är den enskilt mest effektiva vanan.' },
        { h: 'Handskar vid disk och städ', p: 'Varmt vatten och rengöringsmedel bryter ner bindningen snabbare än något annat i vardagen.' },
        { h: 'Använd inte naglarna som verktyg', p: 'Öppna inte burkar, plocka inte etiketter. Nästan varje avbruten nagel vi ser började så.' },
      ],
    },
    {
      title: 'Varför du inte ska bända bort gelen själv',
      slug: 'ta-inte-bort-gelen-sjalv',
      excerpt: 'Den vanligaste orsaken till tunna, mjuka naglar är inte gelen — det är hur den togs bort.',
      sections: [
        { h: 'Vad som händer', p: 'När du bänder följer översta lagret av naturnageln med. Det växer tillbaka, men tar tre till sex månader — och under tiden är nageln svag.' },
        { h: 'Så gör vi i stället', p: 'Vi filar ner toppskiktet och löser upp resten med aceton under folie. Nageln blir ren utan att skalas.' },
        { h: 'Om du ändå råkat ut', p: 'Boka en behandling utan nytt lack, så får nageln vila med förstärkning och olja i några veckor.' },
      ],
    },
    {
      title: 'Ditt första besök hos oss',
      slug: 'ditt-forsta-besok',
      excerpt: 'Vad du ska boka, vad du kan ta med och hur lång tid du bör räkna med.',
      sections: [
        { h: 'Boka rätt tid', p: 'Har du gel sedan tidigare behöver vi tid för avtagning. Lägg till den i bokningen så räcker tiden.' },
        { h: 'Ta med en bild', p: 'Form och längd är svåra att beskriva i ord. En bild gör att vi hamnar rätt på första försöket.' },
        { h: 'Räkna med en till två timmar', p: 'Gel-lack tar ungefär en timme, förstärkning eller förlängning upp till två. Vi säger till om något skulle ta längre tid.' },
      ],
    },
    {
      title: 'Formerna — och vilken som passar din hand',
      slug: 'formerna',
      excerpt: 'Rund, fyrkant, mandel eller coffin. Formen avgör både hur naglarna ser ut och hur mycket de tål.',
      sections: [
        { h: 'Rund och kort håller bäst', p: 'Ingen form tål vardagen lika bra. Har du ett händigt jobb är det här valet som gör att naglarna överlever månaden.' },
        { h: 'Mandel förlänger fingret', p: 'Den mjuka spetsen ger ett längre intryck utan att bli lika ömtålig som en spetsig form.' },
        { h: 'Coffin och stiletto kräver längd', p: 'Snygga, men de behöver material att arbeta med — och tål minst. Räkna med tätare påfyllning.' },
      ],
    },
    {
      title: 'Presentkort',
      slug: 'presentkort',
      excerpt: 'Gäller på allt vi gör i ett år, och kan användas vid flera besök.',
      sections: [
        { h: 'Så fungerar det', p: 'Välj belopp eller en behandling. Kortet gäller i ett år från köpet.' },
        { h: 'Beställ', p: 'Kom förbi eller ring oss, så skickar vi det digitalt samma dag.' },
      ],
    },
  ],
}
