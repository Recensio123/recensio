-- Två regler kring besöket: när det stängs, och när påminnelsen uteblir.
--
-- Avslutet var tidigare ett val mellan automatik och handpåläggning. Valet var
-- fel ställt: ingen salong vill kryssa av gårdagens besök, och den som glömde
-- fick en lista som växte tills omdömesfrågorna slutade gå ut. Nu stängs varje
-- besök automatiskt, och det enda som återstår att bestämma är hur länge
-- systemet väntar först — marginalen för besöket som drar över.

alter table companies
  add column if not exists booking_auto_complete_hours int not null default 1
    check (booking_auto_complete_hours between 0 and 24),
  add column if not exists booking_reminder_skip_hours int not null default 4
    check (booking_reminder_skip_hours between 0 and 24);

-- Salonger som stod på manuellt avslut går över till automatik med samma
-- marginal som alla andra. Den gamla kolumnen läses inte längre men lämnas
-- kvar: en bortglömd miljö som fortfarande skriver till den ska inte krascha.
update companies set booking_auto_complete = true where booking_auto_complete is not true;

comment on column companies.booking_auto_complete_hours is
  'Timmar efter sluttid innan besöket stängs automatiskt. 0 = direkt.';
comment on column companies.booking_reminder_skip_hours is
  'Bokningar gjorda närmare tiden än så får ingen påminnelse. 0 = alltid påminnelse.';
