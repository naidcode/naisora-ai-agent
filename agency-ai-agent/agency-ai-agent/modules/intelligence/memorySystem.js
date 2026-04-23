// modules/intelligence/memorySystem.js
// Agent memory — stores important context across sessions

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── Save a memory ────────────────────────────────────────────────────────────
async function saveMemory(key, value, category = 'general') {
  await supabase.from('seo_reports').upsert({
    report_type: `memory_${category}_${key}`,
    report_data: { key, value, savedAt: new Date().toISOString() },
    summary: `Memory: ${key}`,
  }, { onConflict: 'report_type' });

  console.log(`💾 Memory saved: ${key}`);
}

// ─── Retrieve a memory ────────────────────────────────────────────────────────
async function getMemory(key, category = 'general') {
  const { data } = await supabase
    .from('seo_reports')
    .select('report_data')
    .eq('report_type', `memory_${category}_${key}`)
    .single();

  return data?.report_data?.value || null;
}

// ─── Save client preference ───────────────────────────────────────────────────
async function saveClientPreference(clientId, preference, value) {
  await saveMemory(`client_${clientId}_${preference}`, value, 'client');
}

// ─── Get all memories for a client ───────────────────────────────────────────
async function getClientMemories(clientId) {
  const { data } = await supabase
    .from('seo_reports')
    .select('report_data')
    .like('report_type', `memory_client_${clientId}_%`);

  return data?.map(d => d.report_data) || [];
}

module.exports = { saveMemory, getMemory, saveClientPreference, getClientMemories };