-- Ett konto, ett företag — och ingen som kan läsa någon annans.
--
-- Två saker som båda handlar om samma sak: att en kunds konto verkligen är
-- deras eget.
--
--
-- DEL 1 — ett företag per inloggning
--
-- companies.user_id har aldrig haft en unik nyckel. Koden förutsätter ändå att
-- det finns exakt ett företag per inloggning, och de tre ställen som ställer
-- frågan svarar olika när det inte stämmer:
--
--   currentAccess   tar det nyaste
--   currentCompany  .single() ger fel, alltså ingen behörighet alls
--   OAuth-återvändandet  .single() ger fel, tolkar det som "inget företag
--                        finns" och skapar ett till
--
-- Den sista är den otäcka: en dubblett föder fler. Kunden hamnar i ett konto
-- utan sina bokningar, och det gamla ligger kvar med sina.
--
--
-- DEL 2 — anon-nyckeln ska inte kunna läsa något
--
-- NEXT_PUBLIC_SUPABASE_ANON_KEY ligger i webbläsarpaketet. Det är meningen —
-- den används för inloggningen — men den innebär att vem som helst kan ringa
-- Supabase REST-API direkt med den. Vad de då får ut avgörs enbart av RLS.
--
-- Fyra policyer säger idag TRUE:
--
--   public_read_companies         hela companies-raden för alla företag
--   public_read_booking_services  alla salongers tjänster och priser
--   public_insert_bookings        vem som helst får skriva en bokning på
--                                 vilket företag som helst
--   public_insert_customers       samma för kundregistret
--
-- companies är inte längre tabellen den var när policyn skrevs. Sedan dess har
-- den fått telefonnummer, SMS-avsändare, omdömeslänk, avbokningsregler,
-- uppsägningsdatum — och user_id, som kopplar företaget till en auth-användare.
--
-- Skrivpolicyerna är värre än läsningen: de går förbi bokningsrutten, och med
-- den förbi tidskontroll, framförhållning och allt annat som gör en bokning
-- riktig. Ett skript kunde fylla vilken salongs kalender som helst.
--
-- Ingen av dem behövs. Den publika bokningssidan och de publicerade sajterna
-- renderas på servern med service-nyckeln, som går förbi RLS ändå. Webbläsarens
-- klient används på ett enda ställe i hela produkten: inloggningssidan, och den
-- rör bara auth. Policyerna är alltså ren angreppsyta.
--
-- gbp_reviews saknar dessutom RLS helt — den enda tabellen i grundschemat som
-- aldrig fick det. Recensionstexter och namn på alla salongers kunder.

begin;

-- ── Del 1: ett företag per inloggning ───────────────────────────────────────

-- Kör det här först och läs svaret. Kommer rader tillbaka finns dubbletter
-- redan, och då stannar migrationen på indexet nedan. Radera ingenting på
-- måfå — fråga vilket konto kunden faktiskt använder.
--
--   select user_id, count(*), array_agg(id order by created_at)
--   from companies group by user_id having count(*) > 1;

create unique index if not exists companies_user_id_key on companies(user_id);

-- ── Del 2: vilka företag den som frågar hör till ────────────────────────────

-- Ägaren och salongens egna inloggningar, i en lista.
--
-- security definer: funktionen läser companies själv, och skulle utan det
-- fastna i policyn som anropar den. Den lämnar inte ut något en policy inte
-- redan får fråga om — bara id:n, och bara den anropandes egna.
create or replace function public.mina_foretag()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id         from companies      where user_id = auth.uid()
  union
  select company_id from company_members where user_id = auth.uid()
$$;

revoke all on function public.mina_foretag() from public;
grant execute on function public.mina_foretag() to authenticated, service_role;

-- ── Del 3: bort med de publika policyerna ───────────────────────────────────

drop policy if exists "public_read_companies"        on companies;
drop policy if exists "public_read_booking_services" on booking_services;
drop policy if exists "public_insert_bookings"       on bookings;
drop policy if exists "public_insert_customers"      on customers;

-- Ägarpolicyn på companies räknade bara ägaren. En receptionist med eget konto
-- hör också till salongen; att den aldrig läser med sin egen nyckel idag gör
-- inte policyn rätt.
drop policy if exists "Users manage own companies" on companies;
create policy "egna företag" on companies
  for all using (id in (select public.mina_foretag()));

-- ── Del 4: RLS på gbp_reviews ───────────────────────────────────────────────

alter table gbp_reviews enable row level security;

drop policy if exists "egna omdömen" on gbp_reviews;
create policy "egna omdömen" on gbp_reviews
  for all using (company_id in (select public.mina_foretag()));

-- ── Del 5: dra in anon-rättigheterna ────────────────────────────────────────
--
-- RLS räcker, men en tabell som anon inte ens har rättighet till kan inte
-- läcka genom en policy någon skriver fel om ett år. Bältet får sitta kvar
-- fast hängslena håller.

revoke all on public.companies         from anon;
revoke all on public.gbp_reviews       from anon;
revoke all on public.bookings          from anon;
revoke all on public.customers         from anon;
revoke all on public.booking_services  from anon;
revoke all on public.company_members   from anon;

commit;
