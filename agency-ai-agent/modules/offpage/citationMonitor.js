// modules/offpage/citationMonitor.js
// Monitors NAP consistency across directories

const { route } = require('../../config/llmRouter');

async function checkNapConsistency(restaurant, citations) {
  // In production this would crawl each directory listing
  // For now generates a checklist
  const issues = [];

  if (!restaurant.phone) issues.push('Phone number missing from profile');
  if (!restaurant.address) issues.push('Full address not recorded');
  if (!restaurant.website) issues.push('No website to list');

  return { issues, napData: { name: restaurant.name, phone: restaurant.phone, address: restaurant.address } };
}

module.exports = { checkNapConsistency };