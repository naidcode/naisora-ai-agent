const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');

/**
 * Morning Priority Report (8:30 AM)
 */
async function sendMorningReport() {
  console.log('🌅 Generating morning report...');
  const yesterdayStart = new Date();
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);
  
  const yesterdayEnd = new Date();
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);

  try {
    // 1. Get stats from outreach_log for yesterday
    const { data: logs } = await supabase
      .from('outreach_log')
      .select('channel, message_type')
      .gte('sent_at', yesterdayStart.toISOString())
      .lte('sent_at', yesterdayEnd.toISOString());

    const stats = {
      email: logs.filter(l => l.channel === 'email' && (l.message_type === 'cold')).length,
      whatsapp: logs.filter(l => l.channel === 'whatsapp' && (l.message_type === 'cold')).length,
      instagram: logs.filter(l => l.channel === 'instagram' && (l.message_type === 'cold')).length,
      linkedin: logs.filter(l => l.channel === 'linkedin' && (l.message_type === 'cold')).length,
      replies: logs.filter(l => l.message_type === 'reply_received').length,
      followups: logs.filter(l => l.message_type === 'followup_1' || l.message_type === 'whatsapp_followup_1').length
    };

    // 2. Hot leads to watch
    const { data: hotLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('outreach_status', 'replied')
      .order('reply_received_at', { ascending: false })
      .limit(3);

    const hotLeadsList = hotLeads.map(l => {
      const daysAgo = Math.floor((new Date() - new Date(l.reply_received_at)) / (1000 * 60 * 60 * 24));
      return `- ${l.business_name} — replied ${daysAgo} days ago — needs follow up`;
    }).join('\n');

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const message = `🌅 *Good Morning — Naisora Daily Brief*
${today}

📊 *Yesterday Summary:*
- Emails sent: ${stats.email}
- WhatsApp sent: ${stats.whatsapp}
- Instagram DMs: ${stats.instagram}
- LinkedIn msgs: ${stats.linkedin}
- Replies received: ${stats.replies}
- Follow ups sent: ${stats.followups}

🔥 *Hot leads to watch today:*
${hotLeadsList || 'No hot leads pending.'}

📅 *Today's Schedule:*
10:00 AM → WhatsApp + Instagram outreach
11:00 AM → Email outreach
11:30 AM → LinkedIn outreach
12:00 PM → Follow ups
04:00 PM → Fresh scrape`;

    await sendMessage(message);
    console.log('✅ Morning report sent.');

  } catch (error) {
    console.error('Morning report error:', error.message);
  }
}

/**
 * Evening Dashboard (9:00 PM)
 */
