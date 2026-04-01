// modules/social/performanceTracker.js
// Tracks social media performance over time

const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function savePerformanceSnapshot(accountUsername, metrics) {
  await supabase.from('seo_reports').insert({
    report_type: 'social_performance',
    report_data: { username: accountUsername, metrics, date: new Date().toISOString() },
    summary: `Social snapshot: ${accountUsername} — ${new Date().toLocaleDateString('en-IN')}`,
  });
  console.log(`✅ Performance snapshot saved for ${accountUsername}`);
}

async function getPerformanceTrend(accountUsername, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from('seo_reports')
    .select('*')
    .eq('report_type', 'social_performance')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  return data || [];
}

module.exports = { savePerformanceSnapshot, getPerformanceTrend };