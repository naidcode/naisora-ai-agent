# NAISORA DASHBOARD — FULL BUILD PROMPT FOR ANTIGRAVITY

---

## WHO YOU ARE BUILDING FOR

You are building a **full-stack internal dashboard** for **Naisora** — an AI-powered web design agency in Bangalore run by a solo founder named Nahid. Nahid has already built a 92-module AI agent in Node.js that handles lead scraping, WhatsApp outreach, email outreach, Instagram DMs, SEO auditing, blog writing, content creation, and client reporting. All agent data is stored in Supabase.

This dashboard is the **complete operating system** for Naisora. Everything Nahid currently does in VS Code, Railway, terminal, Supabase dashboard, Telegram, and GitHub — he will now do entirely from this dashboard. He will never need to open a terminal again for daily operations.

---

## TECH STACK — FOLLOW THIS EXACTLY

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (already set up) |
| Real-time | Supabase Realtime |
| Auth | Supabase Auth (email + password, single user) |
| Backend API | Node.js (separate existing agent — connect via REST API) |
| Terminal in browser | xterm.js |
| Code editor in browser | Monaco Editor |
| Charts | Recharts |
| Live log streaming | Socket.io |
| Git operations | simple-git (npm package) |
| PDF generation | PDFKit (npm package) |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Hosting (dashboard) | Vercel |
| Hosting (agent) | Railway (already deployed) |

---

## PROJECT STRUCTURE

```
naisora-dashboard/
│
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← sidebar + topbar layout
│   │   ├── page.tsx                ← Overview (home)
│   │   ├── history/
│   │   │   └── page.tsx
│   │   ├── leads/
│   │   │   └── page.tsx
│   │   ├── outreach/
│   │   │   └── page.tsx
│   │   ├── content/
│   │   │   └── page.tsx
│   │   ├── seo/
│   │   │   └── page.tsx
│   │   ├── ai-models/
│   │   │   └── page.tsx
│   │   ├── revenue/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── alerts/
│   │   │   └── page.tsx
│   │   ├── client-portal/
│   │   │   └── page.tsx
│   │   ├── agent-control/
│   │   │   └── page.tsx
│   │   ├── terminal/
│   │   │   └── page.tsx
│   │   ├── command-library/
│   │   │   └── page.tsx
│   │   ├── file-manager/
│   │   │   └── page.tsx
│   │   ├── code-editor/
│   │   │   └── page.tsx
│   │   ├── env-manager/
│   │   │   └── page.tsx
│   │   ├── database-viewer/
│   │   │   └── page.tsx
│   │   ├── deployment/
│   │   │   └── page.tsx
│   │   ├── log-viewer/
│   │   │   └── page.tsx
│   │   ├── debugger/
│   │   │   └── page.tsx
│   │   ├── tasks/
│   │   │   └── page.tsx
│   │   ├── pipeline/
│   │   │   └── page.tsx
│   │   ├── proposals/
│   │   │   └── page.tsx
│   │   ├── ab-testing/
│   │   │   └── page.tsx
│   │   ├── opportunity-radar/
│   │   │   └── page.tsx
│   │   ├── prompt-manager/
│   │   │   └── page.tsx
│   │   ├── scheduler/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   └── api/
│       ├── agent/route.ts          ← proxy to Railway agent
│       ├── alerts/route.ts
│       ├── leads/route.ts
│       ├── content/route.ts
│       ├── seo/route.ts
│       ├── reports/route.ts
│       └── pdf/route.ts
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── NotificationBell.tsx
│   ├── shared/
│   │   ├── StatCard.tsx
│   │   ├── AlertBadge.tsx
│   │   ├── LiveLogViewer.tsx
│   │   ├── DatePicker.tsx
│   │   ├── ResultPanel.tsx
│   │   └── PDFExportButton.tsx
│   └── pages/
│       ├── overview/
│       ├── leads/
│       ├── content/
│       ├── seo/
│       └── [one folder per page]
│
├── lib/
│   ├── supabase.ts                 ← Supabase client
│   ├── agent-api.ts                ← calls to Railway agent
│   ├── pdf.ts                      ← PDF generation helpers
│   └── socket.ts                   ← Socket.io client
│
├── hooks/
│   ├── useAlerts.ts
│   ├── useAgentStatus.ts
│   └── useRealtime.ts
│
├── types/
│   └── index.ts                    ← all TypeScript types
│
├── .env.local
├── package.json
└── next.config.js
```

---

## SUPABASE SCHEMA

Create these tables in Supabase exactly:

