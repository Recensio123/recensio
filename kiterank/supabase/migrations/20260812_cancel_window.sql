-- How close to the appointment a customer may still self-cancel, in hours.
-- 0 = anytime: a customer who cannot cancel often simply does not show up,
-- so the forgiving default is also the commercially sensible one.
alter table companies add column if not exists booking_cancel_hours int not null default 0;

-- The salon's own confirmation message, shown on the booking receipt today
-- and sent as the confirmation SMS/email once sendouts are connected.
-- NULL = the standard wording. Placeholders: {namn} {behandling} {datum}
-- {tid} {medarbetare} {salong}.
alter table companies add column if not exists booking_confirmation_text text;
