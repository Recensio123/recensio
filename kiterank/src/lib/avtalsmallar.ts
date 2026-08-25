/*
 * Standardtexterna för avtalen.
 *
 * Bor i koden som utgångsläge och i databasen som gällande version. Första
 * gången adminsidan öppnas kopieras de hit ned; därefter är det databasen som
 * gäller och den här filen rörs aldrig igen. Det ger två saker: en ny
 * installation har färdiga texter direkt, och en ändrad text kan aldrig
 * skrivas över av en deploy.
 *
 * Texterna är utkast. De täcker det ett personuppgiftsbiträdesavtal ska täcka
 * enligt artikel 28 GDPR, men de är skrivna av en utvecklare och inte av en
 * jurist — särskilt punkten om tredjelandsöverföring förtjänar ett par
 * ögonpar till innan den möter en kund.
 */

export type Avtalsmall = {
  slug:        string
  titel:       string
  beskrivning: string
  version:     string
  innehall:    string
}

const BITRÄDESAVTAL = `# Personuppgiftsbiträdesavtal

UTKAST — låt en jurist granska innan det används skarpt.

## 1. Parter

**Personuppgiftsansvarig** ("Kunden"): den salong eller det företag som tecknat abonnemang hos Kiterank.

**Personuppgiftsbiträde** ("Kiterank"): [FÖRETAGSNAMN], org.nr [ORGNR], [ADRESS].

## 2. Bakgrund

Kunden använder Kiterank för hemsida, marknadsföring och i förekommande fall bokningssystem. Inom ramen för tjänsten behandlar Kiterank personuppgifter för Kundens räkning. Det här avtalet reglerar den behandlingen enligt artikel 28 i dataskyddsförordningen (GDPR).

Avtalet gäller så länge Kunden har ett aktivt abonnemang, och därefter under den tid som anges i punkt 10.

## 3. Behandlingens art och ändamål

Kiterank behandlar personuppgifter enbart för att leverera tjänsten: publicera Kundens hemsida, ta emot och administrera bokningar, skicka bekräftelser, påminnelser och omdömesförfrågningar, samt visa statistik och underlag för Kundens marknadsföring.

Kiterank behandlar aldrig uppgifterna för egna ändamål, säljer dem inte vidare och använder dem inte för att träna modeller.

## 4. Kategorier av registrerade och uppgifter

**Registrerade:** Kundens slutkunder som bokar tid, samt Kundens egen personal som har inloggning.

**Uppgifter om slutkunder:** namn, telefonnummer, e-postadress, bokade tider, tjänst, pris, samt de anteckningar Kunden själv väljer att skriva.

**Uppgifter om personal:** namn, e-postadress, roll och arbetstider.

Kunden ska inte föra in känsliga personuppgifter enligt artikel 9 GDPR — exempelvis uppgifter om hälsa — i fritextfält. Tjänsten är inte byggd för det.

## 5. Instruktioner

Kiterank behandlar personuppgifter endast enligt Kundens dokumenterade instruktioner. Det här avtalet, tillsammans med Kundens inställningar i tjänsten, utgör de fullständiga instruktionerna.

Om Kiterank enligt lag måste behandla uppgifter på annat sätt informeras Kunden innan behandlingen, om inte lagen förbjuder det.

## 6. Sekretess

Kiterank säkerställer att var och en som får tillgång till personuppgifterna är bunden av sekretess och endast får tillgång till det som behövs för uppgiften.

## 7. Säkerhet

Kiterank vidtar lämpliga tekniska och organisatoriska åtgärder enligt artikel 32 GDPR, däribland:

- Krypterad överföring (TLS) och kryptering av lagrad data
- Åtkomstkontroll där varje konto endast når sin egen salongs uppgifter
- Lösenordskrav och separata behörighetsnivåer för ägare, schemaansvarig och personal
- Loggning av utskick och systemhändelser
- Regelbundna säkerhetskopior

## 8. Underbiträden

Kunden ger Kiterank ett allmänt förhandsgodkännande att anlita underbiträden. Följande anlitas i dag:

| Underbiträde | Ändamål | Var uppgifterna behandlas |
|---|---|---|
| Supabase | Databas och inloggning | EU |
| Vercel | Drift av applikationen | EU |
| 46elks | SMS-utskick | Sverige |
| Resend | E-postutskick | EU/USA |
| Anthropic | Textförslag och analysunderlag | USA |
| Google | Kundens egna kopplade konton (företagsprofil, sök, annonser, besöksstatistik) | EU/USA |

Stripe behandlar betalningsuppgifter som självständigt personuppgiftsansvarig för Kundens betalning, inte som underbiträde åt Kiterank.

Kiterank informerar Kunden innan ett nytt underbiträde anlitas eller byts ut. Kunden har rätt att invända; kan parterna inte enas har Kunden rätt att säga upp abonnemanget med omedelbar verkan.

## 9. Överföring till tredjeland

Sker behandling utanför EU/EES säkerställer Kiterank att överföringen vilar på en giltig grund, i första hand EU-kommissionens standardavtalsklausuler tillsammans med kompletterande skyddsåtgärder.

## 10. Radering och återlämnande

När abonnemanget upphör kan Kunden under trettio (30) dagar hämta sina uppgifter i maskinläsbart format.

Därefter raderar Kiterank uppgifterna, med undantag för det som måste sparas enligt lag — exempelvis underlag som omfattas av bokföringslagen.

## 11. Registrerades rättigheter

Kiterank bistår Kunden med att svara på begäran från registrerade om registerutdrag, rättelse, radering, begränsning, dataportabilitet eller invändning. Vänder sig en registrerad direkt till Kiterank hänvisas de till Kunden.

## 12. Personuppgiftsincident

Kiterank underrättar Kunden utan onödigt dröjsmål, och senast inom tjugofyra (24) timmar, efter att ha fått kännedom om en personuppgiftsincident, samt bistår Kunden med den information som behövs för anmälan till Integritetsskyddsmyndigheten.

## 13. Granskning

Kiterank ger Kunden den information som krävs för att visa att skyldigheterna enligt artikel 28 GDPR uppfylls, och möjliggör granskning som utförs av Kunden eller en oberoende granskare Kunden utsett. Granskning sker på Kundens bekostnad och efter skälig framförhållning.

## 14. Ansvar

Parternas ansvar följer av dataskyddsförordningen och av abonnemangsvillkoren mellan parterna.

## 15. Ändringar

Kiterank får ändra avtalet när lagstiftning eller tjänstens utformning kräver det. Väsentliga ändringar meddelas Kunden minst trettio (30) dagar i förväg.

---

Senast uppdaterad: [DATUM]
`

