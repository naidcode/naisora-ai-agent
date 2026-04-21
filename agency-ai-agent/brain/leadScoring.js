// brain/leadScoring.js
// Naisora AI Growth OS — Lead Scorer
// Automatically identifies high-value opportunities

/**
 * Scores a lead based on business value and conversion probability
 * @param {Object} lead - The lead object containing business and technical data
 * @param {Object} auditData - Optional SEO audit data
 */
function scoreLead(lead, auditData = null) {
  let score = 0;

  // 1. Technical Opportunity (SEO Gap) - Higher score for worse sites
  if (auditData) {
    if (auditData.overall_score < 40) score += 40;
    else if (auditData.overall_score < 60) score += 20;
  } else if (lead.has_website === false) {
    score += 30; // Massive opportunity if they have NO website
  }

  // 2. Market/Niche (Premium areas in Bangalore)
  const premiumAreas = ['Indiranagar', 'Koramangala', 'HSR Layout', 'Lavelle Road', 'MG Road'];
  if (lead.city === 'Bangalore' && premiumAreas.some(area => lead.area?.includes(area))) {
    score += 20;
  }

  // 3. Social Presence (Validation)
  if (lead.instagram_active) score += 15;
  if (lead.phone) score += 5; // Direct contact is better

  // 4. Intent Signaling
  if (lead.reply_intent === 'interested') score += 50; 
  if (lead.status === 'followup_1') score += 10;

  return Math.min(100, score);
}

module.exports = { scoreLead };
