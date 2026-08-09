-- Ensure site_config has the content column (idempotent)
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}';
