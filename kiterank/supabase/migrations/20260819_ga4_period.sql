-- One snapshot row per window.
--
-- The dashboard's selector offers a week, a month and a year, but the sync only
-- ever fetched thirty days — the other two views were that figure divided or
-- multiplied in the browser. A salon picking "week" saw a month over 4.3, not
-- their week. Each window is now its own row, fetched from Google in its own
-- right, and the page reads whichever one is selected.
--
-- Existing rows are the monthly window, which is what they always were.
alter table ga4_snapshots add column if not exists period text not null default 'Monthly'
  check (period in ('Weekly', 'Monthly', 'Yearly'));

create index if not exists ga4_snapshots_company_period_idx
  on ga4_snapshots (company_id, period, synced_at desc);
