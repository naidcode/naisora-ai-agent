// scheduler/cronJobs.js
// Naisora AI Agent — Complete Cron Schedule
// Fixed: correct function names, correct module paths, circular dependency removed

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

const cron = require('node-cron');
const { sendMessage } = require('../config/telegram');

// ─── Email ────────────────────────────────────────────────────────────────────
const { sendDailyColdEmails, sendFollowupEmails1, sendFollowupEmails2 } = require('../modules/email/emailSender');

// ─── Scraper ──────────────────────────────────────────────────────────────────
const { runFullScrape } = require('../modules/scraper/googleMapsScraper');
const { processLeads } = require('../modules/scraper/leadProcessor');
const { getReadyLeads } = require('../modules/scraper/leadDeduplicator');
const { scrapeEmailsForLeads } = require('../modules/scraper/emailScraper');

// ─── Outreach ─────────────────────────────────────────────────────────────────
const { sendDailyWhatsApp, sendFollowUp } = require('../modules/outreach/whatsappSender');
const { checkReplies } = require('../modules/outreach/replyReader');
const { generateDailyPriorities, weeklyPipelineSummary } = require('../modules/outreach/leadScorer');
const { runInstagramOutreach } = require('../modules/outreach/instagramOutreach');
const { runLinkedInOutreach } = require('../modules/outreach/linkedinOutreach');

// ─── SEO ──────────────────────────────────────────────────────────────────────
const { auditWarmLeads } = require('../modules/seo/seoAudit');
const { runWeeklySeoForAllClients } = require('../modules/seo/weeklySeoEngine');

// ─── WordPress ────────────────────────────────────────────────────────────────
const { publishApprovedDrafts } = require('../modules/wordpress/blogPublisher');

// ─── Off-page ─────────────────────────────────────────────────────────────────
const { scheduleGBPPosts } = require('../modules/offpage/socialPublisher');

// ─── Reporting ────────────────────────────────────────────────────────────────
const { runMonthlyReportsForAllClients } = require('../modules/reporting/monthlyReport');
const { runMonthlyMentorSession } = require('../modules/reporting/mentorLLM');
const { sendWeeklyReportsToAllClients } = require('../modules/reporting/weeklyWhatsapp');
const { checkUpcomingRenewals, weeklyCostSummary } = require('../modules/reporting/billingAlerter');
const { weeklyFinancialSummary } = require('../modules/reporting/financialTracker');
const { generateDashboard } = require('../modules/tracking/dashboard');

// ─── Intelligence ─────────────────────────────────────────────────────────────
const { analyseOutreachPerformance } = require('../modules/intelligence/selfImprover');

// ─── Social ───────────────────────────────────────────────────────────────────
// FIX: correct paths — ../modules not ./modules
// FIX: circular dependency removed — contentPlanner no longer imports from socialAnalyser
const { run: runSocialAnalyser } = require('../modules/social/socialAnalyser');
const { run: runContentPlanner } = require('../modules/social/contentPlanner');
const { run: runPerformanceTracker } = require('../modules/social/performanceTracker');

// ─── Safe wrapper ─────────────────────────────────────────────────────────────
function safeJob(name, fn) {
  return async () => {
    try {
      console.log(`\n⏰ [CRON] Starting: ${name}`);
      await fn();
      console.log(`✅ [CRON] Completed: ${name}`);
    } catch (err) {
      console.error(`❌ [CRON] Failed: ${name} — ${err.message}`);
      await sendMessage(`❌ *Cron Job Failed*\n\nJob: ${name}\nError: ${err.message}`);
    }
  };
}

