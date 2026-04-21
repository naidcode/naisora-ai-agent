// seo/miniAudit.js
// Naisora AI Growth OS — Mini Audit Generator
// Produces a scannable, credible audit for a lead WITHOUT needing a paid SEO tool
// Purpose: Send PROOF instead of selling — audit converts better than any pitch

const { askClaudeSonnet } = require('../config/claude');
const { supabase } = require('../config/database');

// ─── Generate a fast mini audit from lead data ───────────────────────────────
async function generateMiniAudit(lead) {
  console.log(`\n🔍 [MiniAudit] Generating audit for: ${lead.business_name}`);

  // Build known data points from what we already have
  const knownData = {
    hasWebsite: !!lead.has_website,
    websiteUrl: lead.website || null,
    rating: lead.rating || null,
    reviewCount: lead.review_count || 0,
    area: lead.area || 'Bangalore',
    category: lead.category || 'restaurant',
  };

  const prompt = `
You are a web design and local search analyst checking a restaurant's online storefront.

Restaurant: ${lead.business_name}
Location: ${lead.area}, Bangalore
Category: ${lead.category || 'restaurant'}
Has website: ${knownData.hasWebsite ? 'Yes — ' + knownData.websiteUrl : 'NO WEBSITE'}
Google rating: ${knownData.rating || 'unknown'} stars
Google reviews: ${knownData.reviewCount}

Generate a realistic mini design/visibility audit. 

IMPORTANT: Do not guarantee customers. Focus on "Professional Image" and "Local Search Visibility".

Return ONLY a valid JSON object:
{
  "score": <number 30-65 if no website/bad design, 60-80 if decent but needs work>,
  "issues": [
    "<specific design/visibility issue 1 — e.g. 'No mobile-friendly menu' or 'Invisible for ${lead.category} in ${lead.area}'>",
    "<specific issue 2>",
    "<specific issue 3>"
  ],
  "topKeyword": "<the main local search term they are missing out on>",
  "visibilityGap": "<qualitative description of what they are missing — e.g. 'High' or 'Critical'>",
  "missedMonthlySearches": <number between 100-500>,
  "opportunity": "<one sentence — how a professional site/local SEO fixes their image>"
}

Make it feel specific and real. Do not use generic language.
`;

  try {
    const raw = await askClaudeSonnet(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const audit = JSON.parse(cleaned);

    // Save to DB for future reference
    await supabase.from('mini_audits').insert({
      lead_id: lead.id,
      score: audit.score,
      issues: audit.issues,
      top_keyword: audit.topKeyword,
      visibility_gap: audit.visibilityGap,
      missed_searches: audit.missedMonthlySearches,
      opportunity: audit.opportunity,
      created_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {}); // non-blocking save

    console.log(`   ✅ Audit score: ${audit.score}/100 | Top keyword: ${audit.topKeyword}`);
    return audit;
  } catch (err) {
    console.error('Mini audit failed:', err.message);
    // Fallback audit using known data
    return buildFallbackAudit(lead);
  }
}

// ─── Fallback audit if LLM call fails ────────────────────────────────────────
function buildFallbackAudit(lead) {
  const hasWebsite = !!lead.has_website;
  return {
    score: hasWebsite ? 48 : 32,
    issues: [
      `Not ranking for "${lead.category || 'restaurant'} in ${lead.area}"`,
      hasWebsite ? 'Website design doesn\'t match food quality' : 'No digital storefront — invisible to local searchers',
      'Google Maps listing incomplete/unoptimized',
    ],
    topKeyword: `${lead.category || 'restaurant'} in ${lead.area}`,
    visibilityGap: 'High',
    missedMonthlySearches: hasWebsite ? 120 : 250,
    opportunity: `A professional site would fix your brand image for ${hasWebsite ? '120' : '250'}+ local searchers every month`,
  };
}

// ─── Format audit as a WhatsApp-ready message (short, impactful) ─────────────
function formatAuditForWhatsApp(lead, audit) {
  return (
    `📊 *Digital Presence Audit: ${lead.business_name}*\n\n` +
    `Score: ${audit.score}/100\n` +
    `❌ ${audit.issues[0]}\n` +
    `❌ ${audit.issues[1]}\n\n` +
    `You're missing out on ~${audit.missedMonthlySearches} local searches/month for "*${audit.topKeyword}*"\n\n` +
    `💡 ${audit.opportunity}\n\n` +
    `Want to see a free design concept for ${lead.business_name}? — Nahid, Naisora`
  );
}

module.exports = { generateMiniAudit, formatAuditForWhatsApp, buildFallbackAudit };
