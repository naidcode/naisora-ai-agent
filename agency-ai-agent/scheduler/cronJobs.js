// scheduler/cronJobs.js
// Naisora AI Agent — Complete Cron Schedule
// Optimized for 50 leads daily volume

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

const cron = require('node-cron');
const { sendMessage } = require('../config/telegram');

// ─── Modules ──────────────────────────────────────────────────────────────────
const { sendDailyColdEmails, sendFollowupEmails1, sendFollowupEmails2 } = require('../modules/email/emailSender');
const { runFullScrape } = require('../modules/scraper/googleMapsScraper');
const { processLeads } = require('../modules/scraper/leadProcessor');
const { sendDailyWhatsApp, sendFollowUp } = require('../modules/outreach/whatsappSender');
const { checkReplies } = require('../modules/outreach/replyReader');
const { generateDailyPriorities, weeklyPipelineSummary } = require('../modules/outreach/leadScorer');
const { auditWarmLeads } = require('../modules/seo/seoAudit');
const { publishApprovedDrafts } = require('../modules/wordpress/blogPublisher');
const { generateDashboard } = require('../modules/tracking/dashboard');

const { isStopped } = require('../system/masterSwitch');

// ─── Helper: safeJob ──────────────────────────────────────────────────────────
function safeJob(name, fn) {
  return async () => {
    if (isStopped()) {
      console.log(`\n⏭️  [Cron] Skipping job: ${name} (Agent is STOPPED)`);
      return;
    }
    console.log(`\n🕒 [Cron] Starting job: ${name}`);
    try {
      await fn();
      console.log(`✅ [Cron] ${name} completed successfully.`);
    } catch (err) {
      console.error(`❌ [Cron] ${name} failed:`, err.message);
      await sendMessage(`❌ *Cron Job Failed: ${name}*\nError: ${err.message}`);
    }
  };
}

// ─── Start All Jobs ───────────────────────────────────────────────────────────
function startAllJobs() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — Agent Scheduler (ACTIVE)       ║');
  console.log('║         Target: 50 Leads / Day Volume        ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. DAILY PRIORITY REPORT — 8:30 AM
  cron.schedule('30 8 * * *', safeJob('Daily Priority Report', async () => {
    await generateDailyPriorities();
  }));
  console.log('✅ 08:30 AM — Daily Priority Report');

  // 2. WHATSAPP OUTREACH — 10:00 AM
  cron.schedule('0 10 * * *', safeJob('WhatsApp Outreach', async () => {
    await sendDailyWhatsApp();
  }));
  console.log('✅ 10:00 AM — WhatsApp Outreach (Cold)');

  // 3. EMAIL OUTREACH — 11:00 AM
  cron.schedule('0 11 * * *', safeJob('Email Outreach', async () => {
    await sendDailyColdEmails();
  }));
  console.log('✅ 11:00 AM — Email Outreach (Cold)');

  // 4. CHECK REPLIES — Every 3 hours
  cron.schedule('0 */3 * * *', safeJob('Check Replies', async () => {
    await checkReplies();
  }));
  console.log('✅ Every 3h — Check WhatsApp Replies');

  // 5. FOLLOW-UP ENGINE — 2:00 PM
  cron.schedule('0 14 * * *', safeJob('WhatsApp Follow-up', async () => {
    await sendFollowUp();
  }));
  console.log('✅ 02:00 PM — WhatsApp Follow-ups');

  // 6. SCRAPER & AUDIT — 4:00 PM (Find new leads for tomorrow)
  cron.schedule('0 16 * * *', safeJob('Lead Scraper & Audit', async () => {
    console.log('🔍 Scraping new leads...');
    const rawLeads = await runFullScrape({
      areas: ['Koramangala', 'Indiranagar', 'HSR Layout'],
      searchTypes: ['restaurants', 'cafes'],
      maxPerSearch: 20
    });
    const processed = await processLeads(rawLeads, false);
    console.log(`✅ Processed ${processed.hot_leads.length} hot leads.`);
    
    // Audit a few
    await auditWarmLeads(10);
  }));
  console.log('✅ 04:00 PM — Scraper & SEO Audit');

  // 7. WEEKLY PIPELINE SUMMARY — Sunday 8 PM
  cron.schedule('0 20 * * 0', safeJob('Weekly Pipeline Summary', async () => {
    await weeklyPipelineSummary();
  }));
  console.log('✅ Sunday 8 PM — Weekly Pipeline Summary');

  // 8. DAILY DASHBOARD — 9:00 PM
  cron.schedule('0 21 * * *', safeJob('Daily Dashboard', async () => {
    await generateDashboard();
  }));
  console.log('✅ 09:00 PM — Daily Dashboard');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 Agent is running. All jobs scheduled.');
  console.log('📱 Telegram alerts active for all activity.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

module.exports = { startAllJobs };