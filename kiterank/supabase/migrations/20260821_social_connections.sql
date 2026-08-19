-- One row per connected social account.
--
-- Tokens are per platform and per salon, obtained through each platform's own
-- login: the customer approves on Instagram's or TikTok's page and we store
-- what they hand back. The app credentials behind the flow are ours and live
-- in the server environment, never here.
--
-- `stats_synced_at` is the ceiling on how fresh the numbers are; the platforms
-- report only the present, so history is ours to keep — see social_snapshots.
create table if not exists social_connections (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  platform        text not null check (platform in ('instagram', 'facebook', 'tiktok', 'pinterest')),
  account_name    text,
  account_id      text,
  access_token    text,
  refresh_token   text,
  -- TikTok's access token lasts a day and its refresh token a year; Meta's
  -- long-lived token lasts sixty days. A connection that passes this date is
  -- dead and the customer has to approve again.
  expires_at      timestamptz,
  stats_synced_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (company_id, platform)
);

-- What each platform reported at each sync.
--
-- None of them keep history: an API call answers with the likes a post has
-- right now. Growth only exists if we write down what we saw, which is the
-- same reason ga4_snapshots exists.
create table if not exists social_snapshots (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  platform     text not null,
  synced_at    timestamptz not null default now(),
  followers    int,
  posts_30d    int,
  likes_30d    int,
  comments_30d int,
  -- The individual posts behind the totals, newest first.
  posts        jsonb
);

create index if not exists social_snapshots_company_idx
  on social_snapshots (company_id, platform, synced_at desc);

alter table social_connections enable row level security;
alter table social_snapshots   enable row level security;

-- Postgres has no "create policy if not exists", so each one is dropped first.
-- That makes the file safe to run twice, which matters because these are run by
-- hand in the SQL editor.
drop policy if exists "own social connections" on social_connections;
create policy "own social connections" on social_connections
  for all using (company_id in (select id from companies where user_id = auth.uid()));

drop policy if exists "own social snapshots" on social_snapshots;
create policy "own social snapshots" on social_snapshots
  for select using (company_id in (select id from companies where user_id = auth.uid()));
