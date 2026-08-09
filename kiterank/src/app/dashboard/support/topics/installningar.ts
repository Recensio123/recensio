import { type SupportTopic } from '../types'

export const installningar: SupportTopic = {
  id:    'installningar',
  title: { sv: 'Inställningar', en: 'Settings' },
  intro: {
    sv: 'Här fyller du i grunduppgifterna om ditt företag. De styr hur råden på alla andra sidor anpassas till just dig — din bransch, din marknad och ditt område. Fem minuter här gör resten av verktyget träffsäkrare.',
    en: 'This is where you fill in the basics about your business. They control how the advice on every other page is tailored to you — your industry, your market, and your area. Five minutes here makes the rest of the tool sharper.',
  },
  sections: [
    {
      id: 'foretagsuppgifter',
      heading: { sv: 'Företagsuppgifter', en: 'Business details' },
      body: [
        {
          sv: 'Företagsnamn, typ av verksamhet, land och hemsida. Det mesta hämtas automatiskt från din Google-företagsprofil när du kopplar Google — kontrollera att det stämmer och fyll i det som saknas.',
          en: 'Business name, business type, country, and website. Most of it is pulled in automatically from your Google Business Profile when you connect Google — check that it is right and fill in what is missing.',
        },
        {
          sv: 'Typ av verksamhet avgör vilken bransch råden anpassas efter. Landet avgör vilka jämförelsetal och lokala vanor som gäller — en svensk salong jämförs med svenska förhållanden, inte amerikanska.',
          en: 'Business type decides which industry the advice is tailored to. Country decides which benchmarks and local habits apply — a Swedish salon is compared to Swedish conditions, not American ones.',
        },
        {
          sv: 'Fält markerade med "Krävs" behövs för att råden ska bli rätt. Saknas något visas en gul ruta högst upp som talar om vad som fattas.',
          en: 'Fields marked "Required" are needed for the advice to be right. If something is missing, a yellow box at the top tells you what is left to fill in.',
        },
      ],
      terms: [
        {
          term: { sv: 'Krävs', en: 'Required' },
          def:  { sv: 'Fältet måste fyllas i för att råden ska kunna anpassas till dig. Utan det blir råden allmänna i stället för träffsäkra.', en: 'The field must be filled in for the advice to be tailored to you. Without it, the advice stays generic instead of precise.' },
        },
        {
          term: { sv: 'Typ av verksamhet', en: 'Business type' },
          def:  { sv: 'Vad du jobbar med, till exempel frisör eller hudvård. Styr vilka råd och jämförelser du får.', en: 'What you do, for example hairdressing or skincare. Controls which advice and comparisons you get.' },
        },
        {
          term: { sv: 'Land', en: 'Country' },
          def:  { sv: 'Var din marknad finns. Avgör vilka jämförelsetal, priser och lokala vanor råden bygger på.', en: 'Where your market is. Decides which benchmarks, prices, and local habits the advice is based on.' },
        },
      ],
    },
    {
      id: 'var-du-vill-synas',
      heading: { sv: 'Var du vill synas', en: 'Location targeting' },
      body: [
        {
          sv: 'Stadsdel och postnummer hjälper verktyget att föreslå sökord nära dig. Kunder söker ofta i sitt närområde — "frisör hägersten" i stället för "frisör stockholm".',
          en: 'District and postal code help the tool suggest keywords near you. Customers often search in their local area — "hairdresser hägersten" instead of "hairdresser stockholm".',
        },
        {
          sv: 'Skriv området där dina kunder faktiskt finns, inte nödvändigtvis hela staden. Ju mer precist område, desto lättare är det att synas där konkurrensen är mindre.',
          en: 'Enter the area where your customers actually are, not necessarily the whole city. The more precise the area, the easier it is to show up where there is less competition.',
        },
      ],
      terms: [
        {
          term: { sv: 'Stadsdel / område', en: 'District / neighbourhood' },
          def:  { sv: 'Området du vill synas i, till exempel Hägersten eller Södermalm. Hämtas automatiskt från din Google-företagsprofil om den finns.', en: 'The area you want to be found in, for example Hägersten or Södermalm. Pulled in automatically from your Google Business Profile if it is there.' },
        },
        {
          term: { sv: 'Postnummer', en: 'Postal code' },
          def:  { sv: 'Gör områdesförslagen ännu mer precisa. Frivilligt men bra att fylla i.', en: 'Makes the area suggestions even more precise. Optional, but good to fill in.' },
        },
      ],
    },
    {
      id: 'visningsval',
      heading: { sv: 'Visningsval', en: 'Display preferences' },
      body: [
        {
          sv: 'Här styr du förklaringarna som dyker upp när du håller muspekaren stilla en kort stund över en siffra eller ett avsnitt. De är tänkta som ett stöd när något är nytt.',
          en: 'This controls the explanations that appear when you rest the mouse briefly over a number or a section. They are meant as support while something is still new.',
        },
        {
          sv: 'Kan du redan siffrorna och tycker rutorna är i vägen? Stäng av dem med reglaget. Du kan slå på dem igen här när som helst.',
          en: 'Already know the numbers and find the boxes in the way? Turn them off with the toggle. You can turn them back on here any time.',
        },
      ],
      terms: [
        {
          term: { sv: 'Förklaringar när du håller muspekaren stilla', en: 'Hover explanations' },
          def:  { sv: 'Små rutor som förklarar siffror och avsnitt i hela verktyget. Reglaget slår på och av dem överallt på en gång.', en: 'Small boxes that explain numbers and sections throughout the tool. The toggle turns them on and off everywhere at once.' },
        },
      ],
    },
    {
      id: 'spara',
      heading: { sv: 'Glöm inte att spara', en: 'Don\'t forget to save' },
      body: [
        {
          sv: 'Ändringar i fälten börjar gälla först när du trycker på "Spara ändringar" längst ner. En grön bekräftelse visas när allt är sparat.',
          en: 'Changes to the fields only take effect when you press "Save changes" at the bottom. A green confirmation appears when everything is saved.',
        },
        {
          sv: 'Uppgifterna används direkt på alla sidor. Byter du till exempel område kan sökordsförslagen se annorlunda ut redan vid nästa besök.',
          en: 'The details are used right away on every page. Change your area, for example, and the keyword suggestions can look different on your very next visit.',
        },
      ],
    },
  ],
}
