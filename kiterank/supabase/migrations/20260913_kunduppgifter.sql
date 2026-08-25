-- Kundens kontaktuppgifter på företagsraden, inte bara i hemsidans innehåll.
--
-- Registreringen frågar efter e-post och telefon och skrev in dem i sajtens
-- texter. Det gav en färdig kontaktsektion men ingen kunduppgift: de gick inte
-- att se i admin utan att gräva i en JSON-klump, de försvann om kunden
-- redigerade bort dem från sin sida, och salongen fick skriva in samma
-- telefonnummer en gång till under Meddelanden.
--
-- Telefonen hade redan en kolumn — den fylldes bara aldrig av registreringen.
-- E-posten saknade en helt.

alter table companies
  add column if not exists contact_email text;

comment on column companies.contact_email is
  'Salongens kontaktadress, från registreringen. Inte inloggningsadressen — den bor hos inloggningstjänsten.';
comment on column companies.contact_phone is
  'Salongens telefonnummer. Används i utskick och som avsändaridentitet.';
