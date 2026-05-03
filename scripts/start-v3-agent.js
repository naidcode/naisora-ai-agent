const { scrapeBangalore } = require('../agent/scraper/scraper');
const { generateReport } = require('../agent/reporting/reporting');
const { sendMessage } = require('../config/telegram');
const { startAllJobs } = require('../scheduler/cronJobs');

async function startAgentNow() {
  console.log('🚀 INITIALIZING NAISORA V3 AGENT...');
  
  await sendMessage(`🚀 <b>NAISORA V3 AGENT INITIALIZED</b>\n\nStarting immediate bootstrap cycle...`);

  // 1. Initial Scrape (Limited for bootstrap)
  console.log('🔍 Running bootstrap scrape...');
  const { scrapeArea } = require('../agent/scraper/scraper');
  const bootstrapAreas = ["Koramangala", "Indiranagar", "HSR Layout"];
  
  for (const area of bootstrapAreas) {
    await scrapeArea(area);
  }

  // 2. Generate and Send Report
  console.log('📊 Generating initial report...');
  const stats = await generateReport();
  if (stats) {
    const reportMsg = `
📊 <b>BOOTSTRAP REPORT</b>
━━━━━━━━━━━━━━━━━━
👤 <b>New Leads:</b> ${stats.totalLeads}
✅ <b>Contacted:</b> ${stats.contactedToday}
━━━━━━━━━━━━━━━━━━
🚀 <i>Bootstrap complete. Handing over to autonomous scheduler.</i>
    `.trim();
    await sendMessage(reportMsg);
  }

  // 3. Start Scheduler
  console.log('📅 Starting autonomous scheduler...');
  startAllJobs();
  
  // Keep process alive if needed (though startAllJobs might keep it alive via cron)
  console.log('✅ Agent is now live and autonomous.');
}

startAgentNow().catch(async (err) => {
  console.error('Fatal startup error:', err);
  await sendMessage(`❌ <b>FATAL STARTUP ERROR</b>\n\n<code>${err.message}</code>`);
});
