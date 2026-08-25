-- Stämpel för när den formgivna sidan blev avbetald.
--
-- Efter tolv betalda månader har kunden betalat av formgivningen, och
-- månadsavgiften faller med hundrafemtio kronor. Kolumnen finns för att
-- nattsvepet ska veta vilka som redan fått avdraget och slippa fråga Stripe
-- om samma kunds fakturahistorik varje natt i all framtid.

alter table companies
  add column if not exists sida_avbetald timestamptz;

comment on column companies.sida_avbetald is
  'När avdraget för avbetald formgivning lades på. Null = inte avbetald än.';
