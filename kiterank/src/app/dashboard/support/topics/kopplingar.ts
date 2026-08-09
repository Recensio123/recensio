import { type SupportTopic } from '../types'

export const kopplingar: SupportTopic = {
  id:    'kopplingar',
  title: { sv: 'Kopplingar', en: 'Connections' },
  intro: {
    sv: 'Här kopplar du ditt Google-konto till Kiterank. Det är kopplingen som fyller hela översikten med din riktiga data — recensioner, sökresultat, annonser och hemsidebesök. Du gör det en gång, sedan sköter sig resten automatiskt.',
    en: 'This is where you connect your Google account to Kiterank. That connection is what fills the whole dashboard with your real data — reviews, search results, ads, and website visits. You do it once, then the rest takes care of itself.',
  },
  sections: [
    {
      id: 'vad-kopplingen-gor',
      heading: { sv: 'Vad kopplingen gör', en: 'What the connection does' },
      body: [
        {
          sv: 'När du klickar på "Koppla med Google" loggar du in med ditt vanliga Google-konto. En enda inloggning kopplar fyra saker på samma gång: din företagsprofil, Search Console, Google Ads och Analytics.',
          en: 'When you click "Connect with Google" you sign in with your normal Google account. One single sign-in connects four things at once: your Business Profile, Search Console, Google Ads, and Analytics.',
        },
        {
          sv: 'Åtkomsten är enbart läsande. Vi hämtar dina siffror för att visa dem här — vi publicerar, svarar eller ändrar aldrig något åt dig på Google.',
          en: 'The access is read-only. We fetch your numbers to show them here — we never post, reply, or change anything on Google on your behalf.',
        },
        {
          sv: 'Du kan när som helst ta bort åtkomsten via ditt Google-kontos säkerhetsinställningar. Då slutar datan att hämtas, men inget hos Google påverkas.',
          en: 'You can remove the access at any time in your Google account\'s security settings. The data stops coming in, but nothing on Google is affected.',
        },
      ],
    },
    {
      id: 'datakallorna',
      heading: { sv: 'De fyra datakällorna', en: 'The four data sources' },
      body: [
        {
          sv: 'Efter kopplingen ser du en rad per datakälla, med status för var och en. Alla fyra behövs inte — översikten visar det som finns, och du kan komplettera senare.',
          en: 'After connecting, you see one row per data source, each with its own status. You do not need all four — the dashboard shows what is there, and you can add the rest later.',
        },
        {
          sv: 'Företagsprofilen ger recensioner, stjärnbetyg och hur du syns på Google Maps. Search Console visar var du hamnar i sökresultaten och vilka sökord som ger besök. Google Ads visar vad annonserna kostar och ger. Analytics visar besöken på din hemsida.',
          en: 'The Business Profile brings reviews, star ratings, and how you show up on Google Maps. Search Console shows where you land in search results and which keywords bring visitors. Google Ads shows what your ads cost and bring back. Analytics shows the visits to your website.',
        },
      ],
      terms: [
        {
          term: { sv: 'Aktiv', en: 'Active' },
          def:  { sv: 'Källan är igång och datan hämtas automatiskt. Inget behöver göras.', en: 'The source is live and your data is fetched automatically. Nothing to do.' },
        },
        {
          term: { sv: 'Väntar på godkännande', en: 'Pending approval' },
          def:  { sv: 'Kontot är kopplat, men Google behöver godkänna åtkomsten till företagsprofilen. Det tar oftast 2–5 vardagar och sker av sig självt.', en: 'The account is connected, but Google needs to approve access to the Business Profile. It usually takes 2–5 business days and happens on its own.' },
        },
        {
          term: { sv: 'Behöver sättas upp', en: 'Setup needed' },
          def:  { sv: 'Källan hittades inte på ditt Google-konto. Under raden står exakt vad som behöver göras — ofta att skapa eller verifiera något hos Google och sedan koppla om.', en: 'The source was not found on your Google account. The note under the row says exactly what to do — often creating or verifying something at Google and then reconnecting.' },
        },
        {
          term: { sv: 'Koppla om Google', en: 'Reconnect Google' },
          def:  { sv: 'Gör om inloggningen. Använd den när du lagt till en ny källa hos Google, till exempel ett nytt Analytics-konto, så att den plockas upp här.', en: 'Runs the sign-in again. Use it when you have added a new source at Google, for example a new Analytics account, so it gets picked up here.' },
        },
      ],
    },
    {
      id: 'synkning',
      heading: { sv: 'Synkning — så hålls datan färsk', en: 'Syncing — how your data stays fresh' },
      body: [
        {
          sv: 'Din data hämtas automatiskt med jämna mellanrum. Längst ner på sidan ser du när den senast hämtades.',
          en: 'Your data is fetched automatically at regular intervals. At the bottom of the page you can see when it was last fetched.',
        },
        {
          sv: 'Vill du inte vänta — till exempel efter att en ny recension kommit in — klickar du på "Synka nu" så hämtas allt direkt.',
          en: 'Do not want to wait — for example after a new review has come in? Click "Sync now" and everything is fetched right away.',
        },
      ],
      terms: [
        {
          term: { sv: 'Synka nu', en: 'Sync now' },
          def:  { sv: 'Hämtar din senaste data från Google direkt, i stället för att vänta på nästa automatiska hämtning.', en: 'Fetches your latest data from Google right away, instead of waiting for the next automatic sync.' },
        },
        {
          term: { sv: 'Senast synkad', en: 'Last synced' },
          def:  { sv: 'Tidpunkten när din data senast hämtades. Siffrorna i översikten är från den hämtningen.', en: 'The time your data was last fetched. The numbers in the dashboard come from that fetch.' },
        },
      ],
    },
  ],
}
