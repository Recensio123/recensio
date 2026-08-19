-- Kontostatus: när en salong säger upp avtalet ska deras sajt sluta finnas.
--
-- Ett fält, inte två. Null betyder aktiv, ett datum betyder uppsagd, och de
-- kan aldrig säga emot varandra. Datumet är dessutom värt att spara i sig —
-- det är svaret på "när slutade de" utan att någon behöver komma ihåg.
--
-- Vad det styr står i src/app/s/[slug]/site-data.ts: en uppsagd salong hittas
-- inte, och då försvinner både sajten på vår adress och sajten på deras egen
-- domän. Omdirigeringen till domänen upphör samtidigt, vilket är hela skälet
-- till att fältet finns: en permanent omdirigering till en domän vi inte äger
-- ska inte överleva kundrelationen.

alter table public.companies
  add column if not exists closed_at timestamptz;

comment on column public.companies.closed_at is
  'Null = aktivt konto. Satt = avtalet uppsagt; sajten serveras inte längre på någon adress.';

-- Uppslagen som gäller är "hitta aktiva företag", så indexet bär villkoret.
create index if not exists companies_active_slug_idx
  on public.companies (slug)
  where closed_at is null;
