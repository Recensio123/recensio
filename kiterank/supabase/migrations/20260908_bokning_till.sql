-- Bokningstillägget som sagts upp men ännu inte löpt ut.
--
-- Raden hos Stripe tas bort direkt när kunden säger upp tillägget, så att
-- nästa faktura inte innehåller den. Men perioden är betald, och en salong som
-- betalat för månaden ska ha sin kalender månaden ut — allt annat vore att
-- straffa den som säger upp en del hårdare än den som säger upp allt.
--
-- Datumet här bär den skillnaden: har_bokning följer Stripes rader, den här
-- kolumnen säger till när betalningen redan är gjord.

alter table companies
  add column if not exists bokning_till timestamptz;

comment on column companies.bokning_till is
  'Bokningstillägget uppsagt men betalt till och med den här tidpunkten. Null = inte uppsagt.';
