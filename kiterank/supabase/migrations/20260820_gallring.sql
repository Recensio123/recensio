-- Gallring av kunduppgifter i bokningshistoriken.
--
-- Två saker med olika livslängd ligger i samma rad. Bokföringsunderlaget —
-- datum, behandling, belopp — ska sparas i sju år enligt bokföringslagen.
-- Personuppgifterna — namn, telefon, mejl, anteckning — får bara sparas så
-- länge de behövs, och en kund som inte varit på två år är inte längre en
-- kundrelation.
--
-- Därför avidentifieras raden i stället för att raderas: siffrorna står kvar
-- och stämmer med bokföringen, personen försvinner.
--
-- Stämpeln finns för två skäl. Den håller jobbet från att arbeta om samma
-- rader varje natt, och den är beviset på att gallringen faktiskt skett den
-- dag någon frågar.

alter table bookings
  add column if not exists anonymised_at timestamptz;

comment on column bookings.anonymised_at is
  'När kunduppgifterna gallrades. Raden behålls för bokföringen; namn, telefon, mejl och anteckning är då ersatta.';

-- Nattjobbet läser bara de rader som ännu inte gallrats.
create index if not exists bookings_anonymised_idx
  on bookings (company_id, anonymised_at)
  where anonymised_at is null;
