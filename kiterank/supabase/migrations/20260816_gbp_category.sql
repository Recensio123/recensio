-- The primary category on the Google Business Profile.
--
-- It decides which category searches the salon can appear for in Maps, and it
-- is the one thing about the profile we have never stored. Kept as Google's
-- own stable id plus the label it showed us, so a rename on their side does
-- not silently change what we compare against.
alter table google_connections add column if not exists gbp_primary_category_id    text;
alter table google_connections add column if not exists gbp_primary_category_label text;