const ABONNEMANGSVILLKOR = `# Abonnemangsvillkor

UTKAST — låt en jurist granska innan det används skarpt.

## 1. Parter och omfattning

Villkoren gäller mellan [FÖRETAGSNAMN], org.nr [ORGNR], [ADRESS] ("Kiterank") och det företag som tecknar abonnemang ("Kunden").

Tjänsten säljs till näringsidkare. Konsumentköplagen och distansavtalslagens ångerrätt gäller därför inte.

Genom att skapa ett konto godkänner Kunden villkoren.

## 2. Tjänsten

Kiterank tillhandahåller en hemsida och en marknadsföringsplattform som abonnemang. Vilka delar som ingår framgår av det paket Kunden valt:

| Paket | Innehåll |
|---|---|
| Hemsida + marknadsföringsplattform | Hemsida byggd på en av Kiteranks färdiga designer, som Kunden själv anpassar, samt hela marknadsföringsplattformen |
| Designad hemsida + marknadsföringsplattform | Hemsida formgiven för Kunden, byggd och publicerad av Kiterank, samt plattformen och personlig uppstart |
| Full service | Allt i föregående paket, och Kiterank sköter dessutom marknadsföringen löpande |

**Bokningssystemet** är ett tillägg som kan kopplas på samtliga paket mot en särskild avgift.

Tjänsten utvecklas löpande. Kiterank får ändra och förbättra funktioner, men tar inte bort en väsentlig funktion Kunden betalar för utan att meddela det enligt punkt 15.

## 3. Prov

Nya kunder kan prova tjänsten i sju (7) dagar utan kostnad och utan att lämna kortuppgifter. Provet övergår inte automatiskt i ett abonnemang — Kunden väljer själv att teckna ett.

Vid provets slut låses plattformen tills ett abonnemang tecknas. Innehållet raderas inte omedelbart, utan enligt punkt 11.

## 4. Priser och moms

Gällande priser framgår av kiterank.se och av kassan när abonnemanget tecknas.

Priserna anges **inklusive moms**. Är Kunden momsregistrerad i ett annat EU-land än Sverige och anger sitt momsnummer i kassan hanteras momsen enligt reglerna för omvänd betalningsskyldighet.

## 5. Betalning

Betalning sker i förskott för varje period via Kiteranks betalleverantör Stripe. Kiterank hanterar inga kortuppgifter.

- **Månadsabonnemang** debiteras samma datum varje månad.
- **Årsabonnemang** debiteras en gång per år och motsvarar tio (10) månadsavgifter — två månader utan kostnad.
- **SMS** debiteras i efterskott med [SMS_PRIS] per skickat meddelande, på nästa ordinarie faktura. Inget minimibelopp och ingen startavgift.

Vid utebliven betalning påminns Kunden. Kvarstår betalningen får Kiterank stänga av tjänsten. Dröjsmålsränta utgår enligt räntelagen.

## 6. Byte av paket

**Uppgradering** — från mallpaketet till ett formgivet paket, eller från designpaketet till full service — sker på begäran. Kiterank bekräftar när arbetet kan påbörjas, eftersom uppgraderingen kräver formgivning och arbetstid som ska planeras in. Prisändringen gäller från den bekräftade starten.

**Nedgradering** sker vid innevarande periods slut. Kunden behåller det högre paketet perioden ut och betalar inget extra för det.

Kunden bör läsa punkt 8 innan nedgradering: en formgiven hemsida följer inte med ned till mallpaketet.

## 7. Avdrag när designen är betald

Kund med paketet Designad hemsida eller Full service får ett avdrag på [AVDRAG] i månaden efter tolv (12) betalda månader, eftersom formgivningen då är avbetald.

Avdraget gäller så länge Kunden har kvar ett formgivet paket. Avdraget gäller aldrig mallpaketet.

## 8. Rätt att ta med hemsidan

Kunden får ta med sin hemsida vid uppsägning under följande förutsättningar:

1. Kunden har eller har haft paketet Designad hemsida eller Full service, och
2. Kunden har betalat minst tolv (12) hela månader, och
3. Begäran görs inom trettio (30) dagar från att abonnemanget upphörde.

Kunden får då hemsidans utseende och innehåll utlämnat som färdiga filer att lägga upp hos valfri leverantör.

Rätten omfattar **inte** mallpaketet. De färdiga designerna är Kiteranks och licensieras endast så länge abonnemanget löper.

Rätten omfattar inte heller plattformen, bokningssystemet, mätningen eller den löpande driften — de är tjänster, inte filer.

Kund som går ned till mallpaketet innan de tolv månaderna passerat förlorar sin formgivna sida.

## 9. Kundens innehåll och ansvar

Kunden ansvarar för allt innehåll som läggs upp: texter, bilder, priser, tjänstebeskrivningar och uppgifter om personal.

Kunden garanterar att innehållet inte gör intrång i någon annans rättigheter och att Kunden har rätt att använda de bilder som laddas upp.

Kunden ansvarar för att uppgifter om priser, öppettider och tjänster stämmer.

Kiterank får ta bort innehåll som är olagligt eller uppenbart olämpligt, och underrättar Kunden om det.

## 10. Utskick, SMS och marknadsföring

Skickar Kunden bekräftelser, påminnelser, omdömesförfrågningar eller utskick via tjänsten ansvarar Kunden för att utskicken följer marknadsföringslagen och dataskyddsreglerna — däribland kravet på samtycke för marknadsföring.

Kiterank tillhandahåller verktyget. Kunden avgör vad som skickas och till vem.

## 11. Uppsägning

Abonnemanget löper utan bindningstid och kan sägas upp när som helst i plattformen.

Uppsägningen träder i kraft vid periodens slut. Kunden behåller tjänsten perioden ut. Redan betald avgift återbetalas inte.

När abonnemanget upphör:

- Hemsidan tas ur drift.
- Kunden kan under trettio (30) dagar hämta ut sina uppgifter — kundregister, bokningshistorik och innehåll — i maskinläsbart format.
- Därefter raderas uppgifterna, med undantag för det som ska sparas enligt bokföringslagen.

Rätten att få kundhistoriken utlämnad gäller alla paket och alla kunder, oavsett hur länge abonnemanget varat.

Kiterank får säga upp abonnemanget med trettio (30) dagars varsel, och med omedelbar verkan vid väsentligt avtalsbrott.

## 12. Domän

Kunden äger sin egen domän. Kiterank tar aldrig över ägandet av en kunddomän, varken vid uppstart eller vid uppsägning.

Registrerar Kiterank en domän åt Kunden sker det i Kundens namn. Har Kunden en e-postlåda kopplad till domänen följer den Kunden och säljs aldrig vidare.

## 13. Tillgänglighet och support

Kiterank arbetar för att tjänsten ska vara tillgänglig dygnet runt, men lämnar ingen garanterad tillgänglighetsnivå. Planerat underhåll förläggs så långt möjligt till tider med låg trafik.

Support ges på svenska via e-post och i plattformen. Paketen Designad hemsida och Full service har prioriterad support.

Avbrott som beror på Kundens egen utrustning, Kundens domän eller tredjepartstjänster utanför Kiteranks kontroll omfattas inte.

## 14. Ansvarsbegränsning

Kiterank ansvarar inte för indirekt skada, utebliven vinst, förlorad omsättning eller förlorad data utöver vad som följer av tvingande lag.

Kiteranks sammanlagda ansvar under en tolvmånadersperiod är begränsat till det belopp Kunden betalat under samma period.

Begränsningen gäller inte vid uppsåt eller grov vårdslöshet.

## 15. Ändring av villkor och priser

Kiterank får ändra villkoren och priserna. Väsentliga ändringar meddelas Kunden minst trettio (30) dagar i förväg via e-post eller i plattformen.

Accepterar Kunden inte ändringen får abonnemanget sägas upp till den dag ändringen träder i kraft.

## 16. Personuppgifter

Hur Kiterank behandlar personuppgifter beskrivs i integritetspolicyn.

Behandlar Kiterank uppgifter om Kundens egna kunder — exempelvis vid bokning — sker det som personuppgiftsbiträde enligt det personuppgiftsbiträdesavtal som ingår i abonnemanget.

## 17. Överlåtelse

Kunden får inte överlåta abonnemanget utan Kiteranks skriftliga godkännande.

Kiterank får överlåta avtalet i samband med överlåtelse av verksamheten, och meddelar Kunden i så fall i förväg.

## 18. Tillämplig lag och tvist

Svensk lag gäller. Tvist prövas av svensk allmän domstol med [DOMSTOL] som första instans.

---

Kontakt: [E-POST]

Senast uppdaterad: [DATUM]
`

