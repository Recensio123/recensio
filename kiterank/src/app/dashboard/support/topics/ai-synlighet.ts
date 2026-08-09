import { type SupportTopic } from '../types'

export const aiSynlighet: SupportTopic = {
  id:    'ai-synlighet',
  title: { sv: 'AI-synlighet', en: 'AI visibility' },
  intro: {
    sv: 'Allt fler frågar chattjänster i stället för att googla. Någon skriver "vem är bästa frisören i mitt område" och får en lista med förslag. Den här sidan visar om ditt företag finns med i de svaren — och hur du står dig mot konkurrenterna.',
    en: 'More and more people ask chat services instead of googling. Someone types "who is the best hairdresser near me" and gets a list of suggestions. This page shows whether your business appears in those answers — and how you compare to your competitors.',
  },
  sections: [
    {
      id: 'tjansterna',
      heading: { sv: 'De fyra korten högst upp', en: 'The four cards at the top' },
      body: [
        {
          sv: 'Varje kort visar en chattjänst: ChatGPT, Perplexity, Gemini och AI Overviews. Vi testar samma sökfrågor i alla fyra, varje vecka. Kortet visar i hur många av frågorna tjänsten nämnde ditt företag.',
          en: 'Each card shows one chat service: ChatGPT, Perplexity, Gemini, and AI Overviews. We test the same search prompts in all four, every week. The card shows how many of the prompts that service mentioned your business in.',
        },
        {
          sv: 'Siffran läses som "nämnd i X av Y frågor". Ju högre, desto oftare blir du rekommenderad när kunder frågar den tjänsten om hjälp.',
          en: 'Read the number as "mentioned in X of Y prompts". The higher it is, the more often you get recommended when customers ask that service for help.',
        },
        {
          sv: 'Tjänsterna hämtar sin information från olika källor. Därför kan du synas bra i en tjänst och saknas helt i en annan — det är normalt.',
          en: 'The services pull their information from different sources. That is why you can show up well in one and be missing entirely from another — that is normal.',
        },
      ],
      terms: [
        {
          term: { sv: 'Siffran, till exempel 3 / 5', en: 'The number, for example 3 / 5' },
          def:  { sv: 'Ditt företag nämndes i 3 av de 5 frågor vi testade i den tjänsten den här veckan.', en: 'Your business was mentioned in 3 of the 5 prompts we tested in that service this week.' },
        },
        {
          term: { sv: 'Procenttalet', en: 'The percentage' },
          def:  { sv: 'Samma sak uttryckt i procent — hur stor andel av frågorna som nämnde dig.', en: 'The same thing as a percentage — the share of prompts that mentioned you.' },
        },
        {
          term: { sv: 'Snittplats', en: 'Avg. position' },
          def:  { sv: 'När du nämns får du oftast en plats i en lista med förslag. Snittplatsen visar var i listan du hamnar i genomsnitt. Plats 1 är bäst.', en: 'When you are mentioned, you usually get a spot in a list of suggestions. This shows where in the list you land on average. Position 1 is best.' },
        },
        {
          term: { sv: 'Nämns inte', en: 'Not mentioned' },
          def:  { sv: 'Tjänsten nämnde inte ditt företag i någon av veckans frågor. Det är en signal att jobba med källorna tjänsten läser.', en: 'The service did not mention your business in any of this week\'s prompts. That is a signal to work on the sources the service reads.' },
        },
      ],
    },
    {
      id: 'konkurrenter',
      heading: { sv: 'Så syns du jämfört med konkurrenterna', en: 'Competitor share of voice' },
      body: [
        {
          sv: 'Tabellen visar hur ofta varje företag i ditt område dyker upp i samma frågor. Din rad är markerad med gult, så att du snabbt ser var du står.',
          en: 'The table shows how often each business in your area appears in the same prompts. Your row is highlighted in yellow, so you can quickly see where you stand.',
        },
        {
          sv: 'Ligger en konkurrent högre än du betyder det att chattjänsterna hittar mer och bättre information om dem. Det går att komma ikapp — bra recensioner, korrekta uppgifter och en tydlig hemsida är det som väger tyngst.',
          en: 'If a competitor sits above you, the chat services are finding more and better information about them. You can catch up — good reviews, correct details, and a clear website carry the most weight.',
        },
      ],
      terms: [
        {
          term: { sv: 'Andel av utrymmet', en: 'Share of voice' },
          def:  { sv: 'Hur stor del av alla kontroller — alla frågor gånger alla fyra tjänster — som nämnde företaget. Stapeln gör det lätt att jämföra.', en: 'How much of all checks — every prompt times all four services — mentioned the business. The bar makes it easy to compare.' },
        },
        {
          term: { sv: 'Kontroller totalt', en: 'Total checks' },
          def:  { sv: 'Antalet testade frågor gånger fyra tjänster. Testar vi 5 frågor blir det 20 kontroller.', en: 'The number of tested prompts times four services. If we test 5 prompts, that makes 20 checks.' },
        },
      ],
    },
    {
      id: 'fraga-for-fraga',
      heading: { sv: 'Fråga för fråga', en: 'Prompt breakdown' },
      body: [
        {
          sv: 'Här ser du exakt vilka sökfrågor vi testar och hur det gick i varje tjänst. Frågorna är sådana som riktiga kunder ställer, till exempel om bästa alternativet nära dem.',
          en: 'Here you see exactly which search prompts we test and how each service answered. The prompts are the kind real customers ask, for example about the best option near them.',
        },
        {
          sv: 'En bock med en siffra betyder att du nämndes, och på vilken plats i svaret. Ett kryss betyder att du inte fanns med i den tjänstens svar på den frågan.',
          en: 'A tick with a number means you were mentioned, and at which position in the answer. A cross means you were not in that service\'s answer to that prompt.',
        },
        {
          sv: 'Håll muspekaren över en bock så ser du vad tjänsten faktiskt skrev om dig.',
          en: 'Hover over a tick to see what the service actually wrote about you.',
        },
      ],
      terms: [
        {
          term: { sv: 'Bock med siffra, till exempel ✓ #2', en: 'Tick with a number, for example ✓ #2' },
          def:  { sv: 'Ditt företag nämndes i svaret, som förslag nummer 2.', en: 'Your business was mentioned in the answer, as suggestion number 2.' },
        },
        {
          term: { sv: 'Kryss', en: 'Cross' },
          def:  { sv: 'Ditt företag nämndes inte i den tjänstens svar på den frågan.', en: 'Your business was not mentioned in that service\'s answer to that prompt.' },
        },
        {
          term: { sv: 'Antal omnämnanden', en: 'Total mentions' },
          def:  { sv: 'Raden längst ner räknar ihop hur många frågor varje tjänst nämnde dig i totalt.', en: 'The bottom row adds up how many prompts each service mentioned you in overall.' },
        },
      ],
    },
    {
      id: 'vad-ai-sager-och-kallor',
      heading: { sv: 'Vad som sägs om dig — och varifrån det kommer', en: 'What is said about you — and where it comes from' },
      body: [
        {
          sv: 'Under tabellen ser du de exakta meningarna där ditt företag rekommenderades. Läs dem — de speglar vad tjänsterna plockar upp från dina recensioner, din hemsida och dina katalogsidor.',
          en: 'Below the table you see the exact sentences where your business was recommended. Read them — they reflect what the services pick up from your reviews, your website, and your directory listings.',
        },
        {
          sv: 'Avsnittet om källor visar vilka webbplatser varje tjänst hämtar sin information från. Det är de sidorna du behöver hålla korrekta och uppdaterade. Gamla uppgifter på en källa ger gamla uppgifter i svaren.',
          en: 'The sources section shows which websites each service pulls its information from. Those are the pages you need to keep correct and up to date. Old details on a source mean old details in the answers.',
        },
      ],
      terms: [
        {
          term: { sv: 'Källhänvisningar', en: 'Citations' },
          def:  { sv: 'Hur många gånger tjänsten pekade på just den webbplatsen när den gav sina svar. Fler hänvisningar betyder att källan väger tungt.', en: 'How many times the service pointed to that website when giving its answers. More citations mean the source carries more weight.' },
        },
      ],
    },
    {
      id: 'trend',
      heading: { sv: 'Omnämnanden över tid', en: 'Mentions over time' },
      body: [
        {
          sv: 'Kurvorna längst ner visar hur många frågor varje tjänst nämnde dig i, vecka för vecka de senaste åtta veckorna. En stigande kurva betyder att du rekommenderas allt oftare.',
          en: 'The lines at the bottom show how many prompts each service mentioned you in, week by week over the last eight weeks. A rising line means you are getting recommended more and more often.',
        },
        {
          sv: 'Förändringar tar tid. Räkna med några veckor innan förbättrade recensioner och uppdaterade uppgifter syns i kurvorna — titta på riktningen, inte på en enskild vecka.',
          en: 'Change takes time. Expect a few weeks before better reviews and updated details show up in the lines — look at the direction, not at a single week.',
        },
      ],
    },
  ],
}
