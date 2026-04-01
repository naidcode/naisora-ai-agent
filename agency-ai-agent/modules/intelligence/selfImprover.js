// modules/intelligence/selfImprover.js
// Agent self-optimisation — analyses what's working and improves

require('dotenv').config();
const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyseOutreachPerformance() {
  // Get reply rates by channel
  const { data: outreachLog } = await supabase
    .from('outreach_log')
    .select('channel, message_type, replied, delivered')
    .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (!outreachLog || outreachLog.length === 0) return;

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

  const prompt = `Analyse this outreach performance data and suggest improvements.

${JSON.stringify(report, null, 2)}

For each channel:
1. Is the reply rate good or poor for cold outreach?
2. What can be improved in the messaging?
3. Should we increase or decrease volume?

Also suggest the top 1 change to make next week to improve overall lead conversion.`;

  const analysis = await route('basic_summary', prompt, null, 500);

  await sendTelegramAlert(
    `🤖 *Self-Improvement Report*\n\n` +
    `Outreach Performance (last 30 days):\n` +
    report.map(r => `• ${r.channel}: ${r.sent} sent, ${r.replyRate} reply rate`).join('\n') +
    `\n\nAnalysis:\n${analysis}`
  );

  return { report, analysis };
}

module.exports = { analyseOutreachPerformance };