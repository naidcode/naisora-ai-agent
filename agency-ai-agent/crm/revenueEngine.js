// crm/revenueEngine.js
// Naisora AI Growth OS — Revenue Optimizer
// Ensures the system stays focused on making money

const masterDB = require('../data/masterDB');

async function recordSale(lead, amount, service) {
  console.log(`💰 [Revenue] New Sale! ${lead.business_name} — ₹${amount} for ${service}`);
  
  // Track in DB
  await masterDB.trackRevenue(lead.id, amount, service);
  
  // Trigger revenue alerts
  return { success: true, message: 'Revenue tracked' };
}

function evaluateRevenueHealth(revenueData) {
  const montlyTarget = 500000; // 5 Lakhs INR
  const currentRevenue = revenueData; 
  
  if (currentRevenue < montlyTarget * 0.2) {
    return 'CRITICAL_REVENUE_LOW';
  }
  
  return 'HEALTHY';
}

module.exports = { recordSale, evaluateRevenueHealth };
