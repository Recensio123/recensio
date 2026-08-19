-- Wellness or treatment.
--
-- Trades like massage, foot care and skin care sit under different schema.org
-- parents depending on what the business actually does: relaxation belongs
-- with beauty, treating an injury belongs with care. The trade name cannot
-- tell them apart, so the customer answers once during setup and this holds
-- the answer. Null means the question does not apply to their trade.
alter table companies add column if not exists schema_care text
  check (schema_care in ('wellness', 'care'));
