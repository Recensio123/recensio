-- Marknadsföring till salongens egna kunder.
--
-- Salongen får skicka erbjudanden till någon som redan varit kund — undantaget
-- för befintligt kundförhållande i marknadsföringslagen. Undantaget gäller
-- bara om personen fick tacka nej redan när uppgifterna samlades in, och får
-- tacka nej i varje utskick. De två kolumnerna här nedan är de kraven, i kod.

-- Avanmälan, på kundraden.
--
-- Skilt från sms_opt_in med flit. En kund kan mycket väl vilja ha sin
-- bokningsbekräftelse som SMS men inte ett erbjudande i mars — det är två
-- olika saker i lagen och ska vara två olika saker här. Bekräftelser och
-- påminnelser är transaktionella och går ut oavsett; den som avbokat vill
-- fortfarande veta att avbokningen gick igenom.
alter table customers
  add column if not exists marknadsforing_nej boolean not null default false,
  -- När nejet kom, och varifrån: 'bokning' (kryssade i formuläret), 'svar'
  -- (STOPP i ett SMS), 'salong' (salongen la in det), 'kund' (hörde av sig).
  -- Sparas därför att ett nej måste gå att belägga den dag ett utskick anmäls.
  add column if not exists marknadsforing_nej_at timestamptz,
  add column if not exists marknadsforing_nej_kalla text;

create index if not exists customers_marknadsforing
  on customers (company_id) where marknadsforing_nej = false;

-- Salongens instruktion, som en inställning.
--
-- Enligt artikel 28 GDPR får ett biträde bara behandla enligt dokumenterade
-- instruktioner. Den här kolumnen ÄR instruktionen: står den av skickas
-- ingenting, hur mycket någon än ber om det muntligt. Förvalet är av — en
-- salong ska aktivt slå på marknadsföring till sina kunder, aldrig upptäcka
-- att den varit på.
alter table companies
  add column if not exists aterakti_pa boolean not null default false,
  add column if not exists aterakti_pa_at timestamptz;
