// modules/social/socialAnalyser.js
// Naisora AI Agent — Social Media Analyser
// Analyses @nahidpasha01 and client Instagram accounts
// Reads engagement, finds best content types, reports weekly

require('dotenv').config();
const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── Analyse account performance ──────────────────────────────────────────────
async function analyseAccount(accountData) {
  const prompt = `Analyse this Instagram account performance and give specific improvement advice.

Account: ${accountData.username}
Followers: ${accountData.followers || 'unknown'}
Recent posts engagement: ${accountData.avgEngagement || 'unknown'}%
Best performing content: ${accountData.bestContent || 'unknown'}
Worst performing content: ${accountData.worstContent || 'unknown'}
Posting frequency: ${accountData.frequency || 'unknown'}

Provide:
1. Top 3 things working well
2. Top 3 things to improve immediately
3. Best content types for this account
4. Optimal posting times for Bangalore audience
5. Weekly content plan (7 post ideas)

Be specific and actionable. Focus on getting more restaurant owner followers for a web agency account.`;

  return await route('client_report', prompt, null, 1000);
}

// ─── Weekly social media report for Naisora ──────────────────────────────────
async function weeklyNaisoraReport() {
  console.log('\n📊 Generating Naisora social media report...');

  // Since we can't access Instagram API without approval,
  // we generate strategic advice based on known account context
  const accountData = {
    username: '@nahidpasha01 (Naisora)',
    followers: 'growing',
    avgEngagement: 'unknown — connect Instagram Graph API',
    bestContent: 'AI agent demos, web design before/after',
    worstContent: 'generic posts without context',
    frequency: 'irregular',
  };

  const report = await analyseAccount(accountData);

  await sendTelegramAlert(
    `📱 *Weekly Social Media Report — Naisora*\n\n${report.substring(0, 3000)}`
  );

  return report;
}

module.exports = { analyseAccount, weeklyNaisoraReport };