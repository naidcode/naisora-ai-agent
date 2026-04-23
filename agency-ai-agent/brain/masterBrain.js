// brain/masterBrain.js
// Naisora AI Growth OS — The Central Brain
// Respects the OptimizationEngine's strategic decision when available,
// then applies its own tactical decision on top of it

const { getStrategy } = require('./strategyEngine');
const { analyzePerformance } = require('./feedbackLoop');
const { supabase } = require('../config/database');

// ─── Check if OptimizationEngine has run recently ─────────────────────────────
async function getLatestOptimizationStrategy() {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('optimization_history')
    .select('strategy, timestamp')
    .gte('timestamp', fourHoursAgo)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  return data?.strategy || null;
}

// ─── Map OptimizationEngine strategy → AutoPilot action ──────────────────────
function mapOptStrategyToAction(optStrategy) {
  const mapping = {
    'FOCUS_HIGH_VALUE_CLIENTS':  'FOCUS_HIGH_VALUE_OUTREACH',
    'FOCUS_LEAD_GENERATION':     'GENERATE_LEADS',
    'FIX_OUTREACH':              'FIX_OUTREACH_MESSAGING',
    'FIX_CONTENT':               'SCALE_SERVICE_DELIVERY',
    'BOOST_CONTENT':             'SCALE_SERVICE_DELIVERY',
    'BALANCED_GROWTH':           null, // let own logic decide
  };
  return mapping[optStrategy] || null;
}

async function decideNextMove(state) {
  console.log('\n🧠 [MasterBrain] Processing system state...');

  // ── Priority: honour the OptimizationEngine if it ran recently ──
  const latestOptStrategy = await getLatestOptimizationStrategy();
  if (latestOptStrategy) {
    const mappedAction = mapOptStrategyToAction(latestOptStrategy);
    if (mappedAction) {
      console.log(`🎯 [MasterBrain] Deferring to OptimizationEngine: ${latestOptStrategy} → ${mappedAction}`);
      return mappedAction;
    }
    console.log(`⚖️  [MasterBrain] OptimizationEngine says BALANCED_GROWTH — running own logic`);
  }

  // ── Fallback: compute from current state ──
  const insights = analyzePerformance(state);
  const currentStrategy = getStrategy({
    revenue: state.revenue,
    activeClients: (state.clients || []).length,
    leadCount: (state.leads || []).length,
    outreachSuccessRate: insights.replyRate,
    avgLeadScore: calculateAvgLeadScore(state.leads || [])
  });

  console.log(`🎯 [Strategy] ${currentStrategy.strategy}: ${currentStrategy.focus}`);

  if ((state.leads || []).length < 10) return 'GENERATE_LEADS';
  if (state.revenue < 5000)           return 'URGENT_OUTREACH';
  if (insights.replyRate < 3)         return 'FIX_OUTREACH_MESSAGING';

  const highValueLeads = (state.leads || []).filter(l => (l.lead_score || l.score || 0) > 80 && l.status === 'new');
  if (highValueLeads.length > 0)      return 'FOCUS_HIGH_VALUE_OUTREACH';

  return 'SCALE_SERVICE_DELIVERY';
}

function calculateAvgLeadScore(leads) {
  if (!leads.length) return 0;
  const total = leads.reduce((sum, l) => sum + (l.lead_score || l.score || 0), 0);
  return total / leads.length;
}

module.exports = { decideNextMove };
