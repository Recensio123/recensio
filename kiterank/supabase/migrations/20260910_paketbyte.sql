-- Paketbyten: nedgraderingar som köas, uppgraderingar som blir förfrågningar.
--
-- Riktningen avgör allt. Nedåt kostar oss ingenting och kan ske av sig självt
-- när kunden använt färdigt det de betalat för. Uppåt betyder arbete — en sida
-- ska formges, eller en plats i marknadsföringsarbetet ska finnas — och kan
-- därför inte vara en knapp som verkställer sig själv.

alter table companies
  add column if not exists plan_byte_till  text,
  add column if not exists plan_byte_datum timestamptz;

comment on column companies.plan_byte_till is
  'Paket kunden bytt ned till, verkställs vid periodens slut. Null = inget köat byte.';
comment on column companies.plan_byte_datum is
  'När det köade bytet träder i kraft.';

-- Uppgraderingsförfrågningar. En rad per fråga, inte en flagga på företaget:
-- en kund kan fråga, få nej, och fråga igen ett halvår senare — och båda
-- gångerna är värda att minnas.
create table if not exists paket_forfragan (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  fran_plan   text,
  till_plan   text not null,
  meddelande  text,
  skapad      timestamptz not null default now(),
  hanterad    timestamptz
);

create index if not exists paket_forfragan_oppna
  on paket_forfragan (company_id) where hanterad is null;

alter table paket_forfragan enable row level security;
grant select, insert, update, delete on public.paket_forfragan to service_role;