```sql
-- Leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  phone text,
  email text,
  city text,
  google_maps_url text,
  score integer,
  status text default 'new',   -- new, contacted, hot, cold, closed, not_interested
  source text,                  -- scraper, walk_in, manual
  notes text,
  owner_name text,
  website_url text,
  instagram_url text,
  zomato_url text,
  last_contacted_at timestamptz,
  follow_up_date date,
  walk_in_reaction text,        -- interested, not_now, call_back, rejected
  ai_summary text               -- AI-generated summary of this lead
);

-- Lead Memory (full timeline per lead)
create table lead_memory (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  created_at timestamptz default now(),
  event_type text,              -- outreach_sent, replied, visited_site, call_done, note_added
  channel text,                 -- whatsapp, email, instagram, walk_in
  message_sent text,
  reply_received text,
  notes text
);

-- Outreach
create table outreach (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id),
  channel text,                 -- whatsapp, email, instagram
  status text,                  -- sent, delivered, failed, replied
  message text,
  error_reason text,
  is_follow_up boolean default false,
  attempt_number integer default 1
);

-- Content
create table content (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  type text,                    -- blog, hook, script, carousel, caption
  title text,
  body text,
  topic text,
  keyword text,
  client text,
  yoast_score integer,
  hook_strength_score integer,
  status text default 'draft',  -- draft, approved, published, rejected
  published_at timestamptz,
  wordpress_post_id text,
  scheduled_for timestamptz
);

-- SEO Audits
create table seo_audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  client text,
  url text,
  pagespeed_score integer,
  seo_score integer,
  schema_valid boolean,
  meta_title text,
  meta_description text,
  keyword text,
  competitor_url text,
  competitor_score integer,
  issues jsonb
);

-- Alerts
create table alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  type text,
  priority text,                -- info, warning, critical
  title text,
  message text,
  module text,
  metadata jsonb,
  pdf_url text,
  is_read boolean default false
);

-- AI Model Usage
create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  model text,                   -- claude-sonnet, claude-haiku, groq
  module text,
  tokens_used integer,
  cost_inr numeric,
  task_type text
);

-- Agent Brain Log (every AI decision)
create table brain_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  module text,
  decision text,
  reason text,
  outcome text
);

-- Clients (paying clients, not leads)
create table clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  restaurant_name text,
  phone text,
  email text,
  website_url text,
  plan text,                    -- web_only, retainer, automation
  monthly_fee numeric,
  started_at date,
  status text default 'active', -- active, at_risk, churned
  source text                   -- walk_in, whatsapp, instagram
);

-- Revenue
create table revenue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  client_id uuid references clients(id),
  amount numeric,
  type text,                    -- setup, retainer, automation
  month text,
  paid boolean default false
);

-- Proposals
create table proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id),
  content text,
  view_token text unique,
  viewed_at timestamptz,
  time_spent_seconds integer,
  status text default 'sent'    -- sent, viewed, accepted, rejected
);

-- A/B Tests
create table ab_tests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  message_a text,
  message_b text,
  channel text,
  sent_a integer default 0,
  sent_b integer default 0,
  replies_a integer default 0,
  replies_b integer default 0,
  conversions_a integer default 0,
  conversions_b integer default 0,
  winner text,                  -- A, B, or null (still running)
  status text default 'running' -- running, completed
);

-- Scheduler
create table schedules (
  id uuid primary key default gen_random_uuid(),
  module text,
  time text,                    -- "09:00"
  frequency text,               -- daily, weekly
  day_of_week text,             -- for weekly
  is_active boolean default true,
  last_run timestamptz
);

-- Saved Command Results
create table saved_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  command text,
  category text,
  title text,
  output text,
  pdf_url text
);

-- Walk-in Visits
create table walkin_visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  restaurant_name text,
  owner_name text,
  phone text,
  address text,
  reaction text,                -- interested, not_now, call_back, rejected
  notes text,
  follow_up_date date,
  lead_id uuid references leads(id)
);

-- Prompt Manager
create table prompts (
  id uuid primary key default gen_random_uuid(),
  module text unique,
  prompt_text text,
  updated_at timestamptz default now()
);
```

---

## PAGE-BY-PAGE SPECIFICATIONS

---

### PAGE 1 — OVERVIEW (Home)

**Purpose:** First thing Nahid sees every day. Full picture of what happened and what needs attention.

**Sections to build:**

**A. Agent Status Bar (top)**
- Agent status: RUNNING (green) / STOPPED (red) / RESTARTING (yellow)
- Uptime display (e.g., "6h 42m")
- Quick buttons: Start Agent, Stop Agent, Restart Agent
- Railway connection status

**B. Today's Stats (stat cards row)**
- Leads scraped today
- WhatsApp messages sent today
- Emails sent today
- Content pieces created today
- SEO audits run today
- AI cost today (in ₹)

**C. Smart Suggestions Panel**
- Call Claude API with today's Supabase data
- Show 3 action items AI recommends
- Examples: "5 leads not followed up in 7 days", "Hot lead replied — act now"
- Each suggestion has a quick action button

**D. Daily Target Tracker**
- Walk-ins planned vs done
- Leads to follow up: pending vs done
- Content to approve: pending vs done
- Progress bar showing overall day completion %