async function sendEveningDashboard() {
  console.log('🌙 Generating evening dashboard...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  try {
    // 1. Activity Today
    const { data: logs } = await supabase
      .from('outreach_log')
      .select('channel, message_type')
      .gte('sent_at', todayISO);

    const totalOutreach = logs.filter(l => l.message_type === 'cold').length;
    const replies = logs.filter(l => l.message_type === 'reply_received').length;
    const followups = logs.filter(l => l.message_type === 'followup_1' || l.message_type === 'whatsapp_followup_1').length;

    const { count: newLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('processed_at', todayISO);

    // 2. Pipeline Status
    const { data: leads } = await supabase.from('leads').select('lead_category, outreach_status');
    
    const pipeline = {
      hot: leads.filter(l => l.lead_category === 'hot').length,
      warm: leads.filter(l => l.lead_category === 'warm').length,
      cold: leads.filter(l => l.lead_category === 'cold').length,
      replied: leads.filter(l => l.outreach_status === 'replied').length,
      converted: leads.filter(l => l.outreach_status === 'client').length
    };

    // 3. Top Lead
    const { data: topLeadArr } = await supabase
      .from('leads')
      .select('*')
      .eq('lead_category', 'hot')
      .order('processed_at', { ascending: false })
      .limit(1);
    const topLead = topLeadArr ? topLeadArr[0] : null;

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const message = `🌙 *Naisora Evening Dashboard*
${dateStr}

📈 *Today's Activity:*
✅ Total outreach sent: ${totalOutreach}
💬 Replies received: ${replies}
🔄 Follow ups sent: ${followups}
🆕 New leads scraped: ${newLeads || 0}

📊 *Pipeline Status:*
🔴 Hot leads: ${pipeline.hot}
🟡 Warm leads: ${pipeline.warm}
🟢 Cold leads: ${pipeline.cold}
💬 Replied leads: ${pipeline.replied}
🤝 Converted clients: ${pipeline.converted}

💰 Revenue this month: ₹0

🏆 *Top lead today:*
${topLead ? `${topLead.business_name} — ${topLead.area} — ${topLead.outreach_status}` : 'None today'}`;

    await sendMessage(message);
    console.log('✅ Evening dashboard sent.');

  } catch (error) {
    console.error('Evening dashboard error:', error.message);
  }
}

/**
 * Weekly Sunday Report (8:00 PM)
 */
async function sendWeeklyReport() {
  console.log('📊 Generating weekly report...');
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekISO = lastWeek.toISOString();

  try {
    const { data: logs } = await supabase
      .from('outreach_log')
      .select('channel, message_type')
      .gte('sent_at', lastWeekISO);

    const stats = {
      email: logs.filter(l => l.channel === 'email' && l.message_type === 'cold').length,
      whatsapp: logs.filter(l => l.channel === 'whatsapp' && l.message_type === 'cold').length,
      instagram: logs.filter(l => l.channel === 'instagram' && l.message_type === 'cold').length,
      linkedin: logs.filter(l => l.channel === 'linkedin' && l.message_type === 'cold').length,
      replies: logs.filter(l => l.message_type === 'reply_received').length,
      followups: logs.filter(l => l.message_type === 'followup_1' || l.message_type === 'whatsapp_followup_1').length
    };

    // Find best channel
    const channels = [
      { name: 'Email', count: stats.email },
      { name: 'WhatsApp', count: stats.whatsapp },
      { name: 'Instagram', count: stats.instagram },
      { name: 'LinkedIn', count: stats.linkedin }
    ];
    const bestChannel = channels.sort((a, b) => b.count - a.count)[0].name;

    const { data: topLeadArr } = await supabase
      .from('leads')
      .select('*')
      .eq('lead_category', 'hot')
      .order('processed_at', { ascending: false })
      .limit(1);
    const topLead = topLeadArr ? topLeadArr[0] : null;

    const message = `📊 *Weekly Report — Naisora*
Week of ${new Date().toLocaleDateString()}

📧 Total emails sent: ${stats.email}
📱 Total WhatsApp sent: ${stats.whatsapp}
📸 Total Instagram DMs: ${stats.instagram}
💼 Total LinkedIn msgs: ${stats.linkedin}
💬 Total replies: ${stats.replies}
🔄 Total follow ups: ${stats.followups}
🤝 New clients: 0
💰 Revenue: ₹0

🏆 Best performing channel: ${bestChannel}
🔥 Hottest lead this week: ${topLead ? topLead.business_name : 'None'}

📈 *Next week targets:*
- Send 200 emails
- Get 10 replies
- Close 2 clients`;

    await sendMessage(message);
    console.log('✅ Weekly report sent.');

  } catch (error) {
    console.error('Weekly report error:', error.message);
  }
}

/**
 * Daily Target Report (After each outreach session)
 */
async function sendDailyOutreachTargetReport() {
  console.log('📊 Generating daily target report...');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  try {
    // 1. Get outreach logs for today
    const { data: logs } = await supabase
      .from('outreach_log')
      .select('channel, message_type, lead_id')
      .gte('sent_at', todayISO);

    // 2. Get lead types for leads contacted today
    const leadIds = [...new Set(logs.map(l => l.lead_id))];
    let leadTypes = { no_website: 0, bad_website: 0, weak_seo: 0 };
    
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from('leads')
        .select('lead_type')
        .in('id', leadIds);
      
      leads.forEach(l => {
        if (l.lead_type === 'no_website') leadTypes.no_website++;
        else if (l.lead_type === 'bad_website') leadTypes.bad_website++;
        else if (l.lead_type === 'weak_seo') leadTypes.weak_seo++;
      });
    }

    // 3. Calculate stats
    const stats = {
      email: logs.filter(l => l.channel === 'email' && l.message_type === 'cold').length,
      whatsapp: logs.filter(l => l.channel === 'whatsapp' && l.message_type === 'cold').length,
      instagram: logs.filter(l => l.channel === 'instagram' && l.message_type === 'cold').length,
      linkedin: logs.filter(l => l.channel === 'linkedin' && l.message_type === 'cold').length,
      followups: logs.filter(l => l.message_type.includes('followup') || l.message_type === 'auto_followup').length
    };

    const targets = { email: 50, whatsapp: 30, instagram: 30, linkedin: 30 };
    const check = (sent, target) => sent >= target ? '✅' : '❌';

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const message = `📊 *Daily Outreach Targets — ${today}*

📧 *Email:*
Target: ${targets.email} | Sent: ${stats.email} | ${check(stats.email, targets.email)}

📱 *WhatsApp:*
Target: ${targets.whatsapp} | Sent: ${stats.whatsapp} | ${check(stats.whatsapp, targets.whatsapp)}

📸 *Instagram:*
Target: ${targets.instagram} | Sent: ${stats.instagram} | ${check(stats.instagram, targets.instagram)}

💼 *LinkedIn:*
Target: ${targets.linkedin} | Sent: ${stats.linkedin} | ${check(stats.linkedin, targets.linkedin)}

🔴 No website leads: ${leadTypes.no_website}
🟡 Bad website leads: ${leadTypes.bad_website}
🟢 Weak SEO leads: ${leadTypes.weak_seo}

Gap filled by follow ups: ${stats.followups}`;

    await sendMessage(message);
    console.log('✅ Daily target report sent.');

  } catch (error) {
    console.error('Daily target report error:', error.message);
  }
}

module.exports = { 
  sendMorningReport, 
  sendEveningDashboard, 
  sendWeeklyReport,
  sendDailyOutreachTargetReport
};
