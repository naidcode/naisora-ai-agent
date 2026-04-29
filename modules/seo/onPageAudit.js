// modules/seo/onPageAudit.js
// Full on-page SEO audit for client websites

require('dotenv').config();
const { launchBrowser } = require('../../config/puppeteer');
const { route } = require('../../config/llmRouter');

async function runOnPageAudit(url) {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url.startsWith('http') ? url : `https://${url}`, {
      waitUntil: 'domcontentloaded', timeout: 60000
    });

    const data = await page.evaluate(() => {
      const title = document.title;
      const meta = document.querySelector('meta[name="description"]')?.content;
      const h1s = [...document.querySelectorAll('h1')].map(h => h.textContent.trim());
      const h2s = [...document.querySelectorAll('h2')].map(h => h.textContent.trim()).slice(0, 5);
      const images = [...document.querySelectorAll('img')];
      const noAlt = images.filter(i => !i.alt).length;
      const hasSchema = !!document.querySelector('script[type="application/ld+json"]');
      const canonical = document.querySelector('link[rel="canonical"]')?.href;
      const links = [...document.querySelectorAll('a[href]')].length;
      const wordCount = document.body.innerText.split(/\s+/).length;

      return { title, meta, h1s, h2s, noAlt, totalImages: images.length, hasSchema, canonical, links, wordCount };
    });

    const issues = [];
    if (!data.title) issues.push({ type: 'critical', issue: 'Missing page title' });
    if (data.title && data.title.length > 60) issues.push({ type: 'warning', issue: 'Title too long (over 60 chars)' });
    if (!data.meta) issues.push({ type: 'critical', issue: 'Missing meta description' });
    if (data.h1s.length === 0) issues.push({ type: 'critical', issue: 'No H1 tag found' });
    if (data.h1s.length > 1) issues.push({ type: 'warning', issue: `Multiple H1 tags (${data.h1s.length})` });
    if (data.noAlt > 0) issues.push({ type: 'warning', issue: `${data.noAlt} images missing alt text` });
    if (!data.hasSchema) issues.push({ type: 'warning', issue: 'No schema markup found' });
    if (!data.canonical) issues.push({ type: 'info', issue: 'No canonical URL set' });
    if (data.wordCount < 300) issues.push({ type: 'warning', issue: 'Low word count — add more content' });

    return { url, ...data, issues, score: Math.max(0, 100 - issues.length * 10) };
  } finally {
    await browser.close();
  }
}

module.exports = { runOnPageAudit };