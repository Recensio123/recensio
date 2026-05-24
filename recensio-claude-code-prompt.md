# Recensio — Claude Code Prompt

## Vad du ska bygga

En SaaS-webbapplikation kallad **Recensio** för svenska serviceföretag (VVS, städning, bilverkstad m.fl.). Produkten automatiserar recensionsinsamling via SMS efter avslutade jobb och hanterar kampanjer, kundhistorik och affärssystemsintegrationer.

All design, layout och UX finns redan i `recensio.html` (bifogad). Bygg funktionalitet och backend som matchar den exakt — ändra inte design.

---

## Tech stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **Databas:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email/lösenord + magic link)
- **SMS:** 46elks REST API
- **E-post:** Postmark
- **Jobbkö:** Supabase pg_cron eller Inngest (för fördröjda SMS-utskick)
- **Deploy:** Vercel

---

## Databasschema

Skapa dessa tabeller i Supabase:

```sql
-- Företag (en rad per kund/abonnent)
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
  elks_password_enc TEXT, -- krypterat med AES-256
  postmark_token_enc TEXT,
  active BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Användare kopplade till företag
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner','member')),
  name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kunder
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
  custom_message TEXT, -- personligt utskick för denna kund
  custom_campaign_id UUID,
  campaign_sent_id UUID,
  campaign_message TEXT, -- kampanjtext som faktiskt skickades (snapshot)
  outbound_sms TEXT,     -- utskickstext som faktiskt skickades (snapshot)
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, phone)
);

-- Kampanjer
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  timing_hours INTEGER DEFAULT 24,
  timing_after TEXT DEFAULT 'job', -- 'job' | 'review'
  template TEXT NOT NULL,
  neg_filter BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Utskickslogg (immutable — raderas aldrig)
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

-- Inkommande svar (stjärnval från mellanlandningssida)
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

-- Integrationer
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('google_calendar','outlook','hantverksdata','webhook')),
  config JSONB, -- krypterade nycklar
  active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GDPR: samtyckeslogg
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

-- RLS (Row Level Security) — aktivera på alla tabeller
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

-- Policy: användare ser bara sitt eget företags data
CREATE POLICY "company_isolation" ON customers
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
-- Skapa liknande policies för alla tabeller
```

---

## Funktionalitet att bygga

### 1. Autentisering
- Registrering: namn, e-post, lösenord, företagsnamn
- Login med e-post/lösenord
- Magic link som alternativ
- Lösenordsåterställning via e-post
- Session hanteras av Supabase Auth (JWT)
- Middleware som skyddar alla `/dashboard`-rutter

### 2. SMS-flöde
```
Kund läggs till → schemalägg SMS (X timmar) →
Skicka via 46elks → logga i sms_log →
Kund klickar länk → mellanlandningssida (recensio.se/r/[token]) →
Väljer stjärnor → if ≥4: redirect till Google/Reco →
if <4: privat feedbackformulär → spara i review_responses
```

**Fördröjt SMS:** Använd Inngest eller Supabase pg_cron. Skapa en job vid kund-tillägg med `scheduled_for`-tid. Kör varje minut och skicka utestående SMS.

**46elks-anrop:**
```javascript
const response = await fetch('https://api.46elks.com/a1/sms', {
  method: 'POST',
  headers: { Authorization: 'Basic ' + btoa(`${username}:${password}`) },
  body: new URLSearchParams({
    from: company.sms_sender,
    to: normalizeSwedishPhone(customer.phone),
    message: renderTemplate(template, customer, company),
    whendelivered: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/elks-delivery`
  })
})
```

### 3. Mellanlandningssida (`/r/[token]`)
- Hämta review_response via token
- Visa företagsnamn och logotyp
- Stjärnväljare (1–5)
- Om ≥4: redirect till Google Place URL eller Reco-länk
- Om <4: visa textarea "Berätta vad som hände"
- Spara svar, uppdatera customer.status
- Sidan ska fungera utan inloggning (publik)
- Rate limit: max 3 försök per token

### 4. Dashboard (från `recensio.html`)
Bygg dessa vyer som Next.js-sidor under `/dashboard`:

- `/dashboard` → Kommande utskick
- `/dashboard/historik` → Kundhistorik
- `/dashboard/kampanjer` → Utskick & Kampanjer
- `/dashboard/kopplingar` → Kopplingar
- `/dashboard/installningar` → Inställningar

### 5. API-endpoints

```
POST /api/customers          – lägg till kund
PATCH /api/customers/[id]    – uppdatera kund
POST /api/customers/[id]/send-now  – skicka direkt
POST /api/customers/[id]/stop      – stoppa utskick

GET  /api/campaigns          – lista kampanjer
POST /api/campaigns          – skapa kampanj
PATCH /api/campaigns/[id]    – uppdatera
DELETE /api/campaigns/[id]   – ta bort

POST /api/review/[token]     – spara stjärnval (publik)
POST /api/review/[token]/feedback  – spara privat feedback (publik)

POST /api/webhooks/elks-delivery   – leveransstatus från 46elks
POST /api/webhooks/inbound         – inkommande SMS

GET  /api/integrations       – lista integrationer
POST /api/integrations       – spara integration
POST /api/integrations/[id]/sync   – trigga manuell sync

