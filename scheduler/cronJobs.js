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
const { scrapeEmailsForLeads } = require('../modules/scraper/emailScraper');
const { runFullScrape } = require('../modules/scraper/googleMapsScraper');
const { processLeads } = require('../modules/scraper/leadProcessor');
const { sendDailyWhatsApp, sendFollowUp } = require('../modules/outreach/whatsappSender');
const { checkReplies } = require('../modules/outreach/replyReader');
const { generateDailyPriorities, weeklyPipelineSummary } = require('../modules/outreach/leadScorer');
const { auditWarmLeads } = require('../modules/seo/seoAudit');
const { publishApprovedDrafts } = require('../modules/wordpress/blogPublisher');
const { generateDashboard } = require('../modules/tracking/dashboard');

const { isStopped } = require('../system/masterSwitch');

const { sendMorningReport, sendEveningDashboard, sendWeeklyReport, sendDailyOutreachTargetReport } = require('../modules/reporting/businessReporting');
const { runFollowUpEngine } = require('../modules/outreach/followUpEngine');
const { runHealthCheck } = require('../scripts/health-monitor');
const { runSelfImprovement } = require('../brain/selfImprover');

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
      await sendMessage(
        `❌ *AGENT ERROR*\n\n` +
        `Module: ${name}\n` +
        `Error: ${err.message}\n` +
        `Time: ${new Date().toLocaleString()}\n` +
        `Action needed: yes`
      );
    }
  };
}

const { handleEmailReplies } = require('../modules/email/emailReplyHandler');

const { runInstagramOutreach } = require('../modules/outreach/instagramOutreach');
const { runLinkedInOutreach } = require('../modules/outreach/linkedinOutreach');
const { checkInstagramReplies } = require('../modules/outreach/instagramAutoReply');
const { checkLinkedInReplies } = require('../modules/outreach/linkedinAutoReply');

// ─── Start All Jobs ───────────────────────────────────────────────────────────
function startAllJobs() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — Agent Scheduler (ACTIVE)       ║');
  console.log('║         Target: 50 Leads / Day Volume        ║');
  console.log('╚══════════════════════════════════════════════╝\n');

