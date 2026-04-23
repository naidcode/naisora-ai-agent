// modules/tracking/rankingReporter.js
// Generates ranking reports and sends to Telegram

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { route } = require('../../config/llmRouter');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function generateRankingReport(client) {
  const { data: rankings } = await supabase
    .from('rankings')
    .select('*')
    .eq('lead_id', client.id)
    .order('checked_at', { ascending: false })
    .limit(20);

  if (!rankings || rankings.length === 0) {
    console.log(`No ranking data for ${client.business_name}`);
    return;
  }

  // Group by keyword — get latest position for each
  const latestByKeyword = {};
  for (const r of rankings) {
    if (!latestByKeyword[r.keyword]) {
      latestByKeyword[r.keyword] = r;
    }
  }

  const rankingList = Object.values(latestByKeyword);
  const improved = rankingList.filter(r => r.change > 0);
  const dropped = rankingList.filter(r => r.change < 0);
  const top10 = rankingList.filter(r => r.position <= 10);

  let report = `📊 *Ranking Report — ${client.business_name}*\n`;
  report += `Date: ${new Date().toLocaleDateString('en-IN')}\n\n`;

  if (top10.length > 0) {
    report += `🏆 In Top 10:\n`;
    top10.forEach(r => report += `  • "${r.keyword}" — #${r.position}\n`);
    report += '\n';
  }

  if (improved.length > 0) {
    report += `📈 Improved:\n`;
    improved.forEach(r => report += `  • "${r.keyword}" — #${r.position} (↑${r.change})\n`);
    report += '\n';
  }

  if (dropped.length > 0) {
    report += `📉 Dropped:\n`;
    dropped.forEach(r => report += `  • "${r.keyword}" — #${r.position} (↓${Math.abs(r.change)})\n`);
    report += '\n';
  }

  await sendTelegramAlert(report);
  return report;
}

module.exports = { generateRankingReport };