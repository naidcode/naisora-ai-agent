// require('dotenv').config();
// const { sendMessage } = require('./config/telegram');

// async function runTest() {
//   console.log('Running full agent health check...');

//   const results = [];

//   // 1. Check Supabase leads
//   const { createClient } = require('@supabase/supabase-js');
//   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

//   const { data: leads, error: leadsError } = await supabase
//     .from('leads')
//     .select('*', { count: 'exact' });

//   const { data: hotLeads } = await supabase
//     .from('leads')
//     .select('*')
//     .gte('score', 70);

//   const { data: emailSent } = await supabase
//     .from('leads')
//     .select('*')
//     .eq('email_sent', true);

//   const { data: whatsappSent } = await supabase
//     .from('leads')
//     .select('*')
//     .eq('whatsapp_sent', true);

//   const { data: outreachLog } = await supabase
//     .from('outreach_log')
//     .select('*')
//     .order('created_at', { ascending: false })
//     .limit(5);

//   const { data: clients } = await supabase
//     .from('clients')
//     .select('*')
//     .eq('status', 'active');

//   const { data: blogs } = await supabase
//     .from('blog_posts')
//     .select('*')
//     .eq('status', 'draft');

//   const totalLeads = leads?.length || 0;
//   const totalHot = hotLeads?.length || 0;
//   const totalEmailSent = emailSent?.length || 0;
//   const totalWhatsapp = whatsappSent?.length || 0;
//   const totalClients = clients?.length || 0;
//   const totalBlogs = blogs?.length || 0;

//   const message =
//     `🔍 *NAISORA AGENT HEALTH CHECK*\n` +
//     `📅 ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}\n` +
//     `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
//     `📊 *DATABASE STATUS*\n` +
//     `Total leads in DB: ${totalLeads}\n` +
//     `Hot leads (score 70+): ${totalHot}\n` +
//     `Emails sent: ${totalEmailSent}\n` +
//     `WhatsApp sent: ${totalWhatsapp}\n` +
//     `Active clients: ${totalClients}\n` +
//     `Blog drafts waiting: ${totalBlogs}\n\n` +
//     `📨 *LAST 5 OUTREACH ACTIONS*\n` +
//     (outreachLog && outreachLog.length > 0
//       ? outreachLog.map(log =>
//           `• ${log.channel || 'unknown'} → ${log.lead_id || 'N/A'} — ${log.status || 'N/A'} — ${new Date(log.created_at).toLocaleDateString('en-IN')}`
//         ).join('\n')
//       : 'No outreach logged yet') +
//     `\n\n` +
//     `${totalEmailSent === 0 ? '❌ NO EMAILS SENT YET — email outreach not working\n' : '✅ Emails are being sent\n'}` +
//     `${totalWhatsapp === 0 ? '❌ NO WHATSAPP SENT YET — check Twilio\n' : '✅ WhatsApp is working\n'}` +
//     `${totalLeads === 0 ? '❌ NO LEADS — scraper not working\n' : '✅ Scraper found leads\n'}` +
//     `${totalHot === 0 ? '⚠️ No hot leads yet — check lead scoring\n' : `✅ ${totalHot} hot leads ready\n`}` +
//     `━━━━━━━━━━━━━━━━━━━━━━\n` +
//     `Run this check anytime: node test.js`;

//   await sendMessage(message);
//   console.log('Health check sent to Telegram');
// }

// runTest().catch(console.error);

require('dotenv').config();

async function runTest() {
  // Inside runTest() in test.js

const { generateCompetitorReport } = require('./modules/intelligence/competitorTracker');

await generateCompetitorReport('web design agency restaurants Bangalore');
}

runTest().catch(console.error);
// require('dotenv').config();

// async function runTest() {
//   const { sendMessage } = require('./config/telegram');
//   const { createClient } = require('@supabase/supabase-js');
//   const twilio = require('twilio');

//   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
//   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

//   const { data: leads } = await supabase
//     .from('leads')
//     .select('*')
//     .eq('lead_category', 'hot')
//     .eq('outreach_status', 'new')
//     .limit(10);

//   console.log(`Sending to ${leads.length} leads...`);
//   let sent = 0;