**E. Live Activity Feed**
- Real-time stream of agent activity (Supabase Realtime)
- Shows last 20 events with timestamp, module name, and event description
- Color coded: green = success, red = error, yellow = warning

**F. My Tasks (urgent items)**
- Pulls all pending manual tasks
- Sorted by priority: URGENT → TODAY → THIS WEEK
- Click any task → goes to that category page

---

### PAGE 2 — HISTORY

**Purpose:** See everything that happened on any past date.

**Sections:**

**A. Calendar Heatmap**
- GitHub-style contribution calendar
- Darker color = more activity that day
- Click any date → loads that day's full breakdown

**B. Day Breakdown (loads when date clicked)**
- Tabs: Leads | Outreach | Content | SEO | Alerts | AI Usage
- Each tab shows exactly what happened that day
- Same layout as Today view but for past data

**C. Export Options**
- Download full day report as PDF
- Download all alerts of that day as PDF

---

### PAGE 3 — LEADS

**Purpose:** All leads with full detail, pipeline view, and manual work panel.

**Tabs: [ Today ] [ All Leads ] [ Pipeline ] [ Walk-ins ] [ Manual Work ]**

**Today tab:**
- Leads scraped today with scores
- New hot leads highlighted

**All Leads tab:**
- Full table: Name, City, Score, Status, Last Contacted, Channel
- Filters: City, Score range, Status, Source
- Search bar
- Click any lead → opens Lead Intelligence Card (side panel)

**Lead Intelligence Card (side panel on click):**
- Restaurant name, owner, phone, email, website
- Score with breakdown (why this score)
- Score timeline graph (score change over time)
- Full memory timeline (every interaction ever)
- AI summary of lead
- Next best action suggestion
- Quick actions: Send WhatsApp, Send Email, Add Note, Mark Status, Schedule Follow-up

**Pipeline tab (Conversion Funnel):**
- Visual funnel: Scraped → Contacted → Replied → Meeting → Closed
- Count and % at each stage
- Drop-off % between each stage (highlighted in red if high)
- Clicking any stage filters leads table to that stage

**Walk-ins tab:**
- Log a new walk-in form: Restaurant name, owner name, phone, address, reaction, notes, follow-up date
- Table of all past walk-ins
- Auto-creates lead in leads table on submit

**Manual Work tab:**
- Add manual lead form
- Review hot leads needing attention
- Add notes to leads
- Change lead status

---

### PAGE 4 — OUTREACH

**Purpose:** All outreach activity, WhatsApp conversation viewer, and controls.

**Tabs: [ Today ] [ WhatsApp ] [ Email ] [ Instagram ] [ Manual Work ]**

**Today tab:**
- WhatsApp sent count, delivered count, failed count
- Email sent count, failed count
- Instagram DM count
- Failed attempts table with reason

**WhatsApp tab:**
- List of all leads contacted via WhatsApp
- Click any lead → shows full conversation thread (all messages sent and replies received)
- Reply directly from dashboard (sends via Twilio)
- Filter: All, Delivered, Failed, Replied

**Email tab:**
- All emails sent with subject, lead, status
- Open rate if tracked

**Instagram tab:**
- All DMs sent with status

**Manual Work tab:**
- Edit message templates before next batch
- Pause / resume outreach toggle
- Approve new outreach sequence before it runs
- Preview any message before sending

---

### PAGE 5 — CONTENT

**Purpose:** All AI-generated content with review, approval, and publishing workflow.

**Tabs: [ Today ] [ All Content ] [ Calendar ] [ Manual Work ] [ Saved Results ]**

**Today tab:**
- Content generated today: blogs, hooks, scripts, carousels
- Each item shows: title, type, yoast score, status
- Pending approval items highlighted

**All Content tab:**
- Full table of all content ever created
- Filter by: type, status, client, date
- Click any row → opens full content preview

**Content preview panel:**
- Full text shown
- Yoast score, hook strength score
- Status badge
- Buttons: Approve → publishes to WordPress, Reject, Edit, Save as PDF

**Calendar tab:**
- Visual calendar showing scheduled content
- Drag and drop to reschedule
- Click any day → see what's scheduled

**Manual Work tab:**
- Blog editor (rich text) — edit AI draft before approving
- Hook picker — see 5 AI-generated hooks, select best one
- Choose which content goes out this week
- Upload photos/videos for posts

**Saved Results tab:**
- All content saved from Command Library or Terminal
- Filter by type
- Copy or download any saved result

---

### PAGE 6 — SEO

**Purpose:** Per-client SEO tracking, audits, keyword research, competitor monitoring.

**Tabs: [ Today ] [ Per Client ] [ Keywords ] [ Competitor Watch ] [ Manual Work ]**

**Today tab:**
- Audits run today
- Score changes from yesterday
- Any alerts from SEO module

**Per Client tab:**
- Client selector dropdown
- Shows: PageSpeed score, SEO score, schema status, meta title/description
- Score history graph (line chart over time)
- Issues list with severity

