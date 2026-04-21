const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const POST_FORMATS = {
  linkedin_story: {
    label: 'LinkedIn personal story',
    words: 200,
    structure: 'Hook → Personal story → Lesson → Takeaway for others → CTA',
    tone: 'professional but personal, first-person, honest'
  },
  linkedin_insight: {
    label: 'LinkedIn industry insight',
    words: 150,
    structure: 'Surprising statement → Data or observation → Why it matters → What to do about it',
    tone: 'thought leadership, confident, data-backed'
  },
  instagram_caption: {
    label: 'Instagram caption',
    words: 80,
    structure: 'Hook line → Value or story → Soft CTA → Hashtags',
    tone: 'casual, punchy, authentic, relatable'
  },
  instagram_educational: {
    label: 'Instagram educational post',
    words: 100,
    structure: 'Problem hook → 3-5 quick tips → Encouraging close → CTA',
    tone: 'helpful, clear, encouraging, not preachy'
  },
  campaign_caption: {
    label: 'Campaign / offer caption',
    words: 60,
    structure: 'Bold hook → Offer details → Urgency → CTA',
    tone: 'exciting, clear, urgent but not spammy'
  }
};

async function writePost(params) {
  const {
    format = 'instagram_caption',
    topic,
    account = 'nahidpasha01',
    niche = 'web design and AI agency',
    audience = 'young designers and entrepreneurs in India',
    includeHashtags = true
  } = params;

  const postFormat = POST_FORMATS[format];
  if (!postFormat) {
    throw new Error(`Unknown format: ${format}. Options: ${Object.keys(POST_FORMATS).join(', ')}`);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Write a ${postFormat.label} for Instagram/LinkedIn.

Account: @${account}
Niche: ${niche}
Audience: ${audience}
Topic: ${topic}
Format: ${postFormat.label}
Target length: ${postFormat.words} words
Structure: ${postFormat.structure}
Tone: ${postFormat.tone}

${includeHashtags && format.includes('instagram') ? 'Include 15-20 relevant hashtags at the end.' : ''}
${format.includes('linkedin') ? 'No hashtags for LinkedIn — focus on content quality.' : ''}

Rules:
- First line must stop the scroll — make it impossible to ignore
- Write authentically — Nahid is a 20-year-old founder building an AI agency in Bangalore
- Reference India, Bangalore, or Indian context naturally when relevant
- No corporate speak or buzzwords
- End with one clear, non-pushy CTA

Write only the post — no explanations, no labels. Just the post content ready to copy-paste.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  });

  return {
    format,
    platform: format.includes('linkedin') ? 'linkedin' : 'instagram',
    account,
    topic,
    content: response.content[0].text.trim(),
    created_at: new Date().toISOString()
  };
}

async function savePost(post) {
  const { error } = await supabase
    .from('blog_posts')
    .insert({
      title: `Post — @${post.account} — ${post.topic}`,
      content: post.content,
      status: 'draft',
      platform: post.platform,
      handle: post.account,
      created_at: post.created_at
    });

  if (error) console.error('Save post error:', error.message);
}

async function run(params) {
  console.log(`✍️ Writing ${params.format || 'instagram_caption'} post...`);

  try {
    const post = await writePost(params);
    await savePost(post);

    const emoji = post.platform === 'linkedin' ? '💼' : '📸';

    await sendTelegram(
      `${emoji} *Post Ready — @${post.account}*\n` +
      `Format: ${POST_FORMATS[post.format]?.label}\n` +
      `Topic: ${post.topic}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${post.content}`
    );

    console.log(`✅ Post written and sent to Telegram`);
    return post;

  } catch (error) {
    console.error('Post writer error:', error.message);
    await sendTelegram(`❌ *Post Writer Error*\n${error.message}`);
    throw error;
  }
}

module.exports = { run, writePost, POST_FORMATS };