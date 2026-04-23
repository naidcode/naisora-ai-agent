-- ============================================
-- DATABASE SCHEMA FOR AGENCY AI AGENT
-- ============================================
-- Run this SQL in your Supabase dashboard:
-- 1. Go to supabase.com → your project
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Paste this entire file and click "Run"
-- ============================================


-- ============================================
-- TABLE 1: leads
-- Every potential client you contact
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Contact info
  name                TEXT,
  email               TEXT UNIQUE NOT NULL,
  phone               TEXT,
  
  -- Business info
  business_name       TEXT NOT NULL,
  business_type       TEXT,          -- clinic, restaurant, salon, shop, etc.
  city                TEXT,
  website             TEXT,          -- their current website (if any)
  
  -- Lead tracking
  source              TEXT DEFAULT 'google_maps',  -- where we found them
  status              TEXT DEFAULT 'new',
  -- Status values:
  -- new → contacted → followup_1 → followup_2
  -- → interested (🔥) / not_interested / client
  
  -- Email tracking
  email_subject       TEXT,          -- subject of email we sent them
  reply_content       TEXT,          -- what they replied (if they did)
  reply_intent        TEXT,          -- interested / question / not_interested
  
  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  last_contacted_at   TIMESTAMPTZ,
  interested_at       TIMESTAMPTZ,
  
  -- Notes
  notes               TEXT
);

-- Speed up common queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_last_contacted ON leads(last_contacted_at);


-- ============================================
-- TABLE 2: clients
-- When a lead converts → becomes a client
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id             UUID REFERENCES leads(id),
  
  -- Client info
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  business_name       TEXT,
  city                TEXT,
  
  -- Project info
  project_type        TEXT,          -- basic, ecommerce, business, etc.
  project_description TEXT,
  agreed_price        DECIMAL(10, 2),
  
  -- Onboarding
  brand_colors        TEXT,
  fonts               TEXT,
  competitors         TEXT,
  target_audience     TEXT,
  content_ready       BOOLEAN DEFAULT false,
  
  -- Project status
  project_status      TEXT DEFAULT 'onboarding',
  -- onboarding → in_progress → review → delivered → complete
  
  notion_project_url  TEXT,          -- link to their Notion project board
  
  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  deadline            DATE,
  delivered_at        TIMESTAMPTZ,
  
  notes               TEXT
);


-- ============================================
-- TABLE 3: invoices
-- Track all payments
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id           UUID REFERENCES clients(id),
  
  invoice_number      TEXT UNIQUE,
  amount              DECIMAL(10, 2) NOT NULL,
  description         TEXT,
  
  -- Status
  status              TEXT DEFAULT 'pending',
  -- pending → sent → paid → overdue
  
  -- Dates
  issued_at           TIMESTAMPTZ DEFAULT NOW(),
  due_date            DATE,
  paid_at             TIMESTAMPTZ,
  
  -- Reminder tracking
  reminder_1_sent     BOOLEAN DEFAULT false,  -- day 1
  reminder_2_sent     BOOLEAN DEFAULT false,  -- day 3
  reminder_3_sent     BOOLEAN DEFAULT false,  -- day 7
  
  razorpay_link       TEXT,
  notes               TEXT
);


-- ============================================
-- TABLE 4: email_log
-- Track every email sent (for reporting)
-- ============================================
CREATE TABLE IF NOT EXISTS email_log (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id             UUID REFERENCES leads(id),
  
  email_type          TEXT,    -- cold_email / followup_1 / followup_2 / reply
  to_email            TEXT,
  subject             TEXT,
  
  sent_at             TIMESTAMPTZ DEFAULT NOW(),
  success             BOOLEAN DEFAULT true,
  gmail_message_id    TEXT
);


-- ============================================
-- TABLE 5: competitors
-- Track rival agencies in your city
-- ============================================
CREATE TABLE IF NOT EXISTS competitors (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  agency_name         TEXT NOT NULL,
  website             TEXT NOT NULL,
  city                TEXT,
  
  -- What we track
  last_checked_at     TIMESTAMPTZ,
  last_portfolio_update TEXT,
  pricing_info        TEXT,
  recent_changes      TEXT,
  
  -- Is this competitor active to track?
  is_active           BOOLEAN DEFAULT true,
  
  created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- USEFUL VIEWS (for your weekly report)
-- ============================================

-- This week's leads
CREATE OR REPLACE VIEW weekly_leads AS
SELECT * FROM leads 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- All hot leads (interested but not closed)
CREATE OR REPLACE VIEW hot_leads AS
SELECT * FROM leads 
WHERE status = 'interested'
ORDER BY interested_at DESC;

-- All unpaid invoices
CREATE OR REPLACE VIEW unpaid_invoices AS
SELECT i.*, c.name, c.email, c.business_name
FROM invoices i
JOIN clients c ON i.client_id = c.id
WHERE i.status IN ('sent', 'overdue')
ORDER BY i.due_date ASC;


-- ============================================
-- DONE! Your database is ready.
-- ============================================
-- Next: Add your .env API keys and run:
-- node index.js
-- ============================================
