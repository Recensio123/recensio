-- Egen kanal för påminnelsen och recensionsförfrågan.
--
-- Bekräftelsen och avbokningen följer salongens kontaktsätt och ska fortsätta
-- göra det: de är svar på något kunden just gjort, och de går i det format
-- kunden nyss lämnade sina uppgifter för.
--
-- De två tidsstyrda är en annan sak. En salong som mailar sina bekräftelser kan
-- mycket väl vilja att påminnelsen kommer som SMS — den ska läsas inom några
-- timmar, och ett mail dagen före kan ligga oläst. Omvänt vill en salong som
-- kör SMS ofta ha recensionsförfrågan som mail, där länken blir en knapp och
-- inte kostar per tecken.
--
-- Null betyder "samma som bekräftelsen". Det är inte samma sak som ett tomt
-- val: en salong som byter kontaktsätt ska få med sig de två utan att gå in och
-- ändra dem också, och det är bara null som kan uttrycka det.
--
-- Valet flyttar vad bokningsformuläret måste kräva. Går påminnelsen som SMS
-- måste numret vara obligatoriskt, annars är den påslagen för alla och når
-- ingen. Den uträkningen finns redan i koden och tar sitt svar härifrån.

alter table companies
  add column if not exists reminder_channel text,
  add column if not exists review_channel   text;

comment on column companies.reminder_channel is
  'email eller sms för påminnelsen. Null = följer contact_channel.';
comment on column companies.review_channel is
  'email eller sms för recensionsförfrågan. Null = följer contact_channel.';

alter table companies
  drop constraint if exists companies_reminder_channel_check;
alter table companies
  add constraint companies_reminder_channel_check
  check (reminder_channel is null or reminder_channel in ('email', 'sms'));

alter table companies
  drop constraint if exists companies_review_channel_check;
alter table companies
  add constraint companies_review_channel_check
  check (review_channel is null or review_channel in ('email', 'sms'));

-- De som redan har någon av dem påslagen har den som SMS, eftersom det var det
-- enda som fanns. Utan den här raden byter deras påminnelse kanal i tysthet i
-- samma stund migrationen körs — och en salong vars kunder slutar få SMS utan
-- att någon rört inställningen har inget sätt att förstå varför.
update companies c
   set reminder_channel = 'sms'
 where c.reminder_channel is null
   and exists (
     select 1 from message_templates t
      where t.company_id = c.id
        and t.kind    = 'reminder'
        and t.channel = 'sms'
        and t.enabled
   );

update companies c
   set review_channel = 'sms'
 where c.review_channel is null
   and exists (
     select 1 from message_templates t
      where t.company_id = c.id
        and t.kind    = 'review'
        and t.channel = 'sms'
        and t.enabled
   );
