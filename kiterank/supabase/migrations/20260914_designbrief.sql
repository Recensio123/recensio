-- Designunderlaget från premiumkundernas registrering.
--
-- En kund som köpt en formgiven sida ska inte mötas av ett mallval — de har
-- betalat för att slippa välja. I stället frågar registreringen det vi behöver
-- för att bygga åt dem: varumärke, färger, förebilder, bilder och önskemål.
--
-- En kolumn och inte en tabell: det finns ett underlag per kund, och det
-- uppdateras snarare än upprepas. Behövs historik senare ligger den i
-- site_arkiv, där de färdiga sidorna redan sparas.

alter table companies
  add column if not exists design_brief jsonb;

comment on column companies.design_brief is
  'Svaren från designfrågorna i registreringen. Bara för design- och fullservicekunder.';
