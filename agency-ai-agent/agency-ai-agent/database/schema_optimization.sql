-- ============================================
-- NAISORA AI GROWTH OS — OPTIMIZATION TABLES
-- Run this in your Supabase SQL Editor
-- This version adds missing columns to the 'leads' table first
-- ============================================

-- ─── 0. FIX 'leads' TABLE SCHEMA ─────────────────────────────────────────────
-- Ensures all columns required by the Agent exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_category      TEXT DEFAULT 'cold';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score         INT DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach_status     TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach_channel    TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_count      INT DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS area                TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS category            TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_website         BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gbp_verified        BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rating              NUMERIC(3,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_count        INT DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_maps_url     TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_reasons       TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scraped_at          TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS processed_at        TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS interested_at       TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reply_received_at   TIMESTAMPTZ;

-- ─── 1. outreach_variants ────────────────────────────────────────────────────────
-- Stores A/B message templates & their aggregate performance
CREATE TABLE IF NOT EXISTS outreach_variants (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  variant     TEXT NOT NULL,           -- 'A' or 'B'
  message     TEXT NOT NULL,           -- The outreach message template
  sent        INT  DEFAULT 0,
  replies     INT  DEFAULT 0,
  reply_rate  NUMERIC(5,2) DEFAULT 0,
  is_winner   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. system_config ────────────────────────────────────────────────────────────
-- Global key-value store for the AI Growth OS
CREATE TABLE IF NOT EXISTS system_config (
  key         TEXT PRIMARY KEY,        -- e.g. 'active_outreach_variant'
  value       TEXT,                    -- e.g. 'A'
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. blog_scores ──────────────────────────────────────────────────────────────
-- SEO quality scores for each blog post
CREATE TABLE IF NOT EXISTS blog_scores (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id      UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  score        INT,                    -- 0–100 SEO quality score
  weaknesses   TEXT[],                 -- Array of detected weaknesses
  quick_fixes  TEXT[],                 -- Suggested quick fixes
  last_checked TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_scores_blog_id ON blog_scores(blog_id);

-- ─── 4. blog_performance ─────────────────────────────────────────────────────────
-- Tracks ranking status over time for each published blog
CREATE TABLE IF NOT EXISTS blog_performance (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id     UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  keyword     TEXT,
  status      TEXT DEFAULT 'tracking', -- tracking / ranked / stale
  position    INT,                     -- Google ranking position
  clicks      INT DEFAULT 0,
  impressions INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. outreach_improvements ────────────────────────────────────────────────────
-- Memory store for self-improver evolution history
CREATE TABLE IF NOT EXISTS outreach_improvements (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  improvement_data JSONB,              -- { improved_message, ab_variation, reasoning }
  status           TEXT DEFAULT 'active', -- active / archived
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. optimization_history ─────────────────────────────────────────────────────
-- Cycle-by-cycle memory for the Strategic Optimization Engine
CREATE TABLE IF NOT EXISTS optimization_history (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy             TEXT,           -- e.g. 'FOCUS_LEAD_GENERATION'
  outreach_reply_rate  NUMERIC(5,2),
  outreach_winner      TEXT,
  blogs_improved       INT DEFAULT 0,
  hot_leads            INT DEFAULT 0,
  active_clients       INT DEFAULT 0,
  revenue_total        NUMERIC(12,2),
  timestamp            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opt_history_timestamp ON optimization_history(timestamp DESC);

-- ─── 7. mini_audits ──────────────────────────────────────────────────────────────
-- Stores AI-generated mini audits sent to leads
CREATE TABLE IF NOT EXISTS mini_audits (
  id                         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id                    UUID REFERENCES leads(id) ON DELETE CASCADE,
  score                      INT,
  issues                     TEXT[],
  top_keyword                TEXT,
  estimated_missed_customers INT,
  opportunity                TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mini_audits_lead_id ON mini_audits(lead_id);

-- ─── Seed initial system config ───────────────────────────────────────────────
INSERT INTO system_config (key, value)
VALUES ('active_outreach_variant', 'A')
ON CONFLICT (key) DO NOTHING;

-- ─── Add variant column to outreach_log ───────────────────────────────────────
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS variant TEXT;
CREATE INDEX IF NOT EXISTS idx_outreach_log_variant ON outreach_log(variant);

-- ─── Extra lead status index for fast filtering ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_outreach_status ON leads(outreach_status);
CREATE INDEX IF NOT EXISTS idx_leads_interested_at   ON leads(interested_at DESC);

-- ============================================
-- DONE! Run this UPDATED script in Supabase.
-- ============================================
