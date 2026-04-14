// system/autoPilot.js
// Naisora AI Growth OS — Lean Client Acquisition Loop
// Goal: First paying client in 7–14 days
// Loop: Scrape → Score → Select → Outreach → Follow-up → Report

const { supabase } = require('../config/database');
const { sendMessage } = require('../config/telegram');
const { selectBestLeads } = require('../brain/leadSelector');
const { sendDailyWhatsApp } = require('../modules/outreach/whatsappSender');
const { runFollowUpEngine } = require('../modules/outreach/followUpEngine');
const { checkReplies } = require('../modules/outreach/replyReader');
const { runFullScrape } = require('../modules/scraper/googleMapsScraper');
const { runOptimizationCycle } = require('../brain/optimizationEngine');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const { isStopped } = require('./masterSwitch');

// ─── Step 1: Scrape fresh leads if pipeline is low ───────────────────────────
async function replenishLeads() {
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('outreach_status', ['new', 'not_contacted']);

  if (count < 100) {
    console.log(`\n🗺️  Pipeline low (${count} uncontacted) — scraping fresh leads...`);
    await runFullScrape({
      areas: ['Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield', 'Jayanagar'],
      searchTypes: ['restaurants', 'cafes'],
      maxPerSearch: 25,
    });
  } else {
    console.log(`\n✅ Pipeline healthy — ${count} uncontacted leads available`);
  }
}

// ─── Step 2: Build & send Telegram daily summary ─────────────────────────────
async function sendDailyReport(stats) {
  const { data: hotLeads } = await supabase
    .from('leads')
    .select('business_name, area, phone')
    .eq('outreach_status', 'interested')
    .order('interested_at', { ascending: false })
    .limit(5);

  const hotList = hotLeads && hotLeads.length > 0
    ? hotLeads.map(l => `• ${l.business_name} (${l.area})`).join('\n')
    : 'None yet — keep going!';

  await sendMessage(
    `📊 *Daily Acquisition Report*\n\n` +
    `📤 Outreach sent: ${stats.sent}\n` +
    `🔄 Follow-ups sent: ${stats.followUpsSent}\n` +
    `💬 Replies checked: ✅\n\n` +
    `🔥 *Interested Leads:*\n${hotList}\n\n` +
    `💡 *Next action:* ${hotLeads?.length > 0
      ? 'Call interested leads NOW — book a discovery call'
      : 'Check replies and send follow-ups tomorrow'
    }\n\n` +
    `⏰ Next cycle in 24h`
  );
}

// ─── MAIN LOOP: Lean 6-step acquisition cycle ────────────────────────────────
async function startAutoPilot() {
  console.log('\n' + '═'.repeat(55));
  console.log('🚀 [AutoPilot] Naisora AI — Client Acquisition Mode');
  console.log('🎯 Goal: First paying client in 7–14 days');
  console.log('═'.repeat(55));

  let dayCount = 0;

  while (true) {
    if (isStopped()) {
      console.log('\n😴 [AutoPilot] Agent is currently STOPPED. Sleeping for 1 hour before checking again...');
      await sleep(60 * 60 * 1000);
      continue;
    }

    dayCount++;
    const cycleStart = new Date();
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`📅 Day ${dayCount} cycle — ${cycleStart.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('─'.repeat(55));

    const stats = { sent: 0, followUpsSent: 0 };

    try {
      // ── Step 1: Scrape if pipeline is low ──
      await replenishLeads();

      // ── Step 2: Score & select top 50 leads for today ──
      console.log('\n🎯 Step 2: Selecting best leads...');
      const topLeads = await selectBestLeads(50);
      console.log(`   Selected ${topLeads.length} high-value leads`);

      // ── Step 3: Send outreach to top leads ──
      console.log('\n📱 Step 3: Sending outreach...');
      await sendDailyWhatsApp();
      stats.sent = topLeads.length;

      // ── Step 4: Check & process replies ──
      console.log('\n📬 Step 4: Checking replies...');
      await checkReplies();

      // ── Step 5: Send follow-ups (Day 2, 4, 7) ──
      console.log('\n🔄 Step 5: Sending follow-ups...');
      const followUpResult = await runFollowUpEngine();
      stats.followUpsSent = followUpResult.sent || 0;

      // ── Step 6: Daily Telegram report ──
      console.log('\n📊 Step 6: Sending daily report...');
      await sendDailyReport(stats);

      // ── Weekly: run optimization engine (non-blocking for Day 7+) ──
      if (dayCount % 7 === 0) {
        console.log('\n🧠 Weekly: Running optimization engine...');
        await runOptimizationCycle().catch(e => console.error('Opt engine error:', e.message));
      }

      console.log(`\n✅ Cycle complete. Sleeping 24 hours...`);
      await sleep(24 * 60 * 60 * 1000);

    } catch (err) {
      console.error('\n💥 AutoPilot cycle error:', err.message);
      await sendMessage(`❌ *AutoPilot Error (Day ${dayCount})*\n${err.message}\nRetrying in 1 hour.`);
      await sleep(60 * 60 * 1000);
    }
  }
}

module.exports = { startAutoPilot };
