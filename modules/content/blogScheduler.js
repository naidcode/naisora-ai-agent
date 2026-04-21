// modules/content/blogScheduler.js
// ═══════════════════════════════════════════════════════════════════════════════
// Naisora AI Growth OS — Blog Scheduling Engine
// Now uses the permanent client-attracting topic bank from blogStrategy.js
// 80% client-generating posts, 20% authority-building posts
// ═══════════════════════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');
const { writeBlog } = require('./blogWriter');
const {
  CLIENT_TOPICS,
  AUTHORITY_TOPICS,
  getContentType,
  pickLocalKeywords,
  SEO_STRATEGY,
} = require('../../brain/blogStrategy');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// How many blogs per client per month
const BLOG_SCHEDULE = {
  starter: 2,    // Google Visibility Package clients
  growth: 4,     // Monthly Growth Retainer clients
  premium: 8     // Full service clients
};

// ═══════════════════════════════════════════════════════════════════════════════
// Topic Selection — picks from the client-attracting topic bank
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a topic for a client.
 * - 80% of topics come from CLIENT_TOPICS (pain-point, conversion-focused)
 * - 20% come from AUTHORITY_TOPICS (trust-building)
 *
 * Topics are personalized with the client's restaurant name and area.
 */
function generateTopicForClient(client, postNumber = 0) {
  const contentType = getContentType(postNumber);
  const pool = contentType === 'authority' ? AUTHORITY_TOPICS : CLIENT_TOPICS;

  let topic = pool[postNumber % pool.length];

  // Personalize with client details if applicable
  if (client.area && topic.includes('Bangalore')) {
    // Occasionally swap "Bangalore" with the client's specific area for hyper-local content
    if (postNumber % 3 === 0) {
      topic = topic.replace('Bangalore', client.area);
    }
  }

  return { topic, contentType };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Naisora's OWN blog topics — for the agency website blog
// These attract NEW restaurant owners as clients
// ═══════════════════════════════════════════════════════════════════════════════
function generateNaisoraBlogTopic(postNumber = 0) {
  const contentType = getContentType(postNumber);
  const pool = contentType === 'authority' ? AUTHORITY_TOPICS : CLIENT_TOPICS;
  const topic = pool[postNumber % pool.length];

  return { topic, contentType };
}

async function getActiveClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching clients:', error.message);
    return [];
  }

  return data || [];
}

async function getPendingBlogCount(clientId) {
  const { count, error } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('client_id', clientId)
    .in('status', ['draft', 'approved', 'scheduled']);

  if (error) return 0;
  return count || 0;
}

async function getPublishedThisMonth(clientId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('client_id', clientId)
    .eq('status', 'published')
    .gte('created_at', startOfMonth.toISOString());

  if (error) return 0;
  return count || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Get the total number of blogs ever written (for topic rotation)
// ═══════════════════════════════════════════════════════════════════════════════
async function getTotalBlogCount(clientId = null) {
  let query = supabase.from('blog_posts').select('*', { count: 'exact' });
  if (clientId) query = query.eq('client_id', clientId);

  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Schedule blogs for a specific client
// ═══════════════════════════════════════════════════════════════════════════════
async function scheduleBlogsForClient(client) {
  const plan = client.plan || 'starter';
  const blogsPerMonth = BLOG_SCHEDULE[plan] || 2;

  const publishedThisMonth = await getPublishedThisMonth(client.id);
  const pendingCount = await getPendingBlogCount(client.id);
  const totalEverWritten = await getTotalBlogCount(client.id);

  const totalCovered = publishedThisMonth + pendingCount;
  const blogsNeeded = Math.max(0, blogsPerMonth - totalCovered);

  if (blogsNeeded === 0) {
    console.log(`✅ ${client.name} — blog quota met (${publishedThisMonth} published, ${pendingCount} pending)`);
    return 0;
  }

  console.log(`📝 ${client.name} — needs ${blogsNeeded} more blog(s) this month`);

  let written = 0;
  for (let i = 0; i < blogsNeeded; i++) {
    const postNumber = totalEverWritten + i;
    const { topic, contentType } = generateTopicForClient(client, postNumber);

    console.log(`   → Writing ${contentType} blog: "${topic}"`);

    const blog = await writeBlog({
      clientId: client.id,
      restaurantName: client.name,
      topic: topic,
      blogType: contentType,
      area: client.area || 'Bangalore',
      cuisine: client.cuisine || 'Indian',
      keywords: client.target_keywords || []
    });

    // Save to Supabase with scheduled status
    await supabase.from('blog_posts').insert({
      ...blog,
      status: 'scheduled',
      scheduled_for: new Date(Date.now() + (i + 1) * 3 * 24 * 60 * 60 * 1000).toISOString()
    });

    written++;
    await new Promise(r => setTimeout(r, 2000));
  }

  return written;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Publish approved & scheduled blogs
// ═══════════════════════════════════════════════════════════════════════════════
async function publishScheduledBlogs() {
  const now = new Date().toISOString();

  const { data: scheduledBlogs, error } = await supabase
    .from('blog_posts')
    .select('*, clients(*)')
    .eq('status', 'approved')
    .lte('scheduled_for', now);

  if (error || !scheduledBlogs || scheduledBlogs.length === 0) {
    console.log('No blogs ready to publish');
    return 0;
  }

  console.log(`Found ${scheduledBlogs.length} blog(s) ready to publish`);
  let published = 0;

  for (const blog of scheduledBlogs) {
    try {
      const { blogPublisher } = require('../wordpress/blogPublisher');
      const result = await blogPublisher(blog);

      if (result.success) {
        await supabase
          .from('blog_posts')
          .update({ status: 'published', published_at: now, wp_post_id: result.postId })
          .eq('id', blog.id);

        await sendTelegram(
          `✅ *Blog Published*\n\n` +
          `Restaurant: ${blog.restaurant_name}\n` +
          `Title: ${blog.title}\n` +
          `URL: ${result.url}`
        );

        published++;
      }
    } catch (err) {
      console.error(`Failed to publish blog ${blog.id}:`, err.message);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return published;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════════
async function run(mode = 'schedule') {
  console.log(`\n📅 Blog scheduler running — mode: ${mode}`);
  console.log(`   Strategy: 80% client-generating | 20% authority-building`);

  try {
    if (mode === 'publish') {
      const published = await publishScheduledBlogs();
      console.log(`✅ Published ${published} blog(s)`);
      return;
    }

    // Schedule mode — generate new blogs for all active clients
    const clients = await getActiveClients();

    if (clients.length === 0) {
      console.log('No active clients found');
      return;
    }

    let totalWritten = 0;

    for (const client of clients) {
      const written = await scheduleBlogsForClient(client);
      totalWritten += written;
    }

    if (totalWritten > 0) {
      await sendTelegram(
        `📝 *Blog Scheduler Complete*\n\n` +
        `Generated ${totalWritten} new client-attracting blog draft(s)\n` +
        `Strategy: Problem → Solution → Conversion\n` +
        `Status: Scheduled — auto-publishes when approved\n` +
        `Review in Supabase → blog_posts table`
      );
    }

    console.log(`✅ Blog scheduler complete — ${totalWritten} drafts created`);

  } catch (error) {
    console.error('Blog scheduler error:', error.message);
    await sendTelegram(`❌ *Blog Scheduler Error*\n${error.message}`);
  }
}

module.exports = { run, scheduleBlogsForClient, publishScheduledBlogs, generateNaisoraBlogTopic };