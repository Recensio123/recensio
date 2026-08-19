-- The rest of the page, measured per window.
--
-- Device, age, gender, times of day and the page list were read by the tabs
-- but never fetched: a connected account was shown the example figures for all
-- five. They are now part of every snapshot, alongside the counts, so each
-- window carries the whole picture rather than a third of it.
alter table ga4_snapshots add column if not exists device_mobile   int;
alter table ga4_snapshots add column if not exists device_desktop  int;
alter table ga4_snapshots add column if not exists device_tablet   int;
alter table ga4_snapshots add column if not exists demo_age        jsonb;
alter table ga4_snapshots add column if not exists demo_gender     jsonb;
alter table ga4_snapshots add column if not exists traffic_by_hour jsonb;
alter table ga4_snapshots add column if not exists traffic_by_day  jsonb;
alter table ga4_snapshots add column if not exists pages           jsonb;
