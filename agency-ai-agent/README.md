# 🤖 Agency AI Agent — Week 1 Setup Guide

## What You're Building This Week
By the end of Week 1 you will have:
- ✅ Claude AI writing personalized cold emails
- ✅ Gmail sending emails automatically
- ✅ Supabase storing all your leads
- ✅ Telegram notifying you of hot leads
- ✅ Scheduled jobs running every day automatically

---

## STEP 1 — Install Node.js
1. Go to **nodejs.org**
2. Download the **LTS version** (the green button)
3. Install it — click Next, Next, Finish
4. Open a terminal and type: `node --version`
5. You should see something like: `v20.11.0` ✅

---

## STEP 2 — Download Your Project Files
1. Create a folder on your Desktop called `agency-ai-agent`
2. Copy all these files into that folder
3. Open terminal/command prompt in that folder
4. Run: `npm install`
5. Wait for it to finish (downloads all dependencies)

---

## STEP 3 — Setup Supabase (Your Database)

1. Go to **supabase.com** and create a free account
2. Click **New Project** → give it a name like "agency-agent"
3. Choose a strong password (save it somewhere)
4. Wait 2 minutes for it to set up

**Get your keys:**
- Go to Settings → API
- Copy **Project URL** → paste as `SUPABASE_URL` in .env
- Copy **anon/public key** → paste as `SUPABASE_ANON_KEY` in .env

**Create your database tables:**
- Click **SQL Editor** in the left sidebar
- Click **New query**
- Open the file `database/schema.sql` from your project
- Copy ALL the content and paste it into Supabase SQL Editor
- Click **Run** (green button)
- You should see "Success. No rows returned" ✅

---

## STEP 4 — Get Your Claude API Key

1. Go to **console.anthropic.com**
2. Sign up / log in
3. Click **API Keys** in the left menu
4. Click **Create Key**
5. Copy the key → paste as `ANTHROPIC_API_KEY` in .env

---

## STEP 5 — Setup Gmail API

This is the most steps but do it once and never again.

1. Go to **console.cloud.google.com**
2. Create a new project (call it "Agency Agent")
3. Search for **Gmail API** → Enable it
4. Go to **Credentials** → Create Credentials → OAuth client ID
5. Application type: **Desktop app**
6. Download the credentials JSON file

**Get your Client ID and Secret:**
- Open the downloaded JSON file
- Copy `client_id` → paste as `GMAIL_CLIENT_ID` in .env
- Copy `client_secret` → paste as `GMAIL_CLIENT_SECRET` in .env

**Get your Refresh Token (do this once):**
```
node -e "require('./config/gmail').getRefreshToken()"
```
- It will print a URL — open it in your browser
- Sign in with your Gmail account
- Click Allow
- Copy the `code` from the URL after redirect
- Paste it in the terminal when asked
- Copy the **REFRESH_TOKEN** it gives you → paste in .env

---

## STEP 6 — Setup Telegram Bot

1. Open Telegram, search for **@BotFather**
2. Send: `/newbot`
3. Give it a name: "My Agency Bot"
4. Give it a username: "myagency_bot" (must end in 'bot')
5. Copy the **HTTP API token** → paste as `TELEGRAM_BOT_TOKEN` in .env

**Get your Chat ID:**
1. Search for your new bot in Telegram
2. Send it any message (like "hello")
3. Run this command:
```
node -e "require('./config/telegram').getChatId()"
```
4. Copy the number it shows → paste as `TELEGRAM_CHAT_ID` in .env

---

## STEP 7 — Fill in Your .env File

1. Copy `.env.example` and rename the copy to `.env`
2. Fill in ALL the values:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-...
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
GMAIL_REFRESH_TOKEN=1//...
YOUR_NAME=Rahul Singh
YOUR_EMAIL=rahul@gmail.com
YOUR_AGENCY_NAME=WebCraft Studio
YOUR_PORTFOLIO_URL=https://webcraft.in
YOUR_PHONE=+91-9876543210
YOUR_CITY=Mumbai
TELEGRAM_BOT_TOKEN=1234567890:AAH...
TELEGRAM_CHAT_ID=123456789
```

---

## STEP 8 — Test Everything

Run each test one by one. All should say ✅.

**Test Claude AI:**
```
node -e "require('./config/claude').testConnection()"
```

**Test Database:**
```
node -e "require('./config/database').testConnection()"
```

**Test Gmail:**
```
node -e "require('./config/gmail').testConnection()"
```

**Test Telegram:**
```
node -e "require('./config/telegram').testConnection()"
```
(Check your Telegram phone — you should receive a message!)

---

## STEP 9 — Test Email Send (The Big Moment!)

This sends a real email to YOUR OWN inbox as a test:
```
node -e "require('./modules/email/emailSender').testSend()"
```

Check your inbox. You should receive a personalized cold email.
If it looks good — **YOUR SYSTEM IS WORKING!** 🎉

---

## STEP 10 — Start the Agent!

```
node index.js
```

You'll see all connections confirmed and jobs scheduled.
Your agent is now running! It will automatically:
- Send emails every day at 10 AM
- Send follow-ups every day at 6 PM
- Send you a Telegram every Monday with your report

---

## Add Your First Test Lead

To add one lead manually and test the full flow:
```
node -e "
const db = require('./config/database');
db.saveLead({
  name: 'Raj Kumar',
  email: 'test@example.com',
  businessName: 'Raj Medical Clinic',
  businessType: 'clinic',
  city: 'Mumbai'
})
"
```

Then run the email sender manually:
```
node -e "require('./modules/email/emailSender').sendDailyColdEmails()"
```

---

## Week 1 Complete Checklist

- [ ] Node.js installed
- [ ] `npm install` ran successfully
- [ ] Supabase database created + schema.sql run
- [ ] Claude API key added to .env
- [ ] Gmail API credentials added to .env
- [ ] Telegram bot created + chat ID added to .env
- [ ] All 4 tests pass ✅
- [ ] Test email received in your inbox ✅
- [ ] `node index.js` runs without errors ✅

**If all boxes are ticked — Week 1 is DONE!**
Next: Week 2 = Lead Scraper with Puppeteer 🕷️

---

## Troubleshooting

**"Cannot find module" error:**
Run `npm install` again

**Gmail auth error:**
Re-run the refresh token step

**Supabase error "relation does not exist":**
Make sure you ran schema.sql in Supabase SQL Editor

**Telegram not receiving messages:**
Make sure you sent a message to your bot first, then got the chat ID

---

## File Structure You Have

```
agency-ai-agent/
├── config/
│   ├── claude.js       ← AI brain
│   ├── database.js     ← Supabase queries
│   ├── gmail.js        ← Email send/read
│   └── telegram.js     ← Phone notifications
├── modules/
│   └── email/
│       ├── emailWriter.js   ← Claude writes emails
│       └── emailSender.js   ← Gmail sends emails
├── database/
│   └── schema.sql      ← Run this in Supabase
├── scheduler/
│   └── cronJobs.js     ← All timed jobs
├── index.js            ← Start everything
├── package.json        ← Dependencies
└── .env.example        ← Copy → rename to .env
```
