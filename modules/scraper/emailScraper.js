// modules/scraper/emailScraper.js
// Naisora AI Agent — Email Scraper
// Visits restaurant websites and extracts email addresses
// Also checks Zomato and Facebook pages if no email found on website
// Runs after lead processor — enriches leads that have websites

// Load .env directly — dotenv was adding hidden \r characters to keys
const fs = require('fs');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const cleaned = line.replace(/\r/g, '').trim();
    if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
      const [key, ...rest] = cleaned.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const puppeteer = require('puppeteer');
const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 3000) =>
  delay(Math.floor(Math.random() * (max - min) + min));

// ─── Email regex pattern ──────────────────────────────────────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// ─── Domains to ignore (not real contact emails) ─────────────────────────────
const IGNORE_DOMAINS = [
  'example.com', 'test.com', 'gmail.com', // too generic
  'sentry.io', 'wixpress.com', 'wordpress.com', // platform emails
  'cloudflare.com', 'amazonaws.com', // infrastructure
  'png', 'jpg', 'jpeg', 'gif', 'svg', // image filenames with @
];

// ─── Filter valid business emails ────────────────────────────────────────────
function filterValidEmails(emails, domain) {
  return emails.filter(email => {
    const emailLower = email.toLowerCase();

    // Skip if matches ignored domains
    if (IGNORE_DOMAINS.some(d => emailLower.includes(d))) return false;

    // Skip if it looks like an image filename
    if (emailLower.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return false;

    // Skip noreply addresses
    if (emailLower.includes('noreply') || emailLower.includes('no-reply')) return false;

    // Prefer emails from their own domain
    return true;
  });
}

// ─── Score emails — prefer business domain over gmail/yahoo ──────────────────
function scoreEmails(emails, websiteDomain) {
  return emails.sort((a, b) => {
    const aDomain = a.split('@')[1]?.toLowerCase();
    const bDomain = b.split('@')[1]?.toLowerCase();

    // Prefer emails matching their website domain
    const aMatches = websiteDomain && aDomain?.includes(websiteDomain);
    const bMatches = websiteDomain && bDomain?.includes(websiteDomain);

    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;

    // Prefer contact/info/hello over generic
    const aIsContact = ['contact', 'info', 'hello', 'reservations', 'booking']
      .some(w => a.toLowerCase().includes(w));
    const bIsContact = ['contact', 'info', 'hello', 'reservations', 'booking']
      .some(w => b.toLowerCase().includes(w));

    if (aIsContact && !bIsContact) return -1;
    if (!aIsContact && bIsContact) return 1;

    return 0;
  });
}

// ─── Extract email from a single page ────────────────────────────────────────
async function extractEmailsFromPage(page, url) {
  try {
    // ── Robust Navigation with Retries ──
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      } catch (e2) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }
    }
    await randomDelay(1000, 2500);

    const content = await page.evaluate(() => document.body.innerText + ' ' + document.body.innerHTML);
    const emails = content.match(EMAIL_REGEX) || [];
    return [...new Set(emails)]; // deduplicate
  } catch (err) {
    return [];
  }
}

// ─── Scrape email from website ────────────────────────────────────────────────
async function scrapeEmailFromWebsite(page, websiteUrl) {
  if (!websiteUrl) return null;

  // Ensure URL has protocol
  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;

  // Extract domain for scoring
  let domain = '';
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch (e) {}

  // Pages to check in order
  const pagesToCheck = [
    url,                          // homepage first
    `${url}/contact`,
    `${url}/contact-us`,
    `${url}/about`,
    `${url}/about-us`,
    `${url}/reach-us`,
  ];

  const allEmails = [];

  for (const pageUrl of pagesToCheck) {
    const emails = await extractEmailsFromPage(page, pageUrl);
    allEmails.push(...emails);

    // If we found good emails on homepage, stop checking other pages
    if (allEmails.length > 0 && pageUrl === url) break;

    await randomDelay(500, 1500);
  }

  const filtered = filterValidEmails([...new Set(allEmails)], domain);
  const scored = scoreEmails(filtered, domain);

  return scored[0] || null; // return best email
}

// ─── Scrape email from Zomato listing ────────────────────────────────────────
async function scrapeEmailFromZomato(page, businessName, area) {
  try {
    const searchQuery = encodeURIComponent(`${businessName} ${area} Bangalore`);
    await page.goto(
      `https://www.zomato.com/search?q=${searchQuery}`,
      { waitUntil: 'domcontentloaded', timeout: 60000 }
    );
    await randomDelay(2000, 3000);

    const content = await page.evaluate(() => document.body.innerText);
    const emails = content.match(EMAIL_REGEX) || [];
    const filtered = filterValidEmails(emails, '');

    return filtered[0] || null;
  } catch (err) {
    return null;
  }
}

// ─── Main: scrape emails for all leads with websites ─────────────────────────
async function scrapeEmailsForLeads(limit = 50) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — Email Scraper                  ║');
  console.log('╚══════════════════════════════════════════════╝');

  // Get leads that have website but no email yet
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('has_website', true)
    .is('email', null)
    .not('website', 'is', null)
    .order('lead_score', { ascending: false })
    .limit(limit);

  if (!leads || leads.length === 0) {
    console.log('📭 No leads need email scraping right now.');
    return;
  }

  console.log(`🎯 Scraping emails for ${leads.length} leads with websites\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  let found = 0;
  let notFound = 0;

  try {
    for (const lead of leads) {
      console.log(`\n🔍 ${lead.business_name} (${lead.area})`);
      console.log(`   Website: ${lead.website}`);

      let email = null;

      // Try website first
      email = await scrapeEmailFromWebsite(page, lead.website);

      // If no email on website, try Zomato
      if (!email) {
        console.log('   Website email not found — trying Zomato...');
        email = await scrapeEmailFromZomato(page, lead.business_name, lead.area);
      }

      if (email) {
        // Save email to Supabase
        await supabase
          .from('leads')
          .update({ email })
          .eq('id', lead.id);

        console.log(`   ✅ Email found: ${email}`);
        found++;
      } else {
        console.log('   ❌ No email found');
        notFound++;
      }

      await randomDelay(2000, 4000);
    }
  } finally {
    await browser.close();
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Email Scraping: ${found} found, ${notFound} not found`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await sendMessage(
    `📧 *Email Scraping Complete*\n\n` +
    `✅ Emails found: ${found}\n` +
    `❌ Not found: ${notFound}\n` +
    `📊 Total checked: ${leads.length}`
  );

  return { found, notFound };
}

// ─── Scrape email for a single lead (called after new lead saved) ─────────────
async function scrapeEmailForLead(lead) {
  if (!lead.has_website || !lead.website) return null;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    const email = await scrapeEmailFromWebsite(page, lead.website);
    if (email) {
      await supabase.from('leads').update({ email }).eq('id', lead.id);
      console.log(`📧 Email scraped for ${lead.business_name}: ${email}`);
    }
    return email;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeEmailsForLeads, scrapeEmailForLead };