//   for (const lead of leads) {
//     try {
//       const name = lead.business_name;
//       const area = lead.area || 'Bangalore';

//       const message = `Hi, I'm Nahid from Naisora. I checked ${name} online — you're not showing up when people search for restaurants in ${area}. Your competitor is taking those customers.\n\nWe fix this in 30 days. Can I send you a free audit report?\n\n— Nahid | naisora.com`;

//       await client.messages.create({
//         from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
//         to: `whatsapp:${lead.phone}`,
//         body: message
//       });

//       await supabase.from('leads').update({
//         whatsapp_sent: true,
//         outreach_status: 'contacted'
//       }).eq('id', lead.id);

//       console.log(`✅ Sent to ${name}`);
//       sent++;

//       await new Promise(r => setTimeout(r, 3000));
//     } catch (err) {
//       console.log(`❌ Failed ${lead.business_name}: ${err.message}`);
//     }
//   }

//   await sendMessage(
//     `📱 *WhatsApp Outreach Complete*\n\n` +
//     `Sent: ${sent}/${leads.length}\n` +
//     `Messages going to hot leads now.`
//   );
// }

// runTest().catch(console.error);
// ═══════════════════════════════════════════════════════════════
// SEO
// ═══════════════════════════════════════════════════════════════

// On-page SEO audit — sends full report to Telegram
// const { crawlOnPageSeo } = require('./modules/seo/seoAudit');
// await crawlOnPageSeo('https://naisora.com');

// Full SEO audit — comprehensive, saved to Supabase
// const { auditWebsite } = require('./modules/seo/seoAudit');
// await auditWebsite({ website: 'https://naisora.com', name: 'Naisora' });

// Generate audit report for a client
// const { generateAuditReport } = require('./modules/seo/seoAudit');
// await generateAuditReport({ clientId: 'your-client-id' });

// PageSpeed — full mobile + desktop
// const { fullAudit } = require('./modules/seo/pagespeedAudit');
// await fullAudit('https://naisora.com');

// PageSpeed — quick score only
// const { getQuickScore } = require('./modules/seo/pagespeedAudit');
// const score = await getQuickScore('https://naisora.com');
// console.log('Score:', score);

// Technical SEO — robots.txt, sitemap, HTTPS, redirects
// const { runTechnicalAudit } = require('./modules/seo/technicalAudit');
// await runTechnicalAudit('https://naisora.com');

// On-page audit — every page title, meta, H1, alt text
// const { runOnPageAudit } = require('./modules/seo/onPageAudit');
// await runOnPageAudit('https://naisora.com');

// On-page fixer — auto fixes via WordPress API
// const { fixOnPageIssues } = require('./modules/seo/onPageFixer');
// await fixOnPageIssues({ clientId: 'your-client-id' });

// Keyword research
// const { researchKeywords } = require('./modules/seo/keywordResearch');
// await researchKeywords({ restaurantName: 'Naisora', area: 'Bangalore', cuisine: 'web design agency' });

// Keyword autocomplete — long tail keywords
// const { getAutocomplete } = require('./modules/seo/keywordResearch');
// await getAutocomplete('restaurant website bangalore');

// Keyword analyser — difficulty and volume
// const { analyseKeywords } = require('./modules/seo/keywordAnalyser');
// await analyseKeywords(['restaurant website bangalore', 'cafe web design bangalore']);

// Keyword quick wins — easiest to rank
// const { filterQuickWins } = require('./modules/seo/keywordAnalyser');
// await filterQuickWins({ clientId: 'your-client-id' });

// Keyword mapper — maps keywords to pages
// const { mapKeywordsToPages } = require('./modules/seo/keywordMapper');
// await mapKeywordsToPages({ clientId: 'your-client-id' });

// Schema — restaurant schema
// const { generateRestaurantSchema } = require('./modules/seo/schemaGenerator');
// await generateRestaurantSchema({ name: 'Kaafi', address: 'Indiranagar', phone: '+919800000000', url: 'https://kaafi.in' });

// Schema — local business for Naisora
// const { generateLocalBusinessSchema } = require('./modules/seo/schemaGenerator');
// await generateLocalBusinessSchema({ name: 'Naisora', url: 'https://naisora.com' });

