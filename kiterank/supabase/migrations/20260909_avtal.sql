-- Avtalstexterna, redigerbara i admin.
--
-- I databasen och inte i koden: ett avtal ändras av juridiska skäl, inte
-- tekniska, och ska inte kräva en deploy. Versionsfältet finns för att en
-- kund som frågar "vad skrev jag under" ska kunna få ett svar.
--
-- Tabellen är tom när den skapas. Adminsidan lägger in standardtexterna
-- första gången den öppnas — de är långa, och en avtalstext som ska klistras
-- genom en SQL-editor är en avtalstext som förr eller senare klistras fel.

create table if not exists avtal (
  slug        text primary key,
  titel       text not null,
  beskrivning text,
  innehall    text not null default '',
  version     text,
  uppdaterad  timestamptz not null default now()
);

-- Ingen policy: bara servicerollen kommer åt tabellen, alltså adminsidan.
-- Avtalen är dina, inte kundernas att läsa via API:t.
alter table avtal enable row level security;
