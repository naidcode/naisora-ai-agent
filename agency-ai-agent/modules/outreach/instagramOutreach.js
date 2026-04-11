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
const SESSION_FILE = path.join(__dirname, '../../data/instagram_session.json');
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
    headless: true, // Instagram needs real browser to avoid detection, but true needed if no X server
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,800',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });
}

// ─── Login to Instagram ───────────────────────────────────────────────────────
async function loginInstagram(page) {
  // Try session first
  const savedCookies = loadSession();
  if (savedCookies) {
    await page.setCookie(...savedCookies);
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    await randomDelay(2000, 4000);

    // Check if still logged in
    const isLoggedIn = await page.$('svg[aria-label="Home"]');
    if (isLoggedIn) {
      console.log('   ✅ Instagram session restored');
      return true;
    }
  }

  // Fresh login
  console.log('   🔑 Logging into Instagram...');
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  await page.type('input[name="username"]', process.env.INSTAGRAM_USERNAME, { delay: 80 });
  await randomDelay(500, 1000);
  await page.type('input[name="password"]', process.env.INSTAGRAM_PASSWORD, { delay: 80 });
  await randomDelay(500, 1000);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  await randomDelay(3000, 5000);

  // Save session
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

// ─── Write Instagram DM using Sonnet ─────────────────────────────────────────
async function writeInstagramDM(username, profileData) {
  const prompt = `Write an Instagram DM for a restaurant/cafe Instagram account.

Username: @${username}
Bio: ${profileData.bio || 'No bio'}
Followers: ${profileData.followers}
Has website: ${profileData.hasWebsite ? 'Yes' : 'NO WEBSITE'}

The DM should feel like a genuine, casual message from a local Bangalore web agency owner who noticed their food content and wants to help them get more customers from Google.`;

  try {
    const raw = await askClaudeSonnet(prompt, IG_SYSTEM, 150);
    return await humanizeForChannel(raw, 'instagram');
  } catch (err) {
    return `Hey! Love the food content 🍽️ I help Bangalore restaurants like yours get more customers from Google instead of relying on Zomato. Quick question — are you currently getting direct bookings from your own website? — Nahid, Naisora`;
  }
}

// ─── Send DM to a single account ─────────────────────────────────────────────
async function sendInstagramDM(page, username, message) {
  try {
    // Go to their profile and click Message
    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
    await randomDelay(2000, 3000);

    // Click Message button
    const messageBtn = await page.$('div[role="button"]:-soup-contains("Message")') ||
                       await page.$('button:-soup-contains("Message")');

    if (!messageBtn) {
      console.log(`   ⚠️  No message button for @${username} — may not be following or account is private`);
      return false;
    }

    await messageBtn.click();
    await randomDelay(2000, 3000);

    // Type message
    const inputArea = await page.$('div[aria-label="Message"]') ||
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

    // Log to Supabase
    await supabase.from('outreach_log').insert({
      channel: 'instagram',
      message_type: 'cold',
      message_text: message,
      sent_at: new Date().toISOString(),
      delivered: true,
      reply_text: username, // Store username in reply_text field for Instagram
    });

    console.log(`   ✅ DM sent to @${username}`);
    return true;

  } catch (err) {
    console.error(`   ❌ Failed to DM @${username}: ${err.message}`);
    return false;
  }
}

// ─── Main Instagram outreach function ────────────────────────────────────────
async function runInstagramOutreach(searchTerms = ['restaurant Bangalore', 'cafe Bangalore', 'food Bangalore']) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — Instagram Outreach             ║');
  console.log('╚══════════════════════════════════════════════╝');

  if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
    console.log('❌ INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD not set in .env');
    return;
  }

  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  let sent = 0;
  let skipped = 0;

  try {
    await loginInstagram(page);
    await randomDelay(3000, 5000);

    for (const searchTerm of searchTerms) {
      if (sent >= DAILY_LIMIT) break;

      console.log(`\n🔍 Searching: "${searchTerm}"`);
      const accounts = await searchRestaurantAccounts(page, searchTerm, 8);
      console.log(`   Found ${accounts.length} accounts`);

      for (const username of accounts) {
        if (sent >= DAILY_LIMIT) break;

        console.log(`\n👤 Checking @${username}...`);
        const profileData = await checkNoWebsite(page, username);

        // Target: no website OR very low followers (under 500 — small local business)
        if (!profileData.hasWebsite || profileData.followers < 500) {
          console.log(`   🎯 Target! No website: ${!profileData.hasWebsite}, Followers: ${profileData.followers}`);

          const message = await writeInstagramDM(username, profileData);
          const success = await sendInstagramDM(page, username, message);

          if (success) {
            sent++;
            // Random delay 5-12 minutes between DMs
            if (sent < DAILY_LIMIT) {
              const waitMin = Math.floor(Math.random() * 7 + 5);
              console.log(`   ⏳ Waiting ${waitMin} minutes...`);
              await randomDelay(waitMin * 60000, (waitMin + 2) * 60000);
            }
          }
        } else {
          console.log(`   ⏭️  Has website + good followers — skipping`);
          skipped++;
        }

        await randomDelay(3000, 6000);
      }
    }

  } catch (err) {
    console.error('Instagram outreach error:', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Instagram: ${sent} DMs sent, ${skipped} skipped`);

  await sendTelegramAlert(
    `📸 *Instagram Outreach Complete*\n\n` +
    `DMs sent: ${sent}\n` +
    `Skipped (has website): ${skipped}\n` +
    `Daily limit: ${DAILY_LIMIT}`
  );
}

module.exports = { runInstagramOutreach };