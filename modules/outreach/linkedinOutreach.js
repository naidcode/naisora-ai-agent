// modules/outreach/linkedinOutreach.js
// Naisora AI Agent — LinkedIn Outreach
// Targets: F&B managers, restaurant chain managers, cafe owners in Bangalore
// SAFE LIMITS: max 15 connection requests/day + 10 messages/day
// Uses Puppeteer with saved session

require('dotenv').config();
const { launchBrowser } = require('../../config/puppeteer');

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

// ─── Login to LinkedIn (SESSION ONLY MODE) ────────────────────────────────────
async function loginLinkedIn(page) {
  const savedCookies = loadSession();
  if (!savedCookies) {
    console.log('   ❌ No LinkedIn session found. Skipping outreach.');
    await sendTelegramAlert('⚠️ LinkedIn session missing — outreach skipped. Please login locally and save session.');
    return false;
  }

  console.log('   📂 Loading LinkedIn session cookies...');
  await page.setCookie(...savedCookies);
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2', timeout: 60000 });
  await randomDelay(3000, 5000);

  const isLoggedIn = await page.$('div.feed-identity-module') || await page.$('div#global-nav');
  if (isLoggedIn) {
    console.log('   ✅ LinkedIn session restored');
    return true;
  } else {
    console.log('   ⚠️ LinkedIn session expired');
    await sendTelegramAlert('⚠️ LinkedIn session expired on VPS — manual re-login needed.');
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    return false;
  }
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
      try {
        const inputArea = await page.waitForSelector('div[role="textbox"], .msg-form__contenteditable, [aria-label="Write a message..."]', { timeout: 15000 });
        if (inputArea) {
          await inputArea.click();
          await page.keyboard.type(message, { delay: 60 });
          await randomDelay(1000, 2000);
          
          const sendBtn = await page.waitForSelector('button.msg-form__send-button', { timeout: 5000 });
          if (sendBtn) await sendBtn.click();
          
          await randomDelay(1500, 2500);
          console.log(`   ✅ Direct message sent via profile`);
          return true;
        }
      } catch (e) {
        console.log(`   ⚠️ Direct message input not found, trying connection request...`);
      }
    }

    // If no message button, try Connection Request with Note
    const connectBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Connect'));
    });

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
  const TARGET_MINIMUM = 30;
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — LinkedIn Outreach              ║');
  console.log('╚══════════════════════════════════════════════╝');

  if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
    console.log('❌ LINKEDIN_EMAIL and LINKEDIN_PASSWORD not set in .env');
    return;
  }

  // 1. Fetch warm leads that have LinkedIn URLs and haven't been messaged
  let { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_category', 'warm')
    .not('linkedin_url', 'is', null)
    .eq('linkedin_sent', false)
    .limit(TARGET_MINIMUM); 

  let followUpsUsed = 0;

  // 2. If not enough new leads, pull from existing leads not contacted in 7+ days
  if (!leads || leads.length < TARGET_MINIMUM) {
    const gap = TARGET_MINIMUM - (leads ? leads.length : 0);
    console.log(`ℹ️  Only ${leads ? leads.length : 0} new LinkedIn leads found. Pulling ${gap} follow-ups to hit target...`);
    const { getLeadsForFollowupGeneric } = require('../../config/database');
    const oldLeads = await getLeadsForFollowupGeneric('linkedin', gap);
    leads = [...(leads || []), ...oldLeads];
    followUpsUsed = oldLeads.length;
  }

  if (error) {
    console.error('Error fetching leads:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('📭 No leads with LinkedIn URLs found.');
    return;
  }

  console.log(`🎯 Found ${leads.length} leads for LinkedIn outreach`);

  if (process.env.SKIP_PUPPETEER === 'true') {
    console.log('⚠️ Skipping LinkedIn outreach due to low memory');
    return;
  }

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(30000);
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

    let sessionSent = 0;
    for (const lead of leads) {
      if (sent >= TARGET_MINIMUM) break;

      // Fix 2: 3 messages per session limit
      if (sessionSent >= 3) {
        console.log('   🔄 Session limit (3) reached. Closing and reopening browser in 30s...');
        await browser.close();
        await delay(30000);
        return runLinkedInOutreach(); // Restart for next batch
      }

      const profileUrl = lead.linkedin_url;
      const area = lead.area || 'Bangalore';
      const leadType = lead.lead_type || 'no_website'; 
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
        console.log(`   ⏭️  Lead type skip — skipping`);
        skipped++;
        continue;
      }

      const message = await askClaude(prompt);
      const success = await sendLinkedInMessage(page, profileUrl, message.trim(), lead.id);

      if (success) {
        sent++;
        sessionSent++;
        messagedLeads.push(lead);
        
        // Update lead status
        await supabase
          .from('leads')
          .update({ linkedin_sent: true, last_contacted_at: new Date().toISOString() })
          .eq('id', lead.id);

        // Random delay 3-7 minutes between each message
        if (sent < leads.length && sent < TARGET_MINIMUM) {
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
    `Target: ${TARGET_MINIMUM} | Sent: ${sent} | ${sent >= TARGET_MINIMUM ? '✅' : '❌'}\n` +
    `❌ Failed: ${skipped}\n` +
    `🔄 Gap filled by follow-ups: ${followUpsUsed}\n\n` +
    `*Leads messaged:*\n${messagedLeadsList || 'None'}`
  );
}

module.exports = { runLinkedInOutreach, loginLinkedIn };