const INTEGRITETSPOLICY = `# Integritetspolicy

UTKAST — låt en jurist granska innan det används skarpt.

## 1. Vem ansvarar för uppgifterna

**Personuppgiftsansvarig** för uppgifter om dig som besöker kiterank.se eller har ett konto hos oss:

[FÖRETAGSNAMN], org.nr [ORGNR], [ADRESS], [E-POST].

**När vi i stället är biträde:** använder du Kiterank för din salong är det du som ansvarar för uppgifterna om dina egna kunder — namn, telefonnummer och bokade tider. Vi behandlar dem för din räkning enligt det personuppgiftsbiträdesavtal som ingår i abonnemanget. Den här policyn handlar om det vi ansvarar för själva.

## 2. Vad vi behandlar och varför

| Uppgifter | Varför | Rättslig grund |
|---|---|---|
| Namn, företagsnamn, e-post, telefon | Skapa och sköta kontot, kunna nå dig | Fullgöra avtalet |
| Faktureringsuppgifter, momsnummer, betalningshistorik | Ta betalt, bokföra | Avtal och rättslig förpliktelse |
| Inloggningar, IP-adress, tekniska loggar | Säkerhet, felsökning, spärra missbruk | Berättigat intresse |
| Uppgifter i supportärenden | Hjälpa dig och kunna gå tillbaka till vad som sagts | Berättigat intresse |
| Uppgifter från dina kopplade Google-konton | Visa din statistik, dina annonser och din företagsprofil | Fullgöra avtalet, efter din koppling |
| Uppgifter du fyller i under registreringen | Bygga din hemsida och förstå vad du behöver | Fullgöra avtalet |

Vi säljer aldrig uppgifter vidare, och vi använder dem inte för att träna modeller.

## 3. Var uppgifterna behandlas

Vi anlitar följande leverantörer:

| Leverantör | Vad de gör | Var |
|---|---|---|
| Supabase | Databas och inloggning | EU |
| Vercel | Drift av applikationen | EU |
| Stripe | Betalningar och fakturering | EU/USA |
| Resend | E-postutskick | EU/USA |
| 46elks | SMS-utskick | Sverige |
| Anthropic | Textförslag och analysunderlag | USA |
| Google | Dina egna kopplade konton | EU/USA |

Sker behandling utanför EU/EES vilar överföringen på EU-kommissionens standardavtalsklausuler tillsammans med kompletterande skyddsåtgärder.

Stripe är självständigt personuppgiftsansvarig för betalningsuppgifter. Vi ser aldrig dina kortuppgifter.

## 4. Hur länge vi sparar

- **Kontouppgifter** — så länge du är kund, och därefter trettio (30) dagar medan du kan hämta ut dina uppgifter.
- **Bokförings- och faktureringsunderlag** — sju (7) år, enligt bokföringslagen.
- **Tekniska loggar** — högst tolv (12) månader.
- **Supportärenden** — högst tjugofyra (24) månader efter avslutat ärende.

Efter uppsägning raderas övriga uppgifter.

## 5. Kakor

Kiterank använder bara nödvändiga kakor: de som håller dig inloggad och de som skyddar inloggningen mot missbruk. Utan dem fungerar inte tjänsten, och därför krävs inget samtycke för dem.

Vi använder inga kakor för spårning, annonsering eller besöksmätning på kiterank.se.

## 6. Dina rättigheter

Du har rätt att begära registerutdrag, rättelse, radering, begränsning och dataportabilitet, samt att invända mot behandling som vilar på berättigat intresse.

Hör av dig till [E-POST], så svarar vi inom en månad.

Är du inte nöjd med hur vi hanterar dina uppgifter kan du klaga till Integritetsskyddsmyndigheten, imy.se.

## 7. Säkerhet

Uppgifterna överförs krypterat (TLS) och lagras krypterat. Varje konto når endast sin egen salongs uppgifter, och behörigheterna är uppdelade efter roll. Utskick och systemhändelser loggas, och säkerhetskopior tas regelbundet.

## 8. Ändringar

Ändras policyn publiceras den nya versionen här. Väsentliga ändringar meddelar vi via e-post eller i plattformen minst trettio (30) dagar i förväg.

---

Kontakt: [E-POST]

Senast uppdaterad: [DATUM]
`

