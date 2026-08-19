-- Kanal, tidpunkt och på/av per meddelande.
--
-- Mallarna hade bara en text. Nu ska salongen också bestämma HUR den går ut —
-- SMS, mail eller båda — och för påminnelsen och recensionsförfrågan även NÄR,
-- eftersom de inte hänger på en händelse utan på en klocka.
--
-- Allt hamnar på message_templates i stället för i en egen inställningstabell.
-- Kanalen och texten hör ihop: en text skriven för SMS är kortare än en skriven
-- för mail, och att lägga dem på skilda ställen är att bjuda in till att de
-- glider isär.
--
-- Tidkolumnerna är null för bekräftelse och avbokning. De skickas när något
-- händer, inte efter en tid, och en tidpunkt där vore en inställning utan
-- verkan.

alter table message_templates
  -- 'email' | 'sms' | 'both'
  add column if not exists channel text not null default 'email'
    check (channel in ('email', 'sms', 'both')),

  -- Påslaget eller inte. Bekräftelse och avbokning står på som standard —
  -- en kund som bokar ska få veta att det gick igenom. Påminnelse och
  -- recensionsförfrågan sätts av koden till av, eftersom de kostar pengar per
  -- SMS och salongen ska välja dem aktivt.
  add column if not exists enabled boolean not null default true,

  -- Hur långt före besöket (påminnelse) eller efter (recensionsförfrågan).
  add column if not exists lead_value integer,
  -- 'h' | 'd'
  add column if not exists lead_unit  text check (lead_unit in ('h', 'd'));

-- Vart recensionsförfrågan skickar kunden.
--
-- Utan en länk är förfrågan meningslös: "lämna gärna ett omdöme" utan att säga
-- var leder ingen vart. Länken kommer på sikt ur Google-kopplingen, men tills
-- den finns klistrar salongen in den själv — bättre än att funktionen står
-- oanvändbar i väntan på en integration.
alter table companies
  add column if not exists review_url text;

-- När påminnelsen och recensionsförfrågan gick ut, så de går ut en gång.
--
-- Cron-jobbet vaknar var timme och frågar vilka bokningar som är mogna. Utan en
-- stämpel skulle samma kund få samma påminnelse varje timme fram till besöket.
alter table bookings
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists review_sent_at   timestamptz;

comment on column bookings.reminder_sent_at is
  'När påminnelsen gick ut. Tom betyder att den inte gjort det — och att den får gå ut när tiden är mogen.';
comment on column bookings.review_sent_at is
  'När recensionsförfrågan gick ut. Samma regel som påminnelsen.';