// 0. HEALTH MONITOR — 7:00 AM
  // cron.schedule('0 7 * * *', safeJob('Daily Health Monitor', async () => {
  //   await runHealthCheck();
  // }), { timezone: 'Asia/Kolkata' });
  // console.log('✅ 07:00 AM — Daily Health Monitor');

  // 0.1 EMAIL REPLY HANDLER — Every 5 minutes
  cron.schedule('*/5 * * * *', safeJob('Email Reply Handler', async () => {
    await handleEmailReplies();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ Every 5m — Email Auto-Reply Handler');

  // 0.1.1 WHATSAPP POLL FALLBACK — Every 5 minutes
  cron.schedule('*/5 * * * *', safeJob('WhatsApp Poll Fallback', async () => {
    await checkReplies();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ Every 5m — WhatsApp Poll Fallback (in case webhook fails)');

  // 0.2 INSTAGRAM & LINKEDIN REPLY HANDLER — Every 2 hours
  // cron.schedule('0 */2 * * *', safeJob('Instagram Reply Handler', async () => {
  //   await checkInstagramReplies();
  // }), { timezone: 'Asia/Kolkata' });
  // cron.schedule('30 */2 * * *', safeJob('LinkedIn Reply Handler', async () => {
  //   await checkLinkedInReplies();
  // }), { timezone: 'Asia/Kolkata' });
  // console.log('✅ Every 2h — Instagram & LinkedIn Auto-Reply Handler');

  // 1. MORNING PRIORITY REPORT — 8:30 AM
  cron.schedule('30 8 * * *', safeJob('Morning Priority Report', async () => {
    await sendMorningReport();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 08:30 AM — Morning Priority Report');

  // 2. WHATSAPP OUTREACH — 10:00 AM
  cron.schedule('0 10 * * *', safeJob('WhatsApp Outreach', async () => {
    await sendDailyWhatsApp();
    // await sendDailyOutreachTargetReport();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 10:00 AM — WhatsApp Outreach (Cold)');

  // 2.1 INSTAGRAM OUTREACH — 10:15 AM
  /*
  cron.schedule('15 10 * * *', safeJob('Instagram Outreach', async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await runInstagramOutreach();
        break; 
      } catch (err) {
        console.log(`Instagram Attempt ${attempt} failed: ${err.message}`);
        if (attempt === 3) await sendMessage(`❌ Instagram failed after 3 attempts: ${err.message}`);
        await new Promise(r => setTimeout(r, 10000));
      }
    }
    await sendDailyOutreachTargetReport();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 10:15 AM — Instagram DM Outreach');
  */

  // 3. EMAIL OUTREACH — 11:00 AM
  cron.schedule('0 11 * * *', safeJob('Email Outreach', async () => {
    await sendDailyColdEmails();
    await sendFollowupEmails1();
    await sendFollowupEmails2();
    // await sendDailyOutreachTargetReport();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 11:00 AM — Email Outreach (Cold + Follow-ups)');

  // 3.1 LINKEDIN OUTREACH — 11:30 AM
  /*
  cron.schedule('30 11 * * *', safeJob('LinkedIn Outreach', async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await runLinkedInOutreach();
        break; 
      } catch (err) {
        console.log(`LinkedIn Attempt ${attempt} failed: ${err.message}`);
        if (attempt === 3) await sendMessage(`❌ LinkedIn failed after 3 attempts: ${err.message}`);
        await new Promise(r => setTimeout(r, 10000));
      }
    }
    await sendDailyOutreachTargetReport();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 11:30 AM — LinkedIn Outreach');
  */

  // 4. FOLLOW UP ENGINE — 12:00 PM (WhatsApp follow ups)
  cron.schedule('0 12 * * *', safeJob('WhatsApp Follow Ups', async () => {
    await runFollowUpEngine();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 12:00 PM — WhatsApp Follow Ups');


  // 6. SCRAPER & AUDIT — 4:00 PM
  cron.schedule('0 16 * * *', safeJob('Lead Scraper & Audit', async () => {
    const rawLeads = await runFullScrape({
      areas: [
        'Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Jayanagar',
        'Marathahalli', 'Electronic City', 'Bannerghatta Road', 'JP Nagar',
        'Banashankari', 'Malleshwaram', 'Rajajinagar', 'Hebbal', 'Yelahanka',
        'Sarjapur Road', 'Bellandur', 'Domlur', 'Frazer Town', 'Ulsoor',
        'Richmond Town', 'Basavanagudi', 'Jayanagar', 'BTM Layout', 'RT Nagar'
      ],
      searchTypes: [
        'restaurants', 'cafes', 'hotels', 'bars', 'bakeries',
        'fast food', 'food court', 'dhaba', 'tiffin center',
        'cloud kitchen', 'catering', 'juice shop', 'tea shop'
      ],
      maxPerSearch: 20
    });
    const { getReadyLeads } = require('../modules/scraper/leadDeduplicator');
    await getReadyLeads(rawLeads);
    await scrapeEmailsForLeads(30);
    await auditWarmLeads(10);
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 04:00 PM — Scraper, Email Scraper & SEO Audit');

  // 7. WEEKLY SUNDAY REPORT — 8:00 PM
  // cron.schedule('0 20 * * 0', safeJob('Weekly Sunday Report', async () => {
  //   await sendWeeklyReport();
  // }), { timezone: 'Asia/Kolkata' });
  // console.log('✅ Sunday 8 PM — Weekly Sunday Report');

  // 8. SELF IMPROVEMENT BRAIN — Sunday 9 PM
  // cron.schedule('0 21 * * 0', safeJob('Self Improvement Brain', async () => {
  //   await runSelfImprovement();
  // }), { timezone: 'Asia/Kolkata' });
  // console.log('✅ Sunday 9 PM — Self Improvement Brain');

  // 9. EVENING DASHBOARD — 9:00 PM
  cron.schedule('0 21 * * *', safeJob('Evening Dashboard', async () => {
    await sendEveningDashboard();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 09:00 PM — Evening Dashboard');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 Agent is running. All jobs scheduled.');
  console.log('📱 Telegram alerts active for all activity.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

module.exports = { startAllJobs };