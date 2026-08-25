-- Prenumerationslänkar till salongens kalender.
--
-- En kalenderprenumeration kan inte logga in. Google, Outlook och iPhone hämtar
-- adressen som vilken webbadress som helst, utan cookie och utan möjlighet att
-- fråga efter ett lösenord. Hemligheten måste därför ligga i adressen själv, och
-- det ställer två krav:
--
--   Den ska vara omöjlig att gissa. 32 slumpade tecken, inte ett bokningsid.
--
--   Den ska gå att återkalla. En anställd som slutar har länken kvar i sin
--   telefon, och den enda vägen ur det är att byta ut den. Därför en egen rad
--   som kan bytas, och inte en kolumn på personalraden som annars hade
--   inneburit att byta något som pekar på personen.
--
-- En rad per kalender: salongens hela schema, eller en enskild stol.

create table if not exists calendar_feeds (
  token        text        primary key,
  company_id   uuid        not null references companies(id) on delete cascade,
  -- null betyder hela salongen.
  staff_id     uuid        references staff(id) on delete cascade,
  created_at   timestamptz not null default now(),
  -- När kalendern senast hämtade. Svaret på "har den slutat uppdatera?".
  last_read_at timestamptz
);

comment on table calendar_feeds is
  'Hemliga adresser för kalenderprenumeration (ICS). Adressen är hela behörigheten — den som har den ser bokningarna. Byts genom att raden ersätts.';

-- En kalender per stol, och en för salongen. Två index eftersom null inte
-- jämförs med null i ett vanligt unikt index: utan det andra hade salongen
-- kunnat få hur många hela-salongen-länkar som helst.
create unique index if not exists calendar_feeds_staff_idx
  on calendar_feeds (company_id, staff_id)
  where staff_id is not null;

create unique index if not exists calendar_feeds_salong_idx
  on calendar_feeds (company_id)
  where staff_id is null;

alter table calendar_feeds enable row level security;

-- Ingen väg in via klienten. Rutten som serverar kalendern slår upp adressen
-- med serverns nyckel och lämnar bara ut den kalender adressen pekar på.
