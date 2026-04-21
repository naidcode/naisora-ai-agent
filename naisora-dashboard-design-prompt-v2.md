# NAISORA DASHBOARD — DESIGN PROMPT FOR ANTIGRAVITY (UPDATED)

---

## WHAT YOU ARE BUILDING

You are building the **Naisora Dashboard** — a full internal operating system for an AI agency. The design must follow the **exact layout structure** of the Donezo reference image provided — same sidebar layout, same topbar, same stat card row, same 3-column bottom section, same chart styles, same spacing rhythm. But everything is rebuilt in dark mode using Naisora's real brand colors.

---

## FONTS

**Install and use these exact Google Fonts — nothing else:**

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

| Element | Font | Weight | Size |
|---|---|---|---|
| Logo | Plus Jakarta Sans | 700 | 18px |
| Page title (h1) | Plus Jakarta Sans | 700 | 28px |
| Stat numbers (big) | Plus Jakarta Sans | 800 | 40px |
| Card titles | Plus Jakarta Sans | 600 | 15px |
| Nav items | Plus Jakarta Sans | 500 | 14px |
| Button labels | Plus Jakarta Sans | 600 | 14px |
| Body / descriptions | Inter | 400 | 14px |
| Table text | Inter | 400 | 13px |
| Section labels (MENU etc.) | Inter | 400 | 11px uppercase |
| Meta / timestamps | Inter | 400 | 12px |
| Badge text | Inter | 500 | 11px |
| Code / terminal | JetBrains Mono | 400 | 13px |

---

## COLOR PALETTE — USE THESE EXACT HEX VALUES

These are extracted directly from naisora.com. Do not substitute, approximate, or add colors not listed here.

### Backgrounds
```css
--bg-main:     #0a0a0a;   /* page background */
--bg-sidebar:  #0a0a0a;   /* sidebar */
--bg-card:     #141414;   /* all cards and panels */
--bg-elevated: #1f1f1f;   /* hover states, dropdowns, elevated elements */
--bg-input:    #141414;   /* all inputs, search bars */
```

### Text
```css
--text-primary:   #ffffff;   /* main headings, important values */
--text-secondary: #f5f5f5;   /* card titles, nav items */
--text-muted:     #878787;   /* descriptions, meta, timestamps, labels */
--text-disabled:  #878787cc; /* placeholder, inactive */
```

### Accent — Primary Green (main interactive color)
```css
--green-primary:  #22c55e;              /* primary accent — buttons, active states, badges */
--green-mid:      #25d366;              /* secondary — success indicators, positive stats */
--green-light:    #4ade80;              /* hover state of green, highlights */
--green-teal:     #128c7e;              /* teal — secondary accent, charts, info badges */
--green-dim:      rgba(34,197,94,0.12); /* green tinted card backgrounds */
--green-dim-border: rgba(34,197,94,0.25); /* green tinted borders */
--teal-dim:       rgba(18,140,126,0.12);
```

### Borders
```css
--border-subtle:  #ffffff0d;  /* barely visible dividers */
--border-default: #ffffff1a;  /* standard card borders */
--border-visible: #ffffff33;  /* emphasized borders, active inputs */
--border-strong:  #f5f5f533;  /* strong dividers */
```

### Status Colors
```css
--success:      #22c55e;              /* running, ok, sent */
--success-dim:  rgba(34,197,94,0.12);
--warning:      #eab308;              /* warning alerts */
--warning-dim:  rgba(234,179,8,0.12);
--danger:       #ef4444;              /* errors, critical */
--danger-dim:   rgba(239,68,68,0.12);
--info:         #3b82f6;              /* info, neutral */
--info-dim:     rgba(59,130,246,0.12);
```

### Key Color Assignments (never change)
```
Active sidebar nav item:    bg --green-dim | left border 2px --green-primary | text --green-primary
Primary CTA button:         bg --green-primary | text #0a0a0a (dark text on green)
Featured first stat card:   bg --green-primary | text #0a0a0a
Agent RUNNING badge:        bg --green-dim | text --green-primary | border --green-dim-border
Alert critical:             bg --danger-dim | text --danger
Alert warning:              bg --warning-dim | text --warning
Section labels:             text --text-muted | uppercase | letter-spacing 2px
All cards:                  bg --bg-card | border 1px --border-default
Hover cards:                bg --bg-elevated
```

