const { generateReport } = require('../agent/reporting/reporting');
const { sendMessage } = require('../config/telegram');

async function runAndSendReport() {
  console.log('📊 Generating V3 Agent Report...');
  const stats = await generateReport();
  
  if (!stats) {
    console.error('❌ Failed to generate report stats.');
    return;
  }

  const message = `
📊 <b>NAISORA AGENT V3 REPORT</b>
<i>Core Systems: Online 🟢</i>

━━━━━━━━━━━━━━━━━━
👤 <b>Total Leads:</b> ${stats.totalLeads}
✅ <b>Contacted Today:</b> ${stats.contactedToday}
💬 <b>Closed Convos:</b> ${stats.closedConversations}
🤖 <b>Auto-Replies:</b> ${stats.autoReplies}

🎯 <b>Success Rate:</b> ${stats.successRate}
📉 <b>Auto-Reply Rate:</b> ${stats.autoReplyRate}
━━━━━━━━━━━━━━━━━━
⚠️ <b>Errors (Unresolved):</b> ${stats.unresolvedErrors}
📡 <b>Best Channel:</b> ${stats.bestChannel}
━━━━━━━━━━━━━━━━━━

🚀 <i>Agent is now operating in Autonomous V3 Mode.</i>
  `.trim();

  await sendMessage(message);
  console.log('✅ Report sent to Telegram.');
}

runAndSendReport().catch(err => console.error('Error:', err));
