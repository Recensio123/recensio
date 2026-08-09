import { type SupportTopic } from '../types'

// Reference topic — fully written in Swedish. Other topic files follow the
// same structure: one section per visual block on the page, in the order
// they appear, with a terms list for every number or label a salon owner
// might wonder about.
export const hem: SupportTopic = {
  id:    'hem',
  title: { sv: 'Hem', en: 'Home' },
  intro: {
    sv: 'Hem är din startsida. Den svarar på två frågor: vad har hänt den här veckan, och vad ska du göra åt det? Allt på sidan uppdateras varje vecka — du behöver aldrig leta efter vad som är viktigt.',
    en: 'Home is your start page. It answers two questions: what happened this week, and what should you do about it? Everything on the page updates every week — you never have to hunt for what matters.',
  },
  sections: [
    {
      id: 'veckans-rubrik',
      heading: { sv: 'Rubriken högst upp', en: 'The headline at the top' },
      body: [
        {
          sv: 'Den stora siffran visar hur många nya kunder som hittade dig via Google den här veckan, jämfört med förra veckan. Det är sidans viktigaste siffra — allt annat på sidan förklarar varifrån den kommer.',
          en: 'The big number shows how many new customers found you through Google this week, compared with last week. It is the most important number on the page — everything else on the page explains where it comes from.',
        },
        {
          sv: 'Har du bokningssystemet ser du också vad kunderna är värda i kronor, räknat på dina faktiska bokningar.',
          en: 'If you have the booking system, you also see what those customers are worth in kronor, based on your actual bookings.',
        },
      ],
      terms: [
        { term: { sv: 'Nya kunder', en: 'New customers' },
          def:  { sv: 'Personer som ringde, bokade eller skickade en förfrågan efter att ha hittat dig på Google — via din profil, sökresultaten eller annonser.',
                  en: 'People who called, booked or sent an enquiry after finding you on Google — through your profile, the search results or ads.' } },
        { term: { sv: 'Förhandsgranska din måndagsrapport', en: 'Preview your Monday report' },
          def:  { sv: 'Öppnar veckorapporten som samlar veckans viktigaste händelser — samma innehåll som kan skickas till din e-post varje måndag.',
                  en: "Opens the weekly report that gathers the week's most important events — the same content that can be sent to your email every Monday." } },
      ],
    },
    {
      id: 'varningar-och-vinst',
      heading: { sv: 'Varningar och veckans vinst', en: 'Warnings and the win of the week' },
      body: [
        {
          sv: 'Den gula raden visar det som behöver din uppmärksamhet just nu, till exempel recensioner som väntar på svar. Klicka på raden så kommer du direkt till rätt ställe.',
          en: 'The yellow row shows what needs your attention right now, such as reviews waiting for a reply. Click the row to go straight to the right place.',
        },
        {
          sv: 'Den gröna raden lyfter fram något som gått bra den här veckan. Den är där för att du ska se att arbetet ger resultat.',
          en: 'The green row highlights something that went well this week. It is there so you can see that the work pays off.',
        },
      ],
    },
    {
      id: 'veckans-atgarder',
      heading: { sv: 'Veckans åtgärder', en: "This week's actions" },
      body: [
        {
          sv: 'En kort lista med de åtgärder som ger störst effekt just nu, rankade efter hur mycket de påverkar din synlighet och dina bokningar. Klicka på en rad för att se exakt vad du ska göra och varför det spelar roll.',
          en: 'A short list of the actions that make the biggest difference right now, ranked by how much they affect your visibility and your bookings. Click a row to see exactly what to do and why it matters.',
        },
        {
          sv: 'Bocka av åtgärderna när de är klara. Ringen högst upp visar hur långt du kommit — klarar du alla under veckan förlängs din svit.',
          en: 'Tick off the actions as you finish them. The ring at the top shows how far you have come — complete them all during the week and your streak grows.',
        },
      ],
      terms: [
        { term: { sv: 'Kategori-etiketten', en: 'The category label' },
          def:  { sv: 'Visar vilket område åtgärden gäller — Recensioner, SEO, Annonser eller Foton — så att du vet var i menyn den hör hemma.',
                  en: 'Shows which area the action belongs to — Reviews, SEO, Ads or Photos — so you know where in the menu it lives.' } },
        { term: { sv: 'Tidsangivelsen', en: 'The time estimate' },
          def:  { sv: 'Ungefär så lång tid åtgärden tar. De flesta går att göra på under en halvtimme.',
                  en: 'Roughly how long the action takes. Most can be done in under half an hour.' } },
        { term: { sv: 'Veckor i rad', en: 'Weeks in a row' },
          def:  { sv: 'Din svit — hur många veckor i följd du slutfört veckans åtgärder och vanor. Sviten nollställs varje måndag om veckan innan inte blev klar.',
                  en: "Your streak — how many weeks in a row you have completed the week's actions and habits. The streak resets every Monday if the previous week was not finished." } },
      ],
    },
    {
      id: 'veckans-vanor',
      heading: { sv: 'Veckans vanor', en: "This week's habits" },
      body: [
        {
          sv: 'Små återkommande saker som bygger din synlighet över tid — be en nöjd kund om en recension, svara på nya recensioner, lägg upp ett foto och kolla din annonskostnad. De nollställs varje måndag.',
          en: 'Small recurring things that build your visibility over time — ask a happy customer for a review, reply to new reviews, add a photo and check your ad spend. They reset every Monday.',
        },
        {
          sv: 'Vanorna är medvetet små. En vana på två minuter som görs varje vecka slår en stor insats som bara görs en gång.',
          en: 'The habits are deliberately small. A two-minute habit done every week beats a big effort done only once.',
        },
      ],
    },
    {
      id: 'denna-vecka-mot-forra',
      heading: { sv: 'Denna vecka mot förra veckan', en: 'This week vs last week' },
      body: [
        {
          sv: 'Fyra kort som jämför veckans siffror med förra veckans: hur många som såg dig på Google, klick från sökningar, förfrågningar från annonser och besök på hemsidan. Grön pil betyder uppåt, röd betyder nedåt.',
          en: "Four cards comparing this week's numbers with last week's: how many people saw you on Google, clicks from searches, enquiries from ads and visits to your website. A green arrow means up, red means down.",
        },
        {
          sv: 'En enskild vecka kan alltid svänga. Titta på riktningen över flera veckor innan du drar slutsatser av en nedgång.',
          en: 'Any single week can swing. Look at the direction over several weeks before drawing conclusions from a dip.',
        },
      ],
    },
    {
      id: 'dina-kanaler',
      heading: { sv: 'Dina kanaler', en: 'Your channels' },
      body: [
        {
          sv: 'En snabb överblick över dina fyra kanaler — Google-profilen, Google-sök, annonser och hemsidan. Varje kort visar kanalens viktigaste siffra och hur den förändrats. Klicka på ett kort för att öppna kanalens egen sida med alla detaljer.',
          en: "A quick overview of your four channels — the Google profile, Google Search, ads and your website. Each card shows the channel's most important number and how it has changed. Click a card to open the channel's own page with all the details.",
        },
      ],
    },
    {
      id: 'vinster',
      heading: { sv: 'Dina vinster', en: 'Your wins' },
      body: [
        {
          sv: 'En hopfälld lista längst ner med det som gått bra de senaste veckorna. Öppna den när du behöver en påminnelse om att arbetet ger resultat — eller när du vill visa någon annan.',
          en: 'A collapsed list at the bottom with what has gone well in recent weeks. Open it when you need a reminder that the work pays off — or when you want to show someone else.',
        },
      ],
    },
  ],
}
