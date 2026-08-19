import { type SupportTopic } from '../types'

export const webbplats: SupportTopic = {
  id:    'webbplats',
  title: { sv: 'Webbplats', en: 'Website editor' },
  intro: {
    sv: 'Här redigerar du din egen hemsida — utan teknik och utan att kunna göra sönder något. Du klickar på det du vill ändra, skriver nytt och sparar. Inget syns utåt förrän du själv trycker på Spara.',
    en: 'This is where you edit your own website — no tech skills needed, and nothing you can break. Click what you want to change, type the new text, and save. Nothing goes public until you press Save yourself.',
  },
  sections: [
    {
      id: 'sa-redigerar-du',
      heading: { sv: 'Så redigerar du', en: 'How to edit' },
      body: [
        {
          sv: 'Sidan du ser är din riktiga hemsida. Klicka på valfri text — en rubrik, en beskrivning, en knapp — så kan du skriva om den direkt på plats.',
          en: 'The page you see is your real website. Click any text — a heading, a description, a button — and you can rewrite it right there on the spot.',
        },
        {
          sv: 'Under sidan finns flikar för olika delar: Tjänster där du hanterar dina tjänster och priser, Recensioner där du väljer vilka omdömen som visas, Funktioner där du slår på och av hela avsnitt, och Om oss för sidan om dig och ditt team.',
          en: 'Below the page are tabs for different parts: Services where you manage your services and prices, Reviews where you choose which reviews to show, Features where you turn whole sections on and off, and About us for the page about you and your team.',
        },
      ],
      terms: [
        {
          term: { sv: 'Tjänster', en: 'Services' },
          def:  { sv: 'Din lista med tjänster och priser. Du kan lägga till, ändra och ta bort tjänster och grupper.', en: 'Your list of services and prices. You can add, edit, and remove services and groups.' },
        },
        {
          term: { sv: 'Recensioner', en: 'Reviews' },
          def:  { sv: 'Välj vilka Google-omdömen som ska lyftas fram på hemsidan, eller skriv in ett omdöme du fått på annat sätt.', en: 'Choose which Google reviews to highlight on your website, or type in a review you received some other way.' },
        },
        {
          term: { sv: 'Funktioner', en: 'Features' },
          def:  { sv: 'Slå på och av hela avsnitt på sidan, som bildgalleri eller prislista, och ladda upp din logotyp.', en: 'Turn whole sections of the page on and off, like the photo gallery or price list, and upload your logo.' },
        },
        {
          term: { sv: 'Om oss', en: 'About us' },
          def:  { sv: 'Sidan som berättar om företaget och visar teamet. Redigeras på samma sätt — klicka och skriv.', en: 'The page that tells the story of your business and shows your team. Edited the same way — click and type.' },
        },
      ],
    },
    {
      id: 'vad-du-kan-andra',
      heading: { sv: 'Vad du kan ändra', en: 'What you can change' },
      body: [
        {
          sv: 'Alla texter: rubriker, beskrivningar, öppettider och kontaktuppgifter. Alla bilder: klicka på en bild för att byta ut den mot en egen. Din logotyp laddar du upp under fliken Funktioner.',
          en: 'All text: headings, descriptions, opening hours, and contact details. All images: click a picture to swap it for one of your own. Your logo is uploaded under the Features tab.',
        },
        {
          sv: 'Du styr också vilka avsnitt som visas och i vilken ordning de kommer. Vill du ha galleriet högre upp flyttar du det med pilarna på avsnittet.',
          en: 'You also control which sections show and in what order. Want the gallery higher up? Move it with the arrows on the section.',
        },
        {
          sv: 'Du kan även lägga in en bokningslänk, så att kunderna kan boka direkt från hemsidan.',
          en: 'You can also add a booking link, so customers can book straight from your website.',
        },
      ],
    },
    {
      id: 'sa-gar-andringar-live',
      heading: { sv: 'Så går ändringarna live', en: 'How changes go live' },
      body: [
        {
          sv: 'Ändringar du gör syns bara för dig tills du trycker på Spara uppe till höger. Så länge något är osparat visas texten "Osparade ändringar" — lämnar du sidan utan att spara försvinner de.',
          en: 'Changes you make are only visible to you until you press Save at the top right. While something is unsaved, you see the text "Unsaved changes" — leave the page without saving and they are gone.',
        },
        {
          sv: 'Osäker på hur det blev? Klicka på Förhandsgranska så öppnas hemsidan i en ny flik, exakt som besökarna ser den. Gilla det du ser, gå tillbaka och spara.',
          en: 'Not sure how it turned out? Click Preview and your website opens in a new tab, exactly as visitors see it. Like what you see? Go back and save.',
        },
      ],
      terms: [
        {
          term: { sv: 'Osparade ändringar', en: 'Unsaved changes' },
          def:  { sv: 'Du har gjort ändringar som ännu inte sparats. Tryck på Spara för att behålla dem.', en: 'You have made changes that are not saved yet. Press Save to keep them.' },
        },
        {
          term: { sv: '✓ Sparat', en: '✓ Saved' },
          def:  { sv: 'Dina senaste ändringar är sparade och gäller nu på hemsidan.', en: 'Your latest changes are saved and now live on the website.' },
        },
        {
          term: { sv: 'Förhandsgranska', en: 'Preview' },
          def:  { sv: 'Öppnar hemsidan i en ny flik så att du kan se den som en besökare, innan du sparar.', en: 'Opens the website in a new tab so you can see it as a visitor, before you save.' },
        },
      ],
    },
    {
      id: 'tips-foton-och-texter',
      heading: { sv: 'Tips för foton och tjänstebeskrivningar', en: 'Tips for photos and service descriptions' },
      body: [
        {
          sv: 'Foton säljer mer än ord. Använd egna bilder från din lokal och ditt arbete — riktiga före- och efterbilder slår alltid anonyma arkivbilder. Ta dem i dagsljus, gärna nära fönstret, och håll bakgrunden städad.',
          en: 'Photos sell more than words. Use your own pictures of your space and your work — real before-and-after shots always beat anonymous stock photos. Take them in daylight, ideally near a window, and keep the background tidy.',
        },
        {
          sv: 'Skriv tjänstebeskrivningar som svarar på kundens frågor: vad ingår, hur lång tid tar det och vad kostar det. Korta meningar och vardagliga ord fungerar bäst — skriv som du pratar med en kund i stolen.',
          en: 'Write service descriptions that answer the customer\'s questions: what is included, how long it takes, and what it costs. Short sentences and everyday words work best — write the way you talk to a customer in the chair.',
        },
        {
          sv: 'Sätt alltid ut priser. Kunder som inte hittar ett pris bokar ofta hos någon annan i stället för att fråga.',
          en: 'Always show your prices. Customers who cannot find a price often book somewhere else instead of asking.',
        },
      ],
    },
  ],
}