function startAllJobs() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — Agent Scheduler Starting       ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── DAILY PRIORITY REPORT — 8:30 AM daily ────────────────────────────────
  cron.schedule('30 8 * * *', safeJob('Daily Priority Report', async () => {
    await generateDailyPriorities();
  }));
  console.log('✅ 8:30 AM  — Daily priority report');

  // ── GOOGLE MAPS SCRAPE — 9 AM (Mon, Wed, Fri) ────────────────────────────
  cron.schedule('0 9 * * 1,3,5', safeJob('Google Maps Scrape', async () => {
    const areas = ['Koramangala', 'Indiranagar', 'HSR Layout', 'Jayanagar', 'JP Nagar'];
    const rawLeads = await runFullScrape({
      areas,
      searchTypes: ['restaurants', 'cafes'],
      maxPerSearch: 15,
    });
    // FIX: processLeads was imported but never called — now called after scrape
    if (rawLeads && rawLeads.length > 0) {
      await processLeads(rawLeads);
      await getReadyLeads(rawLeads);
    }
  }));
  console.log('✅ 9:00 AM  — Google Maps scrape (Mon/Wed/Fri)');

  // ── EMAIL OUTREACH — 10 AM daily ─────────────────────────────────────────
  cron.schedule('0 10 * * *', safeJob('Email Cold Outreach', async () => {
    await sendDailyColdEmails();
  }));
  console.log('✅ 10:00 AM — Email cold outreach (50/day)');

  // ── WHATSAPP OUTREACH — 11 AM daily ──────────────────────────────────────
  cron.schedule('0 11 * * *', safeJob('WhatsApp Outreach', async () => {
    await sendDailyWhatsApp();
  }));
  console.log('✅ 11:00 AM — WhatsApp outreach (30 leads/day)');

  // ── FOLLOW-UPS — 6 PM daily ──────────────────────────────────────────────
  // FIX: was calling sendDailyFollowups which does not exist
  // correct function name is runFollowUps
 cron.schedule('0 18 * * *', safeJob('WhatsApp & Email Follow-ups', async () => {
    await sendFollowUp();
    await sendFollowupEmails1();
    await sendFollowupEmails2();
}));
  console.log('✅ 6:00 PM  — Follow-ups (WhatsApp + Email)');

  // ── REPLY CHECKER — Every 2 hours (9 AM to 9 PM) ─────────────────────────
  cron.schedule('0 9,11,13,15,17,19,21 * * *', safeJob('Check WhatsApp Replies', async () => {
    await checkReplies();
  }));
  console.log('✅ Every 2h — Reply checker (9 AM to 9 PM)');

  // ── EMAIL SCRAPER — 10 AM (Tue, Thu) ─────────────────────────────────────
  cron.schedule('0 10 * * 2,4', safeJob('Email Scraper', async () => {
    await scrapeEmailsForLeads(30);
  }));
  console.log('✅ 10:00 AM — Email scraper (Tue/Thu)');

  // ── SEO AUDIT WARM LEADS — 11 AM (Tue, Thu) ──────────────────────────────
  cron.schedule('0 11 * * 2,4', safeJob('SEO Audit Warm Leads', async () => {
    await auditWarmLeads(10);
  }));
  console.log('✅ 11:00 AM — SEO audit warm leads (Tue/Thu)');

  // ── INSTAGRAM OUTREACH — 3 PM (Tue, Thu) ─────────────────────────────────
  cron.schedule('0 15 * * 2,4', safeJob('Instagram Outreach', async () => {
    await runInstagramOutreach();
  }));
  console.log('✅ 3:00 PM  — Instagram outreach (Tue/Thu)');

  // ── LINKEDIN OUTREACH — 2 PM (Mon, Wed) ──────────────────────────────────
  cron.schedule('0 14 * * 1,3', safeJob('LinkedIn Outreach', async () => {
    await runLinkedInOutreach();
  }));
  console.log('✅ 2:00 PM  — LinkedIn outreach (Mon/Wed)');

  // ── PUBLISH APPROVED BLOGS — 9 AM daily ──────────────────────────────────
  cron.schedule('0 9 * * *', safeJob('Publish Approved Blogs', async () => {
    await publishApprovedDrafts();
  }));
  console.log('✅ 9:00 AM  — Publish approved blog drafts');

  // ── WEEKLY SEO ENGINE — Monday 6 AM ──────────────────────────────────────
  cron.schedule('0 6 * * 1', safeJob('Weekly SEO Engine', async () => {
    await runWeeklySeoForAllClients();
  }));
  console.log('✅ Monday 6 AM — Weekly SEO engine');

  // ── LINKEDIN OUTREACH — 2 PM (Mon, Wed) ──────────────────────────────────
  cron.schedule('0 9 * * 1', safeJob('Weekly Business Report', async () => {
    const { getWeeklyStats } = require('../config/database');
    const stats = await getWeeklyStats();
    await sendMessage(
      `📊 *Weekly Business Report — Naisora*\n\n` +
      `New leads: ${stats.newLeads}\n` +
      `Emails sent: ${stats.emailsSent}\n` +
      `Replies: ${stats.replies}\n` +
      `🔥 Hot leads: ${stats.hotLeads}\n\n` +
      `Keep going — first client is close.`
    );
  }));
  console.log('✅ Monday 8 AM — Weekly business report');

  // ── BILLING ALERTS — Monday 9 AM ─────────────────────────────────────────
  cron.schedule('0 9 * * 1', safeJob('Billing Alerts', async () => {
    await checkUpcomingRenewals();
    await weeklyCostSummary();
    await weeklyFinancialSummary();
  }));
  console.log('✅ Monday 9 AM — Billing and financial alerts');

  // ── WEEKLY CLIENT WHATSAPP — Sunday 7 PM ─────────────────────────────────
  cron.schedule('0 19 * * 0', safeJob('Weekly Client WhatsApp Reports', async () => {
    await sendWeeklyReportsToAllClients();
  }));
  console.log('✅ Sunday 7 PM — Weekly client WhatsApp reports');

  // ── WEEKLY PIPELINE SUMMARY — Sunday 8 PM ────────────────────────────────
  cron.schedule('0 20 * * 0', safeJob('Weekly Pipeline Summary', async () => {
    await weeklyPipelineSummary();
  }));
  console.log('✅ Sunday 8 PM — Weekly pipeline summary');

  // ── SELF IMPROVEMENT — Sunday 10 PM ──────────────────────────────────────
  cron.schedule('0 22 * * 0', safeJob('Self Improvement Analysis', async () => {
    await analyseOutreachPerformance();
  }));
  console.log('✅ Sunday 10 PM — Self improvement analysis');

  // ── SOCIAL PERFORMANCE REPORT — Sunday 8 AM ──────────────────────────────
  // FIX: was using wrong path ./modules — correct is ../modules
  // FIX: now uses imported function at top, not inline require
  cron.schedule('0 8 * * 0', safeJob('Weekly Social Performance Report', async () => {
    await runPerformanceTracker();
  }));
  console.log('✅ Sunday 8 AM — Social performance report');

  // ── WEEKLY CONTENT PLAN — Sunday 9 AM ────────────────────────────────────
  // FIX: was using wrong path ./modules — correct is ../modules
  cron.schedule('0 9 * * 0', safeJob('Weekly Content Plan', async () => {
    await runContentPlanner();
  }));
  console.log('✅ Sunday 9 AM — Weekly content plan (all accounts)');

  // ── DASHBOARD — Sunday 8 AM ───────────────────────────────────────────────
  cron.schedule('0 8 * * 0', safeJob('Full Dashboard Report', async () => {
    await generateDashboard();
  }));
  console.log('✅ Sunday 8 AM — Full dashboard report');

  // ── GBP POSTS — 1st of every month ───────────────────────────────────────
  cron.schedule('0 10 1 * *', safeJob('GBP Posts', async () => {
    const { supabase } = require('../config/database');
    const { data: clients } = await supabase
      .from('clients').select('*').eq('status', 'active');
    if (clients) {
      for (const client of clients) {
        await scheduleGBPPosts(client);
      }
    }
  }));
  console.log('✅ 1st of month — GBP posts');

  // ── MONTHLY REPORTS — 1st of month 9 AM ──────────────────────────────────
  cron.schedule('0 9 1 * *', safeJob('Monthly Client Reports', async () => {
    await runMonthlyReportsForAllClients();
  }));
  console.log('✅ 1st of month — Monthly reports');

  // ── MENTOR SESSION — 1st of month 10 AM ──────────────────────────────────
  cron.schedule('0 10 1 * *', safeJob('Monthly Mentor Session', async () => {
    await runMonthlyMentorSession();
  }));
  console.log('✅ 1st of month — Monthly mentor session');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 Agent is running. All jobs scheduled.');
  console.log('📱 Telegram alerts active for all activity.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

module.exports = { startAllJobs };