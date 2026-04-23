// modules/seo/keywordAnalyser.js
// Analyses keyword difficulty and opportunity

require('dotenv').config();
const { route } = require('../../config/llmRouter');

async function analyseKeywords(keywords, restaurant) {
  const prompt = `You are an SEO expert. Analyse these keywords for a local restaurant in Bangalore.

Restaurant: ${restaurant.name}, ${restaurant.area}
Keywords: ${keywords.map(k => k.keyword || k).join(', ')}

For each keyword rate:
- Difficulty: easy/medium/hard (local keywords are usually easy)
- Opportunity: high/medium/low
- Recommended action: blog post / landing page / GBP post / meta tag

Return JSON array:
[{"keyword": "...", "difficulty": "easy", "opportunity": "high", "action": "blog post"}]

Return JSON only.`;

  try {
    const raw = await route('seo_audit', prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return keywords.map(k => ({
      keyword: k.keyword || k,
      difficulty: 'easy',
      opportunity: 'medium',
      action: 'blog post',
    }));
  }
}

// Filter for quick win keywords (positions 8-20 in GSC)
function filterQuickWins(gscKeywords) {
  return gscKeywords.filter(k => k.position >= 8 && k.position <= 20);
}

module.exports = { analyseKeywords, filterQuickWins };