-- Run this in the Supabase SQL editor to add Phase 6 (Google Analytics 4) tables

ALTER TABLE google_connections ADD COLUMN IF NOT EXISTS ga4_property_id TEXT;

CREATE TABLE IF NOT EXISTS ga4_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  synced_at            TIMESTAMPTZ DEFAULT NOW(),
  sessions             INTEGER DEFAULT 0,
  users                INTEGER DEFAULT 0,
  new_users            INTEGER DEFAULT 0,
  engagement_rate      NUMERIC(5,4) DEFAULT 0,
  avg_session_duration NUMERIC(10,2) DEFAULT 0,
  conversions          INTEGER DEFAULT 0,
  traffic_sources      JSONB DEFAULT '[]',
  top_pages            JSONB DEFAULT '[]'
);

ALTER TABLE ga4_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own GA4 snapshots" ON ga4_snapshots
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

GRANT ALL ON ga4_snapshots TO postgres, anon, authenticated, service_role;
