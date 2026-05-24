-- Run this in the Supabase SQL editor to create all tables

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  city TEXT,
  phone TEXT,
  plan TEXT DEFAULT 'pro' CHECK (plan IN ('starter','pro','growth')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  google_place_id TEXT,
  reco_url TEXT,
  hitta_url TEXT,
  sms_sender TEXT DEFAULT 'Recensio',
  sms_timing_hours INTEGER DEFAULT 1,
  sms_template TEXT DEFAULT 'Hej {förnamn}! Tack för att du anlitade {företag}. Nöjd med jobbet? 30 sek 🙏',
  elks_username TEXT,
  elks_password_enc TEXT,
  postmark_token_enc TEXT,
  active BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner','member')),
  name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  platform TEXT DEFAULT 'google' CHECK (platform IN ('google','reco','hittaproffs','facebook')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','reviewed','private','stopped')),
  stars INTEGER CHECK (stars BETWEEN 1 AND 5),
  review_text TEXT,
  review_given_at TIMESTAMPTZ,
  sms_sent_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  custom_message TEXT,
  custom_campaign_id UUID,
  campaign_sent_id UUID,
  campaign_message TEXT,
  outbound_sms TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, phone)
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  timing_hours INTEGER DEFAULT 24,
  timing_after TEXT DEFAULT 'job',
  template TEXT NOT NULL,
  neg_filter BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  type TEXT NOT NULL CHECK (type IN ('outbound','campaign')),
  campaign_id UUID REFERENCES campaigns(id),
  message TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  elks_id TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed')),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  token TEXT UNIQUE NOT NULL,
  stars INTEGER CHECK (stars BETWEEN 1 AND 5),
  private_feedback TEXT,
  ip_address TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('google_calendar','outlook','hantverksdata','webhook')),
  config JSONB,
  active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_phone TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('sms_sent','opted_out','data_deleted')),
  legal_basis TEXT DEFAULT 'legitimate_interest',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users see only their own company's data)
CREATE POLICY "company_isolation" ON customers
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "company_isolation" ON campaigns
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "company_isolation" ON sms_log
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "company_isolation" ON review_responses
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "company_isolation" ON integrations
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "company_isolation" ON consent_log
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "own_company" ON companies
  USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));
