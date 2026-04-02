const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function getClientData(clientId) {
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: seoReports } = await supabase
    .from('seo_reports')
    .select('*')
    .eq('client_id', clientId)
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  const { data: blogs } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'published')
    .gte('created_at', startOfMonth.toISOString());

  const { data: rankings } = await supabase
    .from('rankings')
    .select('*')
    .eq('client_id', clientId)
    .order('checked_at', { ascending: false })
    .limit(10);

  return {
    client,
    seoReport: seoReports?.[0] || null,
    blogs: blogs || [],
    rankings: rankings || []
  };
}

async function generateReportSummary(data) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Write a professional monthly report summary for a restaurant client.

Restaurant: ${data.client?.name}
Month: ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
Blogs published: ${data.blogs.length}
SEO score: ${data.seoReport?.score || 'N/A'}
Keywords tracking: ${data.rankings.length}

Write a friendly, professional 3-paragraph summary:
1. What was accomplished this month
2. Key results and improvements
3. What's planned for next month

Keep it positive, specific, and non-technical. Write as Nahid from Naisora.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

function generateReportHTML(data, summary) {
  const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const client = data.client;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; }
  .header { background: #080808; color: white; padding: 40px 50px; }
  .logo { font-size: 28px; font-weight: 700; letter-spacing: 2px; color: #FF5C00; }
  .logo span { color: #FFB400; }
  .header h1 { font-size: 18px; font-weight: 400; margin-top: 8px; color: #aaa; }
  .header h2 { font-size: 24px; margin-top: 4px; }
  .body { padding: 40px 50px; }
  .summary-box { background: #f8f8f8; border-left: 4px solid #FF5C00; padding: 20px 24px; border-radius: 0 8px 8px 0; margin-bottom: 32px; line-height: 1.7; font-size: 14px; }
  .section-title { font-size: 16px; font-weight: 600; color: #080808; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: #080808; color: white; padding: 20px; border-radius: 8px; text-align: center; }
  .stat-card .number { font-size: 32px; font-weight: 700; color: #FF5C00; }
  .stat-card .label { font-size: 12px; color: #aaa; margin-top: 4px; }
  .blog-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 13px; }
  .blog-table th { background: #080808; color: #FFB400; padding: 10px 14px; text-align: left; }
  .blog-table td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; }
  .blog-table tr:hover td { background: #fafafa; }
  .status-badge { background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .footer { background: #080808; color: #666; padding: 24px 50px; font-size: 12px; margin-top: 40px; }
  .footer .brand { color: #FF5C00; font-weight: 700; }
  .next-steps { background: #fff9e6; border: 1px solid #FFB400; border-radius: 8px; padding: 20px 24px; margin-bottom: 32px; }
  .next-steps ul { margin-top: 8px; padding-left: 20px; }
  .next-steps ul li { margin-bottom: 6px; font-size: 13px; line-height: 1.6; }
</style>
</head>
<body>

<div class="header">
  <div class="logo">NAI<span>SORA</span></div>
  <h1>Monthly Performance Report — ${month}</h1>
  <h2>${client?.name || 'Restaurant'}</h2>
</div>

<div class="body">

  <div class="section-title">Summary</div>
  <div class="summary-box">${summary.replace(/\n/g, '<br>')}</div>

  <div class="section-title">This Month at a Glance</div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="number">${data.blogs.length}</div>
      <div class="label">Blogs Published</div>
    </div>
    <div class="stat-card">
      <div class="number">${data.seoReport?.score || '—'}</div>
      <div class="label">Google Visibility Score</div>
    </div>
    <div class="stat-card">
      <div class="number">${data.rankings.length}</div>
      <div class="label">Keywords Tracked</div>
    </div>
  </div>

  ${data.blogs.length > 0 ? `
  <div class="section-title">Blogs Published This Month</div>
  <table class="blog-table">
    <tr><th>Title</th><th>Type</th><th>Status</th></tr>
    ${data.blogs.map(b => `
      <tr>
        <td>${b.title}</td>
        <td>${b.blog_type || 'Article'}</td>
        <td><span class="status-badge">Published</span></td>
      </tr>
    `).join('')}
  </table>
  ` : ''}

  <div class="next-steps">
    <div class="section-title" style="border:none; margin-bottom: 8px;">What's Next</div>
    <ul>
      <li>Continue publishing 2–4 blogs per month targeting local search</li>
      <li>Monitor keyword rankings weekly and adjust content strategy</li>
      <li>Review Google Business Profile for new reviews to respond to</li>
      <li>Next report will be delivered on the 1st of next month</li>
    </ul>
  </div>

</div>

<div class="footer">
  Prepared by <span class="brand">Naisora</span> · hello@naisora.com · naisora.com<br>
  Questions? Reply to this email or WhatsApp us anytime.
</div>

</body>
</html>`;
}

async function generatePdf(html, outputPath) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    printBackground: true
  });

  await browser.close();
  return outputPath;
}

async function run(clientId) {
  console.log(`📊 Generating monthly PDF report for client: ${clientId}`);

  try {
    const data = await getClientData(clientId);

    if (!data.client) {
      console.log('Client not found');
      return;
    }

    const summary = await generateReportSummary(data);
    const html = generateReportHTML(data, summary);

    const month = new Date().toISOString().slice(0, 7);
    const fileName = `naisora-report-${data.client.name.toLowerCase().replace(/\s/g, '-')}-${month}.pdf`;
    const outputPath = path.join('/tmp', fileName);

    await generatePdf(html, outputPath);

    await sendTelegram(
      `📊 *Monthly PDF Report Ready*\n\n` +
      `Client: ${data.client.name}\n` +
      `Month: ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}\n` +
      `File: ${fileName}\n\n` +
      `Send this to your client via email or WhatsApp.`
    );

    console.log(`✅ PDF report generated: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('PDF report error:', error.message);
    await sendTelegram(`❌ *Monthly PDF Report Error*\n${error.message}`);
    throw error;
  }
}

module.exports = { run };