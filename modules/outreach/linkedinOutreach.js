// modules/outreach/linkedinOutreach.js
// Naisora AI Agent — LinkedIn Outreach
// Targets: F&B managers, restaurant chain managers, cafe owners in Bangalore
// SAFE LIMITS: max 15 connection requests/day + 10 messages/day
// Uses Puppeteer with saved session

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { askClaude, askClaudeSonnet } = require('../../config/claude');
const { humanizeForChannel } = require('./humanizer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DAILY_CONNECTION_LIMIT = 15;
const DAILY_MESSAGE_LIMIT = 10;
const SESSION_FILE = path.join(__dirname, '../../data/linkedin_session.json');

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min) + min));

// ─── Target job titles for Bangalore F&B decision makers ─────────────────────
const TARGET_SEARCHES = [
  'restaurant manager Bangalore',
  'F&B manager Bangalore',
  'cafe owner Bangalore',
  'food and beverage director Bangalore',
  'restaurant operations Bangalore',
  'QSR manager Bangalore',
];

// ─── LinkedIn message system prompt ──────────────────────────────────────────
const LINKEDIN_SYSTEM = `You write LinkedIn connection request notes and messages for Naisora, a web design agency in Bangalore that helps restaurant chains get more direct orders and reduce Zomato dependency.

LinkedIn audience: F&B managers, restaurant operations heads, marketing managers at restaurant chains.

Rules:
1. Professional but human — not corporate robotic language
2. Short — LinkedIn note max 200 characters, message max 5 sentences
3. Lead with a business insight, not a sales pitch
4. Never mention "SEO" — say "direct orders", "reduce delivery app commission", "Google visibility"
5. Reference their role specifically — they care about operations and revenue
6. One clear question to start a conversation`;

// ─── Save/load LinkedIn session ───────────────────────────────────────────────
function saveSession(cookies) {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies));
}

function loadSession() {
  if (fs.existsSync(SESSION_FILE)) {
    return JSON.parse(fs.readFileSync(SESSION_FILE));
  }
  return null;
}

// ─── Launch browser ───────────────────────────────────────────────────────────
async function launchBrowser() {
  return await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

// ─── Login to LinkedIn ────────────────────────────────────────────────────────
async function loginLinkedIn(page) {
  const savedCookies = loadSession();
  if (savedCookies) {
    console.log('   📂 Loading LinkedIn session cookies...');
    await page.setCookie(...savedCookies);
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(3000, 5000);

    const isLoggedIn = await page.$('div.feed-identity-module') || await page.$('div#global-nav');
    if (isLoggedIn) {
      console.log('   ✅ LinkedIn session restored');
      return true;
    } else {
      console.log('   ⚠️ LinkedIn session expired, clearing file...');
      if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    }
  }

  console.log('   🔑 Logging into LinkedIn...');
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 60000 });
  await randomDelay(2000, 3000);

  await page.waitForSelector('#username', { timeout: 10000 });
  await page.type('#username', process.env.LINKEDIN_EMAIL, { delay: 80 });
  await randomDelay(500, 1000);
  await page.type('#password', process.env.LINKEDIN_PASSWORD, { delay: 80 });
  await randomDelay(500, 1000);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
  await randomDelay(3000, 5000);

  const cookies = await page.cookies();
  saveSession(cookies);
  console.log('   ✅ Logged in, session saved');
  return true;
}


// ─── Send LinkedIn message to a single account ────────────────────────────────
async function sendLinkedInMessage(page, profileUrl, message, leadId = null) {
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });
    await randomDelay(3000, 5000);

    // Try to find Message button (for already connected or premium)
    let messageBtn = await page.$('button[aria-label^="Message"]') ||
                     await page.$('button.pvs-profile-actions__action.artdeco-button--primary');

    if (messageBtn) {
      await messageBtn.click();
      await randomDelay(2000, 3000);

      // Type and send
      const inputArea = await page.$('div[role="textbox"]') || await page.$('.msg-form__contenteditable');
      if (inputArea) {
        await inputArea.click();
        await inputArea.type(message, { delay: 60 });
        await randomDelay(1000, 2000);
        
        const sendBtn = await page.$('button.msg-form__send-button');
        if (sendBtn) await sendBtn.click();
        
        await randomDelay(1500, 2500);
        console.log(`   ✅ Direct message sent via profile`);
        return true;
      }
    }

    // If no message button, try Connection Request with Note
    const connectBtn = await page.$('button[aria-label^="Connect"]') ||
                       await page.$('button.pvs-profile-actions__action:-soup-contains("Connect")');

    if (connectBtn) {
      await connectBtn.click();
      await randomDelay(1500, 2500);

      const addNoteBtn = await page.$('button[aria-label="Add a note"]');
      if (addNoteBtn) {
        await addNoteBtn.click();
        await randomDelay(1000, 1500);

        const noteInput = await page.$('textarea[name="message"]');
        if (noteInput) {
          // LinkedIn connection note limit is 200 chars. If message > 200, truncate it.
          const note = message.length > 200 ? message.substring(0, 197) + '...' : message;
          await noteInput.type(note, { delay: 60 });
          await randomDelay(500, 1000);
          
          const sendBtn = await page.$('button[aria-label="Send now"]');
          if (sendBtn) await sendBtn.click();
          
          await randomDelay(2000, 3000);
          console.log(`   ✅ Connection request with note sent`);
          return true;
        }
      }
    }

    console.log(`   ⚠️ Could not find Message or Connect button for this profile.`);
    return false;

  } catch (err) {
    console.error(`   ❌ Failed to message/connect: ${err.message}`);
    return false;
  }
}

