// scripts/run_outreach.js
// Naisora AI Agent — Manual Outreach Trigger
// This script runs the full lead generation -> email discovery -> email outreach cycle
// Optimized for 50 leads daily volume

const { runFullScrape, getAllAreas } = require('../modules/scraper/googleMapsScraper');
const { processLeads } = require('../modules/scraper/leadProcessor');
const { scrapeEmailsForLeads } = require('../modules/scraper/emailScraper');
const { sendDailyColdEmails } = require('../modules/email/emailSender');
const { sendMessage } = require('../config/telegram');

async function runOutreachSession() {
  console.log('\n🚀 STARTING FULL OUTREACH SESSION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await sendMessage('🚀 <b>Outreach Session Started</b>\n\nAgent is generating 50 leads and sending emails to clients. WhatsApp is disabled.');

  try {
    // 1. GENERATE LEADS
    // Scrape 4-5 areas to ensure we get enough leads
    const allAreas = getAllAreas();
    const areasToScrape = allAreas.slice(0, 5); // Take first 5 areas
    
    console.log(`\n📍 Step 1: Scraping leads in ${areasToScrape.join(', ')}...`);
    const rawLeads = await runFullScrape({
      areas: areasToScrape,
      searchTypes: ['restaurants', 'cafes'],
      maxPerSearch: 20
    });

    // 2. PROCESS LEADS
    console.log('\n⚙️ Step 2: Processing leads...');
    const processedSummary = await processLeads(rawLeads);
    
    // 3. ENRICH WITH EMAILS
    console.log('\n📧 Step 3: Scraping emails for leads...');
    // We try to scrape emails for more leads than we need, to ensure we find 50
    await scrapeEmailsForLeads(100);

    // 4. SEND EMAILS
    console.log('\n📬 Step 4: Sending cold emails (Target: 50)...');
    const emailResult = await sendDailyColdEmails();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SESSION COMPLETE');
    console.log(`📊 Total Sent: ${emailResult.sent}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await sendMessage(
      `✅ <b>Outreach Session Complete</b>\n\n` +
      `📧 Emails Sent: <b>${emailResult.sent}</b>\n` +
      `❌ Failed: ${emailResult.failed}\n\n` +
      `Everything is running on <b>hey@naisora.com</b> as requested.`
    );

  } catch (error) {
    console.error('❌ Outreach session failed:', error.message);
    await sendMessage(`⚠️ <b>Outreach Session Failed</b>\n\nError: ${error.message}`);
  }
}

// Run if called directly
if (require.main === module) {
  runOutreachSession();
}

module.exports = { runOutreachSession };