---

## ICONS — PREMIUM ONLY

**Use Lucide React exclusively for all icons. Zero emojis. Zero PNG icons. Zero generic icon sets.**

Install: `npm install lucide-react`

```tsx
import { LayoutDashboard, Users, Mail, Search, Bell, Settings, Terminal, Code2, Database, Rocket, Bug, FileText, BarChart2, TrendingUp, Zap, Shield, Clock, ChevronRight, ArrowUpRight, Plus, Download, RefreshCw, Play, Square, Activity } from 'lucide-react'
```

**Icon sizing rules:**
- Sidebar nav icons: 18px
- Topbar icons: 20px
- Stat card icons: 20px
- Action buttons: 16px
- Table row icons: 16px
- Badge icons: 14px

**Icon color rules:**
- Inactive nav: `--text-muted` (#878787)
- Active nav: `--green-primary` (#22c55e)
- Topbar icon buttons: `--text-muted`, hover `--text-primary`
- Stat card icons on green card: `#0a0a0a` (dark)
- Stat card icons on dark card: `--text-muted`

**Never use:**
- Emoji characters as icons (❌ no 🔥 📋 ✅ ⚠️ in UI)
- FontAwesome
- HeroIcons
- Any PNG or SVG image files as icons
- Text symbols as icons

---

## ANIMATIONS — PREMIUM MOTION SYSTEM

Install Framer Motion: `npm install framer-motion`

### Page Load Animations
Every page loads with staggered fade-up:
```tsx
// Each section fades up with 80ms delay between items
initial={{ opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
```

### Stat Number Count-Up
When stat cards appear, numbers animate from 0 to actual value:
```
Duration: 1000ms
Easing: easeOut
Start: 0
End: actual value
Font: Plus Jakarta Sans 800 — numbers should feel satisfying to watch
```

### Card Hover
```css
transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
hover: translateY(-2px)
       box-shadow: 0 8px 32px rgba(0,0,0,0.4)
       border-color: --border-visible
```

### Sidebar Active Item
```css
/* Left border slides in from left on active */
transition: all 150ms ease
Active state:
  border-left: 2px solid --green-primary (animates width from 0 → 2px)
  background: fades in --green-dim
  text: transitions to --green-primary
```

### Button Interactions
```css
Primary button:
  hover: background brightens to --green-light, scale(1.02)
  active: scale(0.97)
  transition: all 150ms ease

Secondary button:
  hover: bg --bg-elevated, border-color --border-visible
  active: scale(0.97)
```

### Live Feed / Activity
New items appear with:
```
initial: { opacity: 0, x: -12 }
animate: { opacity: 1, x: 0 }
transition: { duration: 0.25, ease: 'easeOut' }
```

### Notification Badge
When new alert arrives:
```css
animation: pulse 600ms ease-out
keyframes: 0% scale(1) → 50% scale(1.4) → 100% scale(1)
Color: --green-primary
```

### Modal / Side Panel
Slides in from right:
```
initial: { x: '100%', opacity: 0 }
animate: { x: 0, opacity: 1 }
exit:    { x: '100%', opacity: 0 }
transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
Backdrop: fades in rgba(0,0,0,0.6)
```

### Charts
Bar chart bars grow from bottom on mount:
```
Each bar: scaleY from 0 → 1, origin bottom
Stagger: 60ms between bars
Duration: 500ms, easeOut
```

Donut chart draws clockwise:
```
strokeDashoffset animates from full → actual value
Duration: 800ms, easeOut
```

### Skeleton Loading
All data that fetches from API shows skeleton first:
```css
background: linear-gradient(90deg, #141414 25%, #1f1f1f 50%, #141414 75%)
background-size: 200% 100%
animation: shimmer 1.5s infinite linear
```

### Terminal Lines
Each new log line:
```
initial: { opacity: 0 }
animate: { opacity: 1 }
transition: { duration: 0.1 }
```

### Tab Switch
```
Content slides: 
  exit: { opacity: 0, x: -8 }
  enter: { opacity: 1, x: 0 }
  transition: 200ms ease
```

### Glow Effect (on key accent elements)
Active agent status indicator:
```css
box-shadow: 0 0 0 0 rgba(34,197,94,0.4);
animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;

/* Green dot pulses softly to show "live" */
```

---

## LAYOUT STRUCTURE

Take the exact layout from the Donezo reference image. Rebuild in dark with Naisora colors.

---

### SIDEBAR — 220px fixed left

```
┌─────────────────────┐
│                     │
│  ◈  NAISORA         │  ← logo mark + name, Plus Jakarta Sans 700
│                     │
├─────────────────────┤
│  MENU               │  ← Inter 400, 11px, uppercase, #878787, tracking-widest
│                     │
│  ▪ Overview         │
│  ▪ Leads            │
│  ▪ Outreach         │
│  ▪ Content          │
│  ▪ SEO              │
│  ▪ Revenue          │
│  ▪ Reports          │
│  ▪ Alerts     [3]   │  ← unread count badge
│                     │
├─────────────────────┤
│  AGENT              │
│                     │
│  ▪ Control          │
│  ▪ Terminal         │
│  ▪ Commands         │
│  ▪ Files            │
│  ▪ Code Editor      │
│  ▪ Deployment       │
│  ▪ Logs             │
│  ▪ Debugger         │
│                     │
├─────────────────────┤
│  GENERAL            │
│                     │
│  ▪ Client Portal    │
│  ▪ Settings         │
│  ▪ Logout           │
│                     │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ ● Agent LIVE   │ │  ← agent status card
│ │ Uptime: 6h 42m │ │     bg: --green-dim
│ │ Railway: OK    │ │     border: --green-dim-border
│ │ [■] [↺]       │ │     text: --green-primary
│ └─────────────────┘ │
└─────────────────────┘
```

**Sidebar styling:**
- bg: #0a0a0a
- Right border: 1px solid #ffffff1a
- Nav item default: padding 10px 16px, border-radius 8px, margin 2px 8px, text #878787
- Nav item hover: bg #1f1f1f, text #f5f5f5, transition 150ms
- Nav item active: bg rgba(34,197,94,0.12), border-left 2px solid #22c55e, text #22c55e
- Section labels: Inter 11px, uppercase, letter-spacing 2px, color #878787, margin-top 24px, padding 0 16px
- Unread badge: bg #22c55e, text #0a0a0a, Plus Jakarta Sans 600, 10px, border-radius 999px, min-width 18px

---

### TOPBAR — 64px height, full width minus sidebar

**Left:**
- Search input: bg #141414, border 1px #ffffff1a, border-radius 10px, width 280px
- Lucide `Search` icon inside, 16px, #878787
- Keyboard shortcut badge: `⌘ K` or `⌘ F` — small pill bg #1f1f1f

**Right (left to right):**
- `Mail` icon button — 38px circle, bg #141414, border #ffffff1a
- `Bell` icon button — same, with green badge showing count
- Vertical divider: 1px #ffffff1a, height 24px
- Avatar circle (36px, bg #22c55e, initials NP in dark text)
- Name: "Nahid Pasha" Plus Jakarta Sans 600 14px #f5f5f5
- Role: "Founder, Naisora" Inter 400 12px #878787

**Topbar:**
- bg: #0a0a0a
- Bottom border: 1px solid #ffffff1a

---

### MAIN CONTENT

- bg: #0a0a0a
- Padding: 32px
- Max-width: 100% (fluid)

**Page header pattern (every page):**
```
[Page Title — Plus Jakarta Sans 700 28px #ffffff]          [Primary Button] [Secondary Button]
[Subtitle — Inter 400 14px #878787]
```

**Primary button:** bg #22c55e, text #0a0a0a, Plus Jakarta Sans 600, border-radius 10px, padding 10px 20px
**Secondary button:** bg transparent, border 1px #ffffff1a, text #f5f5f5, same padding

---

## COMPONENT SPECIFICATIONS

---

### STAT CARDS ROW (4 cards, exact Donezo layout)

**Card 1 — Featured (filled green, like Donezo's dark green first card):**
```
bg: #22c55e
border-radius: 16px
padding: 24px
No border

Top row: Title left (Plus Jakarta Sans 600, 14px, #0a0a0a opacity 0.75)
         ArrowUpRight icon right (20px, circle bg rgba(0,0,0,0.15), icon #0a0a0a)
         
Big number: Plus Jakarta Sans 800, 42px, #0a0a0a
Bottom: trend pill (bg rgba(0,0,0,0.12), text #0a0a0a, Inter 500, 12px)
```

**Cards 2, 3, 4 — Standard:**
```
bg: #141414
border: 1px solid #ffffff1a
border-radius: 16px
padding: 24px

Top row: Title left (Plus Jakarta Sans 600, 14px, #878787)
         ArrowUpRight icon right (20px, circle bg #1f1f1f, icon #878787)
         
Big number: Plus Jakarta Sans 800, 42px, #ffffff
Bottom: trend pill (success dim or danger dim, colored text, Inter 500, 12px)

On hover: border-color #ffffff33, translateY(-2px)
```

---

### BAR CHART CARD (like Donezo's Project Analytics)

```
bg: #141414
border: 1px solid #ffffff1a
border-radius: 16px
padding: 24px

Title: Plus Jakarta Sans 600, 16px, #ffffff
Subtitle: Inter 400, 13px, #878787

Bars:
  Shape: tall rounded pill (border-radius 999px)
  Width: ~28px each, gap ~12px between
  Height: proportional to value
  
  Inactive bars: background #1f1f1f, with diagonal stripe pattern overlay
  Active bar (today): solid #22c55e
  Second active: solid #25d366 slightly shorter
  
  Percentage label on top of active bar: Plus Jakarta Sans 600, 12px, #22c55e
  Day labels below: Inter 400, 12px, #878787
  
Bar grow animation: scaleY 0→1 from bottom, 500ms, stagger 60ms per bar
```

---

### ALERT / REMINDER CARD (like Donezo's Reminders)

```
bg: #141414
border: 1px solid #ffffff1a
border-radius: 16px
padding: 24px

Title: Plus Jakarta Sans 600, 16px, #ffffff
Top pill badge: priority type, colored
Alert title: Plus Jakarta Sans 700, 18px, #ffffff
Meta text: Inter 400, 13px, #878787
CTA button: full width, bg #22c55e, text #0a0a0a, border-radius 10px, Plus Jakarta Sans 600
```

---

### LIST CARD — RIGHT COLUMN (like Donezo's Project list)

```
bg: #141414
border: 1px solid #ffffff1a
border-radius: 16px
padding: 20px

Header:
  Title: Plus Jakarta Sans 600, 15px, #ffffff
  "+ New" button: bg transparent, border 1px #ffffff1a, text #878787, border-radius 8px, Plus Jakarta Sans 500, 12px

Each list item:
  Left: 32px colored circle with Lucide icon (8px)
        Colors rotate: #22c55e, #4ade80, #128c7e, #25d366
  Center: 
    Name: Plus Jakarta Sans 500, 14px, #f5f5f5
    Sub: Inter 400, 12px, #878787
  Right: 
    Date: Inter 400, 12px, #878787
    OR status badge
    
  Divider between items: 1px solid #ffffff0d
  Hover: bg #1f1f1f, border-radius 8px, transition 150ms
```

---

### TEAM / PEOPLE LIST CARD (like Donezo's Team Collaboration)

```
Same card styling as above

Each person row:
  Left: Avatar circle 36px (random letter, bg --green-dim, text --green-primary)
  Center:
    Name: Plus Jakarta Sans 500, 14px, #f5f5f5
    Task/Role: Inter 400, 12px, #878787
  Right: status badge
    Completed: bg --success-dim, text --success
    In Progress: bg --info-dim, text --info
    Pending: bg rgba(255,255,255,0.06), text #878787
```

---

### DONUT CHART CARD (like Donezo's Project Progress)

```
bg: #141414
border: 1px solid #ffffff1a
border-radius: 16px
padding: 24px

Donut: 160px diameter
  Arc 1 (completed): #22c55e
  Arc 2 (in progress): #128c7e
  Arc 3 (pending): #1f1f1f
  
Center text: percentage Plus Jakarta Sans 800 24px #ffffff
             label Inter 400 12px #878787

Legend below:
  Each item: 8px circle + label Inter 400 13px #878787
  
Chart draw animation: strokeDashoffset 0→actual, 800ms easeOut
```

---

### TIMER / COUNTER WIDGET (like Donezo's Time Tracker)

```
bg: linear-gradient(135deg, rgba(34,197,94,0.08) 0%, #141414 100%)
border: 1px solid rgba(34,197,94,0.2)
border-radius: 16px
padding: 24px

Title: Plus Jakarta Sans 600, 14px, #878787
Counter: JetBrains Mono 700, 36px, #ffffff — shows agent uptime HH:MM:SS

Controls:
  Pause button: 44px circle, bg #22c55e, icon Pause #0a0a0a
  Stop button: 44px circle, bg #1f1f1f, border 1px #ffffff1a, icon Square #878787
  
  Button hover: scale(1.05), transition 150ms
```

---

### TABS (every category page)

```
Tab bar: border-bottom 1px solid #ffffff1a, margin-bottom 24px

Active tab:
  color: #22c55e
  border-bottom: 2px solid #22c55e
  Plus Jakarta Sans 600, 14px
  margin-bottom: -1px (overlaps bar border)

Inactive tab:
  color: #878787
  Plus Jakarta Sans 500, 14px
  hover: color #f5f5f5, transition 150ms

Tab switch animation: content fades, translateX(-8px→0), 200ms
```

---

### TABLE

```
Container: bg #141414, border 1px #ffffff1a, border-radius 16px, overflow hidden

Header:
  bg: #1f1f1f
  text: Inter 500, 12px, uppercase, #878787, letter-spacing 1px
  padding: 12px 20px
  border-bottom: 1px solid #ffffff1a

Body rows:
  padding: 14px 20px
  border-bottom: 1px solid #ffffff0d
  hover: bg #1f1f1f, transition 150ms

Cell text: Inter 400, 14px, #f5f5f5
Muted cell: #878787

Status badges (pill shape):
  border-radius: 999px
  padding: 3px 10px
  Inter 500, 11px
  
  Hot/Success:    bg rgba(34,197,94,0.12)   text #22c55e
  Warning:        bg rgba(234,179,8,0.12)   text #eab308
  Error/Critical: bg rgba(239,68,68,0.12)   text #ef4444
  Info:           bg rgba(59,130,246,0.12)  text #3b82f6
  Teal/Active:    bg rgba(18,140,126,0.12)  text #128c7e
  Neutral:        bg rgba(255,255,255,0.06) text #878787
```

---

### INPUT FIELDS

```
All inputs:
  bg: #141414
  border: 1px solid #ffffff1a
  border-radius: 10px
  padding: 10px 14px
  font: Inter 400, 14px, #ffffff
  placeholder: #878787
  
  focus:
    border-color: #22c55e
    box-shadow: 0 0 0 3px rgba(34,197,94,0.12)
    outline: none
    transition: 150ms

Select dropdown menu:
  bg: #1f1f1f
  border: 1px solid #ffffff1a
  border-radius: 12px
  box-shadow: 0 16px 48px rgba(0,0,0,0.5)
  
  Option hover: bg rgba(255,255,255,0.06)
```

---

### MODAL / DRAWER

```
Side panel (slides from right):
  width: 440px
  bg: #0a0a0a
  border-left: 1px solid #ffffff1a
  
  Backdrop: rgba(0,0,0,0.7), blur(4px)
  
  Header: padding 24px, border-bottom 1px solid #ffffff1a
          title Plus Jakarta Sans 700 18px #ffffff
          close button: X icon, 32px circle bg #141414
  
  Body: padding 24px
        sections divided by 1px #ffffff0d

Animation:
  Panel: x 100%→0, 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
  Backdrop: opacity 0→1, 200ms
```

---

### NOTIFICATION DROPDOWN

```
Position: below Bell icon, right-aligned
Width: 380px
bg: #141414
border: 1px solid #ffffff1a
border-radius: 16px
box-shadow: 0 24px 64px rgba(0,0,0,0.6)
overflow: hidden

Header:
  padding: 16px 20px
  "Notifications" Plus Jakarta Sans 600 15px #ffffff
  "Mark all read" Inter 400 13px #22c55e (right)
  border-bottom: 1px solid #ffffff1a

Each notification:
  padding: 14px 20px
  border-left: 3px solid (critical: #ef4444 | warning: #eab308 | info: #22c55e)
  bg: default #141414, unread #1f1f1f
  
  Left: Lucide icon in 32px circle, bg matches border color dim
  Middle: title Plus Jakarta Sans 500 14px #f5f5f5
          message Inter 400 12px #878787
  Right: time Inter 400 11px #878787
         green dot 6px if unread
  
  hover: bg rgba(255,255,255,0.04)
  
Animation: slides down from top, opacity 0→1, 200ms
```

---

### TERMINAL COMPONENT

```
Container:
  bg: #000000
  border: 1px solid #ffffff1a
  border-radius: 16px
  overflow: hidden

Header:
  bg: #141414
  border-bottom: 1px solid #ffffff1a
  padding: 12px 16px
  height: 44px
  
  Left: 3 macOS-style dots
        Close:   #ef4444 (8px circle)
        Minimize: #eab308 (8px circle)
        Expand:  #22c55e (8px circle)
  
  Center: "NAISORA TERMINAL" Inter 500 13px #878787
  
  Right: Clear button + Export PDF button
         Inter 500, 12px, #878787, hover #f5f5f5

Terminal body (xterm.js):
  bg: #000000
  font: JetBrains Mono 400, 13px, line-height 1.7
  padding: 16px
  
  xterm theme:
    background:    #000000
    foreground:    #cccccc
    cursor:        #22c55e
    black:         #1f1f1f
    green:         #22c55e
    brightGreen:   #4ade80
    cyan:          #128c7e
    brightWhite:   #ffffff
  
  Prompt color: #22c55e
  Command color: #ffffff
  Success output: #22c55e
  Error output: #ef4444
  Warning output: #eab308
```

---

### CODE EDITOR (Monaco)

```
Container:
  border: 1px solid #ffffff1a
  border-radius: 16px
  overflow: hidden

Header:
  bg: #141414
  border-bottom: 1px solid #ffffff1a
  padding: 12px 20px
  
  Left: file name dot (orange if unsaved → use #eab308, green if saved → #22c55e)
        filename: Inter 500, 14px, #f5f5f5
  
  Right: Save, Run File, Ask AI to Fix buttons
         Primary: bg #22c55e, text #0a0a0a
         Others: border style

Monaco theme config:
  "editor.background": "#0a0a0a"
  "editor.lineHighlightBackground": "#141414"
  "editor.selectionBackground": "rgba(34,197,94,0.15)"
  "editorLineNumber.foreground": "#444444"
  "editorLineNumber.activeForeground": "#22c55e"
  "editor.foreground": "#f5f5f5"
```

---

## SPACING SYSTEM

```
Page padding:              32px
Card padding:              24px
Card border-radius:        16px
Small card border-radius:  12px
Button border-radius:      10px
Input border-radius:       10px
Badge border-radius:       999px
Gap between cards row:     20px
Gap between page sections: 32px
Nav item padding:          10px 16px
Nav item border-radius:    8px
Topbar height:             64px
Sidebar width:             220px
```

---

## SKELETON LOADING

Every card and table that fetches from API must show skeleton while loading:

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #141414 25%,
    #1f1f1f 50%,
    #141414 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 8px;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## FINAL RULES

**DO:**
- Use only Lucide React icons — every icon in the entire dashboard
- Use Plus Jakarta Sans for all headings and nav
- Use Inter for all body and meta text
- Use JetBrains Mono for terminal and code only
- Animate every meaningful state change with Framer Motion
- Show skeleton loaders while data fetches
- Keep all backgrounds dark (#0a0a0a, #141414, #1f1f1f)
- Make the first stat card always filled with #22c55e
- Keep the sidebar agent status card always visible at bottom

**DO NOT:**
- Use any emojis in the UI
- Use any icon library except Lucide React
- Use white or light backgrounds anywhere
- Use orange, yellow, purple, or pink — only green, teal, white, and the status colors
- Use gradients except on the timer widget and as very subtle overlays
- Use shadows with color — only rgba(0,0,0,x) dark shadows
- Use fonts other than Plus Jakarta Sans, Inter, and JetBrains Mono
- Round corners beyond 16px
- Use border-radius less than 8px anywhere

---

## SUMMARY TABLE

| Property | Value |
|---|---|
| Theme | Dark mode only |
| Main background | #0a0a0a |
| Card background | #141414 |
| Elevated | #1f1f1f |
| Primary accent | #22c55e |
| Secondary accent | #128c7e |
| Heading font | Plus Jakarta Sans |
| Body font | Inter |
| Code font | JetBrains Mono |
| Icon library | Lucide React only |
| Animation library | Framer Motion |
| Layout reference | Donezo dashboard image (attached) |
| Card radius | 16px |
| Sidebar width | 220px |
| Topbar height | 64px |

---

END OF DESIGN PROMPT