**Keywords tab:**
- Per client keyword list
- Ranking position (if tracked)
- Keyword suggestions from AI

**Competitor Watch tab:**
- Side-by-side comparison: client score vs competitor score
- Line chart: both scores over time
- Alert when competitor gains ranking
- Alert when competitor publishes new content

**Manual Work tab:**
- Write meta title and meta description for any page
- Confirm or change target keyword per blog
- Approve/reject AI keyword suggestions
- Add new client URL to tracking
- Mark a page as optimized

---

### PAGE 7 — AI MODELS

**Purpose:** Track every AI model's usage, cost, and module routing.

**Sections:**

**A. Usage Overview**
- Today's tokens used: Claude Sonnet | Claude Haiku | Groq
- Today's cost in ₹ for each model
- Bar chart: usage by module

**B. Per Module Breakdown table**
- Module name | Model used | Tokens | Cost | Task type

**C. Cost Tracker**
- Daily cost line chart (last 30 days)
- Monthly cost projection
- Alert threshold setter (e.g., alert if daily cost exceeds ₹500)

**D. Model Router Config**
- Table showing which model handles which module
- Dropdown to change model per module
- Save changes → updates agent config

---

### PAGE 8 — REVENUE

**Purpose:** Simple CRM + revenue tracker.

**Sections:**

**A. Revenue Stats**
- MRR (monthly recurring revenue)
- This month's revenue vs last month
- Revenue by plan type (web only, retainer, automation)

**B. Client Pipeline**
- Visual stages: Lead → Proposal Sent → Closed → Retainer Active
- Drag leads between stages
- Shows which acquisition channel brought each client

**C. Clients Table**
- Active clients with: name, restaurant, plan, monthly fee, start date, status
- Status: Active (green), At Risk (yellow), Churned (red)
- Click client → full client detail panel

**D. Churn Risk Detector**
- Clients flagged as "at risk" based on: drop in SEO activity, no reports sent, no contact in 30 days
- Action button: "Send check-in WhatsApp"

**E. Zomato Commission Calculator**
- Input: Monthly Zomato orders (₹)
- Auto shows: Zomato commission (30%), Naisora retainer cost, Monthly saving, Annual saving
- This is used inside proposals

---

### PAGE 9 — REPORTS

**Purpose:** View, download, and manage all generated reports.

**Sections:**

**A. Monthly Reports**
- List of all monthly PDF reports generated
- Per client
- Preview in browser or download

**B. Daily Summaries**
- List of all daily summary PDFs
- Filter by date

**C. Weekly Self-Improvement Report**
- What worked best this week
- What failed
- What to change
- Generated by Claude API using Supabase data
- Shown as readable card, also downloadable as PDF

**D. Custom Report Generator**
- Select client + date range → generate custom report → download PDF

---

### PAGE 10 — ALERTS

**Purpose:** Replace Telegram completely. All alerts live here with PDF storage.

**Sections:**

**A. Notification Bell (in topbar)**
- Red badge with unread count
- Dropdown: last 10 alerts
- Each alert: icon, title, time, "View PDF" button

**B. Alerts Page — Full View**
- Filter by: date, priority (info/warning/critical), module, type
- Search bar
- Table: Time | Module | Alert | Priority | PDF
- Click row → full alert detail panel
- Download PDF per alert

**C. Alert History**
- Calendar view — click any past date
- See all alerts that fired that day
- Download all alerts of that day as one merged PDF

**D. Bulk Export**
- Select date range → "Export All as ZIP"

**Alert Priority Colors:**
- Critical: Red
- Warning: Yellow
- Info: Blue/Green

**Alert Types to handle:**
- agent_started, agent_crashed, lead_scraped, whatsapp_sent, whatsapp_failed, email_sent, email_failed, blog_published, seo_audit_done, api_limit_near, cost_spike, module_retried, daily_summary, hot_lead_detected, proposal_viewed, client_at_risk

---

### PAGE 11 — CLIENT PORTAL

**Purpose:** Each restaurant client gets read-only login to see their own data.

**How it works:**
- Nahid creates a client account from this page
- Client gets email with login link
- Client logs in and sees ONLY their data

**What clients see:**
- Their SEO score history graph
- Their blog posts published
- Monthly report PDF download
- WhatsApp/email outreach sent to their leads
- Zomato savings calculator

**Nahid's view of Client Portal page:**
- List of all client portal accounts
- Create new client account
- Revoke access
- See last login time per client

---

### PAGE 12 — AGENT CONTROL

**Purpose:** Start, stop, restart, and monitor the agent. All lifecycle management.

**Sections:**

**A. Status Panel**
- Agent status (running/stopped/restarting)
- Uptime
- Railway connection
- Memory and CPU usage (via Railway API)
- Last restart time

**B. Control Buttons**
- Start Agent
- Stop Agent
- Restart Agent
- View Live Logs (links to Log Viewer page)

