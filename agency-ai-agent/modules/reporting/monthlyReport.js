// modules/reporting/monthlyReport.js
// Generates monthly performance report for clients

require('dotenv').config();
const { route } = require('../../config/llmRouter');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function generateMonthlyReport(client) {
  console.log(`\n📊 Generating monthly report for ${client.business_name}...`);

  // Get this month's data
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: audits } = await supabase
    .from('seo_reports')
    .select('*')
    .eq('lead_id', client.id)
    .gte('created_at', monthStart.toISOString());

  const { data: blogs } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('lead_id', client.id)
    .gte('created_at', monthStart.toISOString());

  const latestAudit = audits?.find(a => a.report_type === 'website_audit');

  const prompt = `Write a monthly SEO and web performance report for a restaurant client.

Client: ${client.business_name}, ${client.area}, Bangalore
Month: ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
Website score: ${latestAudit?.audit_score || 'pending'}/100
Blog posts published: ${blogs?.filter(b => b.status === 'published').length || 0}
Blog drafts ready: ${blogs?.filter(b => b.status === 'draft').length || 0}
Issues fixed: ${latestAudit?.issues_found || 0}

Write an 8-section report in plain English for a restaurant owner:
1. Executive Summary
2. Website Performance
3. Google Visibility Progress
4. Content Published This Month
5. What We Fixed
6. Competitor Comparison
7. Next Month Plan
8. Investment Summary (₹${client.monthly_fee || 3500}/month value delivered)

No technical jargon. Focus on business impact — customers, visibility, revenue.`;

  const report = await route('client_report', prompt, null, 1500);

  // Save report
  await supabase.from('seo_reports').insert({
    lead_id: client.id,
    report_type: 'monthly_report',
    report_data: { report, month: new Date().toISOString() },
    summary: `Monthly report — ${client.business_name} — ${new Date().toLocaleString('en-IN', { month: 'long' })}`,
  });

  await sendTelegramAlert(
    `📊 *Monthly Report Ready — ${client.business_name}*\n\n` +
    report.substring(0, 3000) +
    '\n\nSend this to the client on WhatsApp.'
  );

  return report;
}

// Run monthly reports for all active clients
async function runMonthlyReportsForAllClients() {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active');

  if (!clients || clients.length === 0) {
    console.log('No active clients for monthly reports');
    return;
  }

  for (const client of clients) {
    await generateMonthlyReport(client);
    await new Promise(r => setTimeout(r, 3000));
  }
}

module.exports = { generateMonthlyReport, runMonthlyReportsForAllClients };