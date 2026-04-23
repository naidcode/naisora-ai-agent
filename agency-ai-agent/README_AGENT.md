# 🤖 Naisora AI Agent — Operations Manual

This agent is a multi-channel acquisition system designed to find, score, and contact restaurant/cafe owners in Bangalore.

## 🚀 How to Start

### 1. The Brain (Railway / Server)
Run the main orchestrator which handles crons, scraping, and queuing.
```bash
npm start
```
*Alternatively, to run only the autonomous autopilot loop:*
```bash
npm run autopilot
```

### 2. WhatsApp Service (Local Laptop)
Run this on your local machine to keep the WhatsApp session alive and send messages from the queue.
```bash
npm run whatsapp
```

### 3. Health Check
Verify all connections (Claude, Supabase, etc.) are working.
```bash
npm run health
```

---

## 📅 Agent Schedule (Automatic)

| Time | Task | Description |
| :--- | :--- | :--- |
| **08:30 AM** | 🎯 **Daily Priorities** | Scores leads and picks the top 50 for today. |
| **10:00 AM** | 📱 **WhatsApp Outreach** | Sends Batch 1 of personalized messages. |
| **11:00 AM** | 📧 **Email Outreach** | Sends cold emails and follow-ups. |
| **Every 3h**  | 📬 **Check Replies** | Scans for lead replies and alerts you on Telegram. |
| **02:00 PM** | 📱 **WhatsApp Outreach** | Sends Batch 2 of messages. |
| **04:00 PM** | 🔍 **Scrape & Audit** | Finds new leads for tomorrow and performs SEO audits. |
| **09:00 PM** | 📊 **Dashboard** | Updates the agency performance dashboard. |
| **Sun 8 PM** | 📈 **Pipeline Summary** | Sends a weekly summary to Telegram. |

---

## 🛠️ What the Agent Does

1. **Lead Sourcing**: Uses Google Maps to find high-intent restaurants in specific Bangalore areas.
2. **Lead Intelligence**: Uses AI to score leads based on their current web presence and ratings.
3. **Automated SEO Audits**: Generates real mini-audits for leads to provide instant value in outreach.
4. **Outreach**: Sends personalized WhatsApps and Emails (Multichannel).
5. **Persistence**: Automatically follows up if the lead doesn't reply within 3 days.
6. **Content Generation**: Drafts blog posts and researches social media ideas for clients.
