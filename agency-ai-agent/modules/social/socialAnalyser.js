const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');
const Anthropic = require('@anthropic-ai/sdk');
const { ACCOUNTS } = require('./socialAnalyser');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Weekly benchmarks to track progress against
const WEEKLY_TARGETS = {
  personal: {
    handle: 'nahidpasha01',
    posts_target: 4,
    platform: 'instagram'
  },
  agency: {
    handle: 'naisora.official',
    posts_target: 4,
    platform: 'instagram'
  },
  linkedin: {
    handle: 'linkedin',
    posts_target: 3,
    platform: 'linkedin'
  }
};

async function getPreviousWeekPlan(handle) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .ilike('title', `%${handle}%`)
    .eq('status', 'content_plan')
    .gte('created_at', oneWeekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0];
}

async function generateProgressInsight(accountName, handle, platform, planExists, postsTarget) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a social media growth coach reviewing weekly performance.

Account: @${handle}
Platform: ${platform}
Weekly posts target: ${postsTarget}
Content plan was generated: ${planExists ? 'Yes' : 'No'}

Generate a short weekly progress review in this format:

ACCOUNT: @${handle}
━━━━━━━━━━━━━━
WEEK IN REVIEW:
[2 sentences — what should have happened this week based on the content plan]

WHAT TO FOCUS ON NEXT WEEK:
- [Focus point 1]
- [Focus point 2]
- [Focus point 3]

GROWTH TIP OF THE WEEK:
[One specific, actionable tip for this platform and niche]

CONSISTENCY SCORE: [X/10 — based on whether plan was generated and available to execute]

Keep it short, direct, motivating. No fluff.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

async function buildWeeklyReport() {
  const reportDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const weekNumber = Math.ceil(
    (new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000)
  );

  // Header
  await sendTelegram(
    `📊 *NAISORA WEEKLY SOCIAL REPORT*\n` +
    `📅 ${reportDate}\n` +
    `📌 Week ${weekNumber} of ${new Date().getFullYear()}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );

  await new Promise(r => setTimeout(r, 1000));

  let totalScore = 0;
  let accountCount = 0;

  // Process each account
  for (const [key, target] of Object.entries(WEEKLY_TARGETS)) {
    const plan = await getPreviousWeekPlan(target.handle);
    const planExists = !!plan;

    const insight = await generateProgressInsight(
      key,
      target.handle,
      target.platform,
      planExists,
      target.posts_target
    );

    // Extract score from insight
    const scoreMatch = insight.match(/CONSISTENCY SCORE:\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
    totalScore += score;
    accountCount++;

    const emoji = target.platform === 'instagram' ? '📸' : '💼';
    await sendTelegram(`${emoji} ${insight}`);
    await new Promise(r => setTimeout(r, 1500));
  }

  // Overall summary
  const avgScore = Math.round(totalScore / accountCount);
  const scoreEmoji = avgScore >= 8 ? '🔥' : avgScore >= 6 ? '✅' : '⚠️';

  await sendTelegram(
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${scoreEmoji} *OVERALL SOCIAL SCORE: ${avgScore}/10*\n\n` +
    `📋 *This week's content plan arrives now — check next message.*\n` +
    `🎯 *Goal: Post consistently, reply to comments, engage with followers.*\n\n` +
    `Next report: Sunday ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}`
  );
}

async function run() {
  console.log('📊 Running weekly social media performance tracker...');

  try {
    await buildWeeklyReport();
    console.log('✅ Weekly social report sent to Telegram');
  } catch (error) {
    console.error('Performance tracker error:', error.message);
    await sendTelegram(`❌ *Performance Tracker Error*\n${error.message}`);
  }
}

module.exports = { run };