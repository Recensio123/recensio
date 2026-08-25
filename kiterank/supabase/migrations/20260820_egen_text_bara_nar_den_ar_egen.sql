-- Texten ska vara sparad bara när salongen faktiskt skrivit den.
--
-- Kolumnen var not null, så varje sparning behövde en text att skriva. Slog
-- salongen bara på en påminnelse frös därför standardtexten in i raden som
-- deras egen. Följden märks först senare: när vi förbättrar en standardtext får
-- de aldrig del av den, och panelen påstår "EGEN TEXT" om en formulering de
-- aldrig rört.
--
-- Null betyder nu standardtexten i koden, tom sträng betyder att salongen
-- medvetet tömt den. Samma tre tillstånd som resten av sidans fält.

alter table message_templates
  alter column body drop not null;

comment on column message_templates.body is
  'Salongens egen text. Null = standardtexten i koden. Tom sträng = medvetet tömd.';

-- De rader som bara bär en infrusen standardtext släpps tillbaka till
-- standarden. Texterna nedan är ordagrant de tidigare standardtexterna, så en
-- rad som matchar dem är inte något någon skrivit.
update message_templates
   set body = null
 where body in (
   'Din tid är bokad och klar. Välkommen!',
   'Din tid {datum} kl {tid} är bokad och klar. Välkommen!',
   'Din tid {datum} kl {tid} är avbokad. Välkommen att boka en ny tid när det passar.',
   'Din tid är avbokad. Välkommen att boka en ny tid när det passar.',
   'Hej {namn}! Påminnelse om din tid {datum} kl {tid}.',
   'Hej {namn}! En påminnelse om din tid hos oss.',
   'Tack {namn}! Ditt omdöme betyder mycket för oss.'
 );
