-- The salon's own address.
--
-- A site answers on kiterank.se/s/<slug> from the day it exists. When the
-- salon buys salongen.se and points it here, the row below is what tells us
-- which salon that request belongs to — and from then on the site is served in
-- the root of their own domain rather than under ours.
--
-- One salon may have several rows: salongen.se and www.salongen.se are two
-- names for the same place, and the .com is often bought alongside the .se.
-- `is_primary` decides which of them the canonical points at, so the others
-- redirect there rather than competing with it in the index.
create table if not exists custom_domains (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  -- Lower case, no protocol, no trailing slash — matched against the request's
  -- Host header exactly, so it has to be stored the way that header arrives.
  domain      text not null unique,
  -- Null until the DNS record has been seen pointing here. An unverified
  -- domain must never be served: it would let anyone claim a name.
  verified_at timestamptz,
  -- The one the canonical points at. Everything else redirects to it.
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists custom_domains_company_idx on custom_domains (company_id);

alter table custom_domains enable row level security;

-- Postgres has no "create policy if not exists", so each one is dropped first.
drop policy if exists "own domains" on custom_domains;
create policy "own domains" on custom_domains
  for all using (company_id in (select id from companies where user_id = auth.uid()));
