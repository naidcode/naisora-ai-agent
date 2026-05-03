-- ============================================
-- DATABASE SCHEMA V2 FOR NAISORA AI AGENT
-- ============================================

-- leads table
CREATE TABLE IF NOT EXISTS leads_v2 (
  id                  TEXT PRIMARY KEY, -- hash(name + phone/email)
  name                TEXT NOT NULL,
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  category            TEXT CHECK (category IN ('restaurant', 'cafe')),
  source              TEXT,

  contacted           BOOLEAN DEFAULT false,
  lastContactedAt     TIMESTAMPTZ,
  contactChannel      TEXT CHECK (contactChannel IN ('email', 'whatsapp')),
  
  -- NEW FIELDS
  score               INTEGER DEFAULT 0,
  do_not_engage       BOOLEAN DEFAULT false,

  createdAt           TIMESTAMPTZ DEFAULT NOW()
);

-- conversations table
CREATE TABLE IF NOT EXISTS conversations_v2 (
  id                  TEXT PRIMARY KEY,
  leadId              TEXT REFERENCES leads_v2(id),

  lastMessage         TEXT,
  isAutoReply         BOOLEAN DEFAULT false,
  isClosed            BOOLEAN DEFAULT false,

  messageCount        INTEGER DEFAULT 0,
  lastResponseTime    INTEGER, -- in milliseconds

  createdAt           TIMESTAMPTZ DEFAULT NOW()
);

-- errors table
CREATE TABLE IF NOT EXISTS errors_v2 (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module              TEXT NOT NULL,
  errorType           TEXT,
  message             TEXT,

  retryCount          INTEGER DEFAULT 0,
  occurrenceCount     INTEGER DEFAULT 1,
  resolved            BOOLEAN DEFAULT false,
  lastOccurrenceAt    TIMESTAMPTZ DEFAULT NOW(),
  createdAt           TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(module, message)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_v2_contacted ON leads_v2(contacted);
CREATE INDEX IF NOT EXISTS idx_conversations_v2_leadId ON conversations_v2(leadId);
CREATE INDEX IF NOT EXISTS idx_errors_v2_resolved ON errors_v2(resolved);
