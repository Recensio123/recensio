-- Avsändarnamnet kunden ser i sin inkorg.
--
-- Motsvarigheten till sms_sender, och den finns av samma skäl: avsändaren är
-- det enda kunden läser innan de bestämmer sig för att öppna. Skillnaden är att
-- mejlhuvudet inte har GSM:s tvångströja — "Salong Nordström & Co" står som den
-- stavas, med å, ä, ö, mellanslag och &.
--
-- Fyrtio tecken, samma gräns som företagsnamnet under Branding. Det är inte
-- ett tekniskt tak utan ett läsbarhetstak: inkorgen på en telefon visar runt
-- trettio innan den klipper, och ett namn som klipps mitt i säger mindre än ett
-- kortare som ryms. Att gränsen är densamma som brandingfältets betyder också
-- att namnet därifrån alltid får plats här.
--
-- Radbrytning och citattecken är förbjudna i sig: de bryter avsändarhuvudet och
-- är den väg man förfalskar en avsändare. Koden rensar dem redan, men en regel
-- som bara finns i koden gäller inte den som skriver rakt i databasen.
--
-- Null betyder att namnet hämtas från Branding som förut, och kontots
-- företagsnamn som sista utväg. Salongen som inte bryr sig ska inte behöva.

alter table companies
  add column if not exists email_sender text;

comment on column companies.email_sender is
  'Avsändarnamn i e-post, max 40 tecken. Null = hämtas från Branding, annars företagsnamnet.';

alter table companies
  drop constraint if exists companies_email_sender_check;
alter table companies
  add constraint companies_email_sender_check
  check (
    email_sender is null
    or (
      length(email_sender) between 1 and 40
      and email_sender !~ '["\r\n<>]'
      and btrim(email_sender) = email_sender
    )
  );
