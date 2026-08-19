-- När bekräftelsen gick ut till kunden.
--
-- Salongen väljer själv om tider godkänns automatiskt eller för hand, och de två
-- fallen skickar bekräftelsen vid olika tillfällen: automatiskt godkänd betyder
-- direkt när kunden bokar, manuellt godkänd betyder när salongen tryckt bekräfta.
--
-- I stället för att låta utskicket känna till inställningen får bokningen en
-- stämpel. Bekräftelsen skickas när status blir 'confirmed' och stämpeln är tom,
-- och stämplas sedan. Då blir regeln densamma i båda fallen, och en salong som
-- trycker bekräfta på en tid som redan var godkänd skickar inte ett andra mail
-- till kunden.
--
-- Kolumnen är också svaret på "fick kunden sin bekräftelse?" — en fråga som
-- annars bara går att gissa på.

alter table bookings
  add column if not exists confirmation_sent_at timestamptz;

comment on column bookings.confirmation_sent_at is
  'När bekräftelsen skickades till kunden. Tom betyder att den inte gått ut — och att den får gå ut när tiden godkänns.';
