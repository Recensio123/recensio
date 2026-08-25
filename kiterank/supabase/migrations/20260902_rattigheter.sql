-- Rättigheterna som aldrig delades ut.
--
-- Fyra tabeller skapades i migrationer utan GRANT: message_events,
-- search_console_daily, calendar_feeds och customer_notes. I Supabase räcker
-- det inte att tabellen finns — servernyckeln (service_role) behöver en
-- uttrycklig rättighet, och utan den svarar varje fråga 42501.
--
-- Att ingen märkt det är ingen slump utan en bieffekt av en princip som annars
-- är rätt: koden tål saknade tabeller, så att en databas mitt i en migrering
-- inte fäller sidan. Men samma tålighet gjorde det här felet osynligt —
-- utskicksloggen skrev ingenting, sökhistoriken sparades aldrig,
-- kalenderfeeds och kundanteckningar svarade tomt, och allt såg ut att
-- fungera.
--
-- service_role och authenticated får rättighet; anon får ingen. RLS-policyerna
-- avgör sedan vad authenticated faktiskt ser — rättigheten är dörren, policyn
-- är vakten.
--
-- service_staff tas med för säkerhets skull: den skapades i tjänstemigreringen
-- med samma mönster, och en revoke från anon säger inget om vad service_role
-- har.

begin;

grant all on public.message_events        to authenticated, service_role;
grant all on public.search_console_daily  to authenticated, service_role;
grant all on public.calendar_feeds        to authenticated, service_role;
grant all on public.customer_notes        to authenticated, service_role;
grant all on public.service_staff         to authenticated, service_role;

commit;
