import { type SupportTopic } from '../types'

export const sms: SupportTopic = {
  id:    'sms',
  title: { sv: 'SMS-utskick', en: 'SMS messages' },
  intro: {
    sv: 'SMS-utskick sköter två meddelanden åt dig: en påminnelse innan besöket och en recensionsförfrågan efteråt. Båda kan gå helt automatiskt eller skickas när du själv väljer. Mallarna och inställningarna sparas direkt — utskicken aktiveras när en SMS-tjänst är kopplad.',
    en: 'SMS messages handles two messages for you: a reminder before the visit and a review request afterwards. Both can run fully automatically or be sent when you choose. Your templates and settings are saved right away — sending activates once an SMS service is connected.',
  },
  sections: [
    {
      id: 'avsandare',
      heading: { sv: 'Avsändarnamn och e-post som reserv', en: 'Sender name and email as backup' },
      body: [
        {
          sv: 'Avsändarnamnet är det kunden ser som avsändare när meddelandet kommer fram. Använd salongens namn — då vet kunden direkt vem som hör av sig och meddelandet känns aldrig som skräppost.',
          en: 'The sender name is what the customer sees as the sender when the message arrives. Use your salon’s name — then the customer knows right away who is getting in touch, and the message never feels like spam.',
        },
        {
          sv: 'SMS-namnet får vara högst 11 tecken. Det är en teknisk gräns i SMS-standarden, inget vi valt. Räknaren bredvid fältet visar hur många tecken du använt. Är namnet för långt blir räknaren röd och du behöver korta ner innan det går att spara.',
          en: 'The SMS name can be at most 11 characters. That is a technical limit in the SMS standard, not something we chose. The counter next to the field shows how many characters you have used. If the name is too long the counter turns red and you need to shorten it before you can save.',
        },
        {
          sv: 'E-postnamnet har ingen sådan gräns. Det visas som avsändare i kundens inkorg när meddelandet skickas som e-post.',
          en: 'The email name has no such limit. It is shown as the sender in the customer’s inbox when the message is sent as email.',
        },
        {
          sv: 'E-post som reserv styr vad som händer när en kund saknar mobilnummer. Är den på skickas meddelandet som e-post istället, både för påminnelser och recensionsförfrågningar. Är den av får kunden inget alls — raden visar då Nummer saknas.',
          en: 'Email as backup controls what happens when a customer has no mobile number. If it is on, the message is sent as email instead, for both reminders and review requests. If it is off the customer gets nothing at all — the row then shows No number.',
        },
      ],
      terms: [
        { term: { sv: 'SMS-fältet', en: 'The SMS field' }, def: { sv: 'Namnet som står som avsändare på själva SMS:et. Högst 11 tecken.', en: 'The name shown as the sender on the SMS itself. At most 11 characters.' } },
        { term: { sv: 'Räknaren 0/11', en: 'The 0/11 counter' }, def: { sv: 'Visar hur många av de 11 tillåtna tecknen du använt. Gul betyder att du ligger på gränsen, röd att namnet är för långt.', en: 'Shows how many of the 11 allowed characters you have used. Yellow means you are close to the limit, red means the name is too long.' } },
        { term: { sv: 'E-post', en: 'Email' }, def: { sv: 'Namnet som visas som avsändare i kundens inkorg. Ingen teckengräns.', en: 'The name shown as the sender in the customer’s inbox. No character limit.' } },
        { term: { sv: 'E-post som reserv', en: 'Email as backup' }, def: { sv: 'Reglaget som avgör om kunder utan mobilnummer får meddelandet som e-post istället. Grönt betyder på.', en: 'The toggle that decides whether customers without a mobile number get the message as email instead. Green means on.' } },
      ],
    },
    {
      id: 'paminnelser',
      heading: { sv: 'Påminnelse inför besök', en: 'Reminder before the visit' },
      body: [
        {
          sv: 'En påminnelse innan besöket ger färre missade tider. Kunden får ett kort SMS med behandling, datum och tid — och kommer ihåg att dyka upp eller hör av sig i tid om något ändrats.',
          en: 'A reminder before the visit means fewer missed appointments. The customer gets a short SMS with the treatment, date and time — and remembers to show up, or gets in touch in time if something has changed.',
        },
        {
          sv: 'Välj mellan Automatiskt och Jag väljer själv. Med Automatiskt får alla kommande bokningar påminnelsen utan att du gör något. Med Jag väljer själv skickas inget förrän du trycker på Skicka påminnelse på en rad.',
          en: 'Choose between Automatic and I choose myself. With Automatic, every upcoming booking gets the reminder without you doing anything. With I choose myself, nothing is sent until you press Send reminder on a row.',
        },
        {
          sv: 'Tidpunkten ställer du in med − och + i meningen under rubriken. Välj antal timmar eller dagar innan besöket. En dag innan är en bra start — kunden hinner ändra sig utan att tiden går förlorad.',
          en: 'You set the timing with − and + in the sentence under the heading. Pick a number of hours or days before the visit. One day before is a good start — the customer has time to change plans without the slot going to waste.',
        },
        {
          sv: 'Även i automatiskt läge har du full kontroll per kund. Hoppa över tar bort en enskild kund från utskicket, och Ta med igen ångrar det. Pennan på raden öppnar meddelandet till just den kunden, så att du kan skriva om det personligt. Då visas märket Anpassat på raden.',
          en: 'Even in automatic mode you have full control per customer. Skip removes a single customer from the send-out, and Include again undoes it. The pen on the row opens the message to that specific customer, so you can rewrite it personally. The Customised badge then shows on the row.',
        },
      ],
      terms: [
        { term: { sv: 'Automatiskt', en: 'Automatic' }, def: { sv: 'Alla i listan får meddelandet vid den tid du valt, utan att du behöver göra något.', en: 'Everyone in the list gets the message at the time you chose, without you having to do anything.' } },
        { term: { sv: 'Jag väljer själv', en: 'I choose myself' }, def: { sv: 'Inget skickas automatiskt. Du skickar till varje kund med knappen på raden.', en: 'Nothing is sent automatically. You send to each customer with the button on the row.' } },
        { term: { sv: 'Ingår ✓', en: 'Included ✓' }, def: { sv: 'Kunden är med i det automatiska utskicket.', en: 'The customer is part of the automatic send-out.' } },
        { term: { sv: 'Hoppa över', en: 'Skip' }, def: { sv: 'Tar bort just den här kunden från utskicket. Övriga påverkas inte.', en: 'Removes just this customer from the send-out. No one else is affected.' } },
        { term: { sv: 'Pennan ✎', en: 'The pen ✎' }, def: { sv: 'Öppnar meddelandet till den kunden så att du kan ändra texten bara för hen.', en: 'Opens the message to that customer so you can change the text just for them.' } },
        { term: { sv: 'Anpassat', en: 'Customised' }, def: { sv: 'Den här kunden får din omskrivna text istället för mallen. Återgå till mallen tar bort anpassningen.', en: 'This customer gets your rewritten text instead of the template. Back to the template removes the customisation.' } },
        { term: { sv: '✉ via e-post', en: '✉ via email' }, def: { sv: 'Kunden saknar mobilnummer och får meddelandet som e-post istället.', en: 'The customer has no mobile number and gets the message as email instead.' } },
        { term: { sv: 'Nummer saknas', en: 'No number' }, def: { sv: 'Kunden saknar mobilnummer och e-post som reserv är avstängt — inget skickas.', en: 'The customer has no mobile number and email as backup is turned off — nothing is sent.' } },
      ],
    },
    {
      id: 'recensioner',
      heading: { sv: 'Recensionsförfrågan efter besök', en: 'Review request after the visit' },
      body: [
        {
          sv: 'Efter ett avslutat besök kan kunden få ett meddelande med din recensionslänk. Fler recensioner gör att du syns bättre på Google — det är ett av de enklaste sätten att få nya kunder.',
          en: 'After a completed visit, the customer can get a message with your review link. More reviews make you more visible on Google — one of the easiest ways to get new customers.',
        },
        {
          sv: 'Tidpunkten fungerar som för påminnelsen, men räknas efter besöket. 0 timmar betyder att förfrågan går iväg direkt när du markerar besöket som avslutat. Ett par timmar efteråt brukar fungera bra — besöket är färskt i minnet och kunden har hunnit landa.',
          en: 'The timing works like the reminder, but is counted after the visit. 0 hours means the request goes out the moment you mark the visit as completed. A couple of hours afterwards usually works well — the visit is fresh in the customer’s mind and they have had time to land.',
        },
        {
          sv: 'Alla kunder får samma förfrågan, utan filtrering på vilka som verkade nöjda. Det är medvetet: Googles regler tillåter inte att man bara frågar nöjda kunder. Att fråga alla håller dig på rätt sida av reglerna — och de flesta som svarar är faktiskt nöjda.',
          en: 'Every customer gets the same request, with no filtering on who seemed happy. That is deliberate: Google’s rules do not allow asking only happy customers. Asking everyone keeps you on the right side of the rules — and most people who respond are actually happy.',
        },
        {
          sv: 'I övrigt fungerar allt som för påminnelsen: automatiskt eller manuellt läge, hoppa över enskilda kunder och skriv om meddelandet per person med pennan.',
          en: 'Everything else works like the reminder: automatic or manual mode, skip individual customers, and rewrite the message per person with the pen.',
        },
      ],
      terms: [
        { term: { sv: '0 timmar', en: '0 hours' }, def: { sv: 'Förfrågan skickas direkt när besöket markeras som avslutat i Bokningar.', en: 'The request is sent the moment the visit is marked as completed in Bookings.' } },
        { term: { sv: 'Skicka förfrågan', en: 'Send request' }, def: { sv: 'Skickar recensionsförfrågan till kunden på raden. Visas bara i manuellt läge.', en: 'Sends the review request to the customer on the row. Only shown in manual mode.' } },
        { term: { sv: 'Skickat ✓', en: 'Sent ✓' }, def: { sv: 'Förfrågan har gått iväg till den här kunden.', en: 'The request has gone out to this customer.' } },
        { term: { sv: '{länk}', en: '{länk}' }, def: { sv: 'Platsen i mallen där kundens recensionslänk sätts in vid utskick. Ta inte bort den — utan länk kan kunden inte lämna en recension.', en: 'The spot in the template where the customer’s review link is inserted when the message is sent. Do not remove it — without the link the customer cannot leave a review.' } },
      ],
    },
    {
      id: 'mallar',
      heading: { sv: 'Mallar och platshållare', en: 'Templates and placeholders' },
      body: [
        {
          sv: 'Mallen är texten som skickas till kunden. Orden inom klamrar, till exempel {namn}, är platshållare — de byts ut mot kundens egna uppgifter vid varje utskick. Klicka på knapparna under rutan för att infoga en platshållare där markören står.',
          en: 'The template is the text that is sent to the customer. The words in curly brackets, for example {namn}, are placeholders — they are swapped for the customer’s own details in every send-out. The messages go to your customers, so the templates are written in Swedish. Click the buttons under the box to insert a placeholder where your cursor is.',
        },
        {
          sv: 'Salongens namn står redan inskrivet i texten, så du behöver bara platshållare för det som skiljer sig mellan kunder: {namn} blir kundens förnamn, {datum} och {tid} blir bokningens dag och klockslag, {tjänst} blir behandlingen och {länk} blir recensionslänken.',
          en: 'Your salon’s name is already written into the text, so you only need placeholders for what differs between customers: {namn} becomes the customer’s first name, {datum} and {tid} become the booking’s day and time, {tjänst} becomes the treatment and {länk} becomes the review link.',
        },
        {
          sv: 'Räknaren under rutan visar antal tecken och hur många SMS texten blir. Ett SMS rymmer 160 tecken — längre text delas upp i flera SMS, och varje del kostar som ett eget SMS. Räknaren blir gul när texten passerat ett SMS. Kort och vänligt vinner nästan alltid.',
          en: 'The counter under the box shows the character count and how many SMS the text becomes. One SMS holds 160 characters — longer text is split into several SMS, and each part costs as its own SMS. The counter turns yellow once the text passes one SMS. Short and friendly wins almost every time.',
        },
        {
          sv: 'Ämnesraden används bara när meddelandet skickas som e-post — SMS har ingen ämnesrad. Det är det första kunden ser i inkorgen, så håll den kort och tydlig. Knappen Spara mall dyker upp så fort du ändrat något och försvinner när allt är sparat.',
          en: 'The subject line is only used when the message is sent as email — SMS has no subject line. It is the first thing the customer sees in the inbox, so keep it short and clear. The Save template button appears as soon as you have changed something and disappears once everything is saved.',
        },
      ],
      terms: [
        { term: { sv: '{namn}', en: '{namn}' }, def: { sv: 'Byts ut mot kundens förnamn, till exempel Anna.', en: 'Replaced with the customer’s first name, for example Anna.' } },
        { term: { sv: '{datum} och {tid}', en: '{datum} and {tid}' }, def: { sv: 'Byts ut mot bokningens dag och klockslag, till exempel imorgon kl 10:00.', en: 'Replaced with the booking’s day and time, for example imorgon kl 10:00 (tomorrow at 10:00).' } },
        { term: { sv: '{tjänst}', en: '{tjänst}' }, def: { sv: 'Byts ut mot behandlingen kunden bokat, till exempel klippning dam.', en: 'Replaced with the treatment the customer booked, for example klippning dam (women’s haircut).' } },
        { term: { sv: 'tecken · SMS', en: 'characters · SMS' }, def: { sv: 'Räknaren visar textens längd och hur många SMS den delas upp i. Ett SMS rymmer 160 tecken.', en: 'The counter shows the length of the text and how many SMS it is split into. One SMS holds 160 characters.' } },
        { term: { sv: 'Spara mall', en: 'Save template' }, def: { sv: 'Sparar dina ändringar i mallen. Knappen visas bara när något är osparat.', en: 'Saves your changes to the template. The button only shows when something is unsaved.' } },
        { term: { sv: 'Ämnesrad', en: 'Subject line' }, def: { sv: 'Rubriken kunden ser i inkorgen när meddelandet skickas som e-post. Gäller inte SMS.', en: 'The heading the customer sees in the inbox when the message is sent as email. Does not apply to SMS.' } },
      ],
    },
  ],
}
