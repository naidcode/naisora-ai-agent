// modules/seo/seoAudit.js
// Naisora AI Agent — SEO Auditor (Week 4 Upgrade)
// Full website audit: PageSpeed + on-page SEO + GBP check + competitor comparison
// Used to write powerful cold emails: "Your site scores 34/100, competitor scores 78"
// Also generates the free audit report we send to interested leads

// Load .env directly — dotenv was adding hidden \r characters to keys
const fs = require('fs');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const cleaned = line.replace(/\r/g, '').trim();
    if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
      const [key, ...rest] = cleaned.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const puppeteer = require('puppeteer');
const { fullAudit } = require('./pagespeedAudit');
const { askClaudeSonnet } = require('../../config/claude');
const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');

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
// Replace ONLY the crawlOnPageSeo function in your seoAudit.js
// Keep everything else exactly as it is

async function crawlOnPageSeo(url) {
  const { sendMessage } = require('../../config/telegram');

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: 'new'
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const result = await page.evaluate(() => {
      const title = document.title || '';
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim());
      const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim());
      const images = document.querySelectorAll('img');
      const imagesWithoutAlt = Array.from(images).filter(img => !img.alt || img.alt.trim() === '').length;
      const hasSchema = !!document.querySelector('script[type="application/ld+json"]');
      const bodyText = document.body?.innerText || '';
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
      const hasPhone = /(\+91|0)[- ]?[6-9]\d{9}/.test(bodyText);
      const hasAddress = /bangalore|bengaluru/i.test(bodyText);
      const hasInstagram = !!document.querySelector('a[href*="instagram"]');
      const hasFacebook = !!document.querySelector('a[href*="facebook"]');
      const isMobileReady = !!document.querySelector('meta[name="viewport"]');

      return {
        title,
        titleLength: title.length,
        metaDesc,
        metaDescLength: metaDesc.length,
        h1s,
        h2s,
        imagesWithoutAlt,
        totalImages: images.length,
        hasSchema,
        hasPhone,
        hasAddress,
        hasFacebook,
        hasInstagram,
        isMobileReady,
        wordCount
      };
    });

    await browser.close();

    // Score calculation
    let score = 100;
    const issues = [];
    const wins = [];

    if (result.h1s.length === 0) { score -= 15; issues.push('❌ No H1 tag found'); }
    else if (result.h1s.length > 1) { score -= 10; issues.push(`⚠️ Multiple H1 tags (${result.h1s.length}) — should be only 1`); }
    else { wins.push('✅ H1 tag correct'); }

    if (!result.metaDesc) { score -= 15; issues.push('❌ No meta description'); }
    else if (result.metaDescLength < 120) { score -= 5; issues.push(`⚠️ Meta description too short (${result.metaDescLength} chars) — aim for 150+`); }
    else { wins.push(`✅ Meta description good (${result.metaDescLength} chars)`); }

    if (result.titleLength < 30) { score -= 10; issues.push('❌ Title tag too short'); }
    else if (result.titleLength > 65) { score -= 5; issues.push(`⚠️ Title tag too long (${result.titleLength} chars) — keep under 60`); }
    else { wins.push(`✅ Title tag good (${result.titleLength} chars)`); }

    if (!result.hasSchema) { score -= 15; issues.push('❌ No schema markup — add JSON-LD'); }
    else { wins.push('✅ Schema markup found'); }

    if (!result.hasPhone) { score -= 10; issues.push('❌ No phone number found on page'); }
    else { wins.push('✅ Phone number found'); }

    if (result.imagesWithoutAlt > 0) { score -= 10; issues.push(`⚠️ ${result.imagesWithoutAlt} images missing alt text`); }
    else { wins.push('✅ All images have alt text'); }

    if (!result.isMobileReady) { score -= 10; issues.push('❌ Not mobile friendly — missing viewport meta'); }
    else { wins.push('✅ Mobile friendly'); }

    if (result.wordCount < 500) { score -= 10; issues.push(`⚠️ Low word count (${result.wordCount}) — aim for 800+`); }
    else { wins.push(`✅ Word count good (${result.wordCount})`); }

    if (!result.hasInstagram) { score -= 5; issues.push('⚠️ No Instagram link found'); }
    else { wins.push('✅ Instagram linked'); }

    score = Math.max(0, score);

    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';

    // Build clean Telegram message
    const message =
      `🔍 *SEO Audit Report*\n` +
      `🌐 ${url}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${scoreEmoji} *Score: ${score}/100*\n\n` +
      `📄 *Page Details*\n` +
      `Title: ${result.title}\n` +
      `Meta: ${result.metaDesc || 'Not found'}\n` +
      `H1 tags: ${result.h1s.length} found\n` +
      `Word count: ${result.wordCount}\n` +
      `Images: ${result.totalImages} total, ${result.imagesWithoutAlt} missing alt\n\n` +
      (issues.length > 0
        ? `🚨 *Issues to Fix (${issues.length}):*\n${issues.join('\n')}\n\n`
        : '') +
      (wins.length > 0
        ? `✅ *What is Working (${wins.length}):*\n${wins.join('\n')}\n\n`
        : '') +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Fix the issues above to improve your Google ranking.`;

    await sendMessage(message);
    console.log(`✅ SEO audit complete — Score: ${score}/100`);

    return result;

  } catch (error) {
    console.error('crawlOnPageSeo error:', error.message);
    const { sendMessage } = require('../../config/telegram');
    await sendMessage(`❌ *SEO Audit Failed*\nURL: ${url}\nError: ${error.message}`);
    throw error;
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

  // Send full performance result to Telegram
  try {
    const { sendMessage } = require('../../config/telegram');
    const speedEmoji = pagespeedScore >= 80 ? '🟢' : pagespeedScore >= 50 ? '🟡' : '🔴';
    const deskScore = pagespeed?.summary?.desktopScore || 0;
    const deskEmoji = deskScore >= 80 ? '🟢' : deskScore >= 50 ? '🟡' : '🔴';
    
    const finalMessage = 
      `🚀 *Full Performance Audit*\n` +
      `🌐 ${lead.website}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📊 *Overall Grade: ${getGrade(overallScore)}* (${overallScore}/100)\n\n` +
      `⚡ *Speed Metrics*\n` +
      `${speedEmoji} Mobile Score: ${pagespeedScore}/100\n` +
      `${deskEmoji} Desktop Score: ${deskScore}/100\n` +
      `Load Time (Mobile LCP): ${pagespeed?.mobile?.vitals?.lcp || 'N/A'}\n\n` +
      `📄 *On-Page SEO*\n` +
      `Score: ${onPageScore}/100\n\n` +
      (auditData.issues.length > 0
        ? `🚨 *Top Issues to Fix:*\n${auditData.issues.slice(0,3).map(i => '- ' + i).join('\n')}\n\n`
        : '') +
      `━━━━━━━━━━━━━━━━━━━━━━`;
      
    await sendMessage(finalMessage);
  } catch (err) {
    console.error('Failed to send final Telegram message:', err.message);
  }

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

  await sendMessage(
    `🔍 *SEO Audits Complete*\n\nAudited ${leads.length} websites.\nCheck Supabase for scores.`
  );
}

module.exports = { auditWebsite, generateAuditReport, auditWarmLeads, crawlOnPageSeo };