// Schema — blog post schema
// const { generateBlogPostSchema } = require('./modules/seo/schemaGenerator');
// await generateBlogPostSchema({ title: 'Why restaurants need a website', url: 'https://naisora.com/blog/post' });

// Sitemap — check if valid
// const { checkSitemap } = require('./modules/seo/sitemapManager');
// await checkSitemap('https://naisora.com');

// Sitemap — ping Google and Bing
// const { pingSearchEngines } = require('./modules/seo/sitemapManager');
// await pingSearchEngines('https://naisora.com/sitemap.xml');

// Internal links — find linking opportunities
// const { suggestInternalLinks } = require('./modules/seo/internalLinker');
// await suggestInternalLinks({ clientId: 'your-client-id' });

// Search console — keyword data
// const { getSearchData } = require('./modules/seo/searchConsoleReader');
// await getSearchData({ clientId: 'your-client-id' });

// Search console — quick win keywords
// const { getQuickWinKeywords } = require('./modules/seo/searchConsoleReader');
// await getQuickWinKeywords({ clientId: 'your-client-id' });

// Analytics — traffic data
// const { getTrafficData } = require('./modules/seo/analyticsReader');
// await getTrafficData({ clientId: 'your-client-id' });

// Weekly SEO engine — all clients
// const { runWeeklySeoForAllClients } = require('./modules/seo/weeklySeoEngine');
// await runWeeklySeoForAllClients();

// Weekly SEO engine — one client
// const { runWeeklySeoForClient } = require('./modules/seo/weeklySeoEngine');
// await runWeeklySeoForClient('your-client-id');

// Yoast — audit all posts
// const { auditAllPostsYoast } = require('./modules/seo/yoastManager');
// await auditAllPostsYoast('your-client-id');

// Yoast — update one post
// const { updateYoastForPost } = require('./modules/seo/yoastManager');
// await updateYoastForPost({ clientId: 'your-client-id', postId: 123 }, { seoTitle: 'Title here', metaDescription: 'Description here', focusKeyword: 'keyword here' });

// Performance report — weekly SEO summary
// const { generateWeeklyReport } = require('./modules/seo/performanceReport');
// await generateWeeklyReport({ clientId: 'your-client-id' });


// ═══════════════════════════════════════════════════════════════
// CONTENT / BLOG
// ═══════════════════════════════════════════════════════════════

// Write local SEO blog
// const { run } = require('./modules/content/blogWriter');
// await run({ clientId: 'naisora', restaurantName: 'Naisora Agency', topic: 'Why every restaurant in Bangalore needs a website in 2026', blogType: 'local_seo', area: 'Bangalore' });

// Write listicle blog
// const { run } = require('./modules/content/blogWriter');
// await run({ clientId: 'naisora', restaurantName: 'Naisora Agency', topic: '7 things every restaurant website must have', blogType: 'listicle', area: 'Bangalore' });

// Write food story blog
// const { run } = require('./modules/content/blogWriter');
// await run({ clientId: 'naisora', restaurantName: 'Naisora Agency', topic: 'How Bangalore restaurants are losing customers online', blogType: 'food_story', area: 'Bangalore' });

// Write event blog
// const { run } = require('./modules/content/blogWriter');
// await run({ clientId: 'naisora', restaurantName: 'Naisora Agency', topic: 'Free website audit for Bangalore restaurants', blogType: 'event', area: 'Bangalore' });

// Blog scheduler — generate monthly blogs for all clients
// const { run } = require('./modules/content/blogScheduler');
// await run('schedule');

// Blog scheduler — publish approved blogs
// const { run } = require('./modules/content/blogScheduler');
// await run('publish');

// Publish approved drafts to WordPress
// const { publishApprovedDrafts } = require('./modules/wordpress/blogPublisher');
// await publishApprovedDrafts();

// Write Instagram caption
// const { writeInstagramCaption } = require('./modules/content/socialWriter');
// await writeInstagramCaption({ topic: 'Why restaurants need a website', account: 'naisora.official' });

// Write GBP post
// const { writeGBPPost } = require('./modules/content/socialWriter');
// await writeGBPPost({ clientId: 'your-client-id' });

// Image prompt for blog
// const { generateBlogImagePrompt } = require('./modules/content/imageGenerator');
// await generateBlogImagePrompt({ topic: 'restaurant website design bangalore' });


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

