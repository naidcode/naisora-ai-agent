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
const { askClaudeSonnet } = require('../../config/claude');
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

// ─── Search for profiles ──────────────────────────────────────────────────────
async function searchProfiles(page, query, limit = 8) {
  const encoded = encodeURIComponent(query);
  await page.goto(
    `https://www.linkedin.com/search/results/people/?keywords=${encoded}&origin=GLOBAL_SEARCH_HEADER`,
    { waitUntil: 'networkidle2' }
  );
  await randomDelay(3000, 5000);

  const profiles = await page.evaluate(() => {
    const results = [];
    const cards = document.querySelectorAll('.entity-result__item');

    cards.forEach(card => {
      const nameEl = card.querySelector('.entity-result__title-text a');
      const titleEl = card.querySelector('.entity-result__primary-subtitle');
      const locationEl = card.querySelector('.entity-result__secondary-subtitle');
      const profileUrl = nameEl?.getAttribute('href');

      const name = nameEl?.textContent?.trim();
      const title = titleEl?.textContent?.trim();
      const location = locationEl?.textContent?.trim();

      if (name && profileUrl && location?.toLowerCase().includes('bangalore')) {
        results.push({ name, title, location, profileUrl });
      }
    });

    return results;
  });

  return profiles.slice(0, limit);
}

// ─── Write LinkedIn connection note ──────────────────────────────────────────
async function writeConnectionNote(profile) {
  const prompt = `Write a LinkedIn connection request note (MAX 200 characters) for:

Name: ${profile.name}
Title: ${profile.title}
Location: ${profile.location}

The note should feel like a genuine professional reaching out, not a sales pitch. Short, specific, curious.`;

  try {
    const raw = await askClaudeSonnet(prompt, LINKEDIN_SYSTEM, 100);
    const humanized = await humanizeForChannel(raw, 'linkedin');
    // Enforce 200 char limit
    return humanized.substring(0, 197) + (humanized.length > 197 ? '...' : '');
  } catch (err) {
    return `Hi ${profile.name.split(' ')[0]}, I help Bangalore restaurant teams reduce delivery app dependency. Would love to connect!`;
  }
}

// ─── Write LinkedIn direct message ───────────────────────────────────────────
async function writeLinkedInMessage(profile) {
  const prompt = `Write a LinkedIn direct message for:

Name: ${profile.name}
Title: ${profile.title || 'F&B Manager'}
Location: ${profile.location || 'Bangalore'}

They manage a restaurant chain or F&B operation. We help restaurant chains get more direct orders, build their own website system, and reduce Zomato/Swiggy commission dependency.

Keep it 3-4 sentences. One clear question at the end.`;

  try {
    const raw = await askClaudeSonnet(prompt, LINKEDIN_SYSTEM, 200);
    return await humanizeForChannel(raw, 'linkedin');
  } catch (err) {
    return `Hi ${profile.name.split(' ')[0]}, I work with Bangalore restaurant chains to help them get more direct orders and reduce delivery app commission costs. I noticed you're in F&B operations — is reducing third-party platform dependency something your team is focused on right now?`;
  }
}

// ─── Send connection request ──────────────────────────────────────────────────
async function sendConnectionRequest(page, profile, note) {
  try {
    await page.goto(profile.profileUrl, { waitUntil: 'networkidle2' });
    await randomDelay(2000, 3000);

    // Find Connect button
    const connectBtn = await page.$('button[aria-label*="Connect"]') ||
                       await page.$('button:-soup-contains("Connect")');

    if (!connectBtn) {
      // Already connected or following
      console.log(`   ⏭️  Already connected with ${profile.name}`);
      return false;
    }

    await connectBtn.click();
    await randomDelay(1500, 2500);

    // Click "Add a note"
    const addNoteBtn = await page.$('button[aria-label="Add a note"]');
    if (addNoteBtn) {
      await addNoteBtn.click();
      await randomDelay(1000, 1500);

      const noteInput = await page.$('textarea[name="message"]');
      if (noteInput) {
        await noteInput.type(note, { delay: 60 });
        await randomDelay(500, 1000);
      }
    }

    // Send
    const sendBtn = await page.$('button[aria-label="Send now"]') ||
                    await page.$('button:-soup-contains("Send")');
    if (sendBtn) {
      await sendBtn.click();
      await randomDelay(2000, 3000);
    }

    // Log to Supabase
    await supabase.from('outreach_log').insert({
      channel: 'linkedin',
      message_type: 'connection_request',
      message_text: note,
      sent_at: new Date().toISOString(),
      delivered: true,
      reply_text: profile.name + ' — ' + profile.title,
    });

    console.log(`   ✅ Connection request sent to ${profile.name}`);
    return true;

  } catch (err) {
    console.error(`   ❌ Failed connection to ${profile.name}: ${err.message}`);
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

  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  let connectionsSent = 0;

  try {
    await loginLinkedIn(page);
    await randomDelay(3000, 5000);

    for (const searchQuery of TARGET_SEARCHES) {
      if (connectionsSent >= DAILY_CONNECTION_LIMIT) break;

      console.log(`\n🔍 Searching: "${searchQuery}"`);
      const profiles = await searchProfiles(page, searchQuery, 6);
      console.log(`   Found ${profiles.length} Bangalore profiles`);

      for (const profile of profiles) {
        if (connectionsSent >= DAILY_CONNECTION_LIMIT) break;

        console.log(`\n👤 ${profile.name} — ${profile.title}`);

        const note = await writeConnectionNote(profile);
        const success = await sendConnectionRequest(page, profile, note);

        if (success) {
          connectionsSent++;
          // 8-15 minute delay between connection requests
          const waitMin = Math.floor(Math.random() * 7 + 8);
          console.log(`   ⏳ Waiting ${waitMin} minutes...`);
          await randomDelay(waitMin * 60000, (waitMin + 3) * 60000);
        }

        await randomDelay(3000, 6000);
      }
    }

  } catch (err) {
    console.error('LinkedIn outreach error:', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 LinkedIn: ${connectionsSent} connection requests sent`);

  await sendTelegramAlert(
    `💼 *LinkedIn Outreach Complete*\n\n` +
    `Connection requests: ${connectionsSent}\n` +
    `Daily limit: ${DAILY_CONNECTION_LIMIT}\n` +
    `Targets: F&B managers, restaurant chains, Bangalore`
  );
}

module.exports = { runLinkedInOutreach, loginLinkedIn };