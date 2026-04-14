// modules/content/blogWriter.js
// Naisora AI Growth OS — SEO Intelligence Content Engine
// Writes blogs that are designed to rank by analyzing competitors and search intent

const fs = require('fs');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const cleaned = line.replace(/\r/g, '').trim();
    if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
      const [key, ...rest] = cleaned.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const { askClaudeSonnet } = require("../../config/claude");
const { supabase } = require("../../config/database");
const { sendMessage } = require("../../config/telegram");

/**
 * Step 1A: Fetch REAL SERP data from SerpApi
 * Falls back to LLM simulation if no API key is set
 */
async function fetchRealSERP(keyword) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null; // no key — use fallback

  try {
    const encoded = encodeURIComponent(keyword);
    const url = `https://serpapi.com/search.json?q=${encoded}&hl=en&gl=in&api_key=${apiKey}`;
    const res = await fetch(url, { timeout: 8000 });
    const json = await res.json();

    const top5 = (json.organic_results || []).slice(0, 5).map(r => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet || '',
    }));

    return top5;
  } catch (err) {
    console.warn('⚠️  SerpApi call failed — using LLM fallback:', err.message);
    return null;
  }
}

/**
 * Step 1: Analyze Top 5 Google results (Real SERP → LLM fallback)
 */
async function analyzeSERP(keyword) {
  console.log(`🔍 Analyzing SERP for: "${keyword}"`);

  // Try real SERP first
  const realResults = await fetchRealSERP(keyword);

  if (realResults && realResults.length > 0) {
    const serpSummary = realResults
      .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`)
      .join('\n\n');

    // Feed real data to LLM for gap analysis
    const gapPrompt = `
Here are the real top 5 Google results for: "${keyword}"

${serpSummary}

Analyze these results and identify:
- Common headings used across these pages
- Key topics covered
- Clear weaknesses (thin content, missing sections)
- Content gaps we can fill to outrank them
`;
    return await askClaudeSonnet(gapPrompt);
  }

  // Fallback: LLM-only simulation if no real data
  const prompt = `
Analyze top 5 Google results for: "${keyword}"

Return:
- Common headings used
- Average word count of top results
- Key topics covered
- Weaknesses in current results
- Content gaps we can fill
`;
  return await askClaudeSonnet(prompt);
}

/**
 * Step 2: Classify search intent
 */
async function detectIntent(keyword) {
  const prompt = `
Classify search intent for: "${keyword}"
Return only: Informational / Commercial / Transactional
`;
  return await askClaudeSonnet(prompt);
}

/**
 * Step 3: Generate optimal blog structure
 */
async function generateStructure(keyword, serpData) {
  const prompt = `
Based on keyword: "${keyword}" and competitor data:
${serpData}

Create the best blog structure to rank #1 on Google.
Include H1, multiple H2s, H3s, and an FAQ section plan.
`;
  return await askClaudeSonnet(prompt);
}

const BLOG_TYPES = {
  local_seo: { label: "Local discovery post", word_count: 800 },
  food_story: { label: "Food story / origin", word_count: 600 },
  event: { label: "Event or offer post", word_count: 500 },
  listicle: { label: "Listicle", word_count: 700 },
};

async function writeBlog(params) {
  const {
    clientId,
    restaurantName,
    topic,
    blogType = "local_seo",
    area = "Bangalore",
    cuisine = "Indian",
    keywords = [],
  } = params;

  // Intelligence Layer
  const serpData = await analyzeSERP(topic);
  const intent = await detectIntent(topic);
  const structure = await generateStructure(topic, serpData);

  const prompt = `
You are an elite SEO strategist and expert food blogger.
Restaurant: ${restaurantName}
Location: ${area}, Bangalore
Cuisine: ${cuisine}

Keyword/Topic: ${topic}
Search Intent: ${intent}

COMPETITOR INSIGHTS (Beat these):
${serpData}

REQUESTED STRUCTURE:
${structure}

Your task:
- Write a professional, publish-ready blog post
- OUTPERFORM competitors by filling content gaps
- Optimize for ranking with natural keyword placement
- Tone: Warm, food-loving, local Bangalore vibe

FORMAT YOUR OUTPUT EXACTLY LIKE THIS:

TITLE: [SEO-friendly blog title]
META DESCRIPTION: [Under 160 characters]
CONTENT:
[Full blog post in Markdown with proper H2/H3 subheadings]
TAGS: [5-8 relevant tags separated by commas]

Include an FAQ section at the end with 3-5 questions.`;

  const blogText = await askClaudeSonnet(prompt);

  const titleMatch = blogText.match(/TITLE:\s*(.+)/);
  const metaMatch = blogText.match(/META DESCRIPTION:\s*(.+)/);
  const contentMatch = blogText.match(/CONTENT:\s*([\s\S]+?)(?=TAGS:|$)/);
  const tagsMatch = blogText.match(/TAGS:\s*(.+)/);

  const blog = {
    client_id: clientId,
    restaurant_name: restaurantName,
    title: titleMatch ? titleMatch[1].trim() : topic,
    meta_description: metaMatch ? metaMatch[1].trim() : "",
    content: contentMatch ? contentMatch[1].trim() : blogText,
    tags: tagsMatch
      ? tagsMatch[1].trim().split(",").map((t) => t.trim())
      : [],
    blog_type: blogType,
    status: "draft",
    created_at: new Date().toISOString(),
  };

  return blog;
}

async function saveBlogToSupabase(blog) {
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: blog.title,
      content: blog.content,
      meta_description: blog.meta_description,
      tags: blog.tags,
      client_id: blog.client_id,
      restaurant_name: blog.restaurant_name,
      blog_type: blog.blog_type,
      status: "draft",
      created_at: blog.created_at,
    })
    .select()
    .single();

  if (error) {
    console.error("Blog save error:", error.message);
    return null;
  }

  // Performance Tracking Initialization
  await supabase.from("blog_performance").insert({
    blog_id: data.id,
    keyword: blog.title,
    created_at: new Date().toISOString(),
    status: "tracking"
  });

  return data;
}

async function run(params) {
  console.log(`📝 Writing intelligence-driven blog for ${params.restaurantName}...`);

  try {
    const blog = await writeBlog(params);
    const saved = await saveBlogToSupabase(blog);

    if (saved) {
      await sendMessage(
        `📝 *SEO Intelligence Blog Ready*\n\n` +
          `Restaurant: ${blog.restaurant_name}\n` +
          `Title: ${blog.title}\n` +
          `Status: Draft — Optimized to rank #1\n\n` +
          `Blog ID: ${saved.id}`
      );
      console.log(`✅ Blog draft saved with performance tracking — ID: ${saved.id}`);
    }

    return blog;
  } catch (error) {
    console.error("Blog writer error:", error.message);
    await sendMessage(`❌ *Blog Writer Error*\n${error.message}`);
    throw error;
  }
}

module.exports = { run, writeBlog, analyzeSERP, detectIntent, generateStructure };
