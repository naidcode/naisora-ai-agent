const { createClient } = require('@supabase/supabase-js');
const { sendMessage } = require('../../config/telegram');
const Anthropic = require('@anthropic-ai/sdk');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ACCOUNTS = {
  personal: {
    platform: 'instagram',
    handle: process.env.PERSONAL_INSTAGRAM || 'nahidpasha01',
    niche: 'web design, AI agency, personal brand, lifestyle',
    goal: 'Build personal audience, attract freelance clients, show journey as a 20-year-old founder',
    audience: 'young designers, developers, entrepreneurs, freelancers',
    content_style: 'raw, authentic, educational + personal story'
  },
  agency: {
    platform: 'instagram',
    handle: process.env.NAISORA_INSTAGRAM || 'naisora.official',
    niche: 'restaurant web design, local SEO, AI automation for restaurants',
    goal: 'Attract restaurant owners in Bangalore, show results, build trust',
    audience: 'restaurant owners, cafe owners, food business owners in Bangalore',
    content_style: 'professional, result-focused, before/after, testimonials'
  },
  linkedin: {
    platform: 'linkedin',
    handle: process.env.LINKEDIN_EMAIL || 'nahid-pasha',
    niche: 'web design agency, AI tools, B2B outreach, restaurant tech',
    goal: 'Connect with restaurant owners and food industry decision makers',
    audience: 'restaurant chain owners, hospitality managers, food entrepreneurs',
    content_style: 'professional, thought leadership, case studies, insights'
  }
};

const WEEKLY_STRUCTURE = [
  { day: 'Monday', type: 'Reel', emoji: '🎬', purpose: 'Reach new audience — reels get maximum reach on Instagram', posting_time: '7:00 PM IST' },
  { day: 'Wednesday', type: 'Carousel', emoji: '📊', purpose: 'Educate and save — carousels get saved and shared more than any other format', posting_time: '6:00 PM IST' },
  { day: 'Friday', type: 'Campaign Poster', emoji: '🎯', purpose: 'Drive action — weekend is when people make decisions and inquire', posting_time: '5:00 PM IST' },
  { day: 'Sunday', type: 'Single Post', emoji: '📸', purpose: 'Personal / behind the scenes — builds trust and connection', posting_time: '11:00 AM IST' }
];

async function generatePostContent(account, postSlot) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const weekStart = new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });

  let formatInstructions = '';
  if (postSlot.type === 'Reel') {
    formatInstructions = `REEL PLAN:\nTopic: [Specific reel topic]\nHook (first 3 seconds): [Exact opening line]\nScript outline:\n  - 0-3s: [Hook]\n  - 3-10s: [Problem]\n  - 10-25s: [Solution]\n  - 25-30s: [CTA]\nAudio style: [Trending/Emotional/Upbeat]\nCaption (2-3 lines): [Actual caption]\nCTA: [Clear call to action]\nHashtags: [15 hashtags]`;
  }
  if (postSlot.type === 'Carousel') {
    formatInstructions = `CAROUSEL PLAN:\nTopic: [Specific topic]\nSlide 1 — Cover hook: [Swipe-worthy text]\nSlide 2: [Heading + 2 points]\nSlide 3: [Heading + 2 points]\nSlide 4: [Heading + 2 points]\nSlide 5: [Heading + 2 points]\nSlide 6 — CTA: [Final text + next step]\nCaption (2-3 lines): [Actual caption]\nHashtags: [15 hashtags]`;
  }
  if (postSlot.type === 'Campaign Poster') {
    formatInstructions = `CAMPAIGN POSTER PLAN:\nCampaign name: [Short name]\nPoster headline: [5 words max]\nPoster subheadline: [10 words max]\nHook in caption: [Scroll-stopping first line]\nOffer or message: [What is promoted]\nCTA on poster: [Action text]\nCaption (3-4 lines): [Full caption]\nDesign notes: [#080808 black, #FF5C00 orange, #FFB400 gold, Syne font]\nHashtags: [15 hashtags]`;
  }
  if (postSlot.type === 'Single Post') {
    formatInstructions = `SINGLE POST PLAN:\nTopic: [Personal/result/milestone/BTS]\nImage description: [What to show]\nHook — first caption line: [Exact first line]\nCaption (4-5 lines): [Full authentic caption]\nStory angle: [Why this builds trust]\nCTA: [Simple non-pushy CTA]\nHashtags: [15 hashtags]`;
  }

  const prompt = `You are a social media content strategist for Indian creators and agencies.\n\nCreate a detailed ${postSlot.type} content plan for:\n\nPlatform: ${account.platform}\nHandle: @${account.handle}\nNiche: ${account.niche}\nGoal: ${account.goal}\nTarget audience: ${account.audience}\nContent style: ${account.content_style}\nPost day: ${postSlot.day}\nPost time: ${postSlot.posting_time}\nPurpose: ${postSlot.purpose}\nWeek of: ${weekStart}\n\n${formatInstructions}\n\nRules:\n- Everything specific and actionable\n- Hooks must stop the scroll immediately\n- Write for Indian audience\n- @naisora.official — tie content to restaurant owner pain points\n- @nahidpasha01 — personal journey + web design / AI education\n- LinkedIn — professional tone, thought leadership`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

async function savePlanToSupabase(handle, weeklyPlan) {
  const weekStart = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('blog_posts').insert({
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

  await sendMessage(`${emoji} *Weekly Content Plan — @${account.handle}*\n📅 Week of ${weekStart}\n📌 4 posts: Reel · Carousel · Campaign Poster · Single Post\n━━━━━━━━━━━━━━━━━━━━━━`);
  await new Promise(r => setTimeout(r, 1000));

  for (let i = 0; i < weeklyPlan.length; i++) {
    const slot = WEEKLY_STRUCTURE[i];
    const content = weeklyPlan[i];
    const message = `${slot.emoji} *POST ${i + 1} — ${slot.day.toUpperCase()} · ${slot.type.toUpperCase()}*\n🕐 Post at: ${slot.posting_time}\n💡 Why: ${slot.purpose}\n\n${content}`;

    if (message.length > 4000) {
      const chunks = message.match(/.{1,4000}/gs) || [];
      for (const chunk of chunks) { await sendMessage(chunk); await new Promise(r => setTimeout(r, 600)); }
    } else {
      await sendMessage(message);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  await sendMessage(`✅ *Plan ready for @${account.handle}*\n\nPost each piece on its scheduled day.\n📊 Weekly progress report arrives every Sunday automatically.`);
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
      const weeklyPlan = await Promise.all(WEEKLY_STRUCTURE.map(slot => generatePostContent(account, slot)));
      await savePlanToSupabase(account.handle, weeklyPlan);
      await sendPlanToTelegram(account, weeklyPlan);
      console.log(`✅ 4-post plan sent for @${account.handle}`);
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log('\n✅ All content plans complete');
  } catch (error) {
    console.error('Content planner error:', error.message);
    await sendMessage(`❌ *Content Planner Error*\n${error.message}`);
  }
}

module.exports = { run };