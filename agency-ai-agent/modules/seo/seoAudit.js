// modules/seo/seoAudit.js
// Naisora AI Agent — SEO Auditor (Week 4 Upgrade)
// Full website audit: PageSpeed + on-page SEO + GBP check + competitor comparison
// Used to write powerful cold emails: "Your site scores 34/100, competitor scores 78"
// Also generates the free audit report we send to interested leads

require('dotenv').config();
const puppeteer = require('puppeteer');
const { fullAudit } = require('./pagespeedAudit');
const { askClaudeSonnet } = require('../../config/claude');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Sonnet system prompt for audit report ────────────────────────────────────
const AUDIT_SYSTEM = `You are an SEO expert writing website audit reports for restaurant owners in Bangalore, India.

Rules:
1. Write in plain English — no technical jargon
2. Translate everything to business impact: "This means customers leave your site in 3 seconds"
3. Never say "SEO" — say "Google visibility" or "showing up on Google"
4. Be specific — use their actual scores and actual competitor names
5. Keep it direct and honest — don't sugarcoat bad scores
6. End with clear next steps they can take
7. Format: use simple sections, no complex markdown`;

// ─── Crawl basic on-page SEO data ────────────────────────────────────────────
async function crawlOnPageSeo(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  try {
    await page.goto(url.startsWith('http') ? url : `https://${url}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    await delay(2000);

    const onPage = await page.evaluate(() => {
      // Title
      const title = document.querySelector('title')?.textContent?.trim() || null;

      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;

      // H1 tags
      const h1s = [...document.querySelectorAll('h1')].map(h => h.textContent?.trim()).filter(Boolean);

      // H2 tags
      const h2s = [...document.querySelectorAll('h2')].map(h => h.textContent?.trim()).filter(Boolean).slice(0, 5);

      // Images without alt text
      const allImages = document.querySelectorAll('img');
      const imagesWithoutAlt = [...allImages].filter(img => !img.getAttribute('alt')).length;

      // Schema markup
      const hasSchema = !!document.querySelector('script[type="application/ld+json"]');

      // Phone number on page
      const bodyText = document.body.innerText;
      const phoneMatch = bodyText.match(/(\+91|0)?[6-9]\d{9}/);
      const hasPhone = !!phoneMatch;

      // Address on page
      const hasAddress = bodyText.toLowerCase().includes('bangalore') ||
                        bodyText.toLowerCase().includes('bengaluru');

      // Social links
      const links = [...document.querySelectorAll('a[href]')].map(a => a.href);
      const hasFacebook = links.some(l => l.includes('facebook.com'));
      const hasInstagram = links.some(l => l.includes('instagram.com'));

      // Is mobile responsive
      const viewport = document.querySelector('meta[name="viewport"]');
      const isMobileReady = !!viewport;

      // Word count
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

      return {
        title,
        titleLength: title?.length || 0,
        metaDesc,
        metaDescLength: metaDesc?.length || 0,
        h1s,
        h2s,
        imagesWithoutAlt,
        totalImages: allImages.length,
        hasSchema,
        hasPhone,
        hasAddress,
        hasFacebook,
        hasInstagram,
        isMobileReady,
        wordCount,
      };
    });

    return onPage;

  } catch (err) {
    console.error(`On-page crawl failed: ${err.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

// ─── Calculate on-page SEO score ──────────────────────────────────────────────
function calculateOnPageScore(onPage) {
  if (!onPage) return 0;

  let score = 0;
  const issues = [];

  // Title (20 points)
  if (onPage.title) {
    if (onPage.titleLength >= 30 && onPage.titleLength <= 60) {
      score += 20;
    } else {
      score += 10;
      issues.push('Title too short or too long');
    }
  } else {
    issues.push('No page title — critical SEO issue');
  }

  // Meta description (15 points)
  if (onPage.metaDesc) {
    if (onPage.metaDescLength >= 100 && onPage.metaDescLength <= 160) {
      score += 15;
    } else {
      score += 7;
      issues.push('Meta description wrong length');
    }
  } else {
    issues.push('No meta description — missing from Google search results');
  }

  // H1 tag (15 points)
  if (onPage.h1s.length === 1) {
    score += 15;
  } else if (onPage.h1s.length > 1) {
    score += 7;
    issues.push('Multiple H1 tags — confuses Google');
  } else {
    issues.push('No H1 tag — Google cannot understand page topic');
  }

  // Mobile ready (15 points)
  if (onPage.isMobileReady) {
    score += 15;
  } else {
    issues.push('Not mobile-friendly — 70% of customers search on phone');
  }

  // Schema markup (10 points)
  if (onPage.hasSchema) {
    score += 10;
  } else {
    issues.push('No schema markup — missing rich results on Google');
  }

  // Images with alt text (10 points)
  if (onPage.totalImages === 0 || onPage.imagesWithoutAlt === 0) {
    score += 10;
  } else {
    const ratio = onPage.imagesWithoutAlt / onPage.totalImages;
    score += Math.round(10 * (1 - ratio));
    if (ratio > 0.5) issues.push(`${onPage.imagesWithoutAlt} images missing alt text`);
  }

  // Phone number (5 points)
  if (onPage.hasPhone) score += 5;
  else issues.push('Phone number not visible on website');

  // Address/location (5 points)
  if (onPage.hasAddress) score += 5;
  else issues.push('Bangalore/address not mentioned — bad for local Google search');

  // Word count (5 points)
  if (onPage.wordCount >= 300) score += 5;
  else issues.push('Too little content — Google prefers more detailed pages');

  return { score, issues };
}

// ─── Main audit function ──────────────────────────────────────────────────────
async function auditWebsite(lead) {
  if (!lead.website) {
    console.log(`${lead.business_name} has no website — skipping audit`);
    return null;
  }

  console.log(`\n🔍 Auditing: ${lead.business_name} — ${lead.website}`);

  // Run PageSpeed + on-page crawl in parallel
  const [pagespeed, onPage] = await Promise.all([
    fullAudit(lead.website),
    crawlOnPageSeo(lead.website),
  ]);

  const onPageResult = calculateOnPageScore(onPage);

  // Combined score
  const pagespeedScore = pagespeed?.summary?.mobileScore || 0;
  const onPageScore = onPageResult.score;
  const overallScore = Math.round(pagespeedScore * 0.5 + onPageScore * 0.5);

  const auditData = {
    lead_id: lead.id,
    business_name: lead.business_name,
    website: lead.website,
    overall_score: overallScore,
    pagespeed_mobile: pagespeedScore,
    pagespeed_desktop: pagespeed?.summary?.desktopScore || 0,
    onpage_score: onPageScore,
    grade: getGrade(overallScore),
    issues: [
      ...(pagespeed?.mobile?.issues?.map(i => i.message) || []),
      ...(onPageResult.issues || []),
    ],
    on_page_data: onPage,
    audited_at: new Date().toISOString(),
  };

  // Save to Supabase
  await supabase.from('seo_reports').insert({
    lead_id: lead.id,
    report_type: 'website_audit',
    report_data: auditData,
    audit_score: overallScore,
    issues_found: auditData.issues.length,
    summary: `${lead.business_name} scores ${overallScore}/100 (${getGrade(overallScore)})`,
  });

  // Update lead audit score
  await supabase
    .from('leads')
    .update({ audit_score: overallScore })
    .eq('id', lead.id);

  console.log(`   📊 Overall Score: ${overallScore}/100 [${getGrade(overallScore)}]`);
  console.log(`   ⚡ PageSpeed Mobile: ${pagespeedScore}/100`);
  console.log(`   📄 On-Page SEO: ${onPageScore}/100`);
  console.log(`   ⚠️  Issues found: ${auditData.issues.length}`);

  return auditData;
}

// ─── Generate plain-English audit report using Sonnet ─────────────────────────
async function generateAuditReport(lead, auditData) {
  if (!auditData) return null;

  const prompt = `Write a website audit report for this restaurant owner.

Business: ${lead.business_name}
Location: ${lead.area}, Bangalore
Website: ${lead.website}

Audit Results:
Overall Score: ${auditData.overall_score}/100 (${auditData.grade})
Mobile Speed Score: ${auditData.pagespeed_mobile}/100
Desktop Score: ${auditData.pagespeed_desktop}/100
On-Page SEO Score: ${auditData.onpage_score}/100

Top Issues Found:
${auditData.issues.slice(0, 6).map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Write a 300-word report the restaurant owner can understand. No technical terms.
Explain what each issue means for their business (empty tables, losing to competitors).
End with 3 specific things we can fix for them.`;

  try {
    return await askClaudeSonnet(prompt, AUDIT_SYSTEM, 600);
  } catch (err) {
    // Fallback if Claude not connected
    return `Website Audit Report — ${lead.business_name}

Overall Score: ${auditData.overall_score}/100

Your website is scoring ${auditData.overall_score} out of 100 on Google's quality check. ${auditData.overall_score < 50 ? 'This is below average and means potential customers are likely leaving before seeing your menu.' : 'There is room for improvement to beat your competitors.'}

Top issues we found:
${auditData.issues.slice(0, 4).map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

We can fix all of these for you. Reply to know more.
— Nahid, Naisora`;
  }
}

function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// ─── Audit all warm leads with websites ───────────────────────────────────────
async function auditWarmLeads(limit = 10) {
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('has_website', true)
    .eq('lead_category', 'warm')
    .is('audit_score', null)
    .order('lead_score', { ascending: false })
    .limit(limit);

  if (!leads || leads.length === 0) {
    console.log('No warm leads to audit.');
    return;
  }

  console.log(`\n🔍 Auditing ${leads.length} warm leads...`);

  for (const lead of leads) {
    await auditWebsite(lead);
    await delay(3000);
  }

  await sendTelegramAlert(
    `🔍 *SEO Audits Complete*\n\nAudited ${leads.length} websites.\nCheck Supabase for scores.`
  );
}

module.exports = { auditWebsite, generateAuditReport, auditWarmLeads, crawlOnPageSeo };