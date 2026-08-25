-- Betalningen, del ett: vad kontot vet om sitt abonnemang.
--
-- Stripe är sanningen om pengarna — vad som betalats, när kortet gick igenom,
-- vilken faktura som förföll. Det här är kontots egen kopia av läget, skriven
-- av webhooken varje gång Stripe säger att något hänt. Panelen och admin läser
-- härifrån och ringer aldrig Stripe för att rita en sida: en vy som väntar på
-- ett externt API för varje besök är en vy som är långsam jämt och trasig när
-- Stripe har en dålig dag.
--
-- "plan" ersätter byggtidsväxeln i sidomenyn. Den har hittills varit ett
-- useState i webbläsaren — bra för att bygga med, meningslös som egenskap på
-- ett konto. Nu är den en kolumn, satt av registreringen och betalningen och
-- ingen annan.

begin;

-- Vilket upplägg kontot har. Null = registrerad innan planerna fanns; sådana
-- konton behandlas som 'bokning' tills de väljer själva, för det är vad de
-- sett under bygget.
alter table companies add column if not exists plan text
  check (plan is null or plan in ('lead', 'bokning', 'egen'));

-- Stripes kund-id. Unikt: två företag på samma Stripe-kund vore två fakturor
-- i samma brevlåda, och felet syns först när fel salong betalar.
alter table companies add column if not exists stripe_customer_id text;
create unique index if not exists companies_stripe_customer
  on companies(stripe_customer_id) where stripe_customer_id is not null;

alter table companies add column if not exists stripe_subscription_id text;

-- Lägena är Stripes egna ord, inte en egen ordlista. En egen hade behövt en
-- översättning i webhooken, och varje översättning är ett ställe där ett nytt
-- Stripe-läge blir ett okänt värde i stället för ett synligt.
alter table companies add column if not exists subscription_status text
  check (subscription_status is null or subscription_status in
    ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'));

-- Provperioden är vår, inte Stripes: sju dagar utan kort vid registreringen.
-- Stripe blandas in först när kunden väljer att betala.
alter table companies add column if not exists trial_ends_at timestamptz;

-- När innevarande period tar slut. Det är datumet en uppsägning löper till,
-- och datumet admin-sidan visar som "betald till".
alter table companies add column if not exists current_period_end timestamptz;

commit;
