-- Att stänga av ett enskilt utskick, för en enskild bokning.
--
-- Påminnelsen och recensionsförfrågan är påslagna för salongen som helhet, men
-- inte varje kund ska ha dem. Stamkunden som kommer varannan vecka behöver
-- ingen påminnelse; den som just klagat ska inte få frågan om ett omdöme.
--
-- Utan de här flaggorna var alternativet att stänga av utskicket för alla, och
-- då tappar salongen nyttan för de nittio procent där det fungerar.
--
-- Flaggan säger "hoppa över" och inte "skicka": standarden är alltså att
-- utskicket går, precis som salongens inställning säger. En ny bokning ärver
-- ingenting och behöver inte röras.

alter table bookings
  add column if not exists skip_reminder boolean not null default false;
alter table bookings
  add column if not exists skip_review   boolean not null default false;

comment on column bookings.skip_reminder is
  'Hoppa över påminnelsen för just den här bokningen. Salongens inställning gäller annars.';
comment on column bookings.skip_review is
  'Hoppa över recensionsförfrågan för just den här bokningen.';
