-- Run this in the Supabase SQL editor to add Phase 2 (Search Console) tables

-- Add Search Console site URL to existing connections table
ALTER TABLE google_connections ADD COLUMN IF NOT EXISTS sc_site_url TEXT;

-- Search Console keyword data (replaced on each sync)
CREATE TABLE IF NOT EXISTS search_console_queries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  synced_at   TIMESTAMPTZ DEFAULT NOW(),
  query       TEXT NOT NULL,
  clicks      INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr         NUMERIC(6,4) DEFAULT 0,
  position    NUMERIC(5,1) DEFAULT 0
);

ALTER TABLE search_console_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own SC queries" ON search_console_queries
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

-- Grant permissions
GRANT ALL ON search_console_queries TO postgres, anon, authenticated, service_role;
