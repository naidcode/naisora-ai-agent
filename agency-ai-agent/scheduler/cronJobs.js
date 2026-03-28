// scheduler/cronJobs.js
// Naisora AI Agent — Complete Cron Schedule (Week 1 + Week 2 + Week 3)
// All automated tasks with their exact timings

require('dotenv').config();
const cron = require('node-cron');
const { sendTelegramAlert } = require('../config/telegram');

// ─── Week 1 imports ───────────────────────────────────────────────────────────
const { sendDailyColdEmails, sendDailyFollowups } = require('../modules/email/emailSender');

// ─── Week 2 imports ───────────────────────────────────────────────────────────
const { runFullScrape } = require('../modules/scraper/googleMapsScraper');
const { processLeads } = require('../modules/scraper/leadProcessor');
const { getReadyLeads } = require('../modules/scraper/leadDeduplicator');

// ─── Week 3 imports ───────────────────────────────────────────────────────────
const { sendDailyWhatsApp, sendFollowUp } = require('../modules/outreach/whatsappSender');
const { checkReplies } = require('../modules/outreach/replyReader');
const { generateDailyPriorities, weeklyPipelineSummary } = require('../modules/outreach/leadScorer');
const { runInstagramOutreach } = require('../modules/outreach/instagramOutreach');
const { runLinkedInOutreach } = require('../modules/outreach/linkedinOutreach');

// ─── Week 4 imports ────────────────────────────────────────────────
const { scrapeEmailsForLeads } = require('../modules/scraper/emailScraper');
const { auditWarmLeads } = require('../modules/seo/seoAudit');
const { publishApprovedDrafts } = require('../modules/wordpress/blogPublisher');

function safeJob(name, fn) {
  return async () => {
    try {
      console.log(`\n⏰ [CRON] Starting: ${name}`);
      await fn();
      console.log(`✅ [CRON] Completed: ${name}`);
    } catch (err) {
      console.error(`❌ [CRON] Failed: ${name} — ${err.message}`);
      await sendTelegramAlert(`❌ *Cron Job Failed*\n\nJob: ${name}\nError: ${err.message}`);
    }
  };
}

