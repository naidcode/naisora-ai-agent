// ═══════════════════════════════════════════════════════════════
// NAISORA AGENT — MANUAL COMMAND REFERENCE
// Fixed env loader — bypasses dotenv which corrupts API keys on Windows
// Run: node test.js
// ═══════════════════════════════════════════════════════════════

// Load .env directly — dotenv was adding hidden \r characters to keys
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
envContent.split('\n').forEach(line => {
  const cleaned = line.replace(/\r/g, '').trim();
  if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
    const [key, ...rest] = cleaned.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  }
});

async function runTest() {
  const url = 'https://naisora.com';
  
  console.log(`\n================================`);
  console.log(`🚀 RUNNING FULL SEO AUDIT`);
  console.log(`================================`);
  
  try {
    // 1. Full SEO audit (On-page)
    const { auditWebsite } = require('./modules/seo/seoAudit');
    console.log(`\n🔍 1. Running On-page SEO audit for ${url}...`);
    await auditWebsite({ website: url, name: 'Naisora' });
    console.log(`✅ On-page audit complete.`);
  } catch (err) {
    console.error('❌ On-page audit failed:', err);
  }

  try {
    // 2. Technical SEO
    const { runTechnicalAudit } = require('./modules/seo/technicalAudit');
    console.log(`\n⚙️ 2. Running Technical SEO audit for ${url}...`);
    await runTechnicalAudit(url);
    console.log(`✅ Technical audit complete.`);
  } catch (err) {
    console.error('❌ Technical audit failed:', err);
  }

  try {
    // 3. PageSpeed
    const { fullAudit } = require('./modules/seo/pagespeedAudit');
    console.log(`\n⚡ 3. Checking speed for ${url}...`);
    const result = await fullAudit(url);
    console.log('\n--- PageSpeed Full Result ---');
    console.log(JSON.stringify(result, null, 2));
    console.log(`✅ Speed check complete.`);
  } catch (err) {
    console.error('❌ Speed check failed:', err);
  }
  
  console.log(`\n🎉 FULL AUDIT COMPLETE`);
}

runTest().catch(console.error);

// const { createClient } = require('@supabase/supabase-js');
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// const { data } = await supabase
//   .from('leads')
//   .select('business_name, website, email')
//   .not('website', 'is', null)
//   .is('email', null)
//   .limit(10);

// console.log('Leads with website but no email:', data?.length);
// data?.forEach(l => console.log('-', l.business_name, '|', l.website));
// ═══════════════════════════════════════════════════════════════
// SEO
// ═══════════════════════════════════════════════════════════════

// On-page SEO audit — sends full report to Telegram
// const { crawlOnPageSeo } = require('./modules/seo/seoAudit');
// await crawlOnPageSeo('https://naisora.com');

// Full SEO audit
// const { auditWebsite } = require('./modules/seo/seoAudit');
// await auditWebsite({ website: 'https://naisora.com', name: 'Naisora' });

// PageSpeed — full mobile + desktop
// const { fullAudit } = require('./modules/seo/pagespeedAudit');
// await fullAudit('https://naisora.com');

// PageSpeed — quick score only
// const { getQuickScore } = require('./modules/seo/pagespeedAudit');
// const score = await getQuickScore('https://naisora.com');
// console.log('Score:', score);

// Technical SEO
// const { runTechnicalAudit } = require('./modules/seo/technicalAudit');
// await runTechnicalAudit('https://naisora.com');

// Keyword research
// const { researchKeywords } = require('./modules/seo/keywordResearch');
// await researchKeywords({ restaurantName: 'Naisora', area: 'Bangalore', cuisine: 'web design agency' });

// Keyword autocomplete
// const { getAutocomplete } = require('./modules/seo/keywordResearch');
// await getAutocomplete('restaurant website bangalore');

// Schema — local business
// const { generateLocalBusinessSchema } = require('./modules/seo/schemaGenerator');
// await generateLocalBusinessSchema({ name: 'Naisora', url: 'https://naisora.com' });

// Sitemap check
// const { checkSitemap } = require('./modules/seo/sitemapManager');
// await checkSitemap('https://naisora.com');

// Ping Google and Bing
// const { pingSearchEngines } = require('./modules/seo/sitemapManager');
// await pingSearchEngines('https://naisora.com/sitemap.xml');

// Weekly SEO engine — all clients
// const { runWeeklySeoForAllClients } = require('./modules/seo/weeklySeoEngine');
// await runWeeklySeoForAllClients();


// ═══════════════════════════════════════════════════════════════
// CONTENT / BLOG
// ═══════════════════════════════════════════════════════════════

// Write local SEO blog
// const { run } = require('./modules/content/blogWriter');
// await run({ clientId: 'naisora', restaurantName: 'Naisora Agency', topic: 'Why every restaurant in Bangalore needs a website in 2026', blogType: 'local_seo', area: 'Bangalore' });

// Write listicle blog
// const { run } = require('./modules/content/blogWriter');
// await run({ clientId: 'naisora', restaurantName: 'Naisora Agency', topic: '7 things every restaurant website must have', blogType: 'listicle', area: 'Bangalore' });

// Publish approved blogs
// const { publishApprovedDrafts } = require('./modules/wordpress/blogPublisher');
// await publishApprovedDrafts();


// ═══════════════════════════════════════════════════════════════
// SOCIAL MEDIA
// ═══════════════════════════════════════════════════════════════

// Analyse personal Instagram
// const { run } = require('./modules/social/socialAnalyser');
// await run('@nahidpasha01');

// Analyse agency Instagram
// const { run } = require('./modules/social/socialAnalyser');
// await run('@naisora.official');

