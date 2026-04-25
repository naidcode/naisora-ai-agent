// modules/outreach/instagramOutreach.js
// Naisora AI Agent — Instagram DM Outreach
// Sends DMs from your Naisora Instagram account to restaurant owners
// Targets: accounts with food content but NO website link in bio
// SAFE LIMITS: max 20 DMs/day, 5-12 min delays, session saved to avoid re-login

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { askClaudeSonnet } = require('../../config/claude');
const { humanizeForChannel } = require('./humanizer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DAILY_LIMIT = 20;
const SESSION_FILE = path.join(__dirname, '../../data/ig_session.json');
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min) + min));

// ─── System prompt for Instagram DMs ─────────────────────────────────────────
const IG_SYSTEM = `You write Instagram DM cold outreach for Naisora, a web design agency in Bangalore helping restaurants get more customers from Google.

Rules:
1. Very short — 3-4 sentences max for Instagram DM
2. Casual and friendly — like one Bangalore local to another
3. Never say "SEO" or "digital marketing"
4. Lead with a genuine observation about their food content
5. End with one simple question
6. No formal language, no "I am writing to inform you"
7. Sound like a real person who saw their Instagram and wants to help`;

// ─── Save/load session to avoid logging in every time ────────────────────────
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

// ─── Login to Instagram ───────────────────────────────────────────────────────
async function loginInstagram(page) {
  // Try session first
  const savedCookies = loadSession();
  if (savedCookies) {
    console.log('   📂 Loading Instagram session cookies...');
    await page.setCookie(...savedCookies);
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay(3000, 5000);

    const isLoggedIn = await page.$('svg[aria-label="Home"]') || await page.$('svg[aria-label="New post"]');
    if (isLoggedIn) {
      console.log('   ✅ Instagram session restored');
      return true;
    } else {
      console.log('   ⚠️ Instagram session expired, clearing file...');
      if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    }
  }

  // Fresh login
  console.log('   🔑 Logging into Instagram...');
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 60000 });
  await randomDelay(2000, 3000);

  await page.waitForSelector('input[name="username"]', { timeout: 10000 });
  await page.type('input[name="username"]', process.env.INSTAGRAM_USERNAME, { delay: 80 });
  await randomDelay(500, 1000);
  await page.type('input[name="password"]', process.env.INSTAGRAM_PASSWORD, { delay: 80 });
  await randomDelay(500, 1000);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
  await randomDelay(3000, 5000);

  // Save session if login looks successful
  const cookies = await page.cookies();
  saveSession(cookies);
  console.log('   ✅ Logged in, session saved');
  return true;
}

// ─── Search for restaurant accounts in Bangalore ─────────────────────────────
async function searchRestaurantAccounts(page, searchQuery, limit = 10) {
  const url = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(searchQuery)}`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  const accounts = await page.evaluate(() => {
    const results = [];
    const links = document.querySelectorAll('a[href*="/"]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.match(/^\/[a-zA-Z0-9._]+\/$/) && !href.includes('explore')) {
        const username = href.replace(/\//g, '');
        if (username && username.length > 2) {
          results.push(username);
        }
      }
    });
    return [...new Set(results)].slice(0, 20);
  });

  return accounts.slice(0, limit);
}

// ─── Check if account has no website (our target) ────────────────────────────
async function checkNoWebsite(page, username) {
  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
  await randomDelay(1500, 2500);

  const profileData = await page.evaluate(() => {
    const bioEl = document.querySelector('div.-vDIg span') ||
                  document.querySelector('span._aacl._aaco._aacu._aacx._aad7._aade');
    const bio = bioEl?.textContent?.trim() || '';

    // Check for website link
    const websiteEl = document.querySelector('a.x1i10hfl[href*="http"]');
    const hasWebsite = !!websiteEl;

    // Get follower count
    const followersEl = document.querySelector('span.html-span[title]');
    const followers = followersEl?.getAttribute('title')?.replace(/,/g, '') || '0';

    return { bio, hasWebsite, followers: parseInt(followers) || 0 };
  });

  return profileData;
}

const { askClaude } = require('../../config/claude');

// ─── Send DM to a single account ─────────────────────────────────────────────
async function sendInstagramDM(page, username, message, leadId = null) {
  try {
    // Go to their profile and click Message
    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
    await randomDelay(2000, 3000);

    // Click Message button
    const messageBtn = await page.$('div[role="button"]:-soup-contains("Message")') ||
                       await page.$('button:-soup-contains("Message")') ||
                       await page.$('button._acan._acap._acas._aj1-._ap30'); // Generic blue button selector fallback

    if (!messageBtn) {
      console.log(`   ⚠️  No message button for @${username} — may not be following or account is private`);
      return false;
    }

    await messageBtn.click();
    await randomDelay(3000, 5000);

    // Type message
    const inputArea = await page.$('div[aria-label="Message"]') ||
                      await page.$('div[role="textbox"]') ||
                      await page.$('textarea[placeholder]');

    if (!inputArea) {
      console.log(`   ⚠️  Could not find message input for @${username}`);
      return false;
    }

    await inputArea.click();
    await inputArea.type(message, { delay: 60 });
    await randomDelay(1000, 2000);

    // Send
    await page.keyboard.press('Enter');
    await randomDelay(1500, 2500);

    // Log to outreach_log
    await supabase.from('outreach_log').insert({
      lead_id: leadId,
      channel: 'instagram',
      message_type: 'cold',
      message_text: message,
      sent_at: new Date().toISOString(),
      delivered: true,
      reply_text: username, 
    });

    console.log(`   ✅ DM sent to @${username}`);
    return true;

  } catch (err) {
    console.error(`   ❌ Failed to DM @${username}: ${err.message}`);
    return false;
  }
}

// ─── Main Instagram outreach function ────────────────────────────────────────
async function runInstagramOutreach() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — Instagram Outreach             ║');
  console.log('╚══════════════════════════════════════════════╝');

  if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
    console.log('❌ INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD not set in .env');
    return;
  }

  // 1. Fetch hot leads that have Instagram handles and haven't been messaged
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_category', 'hot')
    .not('instagram_handle', 'is', null)
    .eq('instagram_dm_sent', false)
    .limit(10); 

  if (error) {
    console.error('Error fetching leads:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('📭 No hot leads with Instagram handles found.');
    return;
  }

  console.log(`🎯 Found ${leads.length} hot leads for Instagram outreach`);

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  let sent = 0;
  let skipped = 0;
  const messagedLeads = [];

  try {
    const loggedIn = await loginInstagram(page);
    if (!loggedIn) {
      console.log('❌ Instagram login failed.');
      return;
    }

    for (const lead of leads) {
      if (sent >= 10) break;

      const username = lead.instagram_handle.replace('@', '').trim();
      const area = lead.area || 'Bangalore';
      const leadType = lead.lead_type || 'unknown';
      const pagespeedScore = lead.pagespeed_score || 0;

      console.log(`\n👤 Preparing DM for @${username} (${lead.business_name})...`);

      let prompt = '';
      if (leadType === 'no_website') {
        prompt = `Write a short Instagram DM to ${lead.business_name} restaurant in ${area} Bangalore.
