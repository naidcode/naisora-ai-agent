// seo/contentOptimizer.js
// Naisora AI Growth OS — Content Validation & Auto-Improvement Engine
// Scores blogs against SEO criteria and automatically upgrades weak content

const { askClaudeSonnet } = require('../config/claude');
const { supabase } = require('../config/database');
const { sendMessage } = require('../config/telegram');

// ─── Score a blog post 0–100 against SEO criteria ────────────────────────────
async function scoreContent(content, title = '') {
  const prompt = `
You are a senior SEO analyst. Evaluate this blog post strictly for its ability to rank on Google.

Title: ${title}

Content:
${content.substring(0, 4000)}${content.length > 4000 ? '\n...[truncated]' : ''}

Score the blog from 0 to 100 on:
- Depth & uniqueness of information (25 pts)
- Heading structure (H1, H2, H3 hierarchy) (20 pts)
- Keyword usage — natural, not stuffed (20 pts)
- FAQ/featured snippet potential (15 pts)
- Readability and mobile friendliness (10 pts)
- Meta description quality (10 pts)

Return ONLY a JSON object:
{
  "score": 75,
  "breakdown": {
    "depth": 18,
    "structure": 15,
    "keywords": 16,
    "faq": 10,
    "readability": 8,
    "meta": 8
  },
  "weaknesses": ["Missing FAQ section", "Heading hierarchy incorrect"],
  "quick_fixes": ["Add 3-question FAQ", "Add H3 under each H2"]
}
`;

  try {
    const raw = await askClaudeSonnet(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Content scoring failed:', err.message);
    return { score: 50, breakdown: {}, weaknesses: [], quick_fixes: [] };
  }
}

// ─── Auto-improve weak blog content ──────────────────────────────────────────
async function improveContent(content, weaknesses = []) {
  const prompt = `
You are an elite SEO content editor. Your job is to upgrade this blog post so it ranks #1 on Google.

Known weaknesses:
${weaknesses.length > 0 ? weaknesses.join('\n') : 'Improve depth, structure, and SEO signals overall.'}

Original content:
${content.substring(0, 5000)}

Rules:
- Keep the core information intact
- Fix all listed weaknesses
- Add missing FAQ section if needed
- Ensure correct H1→H2→H3 hierarchy in Markdown
- Keep a natural, engaging tone
- Must be 1,200+ words

Return the improved full content only, no commentary.
`;

  try {
    return await askClaudeSonnet(prompt);
  } catch (err) {
    console.error('Content improvement failed:', err.message);
    return content; // return original if improvement fails
  }
}

// ─── Save score to blog_scores table ─────────────────────────────────────────
async function saveBlogScore(blogId, scoreData) {
  const { error } = await supabase.from('blog_scores').upsert({
    blog_id: blogId,
    score: scoreData.score,
    weaknesses: scoreData.weaknesses,
    quick_fixes: scoreData.quick_fixes,
    last_checked: new Date().toISOString(),
  });

  if (error) console.error('Failed to save blog score:', error.message);
}

// ─── Check and optionally improve a single blog ───────────────────────────────
async function auditAndImproveOneBlog(blog) {
  console.log(`\n📊 [ContentOptimizer] Scoring blog: "${blog.title}"`);

  const scoreData = await scoreContent(blog.content, blog.title);
  await saveBlogScore(blog.id, scoreData);

  console.log(`   Score: ${scoreData.score}/100`);

  if (scoreData.score < 70) {
    console.log(`   ❌ Score below threshold — auto-improving...`);
    const improved = await improveContent(blog.content, scoreData.weaknesses);

    // Save improved version back to DB
    const { error } = await supabase
      .from('blog_posts')
      .update({ content: improved, status: 'optimized' })
      .eq('id', blog.id);

    if (!error) {
      await sendMessage(
        `🚀 *Blog Auto-Optimized*\n\n` +
        `Title: ${blog.title}\n` +
        `Old Score: ${scoreData.score}/100\n` +
        `Weaknesses Fixed: ${scoreData.weaknesses.join(', ') || 'General improvements'}`
      );
      console.log('   ✅ Blog improved and saved.');
    }

    return { ...scoreData, improved: true };
  }

  console.log(`   ✅ Score acceptable — no changes needed.`);
  return { ...scoreData, improved: false };
}

// ─── Batch audit all draft/published blogs needing a score ───────────────────
async function auditAllBlogs(limit = 5) {
  console.log('\n🔍 [ContentOptimizer] Batch auditing blogs...');

  const { data: blogs, error } = await supabase
    .from('blog_posts')
    .select('id, title, content')
    .in('status', ['draft', 'published', 'optimized'])
    .limit(limit);

  if (error || !blogs || blogs.length === 0) {
    console.log('No blogs to audit.');
    return [];
  }

  const results = [];
  for (const blog of blogs) {
    const result = await auditAndImproveOneBlog(blog);
    results.push({ blog_id: blog.id, title: blog.title, ...result });
    await new Promise(r => setTimeout(r, 2000)); // small delay
  }

  return results;
}

module.exports = { scoreContent, improveContent, auditAndImproveOneBlog, auditAllBlogs, saveBlogScore };
