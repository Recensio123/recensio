-- Avslutas besöket av sig självt, eller går salongen in och säger till?
--
-- Recensionsförfrågan går bara på ett besök som faktiskt genomfördes — status
-- 'completed'. Ingenting satte den statusen automatiskt, så på ett konto som
-- inte bockade av sina tider för hand gick förfrågan aldrig ut. Det såg ut som
-- att utskicket var trasigt när det i själva verket väntade på ett besked som
-- ingen visste att den skulle ge.
--
-- Förvalet är automatiskt. En salong som inte känner till inställningen ska få
-- sina omdömesfrågor skickade, inte upptäcka ett halvår senare att de stått och
-- väntat. Den som vill bocka av för hand — för att uteblivna kunder är vanliga,
-- eller för att någon annan ska titta på listan först — slår om det.

alter table companies
  add column if not exists booking_auto_complete boolean not null default true;

comment on column companies.booking_auto_complete is
  'true: besöket räknas som genomfört när behandlingstiden passerat. false: salongen markerar det avslutat själv, och bokningen ligger kvar under Kommande tills dess.';
