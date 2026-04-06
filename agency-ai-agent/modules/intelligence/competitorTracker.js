// modules/intelligence/competitorTracker.js
// Tracks competing web agencies in Bangalore monthly

require('dotenv').config();
const { askClaudeSonnet } = require('../../config/claude');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

const BANGALORE_AGENCIES = [
  { name: 'Generic Bangalore web agency', website: 'competitor1.com' },
  { name: 'Local freelancer competition', website: 'competitor2.com' },
];

async function generateCompetitorReport() {
  const prompt = `Generate a competitive analysis for Naisora, an AI web design agency in Bangalore targeting restaurants.

Context:
- Naisora's advantage: AI automation, restaurant niche focus, affordable pricing (₹8,000 website)
- Main competitors: freelance web designers, generic digital agencies, Fiverr sellers

Analyse:
1. What are freelance designers typically charging for restaurant websites in Bangalore?
2. What do generic agencies offer that Naisora doesn't?
3. What does Naisora offer that nobody else does?
4. What's the biggest competitive threat to Naisora in the next 6 months?
5. Top 3 ways to differentiate Naisora more strongly

Be specific and honest about weaknesses too.`;

  const response = await askClaudeSonnet(prompt);

  await sendTelegramAlert(
    `🕵️ *Monthly Competitor Report*\n\n${report.substring(0, 3500)}`
  );

  return response;
}

module.exports = { generateCompetitorReport };