-- Var kunden är i sin igångsättning — på kontot, inte i webbläsaren.
--
-- Låg tidigare i localStorage, vilket betyder att svaret på "är den här
-- salongen uppsatt?" var olika på datorn och telefonen, försvann när någon
-- rensade webbläsardata, och mötte varje ny medarbetare med en guide de inte
-- skulle ha. En kolumn på företaget ger ett svar för hela kontot.
--
-- Bara val och tidpunkter sparas här. Allt som går att räkna ut ur innehållet
-- — om bilderna är utbytta, om priserna är ifyllda — räknas ut varje gång.
-- Sparade klar-flaggor blir osanna i samma stund kunden ångrar sig.

alter table companies
  add column if not exists onboarding jsonb not null default '{}'::jsonb;

comment on column companies.onboarding is
  'Igångsättningens val och tidpunkter: {steg, klartAt, vill:{sajt,bokning}, mall, harSajt}. Aldrig härledbara klar-flaggor.';

-- Företag som redan har en sajt har uppenbarligen tagit sig igenom
-- registreringen — de ska inte mötas av den igen för att kolumnen är ny.
update companies c
   set onboarding = jsonb_build_object(
         'steg',    'klar',
         'klartAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'vill',    jsonb_build_object('sajt', true, 'bokning', true),
         'harSajt', false)
 where c.onboarding = '{}'::jsonb
   and exists (select 1 from site_config s where s.company_id = c.id);
