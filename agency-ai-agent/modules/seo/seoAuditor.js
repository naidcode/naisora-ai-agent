/**
 * modules/seo/seoAuditor.js
 * E.E.A.T, GEO, and AEO Scoring System
 */

async function scoreEEAT(lead) {
  const experience = scoreExperience(lead);
  const expertise = scoreExpertise(lead);
  const authority = scoreAuthority(lead);
  const trust = scoreTrust(lead);

  const score = Math.round(
    experience * 0.25 +
    expertise * 0.25 +
    authority * 0.30 +
    trust * 0.20
  );

  return {
    score,
    breakdown: { experience, expertise, authority, trust },
    issues: getEEATIssues(lead, score)
  };
}

function scoreExperience(lead) {
  let s = 0;
  // Real business signals
  if (lead.review_count > 100) s += 30;
  else if (lead.review_count > 20) s += 15;
  
  if (lead.rating >= 4.5) s += 30;
  else if (lead.rating >= 4.0) s += 20;
  
  if (lead.instagram_handle) s += 20;
  if (lead.has_website) s += 20;
  
  return Math.min(s, 100);
}

function scoreExpertise(lead) {
  let s = 0;
  // Category clarity signals
  if (lead.category) s += 25;
  if (lead.has_website) s += 35; // can have menu/blog
  if (lead.gbp_verified) s += 25;
  if (lead.review_count > 50) s += 15;
  
  return Math.min(s, 100);
}

function scoreAuthority(lead) {
  let s = 0;
  if (lead.review_count > 1000) s += 50;
  else if (lead.review_count > 500) s += 40;
  else if (lead.review_count > 100) s += 25;
  else if (lead.review_count > 20) s += 10;
  
  if (lead.rating >= 4.5) s += 25;
  else if (lead.rating >= 4.0) s += 15;
  
  if (lead.gbp_verified) s += 15;
  if (lead.instagram_handle) s += 10;
  
  return Math.min(s, 100);
}

function scoreTrust(lead) {
  let s = 0;
  if (lead.gbp_verified) s += 30;
  if (lead.phone) s += 20;
  if (lead.address) s += 20;
  if (lead.has_website) s += 20;
  // HTTPS check
  if (lead.website?.startsWith('https')) s += 10;
  
  return Math.min(s, 100);
}

function getEEATIssues(lead, score) {
  const issues = [];
  if (!lead.gbp_verified) issues.push('Google Business Profile not verified');
  if (lead.review_count < 50) issues.push('Low social proof (under 50 reviews)');
  if (!lead.has_website) issues.push('Missing official website for expertise signals');
  if (lead.rating < 4.0) issues.push('Average rating below 4.0');
  if (!lead.instagram_handle) issues.push('No linked Instagram for brand experience');
  return issues;
}

/**
 * GEO SCORING — AI VISIBILITY
 */
async function scoreGEO(lead) {
  let score = 0;
  const issues = [];
  const signals = [];

  // Signal 1: Consistent brand name across web
  if (lead.has_website) {
    score += 25;
    signals.push('Has website — AI can crawl');
  } else {
    issues.push('No website — AI has nothing to reference');
  }

  // Signal 2: Review volume = training data presence
  if (lead.review_count > 1000) {
    score += 30;
    signals.push('1000+ reviews — likely in AI training data');
  } else if (lead.review_count > 500) {
    score += 22;
  } else if (lead.review_count > 100) {
    score += 12;
    issues.push('Low reviews — AI may not know this place');
  } else {
    score += 3;
    issues.push('Very few reviews — invisible to AI');
  }

  // Signal 3: Social presence
  if (lead.instagram_handle) {
    score += 20;
    signals.push('Instagram found — social signals for AI');
  } else {
    issues.push('No Instagram — missing social footprint');
  }

  // Signal 4: GBP verification
  if (lead.gbp_verified) {
    score += 15;
    signals.push('GBP verified — trusted by Google');
  } else {
    issues.push('GBP unverified — Google does not trust listing');
  }

  // Signal 5: Structured data potential
  if (lead.has_website) {
    score += 10;
    signals.push('Website can have Schema markup for AI');
  }

  return {
    score: Math.min(score, 100),
    signals,
    issues,
    recommendation: score < 40 
      ? 'CRITICAL: This business is invisible to AI search'
      : score < 70 
      ? 'Needs GEO upgrade to appear in AI recommendations'
      : 'Good GEO foundation — optimize further'
  };
}

/**
 * AEO SCORING — VOICE + SNIPPETS
 */
async function scoreAEO(lead) {
  let score = 0;
  const issues = [];

  // Voice search needs:
  if (lead.gbp_verified) {
    score += 30; // GBP = primary voice search source
  } else {
    issues.push('GBP not verified — voice search ignores this');
  }

  if (lead.phone) {
    score += 15; // click-to-call from voice
  } else {
    issues.push('No phone — voice search cannot connect users');
  }

  if (lead.address) {
    score += 20; // "near me" queries need address
  } else {
    issues.push('No address — near me searches will miss this');
  }

  if (lead.rating >= 4.0) {
    score += 15; // quality filter for snippets
  } else {
    issues.push('Rating below 4.0 — filtered out of snippets');
  }

  if (lead.has_website) {
    score += 20; // FAQ schema / structured data possible
  } else {
    issues.push('No website — cannot add FAQ/Schema markup');
  }

  return {
    score: Math.min(score, 100),
    issues,
    voiceReady: score >= 70,
    snippetReady: !!(lead.has_website && lead.gbp_verified)
  };
}

module.exports = {
  scoreEEAT,
  scoreGEO,
  scoreAEO
};
