const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Pricing per 1M tokens (approximate, in USD)
const MODEL_COSTS = {
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.25, output: 1.25 },
  'groq-llama': { input: 0.00, output: 0.00 },
  'gemini': { input: 0.00, output: 0.00 }
};

// USD to INR rate (approximate)
const USD_TO_INR = 83;

// Which tasks should use which model
const OPTIMAL_ROUTING = {
  // High value — use Sonnet
  cold_email: 'claude-sonnet-4-6',
  seo_audit: 'claude-sonnet-4-6',
  blog_writing: 'claude-sonnet-4-6',
  client_report: 'claude-sonnet-4-6',
  quarterly_review: 'claude-sonnet-4-6',

  // Internal — use Haiku
  lead_categorisation: 'claude-haiku-4-5-20251001',
  reply_analysis: 'claude-haiku-4-5-20251001',
  social_analysis: 'claude-haiku-4-5-20251001',
  content_planning: 'claude-haiku-4-5-20251001',
  alert_generation: 'claude-haiku-4-5-20251001',

  // Free bulk — use Groq
  follow_up_email: 'groq-llama',
  social_caption: 'groq-llama',
  hashtags: 'groq-llama',
  whatsapp_message: 'groq-llama'
};

async function logModelUsage(params) {
  const {
    model,
    task,
    inputTokens = 0,
    outputTokens = 0,
    module: moduleName = 'unknown'
  } = params;

  const costs = MODEL_COSTS[model] || { input: 0, output: 0 };
  const costUsd = ((inputTokens * costs.input) + (outputTokens * costs.output)) / 1_000_000;
  const costInr = costUsd * USD_TO_INR;

  const { error } = await supabase.from('model_usage_log').insert({
    model,
    task,
    module: moduleName,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: costUsd,
    cost_inr: costInr,
    logged_at: new Date().toISOString()
  });

  if (error) {
    // Table might not exist yet — log to console only
    console.log(`Model usage: ${model} | ${task} | ₹${costInr.toFixed(4)}`);
  }
}

async function getWeeklyUsageSummary() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Try to get from Supabase first
  const { data, error } = await supabase
    .from('model_usage_log')
    .select('*')
    .gte('logged_at', oneWeekAgo.toISOString());

  if (error || !data) {
    return null;
  }

  const summary = {
    total_cost_inr: 0,
    total_cost_usd: 0,
    by_model: {},
    by_task: {},
    total_calls: data.length
  };

  for (const log of data) {
    summary.total_cost_inr += log.cost_inr || 0;
    summary.total_cost_usd += log.cost_usd || 0;

    if (!summary.by_model[log.model]) {
      summary.by_model[log.model] = { calls: 0, cost_inr: 0 };
    }
    summary.by_model[log.model].calls++;
    summary.by_model[log.model].cost_inr += log.cost_inr || 0;

    if (!summary.by_task[log.task]) {
      summary.by_task[log.task] = { calls: 0, cost_inr: 0 };
    }
    summary.by_task[log.task].calls++;
    summary.by_task[log.task].cost_inr += log.cost_inr || 0;
  }

  return summary;
}

function getRecommendations(summary) {
  const recommendations = [];

  if (!summary) return recommendations;

  // Check if expensive tasks are using cheap models
  const sonnetCost = summary.by_model['claude-sonnet-4-6']?.cost_inr || 0;
  const haikuCost = summary.by_model['claude-haiku-4-5-20251001']?.cost_inr || 0;

  if (sonnetCost > 500) {
    recommendations.push('High Sonnet usage — review if all tasks truly need Sonnet quality');
  }

  if (summary.total_cost_inr > 700) {
    recommendations.push('Weekly cost above ₹700 — check if bulk follow-ups are correctly routing to Groq');
  }

  if (summary.total_cost_inr < 100) {
    recommendations.push('Very low usage — agent may not be running all scheduled tasks. Check Railway logs.');
  }

  return recommendations;
}

async function run() {
  console.log('💰 Running model cost optimiser...');

  try {
    const summary = await getWeeklyUsageSummary();

    if (!summary) {
      await sendTelegram(
        `💰 *Model Cost Report*\n\n` +
        `No usage data found yet.\n` +
        `Tip: model_usage_log table needs to be created in Supabase.\n\n` +
        `Estimated daily cost: ~₹16/day\n` +
        `Estimated weekly cost: ~₹112/week\n` +
        `Estimated monthly cost: ~₹480/month`
      );
      return;
    }

    const recommendations = getRecommendations(summary);

    let modelBreakdown = '';
    for (const [model, stats] of Object.entries(summary.by_model)) {
      modelBreakdown += `${model}: ${stats.calls} calls · ₹${stats.cost_inr.toFixed(2)}\n`;
    }

    const message =
      `💰 *Weekly Model Cost Report*\n\n` +
      `Total calls: ${summary.total_calls}\n` +
      `Total cost: ₹${summary.total_cost_inr.toFixed(2)} (~$${summary.total_cost_usd.toFixed(3)})\n` +
      `Projected monthly: ₹${(summary.total_cost_inr * 4.33).toFixed(0)}\n\n` +
      `By model:\n${modelBreakdown}\n` +
      (recommendations.length > 0 ? `⚡ Recommendations:\n${recommendations.map(r => `• ${r}`).join('\n')}` : '✅ Cost routing is optimal');

    await sendTelegram(message);
    console.log(`✅ Model cost report sent`);

    return summary;

  } catch (error) {
    console.error('Model optimiser error:', error.message);
  }
}

module.exports = { run, logModelUsage, OPTIMAL_ROUTING, MODEL_COSTS };