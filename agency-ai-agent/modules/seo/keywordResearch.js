// modules/seo/keywordResearch.js
// Naisora AI Agent — Keyword Research
// Finds best keywords for restaurant clients using free sources
// Sources: Google Autocomplete, Related searches, GSC data

require('dotenv').config();
const axios = require('axios');
const { route } = require('../../config/llmRouter');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ADVANCED_SEO_PROMPT = `
You are an advanced SEO keyword research strategist.

Your task is to find **high-ranking, low-competition, buyer-intent keywords** for blog content.

---

## INPUT YOU WILL RECEIVE:

* Business Type: {{businessType}}
* Target Location: {{targetLocation}}
* Niche: {{niche}}

---

## YOUR OBJECTIVE:

Find keywords that:

1. Can realistically rank on Google
2. Match strong search intent
3. Bring potential customers (not just traffic)

---

## STEP 1: FIND PRIMARY KEYWORDS

Generate 5–10 primary keywords that:

* Include location (if local SEO)
* Have commercial or problem-solving intent

Example:
* restaurant website design Bangalore
* restaurant SEO services Bangalore
* restaurant website cost Bangalore

---

## STEP 2: FIND LONG-TAIL KEYWORDS (VERY IMPORTANT)

Generate 15–25 long-tail keywords:

Types to include:
* “how to…” keywords
* “best…” keywords
* “cost…” keywords
* “near me…” keywords
* “vs…” comparison keywords

Example:
* how to create restaurant website in Bangalore
* best restaurant website designers in Bangalore
* Zomato vs own website for restaurants
* restaurant website cost in Bangalore 2026

---

## STEP 3: ANALYZE SEARCH INTENT

For each keyword, label:
* Informational
* Commercial
* Transactional

---

## STEP 4: KEYWORD DIFFICULTY FILTER

Select only keywords that:
* Have low to medium competition
* Are not dominated by huge brands

---

## STEP 5: CLUSTER KEYWORDS

Group keywords into topics:

Example:
Cluster 1: Restaurant Website
Cluster 2: Restaurant SEO
Cluster 3: Cost & Pricing
Cluster 4: Comparisons (Zomato vs Website)

---

## STEP 6: COMPETITOR GAP ANALYSIS

* Analyze top 5 Google results for each keyword
* Identify:
  * What they are missing
  * Weak sections
  * Content gaps

---

## STEP 7: FINAL OUTPUT FORMAT

Return:
1. Primary Keywords
2. Long-tail Keywords
3. Keyword Clusters
4. Search Intent for each
5. Top 3 easiest keywords to rank
6. Blog topic suggestions based on clusters

---

## IMPORTANT RULES:

* DO NOT give generic keywords
* DO NOT give high-competition keywords only
* Focus on ranking opportunity + buyer intent
* Prioritize keywords that can bring clients

---

## FINAL CHECK:

Ask yourself:
* Can a new website rank for this keyword?
* Does this keyword bring business, not just traffic?

If not → remove it.

---

Now begin keyword research.
`;

// ─── Google Autocomplete (free, no key needed) ────────────────────────────────
async function getAutocomplete(seed) {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(seed)}&hl=en-IN`;
    const response = await axios.get(url, { timeout: 5000 });
    return response.data[1] || [];
  } catch (err) {
    return [];
  }
}

// ─── Generate keyword ideas for a restaurant ─────────────────────────────────
async function researchKeywords(restaurant) {
  console.log(`\n🔍 Researching keywords for ${restaurant.name}...`);

  const seeds = [
    `${restaurant.category || 'restaurant'} in ${restaurant.area} Bangalore`,
    `best ${restaurant.category || 'restaurant'} ${restaurant.area}`,
    `${restaurant.name}`,
    `food delivery ${restaurant.area} Bangalore`,
    `${restaurant.category || 'restaurant'} near me Bangalore`,
  ];

  const allKeywords = new Set();

  for (const seed of seeds) {
    const suggestions = await getAutocomplete(seed);
    suggestions.forEach(s => allKeywords.add(s));
    await new Promise(r => setTimeout(r, 500));
  }

  const keywordList = [...allKeywords].slice(0, 30);

  // Use the advanced strategist prompt
  // We append a JSON instruction to the end to make it machine-readable
  const machinePrompt = ADVANCED_SEO_PROMPT
    .replace('{{businessType}}', restaurant.category || 'Restaurant')
    .replace('{{targetLocation}}', restaurant.area || 'Bangalore')
    .replace('{{niche}}', restaurant.category || 'Restaurants, cafes, cloud kitchens') +
    `\n\n--- ADDITIONAL INPUT ---\nAutocomplete suggestions found: ${keywordList.join(', ')}\n\n` +
    `IMPORTANT: Return your entire response as a valid JSON object with two keys:\n` +
    `1. "full_report": (Your complete 7-step analysis in Markdown format)\n` +
    `2. "extracted_keywords": (A simple JSON array of the top 15 keywords found: ["keyword1", "keyword2", ...])\n\n` +
    `Return JSON only.`;

  try {
    const raw = await route('seo_audit', machinePrompt, null, 3000);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    
    // Save to Supabase
    if (restaurant.id) {
      await supabase.from('seo_reports').insert({
        lead_id: restaurant.id,
        report_type: 'keyword_research_advanced',
        report_data: { 
          report: result.full_report, 
          keywords: result.extracted_keywords,
          seeds, 
          total_found: allKeywords.size 
        },
        summary: `Advanced keyword research completed for ${restaurant.name}`,
      });
    }

    console.log(`✅ Advanced keyword research complete — Found ${result.extracted_keywords.length} keywords`);
    
    // Return the array for backwards compatibility
    const keywordsArray = result.extracted_keywords.map(k => ({
      keyword: k,
      intent: 'transactional', // default for advanced keywords
      priority: 'high'
    }));
    
    // Attach the full report to the array as a property just in case
    keywordsArray.fullReport = result.full_report;
    
    return keywordsArray;
  } catch (err) {
    console.error('Advanced Keyword analysis failed:', err.message);
    return keywordList.slice(0, 10).map(k => ({ keyword: k, intent: 'informational', priority: 'medium', reason: 'Autocomplete suggestion' }));
  }
}

// ─── Advanced Research using the new strategist prompt ────────────────────────
async function performAdvancedResearch(businessType, location, niche) {
  console.log(`\n🚀 Performing Advanced SEO Keyword Research for ${businessType} in ${location}...`);

  const prompt = ADVANCED_SEO_PROMPT
    .replace('{{businessType}}', businessType)
    .replace('{{targetLocation}}', location)
    .replace('{{niche}}', niche);

  try {
    const response = await route('seo_audit', prompt, null, 3000);
    console.log(`✅ Advanced research complete.`);
    return response;
  } catch (err) {
    console.error('Advanced research failed:', err.message);
    return null;
  }
}

module.exports = { researchKeywords, getAutocomplete, performAdvancedResearch };