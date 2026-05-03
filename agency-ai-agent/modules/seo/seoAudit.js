/**
 * modules/seo/seoAudit.js
 * Master SEO Audit Engine
 */

const { supabase } = require('../../config/database');
const { askClaude } = require('../../config/claude');
const { scoreEEAT, scoreGEO, scoreAEO } = require('./seoAuditor');
const { runTechnicalAudit } = require('./technicalAudit');
const { runOnPageAudit } = require('./onPageAudit');
const { fullAudit } = require('./pagespeedAudit');
const { sendAuditReport } = require('../../config/telegramReporter');

/**
 * Main Master Audit Entry Point
 */
async function runFullAudit(lead) {
  console.log(`\n🚀 Starting Master SEO Audit for: ${lead.business_name || lead.name}`);
  
  const url = lead.website || '';
  
  // 1. Run all sub-audits in parallel
  const [eeat, geo, aeo, technical, onPage, speed] = await Promise.all([
    scoreEEAT(lead),
    scoreGEO(lead),
    scoreAEO(lead),
    url ? runTechnicalAudit(url) : Promise.resolve({ score: 0, issues: ['No website found'] }),
    url ? runOnPageAudit(url) : Promise.resolve({ score: 0, issues: ['No website found'] }),
    url ? fullAudit(url) : Promise.resolve({ summary: { mobileScore: 0 }, mobile: { issues: [] } })
  ]);

  // 2. Map speed audit to consistent format
  const speedResult = {
    score: speed?.summary?.mobileScore || 0,
    issues: speed?.mobile?.issues?.map(i => i.message) || []
  };

  // 3. Calculate master score (weighted)
  const total = Math.round(
    eeat.score * 0.25 +
    geo.score * 0.20 +
    aeo.score * 0.20 +
    technical.score * 0.15 +
    onPage.score * 0.10 +
    speedResult.score * 0.10
  );

  const grade = 
    total >= 80 ? 'A' :
    total >= 60 ? 'B' :
    total >= 40 ? 'C' : 'D';

  const priority =
    total < 40 ? 'HOT_LEAD' :
    total < 60 ? 'WARM_LEAD' : 'COLD_LEAD';

  const auditData = {
    lead_id: lead.id,
    restaurant: lead.business_name || lead.name,
    area: lead.area || 'Bangalore',
    total_score: total,
    grade,
    priority,
    breakdown: { 
      eeat: { score: eeat.score }, 
      geo: { score: geo.score }, 
      aeo: { score: aeo.score }, 
      technical: { score: technical.score }, 
      onPage: { score: onPage.score }, 
      speed: { score: speedResult.score } 
    },
    issues: collectAllIssues(eeat, geo, aeo, technical, onPage, speedResult),
    opportunities: collectOpportunities(total, lead),
    pitch: await generateSalesPitch(lead, total, grade),
    keywords: await suggestKeywords(lead),
    audited_at: new Date().toISOString()
  };

  // 4. Save to Supabase
  const { error } = await supabase.from('seo_audits').upsert(auditData);
  if (error) console.error('❌ Supabase Save Error:', error.message);

  // 5. Update lead category if needed
  await supabase.from('leads').update({
    lead_category: priority === 'HOT_LEAD' ? 'hot' : priority === 'WARM_LEAD' ? 'warm' : 'cold',
    audit_score: total
  }).eq('id', lead.id);

  console.log(`✅ Master Audit Complete. Score: ${total}/100 [Grade ${grade}]`);
  
  return auditData;
}

/**
 * Helpers
 */

function collectAllIssues(eeat, geo, aeo, technical, onPage, speed) {
  const all = [
    ...(eeat.issues || []),
    ...(geo.issues || []),
    ...(aeo.issues || []),
    ...(technical.issues?.map(i => i.issue || i) || []),
    ...(onPage.issues?.map(i => i.issue || i) || []),
    ...(speed.issues || [])
  ];
  return [...new Set(all)]; // unique only
}

function collectOpportunities(score, lead) {
  const ops = [];
  if (score < 50) ops.push('Complete website redesign for conversion');
  if (!lead.gbp_verified) ops.push('GBP verification & optimization');
  if (!lead.instagram_handle) ops.push('Social brand building');
  if (score > 50 && score < 80) ops.push('Content strategy & backlink building');
  return ops;
}

async function generateSalesPitch(lead, score, grade) {
  const prompt = `Write a short, high-impact sales pitch for a restaurant owner.
Restaurant: ${lead.business_name || lead.name}
SEO Score: ${score}/100
Grade: ${grade}

Rules:
- 2 sentences max.
- Focus on lost revenue and customers.
- End with: "I can fix this. Guaranteed."`;

  try {
    return await askClaude(prompt);
  } catch {
    return `Your restaurant scores ${score}/100 on Google. You are losing customers to competitors every day. I can fix this. Guaranteed.`;
  }
}

async function suggestKeywords(lead) {
  // Simple suggestion for the master report
  return [
    `best ${lead.category || 'restaurant'} in ${lead.area || 'Bangalore'}`,
    `${lead.category || 'restaurant'} near me`,
    `top rated ${lead.category || 'restaurant'} ${lead.area || 'Bangalore'}`
  ];
}

module.exports = { runFullAudit };