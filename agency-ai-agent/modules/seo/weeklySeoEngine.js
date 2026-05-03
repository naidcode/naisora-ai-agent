// modules/seo/weeklySeoEngine.js
// Naisora AI Agent — Weekly SEO Engine Orchestrator
// Runs every Monday 6 AM for all active clients
// Full automated SEO cycle: audit → keywords → fix → blog → report

require('dotenv').config();
const { runFullAudit } = require('./seoAudit');
const { researchKeywords } = require('./keywordResearch');
const { analyseKeywords } = require('./keywordAnalyser');
const { mapKeywordsToPages } = require('./keywordMapper');
const { fixOnPageIssues } = require('./onPageFixer');
const { runTechnicalAudit } = require('./technicalAudit');
const { checkSitemap } = require('./sitemapManager');
const { generateWeeklyReport } = require('./performanceReport');
const { publishWeeklyBlogs } = require('../wordpress/blogPublisher');
const { sendErrorAlert } = require('../../config/telegramReporter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runWeeklySeoForClient(client) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`🚀 Weekly SEO Engine — ${client.business_name}`);
  console.log(`${'═'.repeat(50)}`);

  const results = { client: client.business_name, steps: [] };

  try {
    // Step 1 — Master Website audit
    console.log('\n📊 Step 1: Running website audit...');
    if (client.website) {
      const audit = await runFullAudit(client);
      results.auditScore = audit?.total_score;
      results.steps.push(`Audit: ${audit?.total_score || 0}/100 [Grade ${audit?.grade}]`);
    }

    // Step 2 — Keyword research
    console.log('\n🔍 Step 2: Researching keywords...');
    const keywords = await researchKeywords(client);
    results.steps.push(`Keywords: ${keywords.length} found`);

    // Step 3 — Technical audit
    console.log('\n⚙️  Step 3: Technical audit...');
    if (client.website) {
      const technical = await runTechnicalAudit(client.website);
      results.steps.push(`Technical issues: ${technical.issues.length}`);
    }

    // Step 4 — Sitemap check
    console.log('\n🗺️  Step 4: Checking sitemap...');
    if (client.website) {
      const sitemap = await checkSitemap(client.website);
      results.steps.push(`Sitemap: ${sitemap.found ? 'Found' : 'Missing'}`);
    }

    // Step 5 — Write and publish 3 blogs
    console.log('\n📝 Step 5: Writing weekly blogs...');
    if (client.wp_site_url) {
      await publishWeeklyBlogs(client);
      results.steps.push('Blogs: 3 drafts created');
    } else {
      results.steps.push('Blogs: Skipped (no WordPress)');
    }

    // Step 6 — Generate performance report
    console.log('\n📋 Step 6: Generating weekly report...');
    const report = await generateWeeklyReport(client);
    results.steps.push('Report: Generated');

    // Send Telegram summary
    await sendTelegramAlert(
      `✅ *Weekly SEO Complete — ${client.business_name}*\n\n` +
      results.steps.map(s => `• ${s}`).join('\n') +
      `\n\nAudit Score: ${results.auditScore || 'N/A'}/100`
    );

  } catch (err) {
    console.error(`❌ Weekly SEO failed for ${client.business_name}: ${err.message}`);
    await sendErrorAlert('Weekly SEO Engine', err, 'critical');
  }

  return results;
}

// Run for all active clients
async function runWeeklySeoForAllClients() {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active');

  if (!clients || clients.length === 0) {
    console.log('No active clients yet — weekly SEO skipped');
    return;
  }

  console.log(`\n🚀 Starting weekly SEO for ${clients.length} clients...`);

  for (const client of clients) {
    await runWeeklySeoForClient(client);
    await new Promise(r => setTimeout(r, 5000)); // 5s between clients
  }

  console.log('\n✅ Weekly SEO complete for all clients');
}

module.exports = { runWeeklySeoForAllClients, runWeeklySeoForClient };