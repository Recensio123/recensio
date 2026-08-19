-- Mät-id:t för salongens egen GA4-property.
--
-- Property-id (ett tal) räcker för att läsa rapporter, men inte för att mäta.
-- Taggen på sajten behöver mätströmmens id — det som börjar med G-. Det står
-- inte i property-id:t utan i propertyns dataströmmar, och hämtas därifrån vid
-- synkningen så ingen kund behöver leta upp det själv.
--
-- Id:t hör hemma i kundens egen property, inte i vår. Samma regel som för
-- domänen: datan är deras och följer med den dag de slutar hos oss.

alter table google_connections
  add column if not exists ga4_measurement_id text;

comment on column google_connections.ga4_measurement_id is
  'GA4-mätströmmens id (G-XXXXXXXX) för webbtaggen på kundens sajt. Hämtas ur propertyns dataStreams vid synk.';
