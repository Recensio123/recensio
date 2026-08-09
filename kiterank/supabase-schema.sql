-- Kiterank Database Schema

-- Companies: one row per subscribed business
CREATE TABLE companies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT        NOT NULL,
  slug       TEXT        UNIQUE,          -- URL-safe identifier, e.g. "atelier-hair"
  industry   TEXT,
  city       TEXT,
  website    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Google connections: OAuth tokens per company
CREATE TABLE google_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  gbp_account_id TEXT,
  gbp_location_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- GBP snapshots: raw data pulled from GBP API (or mock)
CREATE TABLE gbp_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  rating NUMERIC(2,1),
  review_count INTEGER,
  reviews_responded INTEGER,
  last_post_date DATE,
  posts_last_30_days INTEGER,
  photos_count INTEGER,
  impressions_last_30_days INTEGER,
  searches_last_30_days INTEGER,
  direction_requests INTEGER,
  website_clicks INTEGER,
  search_queries JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual GBP reviews — synced from Google, upserted on each review sync
CREATE TABLE gbp_reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  review_id    TEXT        NOT NULL,
  author       TEXT        NOT NULL,
  rating       INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text         TEXT,
  published_at TIMESTAMPTZ,
  reply        TEXT,
  synced_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, review_id)
);

-- Benchmark scores: calculated 5-pillar scores per snapshot
CREATE TABLE benchmark_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  snapshot_id UUID REFERENCES gbp_snapshots(id) ON DELETE CASCADE NOT NULL,
  overall_score INTEGER,
  reputation_score INTEGER,
  visibility_score INTEGER,
  engagement_score INTEGER,
  content_score INTEGER,
  conversion_score INTEGER,
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action plans: Claude-generated recommendations per snapshot
CREATE TABLE action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  snapshot_id UUID REFERENCES gbp_snapshots(id) ON DELETE CASCADE NOT NULL,
  actions JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own companies" ON companies
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own connections" ON google_connections
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own snapshots" ON gbp_snapshots
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own scores" ON benchmark_scores
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own action plans" ON action_plans
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

-- ─── Booking System ──────────────────────────────────────────────────────────

-- Customers: one row per unique customer per company
CREATE TABLE customers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  phone          TEXT,                           -- E.164 format e.g. +46701234567
  email          TEXT,
  notes          TEXT,
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  first_visit    DATE,
  last_visit     DATE,
  total_visits   INT         NOT NULL DEFAULT 0,
  sms_opt_in     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking services: treatments the salon offers
CREATE TABLE booking_services (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  description      TEXT,
  duration_minutes INT         NOT NULL DEFAULT 60,
  price_sek        INT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order       INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings: one row per appointment
CREATE TABLE bookings (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id              UUID        REFERENCES customers(id) ON DELETE SET NULL,
  service_id               UUID        REFERENCES booking_services(id) ON DELETE SET NULL,

  -- Denormalised service snapshot (preserved if service is later deleted/changed)
  service_name             TEXT        NOT NULL,
  service_duration_minutes INT         NOT NULL,
  service_price_sek        INT,

  -- Timing
  booking_date             DATE        NOT NULL,
  start_time               TIME        NOT NULL,
  end_time                 TIME        NOT NULL,

  -- Status
  status                   TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),

  -- Customer snapshot (kept even if customer record is later deleted)
  customer_name            TEXT        NOT NULL,
  customer_phone           TEXT,
  customer_email           TEXT,

  -- Notes
  customer_note            TEXT,
  staff_note               TEXT,

  -- Booking source
  source                   TEXT        NOT NULL DEFAULT 'online'
                           CHECK (source IN ('online','phone','walk_in','app')),

  -- SMS / comms tracking
  sms_confirmation_sent_at TIMESTAMPTZ,
  sms_reminder_sent_at     TIMESTAMPTZ,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX bookings_company_date  ON bookings(company_id, booking_date);
CREATE INDEX bookings_customer      ON bookings(customer_id);
CREATE INDEX bookings_status        ON bookings(company_id, status);
CREATE INDEX customers_company      ON customers(company_id);
CREATE UNIQUE INDEX customers_phone ON customers(company_id, phone) WHERE phone IS NOT NULL;

-- Weekly availability schedule (when the salon is open)
CREATE TABLE booking_availability (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week           INT     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  open_time             TIME    NOT NULL DEFAULT '09:00',
  close_time            TIME    NOT NULL DEFAULT '18:00',
  slot_duration_minutes INT     NOT NULL DEFAULT 30,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(company_id, day_of_week)
);

-- RLS
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_owns_customers" ON customers
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "company_owns_booking_services" ON booking_services
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "company_owns_bookings" ON bookings
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "company_owns_availability" ON booking_availability
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ─── Site Config (website builder) ───────────────────────────────────────────

-- One config row per company — stores the choices made in the setup wizard
CREATE TABLE site_config (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template     TEXT        NOT NULL DEFAULT 'minimal',
  language     TEXT        NOT NULL DEFAULT 'sv' CHECK (language IN ('sv','en')),
  -- JSON object: { "booking":true, "blog":false, "gallery":true, ... }
  features     JSONB       NOT NULL DEFAULT '{"booking":true,"pricelist":true,"gallery":true,"contact":true,"blog":false,"reviews":false}',
  -- Editable website content (text, gallery images) set in the site editor
  content      JSONB       NOT NULL DEFAULT '{}',
  published    BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_owns_site_config" ON site_config
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Allow anonymous reads so the public booking page can look up config by slug
-- (joined through companies — service-role API routes bypass this anyway)
CREATE POLICY "public_read_companies" ON companies
  FOR SELECT USING (TRUE);

CREATE POLICY "public_read_booking_services" ON booking_services
  FOR SELECT USING (TRUE);

-- Allow anonymous INSERT so visitors can submit bookings without an account
CREATE POLICY "public_insert_bookings" ON bookings
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "public_insert_customers" ON customers
  FOR INSERT WITH CHECK (TRUE);

-- ─── Migration helpers (run these if schema already exists in Supabase) ───────
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
