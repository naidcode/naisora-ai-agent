const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');
const Anthropic = require('@anthropic-ai/sdk');
const { ACCOUNTS } = require('./socialAnalyser');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const WEEKLY_STRUCTURE = [
  {
    day: 'Monday',
    type: 'Reel',
    emoji: '🎬',
    purpose: 'Reach new audience — reels get maximum reach on Instagram',
    posting_time: '7:00 PM IST'
  },
  {
    day: 'Wednesday',
    type: 'Carousel',
    emoji: '📊',
    purpose: 'Educate and save — carousels get saved and shared more than any other format',
    posting_time: '6:00 PM IST'
  },
  {
    day: 'Friday',
    type: 'Campaign Poster',
    emoji: '🎯',
    purpose: 'Drive action — weekend is when people make decisions and inquire',
    posting_time: '5:00 PM IST'
  },
  {
    day: 'Sunday',
    type: 'Single Post',
    emoji: '📸',
    purpose: 'Personal / behind the scenes — builds trust and connection',
    posting_time: '11:00 AM IST'
  }
];

async function generatePostContent(account, postSlot) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const weekStart = new Date().toLocaleDateString('en-IN', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  let formatInstructions = '';

  if (postSlot.type === 'Reel') {
    formatInstructions = `
REEL PLAN:
Topic: [Specific reel topic]
Hook (first 3 seconds): [Write the exact opening line or action]
Script outline:
  - 0-3s: [Hook]
  - 3-10s: [Problem / setup]
  - 10-25s: [Value / solution]
  - 25-30s: [CTA]
Audio style: [Trending / Emotional / Upbeat / Voiceover]
Caption (2-3 lines): [Write the actual caption]
CTA: [Clear call to action]
Hashtags: [15 hashtags — mix small, medium, large]`;
  }

  if (postSlot.type === 'Carousel') {
    formatInstructions = `
CAROUSEL PLAN:
Topic: [Specific carousel topic]
Slide 1 — Cover hook: [Text that makes people swipe]
Slide 2: [Heading + 2 bullet points]
Slide 3: [Heading + 2 bullet points]
Slide 4: [Heading + 2 bullet points]
Slide 5: [Heading + 2 bullet points]
Slide 6 — CTA slide: [Final slide text + what to do next]
Caption (2-3 lines): [Write the actual caption]
Hashtags: [15 hashtags — mix small, medium, large]`;
  }

  if (postSlot.type === 'Campaign Poster') {
    formatInstructions = `
CAMPAIGN POSTER PLAN:
Campaign name: [Short campaign name]
Poster headline: [Bold text — 5 words max]
Poster subheadline: [Supporting line — 10 words max]
Hook in caption: [First line that stops scroll]
Offer or message: [What is being promoted]
CTA on poster: [Action text on the poster]
Caption (3-4 lines): [Write the full caption]
Design notes: [Layout and vibe — use Naisora brand: #080808 black, #FF5C00 orange, #FFB400 gold, Syne font]
Hashtags: [15 hashtags]`;
  }

  if (postSlot.type === 'Single Post') {
    formatInstructions = `
SINGLE POST PLAN:
Topic: [Personal / result / milestone / behind the scenes]
Image description: [What the photo or graphic should show]
Hook — first caption line: [Write the exact first line]
Caption (4-5 lines): [Write the full authentic caption]
Story angle: [Why this builds trust]
CTA: [Simple non-pushy CTA]
Hashtags: [15 hashtags]`;
  }

  const prompt = `You are a social media content strategist for Indian creators and agencies.

Create a detailed ${postSlot.type} content plan for:

Platform: ${account.platform}
Handle: @${account.handle}
Niche: ${account.niche}
Goal: ${account.goal}
Target audience: ${account.audience}
Content style: ${account.content_style}
Post day: ${postSlot.day}
Post time: ${postSlot.posting_time}
Purpose: ${postSlot.purpose}
Week of: ${weekStart}

${formatInstructions}

Rules:
- Everything specific and actionable — no vague advice
- Hooks must stop the scroll immediately
- Write for Indian audience
- @naisora.official — tie content to restaurant owner pain points
- @nahidpasha01 — personal journey + web design / AI education
- LinkedIn — professional tone, thought leadership`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

async function savePlanToSupabase(handle, weeklyPlan) {
  const weekStart = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('blog_posts')
    .insert({
      title: `Weekly Content Plan — @${handle} — ${weekStart}`,
      content: JSON.stringify(weeklyPlan),
      status: 'content_plan',
      created_at: new Date().toISOString()
    });

  if (error) console.error(`Supabase error for @${handle}:`, error.message);
}

async function sendPlanToTelegram(account, weeklyPlan) {
  const emoji = account.platform === 'instagram' ? '📸' : '💼';
  const weekStart = new Date().toLocaleDateString('en-IN');

  await sendTelegram(
    `${emoji} *Weekly Content Plan — @${account.handle}*\n` +
    `📅 Week of ${weekStart}\n` +
    `📌 4 posts: Reel · Carousel · Campaign Poster · Single Post\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );

  await new Promise(r => setTimeout(r, 1000));

  for (let i = 0; i < weeklyPlan.length; i++) {
    const slot = WEEKLY_STRUCTURE[i];
    const content = weeklyPlan[i];

    const message =
      `${slot.emoji} *POST ${i + 1} — ${slot.day.toUpperCase()} · ${slot.type.toUpperCase()}*\n` +
      `🕐 Post at: ${slot.posting_time}\n` +
      `💡 Why: ${slot.purpose}\n\n` +
      `${content}`;

    if (message.length > 4000) {
      const chunks = message.match(/.{1,4000}/gs) || [];
      for (const chunk of chunks) {
        await sendTelegram(chunk);
        await new Promise(r => setTimeout(r, 600));
      }
    } else {
      await sendTelegram(message);
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  await sendTelegram(
    `✅ *Plan ready for @${account.handle}*\n\n` +
    `Post each piece on its scheduled day.\n` +
    `📊 Weekly progress report arrives every Sunday automatically.`
  );
}

async function run(targetHandle = null) {
  console.log('📅 Generating weekly content plans...');

  try {
    const accountsToProcess = targetHandle
      ? [Object.values(ACCOUNTS).find(a => a.handle === targetHandle.replace('@', ''))]
      : Object.values(ACCOUNTS);

    for (const account of accountsToProcess) {
      if (!account) continue;

      console.log(`\nPlanning for @${account.handle}...`);

      const weeklyPlan = await Promise.all(
        WEEKLY_STRUCTURE.map(slot => generatePostContent(account, slot))
      );

      await savePlanToSupabase(account.handle, weeklyPlan);
      await sendPlanToTelegram(account, weeklyPlan);

      console.log(`✅ 4-post plan sent for @${account.handle}`);
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log('\n✅ All content plans complete');

  } catch (error) {
    console.error('Content planner error:', error.message);
    await sendTelegram(`❌ *Content Planner Error*\n${error.message}`);
  }
}

module.exports = { run };