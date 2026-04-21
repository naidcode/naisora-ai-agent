// modules/seo/internalLinker.js
// Suggests internal linking opportunities between blog posts

const { route } = require('../../config/llmRouter');

async function suggestInternalLinks(posts) {
  if (!posts || posts.length < 2) return [];

  const prompt = `Suggest internal linking opportunities between these blog posts.

Posts:
${posts.map((p, i) => `${i + 1}. ${p.title} (${p.slug})`).join('\n')}

For each post, suggest 2 other posts it should link to and what anchor text to use.
Return JSON: [{"from_post": "slug", "to_post": "slug", "anchor_text": "..."}]
Return JSON only.`;

  try {
    const raw = await route('seo_audit', prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return [];
  }
}

module.exports = { suggestInternalLinks };