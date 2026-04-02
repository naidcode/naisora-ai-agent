const { createClient } = require('@supabase/supabase-js');
const { sendTelegram } = require('../../config/telegram');
const { writeBlog } = require('./blogWriter');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// How many blogs per client per month
const BLOG_SCHEDULE = {
  starter: 2,    // Google Visibility Package clients
  growth: 4,     // Monthly Growth Retainer clients
  premium: 8     // Full service clients
};

// Blog topics rotation — auto-generates fresh topics each month
const TOPIC_TEMPLATES = [
  'Best {cuisine} restaurants in {area} — {year} guide',
  'Why {restaurantName} is {area}\'s hidden gem',
  'Top dishes to try at {restaurantName}',
  '{restaurantName} — everything you need to know before visiting',
  'The story behind {restaurantName}\'s signature {dish}',
  'Weekend lunch spots in {area} — why {restaurantName} tops the list',
  '{restaurantName} review — honest food lover\'s take',
  'How to book {restaurantName} for your next family dinner'
];

function generateTopicForClient(client, monthIndex = 0) {
  const template = TOPIC_TEMPLATES[monthIndex % TOPIC_TEMPLATES.length];
  return template
    .replace('{restaurantName}', client.name)
    .replace('{cuisine}', client.cuisine || 'Indian')
    .replace('{area}', client.area || 'Bangalore')
    .replace('{year}', new Date().getFullYear())
    .replace('{dish}', client.signature_dish || 'biryani');
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

async function scheduleBlogsForClient(client) {
  const plan = client.plan || 'starter';
  const blogsPerMonth = BLOG_SCHEDULE[plan] || 2;

  const publishedThisMonth = await getPublishedThisMonth(client.id);
  const pendingCount = await getPendingBlogCount(client.id);

  const totalCovered = publishedThisMonth + pendingCount;
  const blogsNeeded = Math.max(0, blogsPerMonth - totalCovered);

  if (blogsNeeded === 0) {
    console.log(`@${client.name} — blog quota met for this month (${publishedThisMonth} published, ${pendingCount} pending)`);
    return 0;
  }

  console.log(`${client.name} — needs ${blogsNeeded} more blog(s) this month`);

  let written = 0;
  for (let i = 0; i < blogsNeeded; i++) {
    const topicIndex = (publishedThisMonth + pendingCount + i) % TOPIC_TEMPLATES.length;
    const topic = generateTopicForClient(client, topicIndex);

    const blogType = i % 2 === 0 ? 'local_seo' : 'listicle';

    const blog = await writeBlog({
      clientId: client.id,
      restaurantName: client.name,
      topic: topic,
      blogType: blogType,
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

async function run(mode = 'schedule') {
  console.log(`📅 Blog scheduler running — mode: ${mode}`);

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
        `Generated ${totalWritten} new blog draft(s)\n` +
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

module.exports = { run, scheduleBlogsForClient, publishScheduledBlogs };