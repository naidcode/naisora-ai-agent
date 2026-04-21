// modules/content/blogWriter.js
// ═══════════════════════════════════════════════════════════════════════════════
// Naisora AI Growth OS — Client-Attracting Blog Engine
// ═══════════════════════════════════════════════════════════════════════════════
// Every blog is designed to: attract restaurant owners, rank on Google, convert.
// Strategy loaded from: brain/blogStrategy.js (single source of truth)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ─── Load the permanent content strategy ─────────────────────────────────────
const {
  getBlogSystemPrompt,
  SEO_STRATEGY,
  pickCTA,
  pickLocalKeywords,
  getContentType,
  CLIENT_TOPICS,
  AUTHORITY_TOPICS,
  CONTENT_RULES,
} = require("../../brain/blogStrategy");

// ═══════════════════════════════════════════════════════════════════════════════
// Step 1A: Fetch REAL SERP data from SerpApi
// Falls back to LLM simulation if no API key is set
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchRealSERP(keyword) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null;

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

// ═══════════════════════════════════════════════════════════════════════════════
// Step 1: Analyze Top 5 Google results (Real SERP → LLM fallback)
// Now focused on finding CONVERSION gaps, not just content gaps
// ═══════════════════════════════════════════════════════════════════════════════
async function analyzeSERP(keyword) {
  console.log(`🔍 Analyzing SERP for: "${keyword}"`);

  const realResults = await fetchRealSERP(keyword);

  if (realResults && realResults.length > 0) {
    const serpSummary = realResults
      .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`)
      .join('\n\n');

    const gapPrompt = `
Here are the real top 5 Google results for: "${keyword}"

${serpSummary}

Analyze these results and identify:
- Do any of them directly address restaurant owner pain points (no website, losing customers, Zomato dependence)?
- Are they written in simple language a busy restaurant owner would read?
- Do they include local Bangalore references?
- What CONVERSION gaps exist — i.e., what would make a restaurant owner actually contact someone after reading?
- What specific problems do they FAIL to address?
`;
    return await askClaudeSonnet(gapPrompt);
  }

  // Fallback: LLM-only simulation
  const prompt = `
Analyze top 5 Google results for: "${keyword}"

Focus your analysis on:
- Do results solve REAL problems restaurant owners face? (no website, not on Google, losing to Zomato)
- Are they written in simple, non-technical language?
- Do they include Bangalore-specific references?
- What conversion gaps exist — what would make a restaurant owner take action?
- What pain points are being ignored?

Return specific, actionable gaps we can exploit.
`;
  return await askClaudeSonnet(prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Step 2: Classify search intent — now also identifies conversion potential
// ═══════════════════════════════════════════════════════════════════════════════
async function detectIntent(keyword) {
  const prompt = `
Classify search intent for: "${keyword}"

Return in this format:
INTENT: [Informational / Commercial / Transactional]
CONVERSION_POTENTIAL: [High / Medium / Low]
BUYER_STAGE: [Awareness / Consideration / Decision]
RECOMMENDED_CTA: [free audit / portfolio showcase / direct consultation]
`;
  return await askClaudeSonnet(prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Step 3: Generate blog structure using the MANDATORY 7-part framework
// ═══════════════════════════════════════════════════════════════════════════════
async function generateStructure(keyword, serpData) {
  const localAreas = pickLocalKeywords(3);
  const cta = pickCTA();

  const prompt = `
Based on keyword: "${keyword}" and competitor analysis:
${serpData}

Create a blog structure that follows this EXACT framework:

1. HOOK — A sharp, pain-based opening that makes a restaurant owner stop scrolling
2. PROBLEM EXPLANATION — What's happening and why it's hurting their business
3. REAL-WORLD IMPACT — Tangible losses (customers, money, visibility)
4. SIMPLE SOLUTION — Website + Google visibility (keep it non-technical)
5. PRACTICAL STEPS — 3-5 specific, actionable steps
6. SERVICE CONNECTION — Natural mention of how Naisora helps with this
7. CTA — Clear call to action: "${cta.text}"

LOCAL CONTEXT: Mention these Bangalore areas naturally: ${localAreas.join(', ')}

Return the structure as an outline with H1, H2s, H3s, and a 3-5 question FAQ section.
Each section should have a 1-line description of what to write.
`;
  return await askClaudeSonnet(prompt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Step 4: Write the actual blog — using the permanent strategy prompt
// ═══════════════════════════════════════════════════════════════════════════════
async function writeBlog(params) {
  const {
    clientId = null,
    restaurantName = 'Naisora',
    topic,
    blogType = "client",
    area = "Bangalore",
    cuisine = "Indian",
    keywords = [],
  } = params;

  // Intelligence Layer
  const serpData = await analyzeSERP(topic);
  const intent = await detectIntent(topic);
  const structure = await generateStructure(topic, serpData);

  const localAreas = pickLocalKeywords(3);
  const cta = pickCTA();

  // Select relevant long-tail keywords
  const relevantLongTails = SEO_STRATEGY.longTailKeywords
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // ─── The main blog generation prompt ─────────────────────────────────────
  const systemPrompt = getBlogSystemPrompt();

  const userPrompt = `
TOPIC: ${topic}
PRIMARY KEYWORD: ${topic.toLowerCase()}
SEARCH INTENT: ${intent}
TARGET AREA: ${area}, Bangalore

COMPETITOR INSIGHTS (Beat these — focus on conversion gaps):
${serpData}

REQUESTED STRUCTURE (Follow this framework):
${structure}

ADDITIONAL REQUIREMENTS:
- Mention these Bangalore neighborhoods naturally: ${localAreas.join(', ')}
- Weave in these long-tail keywords: ${relevantLongTails.join(', ')}
${keywords.length > 0 ? `- Also include these specific keywords: ${keywords.join(', ')}` : ''}

CTA TO USE AT THE END:
${cta.text}
Link: ${cta.link}

FORMAT YOUR OUTPUT EXACTLY LIKE THIS:

TITLE: [SEO-friendly blog title — must include primary keyword]
META_DESCRIPTION: [Under 160 characters — must include primary keyword and Bangalore]
CONTENT:
[Full blog post in Markdown — MUST follow the 7-part structure]
[MUST include FAQ section with 3-5 questions]
[MUST end with a clear CTA]
TAGS: [5-8 relevant tags separated by commas — include "Bangalore" and primary keyword]
`;

  const blogText = await askClaudeSonnet(userPrompt, systemPrompt);

  // ─── Parse the response ──────────────────────────────────────────────────
  const titleMatch = blogText.match(/TITLE:\s*(.+)/);
  const metaMatch = blogText.match(/META[_ ]DESCRIPTION:\s*(.+)/);
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
    content_type: getContentType(Date.now()), // 'client' or 'authority'
    cta_type: cta.type,
    status: "draft",
    created_at: new Date().toISOString(),
  };

  return blog;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Save to Supabase with conversion tracking
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════════
async function run(params) {
  console.log(`📝 Writing client-attracting blog: "${params.topic}"...`);
  console.log(`   Strategy: Problem → Solution → Conversion`);

  try {
    const blog = await writeBlog(params);
    const saved = await saveBlogToSupabase(blog);

    if (saved) {
      await sendMessage(
        `📝 *Client-Attracting Blog Ready*\n\n` +
          `Title: ${blog.title}\n` +
          `Type: ${blog.blog_type} (${blog.content_type})\n` +
          `CTA: ${blog.cta_type}\n` +
          `Status: Draft — Ready for review\n\n` +
          `Blog ID: ${saved.id}`
      );
      console.log(`✅ Blog draft saved — ID: ${saved.id}`);
    }

    return blog;
  } catch (error) {
    console.error("Blog writer error:", error.message);
    await sendMessage(`❌ *Blog Writer Error*\n${error.message}`);
    throw error;
  }
}

module.exports = { run, writeBlog, analyzeSERP, detectIntent, generateStructure };
