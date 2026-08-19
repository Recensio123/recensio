# Så byggs en mall

Kundsidorna delar ett regelverk. Allt som är **beteende** — vart en knapp
leder, vilken text som visas, vad som händer när ett fält är tomt — ligger på
ett ställe och gäller alla mallar. Det som är **utseende** — komposition,
färger, typsnitt, var bilden hamnar — är mallens egen sak.

Följden: en ändring i en regel slår igenom i alla fjorton mallarna på en gång,
och en ny mall får reglerna gratis genom att använda delarna nedan.

> Det här gäller **kundernas** sidor, inte ägarpanelen. Panelen
> (`dashboard/webbplats`) har sina egna regler och delar ingenting med det här.

---

## Delarna en mall ska använda

| Vad | Använd | Aldrig |
|---|---|---|
| Menyn | `<SiteNav layout="…" …/>` | egen `<nav>` |
| Sidfoten | `<Footer …/>` | egen `<footer>` |
| Boka-knappen | `<BookButton …/>` | egen `<a href={bookingUrl}>` |
| En text som kan vara tom | `<Txt t={…}/>` | `<p>{…}</p>` |
| Sidans egna ord | `siteLabel(labels, 'nyckel')` | en textsträng i koden |
| Branschens ord | `cfgLabel(labels, cfg.x, 'x')` | `cfg.x` rakt av |
| Ytan bakom | `backdropSrc` + `backdropStyle` | egen `backgroundImage` |
| Typsnittet | `siteFontVars(content, template.font)` | eget `fontFamily` |
| Namnet eller loggan i toppen | `<Wordmark content={…} base={base} …/>` | egen `<span>{businessName}</span>` |
| En undersida | `<SitePage site={site}>` | egen ram |

## Reglerna de bär

**Boka.** Varje knapp leder till `bookingUrl`. Publiceringen fyller fältet med
salongens egen bokningssida när kunden inte klistrat in en egen, så en
publicerad sida har alltid en adress. Har kunden tömt knappens text renders
ingen knapp — en knapp utan ord är ett fel, inte en avskalad design.

**Text.** Tre lägen, inte två: orörd ger vår standardtext, skriven ger kundens
egen, tömd ger ingenting alls — och då renders inte heller elementet, eftersom
en tom rubrik annars lämnar sin marginal kvar som ett hål.

**Bilder.** Varje mall har högst en egen bildplats. Vilken det är avgör
layouten; kunden ser ett enda fält i panelen oavsett mall, så inget flyttar sig
när hen provar en annan design.

**Var något ändras.** Det som gäller hela sajten skrivs i panelen, inte på
sidan. Sidfoten är märkt `data-panel-only`: ett klick där öppnar Kontakt &
öppettider i stället för en skrivruta, och etiketten säger det innan klicket.
Skälet är att inget i sidfoten hör till platsen det står på — namnet och
sloganen är samma som i toppen, telefonen och öppettiderna följer med varje
sida. En skrivruta där hade betytt två ställen att ändra samma text på.

Märk med `data-panel-only` när du bygger något som ser ut att gälla en plats
men i själva verket gäller överallt.

**Vägen hem.** Namnet i toppen leder till startsidan. Det är det första en
besökare provar när de vill tillbaka, och de har lärt sig det på varje sajt de
besökt innan din. Varje meny måste därför visa namnet — en meny som bara listar
undersidorna lämnar besökaren strandad på en av dem.

**Priserna.** Startsidan visar ett urval, aldrig hela listan, och mallens egen
tjänsteruta är det urvalet. Vart "se hela prislistan" leder räknas ut en gång i
`PreviewSite` och skickas in som `th` — räkna aldrig ut målet själv, då kan två
mallar svara olika på samma fråga. Visar mallen en tjänst extra stort får den
inte stå i listan under också.

**Hur många.** Fyra som standard. Bär din komposition ett annat antal — sex i
ett rutnät, tre i en smal spalt — skriv in layoutens namn i `PROMO_PLATSER`.
Det talet styr både sidan och panelen: stjärnornas tak, spärren när kunden
försöker lägga till en till, och raderna under "Detta visas på startsidan".
Skriv aldrig antalet i mallen; då säger panelen fyra medan sidan visar sex.

**Sidorna.** Startsidan och undersidorna bär samma meny, samma sidfot, samma
yta, samma typsnitt och samma mobilregler. Undersidorna får allt detta genom
`SitePage`.

**Indexering.** /s/-adressen är tillfällig och noindexas — regeln sitter i
kundsidornas rotlayout, inte i mallarna, så ingen mall kan råka ändra den.
När salongen kopplat sin egen domän slår indexeringen på där, och /s/-adressen
301:ar dit. Bygg aldrig något som antar att /s/ syns på Google.

## Regler för koden

**Bara React-komponenter i `PreviewSite.tsx`.** Filen är märkt `'use client'`,
och en serversida som importerar ett vanligt värde ur en klientfil får ett tomt
skal i stället för värdet — utan felmeddelande. Det har slagit till tre gånger:
exempelinnehållet, branschstandarderna på publicerade sidor och ytorna. Tabeller
och hjälpfunktioner hör hemma i `lib/`.

**Ingen bar textsträng i en mall.** Varje ord en besökare läser ska gå genom
`siteLabel` eller `cfgLabel`, annars går det inte att ändra och inte att
översätta.

## Att lägga till en mall

1. Lägg kortet i `onboarding/templates.tsx` med `layout`, färger och eventuellt
   `font` och `backdrop`.
2. Skriv layouten i `PreviewSite.tsx` som en `…Site`-funktion, sammansatt av
   `PageSections` och de delade sektionerna.
3. Menyn: antingen en av de befintliga i `SiteNav`, eller en ny som läggs till
   där. Skriv den aldrig direkt i layouten.
4. Har mallen en egen bildplats: lägg den i `templateImageSlots`.
5. Kontrollera i webbläsaren: startsidan plus en undersida. Undersidan ska bära
   samma meny, sidfot, yta och typsnitt utan att du gjort något för det.
