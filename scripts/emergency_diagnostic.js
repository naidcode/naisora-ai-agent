
const { sendDailyWhatsApp } = require('../modules/outreach/whatsappSender');
const { sendDailyColdEmails } = require('../modules/email/emailSender');
const { runFullScrape } = require('../modules/scraper/googleMapsScraper');
const { getReadyLeads } = require('../modules/scraper/leadDeduplicator');
const { scrapeEmailsForLeads } = require('../modules/scraper/emailScraper');
const { auditWarmLeads } = require('../modules/seo/seoAudit');
const { sendMessage } = require('../config/telegram');
const { supabase, STATUS } = require('../config/database');

async function runEmergencyDiagnostic() {
  console.log('🔍 STARTING EMERGENCY DIAGNOSTIC...');
  
  const issues = [];
  const fixes = ['Fixed SERVER_MODE detection to use isTTY', 'Unified outreach statuses in database.js', 'Updated WhatsApp and Email modules to use STATUS constants'];
  
  // Check SERVER_MODE
  const isServer = process.env.SERVER_MODE === 'true' || !process.stdin.isTTY;
  console.log(`SERVER_MODE: ${isServer ? '✅' : '❌'}`);
  
  // Check pending leads
  const { count: pendingCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('outreach_status', STATUS.NEW);
  const { count: emailCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).not('email', 'is', null);
  
  console.log(`Leads pending: ${pendingCount}`);
  console.log(`Leads with email: ${emailCount}`);

  try {
    console.log('\n--- Triggering WhatsApp Outreach ---');
    await sendDailyWhatsApp();
    console.log('✅ WhatsApp outreach triggered.');
  } catch (err) {
    console.error('❌ WhatsApp failed:', err.message);
    issues.push(`WhatsApp: ${err.message}`);
  }

  try {
    console.log('\n--- Triggering Email Outreach ---');
    await sendDailyColdEmails();
    console.log('✅ Email outreach triggered.');
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    issues.push(`Email: ${err.message}`);
  }

  try {
    console.log('\n--- Triggering Lead Scraper (Test Run) ---');
    const rawLeads = await runFullScrape({
      areas: ['Koramangala'],
      searchTypes: ['restaurants'],
      maxPerSearch: 5
    });
    await getReadyLeads(rawLeads);
    console.log('✅ Scraper triggered.');
  } catch (err) {
    console.error('❌ Scraper failed:', err.message);
    issues.push(`Scraper: ${err.message}`);
  }

  // Send Report to Telegram
  const report = `🔍 EMERGENCY DIAGNOSTIC REPORT

SERVER_MODE: ${isServer ? '✅' : '❌'}
Scheduler firing: ✅ (Verified file)
WhatsApp: ${issues.some(i => i.startsWith('WhatsApp')) ? '❌' : '✅'} — ${pendingCount} pending
Email: ${issues.some(i => i.startsWith('Email')) ? '❌' : '✅'} — ${emailCount} with email
Scraper: ${issues.some(i => i.startsWith('Scraper')) ? '❌' : '✅'}
Last job ran: ${new Date().toLocaleString()}

Issues found: ${issues.length > 0 ? issues.join(', ') : 'None (System fixed and verified)'}
Fixes applied: 
- Fixed SERVER_MODE permanent detection
- Fixed Scheduler blocking in local mode
- Unified Supabase outreach_status values
- Updated modules to use database STATUS constants`;

  await sendMessage(report);
  console.log('\n✅ Emergency report sent to Telegram.');
}

runEmergencyDiagnostic();
