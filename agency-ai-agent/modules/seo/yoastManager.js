const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');
const Anthropic = require('@anthropic-ai/sdk');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function getWpAuth(client) {
  return Buffer.from(`${client.wp_username}:${client.wp_password}`).toString('base64');
}

async function getClientWordPress(clientId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (error || !data) throw new Error(`Client ${clientId} not found`);
  return data;
}

async function generateYoastMeta(params) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { title, content, restaurantName, area, cuisine } = params;

  const prompt = `Generate optimised Yoast SEO metadata for a restaurant blog post.

Restaurant: ${restaurantName}
Area: ${area}
Cuisine: ${cuisine}
Post title: ${title}
Content preview: ${content?.slice(0, 300) || ''}

Generate:

SEO TITLE: [Under 60 characters — include restaurant name + area + main keyword]
META DESCRIPTION: [Under 160 characters — compelling, includes location, ends with soft CTA]
FOCUS KEYWORD: [Single most important keyword for this post — what people search for]
SECONDARY KEYWORDS: [3-4 related keywords separated by commas]

Rules:
- SEO title different from blog post title — more keyword-focused
- Meta description must make someone want to click
- Focus keyword must appear naturally in the title and description
- All location-specific — always mention ${area} or Bangalore`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text;

  const seoTitleMatch = text.match(/SEO TITLE:\s*(.+)/);
  const metaDescMatch = text.match(/META DESCRIPTION:\s*(.+)/);
  const focusKwMatch = text.match(/FOCUS KEYWORD:\s*(.+)/);
  const secondaryKwMatch = text.match(/SECONDARY KEYWORDS:\s*(.+)/);

  return {
    seoTitle: seoTitleMatch?.[1]?.trim() || title,
    metaDescription: metaDescMatch?.[1]?.trim() || '',
    focusKeyword: focusKwMatch?.[1]?.trim() || '',
    secondaryKeywords: secondaryKwMatch?.[1]?.trim() || ''
  };
}

async function updateYoastForPost(client, postId, yoastData) {
  const auth = getWpAuth(client);
  const baseUrl = client.wp_url.replace(/\/$/, '');

  try {
    // Update Yoast metadata via WP REST API
    const response = await axios.post(
      `${baseUrl}/wp-json/wp/v2/posts/${postId}`,
      {
        meta: {
          _yoast_wpseo_title: yoastData.seoTitle,
          _yoast_wpseo_metadesc: yoastData.metaDescription,
          _yoast_wpseo_focuskw: yoastData.focusKeyword
        }
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, postId, data: response.data };
  } catch (error) {
    console.error(`Yoast update failed for post ${postId}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function auditAllPostsYoast(clientId) {
  const wpClient = await getClientWordPress(clientId);
  const auth = getWpAuth(wpClient);
  const baseUrl = wpClient.wp_url.replace(/\/$/, '');

  // Get all published posts
  const response = await axios.get(
    `${baseUrl}/wp-json/wp/v2/posts?status=publish&per_page=20`,
    { headers: { 'Authorization': `Basic ${auth}` } }
  );

  const posts = response.data;
  const missingMeta = [];

  for (const post of posts) {
    const yoastTitle = post.meta?._yoast_wpseo_title;
    const yoastDesc = post.meta?._yoast_wpseo_metadesc;

    if (!yoastTitle || !yoastDesc) {
      missingMeta.push({ id: post.id, title: post.title?.rendered });
    }
  }

  return { total: posts.length, missingMeta };
}

async function run(params) {
  const {
    clientId,
    postId = null,
    mode = 'single',
    postTitle = '',
    postContent = ''
  } = params;

  console.log(`🔧 Yoast manager running — mode: ${mode}`);

  try {
    const wpClient = await getClientWordPress(clientId);

    if (mode === 'audit') {
      const audit = await auditAllPostsYoast(clientId);

      await sendTelegram(
        `🔧 *Yoast SEO Audit — ${wpClient.name}*\n\n` +
        `Total posts: ${audit.total}\n` +
        `Missing Yoast metadata: ${audit.missingMeta.length}\n\n` +
        (audit.missingMeta.length > 0
          ? `Posts needing Yoast update:\n${audit.missingMeta.map(p => `• ${p.title} (ID: ${p.id})`).join('\n')}\n\n` +
            `Run yoastManager with mode "fix" to auto-update all.`
          : '✅ All posts have Yoast metadata')
      );

      return audit;
    }

    if (mode === 'single' && postId) {
      const yoastData = await generateYoastMeta({
        title: postTitle,
        content: postContent,
        restaurantName: wpClient.name,
        area: wpClient.area || 'Bangalore',
        cuisine: wpClient.cuisine || 'Indian'
      });

      const result = await updateYoastForPost(wpClient, postId, yoastData);

      if (result.success) {
        await sendTelegram(
          `✅ *Yoast Updated — Post ${postId}*\n\n` +
          `SEO Title: ${yoastData.seoTitle}\n` +
          `Meta: ${yoastData.metaDescription}\n` +
          `Focus keyword: ${yoastData.focusKeyword}`
        );
      }

      return result;
    }

    console.log('Yoast manager: specify mode (audit or single) and required params');

  } catch (error) {
    console.error('Yoast manager error:', error.message);
    await sendTelegram(`❌ *Yoast Manager Error*\n${error.message}`);
    throw error;
  }
}

module.exports = { run, generateYoastMeta, updateYoastForPost, auditAllPostsYoast };