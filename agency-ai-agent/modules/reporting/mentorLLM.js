// modules/reporting/mentorLLM.js
// Naisora AI Agent — Monthly Business Mentor
// Uses Sonnet to analyse full business performance and give strategic advice
// Runs on 1st of every month — costs ~₹20/month, worth every rupee

require('dotenv').config();
const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { getMonthlyRevenue } = require('./financialTracker');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const MENTOR_SYSTEM = `You are a strict but supportive business mentor for a 20-year-old web designer in Bangalore who is building an AI-powered web agency called Naisora targeting restaurants.

Your role:
1. Analyse real numbers honestly — no sugar coating
2. Identify the single biggest problem holding growth back
3. Give top 3 specific priorities for next month
4. Set measurable targets
5. Call out what's not working
6. Celebrate genuine wins

Be direct, specific, and actionable. You know this person can achieve big things — push them.`;

async function runMonthlyMentorSession() {
  console.log('\n🧠 Running monthly mentor session...');

  // Gather all business data
  const revenue = await getMonthlyRevenue();

  const { data: leads } = await supabase
    .from('leads')
    .select('outreach_status, lead_category')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const { data: clients } = await supabase
    .from('clients')
    .select('business_name, monthly_fee, status, start_date');

  const leadStats = {
    total: leads?.length || 0,
    hot: leads?.filter(l => l.lead_category === 'hot').length || 0,
    contacted: leads?.filter(l => l.outreach_status === 'contacted').length || 0,
    replied: leads?.filter(l => l.outreach_status === 'replied').length || 0,
    closed: leads?.filter(l => l.outreach_status === 'closed').length || 0,
  };

  const prompt = `Analyse this month's business performance for Naisora web agency and give strategic mentor advice.

BUSINESS DATA — ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}:

Revenue:
- Active clients: ${revenue.activeClients}
- Monthly recurring: ₹${revenue.recurring}
- One-time payments: ₹${revenue.oneTime}
- Total revenue: ₹${revenue.total}
- Target: ₹35,000/month

Lead Pipeline (last 30 days):
- Total leads found: ${leadStats.total}
- Hot leads: ${leadStats.hot}
- Contacted: ${leadStats.contacted}
- Replied: ${leadStats.replied}
- Closed (became clients): ${leadStats.closed}
- Conversion rate: ${leadStats.total > 0 ? ((leadStats.closed / leadStats.total) * 100).toFixed(1) : 0}%

Context:
- Agency niche: Restaurant and cafe websites in Bangalore
- Main offer: ₹8,000 website + ₹3,500/month retainer
- Outreach channels: WhatsApp, email, Instagram DMs, LinkedIn
- AI agent running 24/7 on Railway

Provide your mentor analysis:
1. BIGGEST WIN this month
2. BIGGEST PROBLEM holding growth back
3. TOP 3 PRIORITIES for next month (specific and measurable)
4. TARGETS to hit next month
5. ONE THING to stop doing immediately
6. ONE THING to start doing immediately`;

  const mentorReport = await route('intelligence_report', prompt, MENTOR_SYSTEM, 1500);

  await sendTelegramAlert(
    `🧠 *Monthly Mentor Report — ${new Date().toLocaleString('en-IN', { month: 'long' })}*\n\n` +
    mentorReport.substring(0, 3500)
  );

  // Save to database
  await supabase.from('seo_reports').insert({
    report_type: 'mentor_report',
    report_data: { report: mentorReport, revenue, leadStats },
    summary: `Mentor report — ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`,
  });

  console.log('✅ Monthly mentor session complete');
  return mentorReport;
}

module.exports = { runMonthlyMentorSession };