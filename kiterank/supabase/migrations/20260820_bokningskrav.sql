-- Vilka uppgifter kunden måste lämna när de bokar.
--
-- Kanalvalet sätter golvet: skickar salongen bekräftelser som mail måste
-- adressen finnas, skickar de SMS måste numret göra det. Annars går utskicket
-- ingenstans, och salongen ser ett lyckat utskick i loggen som kunden aldrig
-- fick.
--
-- Den här kolumnen ligger ovanpå. Salongen får kräva mer än kanalvalet gör —
-- en salong som bara mailar men vill kunna ringa vid sena ändringar sätter
-- numret obligatoriskt ändå. Mindre än golvet går inte, och det avvisas i
-- koden snarare än här: skälet är ett annat val salongen gjort, och det ska
-- förklaras för dem och inte bara nekas.
--
-- Null betyder att kanalvalet får bestämma ensamt. Samma tre tillstånd som
-- övriga fält: osatt är standard, satt är salongens eget.

alter table companies
  add column if not exists booking_required_fields text[];

comment on column companies.booking_required_fields is
  'phone, email eller båda. Vad kunden måste fylla i vid bokning, utöver namnet. Null = kanalvalet i contact_channels bestämmer. Kan bara lägga till krav, aldrig ta bort det kanalvalet redan kräver.';

alter table companies
  drop constraint if exists companies_booking_required_fields_check;
alter table companies
  add constraint companies_booking_required_fields_check
  check (
    booking_required_fields is null
    or (
      array_length(booking_required_fields, 1) >= 1
      and booking_required_fields <@ array['phone', 'email']::text[]
    )
  );
