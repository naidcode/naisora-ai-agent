// modules/wordpress/blogPublisher.js
// Naisora AI Agent — Blog Publisher
// Writes 3 SEO blog posts per week per client using Sonnet
// Saves as WordPress drafts — you approve, agent publishes
// Format: "Best [food type] in [area] Bangalore" — proven to rank

require('dotenv').config();
const { askClaudeSonnet } = require('../../config/claude');
const { createDraftPost, publishPost } = require('./wpConnector');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Blog writing system prompt ───────────────────────────────────────────────
const BLOG_SYSTEM = `You are an SEO content writer specialising in restaurant and food content for Bangalore, India.

Rules:
1. Write for restaurant customers — people searching for food options on Google
2. Target keyword must appear naturally in: title, first paragraph, 2-3 subheadings, conclusion
3. Include FAQ section at the end — these get Google featured snippets
4. Minimum 1,500 words — longer content ranks better
5. Mention specific neighbourhoods, landmarks, metro stations near the restaurant
6. Include a natural call to action to visit/order
7. Write in a friendly, helpful tone — like a local food blogger
8. No keyword stuffing — sound natural

Structure:
- H1: Target keyword (the blog title)
- Introduction (150 words)
- H2: Main sections (4-5 sections)
- H2: FAQ (5 questions with answers)
- Conclusion with CTA`;

// ─── Generate blog topic ideas for a restaurant ───────────────────────────────
async function generateBlogTopics(restaurant) {
  const prompt = `Generate 5 SEO blog post topics for a restaurant in Bangalore.

Restaurant: ${restaurant.name}
Type: ${restaurant.category || 'restaurant'}
Area: ${restaurant.area}, Bangalore
Speciality: ${restaurant.speciality || 'multi-cuisine'}

Topics must:
1. Target keywords people actually search ("best biryani in Koramangala Bangalore")
2. Be achievable to rank for (local + specific = less competition)
3. Bring hungry customers who are ready to visit or order

Format: Return 5 topics as a JSON array like:
[
  {"title": "Best Biryani in Koramangala Bangalore", "keyword": "best biryani koramangala", "intent": "someone looking for biryani nearby"},
  ...
]

Return JSON only, no explanation.`;

  try {
    const raw = await askClaudeSonnet(prompt, BLOG_SYSTEM, 500);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    // Fallback topics
    return [
      { title: `Best ${restaurant.category || 'Restaurant'} in ${restaurant.area} Bangalore`, keyword: `best restaurant ${restaurant.area} bangalore`, intent: 'local food search' },
      { title: `${restaurant.name} Review — ${restaurant.area} Bangalore`, keyword: `${restaurant.name} ${restaurant.area}`, intent: 'brand search' },
      { title: `Top Places to Eat in ${restaurant.area} Bangalore 2025`, keyword: `places to eat ${restaurant.area}`, intent: 'local food discovery' },
    ];
  }
}

// ─── Write a full blog post ───────────────────────────────────────────────────
async function writeBlogPost(restaurant, topic) {
  const prompt = `Write a complete SEO blog post for a restaurant.

Restaurant: ${restaurant.name}
Location: ${restaurant.area}, Bangalore
Blog Title: ${topic.title}
Target Keyword: ${topic.keyword}
Search Intent: ${topic.intent}

Write the full blog post following all the rules. Minimum 1,500 words.
Use HTML formatting: <h2>, <h3>, <p>, <ul>, <li> tags.
Include a FAQ section with 5 questions at the end.`;

  try {
    const content = await askClaudeSonnet(prompt, BLOG_SYSTEM, 2000);

    // Generate meta description
    const metaPrompt = `Write a 155-character meta description for this blog post.
Title: ${topic.title}
Keyword: ${topic.keyword}
Return ONLY the meta description, nothing else.`;

    const metaDescription = await askClaudeSonnet(metaPrompt, BLOG_SYSTEM, 100);

    return {
      title: topic.title,
      content,
      keyword: topic.keyword,
      metaDescription: metaDescription.trim().substring(0, 155),
      seoTitle: `${topic.title} | ${restaurant.name}`,
      focusKeyword: topic.keyword,
      wordCount: content.split(/\s+/).length,
    };
  } catch (err) {
    console.error(`Blog writing failed: ${err.message}`);
    return null;
  }
}

// ─── Publish blogs for a client ───────────────────────────────────────────────
async function publishWeeklyBlogs(client) {
  console.log(`\n📝 Writing blogs for ${client.business_name}...`);

  if (!client.wp_site_url || !client.wp_username || !client.wp_app_password) {
    console.log('❌ WordPress credentials missing for this client');
    return;
  }

  const restaurant = {
    name: client.business_name,
    area: client.area,
    category: client.category,
    speciality: client.speciality || '',
  };

  // Generate 3 blog topics
  const topics = await generateBlogTopics(restaurant);
  const topicsToWrite = topics.slice(0, 3);

  const results = [];

  for (const topic of topicsToWrite) {
    console.log(`\n✍️  Writing: "${topic.title}"`);

    const blogPost = await writeBlogPost(restaurant, topic);
    if (!blogPost) continue;

    console.log(`   Words: ${blogPost.wordCount}`);

    // Save as WordPress draft
    const result = await createDraftPost(
      client.wp_site_url,
      client.wp_username,
      client.wp_app_password,
      blogPost
    );

    if (result.success) {
      // Save to blog_posts table
      await supabase.from('blog_posts').insert({
        lead_id: client.lead_id,
        title: blogPost.title,
        keyword: blogPost.keyword,
        word_count: blogPost.wordCount,
        status: 'draft',
        wp_post_id: result.postId,
      });

      results.push({
        title: blogPost.title,
        postId: result.postId,
        editUrl: result.editUrl,
      });

      console.log(`   ✅ Draft saved — Post ID: ${result.postId}`);
    }

    // Small delay between posts
    await new Promise(r => setTimeout(r, 2000));
  }

  // Telegram alert with review links
  if (results.length > 0) {
    let msg = `📝 *${results.length} Blog Drafts Ready — ${client.business_name}*\n\n`;
    msg += `Review and approve these drafts:\n\n`;
    results.forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
      msg += `   Edit: ${r.editUrl}\n\n`;
    });
    msg += `Approve in WordPress → agent publishes automatically.`;

    await sendTelegramAlert(msg);
  }

  return results;
}

// ─── Publish approved drafts ──────────────────────────────────────────────────
async function publishApprovedDrafts() {
  const { data: approvedPosts } = await supabase
    .from('blog_posts')
    .select('*, leads(wp_site_url, wp_username, wp_app_password)')
    .eq('status', 'approved')
    .is('published_url', null);

  if (!approvedPosts || approvedPosts.length === 0) {
    console.log('No approved drafts to publish.');
    return;
  }

  for (const post of approvedPosts) {
    const client = post.leads;
    if (!client?.wp_site_url) continue;

    const result = await publishPost(
      client.wp_site_url,
      client.wp_username,
      client.wp_app_password,
      post.wp_post_id
    );

    if (result.success) {
      await supabase
        .from('blog_posts')
        .update({
          status: 'published',
          published_url: result.url,
          published_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      console.log(`✅ Published: ${post.title}`);
    }
  }
}

module.exports = { publishWeeklyBlogs, generateBlogTopics, writeBlogPost, publishApprovedDrafts };