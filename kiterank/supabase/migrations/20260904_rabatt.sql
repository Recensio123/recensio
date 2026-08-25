-- Rabatt per kund, satt av plattformsadmin.
--
-- Procenten bor här som sanningen om vad kunden lovats; Stripe-kupongen är
-- verkställandet. Ordningen spelar roll: sätts rabatten innan kunden hunnit
-- betala finns ingen Stripe-kund att hänga kupongen på, och då är den här
-- kolumnen det enda stället löftet finns — kassan läser den och lägger på
-- kupongen när köpet väl görs.

alter table companies
  add column if not exists rabatt_procent int not null default 0
    check (rabatt_procent between 0 and 100);
