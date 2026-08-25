-- Ny paketmodell: tre nivåer, och bokningen som tillägg i stället för nivå.
--
-- Den gamla modellen bakade in bokningssystemet i mellannivån, vilket band
-- ihop två frågor som inte hör ihop: hur sajten byggs, och om verksamheten
-- bokar tider. En designkund som ville ha kalender fick köpa om sig till ett
-- billigare paket för att få den. Nu är nivån en sak och bokningen en annan.
--
-- Ordningen nedan spelar roll: bokningsflaggan sätts medan planen fortfarande
-- heter 'bokning', innan namnen skrivs om.

alter table companies
  add column if not exists har_bokning boolean not null default false,
  add column if not exists faktureringsintervall text;

-- Bokningspaketets kunder behåller bokningen, nu som tillägg.
update companies set har_bokning = true where plan = 'bokning';

alter table companies drop constraint if exists companies_plan_check;

-- 'lead' och 'bokning' var båda mallhemsidan; 'egen' var den designade.
update companies set plan = case plan
  when 'lead'    then 'mall'
  when 'bokning' then 'mall'
  when 'egen'    then 'design'
  else plan
end
where plan is not null;

alter table companies
  add constraint companies_plan_check
  check (plan in ('mall', 'design', 'fullservice'));

alter table companies drop constraint if exists companies_intervall_check;
alter table companies
  add constraint companies_intervall_check
  check (faktureringsintervall in ('manad', 'ar'));

comment on column companies.har_bokning is
  'Bokningssystemet som tillägg — sätts av webhooken utifrån abonnemangets rader.';
comment on column companies.faktureringsintervall is
  'manad eller ar. Speglar abonnemangets intervall hos Stripe.';
