// seo/contentEngine.js
// Naisora AI Growth OS — Content Intelligence
// Creates content that actually ranks and converts

const { askClaudeSonnet } = require('../config/claude');

async function generateWinningBlog(keyword, competitorUrls = []) {
  console.log(`✍️ [ContentEngine] Crafting high-ranking content for: ${keyword}`);

  const prompt = `You are a world-class SEO strategist. 
Topic: ${keyword}
Competitors: ${competitorUrls.join(', ') || 'General top results'}

Task:
1. Identify 3 critical content gaps in the current top 10 Google results for this keyword.
2. Draft a complete, 1,500-word blog post that addresses these gaps.
3. Use a tone that converts — focus on business pain points and ROI.
4. Structure with expert H2s, H3s, and an FAQ section for Featured Snippets.

Format: Markdown with TITLE, META_DESCRIPTION, and CONTENT.`;

  try {
    const rawContent = await askClaudeSonnet(prompt);
    return rawContent;
  } catch (err) {
    console.error('Content Generation Failed:', err.message);
    return null;
  }
}

module.exports = { generateWinningBlog };
