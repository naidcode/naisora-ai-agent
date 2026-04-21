// brain/leadSelector.js
// Naisora AI Growth OS — Lead Prioritization Engine
// Selects the TOP 50 highest-value leads each day to maximize conversion probability

const { supabase } = require('../config/database');

// ─── Premium areas in Bangalore (high-spend customers) ──────────────────────
const PREMIUM_AREAS = [
  'Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield', 'Jayanagar',
  'JP Nagar', 'MG Road', 'Lavelle Road', 'Church Street', 'Bandra'
];

// ─── Score a single lead (0–100) ─────────────────────────────────────────────
function scoreLead(lead) {
  let score = 0;

  // 1. Digital Presence Weakness (0-30 pts)
  // Higher points for lower seo_score (meaning poor design or visibility)
  const seoScore = lead.seo_score || lead.lead_score || 50;
  score += Math.round((100 - seoScore) * 0.3);

  // 2. High Value Niche (15 pts)
  const premiumNiches = ['fine dining', 'steakhouse', 'resort', 'boutique hotel', 'luxury', 'cafe'];
  const leadCat = (lead.category || '').toLowerCase();
  if (premiumNiches.some(n => leadCat.includes(n))) score += 15;

  // 3. No website = OUR PRIMARY TARGET (40 pts)
  if (!lead.has_website || lead.has_website === false) {
    score += 40;
  } else {
    // Redesign candidate (has site but likely old/poor)
    score += 10;
  }

  // 4. Premium area = higher budget likelihood (15 pts)
  const isPremium = PREMIUM_AREAS.some(a =>
    (lead.area || '').toLowerCase().includes(a.toLowerCase())
  );
  if (isPremium) score += 15;

  // 5. Instagram active but no website (15 pts)
  // These leads value presence but lack a storefront
  if ((lead.instagram_handle || lead.instagram_active) && !lead.has_website) score += 15;

  // 6. Contactability (5 pts)
  if (lead.phone) score += 5;

  return Math.min(100, score);
}

// ─── Fetch uncontacted leads and return top 50 ───────────────────────────────
async function selectBestLeads(limit = 50) {
  console.log('\n🎯 [LeadSelector] Selecting best leads for today...');

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .in('outreach_status', ['new', 'not_contacted'])
    .not('phone', 'is', null)
    .limit(300); // pull 300, score them, keep best 50

  if (error || !leads || leads.length === 0) {
    console.log('⚠️  No uncontacted leads found. Run scraper first.');
    return [];
  }

  const scored = leads
    .map(lead => ({ ...lead, computed_score: scoreLead(lead) }))
    .sort((a, b) => b.computed_score - a.computed_score)
    .slice(0, limit);

  console.log(`✅ [LeadSelector] Selected ${scored.length} high-value leads from ${leads.length} available`);
  console.log(`   Top lead: ${scored[0]?.business_name} (${scored[0]?.area}) — Score: ${scored[0]?.computed_score}`);

  return scored;
}

// ─── Select leads specifically for follow-up ─────────────────────────────────
async function selectLeadsForFollowUp() {
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .in('outreach_status', ['contacted', 'followup_1', 'followup_2'])
    .not('phone', 'is', null)
    .order('last_contacted_at', { ascending: true })
    .limit(30);

  return leads || [];
}

module.exports = { selectBestLeads, selectLeadsForFollowUp, scoreLead };
