// seo/contentOptimizer.js
// ═══════════════════════════════════════════════════════════════════════════════
// Naisora AI Growth OS — Content Validation & Auto-Improvement Engine
// Now scores blogs against CONVERSION criteria, not just generic SEO.
// Strategy loaded from: brain/blogStrategy.js
// ═══════════════════════════════════════════════════════════════════════════════

const { askClaudeSonnet } = require('../config/claude');
const { supabase } = require('../config/database');
const { sendMessage } = require('../config/telegram');
const {
  CONTENT_RULES,
  BLOG_STRUCTURE,
  getBlogSystemPrompt,
} = require('../brain/blogStrategy');

// ─── Score a blog post 0–100 against conversion + SEO criteria ───────────────
async function scoreContent(content, title = '') {
  const prompt = `
You are a senior SEO analyst AND conversion specialist for a restaurant web design agency.
Evaluate this blog post for its ability to RANK on Google AND CONVERT restaurant owners into leads.

Title: ${title}

Content:
${content.substring(0, 5000)}${content.length > 5000 ? '\n...[truncated]' : ''}

Score the blog from 0 to 100 on these criteria:

CONVERSION CRITERIA (50 points total):
- Pain-point hook — does it open with a real problem restaurant owners face? (10 pts)
- Problem-solution structure — does it follow Hook → Problem → Impact → Solution → Steps → CTA? (10 pts)
- CTA presence and quality — does it end with a clear, compelling call-to-action? (10 pts)
- Service connection — does it naturally connect the solution to the agency's services? (10 pts)
- Target audience fit — is it written FOR restaurant/cafe owners, not generic readers? (10 pts)

SEO CRITERIA (50 points total):
- Heading structure (H1, H2, H3 hierarchy) (10 pts)
- Local keyword usage — Bangalore neighborhoods, "restaurant website" keywords (10 pts)
- FAQ section for Featured Snippets (10 pts)
- Readability — simple language, no jargon, Grade 8 reading level (10 pts)
- Meta description quality — under 160 chars, includes keyword + location (10 pts)

DISQUALIFIERS (auto-deduct points):
- Generic marketing theory with no real problem → deduct 20 pts
- No CTA at all → deduct 15 pts
- Advanced tech jargon (hyper-personalization, machine learning, etc.) → deduct 10 pts
- No local Bangalore references → deduct 10 pts
- No connection to restaurant owner problems → deduct 20 pts

Return ONLY a JSON object:
{
  "score": 75,
  "conversion_score": 35,
  "seo_score": 40,
  "breakdown": {
    "pain_hook": 8,
    "structure": 7,
    "cta_quality": 9,
    "service_connection": 6,
    "audience_fit": 5,
    "heading_structure": 8,
    "local_keywords": 7,
    "faq_section": 8,
    "readability": 9,
    "meta_quality": 8
  },
  "weaknesses": ["Missing CTA", "No Bangalore neighborhood mentions"],
  "quick_fixes": ["Add a free audit CTA at the end", "Mention Indiranagar and Koramangala"],
  "conversion_grade": "B",
  "will_attract_clients": true
}
`;

  try {
    const raw = await askClaudeSonnet(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Content scoring failed:', err.message);
    return {
      score: 50,
      conversion_score: 25,
      seo_score: 25,
      breakdown: {},
      weaknesses: [],
      quick_fixes: [],
      conversion_grade: 'C',
      will_attract_clients: false,
    };
  }
}

// ─── Auto-improve weak blog content using the conversion framework ───────────
async function improveContent(content, weaknesses = []) {
  const systemPrompt = getBlogSystemPrompt();

  const prompt = `
You are an elite SEO content editor for a restaurant web design agency. Your job is to upgrade this blog post so it:
1. RANKS #1 on Google for restaurant-related keywords
2. CONVERTS restaurant owners into leads

Known weaknesses to fix:
${weaknesses.length > 0 ? weaknesses.join('\n') : 'Improve conversion focus, local relevance, and CTA.'}

Original content:
${content.substring(0, 5000)}

MANDATORY IMPROVEMENTS:
- Ensure the post follows the 7-part structure: Hook → Problem → Impact → Solution → Steps → Service Connection → CTA
- Add/improve the pain-based hook if weak
- Add Bangalore neighborhood references if missing (Indiranagar, Koramangala, HSR, Whitefield)
- Add/strengthen the CTA at the end — must drive reader to contact for a free website audit
- Simplify any jargon — restaurant owners are NOT tech-savvy
- Add an FAQ section (3-5 questions) if missing
- Ensure natural connection between the problem and Naisora's web design service
- Must be 1,200+ words

CRITICAL: The improved version must feel like advice from a successful friend, NOT a corporate blog.

Return the improved full content only, no commentary.
`;

  try {
    return await askClaudeSonnet(prompt, systemPrompt);
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
    conversion_score: scoreData.conversion_score || null,
    seo_score: scoreData.seo_score || null,
    conversion_grade: scoreData.conversion_grade || null,
    will_attract_clients: scoreData.will_attract_clients || false,
    weaknesses: scoreData.weaknesses,
    quick_fixes: scoreData.quick_fixes,
    last_checked: new Date().toISOString(),
  });

  if (error) console.error('Failed to save blog score:', error.message);
}

