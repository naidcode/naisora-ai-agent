// modules/seo/performanceReport.js
// Generates weekly SEO performance reports for clients

require('dotenv').config();
const { askClaude } = require('../../config/claude');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function generateWeeklyReport(client) {
  console.log(`\n📊 Generating weekly report for ${client.business_name}...`);

  // Get latest audit score from new seo_audits table
  const { data: latestAudit } = await supabase
    .from('seo_audits')
    .select('*')
    .eq('lead_id', client.id)
    .order('audited_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get blog posts published this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('lead_id', client.id)
    .gte('created_at', weekAgo.toISOString());

  const prompt = `Write a brief weekly SEO report for a restaurant client.

Client: ${client.business_name}, ${client.area}, Bangalore
Website Score: ${latestAudit?.total_score || 'Not yet audited'}/100
Grade: ${latestAudit?.grade || 'N/A'}
Blog posts this week: ${posts?.length || 0}
Issues found: ${latestAudit?.issues?.length || 0}

Write a 150-word plain English report showing:
1. What was done this week
2. Current website score & grade
3. What we're doing next week
4. One key win or improvement

Keep it simple — owner can understand without technical knowledge.`;

  try {
    const report = await askClaude(prompt);

    // Save report
    await supabase.from('seo_reports').insert({
      lead_id: client.id,
      report_type: 'weekly_performance',
      report_data: { report, auditScore: latestAudit?.audit_score, postsThisWeek: posts?.length },
      summary: `Weekly report for ${client.business_name}`,
    });

    console.log(`✅ Weekly report generated for ${client.business_name}`);
    return report;
  } catch (err) {
    console.error('Report generation failed:', err.message);
    return null;
  }
}

module.exports = { generateWeeklyReport };