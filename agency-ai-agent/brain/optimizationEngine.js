// brain/optimizationEngine.js
// Naisora AI Growth OS — Strategic Optimization Engine (Top 1% Level)
// Not just an executor — a DECISION MAKER that learns, prioritizes, and optimizes for revenue

const { supabase } = require('../config/database');
const { sendMessage } = require('../config/telegram');
const { runABTestCycle } = require('./abTesting');
const { auditAllBlogs } = require('../seo/contentOptimizer');

// ─────────────────────────────────────────────────────────────────────────────
// DATA COLLECTION LAYER
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeOutreachResults() {
  return await runABTestCycle();
}

async function analyzeBlogPerformance() {
  const { data, error } = await supabase
    .from('blog_performance')
    .select('*, blog_scores(score, last_checked)')
    .eq('status', 'tracking')
    .limit(20);

  if (error || !data) {
    console.error('Blog performance fetch failed:', error?.message);
    return [];
  }
  return data;
}

function decideContentImprovements(blogPerformance) {
  return blogPerformance.filter(
    b => !b.blog_scores || !b.blog_scores.score || b.blog_scores.score < 70
  );
}

async function getSystemHealth() {
  const [
    { count: totalLeads },
    { count: hotLeads },
    { count: activeClients },
    { data: config },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('lead_category', 'hot'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('system_config').select('key, value'),
  ]);

  const configMap = {};
  if (config) config.forEach(c => { configMap[c.key] = c.value; });

  return {
    totalLeads: totalLeads || 0,
    hotLeads: hotLeads || 0,
    activeClients: activeClients || 0,
    activeVariant: configMap['active_outreach_variant'] || 'A',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE TRACKING
// ─────────────────────────────────────────────────────────────────────────────

async function getRevenueStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('invoices')
    .select('amount, status, paid_at')
    .eq('status', 'paid')
    .gte('paid_at', since);

  if (error || !data) return { total: 0, count: 0 };

  const total = data.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  return { total, count: data.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEARNING MEMORY — Read past cycles to detect trends
// ─────────────────────────────────────────────────────────────────────────────

async function getOptimizationHistory(limit = 5) {
  const { data } = await supabase
    .from('optimization_history')
    .select('strategy, outreach_reply_rate, blogs_improved, revenue_total, timestamp')
    .order('timestamp', { ascending: false })
    .limit(limit);

  return data || [];
}

async function detectTrends(history) {
  if (!history || history.length < 2) return { outreachTrend: 'unknown', contentTrend: 'unknown' };

  const latest = history[0];
  const previous = history[1];

  const outreachTrend =
    latest.outreach_reply_rate > previous.outreach_reply_rate ? 'improving' :
    latest.outreach_reply_rate < previous.outreach_reply_rate ? 'declining' : 'stable';

  const contentTrend =
    latest.blogs_improved < previous.blogs_improved ? 'improving' :
    latest.blogs_improved > previous.blogs_improved ? 'declining' : 'stable';

  console.log(`   📈 Outreach trend: ${outreachTrend} | Content trend: ${contentTrend}`);
  return { outreachTrend, contentTrend };
}

async function saveOptimizationCycle({ strategy, outreachResult, improvements, health, revenue }) {
  const replyRate = outreachResult?.results
    ? parseFloat(outreachResult.results[outreachResult.winner || 'A']?.replyRate || 0)
    : 0;

  const { error } = await supabase.from('optimization_history').insert({
    strategy,
    outreach_reply_rate: replyRate,
    outreach_winner: outreachResult?.winner || null,
    blogs_improved: improvements,
    hot_leads: health.hotLeads,
    active_clients: health.activeClients,
    revenue_total: revenue.total,
    timestamp: new Date().toISOString(),
  });

  if (error) console.error('Failed to save optimization history:', error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY DECISION LAYER — The core intelligence
// ─────────────────────────────────────────────────────────────────────────────

function decideSystemStrategy({ outreachResult, improvements, health, revenue, trends }) {
  // PRIORITY 0: Revenue emergency — override everything
  if (revenue.total < 20000) {
    return 'FOCUS_HIGH_VALUE_CLIENTS';
  }

  // PRIORITY 1: Pipeline is dry — no hot leads
  if (health.hotLeads < 5) {
    return 'FOCUS_LEAD_GENERATION';
  }

  // PRIORITY 2: Outreach is broken or declining
  const replyRate = outreachResult?.results
    ? parseFloat(outreachResult.results[outreachResult.winner || 'A']?.replyRate || 0)
    : null;

  if ((replyRate !== null && replyRate < 3) || trends.outreachTrend === 'declining') {
    return 'FIX_OUTREACH';
  }

  // PRIORITY 3: Too many blogs failing SEO quality test
  if (improvements > 5) {
    return 'FIX_CONTENT';
  }

  // PRIORITY 4: Content trend is declining but not critical
  if (trends.contentTrend === 'declining') {
    return 'BOOST_CONTENT';
  }

  // Default: All signals healthy — run balanced growth
  return 'BALANCED_GROWTH';
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY EXECUTION — Only act on what matters most
// ─────────────────────────────────────────────────────────────────────────────

async function executeStrategy(strategy, { improvements, health, revenue }) {
  switch (strategy) {
    case 'FOCUS_HIGH_VALUE_CLIENTS':
      await sendMessage(
        `🚨 *Revenue Alert*\n\n` +
        `30-day revenue: ₹${revenue.total.toLocaleString()}\n` +
        `⚠️  Below ₹20,000 threshold\n\n` +
        `→ Shifting focus: High-ticket clients only\n` +
        `→ Skipping bulk lead gen this cycle`
      );
      break;

    case 'FOCUS_LEAD_GENERATION':
      await sendMessage(
        `⚠️  *Low Pipeline Alert*\n\n` +
        `Hot leads: ${health.hotLeads} (threshold: 5)\n\n` +
        `→ Increasing scraping frequency\n` +
        `→ WhatsApp outreach priority: MAXIMUM`
      );
      break;

    case 'FIX_OUTREACH':
      await sendMessage(
        `⚠️  *Outreach Underperforming*\n\n` +
        `→ Triggering self-improvement cycle\n` +
        `→ Generating new A/B test variants\n` +
        `→ Active variant being re-evaluated`
      );
      break;

    case 'FIX_CONTENT':
      // Targeted — only improve the 2 worst-scoring blogs
      console.log('📝 [Strategy] FIX_CONTENT — targeting lowest 2 blogs');
      await auditAllBlogs(2);
      await sendMessage(
        `🚀 *Content Fix Triggered*\n\n` +
        `${improvements} blogs scoring below threshold\n` +
        `→ Auto-improving 2 lowest-score blogs this cycle`
      );
      break;

    case 'BOOST_CONTENT':
      console.log('📝 [Strategy] BOOST_CONTENT — auditing 1 blog, light improvement');
      await auditAllBlogs(1);
      break;

    case 'BALANCED_GROWTH':
      console.log('⚖️  [Strategy] BALANCED_GROWTH — system is healthy, maintaining');
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER FUNCTION — Full strategic optimization cycle
// ─────────────────────────────────────────────────────────────────────────────

async function runOptimizationCycle() {
  console.log('\n' + '═'.repeat(55));
  console.log('🧠 [OptimizationEngine] Strategic cycle starting...');
  console.log('═'.repeat(55));

  const cycleStart = Date.now();

  // ── Phase 1: Collect all signals ──
  console.log('\n── Phase 1: Data Collection ──');
  const [outreachResult, blogPerformance, health, revenue, history] = await Promise.all([
    analyzeOutreachResults(),
    analyzeBlogPerformance(),
    getSystemHealth(),
    getRevenueStats(),
    getOptimizationHistory(5),
  ]);

  const improvements = decideContentImprovements(blogPerformance);
  console.log(`   Hot leads: ${health.hotLeads} | Revenue 30d: ₹${revenue.total} | Blogs to fix: ${improvements.length}`);

  // ── Phase 2: Detect trends from history ──
  console.log('\n── Phase 2: Trend Detection ──');
  const trends = await detectTrends(history);

  // ── Phase 3: Strategic decision ──
  console.log('\n── Phase 3: Strategy Decision ──');
  const strategy = decideSystemStrategy({ outreachResult, improvements: improvements.length, health, revenue, trends });
  console.log(`   🎯 Strategy selected: ${strategy}`);

  // ── Phase 4: Priority execution ──
  console.log('\n── Phase 4: Executing Strategy ──');
  await executeStrategy(strategy, { improvements, health, revenue });

  // ── Phase 5: Save to memory ──
  await saveOptimizationCycle({ strategy, outreachResult, improvements: improvements.length, health, revenue });

  // ── Phase 6: Strategic Telegram report ──
  const duration = ((Date.now() - cycleStart) / 1000).toFixed(1);
  const outreachRate = outreachResult?.results
    ? `${outreachResult.results[outreachResult.winner || 'A']?.replyRate}%`
    : 'N/A';

  await sendMessage(
    `🧠 *Optimization Report*\n\n` +
    `🎯 Strategy: *${strategy}*\n` +
    `💰 Revenue (30d): ₹${revenue.total.toLocaleString()}\n\n` +
    `📊 *System Signals:*\n` +
    `• Leads: ${health.totalLeads} (🔥 Hot: ${health.hotLeads})\n` +
    `• Active Clients: ${health.activeClients}\n` +
    `• Best Outreach Variant: ${health.activeVariant} (${outreachRate} reply)\n` +
    `• Blogs Needing Fix: ${improvements.length}\n\n` +
    `📈 Trends: Outreach ${trends.outreachTrend} | Content ${trends.contentTrend}\n\n` +
    `⏱ Cycle: ${duration}s | System optimizing 🚀`
  );

  console.log(`\n✅ [OptimizationEngine] Cycle complete — Strategy: ${strategy} (${duration}s)`);
  return { strategy, outreachResult, improvements: improvements.length, health, revenue, trends };
}

module.exports = {
  runOptimizationCycle,
  analyzeBlogPerformance,
  decideContentImprovements,
  decideSystemStrategy,
  getRevenueStats,
  detectTrends,
};
