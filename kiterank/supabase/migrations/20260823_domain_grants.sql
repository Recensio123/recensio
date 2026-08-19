-- Repair: custom_domains and the social tables shipped without table grants.
--
-- Without these even the service key gets "permission denied for table", so
-- nothing can be written or read through the API — the same gap the booking
-- tables shipped with. RLS still decides WHO may do WHAT; these grants only
-- let the roles reach the tables at all, which is Supabase's own default for
-- every table it creates itself.
grant all on public.custom_domains to anon, authenticated, service_role;

-- Harmless if the social tables were skipped: the statement is guarded so the
-- file runs either way.
do $$
begin
  if to_regclass('public.social_connections') is not null then
    grant all on public.social_connections to anon, authenticated, service_role;
  end if;
  if to_regclass('public.social_snapshots') is not null then
    grant all on public.social_snapshots to anon, authenticated, service_role;
  end if;
end $$;
