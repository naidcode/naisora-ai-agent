// modules/offpage/backlinkAnalyser.js
// Analyses competitor backlinks to find link building opportunities

const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

async function findLinkOpportunities(restaurant) {
  const prompt = `Find backlink opportunities for a ${restaurant.category || 'restaurant'} in ${restaurant.area}, Bangalore.

Restaurant: ${restaurant.name}
Website: ${restaurant.website || 'not yet built'}

Suggest 10 realistic backlink sources:
1. Local Bangalore food blogs and websites to get listed on
2. Food directories specific to Bangalore
3. Local news sites that cover restaurant openings
4. Neighbourhood community websites
5. Food delivery platform listings

For each source provide:
- Website name/type
- Why it would link to them
- How to approach getting the link

Focus on free and achievable links for a local restaurant.`;

  const opportunities = await route('basic_summary', prompt, null, 600);

  await sendTelegramAlert(
    `🔗 *Backlink Opportunities — ${restaurant.name}*\n\n${opportunities.substring(0, 3000)}`
  );

  return opportunities;
}

module.exports = { findLinkOpportunities };