-- Minne åt Search Console.
--
-- search_console_queries är en ögonblicksbild: varje natt raderas allt och
-- ersätts av de senaste 28 dygnen. Det räcker för sökordslistan och för
-- ingenting annat. Trendgrafen i panelen har därför aldrig kunnat rita något
-- mätt — den ritar exempelsiffror även på skarpa konton, och "mot förra
-- månaden" räknas mot ett hårdkodat tal.
--
-- Två tabeller i stället för en, för att frågorna är olika stora:
--
--   dagsraden   ett tal per dygn och salong. Det trendgrafen behöver. 365
--               rader per kund och år — ingenting.
--   sökorden    de 28 senaste dygnen per sökord. Det listan behöver. Att
--               spara den per dag också vore 500 × 365 rader per kund om året
--               för en fråga ingen ställer.
--
-- Search Console kan lämna båda: samma anrop med dimensionen 'date' i stället
-- för 'query'. Så det kostar ett anrop till per kund och dygn.
--
-- Unik nyckel på båda, och upsert i stället för radera-och-skriv. Tre saker
-- följer av det:
--
--   Synken går att köra om. Kör den två gånger blir svaret detsamma.
--   En missad natt lagas av sig själv — nästa körning hämtar 28 dygn bakåt och
--   fyller hålet.
--   Dubbletter blir omöjliga i databasen, inte bara osannolika i koden.
--
-- Det sista är skillnaden mot idag, där det enda som hindrar dubbletter är att
-- en delete råkar köras före sin insert. Utan transaktion runt sig: failar
-- insert står kunden utan sökord till nästa dygn.

begin;

-- ── Dygn för dygn ───────────────────────────────────────────────────────────

create table if not exists search_console_daily (
  company_id  uuid    not null references companies(id) on delete cascade,
  -- Dagen Google räknar på, inte dagen vi hämtade.
  date        date    not null,
  clicks      integer not null default 0,
  impressions integer not null default 0,
  -- Genomsnittsposition den dagen, viktad av Google. Null när ingenting visats.
  position    numeric(5,1),
  synced_at   timestamptz not null default now(),
  primary key (company_id, date)
);

create index if not exists search_console_daily_datum
  on search_console_daily(company_id, date desc);

alter table search_console_daily enable row level security;

drop policy if exists "egen sökhistorik" on search_console_daily;
create policy "egen sökhistorik" on search_console_daily
  for all using (company_id in (select public.mina_foretag()));

revoke all on public.search_console_daily from anon;

-- ── Sökorden: unik nyckel så dubbletter blir omöjliga ───────────────────────

-- Fanns det redan dubbletter går indexet inte att skapa. Rensa dem först: den
-- färskaste raden per sökord vinner, resten är rester från en synk som avbröts.
delete from search_console_queries a
using search_console_queries b
where a.company_id = b.company_id
  and a.query      = b.query
  and a.ctid       < b.ctid;

create unique index if not exists search_console_queries_key
  on search_console_queries(company_id, query);

-- Grundschemat gav anon full rätt till tabellen. Policyn hindrar läsning, men
-- rättigheten har inget där att göra.
revoke all on public.search_console_queries from anon;

commit;