// Weekly content plan — all accounts
// const { run } = require('./modules/social/contentPlanner');
// await run();

// Reel ideas — personal brand
// const { generateReelIdeas } = require('./modules/social/reelIdeasGenerator');
// await generateReelIdeas('nahidpasha01 — web design and AI agency Bangalore');

// Hashtags
// const { researchHashtags } = require('./modules/social/hashtagResearcher');
// await researchHashtags('restaurant web design Bangalore');

// Post writer — Instagram caption
// const { run } = require('./modules/social/postWriter');
// await run({ format: 'instagram_caption', topic: 'How I built an AI agent in 30 days', account: 'nahidpasha01' });

// Post writer — LinkedIn story
// const { run } = require('./modules/social/postWriter');
// await run({ format: 'linkedin_story', topic: 'Why I chose restaurants as my niche at 20', account: 'nahid-pasha' });

// Competitor social spy
// const { analyseCompetitorStrategy } = require('./modules/social/competitorSocialSpy');
// await analyseCompetitorStrategy('@competitoragency');


// ═══════════════════════════════════════════════════════════════
// OUTREACH
// ═══════════════════════════════════════════════════════════════

// WhatsApp — send to all hot leads
// const { sendDailyWhatsApp } = require('./modules/outreach/whatsappSender');
// await sendDailyWhatsApp();

// Check all replies now
// const { checkReplies } = require('./modules/outreach/replyReader');
// await checkReplies();

// Daily priority report
// const { generateDailyPriorities } = require('./modules/outreach/leadScorer');
// await generateDailyPriorities();


// ═══════════════════════════════════════════════════════════════
// EMAIL
// ═══════════════════════════════════════════════════════════════

// Send cold emails
// const { sendDailyColdEmails } = require('./modules/email/emailSender');
// await sendDailyColdEmails();

// Preview cold email for one lead
// const { writeEmail } = require('./modules/email/emailWriter');
// const email = await writeEmail({ name: 'Kaafi Restaurant', address: 'Indiranagar, Bangalore', seo_score: 34 });
// console.log('SUBJECT:', email.subject);
// console.log('\nBODY:\n', email.body);


// ═══════════════════════════════════════════════════════════════
// SCRAPER
// ═══════════════════════════════════════════════════════════════

// Scrape Google Maps
// const { runFullScrape } = require('./modules/scraper/googleMapsScraper');
// await runFullScrape({ areas: ['Koramangala'], searchTypes: ['restaurants'], maxPerSearch: 15 });

// Get hot leads
// const { getHotLeads } = require('./modules/scraper/leadProcessor');
// const leads = await getHotLeads();
// console.log('Hot leads:', leads.length);


// ═══════════════════════════════════════════════════════════════
// INTELLIGENCE
// ═══════════════════════════════════════════════════════════════

// Competitor tracker
// const { generateCompetitorReport } = require('./modules/intelligence/competitorTracker');
// await generateCompetitorReport('web design agency restaurants Bangalore');

// Chained reasoning — lead qualify
// const { run } = require('./modules/intelligence/chainedReasoning');
// await run({ chainType: 'lead_qualify', context: 'Restaurant: Kaafi, Area: Indiranagar, Score: 72' });

// Self improver
// const { analyseOutreachPerformance } = require('./modules/intelligence/selfImprover');
// await analyseOutreachPerformance();


// ═══════════════════════════════════════════════════════════════
// CLIENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Onboard new client
// const { onboardClient } = require('./modules/client/onboarding');
// await onboardClient({ name: 'Kaafi Restaurant', url: 'https://kaafi.in', phone: '+919800000000', email: 'owner@kaafi.in', area: 'Indiranagar', plan: 'growth' });

// Create invoice
// const { createInvoice } = require('./modules/client/invoiceGenerator');
// await createInvoice({ clientId: 'kaafi-id', amount: 8000, service: 'Restaurant Website', type: 'one-time' });

// Quarterly review
// const { run } = require('./modules/client/quarterlyPreparer');
// await run('kaafi-client-id');

// CA export
// const { run } = require('./modules/client/caExport');
// await run();


// ═══════════════════════════════════════════════════════════════
// REPORTING
// ═══════════════════════════════════════════════════════════════

// Monthly PDF report
// const { run } = require('./modules/reporting/monthlyPdfReport');
// await run('kaafi-client-id');

// Dashboard
// const { generateDashboard } = require('./modules/tracking/dashboard');
// await generateDashboard();

// Financial summary
// const { weeklyFinancialSummary } = require('./modules/reporting/financialTracker');
// await weeklyFinancialSummary();

// Model cost report
// const { run } = require('./modules/reporting/modelOptimiser');
// await run();


// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK — run every morning after 11 AM
// ═══════════════════════════════════════════════════════════════

// const { createClient } = require('@supabase/supabase-js');
// const { sendMessage } = require('./config/telegram');
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// const today = new Date(); today.setHours(0,0,0,0);
// const { data: waToday } = await supabase.from('outreach_log').select('*').eq('channel','whatsapp').gte('created_at', today.toISOString());
// const { data: emailToday } = await supabase.from('outreach_log').select('*').eq('channel','email').gte('created_at', today.toISOString());
// const { data: hotLeads } = await supabase.from('leads').select('*').eq('lead_category','hot').eq('outreach_status','new');
// const { data: total } = await supabase.from('leads').select('*', { count: 'exact' });
// await sendMessage(`🔍 *NAISORA HEALTH CHECK*\n\n✅ WhatsApp sent today: ${waToday?.length || 0}\n✅ Emails sent today: ${emailToday?.length || 0}\n🔥 Hot leads ready: ${hotLeads?.length || 0}\n📊 Total leads: ${total?.length || 0}`);