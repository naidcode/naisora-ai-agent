const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');
const Anthropic = require('@anthropic-ai/sdk');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function getQuarterlyData(clientId) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [clientRes, blogsRes, rankingsRes, reportsRes, invoicesRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('blog_posts').select('*').eq('client_id', clientId).eq('status', 'published').gte('created_at', threeMonthsAgo.toISOString()),
    supabase.from('rankings').select('*').eq('client_id', clientId).gte('checked_at', threeMonthsAgo.toISOString()),
    supabase.from('seo_reports').select('*').eq('client_id', clientId).gte('created_at', threeMonthsAgo.toISOString()).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('client_id', clientId).gte('created_at', threeMonthsAgo.toISOString())
  ]);

  return {
    client: clientRes.data,
    blogs: blogsRes.data || [],
    rankings: rankingsRes.data || [],
    reports: reportsRes.data || [],
    invoices: invoicesRes.data || []
  };
}

async function generateQuarterlyInsights(data) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const totalPaid = data.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const latestScore = data.reports[0]?.score || 'N/A';

  const prompt = `You are preparing a quarterly business review for a restaurant client of Naisora web agency.

Client: ${data.client?.name}
Quarter: ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
Blogs published: ${data.blogs.length}
Keywords tracked: ${data.rankings.length}
Latest SEO score: ${latestScore}/100
Total invoiced: ₹${totalPaid}

Prepare a quarterly review document with:

1. QUARTER SUMMARY (2-3 sentences — what was done)

2. TOP 3 WINS THIS QUARTER
- Win 1:
- Win 2:
- Win 3:

3. WHAT COULD HAVE BEEN BETTER
- Area 1:
- Area 2:

4. NEXT QUARTER PLAN
- Goal 1:
- Goal 2:
- Goal 3:

5. UPSELL OPPORTUNITY
[One natural upsell that makes sense for this client based on their results]

6. TALKING POINTS FOR THE CALL
[5 bullet points to guide the conversation — what to lead with, what to address]

7. RENEWAL STRATEGY
[How to approach the renewal discussion — what to offer, what to emphasise]

Keep everything specific, honest, and helpful. Write as Nahid preparing for an important client call.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

async function run(clientId) {
  console.log(`📋 Preparing quarterly review for client: ${clientId}`);

  try {
    const data = await getQuarterlyData(clientId);

    if (!data.client) {
      console.log('Client not found');
      return;
    }

    const insights = await generateQuarterlyInsights(data);

    const message =
      `📋 *Quarterly Review — ${data.client.name}*\n\n` +
      `Quarter: ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      insights;

    if (message.length > 4000) {
      const chunks = message.match(/.{1,4000}/gs) || [];
      for (const chunk of chunks) {
        await sendTelegram(chunk);
        await new Promise(r => setTimeout(r, 500));
      }
    } else {
      await sendTelegram(message);
    }

    console.log(`✅ Quarterly review prepared for ${data.client.name}`);
    return insights;

  } catch (error) {
    console.error('Quarterly preparer error:', error.message);
    await sendTelegram(`❌ *Quarterly Preparer Error*\n${error.message}`);
    throw error;
  }
}

module.exports = { run };