export const AVTALSMALLAR: Avtalsmall[] = [
  {
    slug:        'personuppgiftsbitradesavtal',
    titel:       'Personuppgiftsbiträdesavtal',
    beskrivning: 'Reglerar hur Kiterank behandlar personuppgifter för kundens räkning. Krävs enligt GDPR när en salong låter oss hantera uppgifter om deras kunder.',
    version:     '1.0',
    innehall:    BITRÄDESAVTAL,
  },
  /*
   * De två publika dokumenten.
   *
   * Ligger i samma tabell som biträdesavtalet och redigeras på samma ställe,
   * men visas dessutom öppet på kiterank.se/villkor och /integritetspolicy.
   * Stripes kundportal kräver adresser till båda, och en kund som ska godkänna
   * villkor ska kunna läsa dem utan att först skapa ett konto.
   */
  {
    slug:        'abonnemangsvillkor',
    titel:       'Abonnemangsvillkor',
    beskrivning: 'Villkoren för abonnemanget: paket, priser, betalning, byten, uppsägning och rätten att ta med hemsidan. Visas publikt på /villkor.',
    version:     '1.0',
    innehall:    ABONNEMANGSVILLKOR,
  },
  {
    slug:        'integritetspolicy',
    titel:       'Integritetspolicy',
    beskrivning: 'Hur Kiterank behandlar uppgifter om kontoinnehavare och besökare, och vilka leverantörer som anlitas. Visas publikt på /integritetspolicy.',
    version:     '1.0',
    innehall:    INTEGRITETSPOLICY,
  },
]

/** Slugarna som har en egen publik sida. */
export const PUBLIKA_AVTAL = ['abonnemangsvillkor', 'integritetspolicy'] as const