**C. Module Health Table**
- All 92 modules listed
- Last run time per module
- Status: OK / Failed / Never Run
- Run any single module manually from here

**D. API Rate Limits**
- Twilio: usage vs limit
- Claude API: tokens used today vs limit
- Groq: usage vs limit

---

### PAGE 13 — TERMINAL

**Purpose:** Full browser terminal replacing VS Code terminal completely.

**Implementation:**
- Use xterm.js library
- Connect to backend WebSocket that runs actual shell commands on Railway
- Commands typed here run against the agent server

**Features:**
- Full keyboard support
- Press ↑ to cycle through command history
- Press Tab for autocomplete (common commands pre-loaded)
- Color coded output: green = success, red = error, yellow = warning
- Copy button for any output
- Clear button
- Save session as PDF
- Preset command buttons at top (Run Scraper, Run Blog, Run Audit, etc.)

---

### PAGE 14 — COMMAND LIBRARY

**Purpose:** All agent commands listed by category. Copy and run without typing.

**Layout:**
- Category filter tabs: [All] [Content] [SEO] [Leads] [Outreach] [Reports] [System]
- Search bar
- Each command shown as a card

**Command Card structure:**
```
Category badge
Command name (bold)
Description (one line)
Command syntax (code block)
[ Copy ] [ Run ] [ Customize & Run ]
```

**Customize & Run behavior:**
- Opens a small form panel
- Form fields auto-generated from command parameters
- Command preview updates live as user fills form
- Run button submits → result appears in Result Panel below

**Result Panel (shown after every command runs):**
- Full output displayed
- Time taken
- Buttons: Copy All | Save as PDF | Save to Library | Run Again

**Saved Results Library:**
- Every result saved by user
- Filter by category and date
- Copy or download any saved result

**All commands to include in library:**

CONTENT:
- run blog --topic="" --client="" --keyword=""
- run hooks --topic="" --count=5
- run script --topic="" --duration=60
- run carousel --topic="" --slides=7
- run content-pack --topic="" --client=""
- run schedule --blog-id= --date="" --time=""

SEO:
- run seo-audit --url=""
- run pagespeed --url=""
- run keywords --topic="" --count=20
- run competitor-track --client="" --competitor=""
- run meta --url="" --keyword=""
- run schema --url=""

LEADS:
- run scrape --city="" --limit=50
- run score --lead-id=
- run score --all
- run leads --filter=hot
- run leads --export=csv

OUTREACH:
- run whatsapp --batch=hot
- run email --lead-id=
- run followup --today
- run whatsapp --lead-id= --preview
- run outreach --pause
- run outreach --resume

REPORTS:
- run report --client="" --month=""
- run summary --today
- run alerts --export=pdf --date=""
- run cost-report --month=""

SYSTEM:
- run bugfixer
- run selfoptimiser
- run test --module=""

---

### PAGE 15 — FILE MANAGER

**Purpose:** Browse and manage all files in the agent folder without VS Code.

**Features:**
- Tree view of entire naisora-agent folder
- Folders expand/collapse
- Each file: Edit, Rename, Delete buttons
- Upload new file button
- Create new folder button
- Create new file button
- Click any .js file → opens in Code Editor page
- .env file → redirects to ENV Manager page

---

### PAGE 16 — CODE EDITOR

**Purpose:** Edit any JavaScript file directly from dashboard. Like VS Code in browser.

**Implementation:** Use Monaco Editor (same engine as VS Code)

**Features:**
- Syntax highlighting for JavaScript
- Line numbers
- Find and replace (Ctrl+F)
- Undo/Redo
- Save button → saves file directly to Railway via API
- Run File button → executes the file and shows output
- Ask AI to Fix button → sends selected code + error to Claude API → shows suggested fix inline
- Preview Fix button → shows diff before applying
- Apply Fix button → replaces code with AI fix
- Deploy After Save toggle → if on, auto-deploys to Railway on save
- Copy All button

---

### PAGE 17 — ENV MANAGER

**Purpose:** Edit all .env variables without touching Railway dashboard.

**Features:**
- Table of all environment variables
- Values hidden by default (shown as bullets)
- Eye icon to reveal value
- Edit button → inline edit
- Save & Deploy button → updates Railway ENV and redeploys
- Add New Variable button
- Export as .env file button
- Variables to include: TWILIO_SID, TWILIO_TOKEN, CLAUDE_API_KEY, GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY, RAILWAY_TOKEN, and any others

**Security:**
- Values never shown in URL
- Values never logged
- Save always goes through server-side API route, never exposed to browser

---

### PAGE 18 — DATABASE VIEWER

**Purpose:** See and edit all Supabase tables without opening Supabase dashboard.

**Features:**
- Table selector (tabs or dropdown): leads, alerts, content, clients, outreach, ai_usage, brain_log, etc.
- Paginated table view (50 rows per page)
- Click any cell → edit inline
- Add Row button → empty row appears, fill and save
- Delete Row button
- Search/filter per column
- Export table as CSV
- Sort by any column

