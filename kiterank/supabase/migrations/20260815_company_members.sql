-- Several people, one salon.
--
-- Until now a company had exactly one login: companies.user_id, the person
-- who signed up. That works for an owner running everything alone, and for
-- nobody else. A salon has a reception desk and chairs, and both need the
-- calendar without being handed the keys to the ad account.
--
-- Three roles:
--   admin  — the salon. Everything, including creating more accounts.
--   schema — may edit the whole schedule: every chair, every booking. Often
--            a receptionist, sometimes a senior stylist. No settings, no
--            marketing.
--   staff  — edits their own chair only. Sees the rest of the salon's day
--            as "Upptaget": the hour is taken, but not by whom or for what.
--            That answers "can I send this customer to Sara on Thursday?"
--            without handing a colleague's client list to everyone with a
--            login. One behaviour, no setting.
--
-- staff_id links an account to a chair. A schema account may have none —
-- a receptionist is not someone customers book, which is exactly why the
-- two are separate columns rather than one.

create table if not exists company_members (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null default 'staff' check (role in ('admin', 'schema', 'staff')),
  -- Which chair this account speaks for. Null for admin and schema accounts.
  staff_id    uuid references staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists company_members_user_idx    on company_members(user_id);
create index if not exists company_members_company_idx on company_members(company_id);

alter table company_members enable row level security;

-- Every write goes through the service role on the server, which bypasses
-- RLS. This policy is the safety net for anything that ever reads with the
-- user's own key: you may see the memberships that are yours.
drop policy if exists "own membership" on company_members;
create policy "own membership" on company_members
  for select using (auth.uid() = user_id);

grant all on public.company_members to anon, authenticated, service_role;
