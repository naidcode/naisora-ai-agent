const { hash } = require('../database/database');

/**
 * Normalize phone numbers to a consistent format
 */
function normalizePhone(phone) {
  if (!phone) return null;
  // Remove all non-numeric characters except +
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Normalize lead data for comparison
 */
function normalizeLead(lead) {
  return {
    name: (lead.name || "").toLowerCase().trim(),
    phone: normalizePhone(lead.phone),
    email: (lead.email || "").toLowerCase().trim()
  };
}

/**
 * Generate a unique ID for a lead based on normalized data
 */
function generateLeadId(lead) {
  const normalized = normalizeLead(lead);
  return hash(
    normalized.name +
    (normalized.phone || "") +
    (normalized.email || "")
  );
}

/**
 * Score a lead based on available data
 */
function scoreLead(lead) {
  let score = 0;

  if (lead.website || lead.hasWebsite) score += 2;
  if (lead.rating > 4) score += 2;
  if (lead.phone) score += 3;
  if (lead.email) score += 3;
  if (lead.reviewCount > 50) score += 1;

  return score;
}

/**
 * Check if a lead can be contacted based on cooldown
 * @param {Object} lead 
 * @returns {Promise<boolean>}
 */
async function canContact(lead) {
  if (lead.do_not_engage) {
    console.log(`🚫 Blocked: Lead ${lead.name} is marked as do_not_engage.`);
    return false;
  }

  if (lead.contacted === true) {
    if (!lead.lastContactedAt) return true;
    
    const lastDate = new Date(lead.lastContactedAt);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 14) {
      console.log(`⏳ Cooldown: Lead ${lead.name} contacted ${diffDays} days ago. Wait for 14 days.`);
      return false;
    }
  }
  return true;
}

module.exports = {
  generateLeadId,
  normalizeLead,
  normalizePhone,
  scoreLead,
  canContact
};