// Weekly content plan — one account
// const { run } = require('./modules/social/contentPlanner');
// await run('@naisora.official');

// Reel ideas — personal brand
// const { generateReelIdeas } = require('./modules/social/reelIdeasGenerator');
// await generateReelIdeas('nahidpasha01 — web design and AI agency Bangalore');

// Reel ideas — agency
// const { generateReelIdeas } = require('./modules/social/reelIdeasGenerator');
// await generateReelIdeas('naisora.official — restaurant web design Bangalore');

// Hashtags — for any topic
// const { researchHashtags } = require('./modules/social/hashtagResearcher');
// await researchHashtags('restaurant web design Bangalore');

// Hashtags — restaurant ready-made
// const { getRestaurantHashtags } = require('./modules/social/hashtagResearcher');
// await getRestaurantHashtags('Koramangala cafe');

// Hashtags — agency ready-made
// const { getAgencyHashtags } = require('./modules/social/hashtagResearcher');
// await getAgencyHashtags('web design India');

// Post writer — Instagram caption
// const { run } = require('./modules/social/postWriter');
// await run({ format: 'instagram_caption', topic: 'How I built an AI agent in 30 days', account: 'nahidpasha01' });

// Post writer — LinkedIn story
// const { run } = require('./modules/social/postWriter');
// await run({ format: 'linkedin_story', topic: 'Why I chose restaurants as my niche at 20', account: 'nahid-pasha' });

// Post writer — campaign poster caption
// const { run } = require('./modules/social/postWriter');
// await run({ format: 'campaign_caption', topic: 'Free website audit for Bangalore restaurants', account: 'naisora.official' });

// Post writer — educational post
// const { run } = require('./modules/social/postWriter');
// await run({ format: 'instagram_educational', topic: '5 reasons your restaurant is invisible on Google', account: 'naisora.official' });

// Post writer — LinkedIn insight
// const { run } = require('./modules/social/postWriter');
// await run({ format: 'linkedin_insight', topic: 'Why Bangalore restaurants lose revenue to Zomato', account: 'nahid-pasha' });

// Competitor social spy
// const { analyseCompetitorStrategy } = require('./modules/social/competitorSocialSpy');
// await analyseCompetitorStrategy('@competitoragency');

// Performance snapshot
// const { savePerformanceSnapshot } = require('./modules/social/performanceTracker');
// await savePerformanceSnapshot();


// ═══════════════════════════════════════════════════════════════
// OUTREACH
// ═══════════════════════════════════════════════════════════════

// WhatsApp — send to all hot leads
// const { sendDailyWhatsApp } = require('./modules/outreach/whatsappSender');
// await sendDailyWhatsApp();

// WhatsApp — send to one number
// const { sendWhatsApp } = require('./modules/outreach/whatsappSender');
// await sendWhatsApp({ phone: '+919800000000', name: 'Kaafi Restaurant' });

// WhatsApp follow-ups
// const { sendFollowUp } = require('./modules/outreach/whatsappSender');
// await sendFollowUp();

// Check all replies now
// const { checkReplies } = require('./modules/outreach/replyReader');
// await checkReplies();

// Daily priority report
// const { generateDailyPriorities } = require('./modules/outreach/leadScorer');
// await generateDailyPriorities();

// Weekly pipeline summary
// const { weeklyPipelineSummary } = require('./modules/outreach/leadScorer');
// await weeklyPipelineSummary();

// Instagram outreach
// const { runInstagramOutreach } = require('./modules/outreach/instagramOutreach');
// await runInstagramOutreach();

// LinkedIn outreach
// const { runLinkedInOutreach } = require('./modules/outreach/linkedinOutreach');
// await runLinkedInOutreach();

// Humanize any message
// const { humanize } = require('./modules/outreach/humanizer');
// const result = await humanize('Hi I am from Naisora we do web design');
// console.log(result);


// ═══════════════════════════════════════════════════════════════
// EMAIL
// ═══════════════════════════════════════════════════════════════

// Send cold emails — 50 leads
// const { sendDailyColdEmails } = require('./modules/email/emailSender');
// await sendDailyColdEmails();

