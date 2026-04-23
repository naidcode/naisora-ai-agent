// modules/social/hashtagResearcher.js
// Finds best hashtags for restaurant and agency content

const { route } = require('../../config/llmRouter');

async function researchHashtags(contentType, location = 'Bangalore') {
  const prompt = `Generate the best Instagram hashtags for this content.

Content type: ${contentType}
Location: ${location}
Account type: Web design agency targeting restaurant owners

Provide 30 hashtags in 3 groups:
1. High volume (1M+ posts) — 5 hashtags
2. Medium volume (100K-1M) — 15 hashtags  
3. Niche/local (under 100K) — 10 hashtags

Mix of: restaurant industry, web design, Bangalore local, AI/tech, business growth.

Return as a single line of hashtags ready to copy-paste.`;

  return await route('hashtags', prompt, null, 200);
}

async function getRestaurantHashtags() {
  return await researchHashtags('restaurant website design and local SEO results');
}

async function getAgencyHashtags() {
  return await researchHashtags('AI web design agency showcasing work');
}

module.exports = { researchHashtags, getRestaurantHashtags, getAgencyHashtags };