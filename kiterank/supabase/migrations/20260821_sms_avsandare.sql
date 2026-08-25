-- Avsändarnamnet kunden ser i sitt SMS.
--
-- Härleddes tidigare ur företagsnamnet: skalat på diakriter och specialtecken,
-- kapat till elva. Det räcker för "Klipphuset" men inte för "Salong Nordström
-- & Co", som blev "SalongNords" — och det är det första kunden ser, i ett
-- meddelande där avsändaren är enda beskedet om vem som skriver.
--
-- Elva tecken är inte vårt val utan GSM-standardens gräns för alfanumeriska
-- avsändare. Bokstäver och siffror, ingenting annat: mellanslag och å ä ö
-- överlever inte hos alla operatörer, och ett namn som kommer fram halvt är
-- värre än ett kortare som kommer fram helt.
--
-- Null betyder att namnet härleds som förut. Salongen som inte bryr sig ska
-- inte behöva bry sig.

alter table companies
  add column if not exists sms_sender text;

comment on column companies.sms_sender is
  'Avsändarnamn i SMS, max 11 tecken A–Z och 0–9. Null = härleds ur företagsnamnet.';

alter table companies
  drop constraint if exists companies_sms_sender_check;
alter table companies
  add constraint companies_sms_sender_check
  check (sms_sender is null or sms_sender ~ '^[A-Za-z0-9]{1,11}$');
