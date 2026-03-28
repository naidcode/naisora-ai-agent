// modules/seo/pagespeedAudit.js
// Naisora AI Agent — PageSpeed Auditor
// Uses Google PageSpeed Insights API (free, no key needed)
// Returns mobile + desktop scores, Core Web Vitals, specific issues
// Used in cold emails: "Your website scores 34/100 on Google"

require('dotenv').config();
const axios = require('axios');

const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// ─── Run PageSpeed audit for a URL ───────────────────────────────────────────
async function auditUrl(url, strategy = 'mobile') {
  if (!url) return null;

  const fullUrl = url.startsWith('http') ? url : `https://${url}`;

  try {
    const response = await axios.get(PAGESPEED_API, {
      params: {
        url: fullUrl,
        strategy, // mobile or desktop
        category: ['performance', 'seo', 'accessibility', 'best-practices'],
      },
      timeout: 30000,
    });

    const data = response.data;
    const categories = data.lighthouseResult?.categories;
    const audits = data.lighthouseResult?.audits;

    if (!categories) return null;

    // ── Extract scores (0-100) ──
    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
    };

    // ── Overall score (weighted) ──
    const overall = Math.round(
      scores.performance * 0.4 +
      scores.seo * 0.3 +
      scores.accessibility * 0.15 +
      scores.bestPractices * 0.15
    );

    // ── Core Web Vitals ──
    const vitals = {
      fcp: audits?.['first-contentful-paint']?.displayValue || 'N/A',
      lcp: audits?.['largest-contentful-paint']?.displayValue || 'N/A',
      tbt: audits?.['total-blocking-time']?.displayValue || 'N/A',
      cls: audits?.['cumulative-layout-shift']?.displayValue || 'N/A',
      si: audits?.['speed-index']?.displayValue || 'N/A',
    };

    // ── Key issues (failed audits) ──
    const issues = [];

    const checkAudit = (key, message) => {
      const audit = audits?.[key];
      if (audit && audit.score !== null && audit.score < 0.9) {
        issues.push({
          type: key,
          message,
          score: audit.score,
          severity: audit.score < 0.5 ? 'high' : 'medium',
        });
      }
    };

    checkAudit('render-blocking-resources', 'Render-blocking resources slowing page load');
    checkAudit('uses-optimized-images', 'Images not optimised — too large');
    checkAudit('uses-responsive-images', 'Images not responsive for mobile');
    checkAudit('unused-css-rules', 'Unused CSS code slowing the site');
    checkAudit('unused-javascript', 'Unused JavaScript slowing the site');
    checkAudit('uses-text-compression', 'Text files not compressed (GZIP missing)');
    checkAudit('uses-long-cache-ttl', 'Browser caching not configured');
    checkAudit('document-title', 'Page title missing or poor');
    checkAudit('meta-description', 'Meta description missing');
    checkAudit('link-text', 'Links have non-descriptive text');
    checkAudit('image-alt', 'Images missing alt text (bad for SEO)');
    checkAudit('viewport', 'Viewport not configured for mobile');
    checkAudit('font-size', 'Font too small for mobile');
    checkAudit('tap-targets', 'Buttons too small for mobile touch');
    checkAudit('is-on-https', 'Site not on HTTPS — security issue');
    checkAudit('canonical', 'Canonical URL not set');
    checkAudit('structured-data', 'No structured data / schema markup');

    // Sort by severity
    issues.sort((a, b) => a.score - b.score);

    return {
      url: fullUrl,
      strategy,
      overall,
      scores,
      vitals,
      issues: issues.slice(0, 8), // top 8 issues only
      grade: getGrade(overall),
      rawData: null, // don't store raw data — too large
    };

  } catch (err) {
    console.error(`PageSpeed audit failed for ${url}: ${err.message}`);
    return null;
  }
}

// ─── Get letter grade from score ──────────────────────────────────────────────
function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// ─── Run both mobile + desktop audits ────────────────────────────────────────
async function fullAudit(url) {
  console.log(`\n⚡ Running PageSpeed audit: ${url}`);

  const [mobile, desktop] = await Promise.all([
    auditUrl(url, 'mobile'),
    auditUrl(url, 'desktop'),
  ]);

  if (!mobile && !desktop) {
    return null;
  }

  const result = {
    url,
    mobile: mobile || null,
    desktop: desktop || null,
    summary: {
      mobileScore: mobile?.overall || 0,
      desktopScore: desktop?.overall || 0,
      grade: mobile ? getGrade(mobile.overall) : 'N/A',
      topIssues: mobile?.issues?.slice(0, 3).map(i => i.message) || [],
      auditedAt: new Date().toISOString(),
    },
  };

  console.log(`   📱 Mobile: ${result.summary.mobileScore}/100 [${result.summary.grade}]`);
  console.log(`   🖥️  Desktop: ${result.summary.desktopScore}/100`);
  console.log(`   ⚠️  Issues: ${result.summary.topIssues.length}`);

  return result;
}

// ─── Quick score only (for lead scoring — no full details needed) ─────────────
async function getQuickScore(url) {
  const result = await auditUrl(url, 'mobile');
  return result?.overall || null;
}

module.exports = { fullAudit, getQuickScore, auditUrl };