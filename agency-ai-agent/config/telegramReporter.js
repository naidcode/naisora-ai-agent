const { sendMessage } = require('./telegram');

/**
 * SEO AUDIT COMPLETE
 */
async function sendAuditReport(audit) {
  const grade_emoji = {
    'A': '🟢', 'B': '🟡', 'C': '🟠', 'D': '🔴'
  };

  const msg = `
<pre>
╔══════════════════════════════╗
║     🔍 SEO AUDIT COMPLETE    ║
╚══════════════════════════════╝
</pre>

🏪 <b>${audit.restaurant}</b>
📍 ${audit.area}, Bangalore

📊 <b>SCORE:</b> ${audit.total_score}/100  ${grade_emoji[audit.grade] || '⚪'} Grade ${audit.grade}
🎯 <b>STATUS:</b> ${audit.priority === 'HOT_LEAD' ? '🔥 HOT LEAD' : audit.priority === 'WARM_LEAD' ? '⚡ WARM LEAD' : '❄️ COLD LEAD'}

📈 <b>BREAKDOWN:</b>
  E.E.A.T Score  : ${audit.breakdown.eeat.score}/100
  GEO Score      : ${audit.breakdown.geo.score}/100
  AEO Score      : ${audit.breakdown.aeo.score}/100
  Technical      : ${audit.breakdown.technical.score}/100

❌ <b>TOP ISSUES:</b>
${audit.issues.slice(0,3).map(i => `  • ${i}`).join('\n')}

💡 <b>PITCH READY:</b> ${audit.pitch ? '✅ Yes' : '❌ No'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  await sendMessage(msg);
}

/**
 * DAILY SEO SUMMARY
 */
async function sendDailySEOSummary(stats) {
  const msg = `
<pre>
╔══════════════════════════════╗
║   📊 DAILY SEO SUMMARY       ║
║   ${new Date().toLocaleDateString('en-IN')}              ║
╚══════════════════════════════╝
</pre>

🔍 <b>AUDITS TODAY</b>
  Total audited    : ${stats.total}
  Hot leads (D)    : 🔥 ${stats.hot}
  Warm leads (C)   : ⚡ ${stats.warm}
  Good leads (B+)  : ✅ ${stats.good}

📝 <b>CONTENT</b>
  Blog posts written : ${stats.blogs}
  Keywords found     : ${stats.keywords}

📉 <b>BIGGEST PROBLEM TODAY:</b>
  ${stats.topIssue}

🎯 <b>BEST PROSPECT:</b>
  ${stats.bestLead.name} — ${stats.bestLead.area}
  Score: ${stats.bestLead.score}/100
  Why: ${stats.bestLead.reason}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>Action needed:</b> ${stats.hot > 0 ? '✅ YES — send pitches' : '❌ No'}`;

  await sendMessage(msg);
}

/**
 * ERROR ALERTS — clean format
 */
async function sendErrorAlert(module, error, severity) {
  const s = {
    'critical': '🚨 CRITICAL',
    'warning': '⚠️ WARNING', 
    'info': 'ℹ️ INFO'
  };

  const msg = `
<b>${s[severity] || '⚠️ ALERT'}</b>

📦 <b>Module</b>  : ${module}
❌ <b>Error</b>   : ${error.message || error}
🕐 <b>Time</b>    : ${new Date().toLocaleTimeString('en-IN')}
🔁 <b>Action</b>  : ${severity === 'critical' ? 'IMMEDIATE FIX NEEDED' : 'Monitor'}`;

  await sendMessage(msg);
}

module.exports = {
  sendAuditReport,
  sendDailySEOSummary,
  sendErrorAlert
};
