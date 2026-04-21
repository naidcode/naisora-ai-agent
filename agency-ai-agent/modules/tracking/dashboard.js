// modules/tracking/dashboard.js
// Naisora Agent Dashboard — full business overview on demand

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { getMonthlyRevenue } = require('../reporting/financialTracker');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function generateDashboard() {
  console.log('\n📊 Generating full dashboard...');

  // Revenue
  const revenue = await getMonthlyRevenue();

  // Leads
  const { data: leads } = await supabase
    .from('leads')
    .select('outreach_status, lead_category, created_at');

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const leadStats = {
    total: leads?.length || 0,
    thisWeek: leads?.filter(l => new Date(l.created_at) > weekAgo).length || 0,
    hot: leads?.filter(l => l.lead_category === 'hot').length || 0,
    contacted: leads?.filter(l => l.outreach_status === 'contacted').length || 0,
    replied: leads?.filter(l => l.outreach_status === 'replied').length || 0,
    closed: leads?.filter(l => l.outreach_status === 'closed').length || 0,
  };

  // Blog posts
  const { data: blogs } = await supabase
    .from('blog_posts')
    .select('status');

  const blogStats = {
    total: blogs?.length || 0,
    published: blogs?.filter(b => b.status === 'published').length || 0,
    draft: blogs?.filter(b => b.status === 'draft').length || 0,
  };

  const dashboard =
    `📊 *NAISORA DASHBOARD — ${new Date().toLocaleDateString('en-IN')}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 REVENUE\n` +
    `Active clients: ${revenue.activeClients}\n` +
    `Monthly recurring: ₹${revenue.recurring}\n` +
    `This month total: ₹${revenue.total}\n` +
    `Target: ₹35,000/month\n` +
    `Progress: ${revenue.total > 0 ? ((revenue.total / 35000) * 100).toFixed(0) : 0}%\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 LEADS\n` +
    `Total in database: ${leadStats.total}\n` +
    `Found this week: ${leadStats.thisWeek}\n` +
    `🔥 Hot leads: ${leadStats.hot}\n` +
    `Contacted: ${leadStats.contacted}\n` +
    `Replied: ${leadStats.replied}\n` +
    `Closed: ${leadStats.closed}\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📝 CONTENT\n` +
    `Blogs published: ${blogStats.published}\n` +
    `Drafts waiting: ${blogStats.draft}\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🤖 Agent running on Railway ✅`;

  await sendTelegramAlert(dashboard);
  return dashboard;
}

module.exports = { generateDashboard };