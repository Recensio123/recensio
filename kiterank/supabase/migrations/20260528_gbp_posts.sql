-- GBP posts: stores posts composed and published via the GBP Post Scheduler.
-- status: 'draft' → 'published' on success, 'failed' if GBP API rejected it.

create table if not exists gbp_posts (
  id             uuid        primary key default gen_random_uuid(),
  company_id     uuid        not null references companies(id) on delete cascade,
  body           text        not null,
  image_url      text,
  cta_type       text,        -- LEARN_MORE | SIGN_UP | SHOP | ORDER_ONLINE | BOOK | CALL
  cta_url        text,
  status         text        not null default 'draft',   -- draft | published | failed
  gbp_post_name  text,        -- resource name returned by GBP API, e.g. accounts/.../localPosts/xxx
  published_at   timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists gbp_posts_company_id_idx on gbp_posts(company_id);

-- Enable RLS — all app writes go through the service-role admin client and
-- bypass these policies, but they protect against direct anon/authenticated
-- key access (e.g. accidental client-side queries, leaked keys).
alter table gbp_posts enable row level security;

-- Authenticated users may only see and modify rows belonging to their own company.
create policy "Users can read own company posts"
  on gbp_posts for select
  using (
    company_id in (
      select id from companies where user_id = auth.uid()
    )
  );

create policy "Users can insert own company posts"
  on gbp_posts for insert
  with check (
    company_id in (
      select id from companies where user_id = auth.uid()
    )
  );

create policy "Users can update own company posts"
  on gbp_posts for update
  using (
    company_id in (
      select id from companies where user_id = auth.uid()
    )
  );

create policy "Users can delete own company posts"
  on gbp_posts for delete
  using (
    company_id in (
      select id from companies where user_id = auth.uid()
    )
  );