// ─── Main LinkedIn outreach function ─────────────────────────────────────────
async function runLinkedInOutreach() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — LinkedIn Outreach              ║');
  console.log('╚══════════════════════════════════════════════╝');

  if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
    console.log('❌ LINKEDIN_EMAIL and LINKEDIN_PASSWORD not set in .env');
    return;
  }

  // 1. Fetch warm leads that have LinkedIn URLs and haven't been messaged
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_category', 'warm')
    .not('linkedin_url', 'is', null)
    .eq('linkedin_sent', false)
    .limit(10); 

  if (error) {
    console.error('Error fetching leads:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('📭 No warm leads with LinkedIn URLs found.');
    return;
  }

  console.log(`🎯 Found ${leads.length} warm leads for LinkedIn outreach`);

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  let sent = 0;
  let skipped = 0;
  const messagedLeads = [];

  try {
    const loggedIn = await loginLinkedIn(page);
    if (!loggedIn) {
      console.log('❌ LinkedIn login failed.');
      return;
    }

    for (const lead of leads) {
      if (sent >= 10) break;

      const profileUrl = lead.linkedin_url;
      const area = lead.area || 'Bangalore';
      const leadType = lead.lead_type || 'unknown';
      const pagespeedScore = lead.pagespeed_score || 0;

      console.log(`\n👤 Preparing message for ${lead.business_name}...`);

      let prompt = '';
      if (leadType === 'no_website') {
        prompt = `Write a short LinkedIn message to the owner of ${lead.business_name} restaurant in ${area} Bangalore.
They have no website.
Pain point: missing online visibility.
Offer: free website growth plan.
Tone: professional but warm. LinkedIn style.
Sign as Nahid, Founder at Naisora.
Max 60 words.`;
      } else if (leadType === 'bad_website') {
        prompt = `Write a short LinkedIn message to the owner of ${lead.business_name} restaurant in ${area} Bangalore.
Their website scored ${pagespeedScore}/100 on Google PageSpeed.
Pain point: slow website hurting their business online.
Offer: free website audit report.
Tone: professional but warm. LinkedIn style.
Sign as Nahid, Founder at Naisora.
Max 60 words.`;
      } else if (leadType === 'weak_seo') {
        prompt = `Write a short LinkedIn message to the owner of ${lead.business_name} restaurant in ${area} Bangalore.
Their competitors rank above them on Google.
Pain point: losing potential customers to better ranked competitors.
Offer: free SEO audit.
Tone: professional but warm. LinkedIn style.
Sign as Nahid, Founder at Naisora.
Max 60 words.`;
      } else {
        console.log(`   ⏭️  Unknown lead type — skipping`);
        skipped++;
        continue;
      }

      const message = await askClaude(prompt);
      const success = await sendLinkedInMessage(page, profileUrl, message.trim(), lead.id);

      if (success) {
        sent++;
        messagedLeads.push(lead);
        
        // Update lead status
        await supabase
          .from('leads')
          .update({ linkedin_sent: true, last_contacted_at: new Date().toISOString() })
          .eq('id', lead.id);

        // Random delay 3-7 minutes between each message as requested
        if (sent < leads.length && sent < 10) {
          const waitMs = Math.floor(Math.random() * (420000 - 180000) + 180000);
          console.log(`   ⏳ Waiting ${Math.round(waitMs / 60000)} minutes...`);
          await delay(waitMs);
        }
      } else {
        skipped++;
      }
    }

  } catch (err) {
    console.error('LinkedIn outreach session error:', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 LinkedIn: ${sent} messages sent, ${skipped} skipped`);


  const today = new Date().toLocaleDateString();
  let messagedLeadsList = messagedLeads.map(l => `- ${l.business_name} — ${l.lead_type}`).join('\n');
  
  await sendTelegramAlert(
    `💼 *LinkedIn Report — ${today}*\n\n` +
    `✅ Messages sent: ${sent}\n` +
    `❌ Failed: ${skipped}\n` +
    `🔄 Follow ups sent: 0\n\n` +
    `*Leads messaged:*\n${messagedLeadsList || 'None'}`
  );
}

module.exports = { runLinkedInOutreach, loginLinkedIn };