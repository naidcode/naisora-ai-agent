// modules/seo/sitemapManager.js
// Checks and generates XML sitemaps

const axios = require('axios');

async function checkSitemap(siteUrl) {
  const url = siteUrl.replace(/\/$/, '');
  const locations = [`${url}/sitemap.xml`, `${url}/sitemap_index.xml`, `${url}/wp-sitemap.xml`];

  for (const loc of locations) {
    try {
      const res = await axios.get(loc, { timeout: 5000 });
      if (res.status === 200) {
        console.log(`✅ Sitemap found: ${loc}`);
        return { found: true, url: loc };
      }
    } catch {}
  }

  console.log('❌ No sitemap found');
  return { found: false, url: null };
}

async function pingSearchEngines(sitemapUrl) {
  const engines = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];

  for (const url of engines) {
    try {
      await axios.get(url, { timeout: 5000 });
      console.log(`✅ Pinged: ${url.split('?')[0]}`);
    } catch {}
  }
}

module.exports = { checkSitemap, pingSearchEngines };