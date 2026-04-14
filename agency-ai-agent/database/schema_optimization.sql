-- ============================================
-- NAISORA AI GROWTH OS — OPTIMIZATION TABLES
-- Run this in your Supabase SQL Editor
-- Append to your existing schema.sql
-- ============================================

-- ─── outreach_variants ────────────────────────────────────────────────────────
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

-- ─── system_config ────────────────────────────────────────────────────────────
-- Global key-value store for the AI Growth OS
-- The brain reads/writes here to persist decisions
CREATE TABLE IF NOT EXISTS system_config (
  key         TEXT PRIMARY KEY,        -- e.g. 'active_outreach_variant'
  value       TEXT,                    -- e.g. 'A'
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── blog_scores ──────────────────────────────────────────────────────────────
-- SEO quality scores for each blog post (updated each optimization cycle)
CREATE TABLE IF NOT EXISTS blog_scores (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id      UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  score        INT,                    -- 0–100 SEO quality score
  weaknesses   TEXT[],                 -- Array of detected weaknesses
  quick_fixes  TEXT[],                 -- Suggested quick fixes
  last_checked TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_scores_blog_id ON blog_scores(blog_id);

-- ─── blog_performance ─────────────────────────────────────────────────────────
-- Tracks ranking status over time for each published blog
CREATE TABLE IF NOT EXISTS blog_performance (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id     UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  keyword     TEXT,
  status      TEXT DEFAULT 'tracking', -- tracking / ranked / stale
  position    INT,                     -- Google ranking position (null = not tracked)
  clicks      INT DEFAULT 0,
  impressions INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── outreach_improvements ────────────────────────────────────────────────────
-- Memory store for self-improver evolution history
CREATE TABLE IF NOT EXISTS outreach_improvements (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  improvement_data JSONB,              -- { improved_message, ab_variation, reasoning }
  status           TEXT DEFAULT 'active', -- active / archived
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── optimization_history ─────────────────────────────────────────────────────
-- Cycle-by-cycle memory for the Strategic Optimization Engine
-- Used to detect trends across runs and adjust strategy dynamically
CREATE TABLE IF NOT EXISTS optimization_history (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy             TEXT,           -- e.g. 'FOCUS_LEAD_GENERATION', 'BALANCED_GROWTH'
  outreach_reply_rate  NUMERIC(5,2),   -- reply rate at time of this cycle
  outreach_winner      TEXT,           -- 'A' or 'B'
  blogs_improved       INT DEFAULT 0,  -- how many blogs were auto-improved
  hot_leads            INT DEFAULT 0,
  active_clients       INT DEFAULT 0,
  revenue_total        NUMERIC(12,2),  -- 30-day revenue at time of this cycle
  timestamp            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opt_history_timestamp ON optimization_history(timestamp DESC);

-- ─── Seed initial system config ───────────────────────────────────────────────
INSERT INTO system_config (key, value)
VALUES ('active_outreach_variant', 'A')
ON CONFLICT (key) DO NOTHING;

-- ─── Add variant column to outreach_log ───────────────────────────────────────
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS variant TEXT;
CREATE INDEX IF NOT EXISTS idx_outreach_log_variant ON outreach_log(variant);

-- ─── mini_audits ──────────────────────────────────────────────────────────────
-- Stores AI-generated mini audits sent to leads as proof of expertise
CREATE TABLE IF NOT EXISTS mini_audits (
  id                         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id                    UUID REFERENCES leads(id) ON DELETE CASCADE,
  score                      INT,                      -- 0-100 site score
  issues                     TEXT[],                   -- array of detected issues
  top_keyword                TEXT,                     -- main keyword they should rank for
  estimated_missed_customers INT,                      -- est. monthly searches missed
  opportunity                TEXT,                     -- one-line upside statement
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mini_audits_lead_id ON mini_audits(lead_id);

-- ─── Extra lead status index for fast filtering ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_outreach_status ON leads(outreach_status);
CREATE INDEX IF NOT EXISTS idx_leads_interested_at   ON leads(interested_at DESC);

-- ============================================
-- DONE! All optimization + acquisition tables ready.
-- Run schema_optimization.sql ONCE in Supabase SQL Editor.
-- ============================================
