-- Bokningssystemet, steg 2: personer, frånvaro och avbokningslänkar.
--
-- A salon's regulars come back to a person, not to the shop — so bookings
-- need staff, staff need schedules, and the booker needs a way to cancel
-- without calling. Run this in the Supabase SQL editor.

-- ── Staff ────────────────────────────────────────────────────────────────
-- schedule: {"1": {"start":"09:00","end":"18:00"}, ...} keyed by weekday
-- (0=Sunday). NULL = follows the salon's opening hours in booking_availability.
CREATE TABLE IF NOT EXISTS staff (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  title       TEXT,
  image       TEXT,
  schedule    JSONB,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS staff_company ON staff(company_id);

-- ── Blocked times ────────────────────────────────────────────────────────
-- Vacation, sick days, lunches. staff_id NULL = the whole salon is closed.
CREATE TABLE IF NOT EXISTS blocked_times (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  staff_id    UUID        REFERENCES staff(id) ON DELETE CASCADE,
  date_from   DATE        NOT NULL,
  date_to     DATE        NOT NULL,
  start_time  TIME,       -- NULL = whole day
  end_time    TIME,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS blocked_times_company_date ON blocked_times(company_id, date_from, date_to);

-- ── Bookings: who serves it, where it came from, how it is cancelled ─────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id       UUID REFERENCES staff(id) ON DELETE SET NULL;
-- The marketing channel the visitor arrived from (utm_source), so the
-- dashboard can say what each channel is worth in booked kronor. Separate
-- from `source`, which says HOW the booking was made (online/phone/walk-in).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_channel TEXT;
-- The reference shown to the customer, and the secret that lets them cancel.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_ref    TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_token   UUID DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS bookings_cancel_token ON bookings(cancel_token);
CREATE INDEX IF NOT EXISTS bookings_staff_date   ON bookings(staff_id, booking_date);

-- ── RLS: owners manage their own rows; the public API uses the service key ─
ALTER TABLE staff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_owns_staff" ON staff
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "company_owns_blocked_times" ON blocked_times
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ── Repair: the booking tables shipped without table grants ─────────────
-- Even the service key gets "permission denied for table bookings", so no
-- booking has ever been written. RLS still decides WHO may do WHAT — these
-- grants only let the roles reach the tables at all, which is Supabase's
-- own default for every table.
GRANT ALL ON public.bookings, public.customers, public.booking_services,
             public.booking_availability, public.staff, public.blocked_times
  TO anon, authenticated, service_role;
