// config/llmRouter.js
// Naisora AI Agent — Smart Model Router
// Routes every task to the cheapest model that can handle it
//
// ROUTING LOGIC:
// Claude Sonnet  → client-facing work (cold emails, audits, blogs, intel reports)
// Claude Haiku   → internal decisions (categorisation, scoring, alerts)
// Groq FREE      → bulk follow-ups, basic summaries, simple rewrites
// Gemini FREE    → image prompts, GBP posts, social captions, bulk content

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Clients ──────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Task routing map ─────────────────────────────────────────────────────────
// Every task type mapped to its model
const TASK_ROUTES = {
  // Claude Sonnet — important, client-facing
  cold_email:           'sonnet',
  seo_audit:            'sonnet',
  blog_post:            'sonnet',
  client_report:        'sonnet',
  intelligence_report:  'sonnet',
  reply_analysis:       'sonnet',
  whatsapp_message:     'sonnet',
  followup_email:       'sonnet',
  audit_report:         'sonnet',

  // Claude Haiku — internal, cheap
  categorise:           'haiku',
  lead_score:           'haiku',
  telegram_alert:       'haiku',
  sentiment:            'haiku',
  yes_no:               'haiku',
  humanize:             'haiku',

  // Groq FREE — bulk follow-ups and summaries
  whatsapp_followup:    'groq',
  email_followup:       'groq',
  basic_summary:        'groq',
  bulk_rewrite:         'groq',
  simple_reply:         'groq',

  // Gemini FREE — content and images
  image_prompt:         'groq',
  social_caption:       'groq',
  gbp_post:             'groq',
  blog_image:           'groq',
  hashtags:             'groq',
};

// ─── Claude Sonnet ────────────────────────────────────────────────────────────
async function callSonnet(prompt, systemPrompt = null, maxTokens = 2000) {
  const params = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (systemPrompt) params.system = systemPrompt;
  const msg = await anthropic.messages.create(params);
  return msg.content[0].text;
}

// ─── Claude Haiku ─────────────────────────────────────────────────────────────
async function callHaiku(prompt, systemPrompt = null, maxTokens = 1000) {
  const params = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (systemPrompt) params.system = systemPrompt;
  const msg = await anthropic.messages.create(params);
  return msg.content[0].text;
}

// ─── Groq (FREE) ──────────────────────────────────────────────────────────────
async function callGroq(prompt, systemPrompt = null, maxTokens = 1000) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile', // best free Groq model
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || '';
}

// ─── Gemini (FREE) ────────────────────────────────────────────────────────────
async function callGemini(prompt, maxTokens = 1000) {
  const model = gemini.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── Main router function ─────────────────────────────────────────────────────
/**
 * Route a task to the correct model
 * @param {string} taskType - Task type from TASK_ROUTES
 * @param {string} prompt - The prompt to send
 * @param {string} systemPrompt - Optional system prompt
 * @param {number} maxTokens - Max tokens for response
 */
async function route(taskType, prompt, systemPrompt = null, maxTokens = null) {
  const model = TASK_ROUTES[taskType] || 'haiku'; // default to Haiku if unknown

  const tokenLimit = maxTokens || getDefaultTokens(taskType);

  console.log(`🤖 [Router] ${taskType} → ${model.toUpperCase()}`);

  try {
    switch (model) {
      case 'sonnet':
        return await callSonnet(prompt, systemPrompt, tokenLimit);

      case 'haiku':
        return await callHaiku(prompt, systemPrompt, tokenLimit);

      case 'groq':
        return await callGroq(prompt, systemPrompt, tokenLimit);

      case 'gemini':
        return await callGemini(prompt, tokenLimit);

      default:
        return await callHaiku(prompt, systemPrompt, tokenLimit);
    }
  } catch (err) {
    console.error(`❌ [Router] ${model} failed for ${taskType}: ${err.message}`);

    // Fallback chain — if primary fails, try next cheapest
    const fallback = getFallback(model);
    if (fallback) {
      console.log(`⚠️  [Router] Falling back to ${fallback.toUpperCase()}`);
      try {
        switch (fallback) {
          case 'haiku':
            return await callHaiku(prompt, systemPrompt, tokenLimit);
          case 'groq':
            return await callGroq(prompt, systemPrompt, tokenLimit);
          case 'gemini':
            return await callGemini(prompt, tokenLimit);
          case 'sonnet':
            return await callSonnet(prompt, systemPrompt, tokenLimit);
        }
      } catch (fallbackErr) {
        console.error(`❌ [Router] Fallback also failed: ${fallbackErr.message}`);
        return null;
      }
    }
    return null;
  }
}

// ─── Fallback chain ───────────────────────────────────────────────────────────
function getFallback(failedModel) {
  const fallbacks = {
    sonnet: 'haiku',   // if Sonnet fails, try Haiku
    haiku: 'groq',     // if Haiku fails, try Groq free
    groq: 'haiku',     // if Groq fails, try Haiku
    gemini: 'groq',    // if Gemini fails, try Groq
  };
  return fallbacks[failedModel] || null;
}

// ─── Default token limits per task ───────────────────────────────────────────
function getDefaultTokens(taskType) {
  const limits = {
    cold_email: 400,
    seo_audit: 1500,
    blog_post: 2000,
    client_report: 1500,
    intelligence_report: 1500,
    reply_analysis: 300,
    whatsapp_message: 300,
    followup_email: 300,
    whatsapp_followup: 200,
    email_followup: 300,
    basic_summary: 500,
    social_caption: 200,
    gbp_post: 300,
    blog_image: 200,
    hashtags: 100,
    humanize: 500,
    categorise: 100,
    sentiment: 100,
  };
  return limits[taskType] || 500;
}

// ─── Test all connections ─────────────────────────────────────────────────────
async function testAllModels() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — Model Router Test              ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Test Claude Haiku
  try {
    await callHaiku('Reply with exactly: "Haiku OK"', null, 20);
    console.log('✅ Claude Haiku    — connected');
  } catch (e) {
    console.log(`❌ Claude Haiku    — failed: ${e.message}`);
  }

  // Test Claude Sonnet
  try {
    await callSonnet('Reply with exactly: "Sonnet OK"', null, 20);
    console.log('✅ Claude Sonnet   — connected');
  } catch (e) {
    console.log(`❌ Claude Sonnet   — failed: ${e.message}`);
  }

  // Test Groq
  try {
    await callGroq('Reply with exactly: "Groq OK"', null, 20);
    console.log('✅ Groq Free       — connected');
  } catch (e) {
    console.log(`❌ Groq Free       — failed: ${e.message}`);
  }

  // Test Gemini
  try {
    await callGemini('Reply with exactly: "Gemini OK"', 20);
    console.log('✅ Gemini Free     — connected');
  } catch (e) {
    console.log(`❌ Gemini Free     — failed: ${e.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Cost per day estimate:');
  console.log('  Claude (Sonnet+Haiku) : ₹16/day');
  console.log('  Groq follow-ups       : ₹0/day (free)');
  console.log('  Gemini images         : ₹0/day (free)');
  console.log('  TOTAL                 : ~₹16/day');
  console.log('  $5 lasts              : ~26 days');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

module.exports = {
  route,
  callSonnet,
  callHaiku,
  callGroq,
  callGemini,
  testAllModels,
  TASK_ROUTES,
};