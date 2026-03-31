// modules/content/socialWriter.js
// Writes social media captions for Instagram, Facebook, GBP posts

const { route } = require('../../config/llmRouter');

const SOCIAL_SYSTEM = `You write social media captions for restaurants in Bangalore, India.
Rules:
1. Sound like the restaurant owner talking directly to customers
2. Short and punchy for Instagram — long and informative for Facebook
3. Always include location (area + Bangalore)
4. End with a clear CTA (visit us, order now, call us, DM us)
5. Never use corporate language`;

async function writeInstagramCaption(restaurant, topic) {
  const prompt = `Write an Instagram caption for ${restaurant.name} in ${restaurant.area}, Bangalore.
Topic: ${topic}
Style: Casual, engaging, local feel
Include: 1-2 relevant emojis, location mention, CTA
Length: 3-4 lines max`;

  return await route('social_caption', prompt, SOCIAL_SYSTEM, 150);
}

async function writeFacebookPost(restaurant, topic) {
  const prompt = `Write a Facebook post for ${restaurant.name} in ${restaurant.area}, Bangalore.
Topic: ${topic}
Style: Friendly, informative
Length: 4-6 lines
Include: CTA, contact info mention`;

  return await route('social_caption', prompt, SOCIAL_SYSTEM, 200);
}

async function writeGBPPost(restaurant, topic) {
  const prompt = `Write a Google Business Profile post for ${restaurant.name} in ${restaurant.area}, Bangalore.
Topic: ${topic}
Max 300 characters. Include what's special today/this week. End with action (call/visit/order).`;

  return await route('gbp_post', prompt, null, 100);
}

async function writeWeeklySocialPlan(restaurant) {
  const prompt = `Create a weekly social media content plan for ${restaurant.name} in ${restaurant.area}, Bangalore.

Generate 7 post ideas (one per day) for Instagram and Facebook.
Mix of: food photos, behind scenes, customer reviews, promotions, team, local connection.

Return JSON: [{"day": "Monday", "platform": "Instagram", "topic": "...", "type": "food photo"}]
Return JSON only.`;

  try {
    const raw = await route('social_caption', prompt, null, 500);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

module.exports = { writeInstagramCaption, writeFacebookPost, writeGBPPost, writeWeeklySocialPlan };