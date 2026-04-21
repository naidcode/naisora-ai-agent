// modules/offpage/prOpportunityFinder.js
// Finds PR and press opportunities for restaurant clients

const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

async function findPROpportunities(restaurant) {
  const prompt = `Find PR and press coverage opportunities for a restaurant in Bangalore.

Restaurant: ${restaurant.name}
Area: ${restaurant.area}
Type: ${restaurant.category || 'restaurant'}

Find opportunities in these categories:
1. Bangalore food bloggers who review local restaurants
2. Local Bangalore news portals that cover F&B
3. Instagram food influencers in Bangalore (micro: 10K-100K followers)
4. "Best of Bangalore" lists they could be featured in
5. Local Facebook groups where they could get exposure

For each opportunity:
- Name/platform
- Audience size estimate
- How to pitch/approach them
- What angle to use

Write outreach pitch templates for top 3 opportunities.`;

  const opportunities = await route('client_report', prompt, null, 800);

  await sendTelegramAlert(
    `📰 *PR Opportunities — ${restaurant.name}*\n\n${opportunities.substring(0, 3000)}`
  );

  return opportunities;
}

module.exports = { findPROpportunities };