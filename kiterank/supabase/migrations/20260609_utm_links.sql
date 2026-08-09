-- UTM links created by the link builder tool
CREATE TABLE utm_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  full_url    TEXT        NOT NULL,
  short_url   TEXT,
  source      TEXT        NOT NULL,
  medium      TEXT        NOT NULL,
  campaign    TEXT        NOT NULL,
  term        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE utm_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can manage their utm links"
  ON utm_links FOR ALL
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );
