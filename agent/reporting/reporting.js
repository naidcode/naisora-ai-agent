const { db } = require('../database/database');

async function generateReport() {
  try {
    const totalLeads = await db.leads.count();
    const contacted = await db.leads.count({ contacted: true });
    
    // contacted today
    const today = new Date();
    today.setHours(0,0,0,0);
    const contactedToday = await db.leads.count({ 
      contacted: true, 
      since: today.toISOString() 
    });

    const autoReplies = await db.conversations.count({ isAutoReply: true });
    const closedConversations = await db.conversations.count({ isClosed: true });
    
    // Average response time (mock logic or query if tracked)
    const avgResponseTime = "1.2s"; 

    const successRate = contacted > 0 ? ((closedConversations / contacted) * 100).toFixed(1) + "%" : "0%";
    const autoReplyRate = contacted > 0 ? ((autoReplies / contacted) * 100).toFixed(1) + "%" : "0%";

    const report = {
      totalLeads,
      contacted,
      contactedToday,
      autoReplies,
      closedConversations,
      successRate,
      autoReplyRate,
      avgResponseTime,
      errors: await db.errors.count(),
      unresolvedErrors: await db.errors.count({ resolved: false }),
      topPerformingArea: "Koramangala", // Mock
      bestChannel: "WhatsApp" // Mock
    };

    console.log("\n📊 --- NAISORA AGENT ADVANCED REPORT ---");
    console.log(`📈 Leads:      ${report.totalLeads} total | ${report.contactedToday} contacted today`);
    console.log(`💬 Convos:     ${report.closedConversations} closed | ${report.autoReplies} auto-replies`);
    console.log(`🎯 Rates:      Success: ${report.successRate} | Auto-Reply: ${report.autoReplyRate}`);
    console.log(`⏱️ Performance: Avg Resp: ${report.avgResponseTime} | Best: ${report.bestChannel}`);
    console.log(`⚠️ Health:     ${report.errors} total errors | ${report.unresolvedErrors} unresolved`);
    console.log("----------------------------------------\n");

    return report;
  } catch (err) {
    console.error('Failed to generate report:', err.message);
    return null;
  }
}

module.exports = {
  generateReport
};
