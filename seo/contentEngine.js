// seo/contentEngine.js
// ═══════════════════════════════════════════════════════════════════════════════
// Naisora AI Growth OS — Content Intelligence Engine
// ═══════════════════════════════════════════════════════════════════════════════

const { askClaudeSonnet } = require('../config/claude');
const {
  getBlogSystemPrompt,
  CONTENT_RULES,
  pickLocalKeywords,
} = require('../brain/blogStrategy');

/**
 * Generate a client-attracting blog post for a given keyword.
 * Follows the MASTER SEO SYSTEM PROMPT.
 */
async function generateWinningBlog(keyword, competitorUrls = []) {
  console.log(`✍️ [ContentEngine] Crafting MASTER SEO content for: ${keyword}`);

  const localAreas = pickLocalKeywords(3);
  const systemPrompt = getBlogSystemPrompt();

  const prompt = `
Topic/Keyword: ${keyword}
Competitors to beat: ${competitorUrls.join(', ') || 'General top results'}

Your task:
1. Identify competitor gaps (what top 5 results miss).
2. Draft a complete, ${CONTENT_RULES.wordCount.min}–${CONTENT_RULES.wordCount.max} word blog post.
3. Follow the MDX Frontmatter and Body structure exactly as defined in the system prompt.
4. Use neighborhoods: ${localAreas.join(', ')}.
5. Ensure AEO (direct answers under H2s) and GEO (stats + authority) rules are followed.
6. Generate Article, FAQPage, and LocalBusiness schema at the end.

CRITICAL: NO forbidden words (${CONTENT_RULES.forbidden.join(', ')}).
`;

  try {
    const rawContent = await askClaudeSonnet(prompt, systemPrompt);
    return rawContent;
  } catch (err) {
    console.error('Content Generation Failed:', err.message);
    return null;
  }
}

module.exports = { generateWinningBlog };