---

### PAGE 19 — DEPLOYMENT

**Purpose:** Push code to Railway and GitHub without terminal.

**Sections:**

**A. Connection Status**
- GitHub branch: main (connected or not)
- Railway: deployed and running / not deployed
- Last deploy: timestamp + commit message

**B. Deploy New Version**
- Commit message input
- Deploy to Railway button
- What happens: saves files → git add → git commit → git push → Railway auto-deploys
- Live progress shown while deploying

**C. Deploy History**
- Table: Date | Commit Message | Status (success/failed) | Duration
- Failed deploys have a "View Error" button
- Each deploy has "Rollback to this version" button

---

### PAGE 20 — LOG VIEWER

**Purpose:** See Railway logs live without opening Railway.

**Features:**
- Live streaming logs via Socket.io
- Auto-scrolls to latest
- Pause button (freezes scroll without stopping stream)
- Filter dropdown: All / Errors Only / Warnings Only / specific module name
- Search within logs
- Export current view as PDF
- Clear button (clears display only, not actual logs)
- Color coding: red = error, yellow = warning, green = success, white = info

---

### PAGE 21 — DEBUGGER

**Purpose:** When something breaks, find and fix it without Stack Overflow.

**Sections:**

**A. Active Errors**
- All errors from last 24 hours
- Each error: module name, file name, line number, error message, stack trace
- Timestamp

**B. Error Detail Panel (on click)**
- Full stack trace shown
- File and line highlighted
- Ask AI to Fix button → sends error + code context to Claude API
- AI response shown: explanation of error + suggested fix
- Preview Fix button → shows diff
- Apply Fix button → updates the file
- Open File button → opens in Code Editor

**C. Error History**
- All past errors with resolution status
- Resolved / Unresolved filter

---

### PAGE 22 — MY TASKS

**Purpose:** Central hub for all manual work Nahid needs to do. AI populates this automatically.

**Layout:**
- Three sections: URGENT | TODAY | THIS WEEK
- Each task card: icon, description, category, quick action button
- Mark as done button
- Click task → goes to relevant page

**Task types:**
- Blog ready for review
- Hot lead replied — respond now
- Follow-up due for lead
- Keyword approval needed
- Outreach sequence needs approval
- Walk-in note to add
- Proposal not yet sent to ready lead
- Client at churn risk
- Monthly report due

---

### PAGE 23 — PIPELINE (Conversion Funnel)

**Purpose:** Visual sales funnel showing where leads drop off.

**Sections:**

**A. Visual Funnel**
- Stages: Scraped → Contacted → Replied → Meeting → Closed
- Count at each stage
- Drop-off % between each stage (red if high)
- Click any stage → filters leads table

**B. Leads Table (filtered by stage)**
- Shows leads in selected stage
- Move lead to next stage button
- Quick actions per lead

**C. Best Time Intelligence**
- Graph showing reply times by hour
- Shows: "Best time to send WhatsApp: 7:30 PM"
- Based on actual reply data from Supabase

**D. A/B Test Summary**
- Quick view of active A/B tests
- Winner shown if determined

---

### PAGE 24 — PROPOSALS

**Purpose:** Generate, send, and track client proposals.

**Sections:**

**A. Generate Proposal**
- Select lead from dropdown → auto-fills all data
- Lead name, restaurant name, current SEO score, competitor score, main issues
- Zomato commission calculator auto-shown
- Our solution and pricing auto-filled
- Edit any field manually
- Generate Proposal button → creates PDF proposal
- Send as Link button → generates unique URL, copies to clipboard

**B. Proposal Tracker Table**
- All proposals sent
- Status: Sent / Viewed / Accepted / Rejected
- Viewed at timestamp
- Time spent reading (seconds)
- Follow up button

**C. Proposal View Page (public route: /proposal/[token])**
- This is what the restaurant owner sees when they open the link
- Clean readable layout
- Shows: problem, solution, pricing, Zomato savings
- Accept Proposal button → marks as accepted in Supabase, alerts Nahid

---

### PAGE 25 — A/B TESTING ENGINE

**Purpose:** Test two outreach messages and auto-pick the winner.

**Sections:**

**A. Active Tests**
- Test name, channel, message A vs B
- Sent count A vs B
- Reply rate A vs B
- Conversion rate A vs B
- Winner badge if determined

**B. Create New Test**
- Test name input
- Channel selector (WhatsApp / Email)
- Message A textarea
- Message B textarea
- Number of leads per variant input
- Start Test button

**C. Auto-Winner Logic**
- After minimum 20 replies per variant
- System picks winner based on conversion rate
- Shows: "Message A wins with 34% conversion vs 21% for Message B"
- Option to apply winner as default template

**D. Test History**
- All completed tests with results

---

### PAGE 26 — OPPORTUNITY RADAR

