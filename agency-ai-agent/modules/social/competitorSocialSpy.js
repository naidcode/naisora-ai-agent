// modules/social/competitorSocialSpy.js
// Tracks competitor web agencies' social media strategy

const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

// Bangalore web agency competitors to watch
const COMPETITORS = [
  'webchutney',
  'thinkdesign',
  'brandstory',
  'mirum_india',
];

async function analyseCompetitorStrategy(competitorUsername) {
  const prompt = `Analyse the social media strategy of a competing web design agency Instagram account.

Competitor: @${competitorUsername}
Our agency: Naisora (AI web design for restaurants, Bangalore)

Based on typical web agency Instagram strategies, advise:
1. What content types are they likely posting?
2. What gaps can Naisora exploit?
3. How can we differentiate our content?
4. What should we copy (ethically)?
5. What should we do differently?

Focus on practical tactics we can implement this week.`;

  return await route('basic_summary', prompt, null, 400);
}

async function weeklyCompetitorReport() {
  console.log('\n🕵️ Running competitor social spy...');

  let report = `🕵️ *Competitor Social Report — ${new Date().toLocaleDateString('en-IN')}*\n\n`;

  for (const competitor of COMPETITORS.slice(0, 2)) {
    const analysis = await analyseCompetitorStrategy(competitor);
    report += `**@${competitor}:**\n${analysis}\n\n`;
  }

  await sendTelegramAlert(report.substring(0, 3500));
  return report;
}

module.exports = { analyseCompetitorStrategy, weeklyCompetitorReport };