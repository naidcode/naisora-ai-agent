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

const { sendMorningReport, sendEveningDashboard, sendWeeklyReport } = require('../modules/reporting/businessReporting');
const { runFollowUpEngine } = require('../modules/outreach/followUpEngine');
const { runHealthCheck } = require('../scripts/health-monitor');
const { runSelfImprovement } = require('../brain/selfImprover');

// ─── Helper: safeJob ──────────────────────────────────────────────────────────
function safeJob(name, fn) {
  return async () => {
    const indiaTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    if (isStopped()) {
      console.log(`\n⏭️  [Cron] [${indiaTime}] Skipping job: ${name} (Agent is STOPPED)`);
      return;
    }
    console.log(`\n🕒 [Cron] [${indiaTime}] Starting job: ${name}`);
    try {
      await fn();
      console.log(`✅ [Cron] [${indiaTime}] ${name} completed successfully.`);
    } catch (err) {
      console.error(`❌ [Cron] [${indiaTime}] ${name} failed:`, err.message);
      await sendMessage(
        `❌ *AGENT ERROR*\n\n` +
        `Module: ${name}\n` +
        `Error: ${err.message}\n` +
        `Time: ${indiaTime}\n` +
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
  cron.schedule('0 7 * * *', safeJob('Daily Health Monitor', async () => {
    await runHealthCheck();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 07:00 AM — Daily Health Monitor');

  // 0.1 EMAIL REPLY HANDLER — Every 30 minutes
  cron.schedule('*/30 * * * *', safeJob('Email Reply Handler', async () => {
    await handleEmailReplies();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ Every 30m — Email Auto-Reply Handler');

  // 0.2 INSTAGRAM & LINKEDIN REPLY HANDLER — Every 2 hours
  cron.schedule('0 */2 * * *', safeJob('Instagram Reply Handler', async () => {
    await checkInstagramReplies();
  }), { timezone: 'Asia/Kolkata' });
  cron.schedule('30 */2 * * *', safeJob('LinkedIn Reply Handler', async () => {
    await checkLinkedInReplies();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ Every 2h — Instagram & LinkedIn Auto-Reply Handler');

  // 1. MORNING PRIORITY REPORT — 8:30 AM
  cron.schedule('30 8 * * *', safeJob('Morning Priority Report', async () => {
    await sendMorningReport();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 08:30 AM — Morning Priority Report');

  // 2. WHATSAPP OUTREACH — 10:00 AM
  cron.schedule('0 10 * * *', safeJob('WhatsApp Outreach', async () => {
    await sendDailyWhatsApp();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 10:00 AM — WhatsApp Outreach (Cold)');

  // 2.1 INSTAGRAM OUTREACH — 10:15 AM
  cron.schedule('15 10 * * *', safeJob('Instagram Outreach', async () => {
    await runInstagramOutreach();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 10:15 AM — Instagram DM Outreach');

  // 3. EMAIL OUTREACH — 11:00 AM
  cron.schedule('0 11 * * *', safeJob('Email Outreach', async () => {
    await sendDailyColdEmails();
    await sendFollowupEmails1();
    await sendFollowupEmails2();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 11:00 AM — Email Outreach (Cold + Follow-ups)');

  // 3.1 LINKEDIN OUTREACH — 11:30 AM
  cron.schedule('30 11 * * *', safeJob('LinkedIn Outreach', async () => {
    await runLinkedInOutreach();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 11:30 AM — LinkedIn Outreach');

  // 4. FOLLOW UP ENGINE — 12:00 PM
  cron.schedule('0 12 * * *', safeJob('Follow Up Engine', async () => {
    await runFollowUpEngine();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 12:00 PM — Follow Up Engine');

  // 5. CHECK REPLIES — Every 3 hours
  cron.schedule('0 */3 * * *', safeJob('Check Replies', async () => {
    await checkReplies();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ Every 3h — Check WhatsApp Replies');

  // 6. SCRAPER & AUDIT — 4:00 PM
  cron.schedule('0 16 * * *', safeJob('Lead Scraper & Audit', async () => {
    const { runFullScrape } = require('../modules/scraper/googleMapsScraper');
    const { getReadyLeads } = require('../modules/scraper/leadDeduplicator');
    const { runFullAudit } = require('../modules/seo/seoAudit');
    const { researchKeywords } = require('../modules/seo/keywordResearch');
    const { writeBlogPost } = require('../modules/content/blogWriter');
    const { sendAuditReport, sendDailySEOSummary } = require('../config/telegramReporter');

    // 1. Scrape new leads
    const rawLeads = await runFullScrape({
      searchTypes: ['restaurants', 'cafes'],
      maxPerSearch: 15
    });
    
    const { newLeads } = await getReadyLeads(rawLeads);

    if (!newLeads || newLeads.length === 0) {
      console.log('ℹ️ No new leads found today.');
      return;
    }

    const stats = { total: 0, hot: 0, warm: 0, good: 0, blogs: 0, keywords: 0, topIssue: 'None', bestLead: { name: 'N/A', area: 'N/A', score: 0, reason: 'N/A' } };
    const allIssues = [];

    // 2. Process each new lead
    for (const lead of newLeads) {
      try {
        // Full SEO Audit
        const audit = await runFullAudit(lead);
        stats.total++;
        if (audit.grade === 'A' || audit.grade === 'B') stats.good++;
        else if (audit.grade === 'C') stats.warm++;
        else stats.hot++;

        if (audit.total_score > stats.bestLead.score) {
          stats.bestLead = { name: audit.restaurant, area: audit.area, score: audit.total_score, reason: 'High baseline score — easy to rank' };
        }
        allIssues.push(...audit.issues);

        // Keyword Research
        const keywords = await researchKeywords(lead);
        stats.keywords += keywords.length;

        // Blog writing for hot prospects
        if (audit.priority === 'HOT_LEAD') {
          const topKeyword = keywords.find(k => k.priority === 'high') || keywords[0];
          if (topKeyword) {
            await writeBlogPost(lead, topKeyword.keyword, 'guide');
            stats.blogs++;
          }
        }

        // Telegram Report
        await sendAuditReport(audit);

        // API Safety Delay
        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        console.error(`❌ Failed to process lead ${lead.business_name}:`, err.message);
      }
    }

    // 3. Final Daily Summary
    if (allIssues.length > 0) {
      const issueCounts = allIssues.reduce((acc, i) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {});
      stats.topIssue = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0][0];
    }
    
    await sendDailySEOSummary(stats);

  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ 04:00 PM — Scraper, Email Scraper & SEO Audit');

  // 7. WEEKLY SUNDAY REPORT — 8:00 PM
  cron.schedule('0 20 * * 0', safeJob('Weekly Sunday Report', async () => {
    await sendWeeklyReport();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ Sunday 8 PM — Weekly Sunday Report');

  // 8. SELF IMPROVEMENT BRAIN — Sunday 9 PM
  cron.schedule('0 21 * * 0', safeJob('Self Improvement Brain', async () => {
    await runSelfImprovement();
  }), { timezone: 'Asia/Kolkata' });
  console.log('✅ Sunday 9 PM — Self Improvement Brain');

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