// Day 3 follow-up emails
// const { sendFollowupEmails1 } = require('./modules/email/emailSender');
// await sendFollowupEmails1();

// Day 7 follow-up emails
// const { sendFollowupEmails2 } = require('./modules/email/emailSender');
// await sendFollowupEmails2();

// Preview cold email before sending
// const { writeEmail } = require('./modules/email/emailWriter');
// const email = await writeEmail({ name: 'Kaafi Restaurant', address: 'Indiranagar, Bangalore', seo_score: 34 });
// console.log('SUBJECT:', email.subject);
// console.log('\nBODY:\n', email.body);


// ═══════════════════════════════════════════════════════════════
// SCRAPER
// ═══════════════════════════════════════════════════════════════

// Scrape Google Maps — specific area
// const { runFullScrape } = require('./modules/scraper/googleMapsScraper');
// await runFullScrape({ areas: ['Koramangala'], searchTypes: ['restaurants'], maxPerSearch: 15 });

// Scrape one restaurant
// const { scrapeOne } = require('./modules/scraper/googleMapsScraper');
// await scrapeOne('Kaafi Restaurant Indiranagar Bangalore');

// Scrape emails from websites
// const { scrapeEmailsForLeads } = require('./modules/scraper/emailScraper');
// await scrapeEmailsForLeads(30);

// Process and score leads
// const { processLeads } = require('./modules/scraper/leadProcessor');
// await processLeads();

// Get hot leads
// const { getHotLeads } = require('./modules/scraper/leadProcessor');
// const leads = await getHotLeads();
// console.log('Hot leads:', leads.length);

// Get leads by area
// const { getLeadsByArea } = require('./modules/scraper/leadProcessor');
// const leads = await getLeadsByArea('Koramangala');
// console.log('Leads:', leads.length);

// Get ready leads for outreach
// const { getReadyLeads } = require('./modules/scraper/leadDeduplicator');
// const leads = await getReadyLeads();
// console.log('Ready:', leads.length);


// ═══════════════════════════════════════════════════════════════
// INTELLIGENCE
// ═══════════════════════════════════════════════════════════════

// Competitor tracker
// const { generateCompetitorReport } = require('./modules/intelligence/competitorTracker');
// await generateCompetitorReport('Kaafi Restaurant Indiranagar');

// Client intelligence — when lead replies
// const { generateIntelligenceReport } = require('./modules/intelligence/clientIntelligence');
// await generateIntelligenceReport({ leadId: 'lead-id-from-supabase' });

// Chained reasoning — lead qualify
// const { run } = require('./modules/intelligence/chainedReasoning');
// await run({ chainType: 'lead_qualify', context: 'Restaurant: Kaafi, Area: Indiranagar, Score: 72' });

// Chained reasoning — client strategy
// const { run } = require('./modules/intelligence/chainedReasoning');
// await run({ chainType: 'client_strategy', context: 'Client: Kaafi, 3 months in, 2 blogs published' });

// Chained reasoning — pricing
// const { run } = require('./modules/intelligence/chainedReasoning');
// await run({ chainType: 'pricing_decision', context: 'Restaurant: Brew and Co, Koramangala, mid-size cafe' });

// Chained reasoning — content strategy
// const { run } = require('./modules/intelligence/chainedReasoning');
// await run({ chainType: 'content_strategy', context: 'Client: Kaafi, biryani and kebabs, Indiranagar' });

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

// Send payment reminder
// const { sendPaymentReminder } = require('./modules/client/invoiceGenerator');
// await sendPaymentReminder({ clientId: 'kaafi-id' });

// Check overdue invoices
// const { checkOverdueInvoices } = require('./modules/client/invoiceGenerator');
// await checkOverdueInvoices();

// Quarterly review
// const { run } = require('./modules/client/quarterlyPreparer');
// await run('kaafi-client-id');

// CA export — this month
// const { run } = require('./modules/client/caExport');
// await run();

// CA export — date range
// const { run } = require('./modules/client/caExport');
// await run({ startDate: '2026-01-01', endDate: '2026-03-31' });


// ═══════════════════════════════════════════════════════════════
// REPORTING
// ═══════════════════════════════════════════════════════════════