function startAllJobs() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — Agent Scheduler Starting       ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── DAILY PRIORITY REPORT — 8:30 AM ──────────────────────────────────────
  // Tells you every morning who to follow up with today
  cron.schedule('30 8 * * *', safeJob('Daily Priority Report', async () => {
    await generateDailyPriorities();
  }));
  console.log('✅ 8:30 AM  — Daily priority report (Telegram)');

  // ── GOOGLE MAPS SCRAPE — 9 AM (Mon, Wed, Fri) ────────────────────────────
  // Scrapes 5 areas × 2 types = ~150 leads, 3 days/week
  cron.schedule('0 9 * * 1,3,5', safeJob('Google Maps Scrape', async () => {
    const areas = ['Koramangala', 'Indiranagar', 'HSR Layout', 'Jayanagar', 'JP Nagar'];
    const rawLeads = await runFullScrape({
      areas,
      searchTypes: ['restaurants', 'cafes'],
      maxPerSearch: 15,
    });
    await getReadyLeads(rawLeads);
  }));
  console.log('✅ 9:00 AM  — Google Maps scrape (Mon/Wed/Fri)');

  // ── WHATSAPP OUTREACH — 11 AM daily ──────────────────────────────────────
  // Sends to 30 hot leads, humanized messages, random delays
  cron.schedule('0 11 * * *', safeJob('WhatsApp Outreach', async () => {
    await sendDailyWhatsApp();
  }));
  console.log('✅ 11:00 AM — WhatsApp outreach (30 leads/day)');

  // ── EMAIL OUTREACH — 10 AM daily ─────────────────────────────────────────
  // Cold emails to leads with email addresses
  cron.schedule('0 10 * * *', safeJob('Email Cold Outreach', async () => {
    await sendDailyColdEmails();
  }));
  console.log('✅ 10:00 AM — Email outreach (50 leads/day)');

  // ── WHATSAPP FOLLOW-UPS — 6 PM daily ─────────────────────────────────────
  // Day 3 follow-ups to non-responders
  cron.schedule('0 18 * * *', safeJob('WhatsApp & Email Follow-ups', async () => {
    await sendFollowUp();
    await sendDailyFollowups();
  }));
  console.log('✅ 6:00 PM  — Follow-ups (WhatsApp + Email)');

  // ── REPLY CHECKER — Every 2 hours (9 AM to 9 PM) ─────────────────────────
  cron.schedule('0 9,11,13,15,17,19,21 * * *', safeJob('Check WhatsApp Replies', async () => {
    await checkReplies();
  }));
  console.log('✅ Every 2h — Reply checker (9 AM to 9 PM)');

  // ── INSTAGRAM OUTREACH — 3 PM (Tue, Thu) ─────────────────────────────────
  // 2 days/week, 20 DMs each = 40 DMs/week
  cron.schedule('0 15 * * 2,4', safeJob('Instagram Outreach', async () => {
    await runInstagramOutreach();
  }));
  console.log('✅ 3:00 PM  — Instagram outreach (Tue/Thu, 20 DMs)');

  // ── LINKEDIN OUTREACH — 2 PM (Mon, Wed) ──────────────────────────────────
  // 2 days/week, 15 connection requests each = 30/week
  cron.schedule('0 14 * * 1,3', safeJob('LinkedIn Outreach', async () => {
    await runLinkedInOutreach();
  }));
  console.log('✅ 2:00 PM  — LinkedIn outreach (Mon/Wed, 15 requests)');

  // ── WEEKLY PIPELINE SUMMARY — Sunday 8 PM ────────────────────────────────
  cron.schedule('0 20 * * 0', safeJob('Weekly Pipeline Summary', async () => {
    await weeklyPipelineSummary();
  }));
  console.log('✅ Sunday 8 PM — Weekly pipeline summary');

  // ── WEEKLY BUSINESS REPORT — Monday 8 AM ─────────────────────────────────
  cron.schedule('0 8 * * 1', safeJob('Weekly Business Report', async () => {
    const { getWeeklyStats } = require('../config/database');
    const stats = await getWeeklyStats();
    await sendTelegramAlert(
      `📊 *Weekly Business Report — Naisora*\n\n` +
      `New leads found: ${stats.newLeads}\n` +
      `Emails sent: ${stats.emailsSent}\n` +
      `Replies received: ${stats.replies}\n` +
      `🔥 Hot leads: ${stats.hotLeads}\n\n` +
      `Keep going — first client is close.`
    );
  }));
  console.log('✅ Monday 8 AM — Weekly business report\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 Agent is running. All jobs scheduled.');
  console.log('📱 You will receive Telegram alerts for all activity.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ── EMAIL SCRAPER — 10 AM (Tue, Thu) ─────────────────────────────────────
  // Scrapes emails from websites of leads that have sites
  cron.schedule('0 10 * * 2,4', safeJob('Email Scraper', async () => {
    await scrapeEmailsForLeads(30);
  }));
  console.log('✅ 10:00 AM — Email scraper (Tue/Thu, 30 leads)');

  // ── SEO AUDIT — 11 AM (Tue, Thu) ─────────────────────────────────────────
  // Audits websites of warm leads — generates score for cold emails
  cron.schedule('0 11 * * 2,4', safeJob('SEO Audit Warm Leads', async () => {
    await auditWarmLeads(10);
  }));
  console.log('✅ 11:00 AM — SEO audit warm leads (Tue/Thu)');

  // ── PUBLISH APPROVED BLOGS — 9 AM daily ──────────────────────────────────
  // Checks for approved blog drafts and publishes them
  cron.schedule('0 9 * * *', safeJob('Publish Approved Blogs', async () => {
    await publishApprovedDrafts();
  }));
  console.log('✅ 9:00 AM  — Publish approved blog drafts (daily)');
}

module.exports = { startAllJobs };