-- "Ja, den stämmer."
--
-- The category on the Business Profile is Google's field and the customer's
-- decision, so the platform shows it and asks once. This holds the id they
-- confirmed; when it no longer matches the category on the profile — because
-- they changed it, here or on Google — the question comes back for the new one.
alter table google_connections add column if not exists gbp_category_confirmed_id text;
