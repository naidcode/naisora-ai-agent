// brain/abTesting.js
// Naisora AI Growth OS — Outreach A/B Testing Engine
// Tests message variants, measures reply rates, selects and applies the winner

const { supabase } = require('../config/database');
const { sendMessage } = require('../config/telegram');

// ─── Assign a variant deterministically from lead ID ─────────────────────────
function assignVariant(leadId) {
  // Use last char of UUID converted to int for even distribution
  const lastChar = leadId.replace(/-/g, '').slice(-1);
  return parseInt(lastChar, 16) % 2 === 0 ? 'A' : 'B';
}

// ─── Fetch the A/B split from outreach_log ────────────────────────────────────
async function fetchVariantData() {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(); // last 14 days

  const { data, error } = await supabase
    .from('outreach_log')
    .select('variant, replied')
    .not('variant', 'is', null)
    .gte('sent_at', since);

  if (error || !data || data.length === 0) {
    console.log('⚠️  [A/B] Not enough variant data yet.');
    return null;
  }

  return data;
}

// ─── Analyze reply rates per variant ─────────────────────────────────────────
function analyzeVariantResults(data) {
  const results = {
    A: { sent: 0, replies: 0, replyRate: 0 },
    B: { sent: 0, replies: 0, replyRate: 0 },
  };

  data.forEach(log => {
    const v = log.variant;
    if (!results[v]) return;
    results[v].sent++;
    if (log.replied) results[v].replies++;
  });

  // Calculate rates
  for (const v of ['A', 'B']) {
    results[v].replyRate = results[v].sent > 0
      ? (results[v].replies / results[v].sent * 100).toFixed(2)
      : '0.00';
  }

  return results;
}

// ─── Select winner based on reply rate ────────────────────────────────────────
function selectWinner(results) {
  const rateA = parseFloat(results.A.replyRate);
  const rateB = parseFloat(results.B.replyRate);

  // Require at least 10 sends per variant for statistical confidence
  if (results.A.sent < 10 || results.B.sent < 10) {
    console.log('⚠️  [A/B] Not enough data for a confident winner — need 10 sends each.');
    return null;
  }

  const winner = rateA >= rateB ? 'A' : 'B';
  const margin = Math.abs(rateA - rateB).toFixed(2);
  console.log(`🏆 [A/B] Winner: Variant ${winner} (${margin}% better reply rate)`);
  return winner;
}

// ─── Persist the winning variant to system_config ────────────────────────────
async function setActiveOutreachStrategy(winner) {
  const { error } = await supabase
    .from('system_config')
    .upsert({ key: 'active_outreach_variant', value: winner, updated_at: new Date().toISOString() });

  if (error) {
    console.error('Failed to save winning variant:', error.message);
    return false;
  }

  console.log(`✅ [A/B] Variant ${winner} set as active outreach strategy.`);
  return true;
}

// ─── Fetch the current active variant for the outreach module ─────────────────
async function getActiveVariant() {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'active_outreach_variant')
    .single();

  return data?.value || 'A'; // default to A if no winner yet
}

// ─── Master function: run full A/B cycle ─────────────────────────────────────
async function runABTestCycle() {
  console.log('\n🔬 [A/B Testing] Running variant analysis...');

  const data = await fetchVariantData();
  if (!data) return null;

  const results = analyzeVariantResults(data);
  console.log(`   Variant A: ${results.A.sent} sent, ${results.A.replyRate}% reply`);
  console.log(`   Variant B: ${results.B.sent} sent, ${results.B.replyRate}% reply`);

  const winner = selectWinner(results);

  if (winner) {
    const { data: prevConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'active_outreach_variant')
      .single();

    const winnerChanged = prevConfig?.value !== winner;
    await setActiveOutreachStrategy(winner);

    if (winnerChanged) {
      await sendMessage(
        `🔥 *New Winning Outreach Variant Selected*\n\n` +
        `Variant ${winner} is now active\n` +
        `Variant A Reply Rate: ${results.A.replyRate}%\n` +
        `Variant B Reply Rate: ${results.B.replyRate}%`
      );
    }
  }

  return { results, winner };
}

module.exports = { assignVariant, analyzeVariantResults, selectWinner, setActiveOutreachStrategy, getActiveVariant, runABTestCycle };
