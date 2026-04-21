// modules/wordpress/wpConnector.js
// Naisora AI Agent — WordPress Connector
// Connects to client WordPress sites via REST API
// Used for: publishing blogs, updating meta tags, checking site health
// Each client has their own WP credentials stored in Supabase

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Get WordPress client for a site ─────────────────────────────────────────
function getWpClient(siteUrl, username, appPassword) {
  const baseUrl = siteUrl.replace(/\/$/, ''); // remove trailing slash
  const apiBase = `${baseUrl}/wp-json/wp/v2`;

  // WordPress Application Password auth (Base64 encoded)
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };

  return { apiBase, headers, baseUrl };
}

// ─── Test connection to a WordPress site ─────────────────────────────────────
async function testConnection(siteUrl, username, appPassword) {
  const { apiBase, headers } = getWpClient(siteUrl, username, appPassword);

  try {
    const response = await axios.get(`${apiBase}/users/me`, { headers, timeout: 10000 });
    console.log(`✅ WordPress connected: ${siteUrl}`);
    console.log(`   User: ${response.data.name} (${response.data.roles?.join(', ')})`);
    return { success: true, user: response.data };
  } catch (err) {
    console.error(`❌ WordPress connection failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─── Create a blog post as draft ──────────────────────────────────────────────
async function createDraftPost(siteUrl, username, appPassword, postData) {
  const { apiBase, headers } = getWpClient(siteUrl, username, appPassword);

  const payload = {
    title: postData.title,
    content: postData.content,
    status: 'draft',                    // always draft — you approve before publish
    excerpt: postData.excerpt || '',
    categories: postData.categories || [],
    tags: postData.tags || [],
    meta: {
      _yoast_wpseo_title: postData.seoTitle || postData.title,
      _yoast_wpseo_metadesc: postData.metaDescription || '',
      _yoast_wpseo_focuskw: postData.focusKeyword || '',
    },
  };

  try {
    const response = await axios.post(`${apiBase}/posts`, payload, { headers, timeout: 15000 });
    console.log(`✅ Draft created: "${postData.title}"`);
    console.log(`   Post ID: ${response.data.id}`);
    console.log(`   Edit URL: ${siteUrl}/wp-admin/post.php?post=${response.data.id}&action=edit`);
    return { success: true, postId: response.data.id, editUrl: `${siteUrl}/wp-admin/post.php?post=${response.data.id}&action=edit` };
  } catch (err) {
    console.error(`❌ Failed to create draft: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─── Publish a draft post ─────────────────────────────────────────────────────
async function publishPost(siteUrl, username, appPassword, postId) {
  const { apiBase, headers } = getWpClient(siteUrl, username, appPassword);

  try {
    const response = await axios.post(
      `${apiBase}/posts/${postId}`,
      { status: 'publish' },
      { headers, timeout: 10000 }
    );
    console.log(`✅ Post published: ${response.data.link}`);
    return { success: true, url: response.data.link };
  } catch (err) {
    console.error(`❌ Failed to publish post ${postId}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─── Update page meta (title + description) ───────────────────────────────────
async function updatePageMeta(siteUrl, username, appPassword, pageId, metaData) {
  const { apiBase, headers } = getWpClient(siteUrl, username, appPassword);

  const payload = {
    meta: {
      _yoast_wpseo_title: metaData.seoTitle || '',
      _yoast_wpseo_metadesc: metaData.metaDescription || '',
      _yoast_wpseo_focuskw: metaData.focusKeyword || '',
    },
  };

  // Also update the page title if provided
  if (metaData.title) {
    payload.title = metaData.title;
  }

  try {
    await axios.post(`${apiBase}/pages/${pageId}`, payload, { headers, timeout: 10000 });
    console.log(`✅ Meta updated for page ${pageId}`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Failed to update meta: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─── Get all pages from a WordPress site ──────────────────────────────────────
async function getAllPages(siteUrl, username, appPassword) {
  const { apiBase, headers } = getWpClient(siteUrl, username, appPassword);

  try {
    const response = await axios.get(`${apiBase}/pages?per_page=50`, { headers, timeout: 10000 });
    return response.data.map(page => ({
      id: page.id,
      title: page.title?.rendered,
      slug: page.slug,
      link: page.link,
      status: page.status,
    }));
  } catch (err) {
    console.error(`❌ Failed to get pages: ${err.message}`);
    return [];
  }
}

// ─── Get all posts from a WordPress site ──────────────────────────────────────
async function getAllPosts(siteUrl, username, appPassword, status = 'publish') {
  const { apiBase, headers } = getWpClient(siteUrl, username, appPassword);

  try {
    const response = await axios.get(
      `${apiBase}/posts?per_page=20&status=${status}`,
      { headers, timeout: 10000 }
    );
    return response.data.map(post => ({
      id: post.id,
      title: post.title?.rendered,
      slug: post.slug,
      link: post.link,
      date: post.date,
      status: post.status,
    }));
  } catch (err) {
    console.error(`❌ Failed to get posts: ${err.message}`);
    return [];
  }
}

// ─── Check site health ────────────────────────────────────────────────────────
async function checkSiteHealth(siteUrl, username, appPassword) {
  const { headers, baseUrl } = getWpClient(siteUrl, username, appPassword);

  try {
    const response = await axios.get(
      `${baseUrl}/wp-json/wp-site-health/v1/tests`,
      { headers, timeout: 10000 }
    );
    return response.data;
  } catch (err) {
    // Site health API may not be available on all sites
    return null;
  }
}

// ─── Save client WordPress credentials to Supabase ────────────────────────────
async function saveClientCredentials(leadId, siteUrl, username, appPassword) {
  const { error } = await supabase
    .from('clients')
    .update({
      wp_site_url: siteUrl,
      wp_username: username,
      wp_app_password: appPassword, // store encrypted in production
    })
    .eq('lead_id', leadId);

  if (error) {
    console.error('Failed to save WP credentials:', error.message);
    return false;
  }

  console.log(`✅ WordPress credentials saved for lead ${leadId}`);
  return true;
}

module.exports = {
  testConnection,
  createDraftPost,
  publishPost,
  updatePageMeta,
  getAllPages,
  getAllPosts,
  checkSiteHealth,
  saveClientCredentials,
  getWpClient,
};