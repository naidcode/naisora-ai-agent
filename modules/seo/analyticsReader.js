// modules/seo/analyticsReader.js
// Reads GA4 data for client websites (requires GA4 API setup per client)

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Placeholder — GA4 requires OAuth per client
// In Week 5 this connects to real GA4 API
// For now returns mock data structure for testing

async function getTrafficData(clientId, days = 30) {
  // TODO: Connect to GA4 API with client credentials
  // For now return structure — real data added when client onboards
  return {
    sessions: 0,
    users: 0,
    pageviews: 0,
    bounceRate: 0,
    topPages: [],
    trafficSources: [],
    note: 'GA4 connection required — set up during client onboarding'
  };
}

async function saveTrafficSnapshot(leadId, data) {
  await supabase.from('seo_reports').insert({
    lead_id: leadId,
    report_type: 'traffic_snapshot',
    report_data: data,
    summary: `Traffic: ${data.sessions} sessions, ${data.users} users`,
  });
}

module.exports = { getTrafficData, saveTrafficSnapshot };