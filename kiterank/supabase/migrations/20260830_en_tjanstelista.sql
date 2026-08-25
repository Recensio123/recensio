-- En lista för tjänster, inte två.
--
-- Fram tills nu fanns hemsidans prislista i site_config.content som text, och
-- bokningens tjänster i booking_services. De föddes identiska ur branschpaketet
-- vid registreringen och gled isär i samma stund kunden ändrade ett pris — för
-- prislistan gick att redigera, och booking_services skrevs på exakt ett ställe
-- i hela kodbasen: registreringen. Efter den fanns ingen väg för kunden att
-- ändra sina bokningsbara tjänster alls.
--
-- Följden: en salong som höjde klippningen till 750 på sin hemsida hade kvar
-- 650 i bokningen. Kunden bokade för 650, kom till stolen och blev ombedd att
-- betala 750. Ingen av listorna sa ifrån.
--
-- Tabellen döps om i stället för att ersättas. Bokningarna pekar på den med en
-- nullbar FK, och varje bokning bär dessutom sin egen kopia av namn, tid och
-- pris — historiken rörs alltså inte av något här.
--
-- Namnet: services, inte booking_services. En kund utan bokningssystem har
-- också tjänster, och det är hela poängen med att det bara finns en lista.
--
-- Kräver funktionen mina_foretag() från 20260829_egna_konton.sql.

begin;

alter table if exists booking_services rename to services;

-- ── Priset som tal, aldrig som färdig sträng ────────────────────────────────
--
-- price_sek fanns redan som heltal. Det som saknades var golvet: en balayage
-- är "från 2 200 kr" eftersom den beror på hårlängd, och ett fast pris sätter
-- en förväntan salongen inte kan hålla. Prislistan klarade det för att den
-- sparade text; bokningen kunde inte.
alter table services rename column price_sek to pris_kr;
alter table services add column if not exists pris_fran boolean not null default false;
alter table services add column if not exists visa_pris boolean not null default true;

-- ── Tiden ───────────────────────────────────────────────────────────────────
alter table services rename column duration_minutes to minuter;
alter table services add column if not exists visa_tid boolean not null default true;

-- Städtiden ligger inte här utan på salongen, som booking_buffer_minutes.
-- Som ett fält per tjänst blev det tolv fält att fylla i med samma siffra och
-- elva chanser att glömma ett — den som vill ha en kvart mellan kunderna vill
-- ha det mellan alla kunder.

-- ── Kategori ────────────────────────────────────────────────────────────────
--
-- En textkolumn och inte en egen tabell. En salong har sex kategorier, inte en
-- taxonomi, och en tabell till hade betytt en join för varje prislista som
-- ritas.
alter table services add column if not exists kategori text not null default 'Tjänster';

-- ── Regler per tjänst ───────────────────────────────────────────────────────

-- Syns i prislistan men går inte att boka online. Vissa behandlingar kräver
-- konsultation först — löshår, stora färgförändringar — och att dölja dem helt
-- vore att dölja att salongen gör dem.
alter table services add column if not exists bokningsbar boolean not null default true;

-- En salong hinner två balayage om dagen, inte sex. Utan tak säljer kalendern
-- en dag som inte går att leverera.
alter table services add column if not exists max_per_dag int
  check (max_per_dag is null or max_per_dag > 0);

-- En behandling värd 2 500 kr förtjänar längre avbokningstid än en
-- herrklippning. Null = salongens vanliga regel gäller.
alter table services add column if not exists avbokning_timmar int
  check (avbokning_timmar is null or avbokning_timmar between 0 and 336);

-- "Kom med tvättat hår." Visas när kunden bokar.
alter table services add column if not exists forberedelse text not null default '';

alter table services rename column is_active   to aktiv;
alter table services rename column description to beskrivning;
alter table services rename column name        to namn;

create index if not exists services_foretag on services(company_id, sort_order);

-- ── Städtid mellan bokningar, på salongen ───────────────────────────────────
--
-- Noll = avstängd, vilket är hur det fungerat hittills och därför rätt
-- standard för varje befintlig salong.
alter table companies
  add column if not exists booking_buffer_minutes int not null default 0
  check (booking_buffer_minutes between 0 and 120);

comment on column companies.booking_buffer_minutes is
  'Städtid mellan bokningar i minuter. Spärras i kalendern, syns aldrig för kunden och ingår inte i priset. 0 = avstängd.';

-- ── Vem kan utföra vad ──────────────────────────────────────────────────────
--
-- Idag kan vilken stol som helst bokas för vad som helst. En salong med en
-- färgspecialist och två klippare får balayage bokad på någon som inte gör
-- balayage.
--
-- Tom lista för en tjänst betyder alla — inte ingen. Det gör att en salong som
-- aldrig rör inställningen beter sig exakt som den gör idag, vilket är det enda
-- rimliga svaret för alla befintliga kunder.
create table if not exists service_staff (
  service_id uuid not null references services(id) on delete cascade,
  staff_id   uuid not null references staff(id)    on delete cascade,
  primary key (service_id, staff_id)
);

