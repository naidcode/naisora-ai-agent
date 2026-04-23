// modules/social/reelIdeasGenerator.js
// Generates Instagram Reel ideas for Naisora

const { route } = require('../../config/llmRouter');

async function generateReelIdeas(count = 5) {
  const prompt = `Generate ${count} Instagram Reel ideas for Naisora, an AI web design agency in Bangalore.

Target audience: Restaurant and cafe owners in Bangalore
Goal: Show AI agent working, attract clients, build authority

For each reel provide:
- Hook (first 3 seconds — must stop the scroll)
- Content structure (what to show/say)
- Estimated time
- Why it will perform well

Focus on: AI agent terminal running, website before/after, Google ranking results, client testimonials concept.`;

  return await route('social_caption', prompt, null, 800);
}

module.exports = { generateReelIdeas };