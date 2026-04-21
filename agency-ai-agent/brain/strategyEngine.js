// brain/strategyEngine.js
// Naisora AI Growth OS — Strategy Optimizer
// Decides the macro-strategy for the business

function getStrategy(metrics) {
  const { 
    revenue, 
    activeClients, 
    leadCount, 
    outreachSuccessRate, 
    avgLeadScore 
  } = metrics;

  // Decision Tree for Growth
  if (revenue < 100000 && activeClients < 3) {
    return {
      strategy: 'SURVIVAL_AND_VALIDATION',
      focus: 'HIGH_VOLUME_OUTREACH',
      action: 'Target warm leads with high intensity'
    };
  }

  if (leadCount < 20) {
    return {
      strategy: 'EXPAND_PIPELINE',
      focus: 'DATA_ACQUISITION',
      action: 'Run aggressive Google Maps scrapes'
    };
  }

  if (outreachSuccessRate < 5) {
    return {
      strategy: 'OPTIMIZE_CONVERSION',
      focus: 'A/B_TEST_MESSAGING',
      action: 'Analyse replies and rewrite outreach templates'
    };
  }

  if (avgLeadScore > 80 && revenue > 50000) {
    return {
      strategy: 'HIGH_TICKET_CLOSING',
      focus: 'PERSONALISED_AUDITS',
      action: 'Manually review high-value leads and send custom video audits'
    };
  }

  return {
    strategy: 'AGGRESSIVE_GROWTH',
    focus: 'SCALING_EVERYTHING',
    action: 'Run 24/7 autonomous loops'
  };
}

module.exports = { getStrategy };