// ─── Check and optionally improve a single blog ──────────────────────────────
async function auditAndImproveOneBlog(blog) {
  console.log(`\n📊 [ContentOptimizer] Scoring blog: "${blog.title}"`);

  const scoreData = await scoreContent(blog.content, blog.title);
  await saveBlogScore(blog.id, scoreData);

  console.log(`   Total Score: ${scoreData.score}/100`);
  console.log(`   Conversion: ${scoreData.conversion_score}/50 | SEO: ${scoreData.seo_score}/50`);
  console.log(`   Grade: ${scoreData.conversion_grade} | Will attract clients: ${scoreData.will_attract_clients}`);

  // Threshold: score below 65 OR conversion score below 30 triggers auto-improvement
  if (scoreData.score < 65 || (scoreData.conversion_score && scoreData.conversion_score < 30)) {
    console.log(`   ❌ Below threshold — auto-improving for better conversion...`);
    const improved = await improveContent(blog.content, scoreData.weaknesses);

    // Save improved version back to DB
    const { error } = await supabase
      .from('blog_posts')
      .update({ content: improved, status: 'optimized' })
      .eq('id', blog.id);

    if (!error) {
      await sendMessage(
        `🚀 *Blog Auto-Optimized for Conversion*\n\n` +
        `Title: ${blog.title}\n` +
        `Old Score: ${scoreData.score}/100 (Conversion: ${scoreData.conversion_score}/50)\n` +
        `Grade: ${scoreData.conversion_grade}\n` +
        `Weaknesses Fixed: ${scoreData.weaknesses.join(', ') || 'General improvements'}\n` +
        `Will attract clients: ${scoreData.will_attract_clients ? 'Yes ✅' : 'Improved ⬆️'}`
      );
      console.log('   ✅ Blog improved for conversion and saved.');
    }

    return { ...scoreData, improved: true };
  }

  console.log(`   ✅ Score acceptable — this post should attract clients.`);
  return { ...scoreData, improved: false };
}

// ─── Batch audit all draft/published blogs ───────────────────────────────────
async function auditAllBlogs(limit = 5) {
  console.log('\n🔍 [ContentOptimizer] Batch auditing blogs for conversion potential...');

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
    await new Promise(r => setTimeout(r, 2000)); // small delay between API calls
  }

  // Summary report
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const clientReady = results.filter(r => r.will_attract_clients).length;
  console.log(`\n📈 Audit Summary: Avg score ${avgScore.toFixed(0)}/100 | ${clientReady}/${results.length} client-ready`);

  return results;
}

module.exports = { scoreContent, improveContent, auditAndImproveOneBlog, auditAllBlogs, saveBlogScore };
