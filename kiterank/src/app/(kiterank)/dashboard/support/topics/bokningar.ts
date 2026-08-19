import { type SupportTopic } from '../types'

export const bokningar: SupportTopic = {
  id:    'bokningar',
  title: { sv: 'Bokningar', en: 'Bookings' },
  intro: {
    sv: 'Bokningar samlar alla dina kundbokningar på ett ställe. Här ser du vem som kommer, när de kommer och vad besöken är värda. Härifrån bekräftar du nya bokningar och håller listan uppdaterad.',
    en: 'Bookings gathers all your customer bookings in one place. Here you see who is coming, when they are coming and what the visits are worth. From here you confirm new bookings and keep the list up to date.',
  },
  sections: [
    {
      id: 'statistik',
      heading: { sv: 'Siffrorna högst upp', en: 'The numbers at the top' },
      body: [
        {
          sv: 'Fyra kort ger dig läget på några sekunder: hur många bokningar du har idag, hur många den kommande veckan, vad veckans bokningar är värda i kronor och hur många som väntar på ditt svar.',
          en: 'Four cards give you the picture in seconds: how many bookings you have today, how many in the coming week, what this week’s bookings are worth in kronor, and how many are waiting for your reply.',
        },
        {
          sv: 'Avbokade bokningar räknas aldrig med i korten. Veckan räknas från idag och sju dagar framåt, så siffrorna gäller alltid det som ligger framför dig.',
          en: 'Cancelled bookings are never counted in the cards. The week runs from today and seven days ahead, so the numbers always cover what lies in front of you.',
        },
        {
          sv: 'Håll extra koll på kortet Väntar svar. En snabb bekräftelse gör att kunden känner sig trygg med sin tid — och minskar risken att hen bokar någon annanstans.',
          en: 'Keep an extra eye on the Awaiting reply card. A quick confirmation makes the customer feel sure about their time — and reduces the risk of them booking somewhere else.',
        },
      ],
      terms: [
        { term: { sv: 'Idag', en: 'Today' }, def: { sv: 'Antal bokningar med dagens datum. Avbokade räknas inte med.', en: 'The number of bookings dated today. Cancelled ones are not counted.' } },
        { term: { sv: 'Denna vecka', en: 'This week' }, def: { sv: 'Antal bokningar från idag och sju dagar framåt. Avbokade räknas inte med.', en: 'The number of bookings from today and seven days ahead. Cancelled ones are not counted.' } },
        { term: { sv: 'Värde denna vecka', en: 'Value this week' }, def: { sv: 'Summan av priserna för veckans bokningar, i kronor. Den gröna siffran visar vad kalendern är värd just nu — bra att jämföra vecka för vecka.', en: 'The total price of this week’s bookings, in kronor. The green number shows what your calendar is worth right now — good to compare week by week.' } },
        { term: { sv: 'Väntar svar', en: 'Awaiting reply' }, def: { sv: 'Bokningar som kunden gjort men som du ännu inte bekräftat. Målet är att den här siffran är noll.', en: 'Bookings the customer has made but you have not confirmed yet. The goal is for this number to be zero.' } },
      ],
    },
    {
      id: 'lista',
      heading: { sv: 'Bokningslistan', en: 'The booking list' },
      body: [
        {
          sv: 'Flikarna ovanför listan filtrerar vad du ser. Alla visar allt, Idag visar dagens bokningar, Kommande visar det som ligger framåt i tiden och Avslutade visar det som är klart, avbokat eller uteblivet. Den gula siffran på Kommande visar hur många bokningar som väntar på din bekräftelse.',
          en: 'The tabs above the list filter what you see. All shows everything, Today shows today’s bookings, Upcoming shows what lies ahead, and Done shows what is finished, cancelled or a no-show. The yellow number on Upcoming shows how many bookings are waiting for your confirmation.',
        },
        {
          sv: 'Varje rad visar kundens namn och telefonnummer, behandlingen med tid och pris, datum och klockslag samt ett färgat statusmärke. Dagens bokningar markeras med Idag i gult så att de sticker ut. Märket online betyder att kunden bokade själv via din bokningslänk.',
          en: 'Each row shows the customer’s name and phone number, the treatment with duration and price, the date and time, and a coloured status badge. Today’s bookings are marked Today in yellow so they stand out. The online badge means the customer booked themselves through your booking link.',
        },
        {
          sv: 'Klicka på en rad för att fälla ut den. Där ser du kundens e-post, eventuellt meddelande från kunden och när bokningen gjordes. Där finns också snabbknapparna för att ändra status och en knapp för att ringa kunden direkt.',
          en: 'Click a row to expand it. There you see the customer’s email, any message from the customer, and when the booking was made. That is also where the quick buttons for changing status are, plus a button to call the customer directly.',
        },
        {
          sv: 'Statusen styr allt annat på sidan. En ny bokning börjar som Väntar. Du bekräftar den, och efter besöket markerar du den som Avslutad — eller Uteblev om kunden aldrig kom. Blev det fel går det alltid att återställa.',
          en: 'The status drives everything else on the page. A new booking starts as Pending. You confirm it, and after the visit you mark it as Completed — or No-show if the customer never came. If you make a mistake you can always restore it.',
        },
      ],
      terms: [
        { term: { sv: 'Väntar', en: 'Pending' }, def: { sv: 'Kunden har bokat men du har inte bekräftat tiden än. Bekräfta så snart du kan.', en: 'The customer has booked but you have not confirmed the time yet. Confirm as soon as you can.' } },
        { term: { sv: 'Bekräftad', en: 'Confirmed' }, def: { sv: 'Du har godkänt bokningen. Tiden är reserverad för kunden.', en: 'You have approved the booking. The time is reserved for the customer.' } },
        { term: { sv: 'Avbokad', en: 'Cancelled' }, def: { sv: 'Bokningen är inställd. Den räknas inte med i statistiken högst upp.', en: 'The booking is off. It is not counted in the statistics at the top.' } },
        { term: { sv: 'Avslutad', en: 'Completed' }, def: { sv: 'Besöket är genomfört. Avslutade besök kan få en recensionsförfrågan via SMS-utskick.', en: 'The visit is done. Completed visits can get a review request via SMS messages.' } },
        { term: { sv: 'Uteblev', en: 'No-show' }, def: { sv: 'Kunden dök aldrig upp till sin tid. Bra att markera — då ser du mönster om samma kund uteblir flera gånger.', en: 'The customer never showed up for their time. Good to mark — you will spot the pattern if the same customer misses several times.' } },
        { term: { sv: '✓ Bekräfta', en: '✓ Confirm' }, def: { sv: 'Godkänner en väntande bokning och byter status till Bekräftad.', en: 'Approves a pending booking and changes the status to Confirmed.' } },
        { term: { sv: 'Återställ', en: 'Restore' }, def: { sv: 'Flyttar tillbaka en avbokad eller utebliven bokning till Väntar, till exempel om kunden hör av sig igen.', en: 'Moves a cancelled or no-show booking back to Pending, for example if the customer gets in touch again.' } },
        { term: { sv: '☎ Ring', en: '☎ Call' }, def: { sv: 'Öppnar telefonens uppringning med kundens nummer redan ifyllt.', en: 'Opens your phone’s dialler with the customer’s number already filled in.' } },
        { term: { sv: 'online-märket', en: 'the online badge' }, def: { sv: 'Bokningen gjordes via din bokningslänk, inte per telefon eller drop-in.', en: 'The booking was made through your booking link, not by phone or walk-in.' } },
      ],
    },
    {
      id: 'bokningslank',
      heading: { sv: 'Bokningslänken', en: 'The booking link' },
      body: [
        {
          sv: 'Knappen Bokningslänk uppe till höger öppnar din publika bokningssida. Det är sidan kunderna använder för att boka själva — dygnet runt, utan att behöva ringa.',
          en: 'The Booking link button in the top right opens your public booking page. It is the page customers use to book themselves — around the clock, without having to call.',
        },
        {
          sv: 'Dela länken överallt där kunder hittar dig: på din Google-profil, i bion på sociala medier, på hemsidan och när någon frågar om en tid per sms. Ju fler ställen länken finns på, desto fler bokningar kommer in av sig själva.',
          en: 'Share the link everywhere customers find you: on your Google profile, in your social media bios, on your website, and when someone asks about a time by text. The more places the link lives, the more bookings come in on their own.',
        },
        {
          sv: 'Bokningar som kommer in via länken märks med online i listan och hamnar under Väntar tills du bekräftar dem. Du har alltid sista ordet om tiden passar.',
          en: 'Bookings that come in through the link are marked online in the list and sit under Pending until you confirm them. You always have the final say on whether the time works.',
        },
      ],
      terms: [
        { term: { sv: 'Bokningslänk', en: 'Booking link' }, def: { sv: 'Knappen som öppnar din bokningssida i en ny flik. Adressen i webbläsaren är länken du delar med kunderna.', en: 'The button that opens your booking page in a new tab. The address in the browser is the link you share with your customers.' } },
      ],
    },
  ],
}
