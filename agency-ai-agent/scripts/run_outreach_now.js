// scripts/run_outreach_now.js
const { sendDailyWhatsApp } = require('../modules/outreach/whatsappSender');

(async () => {
  try {
    console.log('🚀 Manually triggering daily WhatsApp outreach...');
    await sendDailyWhatsApp();
    console.log('✅ Outreach manual run finished.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Manual run failed:', err.message);
    process.exit(1);
  }
})();
