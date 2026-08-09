import { type SupportTopic } from '../types'

export const katalogkoll: SupportTopic = {
  id:    'katalogkoll',
  title: { sv: 'Katalogkoll', en: 'Citation health' },
  intro: {
    sv: 'Ditt företag finns listat på fler ställen än du tror — hitta.se, Eniro, Facebook och många fler. Katalogkoll visar om ditt namn, din adress och ditt telefonnummer stämmer överallt. Det spelar större roll än det låter.',
    en: 'Your business is listed in more places than you think — hitta.se, Eniro, Facebook, and many more. Citation health shows whether your name, address, and phone number are correct everywhere. It matters more than it sounds.',
  },
  sections: [
    {
      id: 'varfor-det-spelar-roll',
      heading: { sv: 'Varför samma uppgifter överallt är viktigt', en: 'Why matching details everywhere matters' },
      body: [
        {
          sv: 'Google jämför dina företagsuppgifter mellan olika kataloger på nätet. När namn, adress och telefonnummer stämmer överens överallt litar Google på att uppgifterna är riktiga.',
          en: 'Google compares your business details across different online directories. When your name, address, and phone number match everywhere, Google trusts that the details are right.',
        },
        {
          sv: 'När de inte stämmer — en gammal adress här, ett gammalt nummer där — sjunker förtroendet. Då kan du hamna längre ner i sökresultaten och på Google Maps, och kunder kan ringa fel nummer.',
          en: 'When they do not match — an old address here, an old number there — that trust drops. You can slip down in search results and on Google Maps, and customers can call the wrong number.',
        },
        {
          sv: 'Även små skillnader räknas, som "vägen" mot en förkortning eller ett saknat "AB" i namnet. Målet är att uppgifterna ser exakt likadana ut överallt.',
          en: 'Even small differences count, like a street name written out versus abbreviated, or a missing "AB" in the name. The goal is for the details to look exactly the same everywhere.',
        },
      ],
    },
    {
      id: 'halsopoang-och-statusar',
      heading: { sv: 'Hälsopoängen och de tre rutorna', en: 'The health score and the three cards' },
      body: [
        {
          sv: 'Hälsopoängen visar hur stor andel av de kontrollerade katalogerna som listar dig helt korrekt. Grön siffra betyder att det mesta stämmer, gul eller röd att det finns saker att rätta.',
          en: 'The health score shows the share of checked directories that list you completely correctly. A green number means most things match; yellow or red means there are things to fix.',
        },
        {
          sv: 'De tre rutorna bredvid delar upp katalogerna i korrekta, sådana som inte stämmer och sådana där du saknas helt. Klicka på en ruta för att bara visa de katalogerna i listan. Klicka igen för att visa alla.',
          en: 'The three cards next to it split the directories into correct ones, ones that do not match, and ones where you are missing entirely. Click a card to show only those directories in the list. Click again to show all.',
        },
      ],
      terms: [
        {
          term: { sv: 'Hälsopoäng', en: 'Health score' },
          def:  { sv: 'Andelen kataloger där dina uppgifter är helt korrekta. 100 % betyder att allt stämmer överallt.', en: 'The share of directories where your details are fully correct. 100% means everything matches everywhere.' },
        },
        {
          term: { sv: 'Korrekt listad', en: 'Listed correctly' },
          def:  { sv: 'Katalogen har rätt namn, adress och telefonnummer. Inget behöver göras.', en: 'The directory has the right name, address, and phone number. Nothing to do.' },
        },
        {
          term: { sv: 'Stämmer inte', en: 'Inconsistent' },
          def:  { sv: 'Du finns i katalogen, men någon uppgift avviker — till exempel gammalt telefonnummer eller adress skriven på annat sätt. Detta är viktigast att rätta.', en: 'You are in the directory, but some detail differs — for example an old phone number or the address written differently. These matter most to fix.' },
        },
        {
          term: { sv: 'Saknas', en: 'Not found' },
          def:  { sv: 'Du finns inte alls i katalogen. En saknad listning är en missad chans att synas, men skadar mindre än felaktiga uppgifter.', en: 'You are not in the directory at all. A missing listing is a missed chance to be found, but it hurts less than wrong details.' },
        },
      ],
    },
    {
      id: 'varningar',
      heading: { sv: 'Varningarna under katalognamnen', en: 'The warnings under the directory names' },
      body: [
        {
          sv: 'När en katalog inte stämmer visas exakt vad som avviker under katalogens namn — till exempel att adressen är skriven på två olika sätt eller att telefonnumret saknas.',
          en: 'When a directory does not match, you see exactly what differs under the directory name — for example that the address is written in two different ways or that the phone number is missing.',
        },
        {
          sv: 'Rätta uppgifterna direkt hos katalogen. Klicka på pilen bredvid katalognamnet för att öppna din sida där, leta sedan efter en möjlighet att ändra eller ta över listningen.',
          en: 'Fix the details directly at the directory. Click the arrow next to the directory name to open your page there, then look for an option to edit or claim the listing.',
        },
        {
          sv: 'Börja med det som fångas upp som fel, ta det som saknas därefter. Ett fel i taget — det brukar ta några minuter per katalog.',
          en: 'Start with what is flagged as wrong, then move on to what is missing. One fix at a time — it usually takes a few minutes per directory.',
        },
      ],
    },
    {
      id: 'kataloglistan',
      heading: { sv: 'Globala och svenska kataloger', en: 'Global and Swedish directories' },
      body: [
        {
          sv: 'Listan är delad i två delar. Globala kataloger som Google, Facebook och Apple Maps används av kartor och söktjänster i hela världen. Svenska kataloger som hitta.se och Eniro är de som svenska kunder faktiskt söker i.',
          en: 'The list is split in two. Global directories like Google, Facebook, and Apple Maps are used by maps and search services worldwide. Swedish directories like hitta.se and Eniro are the ones Swedish customers actually search in.',
        },
        {
          sv: 'Viktigast av allt är din Google-företagsprofil — det är den kunderna oftast ser först. Se till att den alltid stämmer, och använd exakt samma uppgifter när du rättar de andra.',
          en: 'Most important of all is your Google Business Profile — that is what customers usually see first. Make sure it is always correct, and use exactly the same details when you fix the others.',
        },
      ],
    },
  ],
}