**Purpose:** Find hidden lead opportunities automatically every day.

**Sections:**

**A. Today's Opportunities (auto-generated)**
- Cards showing opportunity type with lead count
- Examples:
  - "8 restaurants got 1-star reviews this week — high churn pain, easy to approach"
  - "12 businesses with active Instagram but no website"
  - "5 competitors running Google Ads but weak SEO — undercut them"
- Each card has: View Leads button → shows those specific leads

**B. Opportunity Types to Detect:**
- Bad Google reviews in last 7 days
- Active Instagram / no website
- Website exists but PageSpeed below 40
- Zomato listed but no direct ordering
- Competitor running ads but SEO score below 50
- Restaurants with no Google Business profile

**C. Add to Leads button**
- Any opportunity lead can be added to leads table instantly

---

### PAGE 27 — PROMPT MANAGER

**Purpose:** Edit AI prompts for every module from dashboard without touching code.

**Features:**
- Table: Module name | Current prompt (truncated) | Last updated
- Click any module → opens prompt editor
- Full textarea showing complete prompt
- Test Prompt button → runs prompt with sample data → shows output
- Save button → updates prompt in Supabase prompts table
- Agent reads prompts from Supabase at runtime (not hardcoded)
- Revert to Default button

---

### PAGE 28 — SCHEDULER

**Purpose:** Control when each module runs. Replaces cron jobs.

**Features:**
- Table: Module | Time | Frequency | Status | Last Run
- Toggle on/off per schedule
- Edit time → time picker
- Edit frequency → daily / weekly dropdown
- For weekly: day of week selector
- Add New Schedule button
- Save All button → updates schedules table → agent reads from Supabase

**Pre-loaded schedules:**
- Lead Scraper: Daily 9:00 AM
- WhatsApp Batch: Daily 11:00 AM
- Email Outreach: Daily 10:00 AM
- Follow-ups: Daily 3:00 PM
- SEO Audit: Weekly Monday 10:00 AM
- Blog Publisher: Daily 7:00 PM
- Daily Summary: Daily 10:00 PM
- Competitor Track: Weekly Wednesday 11:00 AM

---

### PAGE 29 — SETTINGS

**Purpose:** All configuration in one place.

**Tabs: [General] [API Keys] [Agent Config] [Notifications] [Billing]**

**General tab:**
- Agency name, email, phone
- Timezone setting

**API Keys tab (links to ENV Manager):**
- Quick view of which keys are set
- Edit button → goes to ENV Manager

**Agent Config tab:**
- Lead score threshold (default: 60)
- Max leads per day (default: 50)
- Follow-up after days (default: 3)
- Max retry attempts (default: 3)
- Daily cost limit in ₹ (default: 500)
- Target cities (comma separated)

**Notifications tab:**
- Browser push notifications toggle
- Email alerts toggle
- Critical only toggle
- Alert sound toggle

**Billing tab:**
- Current Railway plan
- Current Supabase plan
- Current API costs this month

---

## HOW DASHBOARD CONNECTS TO AGENT

The existing Node.js agent (on Railway) needs one new file added: `api.js`

This file creates an Express server with these endpoints:

```
GET  /status                          → agent running status, uptime
GET  /logs                            → stream live logs via SSE
POST /run-module                      → run any module by name
     body: { module, params }
GET  /module-health                   → status of all 92 modules
GET  /railway/metrics                 → CPU, memory usage
POST /env/update                      → update env variable on Railway
POST /git/deploy                      → git commit + push
GET  /files                           → list files in agent folder
GET  /files/:path                     → read a file
PUT  /files/:path                     → write a file
```

Dashboard calls these endpoints via Next.js API routes (server-side) to avoid exposing Railway URL to browser.

---

## AUTH SYSTEM

- Single user only (Nahid)
- Supabase Auth with email + password
- Login page at /login
- If not logged in → redirect to /login
- After login → redirect to /overview
- Client portal uses separate Supabase auth role (read-only, filtered by client_id)

---

## PDF GENERATION SYSTEM

Every alert and report generates a PDF automatically.

**createAlert() function (add to agent):**
```javascript
async function createAlert({ type, priority, title, message, module, metadata }) {
  // 1. Insert into Supabase alerts table
  const { data } = await supabase.from('alerts').insert({
    type, priority, title, message, module, metadata
  }).select().single();

  // 2. Generate PDF using PDFKit
  const pdfBuffer = await generateAlertPDF({ ...data });

  // 3. Upload to Supabase Storage at /agent-alerts/YYYY/month/DD/filename.pdf
  const path = `${year}/${month}/${day}/alert_${timestamp}_${type}.pdf`;
  await supabase.storage.from('agent-alerts').upload(path, pdfBuffer);

  // 4. Update alert record with PDF URL
  await supabase.from('alerts').update({ pdf_url: publicUrl }).eq('id', data.id);
}
```

