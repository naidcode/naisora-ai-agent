// modules/seo/technicalAudit.js
// Technical SEO checks

require('dotenv').config();
const axios = require('axios');

async function runTechnicalAudit(url) {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const issues = [];
  const checks = {};

  // Check HTTPS
  checks.https = fullUrl.startsWith('https://');
  if (!checks.https) issues.push({ type: 'critical', issue: 'Site not on HTTPS' });

  // Check robots.txt
  try {
    const robots = await axios.get(`${fullUrl}/robots.txt`, { timeout: 5000 });
    checks.robotsTxt = robots.status === 200;
  } catch {
    checks.robotsTxt = false;
    issues.push({ type: 'warning', issue: 'robots.txt not found' });
  }

  // Check sitemap
  try {
    const sitemap = await axios.get(`${fullUrl}/sitemap.xml`, { timeout: 5000 });
    checks.sitemap = sitemap.status === 200;
  } catch {
    checks.sitemap = false;
    issues.push({ type: 'warning', issue: 'sitemap.xml not found' });
  }

  // Check response time
  try {
    const start = Date.now();
    await axios.get(fullUrl, { timeout: 10000 });
    const responseTime = Date.now() - start;
    checks.responseTime = responseTime;
    if (responseTime > 3000) issues.push({ type: 'warning', issue: `Slow response time: ${responseTime}ms` });
  } catch {
    issues.push({ type: 'critical', issue: 'Site unreachable or very slow' });
  }

  return { url: fullUrl, checks, issues, score: Math.max(0, 100 - issues.length * 15) };
}

module.exports = { runTechnicalAudit };