-- Numret kunden kan ringa när ett utskick inte går att svara på.
--
-- Hämtades tidigare ur hemsidans kontaktuppgifter, vilket är rätt utgångspunkt
-- men fel enda källa. En salong kan vilja att bokningsmeddelanden pekar på ett
-- annat nummer än hemsidans växel — en telefon som faktiskt är bemannad, eller
-- ett nummer de vill hålla utanför sökmotorerna.
--
-- Null betyder hemsidans nummer. Skriver salongen in något här gäller det, och
-- det fortsätter gälla även när de byter nummer på hemsidan. Ett val som tyst
-- skrivs över nästa gång man redigerar något annat är inget val.

alter table companies
  add column if not exists contact_phone text;

comment on column companies.contact_phone is
  'Telefonnumret i bokningsmeddelanden. Null = numret från hemsidans kontaktuppgifter.';