GET  /api/admin/clients      – admin: lista alla klienter
POST /api/admin/clients/[id]/config – admin: konfigurera klient
```

### 6. Webhook-endpoint (extern trigger)
```
POST /api/trigger/[company_token]
Authorization: Bearer [api_key]
Body: { name, phone, platform?, delay_hours? }
```
Validera API-nyckel mot databasen, lägg till kund, schemalägg SMS.

### 7. Google Kalender-integration
Implementera parsern från `parse-calendar-event.js` (bifogad).

Flöde:
1. OAuth2 med Google (NextAuth eller Googles oauth2-bibliotek)
2. Polling var 15:e minut med pg_cron
3. Hämta avslutade events sedan senaste sync
4. Parsa namn + telefon ur event-titel/beskrivning
5. Deduplicera mot `customers`-tabellen (unikt per phone + company_id)
6. Lägg till kund och schemalägg SMS

---

## GDPR & Säkerhet

### Kryptering
```javascript
// Kryptera känsliga API-nycklar innan de sparas i databasen
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY // 32 bytes hex

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':')
  const decipher = crypto.createDecipheriv('aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(ivHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]).toString()
}
```
Kryptera: `elks_password`, `postmark_token`, OAuth-tokens, alla integration-configs.

### Rate limiting
Installera `@upstash/ratelimit` + Upstash Redis. Applicera på:
- `/api/trigger/*` — 100 req/timme per API-nyckel
- `/api/review/*` — 5 req/timme per IP
- `/api/auth/*` — 10 req/15 min per IP

### Input-validering
Använd **Zod** för all input. Exempel:
```typescript
const CustomerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+46[0-9]{8,9}$/),
  platform: z.enum(['google','reco','hittaproffs','facebook']),
})
```

### GDPR-krav att implementera

**1. Rättslig grund**
Logga i `consent_log` varje gång ett SMS skickas med `legal_basis: 'legitimate_interest'` (befintlig kundrelation).

**2. Opt-out**
Varje SMS ska innehålla: "Svara STOPP för att avregistrera dig."
Inkommande "STOPP"-SMS via 46elks webhook → sätt `customer.status = 'opted_out'` → logga i `consent_log`.

**3. Rätt att bli glömd**
```
DELETE /api/gdpr/delete-customer/[id]
```
Anonymiserar kund: name → "Borttagen", phone → hash, nollställer review_text.
Loggar deletion i `consent_log`. Raderar ALDRIG `sms_log` (krävs för revision).

**4. Dataportabilitet**
```
GET /api/gdpr/export
```
Returnerar ZIP med all data för inloggat företag i JSON-format.

**5. Dataminimering**
- Spara aldrig mer än name, phone, platform per kund
- IP-adresser hashas med SHA-256 innan lagring
- Review-svar anonymiseras efter 2 år (pg_cron)

**6. Säkerhetsheaders**
Lägg till i `next.config.js`:
```javascript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com"
  }
]
```

**7. Datalagring**
- Databas: Supabase EU-region (Frankfurt)
- Postmark: EU-region
- Vercel: konfigurera Edge Runtime till eu-central-1

### Miljövariabler
Skapa `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=          # 64 tecken hex (openssl rand -hex 32)
POSTMARK_SERVER_TOKEN=
ELKS_USERNAME=           # Recensios eget 46elks-konto
ELKS_PASSWORD=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
NEXT_PUBLIC_URL=https://recensio.se
ADMIN_SECRET=            # För admin-API
```

---

## Admin-panel (`/admin`)

Skyddas av `ADMIN_SECRET` i Authorization-header (inte Supabase Auth).

Funktioner:
- Lista alla klienter med status och integrationsstatus
- Konfigurera 46elks och Postmark per klient (krypteras vid sparning)
- Aktivera/inaktivera klient
- Se SMS-logg per klient
- Trigga manuell kalender-sync

---

## Filstruktur

```
/app
  /page.tsx                    ← landningssida (från recensio.html)
  /r/[token]/page.tsx          ← mellanlandningssida
  /dashboard/
    /page.tsx                  ← kommande utskick
    /historik/page.tsx
    /kampanjer/page.tsx
    /kopplingar/page.tsx
    /installningar/page.tsx
  /admin/
    /page.tsx
    /clients/[id]/page.tsx
  /api/
    /customers/route.ts
    /campaigns/route.ts
    /review/[token]/route.ts
    /trigger/[token]/route.ts
    /webhooks/elks-delivery/route.ts
    /webhooks/inbound/route.ts
    /gdpr/delete-customer/[id]/route.ts
    /gdpr/export/route.ts
    /admin/clients/route.ts
/lib
  /supabase.ts
  /crypto.ts
  /46elks.ts
  /postmark.ts
  /phone.ts                    ← normalizeSwedishPhone()
  /calendar-parser.ts          ← från parse-calendar-event.js
  /rate-limit.ts
/middleware.ts                 ← auth-skydd + säkerhetsheaders
```

---

## Starta projektet

```bash
npx create-next-app@latest recensio --typescript --tailwind --app
cd recensio
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install inngest @upstash/ratelimit @upstash/redis
npm install zod postmark
npm install @googleapis/calendar
```

Bifogade filer att referera till:
- `recensio.html` — komplett design och UX
- `parse-calendar-event.js` — kalender-parser med tester

---

## Prioritetsordning

1. Supabase-schema + RLS-policies
2. Auth (login/registrering)
3. SMS-flöde (kund → schemaläggning → 46elks → mellanlandningssida)
4. Dashboard-vyer
5. Kampanjer
6. GDPR-endpoints
7. Integrationer (Google Kalender)
8. Admin-panel
