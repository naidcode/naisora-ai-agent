// seo/contentEngine.js
// ═══════════════════════════════════════════════════════════════════════════════
// Naisora AI Growth OS — Content Intelligence Engine
// Creates content that ranks AND converts restaurant owners into leads
// Strategy loaded from: brain/blogStrategy.js
// ═══════════════════════════════════════════════════════════════════════════════

const { askClaudeSonnet } = require('../config/claude');
const {
  getBlogSystemPrompt,
  SEO_STRATEGY,
  pickCTA,
  pickLocalKeywords,
  CONTENT_RULES,
} = require('../brain/blogStrategy');

/**
 * Generate a client-attracting blog post for a given keyword.
 * Uses the permanent strategy to ensure every post drives conversions.
 */
async function generateWinningBlog(keyword, competitorUrls = []) {
  console.log(`✍️ [ContentEngine] Crafting client-attracting content for: ${keyword}`);

  const localAreas = pickLocalKeywords(3);
  const cta = pickCTA();

  const systemPrompt = getBlogSystemPrompt();

  const prompt = `
Topic/Keyword: ${keyword}
Competitors to beat: ${competitorUrls.join(', ') || 'General top results'}

Your task:
1. Identify 3 critical CONVERSION gaps in the current top Google results for this keyword.
   (Do they address real restaurant owner pain points? Do they have CTAs? Are they locally relevant?)
2. Draft a complete, 1,500-word blog post that:
   - Follows the MANDATORY 7-part structure (Hook → Problem → Impact → Solution → Steps → Service Connection → CTA)
   - Targets restaurant and cafe owners in Bangalore
   - Mentions these neighborhoods naturally: ${localAreas.join(', ')}
   - Ends with this CTA: "${cta.text}"
3. Use simple language — no jargon. Write like you're giving advice to a friend who owns a restaurant.
4. Structure with proper H2s, H3s, and a 3-5 question FAQ section for Featured Snippets.

CRITICAL RULES:
${CONTENT_RULES.mandatory.map(r => `✅ ${r}`).join('\n')}

NEVER DO:
${CONTENT_RULES.forbidden.map(r => `❌ ${r}`).join('\n')}

Format: Markdown with TITLE, META_DESCRIPTION, and CONTENT.`;

  try {
    const rawContent = await askClaudeSonnet(prompt, systemPrompt);
    return rawContent;
  } catch (err) {
    console.error('Content Generation Failed:', err.message);
    return null;
  }
}

module.exports = { generateWinningBlog };
