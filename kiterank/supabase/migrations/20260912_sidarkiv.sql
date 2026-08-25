-- Arkivet över byggda sidor.
--
-- En kopia av hur en kunds sajt såg ut vid en given tidpunkt: mall, språk,
-- funktioner och allt innehåll. Finns av två skäl.
--
-- Det första är att formgivning är arbete som utförts en gång och aldrig ska
-- behöva göras om. En kund som gick ned till mallpaketet, ändrade sig, eller
-- råkade förstöra sin sida ska kunna få tillbaka den — inte höra att den är
-- borta.
--
-- Det andra är att en nedgradering annars vore irreversibel. Med arkivet kan
-- den formgivna sidan tas bort utan att den försvinner.
--
-- Kopian och inte en referens: hela poängen är att den ska överleva att
-- originalet ändras eller raderas.

create table if not exists site_arkiv (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  etikett     text,
  anledning   text,
  template    text,
  language    text,
  features    jsonb,
  content     jsonb,
  skapad      timestamptz not null default now()
);

create index if not exists site_arkiv_foretag
  on site_arkiv (company_id, skapad desc);

-- Bara servicerollen, alltså adminsidan. Arkivet är ditt.
alter table site_arkiv enable row level security;
grant select, insert, update, delete on public.site_arkiv to service_role;
