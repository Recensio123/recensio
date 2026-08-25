-- En inställning per meddelande och kanal, i stället för en delad.
--
-- Mallen hade ett fält för kanal med tre värden: mail, SMS eller båda. "Båda"
-- var problemet. Ett SMS ryms i 160 tecken och skrivs därefter; ett mail får
-- vara ett mail. Samma text i båda blev antingen ett stympat mail eller ett
-- SMS i tre delar — och det gick inte att slå på påminnelsen som mail utan att
-- slå på den som SMS också, trots att det ena är gratis och det andra kostar
-- per utskick.
--
-- Nu är rad och kanal samma sak. Varje meddelande finns i två versioner med
-- var sin text, sitt på/av och sin tidpunkt. Salongen kan skicka bekräftelsen
-- som mail och påminnelsen som SMS utan att det ena hänger på det andra.

-- Nyckeln blir tredelad. Den gamla släpper först, annars kan raden inte finnas
-- i två versioner.
alter table message_templates
  drop constraint if exists message_templates_company_id_kind_key;

-- 'both' finns inte längre. Raderna som hade det delas nedan, och därefter
-- tillåter kontrollen bara de två riktiga kanalerna.
update message_templates set channel = 'email' where channel not in ('email', 'sms', 'both');

-- En kopia för SMS av allt som stod på "båda". Texten följer med som
-- utgångspunkt — salongen kortar den själv, och tills de gör det är det samma
-- besked som förut.
insert into message_templates (company_id, kind, body, channel, enabled, lead_value, lead_unit)
select company_id, kind, body, 'sms', enabled, lead_value, lead_unit
  from message_templates
 where channel = 'both'
on conflict do nothing;

update message_templates set channel = 'email' where channel = 'both';

alter table message_templates
  drop constraint if exists message_templates_channel_check;
alter table message_templates
  add constraint message_templates_channel_check check (channel in ('email', 'sms'));

alter table message_templates
  add constraint message_templates_company_kind_channel_key
  unique (company_id, kind, channel);

-- Stämpeln som håller utskicken från att gå om och om igen måste också vara per
-- kanal. Med en gemensam skulle påminnelsen som mail dagen före hindra SMS:et
-- två timmar före: jobbet hade sett en avklarad rad och hoppat över den.
alter table bookings add column if not exists reminder_sms_sent_at timestamptz;
alter table bookings add column if not exists review_sms_sent_at   timestamptz;

comment on column bookings.reminder_sms_sent_at is
  'När påminnelsen gick som SMS. Mailets tidpunkt står i reminder_sent_at — kanalerna har var sin tid och stämplas var för sig.';
comment on column bookings.review_sms_sent_at is
  'När recensionsförfrågan gick som SMS. Mailets tidpunkt står i review_sent_at.';

comment on column message_templates.channel is
  'email eller sms. Raden ÄR kanalen: samma meddelande finns i två versioner med var sin text, sitt på/av och sin tidpunkt.';
