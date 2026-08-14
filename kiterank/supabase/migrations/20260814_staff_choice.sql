-- Did the customer ask for this person, or did the system pick one?
--
-- The booking flow assigns a free chair the moment someone books "ingen
-- preferens", because a customer should leave with a name. But the salon
-- needs to know which of those names were its own choice: those are the
-- bookings it can move to another chair without breaking a promise.
alter table bookings add column if not exists staff_requested boolean not null default false;