create index if not exists service_staff_stol on service_staff(staff_id);

alter table service_staff enable row level security;

drop policy if exists "egna tjänstekopplingar" on service_staff;
create policy "egna tjänstekopplingar" on service_staff
  for all using (
    service_id in (select id from services where company_id in (select public.mina_foretag()))
  );

revoke all on public.service_staff from anon;

-- ── RLS på den omdöpta tabellen ─────────────────────────────────────────────
--
-- Policyn följde med namnbytet men pekade bara på ägaren. Samma rättelse som
-- gjordes för de andra tabellerna: salongens egna inloggningar hör också hit.
alter table services enable row level security;

drop policy if exists "company_owns_booking_services" on services;
drop policy if exists "public_read_booking_services"  on services;
drop policy if exists "egna tjänster"                 on services;
create policy "egna tjänster" on services
  for all using (company_id in (select public.mina_foretag()));

revoke all on public.services from anon;

-- ── De gamla prislistorna in i tabellen ─────────────────────────────────────
--
-- Priserna låg som text i site_config.content — "från 2 200 kr" — medan
-- tabellen vill ha ett tal och en flagga för om det är ett golv.
--
-- Det som är värt att veta om tolkningen: mellanrummet i 2 200 kan vara tre
-- olika tecken beroende på var texten kom ifrån. Vanligt blanksteg om det
-- skrevs i panelen, hårt blanksteg (U+00A0) om det klistrades in ur ett mejl,
-- smalt hårt (U+202F) om vi genererade det. Tas inte alla tre bort blir
-- "2 200 kr" till 2, och priset blir två kronor. translate() nedan plockar bort
-- alla tre innan siffran läses.
--
-- Rader utan tid får sextio minuter. En tjänst utan tid går inte att lägga i en
-- kalender, och noll hade gjort den bokningsbar på ett sätt som spräcker dagen.
-- Sextio är fel på ett sätt salongen upptäcker och rättar i redigeraren; noll
-- är fel på ett sätt som ser ut att fungera.
--
-- Salonger som redan har tjänster i tabellen rörs inte, så den här delen går
-- att köra om utan att skriva något två gånger.

insert into services (
  company_id, kategori, namn, beskrivning,
  pris_kr, pris_fran, visa_pris,
  minuter, visa_tid,
  bokningsbar, aktiv, sort_order
)
select
  rad.company_id, rad.kategori, rad.namn, rad.beskrivning,
  rad.pris_kr, rad.pris_fran, rad.visa_pris,
  rad.minuter, rad.visa_tid,
  true, true,
  row_number() over (partition by rad.company_id order by rad.kat_nr, rad.rad_nr) - 1
from (
  select
    sc.company_id,
    kat.ordinality  as kat_nr,
    item.ordinality as rad_nr,
    coalesce(nullif(btrim(kat.value ->> 'category'), ''), 'Tjänster') as kategori,
    btrim(item.value ->> 'name')                                     as namn,
    coalesce(btrim(item.value ->> 'desc'), '')                       as beskrivning,

    -- Siffran före kr, :- eller sek, med alla tre sorters mellanrum borttagna.
    -- Null betyder pris på förfrågan, vilket inte är samma sak som noll.
    (regexp_match(
      translate(coalesce(item.value ->> 'price', ''), ' ' || chr(160) || chr(8239), ''),
      '(\d+)(?:kr|:-|sek)', 'i'
    ))[1]::int                                                       as pris_kr,

    -- "från 2 200 kr" är ett golv och ska stanna ett golv.
    coalesce(item.value ->> 'price', '') ~* '\mfr[åa]n\M'            as pris_fran,

    coalesce((item.value ->> 'hidePrice')::boolean, false) is not true as visa_pris,

    -- "1 h 30 min" → 90. Timmar och minuter läses var för sig och läggs ihop.
    coalesce(nullif(
        coalesce((regexp_match(coalesce(item.value ->> 'duration', ''), '(\d+)\s*(?:h|tim)', 'i'))[1]::int, 0) * 60
      + coalesce((regexp_match(coalesce(item.value ->> 'duration', ''), '(\d+)\s*min',      'i'))[1]::int, 0),
      0), 60)                                                        as minuter,

    coalesce((item.value ->> 'hideDuration')::boolean, false) is not true as visa_tid

  from site_config sc
  cross join lateral jsonb_array_elements(
    case jsonb_typeof(sc.content -> 'menuCategories')
      when 'array' then sc.content -> 'menuCategories' else '[]'::jsonb end
  ) with ordinality as kat(value, ordinality)
  cross join lateral jsonb_array_elements(
    case jsonb_typeof(kat.value -> 'items')
      when 'array' then kat.value -> 'items' else '[]'::jsonb end
  ) with ordinality as item(value, ordinality)

  where not exists (select 1 from services s where s.company_id = sc.company_id)
) rad
where rad.namn is not null and rad.namn <> '';

commit;
