-- Ämnesraden i mailet.
--
-- Den stod hårdskriven i koden, vilket gjorde den till det enda kunden ser i
-- inkorgen som salongen inte kunde ändra. Ämnesraden avgör om mailet öppnas —
-- den är inte en etikett utan första meningen kunden läser.
--
-- Bara för mail. Ett SMS har ingen ämnesrad, och raden för SMS-kanalen lämnas
-- därför null: en kolumn som fylls i men aldrig läses blir en lögn nästa gång
-- någon läser tabellen.
--
-- Null betyder standardämnet i koden, precis som en osparad text betyder
-- standardtexten. Så förbättras standarden för alla och inte bara för dem som
-- registrerar sig efter att vi ändrat den.

alter table message_templates
  add column if not exists subject text;

comment on column message_templates.subject is
  'Ämnesrad för mail. Null = standardämnet i koden. Alltid null på SMS-rader — ett SMS har ingen ämnesrad.';
