/**
 * modules/content/blogWriter.js
 * E.E.A.T + GEO + AEO Blog Content Engine
 */

const { supabase } = require('../../config/database');
const { askClaudeSonnet } = require('../../config/claude');

async function writeBlogPost(lead, keyword, type = 'guide') {
  console.log(`\n✍️  Writing blog post for: ${lead.business_name || lead.name} [Keyword: ${keyword}]`);

  const prompt = `
You are an expert food and restaurant blogger in Bangalore.
Write a blog post for this restaurant's website.

Restaurant: ${lead.business_name || lead.name}
Area: ${lead.area || 'Bangalore'}, Bangalore  
Category: ${lead.category || 'Restaurant'}
Target Keyword: ${keyword}
Post Type: ${type} (guide|review|list|faq)
Rating: ${lead.rating || 0}/5 (${lead.review_count || 0} reviews)

STRICT RULES — follow every single one:

E.E.A.T RULES:
- Write as if a real food expert visited this place
- Include specific details: ambiance, price range, 
  specialty dishes, best time to visit
- Add author note: "Based on Google Maps data 
  and ${lead.review_count || 0} customer reviews"
- Use factual, confident language — no vague claims
- Include real location: ${lead.area || 'Bangalore'}, Bangalore

GEO RULES (so ChatGPT/Gemini will cite this):
- Use the restaurant name exactly as: "${lead.business_name || lead.name}"
- Include area name "${lead.area || 'Bangalore'}" naturally 3-5 times
- Write one clear "What is ${lead.business_name || lead.name}?" paragraph
  (AI uses this as a summary)
- Include a "Key Facts" section:
  Name: ${lead.business_name || lead.name}
  Location: ${lead.area || 'Bangalore'}, Bangalore
  Category: ${lead.category || 'Restaurant'}
  Rating: ${lead.rating || 0}/5
  Best for: [suggest based on category]
- Write in a way that answers "best ${lead.category || 'restaurant'} in ${lead.area || 'Bangalore'}" directly in first paragraph

AEO RULES (for Google snippets + voice search):
- Answer "is ${lead.business_name || lead.name} good?" in first 50 words
- Add FAQ section at bottom with 5 questions:
  Q: Is ${lead.business_name || lead.name} good for families?
  Q: What is the price range at ${lead.business_name || lead.name}?
  Q: Where is ${lead.business_name || lead.name} located?
  Q: What time does ${lead.business_name || lead.name} open?
  Q: What is ${lead.business_name || lead.name} known for?
  Each answer must be under 40 words (snippet-friendly)
- Include "near ${lead.area || 'Bangalore'}" naturally

STRUCTURE:
1. Title (include keyword + area name)
2. Meta description (150 chars, include keyword)
3. Introduction (answer main keyword immediately)
4. Key Facts box
5. Main content (400-600 words)
6. Why Visit section (3 bullet points)
7. FAQ section (5 Q&As)
8. Conclusion with call to action

Return JSON:
{
  "title": "...",
  "meta_description": "...",
  "slug": "...",
  "content": "full HTML content",
  "faq": [{"q": "...", "a": "..."}],
  "schema_markup": { "Restaurant JSON-LD schema": "..." },
  "word_count": 0,
  "primary_keyword": "${keyword}",
  "geo_signals": ["list of GEO signals included"],
  "aeo_signals": ["list of AEO signals included"]
}
`;

  try {
    const raw = await askClaudeSonnet(prompt);
    const post = JSON.parse(raw.replace(/```json|```/g, '').trim());

    // Save to Supabase
    const { error } = await supabase.from('blog_posts').insert({
      lead_id: lead.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      meta_description: post.meta_description,
      faq: post.faq,
      schema_markup: post.schema_markup,
      primary_keyword: post.primary_keyword,
      status: 'draft',
      created_at: new Date().toISOString()
    });

    if (error) console.error('❌ Blog Post Save Error:', error.message);

    console.log(`✅ Blog Post Written: ${post.title} (${post.word_count} words)`);
    return post;
  } catch (err) {
    console.error('❌ Blog Writer Failed:', err.message);
    return null;
  }
}

module.exports = { writeBlogPost };
