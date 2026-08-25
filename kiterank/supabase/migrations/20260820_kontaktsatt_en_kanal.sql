-- En kanal per salong, inte en lista.
--
-- Kanalen är inte en stilfråga utan en följd av vad salongen frågar efter när
-- kunden bokar: SMS kräver numret, mail kräver adressen. Med flera kanaler
-- samtidigt hade formuläret behövt kräva båda uppgifterna för säkerhets skull —
-- fler fält, fler avhopp, och kunder som lämnar en mejladress de aldrig läser
-- bara för att komma vidare.
--
-- Alla meddelanden går därför i samma format, och salongen skriver sina texter
-- en gång. Raderna i message_templates ligger kvar per kanal, så en salong som
-- prövar SMS och går tillbaka får sina gamla mailtexter tillbaka i stället för
-- standardtexterna.

alter table companies
  add column if not exists contact_channel text not null default 'email';

-- Det tidigare listvärdet flyttas in. Hade någon båda gäller mail: det kostar
-- ingenting per utskick och når varje kund som lämnat en adress.
update companies
   set contact_channel = case
         when contact_channels = array['sms']::text[] then 'sms'
         else 'email'
       end
 where contact_channels is not null;

alter table companies
  drop constraint if exists companies_contact_channel_check;
alter table companies
  add constraint companies_contact_channel_check
  check (contact_channel in ('email', 'sms'));

comment on column companies.contact_channel is
  'email eller sms. Salongens enda kanal: alla meddelanden går i det formatet, och uppgiften den kräver är obligatorisk vid bokning.';

alter table companies
  drop constraint if exists companies_contact_channels_check;
alter table companies
  drop column if exists contact_channels;

-- Stämpeln blir en per meddelande igen. Med en kanal per salong hade en stämpel
-- per kanal betytt att ett byte skickade om påminnelsen till alla som redan
-- fått den — på den nya kanalen, och till en kostnad om den nya är SMS.
-- Kolumnerna lades till samma dag och hann aldrig skrivas till.
alter table bookings drop column if exists reminder_sms_sent_at;
alter table bookings drop column if exists review_sms_sent_at;
