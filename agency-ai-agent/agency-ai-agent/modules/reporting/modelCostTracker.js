// modules/reporting/modelCostTracker.js
// Tracks Claude API usage and costs

require('dotenv').config();
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Approximate costs per task
const TASK_COSTS = {
  cold_email: 2.0,
  seo_audit: 12.0,
  blog_post: 18.0,
  client_report: 12.0,
  intelligence_report: 20.0,
  reply_analysis: 1.0,
  whatsapp_message: 1.0,
  whatsapp_followup: 0,  // Groq free
  social_caption: 0,     // Groq free
  hashtags: 0,           // Groq free
};

async function estimateDailyCost(taskCounts) {
  let total = 0;
  for (const [task, count] of Object.entries(taskCounts)) {
    total += (TASK_COSTS[task] || 1) * count;
  }
  return total;
}

async function weeklyCostReport() {
  // Estimate based on typical daily usage
  const estimatedDaily = await estimateDailyCost({
    cold_email: 50,
    whatsapp_message: 30,
    reply_analysis: 5,
    seo_audit: 3,
    intelligence_report: 1,
    whatsapp_followup: 15, // free
    social_caption: 10,    // free
  });

  await sendTelegramAlert(
    `🤖 *Weekly AI Cost Estimate*\n\n` +
    `Daily cost: ₹${estimatedDaily.toFixed(0)}\n` +
    `Weekly cost: ₹${(estimatedDaily * 7).toFixed(0)}\n` +
    `Monthly cost: ₹${(estimatedDaily * 30).toFixed(0)}\n\n` +
    `Free (Groq): Follow-ups, social captions, hashtags\n` +
    `Paid (Claude): Emails, audits, reports, WhatsApp\n\n` +
    `$5 Anthropic credit lasts: ~${(420 / estimatedDaily).toFixed(0)} days`
  );
}

module.exports = { estimateDailyCost, weeklyCostReport };