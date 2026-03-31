// modules/seo/keywordResearch.js
// Naisora AI Agent — Keyword Research
// Finds best keywords for restaurant clients using free sources
// Sources: Google Autocomplete, Related searches, GSC data

require('dotenv').config();
const axios = require('axios');
const { route } = require('../../config/llmRouter');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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

  // Use Sonnet to analyse and prioritise keywords
  const prompt = `Analyse these keywords for a ${restaurant.category || 'restaurant'} called "${restaurant.name}" in ${restaurant.area}, Bangalore.

Keywords found:
${keywordList.join('\n')}

Select the top 10 most valuable keywords. For each provide:
1. The keyword
2. Search intent (informational/navigational/transactional)
3. Priority (high/medium/low)
4. Why it matters for this restaurant

Return as JSON array:
[{"keyword": "...", "intent": "...", "priority": "high", "reason": "..."}]

Return JSON only.`;

  try {
    const raw = await route('seo_audit', prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const keywords = JSON.parse(cleaned);

    // Save to Supabase
    if (restaurant.id) {
      await supabase.from('seo_reports').insert({
        lead_id: restaurant.id,
        report_type: 'keyword_research',
        report_data: { keywords, seeds, total_found: allKeywords.size },
        summary: `Found ${keywords.length} priority keywords for ${restaurant.name}`,
      });
    }

    console.log(`✅ Found ${keywords.length} priority keywords`);
    return keywords;
  } catch (err) {
    console.error('Keyword analysis failed:', err.message);
    return keywordList.slice(0, 10).map(k => ({ keyword: k, intent: 'informational', priority: 'medium', reason: 'Autocomplete suggestion' }));
  }
}

module.exports = { researchKeywords, getAutocomplete };