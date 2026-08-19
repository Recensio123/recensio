-- Att hålla kundens zon, inte bara peka på den.
--
-- Den första versionen av custom_domains kunde en sak: känna igen en domän som
-- pekade hit. Kunden lade in posten själv hos sin leverantör, och allt annat på
-- domänen — inte minst mailen — låg utanför vår räckvidd.
--
-- Den här migrationen öppnar ett andra läge. Byter kunden namnservrar till oss
-- äger vi hela zonen, och då kan hemsidan, mailen, SPF, DKIM och certifikatet
-- sättas härifrån utan att kunden rör DNS igen. Det är ett fält att ändra hos
-- leverantören i stället för fyra poster, alltså enklare för dem — men det
-- flyttar också ansvaret hit, och därför finns kolumnerna nedan.
--
-- `imported_zone` är den viktigaste av dem. Hade kunden mail på domänen innan
-- de bytte namnservrar slutar den fungera samma dag om vi inte tar med deras
-- befintliga poster över. Så zonen läses av och sparas här FÖRE bytet, både för
-- att kunna återskapa posterna och för att kunna visa kunden vad vi såg.

alter table custom_domains
  -- 'records'     — kunden lägger in A/CNAME själv. Bara hemsidan.
  -- 'nameservers' — vi håller zonen. Hemsida och mail.
  add column if not exists mode text not null default 'records'
    check (mode in ('records', 'nameservers')),

  -- Zonen hos DNS-leverantören, och de namnservrar kunden ska skriva in.
  add column if not exists zone_id     text,
  add column if not exists nameservers text[],

  -- Avläsningen av den gamla zonen, gjord före bytet. Aldrig tom när
  -- mode = 'nameservers': är den tom har vi inte tittat, och då får bytet
  -- inte ske.
  add column if not exists imported_zone jsonb,
  add column if not exists imported_at   timestamptz,

  -- 'none'      — ingen mail på domänen.
  -- 'forward'   — info@domänen går vidare till en adress de redan har.
  -- 'google'    — MX mot Google Workspace, brevlådan betalar de själva.
  -- 'microsoft' — MX mot Microsoft 365, likaså.
  --
  -- Ett läge i taget. Alla tre vill äga MX-posten på samma domän, så två
  -- samtidigt är inte en inställning utan trasig mail.
  add column if not exists mail_mode text not null default 'none'
    check (mail_mode in ('none', 'forward', 'google', 'microsoft')),

  -- Vart vidarebefordran går. Cloudflare kräver att mottagaren bekräftar
  -- adressen via ett mail innan den börjar fungera, så den kan vara satt utan
  -- att vara igång — därför två kolumner och inte en.
  add column if not exists mail_forward_to    text,
  add column if not exists mail_verified_at   timestamptz,
  add column if not exists mail_configured_at timestamptz;

-- Certifikatet utfärdas av hostingen när domänen är tillagd där. Vi sparar bara
-- att det är gjort, så en halvfärdig koppling kan tas om utan att dubblera.
alter table custom_domains
  add column if not exists host_added_at timestamptz;

comment on column custom_domains.imported_zone is
  'Kundens DNS-poster som de såg ut före namnserverbytet. Skyddet mot att släcka befintlig mail.';