// Monthly PDF report — one client
// const { run } = require('./modules/reporting/monthlyPdfReport');
// await run('kaafi-client-id');

// Monthly reports — all clients
// const { runMonthlyReportsForAllClients } = require('./modules/reporting/monthlyReport');
// await runMonthlyReportsForAllClients();

// Dashboard
// const { generateDashboard } = require('./modules/tracking/dashboard');
// await generateDashboard();

// Ranking tracker
// const { trackClientRankings } = require('./modules/tracking/rankingTracker');
// await trackClientRankings('kaafi-client-id');

// Ranking report
// const { generateRankingReport } = require('./modules/tracking/rankingReporter');
// await generateRankingReport('kaafi-client-id');

// Monthly revenue
// const { getMonthlyRevenue } = require('./modules/reporting/financialTracker');
// const revenue = await getMonthlyRevenue();
// console.log('Revenue:', revenue);

// Weekly financial summary
// const { weeklyFinancialSummary } = require('./modules/reporting/financialTracker');
// await weeklyFinancialSummary();

// Billing alerts
// const { checkUpcomingRenewals } = require('./modules/reporting/billingAlerter');
// await checkUpcomingRenewals();

// Weekly cost summary
// const { weeklyCostSummary } = require('./modules/reporting/billingAlerter');
// await weeklyCostSummary();

// Daily cost estimate
// const { estimateDailyCost } = require('./modules/reporting/modelCostTracker');
// await estimateDailyCost();

// Weekly cost report
// const { weeklyCostReport } = require('./modules/reporting/modelCostTracker');
// await weeklyCostReport();

// Mentor session
// const { runMonthlyMentorSession } = require('./modules/reporting/mentorLLM');
// await runMonthlyMentorSession();


// ═══════════════════════════════════════════════════════════════
// OFF-PAGE
// ═══════════════════════════════════════════════════════════════

// Backlink opportunities
// const { findLinkOpportunities } = require('./modules/offpage/backlinkAnalyser');
// await findLinkOpportunities('https://naisora.com');

// NAP consistency check
// const { checkNapConsistency } = require('./modules/offpage/citationMonitor');
// await checkNapConsistency({ clientId: 'your-client-id' });

// Review request message
// const { writeReviewRequestMessage } = require('./modules/offpage/reviewRequester');
// await writeReviewRequestMessage({ clientId: 'kaafi-id', customerName: 'Ravi' });

// Respond to a review
// const { respondToReview } = require('./modules/offpage/reviewResponder');
// await respondToReview({ review: 'Great food but slow service', rating: 3, restaurantName: 'Kaafi' });

// PR opportunities
// const { findPROpportunities } = require('./modules/offpage/prOpportunityFinder');
// await findPROpportunities({ clientId: 'kaafi-id' });

// GBP posts
// const { scheduleGBPPosts } = require('./modules/offpage/socialPublisher');
// await scheduleGBPPosts({ id: 'kaafi-id', name: 'Kaafi Restaurant' });


// ═══════════════════════════════════════════════════════════════
// WORDPRESS
// ═══════════════════════════════════════════════════════════════

// Test WordPress connection
// const { testConnection } = require('./modules/wordpress/wpConnector');
// await testConnection({ clientId: 'your-client-id' });

// Check site health
// const { checkSiteHealth } = require('./modules/wordpress/wpConnector');
// await checkSiteHealth({ clientId: 'your-client-id' });

// Get all posts
// const { getAllPosts } = require('./modules/wordpress/wpConnector');
// const posts = await getAllPosts({ clientId: 'your-client-id' });
// console.log('Posts:', posts.length);

// Generate blog topics
// const { generateBlogTopics } = require('./modules/wordpress/blogPublisher');
// await generateBlogTopics({ clientId: 'your-client-id' });


// ═══════════════════════════════════════════════════════════════
// VOICE
// ═══════════════════════════════════════════════════════════════

// Generate voice booking script
// const { generateVoiceScript } = require('./modules/voice/voiceAgent');
// await generateVoiceScript({ restaurantName: 'Kaafi', cuisine: 'North Indian', area: 'Indiranagar' });

// Get today's bookings
// const { getTodaysBookings } = require('./modules/voice/bookingHandler');
// await getTodaysBookings({ clientId: 'kaafi-id' });