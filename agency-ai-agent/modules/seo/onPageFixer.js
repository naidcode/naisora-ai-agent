// modules/seo/onPageFixer.js
// Fixes on-page SEO issues via WordPress REST API

const { route } = require('../../config/llmRouter');
const { updatePageMeta, getAllPages } = require('../wordpress/wpConnector');

async function fixOnPageIssues(client, auditData) {
  console.log(`\n🔧 Fixing on-page issues for ${client.business_name}...`);

  if (!client.wp_site_url) {
    console.log('❌ No WordPress credentials — cannot auto-fix');
    return;
  }

  const fixes = [];

  // Fix missing meta description
  if (!auditData.meta) {
    const prompt = `Write a 155-character meta description for this restaurant website.
Restaurant: ${client.business_name}, ${client.area}, Bangalore
Category: ${client.category || 'restaurant'}
Return only the meta description text.`;

    const metaDesc = await route('seo_audit', prompt, null, 100);

    const pages = await getAllPages(client.wp_site_url, client.wp_username, client.wp_app_password);
    if (pages.length > 0) {
      await updatePageMeta(client.wp_site_url, client.wp_username, client.wp_app_password, pages[0].id, {
        metaDescription: metaDesc.trim(),
        focusKeyword: `${client.category} ${client.area} Bangalore`,
      });
      fixes.push('Added meta description to homepage');
    }
  }

  console.log(`✅ Applied ${fixes.length} fixes`);
  return fixes;
}

module.exports = { fixOnPageIssues };