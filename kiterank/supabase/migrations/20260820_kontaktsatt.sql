-- Hur salongen håller kontakt med sina kunder.
--
-- Ett beslut på salongen och inte ett val per meddelande. Det avgör två saker
-- som måste hänga ihop: vilka mallar salongen fyller i, och vad kunden måste
-- fylla i när de bokar. Skickar salongen SMS är numret obligatoriskt; skickar
-- de mail är adressen det. Utan den kopplingen skickas bekräftelser till fält
-- kunden aldrig ombads fylla i — och salongen ser ett utskick i loggen som
-- kunden aldrig fick.
--
-- Mail som utgångspunkt: det kostar ingenting per utskick och varje kund har en
-- adress. SMS väljs till.

alter table companies
  add column if not exists contact_channels text[] not null default array['email']::text[];

comment on column companies.contact_channels is
  'email, sms eller båda. Styr vilka mallar som används och vilka fält som är obligatoriska i bokningsformuläret. Minst en kanal gäller alltid.';

-- Bara riktiga kanaler, och aldrig en tom lista: en salong utan kontaktväg kan
-- ta emot bokningar men aldrig bekräfta dem.
alter table companies
  drop constraint if exists companies_contact_channels_check;
alter table companies
  add constraint companies_contact_channels_check
  check (
    array_length(contact_channels, 1) >= 1
    and contact_channels <@ array['email', 'sms']::text[]
  );
