const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { runFullScrape } = require('../modules/scraper/googleMapsScraper');
const { sendDailyColdEmails } = require('../modules/email/emailSender');
const { sendDailyWhatsApp } = require('../modules/outreach/whatsappSender');
const { runInstagramOutreach } = require('../modules/outreach/instagramOutreach');
const { runLinkedInOutreach } = require('../modules/outreach/linkedinOutreach');
const { runFollowUpEngine } = require('../modules/outreach/followUpEngine');
const { auditWarmLeads } = require('../modules/seo/seoAudit');
const { sendMessage } = require('../config/telegram');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n================================');
  console.log('🤖 NAISORA MANUAL CONTROL CENTER');
  console.log('================================');
  console.log('1.  🗺️  Run Scraper Now');
  console.log('2.  📧  Send Emails Now');
  console.log('3.  📱  Send WhatsApp Now');
  console.log('4.  📸  Send Instagram DMs Now');
  console.log('5.  💼  Send LinkedIn Messages Now');
  console.log('6.  🔄  Run Follow Ups Now');
  console.log('7.  🔍  Run SEO Audit (enter URL)');
  console.log('8.  📊  Generate Content Ideas');
  console.log('9.  ✍️   Generate Reel Script');
  console.log('10. 🪝  Generate Hook Variations');
  console.log('11. 📈  Run Full Content Pipeline');
  console.log('12. 📋  View All Hot Leads');
  console.log('13. 📋  View All Warm Leads');
  console.log('14. 💬  View All Replies Received');
  console.log('15. 📊  Run Full SEO Report (enter domain)');
  console.log('16. 🔑  Generate Blog Post');
  console.log('17. 📱  Check WhatsApp Queue');
  console.log('18. 🏥  Run Deep Health Check');
  console.log('19. 📊  View Today\'s Stats');
  console.log('20. 🚪  Exit');
  console.log('================================');
  rl.question('\nEnter number: ', handleInput);
}

async function handleInput(choice) {
  switch (choice) {
    case '1':
      console.log('🚀 Running Scraper...');
      await runFullScrape();
      await sendMessage('Manual Trigger: Scraper completed.');
      break;
    case '2':
      console.log('🚀 Sending Emails...');
      await sendDailyColdEmails();
      await sendMessage('Manual Trigger: Email outreach completed.');
      break;
    case '3':
      console.log('🚀 Sending WhatsApp...');
      await sendDailyWhatsApp();
      await sendMessage('Manual Trigger: WhatsApp outreach completed.');
      break;
    case '4':
      console.log('🚀 Sending Instagram DMs...');
      await runInstagramOutreach();
      await sendMessage('Manual Trigger: Instagram outreach completed.');
      break;
    case '5':
      console.log('🚀 Sending LinkedIn Messages...');
      await runLinkedInOutreach();
      await sendMessage('Manual Trigger: LinkedIn outreach completed.');
      break;
    case '6':
      console.log('🚀 Running Follow Ups...');
      await runFollowUpEngine();
      await sendMessage('Manual Trigger: Follow up engine completed.');
      break;
    case '7':
      rl.question('Enter URL to audit: ', async (url) => {
        console.log(`🚀 Auditing ${url}...`);
        // Assuming auditWarmLeads can be adapted or we use a specific audit function
        await auditWarmLeads(1); 
        await sendMessage(`Manual Trigger: SEO Audit completed for ${url}`);
        showMenu();
      });
      return;
    case '12':
      const { data: hotLeads } = await supabase.from('leads').select('*').eq('lead_category', 'hot');
      console.table(hotLeads.map(l => ({ name: l.business_name, area: l.area, phone: l.phone })));
      break;
    case '13':
      const { data: warmLeads } = await supabase.from('leads').select('*').eq('lead_category', 'warm');
      console.table(warmLeads.map(l => ({ name: l.business_name, area: l.area, email: l.email })));
      break;
    case '14':
      const { data: replies } = await supabase.from('outreach_log').select('*').eq('message_type', 'reply_received');
      console.table(replies.map(r => ({ channel: r.channel, msg: r.message_text, time: r.sent_at })));
      break;
    case '17':
      const { data: queue } = await supabase.from('whatsapp_queue').select('*');
      console.log(`📱 Items in queue: ${queue.length}`);
      console.table(queue.map(q => ({ phone: q.phone, status: q.status })));
      break;
    case '18':
      console.log('🚀 Running Health Monitor...');
      const { runHealthCheck } = require('./health-monitor');
      await runHealthCheck();
      break;
    case '19':
      const { sendEveningDashboard } = require('../modules/reporting/businessReporting');
      await sendEveningDashboard();
      break;
    case '20':
      console.log('👋 Goodbye!');
      rl.close();
      process.exit(0);
    default:
      console.log('❌ Invalid option.');
      break;
  }
  showMenu();
}

showMenu();
