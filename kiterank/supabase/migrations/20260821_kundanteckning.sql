-- Salongens egen anteckning om en kund.
--
-- Skild från `bookings.customer_note`, som är vad kunden själv skrev när hon
-- bokade. De två får aldrig slås ihop: den ena är ett önskemål från kunden,
-- den andra är personalens minnesanteckning — färgformeln, att hon inte tål
-- doft, att förra gången blev för kort. Hamnar personalens rad i kundens fält
-- kan den läsas upp i ett utskick, och det är inte en bugg som går att ta
-- tillbaka.
--
-- Anteckningen hänger på personen och inte på bokningen. Salongen som skriver
-- "vill alltid ha kaffe" menar nästa gång också, och en anteckning som försvann
-- med besöket hade fått skrivas om varje gång.
--
-- Nyckeln är samma som kundhistoriken och gallringen räknar fram — telefon,
-- annars mejl, annars namn. Räknas den fram på ett annat sätt här hamnar
-- anteckningen på en kund som ingen hittar.

create table if not exists customer_notes (
  company_id   uuid        not null references companies(id) on delete cascade,
  customer_key text        not null,
  note         text        not null default '',
  updated_at   timestamptz not null default now(),
  -- Vem som skrev senast. En salong med fyra stolar vill kunna fråga.
  updated_by   text,
  primary key (company_id, customer_key)
);

comment on table customer_notes is
  'Personalens anteckning om en kund. Interna uppgifter — går aldrig ut i ett utskick. Gallras med kundens övriga personuppgifter.';

-- Läses per salong, alltid.
create index if not exists customer_notes_company_idx
  on customer_notes (company_id);

alter table customer_notes enable row level security;

-- Ingen väg in via klienten. Anteckningarna läses och skrivs av servern, som
-- kontrollerat vem som frågar — samma regel som bokningarna.
