// brain/feedbackLoop.js
// Naisora AI Growth OS — Feedback & Learning
// Measures what works and optimizes for revenue and growth

function analyzePerformance(state) {
  const replyRate = calculateReplyRate(state.outreach, state.leads);
  const bestTemplates = findTopPerformingTemplates(state.outreach);
  const revenueGrowth = calculateRevenueGrowth(state.invoices);

  return {
    replyRate,
    bestTemplates,
    revenueGrowth,
    isHealthy: replyRate > 5 && revenueGrowth >= 0,
    priorityFixes: identifyBurnPoints(state)
  };
}

function calculateReplyRate(outreachLogs, leads) {
  if (!outreachLogs.length) return 0;
  const replies = leads.filter(l => l.reply_content).length;
  return (replies / outreachLogs.length) * 100;
}

function calculateRevenueGrowth(invoices) {
  // Simplified growth check
  return 0; // Would compare historical data in production
}

function findTopPerformingTemplates(logs) {
  return []; // Logic to cluster subject lines and reply rates
}

function identifyBurnPoints(state) {
  const points = [];
  if (state.invoices.filter(i => i.status === 'overdue').length > 0) {
    points.push('OVERDUE_INVOICES');
  }
  return points;
}

module.exports = { analyzePerformance };