They have no website.
Pain point: losing customers to competitors with websites.
Offer: free growth plan ready.
Tone: casual, warm, natural Instagram style. Not salesy.
Sign as Nahid from Naisora.
Max 40 words.`;
      } else if (leadType === 'bad_website') {
        prompt = `Write a short Instagram DM to ${lead.business_name} restaurant in ${area} Bangalore.
Their website scored ${pagespeedScore}/100 on Google speed test.
Pain point: slow website hurting Google ranking.
Offer: free audit report ready to share.
Tone: casual, warm, natural Instagram style. Not salesy.
Sign as Nahid from Naisora.
Max 40 words.`;
      } else if (leadType === 'weak_seo') {
        prompt = `Write a short Instagram DM to ${lead.business_name} restaurant in ${area} Bangalore.
Their competitors rank above them on Google.
Pain point: missing customers who search on Google.
Offer: free SEO audit ready.
Tone: casual, warm, natural Instagram style. Not salesy.
Sign as Nahid from Naisora.
Max 40 words.`;
      } else {
        console.log(`   ⏭️  Unknown lead type — skipping`);
        skipped++;
        continue;
      }

      const message = await askClaude(prompt);
      const success = await sendInstagramDM(page, username, message.trim(), lead.id);

      if (success) {
        sent++;
        messagedLeads.push(lead);
        
        // Update lead status
        await supabase
          .from('leads')
          .update({ instagram_dm_sent: true, last_contacted_at: new Date().toISOString() })
          .eq('id', lead.id);

        // Random delay 2-5 minutes between each DM as requested
        if (sent < leads.length && sent < 10) {
          const waitMs = Math.floor(Math.random() * (300000 - 120000) + 120000);
          console.log(`   ⏳ Waiting ${Math.round(waitMs / 60000)} minutes...`);
          await delay(waitMs);
        }
      } else {
        skipped++;
      }
    }

  } catch (err) {
    console.error('Instagram outreach session error:', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Instagram: ${sent} DMs sent, ${skipped} skipped`);

  const today = new Date().toLocaleDateString();
  let hotLeadsList = messagedLeads.map(l => `- ${l.business_name} — @${l.instagram_handle.replace('@', '')} — ${l.lead_type}`).join('\n');
  
  await sendTelegramAlert(
    `📸 *Instagram DM Report — ${today}*\n\n` +
    `✅ DMs sent: ${sent}\n` +
    `❌ Failed: ${skipped}\n` +
    `🔄 Follow ups sent: 0\n\n` +
    `*Leads DMed:*\n${hotLeadsList || 'None'}`
  );
}

module.exports = { runInstagramOutreach, loginInstagram };