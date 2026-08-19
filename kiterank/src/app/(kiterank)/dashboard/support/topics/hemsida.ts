import { type SupportTopic } from '../types'

// Guide for the Hemsida page (analytics dashboard) — one section per
// under-tab, in the order the tabs appear. Section ids match the tab ids.
export const hemsida: SupportTopic = {
  id:    'hemsida',
  title: { sv: 'Hemsida', en: 'Website' },
  intro: {
    sv: 'Hemsida-sidan visar hur din hemsida presterar. Den svarar på fyra frågor: hur många besöker dig, varifrån kommer de, vilka sidor gör jobbet och mår sidan bra tekniskt? Varje flik har sin egen del i den här guiden.',
    en: 'The Website page shows how your website is performing. It answers four questions: how many people visit you, where do they come from, which pages do the work, and is the site technically healthy? Each tab has its own part in this guide.',
  },
  sections: [
    {
      id: 'overview',
      heading: { sv: 'Översikt', en: 'Overview' },
      body: [
        {
          sv: 'Korten högst upp visar de viktigaste siffrorna för perioden: besök, besökare, engagemang, besökstid och förfrågningar. Grön pil betyder uppåt jämfört med förra perioden, röd betyder nedåt. Med knapparna uppe till höger byter du period — vecka, månad eller år.',
          en: 'The cards at the top show the most important numbers for the period: visits, visitors, engagement, visit time and leads. A green arrow means up compared with the previous period, red means down. The buttons in the top right switch the period — week, month or year.',
        },
        {
          sv: 'En enskild vecka svänger alltid. Dra inga slutsatser av en röd pil en vecka — titta på månadsvyn för att se riktningen.',
          en: 'A single week always swings. Do not draw conclusions from one red arrow in one week — look at the monthly view to see the direction.',
        },
        {
          sv: 'Tratten visar besökarnas resa i tre steg: de kommer till sidan, de stannar och engagerar sig, och några kontaktar dig. Tappar du många i första steget lockar du fel besökare eller så möter sidan inte deras förväntan. Engagerar sig många men få hör av sig — gör det lättare att kontakta dig. Sätt telefonnummer och formulär högt upp på sidan.',
          en: 'The funnel shows your visitors’ journey in three steps: they arrive on the site, they stay and engage, and some contact you. If you lose many in the first step, you are attracting the wrong visitors or the page does not meet their expectations. If many engage but few get in touch — make it easier to contact you. Put your phone number and form high up on the page.',
        },
        {
          sv: 'Diagrammet Besök över tid visar lugna och hektiska perioder, och om något du gjort gav effekt. Du kan jämföra dig med liknande företag i området och dela upp besöken per enhet.',
          en: 'The Visits over time chart shows quiet and busy periods, and whether something you did made a difference. You can compare yourself with similar businesses in the area and split the visits by device.',
        },
      ],
      terms: [
        { term: { sv: 'Besök', en: 'Visits' }, def: { sv: 'Ett besök är en session på din hemsida. Samma person som kommer tillbaka tre gånger räknas som tre besök.', en: 'A visit is one session on your website. The same person coming back three times counts as three visits.' } },
        { term: { sv: 'Besökare', en: 'Visitors' }, def: { sv: 'Antalet enskilda personer, var och en räknad en gång. Alltid lägre än antalet besök.', en: 'The number of individual people, each counted once. Always lower than the number of visits.' } },
        { term: { sv: 'Stannade och engagerade sig', en: 'Stayed and engaged' }, def: { sv: 'Andelen besök där någon faktiskt läste eller klickade i stället för att lämna direkt. Ligger den under hälften fångar sidan inte besökarnas intresse — se över första skärmen de möter.', en: 'The share of visits where someone actually read or clicked instead of leaving right away. If it is below half, the page is not catching visitors’ interest — review the first screen they see.' } },
        { term: { sv: 'Snittbesök', en: 'Avg. visit' }, def: { sv: 'Hur länge besökarna i snitt stannar per besök. Längre tid betyder oftast att innehållet håller kvar dem.', en: 'How long visitors stay per visit on average. More time usually means the content is holding their attention.' } },
        { term: { sv: 'Förfrågningar från hemsidan', en: 'Leads from your website' }, def: { sv: 'Antalet gånger någon kontaktade dig via sidan — formulär, telefonklick eller bokning. Står det 0 kan det bero på att inga mål är inställda än.', en: 'The number of times someone contacted you through the site — a form, a phone click or a booking. If it says 0, it may be because no goals are set up yet.' } },
        { term: { sv: 'Besökartratten', en: 'The visitor funnel' }, def: { sv: 'De tre rutorna visar hur många som tog varje steg. Procenttalet mellan rutorna visar hur stor andel som gick vidare. Det minsta procenttalet visar var du tappar flest — börja förbättra där.', en: 'The three boxes show how many people took each step. The percentage between the boxes shows the share that moved on. The smallest percentage shows where you lose the most — start improving there.' } },
        { term: { sv: 'Störst förändring denna period', en: 'Biggest change this period' }, def: { sv: 'Kanalen som ökat eller minskat mest sedan förra perioden. Klicka på länken för att se alla kanaler under Trafik.', en: 'The channel that grew or dropped the most since the last period. Click the link to see all channels under Traffic.' } },
        { term: { sv: 'Jämför med', en: 'Compare vs.' }, def: { sv: 'Lägger till liknande företags besökskurvor i diagrammet. Så ser du om en nedgång gäller alla i branschen eller bara dig.', en: 'Adds similar businesses’ visit curves to the chart. That way you can see whether a dip affects everyone in the industry or just you.' } },
        { term: { sv: 'Totalt / Per enhet', en: 'Total / By device' }, def: { sv: 'Per enhet delar upp besöken mellan dator och mobil. De flesta besöker dig via mobilen — kolla att din sida funkar bra där.', en: 'By device splits the visits between desktop and mobile. Most people visit you on their phone — make sure your site works well there.' } },
      ],
    },
    {
      id: 'traffic',
      heading: { sv: 'Trafik', en: 'Traffic' },
      body: [
        {
          sv: 'Trafik svarar på var dina besökare kommer ifrån och vilka de är. Raden högst upp visar veckans största rörelser — kanaler som ökat eller minskat mest sedan förra veckan.',
          en: 'Traffic answers where your visitors come from and who they are. The row at the top shows the week’s biggest moves — channels that grew or dropped the most since last week.',
        },
        {
          sv: 'Kanaltabellen är flikens hjärta. Varje rad är en kanal, till exempel Google-sök, annonser eller sociala medier. Läs raden från vänster till höger: hur många kom, stannade de, och hörde någon av sig? Bedömningen längst till höger säger vad du ska göra med kanalen.',
          en: 'The channel table is the heart of the tab. Each row is a channel, for example Google search, ads or social media. Read the row from left to right: how many came, did they stay, and did anyone get in touch? The verdict on the far right tells you what to do with the channel.',
        },
        {
          sv: 'Tabellen Alla trafikkällor visar varje enskild webbplats som skickat besökare — inte bara kanalgrupperna. Här ser du om till exempel en recensionssajt eller katalog ger dig trafik.',
          en: 'The All traffic sources table shows every individual website that sent you visitors — not just the channel groups. Here you can see whether, for example, a review site or a directory is bringing you traffic.',
        },
        {
          sv: 'Längst ner ser du vilka besökarna är: vilka städer de finns i och vilka enheter de använder. Kommer besökarna från fel städer lockar dina sökord fel personer.',
          en: 'At the bottom you see who the visitors are: which cities they are in and which devices they use. If visitors come from the wrong cities, your keywords are attracting the wrong people.',
        },
      ],
      terms: [
        { term: { sv: 'Kanal', en: 'Channel' }, def: { sv: 'En grupp trafik med samma ursprung — Google-sök, annonser, sociala medier, andra webbplatser eller direkta besök.', en: 'A group of traffic with the same origin — Google search, ads, social media, other websites or direct visits.' } },
        { term: { sv: 'Satsa mer', en: 'Invest more' }, def: { sv: 'Kanalen växer och ger engagemang eller förfrågningar. Lägg mer tid eller pengar här — det funkar.', en: 'The channel is growing and bringing engagement or leads. Put more time or money here — it is working.' } },
        { term: { sv: 'Förbättra först', en: 'Improve first' }, def: { sv: 'Kanalen ger besök men något brister — kanske engagemanget eller förfrågningarna. Fixa det innan du satsar mer, annars slösar du på fler besökare som inte hör av sig.', en: 'The channel brings visits but something is off — maybe the engagement or the leads. Fix that before investing more, otherwise you are paying for more visitors who never get in touch.' } },
        { term: { sv: 'Undersök', en: 'Look into' }, def: { sv: 'Kanalen minskar utan att ge något tillbaka. Ta reda på varför innan du gör något — det kan vara fel besökare, fel budskap eller en sida som inte övertygar.', en: 'The channel is declining without giving anything back. Find out why before you act — it could be the wrong visitors, the wrong message, or a page that does not convince.' } },
        { term: { sv: 'Engagerade (kolumnen)', en: 'Engaged (the column)' }, def: { sv: 'Andelen besökare från kanalen som stannade och gjorde något. Grönt är bra. Rött betyder att besökarna lämnar direkt — kanalen skickar fel personer eller sidan möter inte deras förväntan.', en: 'The share of visitors from the channel who stayed and did something. Green is good. Red means visitors leave right away — the channel sends the wrong people or the page does not meet their expectations.' } },
        { term: { sv: 'Förfrågningar % / Bokningar %', en: 'Leads % / Booking %' }, def: { sv: 'Hur stor andel av kanalens besök som slutade i en kontakt eller bokning. Ett streck betyder inga än.', en: 'The share of the channel’s visits that ended in a contact or a booking. A dash means none yet.' } },
        { term: { sv: 'Förändring', en: 'Change' }, def: { sv: 'Hur kanalens besök ändrats mot förra perioden. En enstaka svängning är normal — reagera först när riktningen håller i sig.', en: 'How the channel’s visits changed compared with the previous period. A single swing is normal — react only when the direction holds.' } },
        { term: { sv: '(direct)', en: '(direct)' }, def: { sv: 'Besökare som skrev in din adress själva, använde ett bokmärke eller kom via en app. En del av detta är egentligen socialt som inte gick att spåra.', en: 'Visitors who typed in your address themselves, used a bookmark, or came via an app. Some of this is really social media traffic that could not be tracked.' } },
        { term: { sv: 'Ny', en: 'New' }, def: { sv: 'Källan skickade ingen trafik förra månaden. Värd att hålla ögonen på.', en: 'The source sent no traffic last month. Worth keeping an eye on.' } },
        { term: { sv: 'Enheter', en: 'Devices' }, def: { sv: 'Mobil, dator eller surfplatta. Är mobilen störst — vilket den nästan alltid är — ska du alltid granska din sida i mobilen först.', en: 'Phone, computer or tablet. If mobile is the biggest — and it almost always is — always review your site on a phone first.' } },
        { term: { sv: 'Ålder & kön', en: 'Age & gender' }, def: { sv: 'Bygger bara på ett urval av inloggade Google-användare. Använd det som en fingervisning, inte som exakta siffror.', en: 'Based only on a sample of signed-in Google users. Use it as a hint, not as exact numbers.' } },
      ],
    },
    {
      id: 'pages',
      heading: { sv: 'Dina sidor', en: 'Your pages' },
      body: [
        {
          sv: 'Den här fliken visar hur varje enskild sida på din hemsida presterar i Google. Korten högst upp sammanfattar: hur många sidor som följs, hur många som syns på sida 1 och hur ofta de visas och klickas.',
          en: 'This tab shows how each individual page on your website performs in Google. The cards at the top sum it up: how many pages are tracked, how many appear on page 1, and how often they are seen and clicked.',
        },
        {
          sv: 'Tabellen har en rad per sida. Sidor med en färgad flagga har något värt att agera på. Klicka på raden så får du en enkel förklaring med siffror och ett konkret förslag på vad du ska göra.',
          en: 'The table has one row per page. Pages with a coloured flag have something worth acting on. Click the row for a plain explanation with numbers and a concrete suggestion for what to do.',
        },
        {
          sv: 'Till höger ser du veckans rankförändringar och hur dina sidor fördelar sig i sökresultaten. Fler gröna än röda är rätt riktning.',
          en: 'On the right you see this week’s rank changes and how your pages are spread across the search results. More green than red is the right direction.',
        },
        {
          sv: 'Längst ner finns dina möjligheter: sidor som är nära en bättre placering, och sökningar där du helt saknar en sida. Det är ofta de enklaste vinsterna — börja där.',
          en: 'At the bottom are your opportunities: pages that are close to a better position, and searches where you have no page at all. These are often the easiest wins — start there.',
        },
      ],
      terms: [
        { term: { sv: 'Plats', en: 'Rank' }, def: { sv: 'Sidans genomsnittliga placering i Googles sökresultat. Plats 1–10 är sida 1 — där sker nästan alla klick. Pilen visar förändringen sedan förra veckan.', en: 'The page’s average position in Google’s search results. Positions 1–10 are page 1 — that is where almost all clicks happen. The arrow shows the change since last week.' } },
        { term: { sv: 'Visningar', en: 'Times seen' }, def: { sv: 'Hur många gånger sidan visades i Googles sökresultat denna månad — oavsett om någon klickade.', en: 'How many times the page appeared in Google’s search results this month — whether or not anyone clicked.' } },
        { term: { sv: 'Klickfrekvens', en: 'Click rate' }, def: { sv: 'Andelen av de som såg sidan i Google som klickade på den. Grönt är över det normala för placeringen, rött är under.', en: 'The share of people who saw the page in Google and clicked it. Green is above normal for the position, red is below.' } },
        { term: { sv: 'Setts men inte klickats', en: 'Seen but not clicked' }, def: { sv: 'Sidan syns i Google men får färre klick än normalt. Skriv om sidtiteln och beskrivningen så att de sticker ut — nämn tjänst, stad och det som skiljer dig från andra.', en: 'The page shows up in Google but gets fewer clicks than normal. Rewrite the page title and description so they stand out — mention your service, your city and what sets you apart.' } },
        { term: { sv: 'Tappar besökare', en: 'Losing visitors' }, def: { sv: 'Trafiken till sidan har sjunkit de senaste månaderna. Fräscha upp sidan — uppdatera priser, lägg till foton eller ett aktuellt exempel. Google gynnar sidor som hålls uppdaterade.', en: 'Traffic to the page has dropped over the last few months. Freshen the page up — update prices, add photos or a recent example. Google favours pages that are kept up to date.' } },
        { term: { sv: 'Hög efterfrågan', en: 'High demand' }, def: { sv: 'Många söker på ämnet men sidan är inte på sida 1 än. Din största outnyttjade sida — bygg ut den till det bästa svaret på sökningen.', en: 'Many people search for the topic but the page is not on page 1 yet. Your biggest untapped page — build it into the best answer for the search.' } },
        { term: { sv: 'Två sidor konkurrerar', en: 'Two pages competing' }, def: { sv: 'Två av dina sidor siktar på samma sökning och sänker varandra. Välj den starkaste som huvudsida och slå ihop eller rikta om de andra.', en: 'Two of your pages target the same search and drag each other down. Pick the strongest as the main page and merge or refocus the others.' } },
        { term: { sv: 'Rankförändringar denna vecka', en: 'Rank changes this week' }, def: { sv: 'Sidor som klättrat eller tappat i Google sedan förra veckan. Ett tapp på en viktig sida är värt att kolla direkt.', en: 'Pages that climbed or dropped in Google since last week. A drop on an important page is worth checking right away.' } },
        { term: { sv: 'Synlighet i sök', en: 'Search visibility' }, def: { sv: 'Hur dina sidor fördelar sig: topp 3, sida 1, sida 2 eller syns inte än. Målet över tid är att flytta staplarna uppåt.', en: 'How your pages are distributed: top 3, page 1, page 2 or not visible yet. Over time, the goal is to move the bars upwards.' } },
        { term: { sv: 'Förbättra dina placeringar', en: 'Improve your rankings' }, def: { sv: 'Sidor som är nära en bättre plats, med antal extra klick per månad om de når målet. Störst siffra först — börja högst upp i listan.', en: 'Pages that are close to a better position, with the extra clicks per month if they reach the goal. Biggest number first — start at the top of the list.' } },
        { term: { sv: 'Sidor värda att skapa', en: 'Pages worth creating' }, def: { sv: 'Sökningar många gör där du inte har en egen sida. En ny sida om ämnet kan fånga den trafiken.', en: 'Searches many people make where you have no page of your own. A new page on the topic can capture that traffic.' } },
      ],
    },
    {
      id: 'health',
      heading: { sv: 'Hälsa', en: 'Health' },
      body: [
        {
          sv: 'Hälsa är din tekniska besiktning. Den kollar sådant som är osynligt för besökare men som avgör hur väl Google kan visa din sida. Du behöver inte förstå tekniken — varje kontroll säger vad den betyder och hur du fixar den.',
          en: 'Health is your technical inspection. It checks things that are invisible to visitors but decide how well Google can show your site. You do not need to understand the technology — every check tells you what it means and how to fix it.',
        },
        {
          sv: 'Diagnosen högst upp är en livekoll av din startsida. Börja med de röda kryssen — det är riktiga fel. Gula utropstecken kan bli bättre men brinner inte. Under varje problem står Så fixar du det; mycket kan du göra själv, resten skickar du till din webbutvecklare.',
          en: 'The diagnosis at the top is a live check of your homepage. Start with the red crosses — those are real errors. Yellow exclamation marks could be better but are not urgent. Under each issue is How to fix; a lot you can do yourself, and the rest you send to your web developer.',
        },
        {
          sv: 'Hastighet visar hur snabb sidan är, betygsatt 0 till 100. Mobilpoängen är viktigast — Google utgår från mobilversionen när de rankar dig, och långsamma sidor tappar besökare innan de sett något. Under Tekniska detaljer finns mätvärdena bakom poängen. Du behöver inte kunna förkortningarna: gröna märken är bra, och är något rött visar du listan för din webbutvecklare.',
          en: 'Speed shows how fast the site is, scored 0 to 100. The mobile score matters most — Google ranks you based on the mobile version, and slow pages lose visitors before they have seen anything. Under Technical details are the measurements behind the score. You do not need to know the abbreviations: green badges are good, and if something is red you show the list to your web developer.',
        },
        {
          sv: 'Indexering visar hur många av dina sidor Google tagit med i sitt register. Bara indexerade sidor kan visas i sökresultaten. Fel här betyder att sidor är osynliga i Google helt i onödan.',
          en: 'Indexing shows how many of your pages Google has added to its register. Only indexed pages can appear in search results. Errors here mean pages are invisible in Google for no good reason.',
        },
      ],
      terms: [
        { term: { sv: 'Kontrollernas symboler', en: 'The check symbols' }, def: { sv: 'Grön bock: allt är bra. Gult utropstecken: funkar men kan förbättras. Rött kryss: ett fel som bör åtgärdas — följ texten under Så fixar du det.', en: 'Green tick: all good. Yellow exclamation mark: works but could be better. Red cross: an error that should be fixed — follow the text under How to fix.' } },
        { term: { sv: 'Hastighetspoängen', en: 'The speed score' }, def: { sv: '90 och uppåt är bra. 50–89 behöver förbättras. Under 50 kostar dig aktivt besökare. Mobilpoängen väger tyngst.', en: '90 and up is good. 50–89 needs improvement. Below 50 is actively costing you visitors. The mobile score carries the most weight.' } },
        { term: { sv: 'LCP', en: 'LCP' }, def: { sv: 'Hur snabbt sidans huvudinnehåll syns. Under 2,5 sekunder är bra. Det här är måttet besökarna märker mest.', en: 'How quickly the page’s main content appears. Under 2.5 seconds is good. This is the measure visitors notice most.' } },
        { term: { sv: 'INP', en: 'INP' }, def: { sv: 'Hur snabbt sidan reagerar när någon klickar. Under 200 millisekunder känns direkt.', en: 'How quickly the page responds when someone clicks. Under 200 milliseconds feels instant.' } },
        { term: { sv: 'CLS', en: 'CLS' }, def: { sv: 'Hur mycket innehållet hoppar runt medan sidan laddas. Lågt värde betyder att knappar inte flyttar sig när man ska klicka.', en: 'How much the content jumps around while the page loads. A low value means buttons do not move just as you are about to tap them.' } },
        { term: { sv: 'FCP och TTFB', en: 'FCP and TTFB' }, def: { sv: 'Hur snabbt något alls syns på skärmen, och hur snabbt din server svarar. Långsam server är oftast en fråga för ditt webbhotell.', en: 'How quickly anything at all appears on screen, and how quickly your server responds. A slow server is usually a question for your web host.' } },
        { term: { sv: 'Indexerade sidor', en: 'Pages indexed' }, def: { sv: 'Sidor Google tagit med i sitt sökregister. Bara dessa kan dyka upp när någon söker.', en: 'Pages Google has added to its search index. Only these can show up when someone searches.' } },
        { term: { sv: 'Indexeringsfel', en: 'Indexing errors' }, def: { sv: 'Sidor Google försökte besöka men inte kunde ta med — ofta borttagna sidor utan omdirigering. Dessa bör åtgärdas, annars förblir sidorna osynliga.', en: 'Pages Google tried to visit but could not include — often removed pages without a redirect. These should be fixed, otherwise the pages stay invisible.' } },
        { term: { sv: 'Exkluderade sidor', en: 'Excluded pages' }, def: { sv: 'Sidor Google hittade men valde bort, till exempel dubbletter eller interna söksidor. Oftast helt normalt — läs orsaken under varje sida innan du gör något.', en: 'Pages Google found but chose to skip, for example duplicates or internal search pages. Usually completely normal — read the reason under each page before doing anything.' } },
        { term: { sv: 'Mobilproblem', en: 'Mobile usability issues' }, def: { sv: 'Sidor som är svåra att använda i mobilen — för liten text eller länkar för tätt ihop. Det kan skada din rankning.', en: 'Pages that are hard to use on a phone — text too small or links too close together. That can hurt your ranking.' } },
      ],
    },
    {
      id: 'links',
      heading: { sv: 'Spårningslänkar', en: 'Tracking links' },
      body: [
        {
          sv: 'När du delar en vanlig länk i ett inlägg, mejl eller sms syns det oftast inte varifrån klicket kom. En spårningslänk är din vanliga adress med en liten etikett i slutet. Etiketten berättar för din statistik exakt var besökaren kom ifrån.',
          en: 'When you share a plain link in a post, email or text, you usually cannot see where the click came from. A tracking link is your normal address with a small tag at the end. The tag tells your analytics exactly where the visitor came from.',
        },
        {
          sv: 'Så gör du: välj ett snabbval för kanalen du ska dela på, skriv ett kampanjnamn och klicka på Generate link. Kopiera länken och använd den i stället för din vanliga adress. Länken ser lite längre ut men fungerar precis likadant för besökaren.',
          en: 'Here is how: pick a quick-start for the channel you are sharing on, type a campaign name and click Generate link. Copy the link and use it instead of your normal address. The link looks a bit longer but works exactly the same for the visitor.',
        },
        {
          sv: 'Listan Your active links visar hur varje länk presterat — besök och förfrågningar per länk. Så ser du svart på vitt vilka inlägg och utskick som faktiskt ger kunder, och vilka du kan sluta lägga tid på.',
          en: 'The Your active links list shows how each link has performed — visits and leads per link. That way you see in black and white which posts and mailings actually bring customers, and which ones you can stop spending time on.',
        },
      ],
      terms: [
        { term: { sv: 'Campaign source', en: 'Campaign source' }, def: { sv: 'Var du delar länken — till exempel instagram, facebook eller ditt nyhetsbrev. Snabbvalen fyller i detta åt dig.', en: 'Where you share the link — for example instagram, facebook or your newsletter. The quick-starts fill this in for you.' } },
        { term: { sv: 'Campaign medium', en: 'Campaign medium' }, def: { sv: 'Vilken typ av kanal det är — betald annons, vanligt inlägg, mejl eller sms. Styr hur besöken sorteras i din statistik.', en: 'What kind of channel it is — a paid ad, a regular post, email or text. Determines how the visits are sorted in your analytics.' } },
        { term: { sv: 'Campaign name', en: 'Campaign name' }, def: { sv: 'Ditt eget namn på insatsen, till exempel varkampanj. Använd samma namn på flera plattformar så kan du jämföra dem rakt av.', en: 'Your own name for the effort, for example varkampanj. Use the same name on several platforms and you can compare them directly.' } },
        { term: { sv: 'Shorten link', en: 'Shorten link' }, def: { sv: 'Gör en kort version av länken som är snyggare att dela. Den spårar precis lika bra som den långa.', en: 'Makes a short version of the link that is nicer to share. It tracks just as well as the long one.' } },
        { term: { sv: 'Sessions', en: 'Sessions' }, def: { sv: 'Antal besök som kommit via just den länken.', en: 'The number of visits that came through that specific link.' } },
        { term: { sv: 'Leads och Lead rate', en: 'Leads and Lead rate' }, def: { sv: 'Hur många förfrågningar länken gett, och hur stor andel av besöken som blev en förfrågan. Länkar med hög andel är värda att upprepa.', en: 'How many leads the link produced, and the share of visits that became a lead. Links with a high share are worth repeating.' } },
        { term: { sv: 'Google Ads', en: 'Google Ads' }, def: { sv: 'Behöver inga spårningslänkar — annonsklick spåras automatiskt. Tagga allt annat: inlägg, mejl, sms och QR-koder.', en: 'Does not need tracking links — ad clicks are tracked automatically. Tag everything else: posts, emails, texts and QR codes.' } },
      ],
    },
  ],
}
