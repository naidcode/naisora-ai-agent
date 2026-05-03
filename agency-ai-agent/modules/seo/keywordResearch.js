/**
 * modules/seo/keywordResearch.js
 * 4-Layer Keyword Strategy Engine
 */

const { supabase } = require('../../config/database');
const { askClaudeSonnet } = require('../../config/claude');

async function researchKeywords(lead) {
  console.log(`\n🔍 Researching 4-layer keyword strategy for: ${lead.business_name || lead.name}`);

  const prompt = `
You are a senior local SEO expert in India.
Research keywords for this business:

Restaurant: ${lead.business_name || lead.name}
Area: ${lead.area || 'Bangalore'}, Bangalore
Category: ${lead.category || 'Restaurant'}
Rating: ${lead.rating || 0} (${lead.review_count || 0} reviews)
Has Website: ${lead.has_website || false}

Generate a 4-layer keyword strategy:

LAYER 1 — PRIMARY (high intent, local):
  "best ${lead.category || 'restaurant'} in ${lead.area || 'Bangalore'}"
  "top restaurants in ${lead.area || 'Bangalore'} Bangalore"
  Generate 5 like these.

LAYER 2 — LONG TAIL (easy to rank):
  "where to eat ${lead.category || 'restaurant'} near ${lead.area || 'Bangalore'}"
  "affordable lunch near ${lead.area || 'Bangalore'} Bangalore"
  Generate 8 like these.

LAYER 3 — GEO KEYWORDS (AI search):
  Questions ChatGPT would answer:
  "which is the best ${lead.category || 'restaurant'} for families in ${lead.area || 'Bangalore'}?"
  Generate 5 question-format keywords.

LAYER 4 — AEO KEYWORDS (voice search):
  "Hey Google, best ${lead.category || 'restaurant'} near ${lead.area || 'Bangalore'}"
  Conversational format. Generate 5.

For each keyword return:
{
  "keyword": string,
  "layer": 1|2|3|4,
  "intent": "informational|navigational|transactional",
  "difficulty": "easy|medium|hard",
  "priority": "high|medium|low",
  "content_type": "blog|landing_page|gbp_post|meta_tag|faq"
}

Return JSON array only. No explanation.
`;

  try {
    const raw = await askClaudeSonnet(prompt);
    const keywords = JSON.parse(raw.replace(/```json|```/g, '').trim());
    
    // Save to Supabase
    const { error } = await supabase.from('keyword_research').upsert({
      lead_id: lead.id,
      keywords,
      researched_at: new Date().toISOString()
    });
    
    if (error) console.error('❌ Keyword Save Error:', error.message);

    console.log(`✅ Keyword Research Complete: ${keywords.length} keywords found.`);
    return keywords;
  } catch (err) {
    console.error('❌ Keyword Research Failed:', err.message);
    return [];
  }
}

module.exports = { researchKeywords };