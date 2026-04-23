// modules/seo/keywordMapper.js
// Maps keywords to website pages and content actions

const { route } = require('../../config/llmRouter');

async function mapKeywordsToPages(keywords, website) {
  const prompt = `Map these keywords to website pages for a restaurant website.

Website: ${website}
Keywords: ${JSON.stringify(keywords.slice(0, 15))}

For each keyword decide:
- Which page it belongs to (homepage/menu/about/contact/blog/new page needed)
- What action to take (update title tag/add to content/write new blog/create landing page)

Return JSON array:
[{"keyword": "...", "page": "homepage", "action": "update title tag", "priority": "high"}]

Return JSON only.`;

  try {
    const raw = await route('seo_audit', prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return keywords.map(k => ({
      keyword: k.keyword || k,
      page: 'blog',
      action: 'write new blog post',
      priority: 'medium',
    }));
  }
}

module.exports = { mapKeywordsToPages };