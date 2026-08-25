-- Kort adress till avbokningen.
--
-- Den fullständiga vägen är omkring åttio tecken: domän, /book/, salongens
-- slug, /avboka/ och ett UUID. I ett mail spelar det ingen roll, men i ett SMS
-- är det halva utrymmet — och konsekvensen blev att bekräftelsen som SMS inte
-- fick någon avbokningslänk alls. Kunden lämnades utan väg tillbaka, vilket är
-- precis det bokningssystemet ska ta bort.
--
-- Koden är ett alias, inte en ersättare. cancel_token är fortfarande sidans
-- nyckel, så varje länk vi redan skickat ut fortsätter fungera.
--
-- Sexton hexadecimala tecken är 64 bitar. Det är för mycket för att gissa sig
-- till någon annans bokning, och tillräckligt glest för att två bokningar
-- aldrig ska råka få samma kod.

alter table bookings
  add column if not exists cancel_code text;

update bookings
   set cancel_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
 where cancel_code is null;

alter table bookings
  alter column cancel_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);

create unique index if not exists bookings_cancel_code_key
  on bookings (cancel_code);

comment on column bookings.cancel_code is
  'Kort alias för avbokningslänken, för SMS där varje tecken kostar. Leder till samma sida som cancel_token.';
