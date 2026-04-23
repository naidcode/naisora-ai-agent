// modules/intelligence/selfImprover.js
// Agent self-optimisation — analyses what's working and improves

require('dotenv').config();
const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Generates improved messaging based on performance data
 */
async function generateImprovedMessages(report) {
  const prompt = `
You are an expert in cold outreach optimization.

Based on this performance data:
${JSON.stringify(report, null, 2)}

Generate:
1. One improved outreach message
2. One A/B test variation
3. Key change applied (1 sentence)

Return in JSON format:
{
  "improved_message": "...",
  "ab_variation": "...",
  "reasoning": "..."
}
`;

  try {
    const raw = await route('basic_summary', prompt, null, 400);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to generate improved messages:', err.message);
    return null;
  }
}

/**
 * Stores the improvement and applies it to the system strategy
 */
async function applyImprovement(improved) {
  try {
    // 1. Store in memory (Supabase)
    await supabase.from('outreach_improvements').insert({
      improvement_data: improved,
      created_at: new Date().toISOString(),
      status: 'active'
    });

    // 2. Here you would normally update your central 'active_messaging' config
    // In this system, we'll log it as the new strategy for the outreach modules to pick up
    console.log('✅ New outreach strategy applied:', improved.reasoning);
  } catch (err) {
    console.error('Failed to apply improvement:', err.message);
  }
}

async function analyseOutreachPerformance() {
  console.log('🔍 Analyzing outreach performance...');
  
  // Get reply rates by channel
  const { data: outreachLog } = await supabase
    .from('outreach_log')
    .select('channel, message_type, replied, delivered')
    .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (!outreachLog || outreachLog.length === 0) {
    console.log('No recent outreach logs to analyze.');
    return null;
  }

  const byChannel = {};
  for (const log of outreachLog) {
    if (!byChannel[log.channel]) byChannel[log.channel] = { sent: 0, replied: 0 };
    byChannel[log.channel].sent++;
    if (log.replied) byChannel[log.channel].replied++;
  }

  const report = Object.entries(byChannel).map(([channel, stats]) => ({
    channel,
    sent: stats.sent,
    replies: stats.replied,
    replyRate: ((stats.replied / stats.sent) * 100).toFixed(1) + '%',
  }));

  // PART 2: Generate and apply improvements
  const improved = await generateImprovedMessages(report);

  if (improved) {
    await applyImprovement(improved);

    await sendTelegramAlert(
      `🚀 *Outreach System Improved*\n\n` +
      `Channel Analysis:\n` +
      report.map(r => `• ${r.channel}: ${r.replyRate} reply rate`).join('\n') +
      `\n\n*New Strategy:* ${improved.reasoning}\n` +
      `*Improved Msg:* ${improved.improved_message}`
    );
  }

  return { report, improved };
}

module.exports = { analyseOutreachPerformance, generateImprovedMessages, applyImprovement };