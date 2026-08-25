-- Vad som faktiskt gick ut, och när.
--
-- Fanns inte förut. Stämplarna på bokningen — confirmation_sent_at och de
-- andra — svarar på "har den här kunden fått sitt meddelande", vilket är en
-- annan fråga än "hur många SMS skickade vi i augusti". Den andra går inte att
-- räkna fram ur den första: stämpeln säger inte vilken kanal som användes, och
-- en salong som bytt från mejl till SMS i mars hade fått hela året räknat som
-- SMS.
--
-- Det spelar roll för att SMS kostar pengar per segment medan mejl inte gör
-- det. En räknare som gissar är värre än ingen räknare, för den ligger till
-- grund för vad salongen tror att tjänsten kostar dem.
--
-- Inga personuppgifter. Raden säger att ett meddelande av ett visst slag gick
-- ut på en viss kanal en viss dag — inte till vem. Bokningsid finns med för att
-- kunna felsöka ett enskilt utskick, och försvinner med bokningen.

create table if not exists message_events (
  id         uuid        primary key default gen_random_uuid(),
  company_id uuid        not null references companies(id) on delete cascade,
  booking_id uuid        references bookings(id) on delete set null,
  -- confirmation | cancellation | reminder | review
  kind       text        not null,
  -- sms | email
  channel    text        not null,
  -- Antal SMS-segment. 160 tecken är ett, längre delas upp och kostar per del.
  -- Noll för mejl, som inte styckas.
  segments   integer     not null default 0,
  sent_at    timestamptz not null default now()
);

-- Frågan är alltid "den här salongen, den här perioden".
create index if not exists message_events_company_idx
  on message_events (company_id, sent_at desc);

alter table message_events enable row level security;
