-- Kunddokumenten och mallarna de skrivs ur.
--
-- Två tabeller med olika livslängd. Mallen är arbetssättet och ändras när
-- metoden förbättras; dokumentet är en leverans till en namngiven kund en
-- given månad och ska aldrig ändras i efterhand utan att det syns.
--
-- Mallarna ligger i databasen och inte i koden av samma skäl som avtalen: en
-- förbättring av metoden ska slå igenom på nästa dokument för varje kund utan
-- att något behöver byggas om. Adminsidan lägger in standardtexterna första
-- gången den öppnas.

create table if not exists dokumentmallar (
  slug        text primary key,
  titel       text not null,
  beskrivning text,
  innehall    text not null default '',
  version     text,
  uppdaterad  timestamptz not null default now()
);

alter table dokumentmallar enable row level security;
grant select, insert, update, delete on public.dokumentmallar to service_role;

-- Ett dokument per kund och period.
--
-- `innehall` är den färdiga texten, redigerad av dig innan den går ut.
-- `underlag` är kundens siffror så som de såg ut när dokumentet skapades —
-- sparas därför att en rapport som inte går att belägga i efterhand är värdelös
-- den dagen någon ifrågasätter en siffra.
create table if not exists kunddokument (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  mall        text not null,
  titel       text not null,
  period      text,
  innehall    text not null default '',
  underlag    jsonb,
  -- utkast → skickad → godkand. Ett dokument som aldrig lämnat admin ska inte
  -- gå att förväxla med ett kunden sett.
  status      text not null default 'utkast',
  skapad      timestamptz not null default now(),
  uppdaterad  timestamptz not null default now(),
  skickad_at  timestamptz,
  godkand_at  timestamptz,
  godkand_av  text
);

create index if not exists kunddokument_foretag
  on kunddokument (company_id, skapad desc);

alter table kunddokument enable row level security;
grant select, insert, update, delete on public.kunddokument to service_role;
