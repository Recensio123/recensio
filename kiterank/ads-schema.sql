-- Run this in the Supabase SQL editor to add Phase 3 (Google Ads) tables

ALTER TABLE google_connections ADD COLUMN IF NOT EXISTS ads_customer_id TEXT;

CREATE TABLE IF NOT EXISTS ads_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  campaign_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  status        TEXT,
  spend_micros  BIGINT DEFAULT 0,
  clicks        INTEGER DEFAULT 0,
  impressions   INTEGER DEFAULT 0,
  ctr           NUMERIC(6,4) DEFAULT 0,
  avg_cpc_micros BIGINT DEFAULT 0,
  conversions   NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ads_keywords (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  keyword       TEXT NOT NULL,
  match_type    TEXT,
  spend_micros  BIGINT DEFAULT 0,
  clicks        INTEGER DEFAULT 0,
  impressions   INTEGER DEFAULT 0,
  ctr           NUMERIC(6,4) DEFAULT 0,
  avg_cpc_micros BIGINT DEFAULT 0,
  conversions   NUMERIC(10,2) DEFAULT 0,
  is_wasted     BOOLEAN DEFAULT FALSE
);

ALTER TABLE ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_keywords  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own campaigns" ON ads_campaigns
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own keywords" ON ads_keywords
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

GRANT ALL ON ads_campaigns TO postgres, anon, authenticated, service_role;
GRANT ALL ON ads_keywords  TO postgres, anon, authenticated, service_role;
