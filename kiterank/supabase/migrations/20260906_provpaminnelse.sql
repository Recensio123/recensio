-- Stämpel för provpåminnelsen.
--
-- Nattsvepet går varje dygn och skulle utan den här kolumnen skicka samma
-- påminnelse tre nätter i rad till samma salong. Tre mail om samma sak är
-- inte tre påminnelser — det är en avprenumeration.

alter table companies
  add column if not exists provpaminnelse_skickad timestamptz;

comment on column companies.provpaminnelse_skickad is
  'När påminnelsen om att provet snart tar slut skickades. Null = inte skickad.';
