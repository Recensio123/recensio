-- Salongens meddelanden till kunden, i en tabell i stället för en kolumn var.
--
-- Bekräftelsen bor idag i companies.booking_confirmation_text. Det fungerade så
-- länge det fanns ett meddelande, men avbokningen är det andra och påminnelsen
-- och recensionsförfrågan är på väg — och en kolumn per meddelande betyder en
-- migration varje gång salongen ska kunna skriva om en till text.
--
-- Här är sorten en rad i stället. Nya meddelanden kräver ingen migration, och
-- alla texter kan läsas i ett anrop när panelen visar dem tillsammans.
--
-- Standardtexterna ligger i koden och inte här. En rad som saknas betyder
-- "salongen har inte skrivit något eget", och då används standarden — samma
-- tre-tillstånds-logik som sidans rubriker: osatt betyder standard, skriven
-- betyder egen, tom betyder medvetet ingen.

create table if not exists message_templates (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  -- 'confirmation' | 'cancellation' | 'reminder' | 'review'
  -- Avsiktligt utan check-villkor: en ny sort ska inte kräva en migration.
  -- Koden avgör vilka sorter som finns, och en okänd rad ignoreras.
  kind       text not null,
  body       text not null default '',
  updated_at timestamptz not null default now(),
  unique (company_id, kind)
);

create index if not exists message_templates_company_idx on message_templates (company_id);

alter table message_templates enable row level security;

drop policy if exists "own templates" on message_templates;
create policy "own templates" on message_templates
  for all using (company_id in (select id from companies where user_id = auth.uid()));

-- Supabase auto-grantar bara tabeller den skapat själv. Utan detta får även
-- servicenyckeln "permission denied for table" — samma lucka som bokningarna
-- och domänerna shippade med.
grant all on public.message_templates to anon, authenticated, service_role;

-- Bekräftelsetexter som redan är skrivna flyttas in, så ingen salong tappar
-- sin formulering. Kolumnen lämnas kvar orörd: koden läser den fortfarande som
-- reserv, och att radera den nu vore att kasta enda kopian om något går fel.
insert into message_templates (company_id, kind, body)
select id, 'confirmation', booking_confirmation_text
from companies
where booking_confirmation_text is not null
  and btrim(booking_confirmation_text) <> ''
on conflict (company_id, kind) do nothing;

-- När avbokningsbeskedet gick ut, så ett andra inte skickas om salongen
-- avbokar en tid som kunden redan avbokat.
alter table bookings
  add column if not exists cancellation_sent_at timestamptz;

comment on column bookings.cancellation_sent_at is
  'När avbokningsbeskedet skickades till kunden. Tom betyder att det inte gått ut.';
