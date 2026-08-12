-- A renamed site keeps its old addresses working: every previous slug is
-- remembered and 308-redirects to the current one, so links Google has
-- already indexed never die.
alter table companies add column if not exists old_slugs text[] not null default '{}';
