-- Two rules the salon sets once and any single chair may override.

-- How close to the appointment a customer may still book, in minutes.
-- 0 = right up to the start. An hour is the working default: enough to see
-- the booking and prepare, without pushing away the customer who wants a cut
-- today.
alter table companies add column if not exists booking_lead_minutes int not null default 60;

-- Does a free slot inside working hours confirm itself, or does the salon
-- confirm it first? Auto is the default — a customer who leaves the page
-- without a confirmed time is a customer who keeps looking.
alter table companies add column if not exists booking_auto_confirm boolean not null default true;

-- The same two rules per person. NULL means the salon's rule applies, which
-- is what almost every chair wants; the columns exist for the colourist who
-- needs a day's notice, or the owner who wants to see every request first.
alter table staff add column if not exists lead_minutes int;
alter table staff add column if not exists auto_confirm boolean;