**PDF Storage Structure in Supabase:**
```
agent-alerts/
└── 2026/
    └── april/
        └── 21/
            ├── alert_3-42pm_email_failed.pdf
            └── alert_10-00pm_daily_summary.pdf
```

---

## REAL-TIME SYSTEM

Use Supabase Realtime to push live updates to dashboard:

```typescript
// In useRealtime.ts hook
const channel = supabase
  .channel('alerts')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'alerts' 
  }, (payload) => {
    // Show new notification in bell
    // Add to activity feed
  })
  .subscribe();
```

Subscribe to these tables for real-time:
- alerts (new alerts → notification bell)
- leads (new leads → overview feed)
- outreach (sent messages → outreach page)
- content (new content → content page)
- ai_usage (token usage → AI models page)

---

## ENVIRONMENT VARIABLES NEEDED

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Railway Agent
AGENT_API_URL=                    ← Railway deployment URL
AGENT_API_SECRET=                 ← shared secret to secure agent API

# Claude API (for Smart Suggestions, AI Fix, etc.)
ANTHROPIC_API_KEY=
```

---

## PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "@supabase/supabase-js": "latest",
    "@supabase/auth-helpers-nextjs": "latest",
    "xterm": "latest",
    "xterm-addon-fit": "latest",
    "@monaco-editor/react": "latest",
    "recharts": "latest",
    "socket.io-client": "latest",
    "pdfkit": "latest",
    "simple-git": "latest",
    "lucide-react": "latest",
    "tailwindcss": "latest",
    "date-fns": "latest",
    "react-calendar-heatmap": "latest",
    "react-beautiful-dnd": "latest"
  }
}
```

---

## WHAT THIS DASHBOARD FULLY REPLACES

| Tool Previously Used | Replaced By |
|---|---|
| VS Code terminal | Terminal page |
| VS Code file browser | File Manager page |
| VS Code code editing | Code Editor page |
| Railway dashboard | Deployment + Agent Control + Log Viewer pages |
| Railway ENV editor | ENV Manager page |
| Supabase dashboard | Database Viewer page |
| GitHub desktop/terminal | Deployment page |
| Telegram alerts | Alerts page with PDF storage |
| Manual .env editing | ENV Manager page |
| Stack Overflow debugging | Debugger + AI Fix page |
| Manual proposal writing | Proposals page |
| Manually checking agent logs | Log Viewer page |

---

## BUILD ORDER (PHASES)

Build in this exact order:

**Phase 1 — Core Foundation (Week 1)**
1. Auth (login page, protected routes)
2. Layout (sidebar, topbar, notification bell)
3. Supabase connection and all table types
4. Overview page
5. Alerts page + PDF system

**Phase 2 — Agent Connection (Week 2)**
6. Agent Control page
7. Log Viewer page (Socket.io streaming)
8. Terminal page (xterm.js)
9. ENV Manager page
10. Deployment page

**Phase 3 — Operations (Week 3)**
11. Leads page (full with intelligence card and pipeline)
12. Outreach page (with WhatsApp conversation viewer)
13. Content page (with editor and approval flow)
14. SEO page

**Phase 4 — Power Features (Week 4)**
15. Command Library page
16. File Manager page
17. Code Editor page (Monaco)
18. Debugger page

**Phase 5 — Intelligence (Week 5)**
19. Revenue + CRM page
20. Pipeline + A/B Testing page
21. Proposals page (with public view route)
22. Opportunity Radar page

**Phase 6 — Completion (Week 6)**
23. History page (calendar heatmap)
24. AI Models page
25. Reports page
26. My Tasks page
27. Scheduler page
28. Prompt Manager page
29. Client Portal page
30. Settings page

---

## IMPORTANT NOTES FOR ANTIGRAVITY

1. Every page must have **Today tab**, **History tab**, and **Manual Work tab** — this is the consistent pattern across all category pages.

2. Every page that generates content must have a **Save as PDF** button and a **Copy** button on the result.

3. Every list or table must have **date filtering** so Nahid can view any past date's data.

4. The **notification bell** in topbar must always show unread alert count in real-time via Supabase Realtime.

5. The **agent status indicator** must always be visible in the topbar or sidebar on every page.

6. All API calls to the Railway agent must go through **Next.js API routes** (server-side) — never call Railway directly from the browser.

7. The **Code Editor page** must use Monaco Editor — not a textarea. It must feel exactly like VS Code.

8. The **Terminal page** must use xterm.js — not a fake terminal. It must support actual keystrokes, history, and tab completion.

9. All environment variable values must be **masked by default** and only revealed on click. Never log them. Never expose them in API responses.

10. The **Client Portal** is a completely separate view — clients who log in must ONLY see their own restaurant's data, filtered strictly by client_id using Supabase Row Level Security.

---

END OF PROMPT
```

---

**Design Note:** No design instructions are included in this prompt intentionally. Nahid will provide a design reference separately and all UI should be built to match that reference exactly.
