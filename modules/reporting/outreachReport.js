const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');

/**
 * Generate and send a detailed outreach report to Telegram
 */
async function generateOutreachReport() {
  console.log('📊 Generating outreach report...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  try {
    // 1. Get leads processed today
    const { data: leadsToday } = await supabase
      .from('leads')
      .select('lead_type, business_name, area, pagespeed_score, outreach_status')
      .gte('processed_at', todayISO);

    const counts = {
      no_website: leadsToday.filter(l => l.lead_type === 'no_website').length,
      bad_website: leadsToday.filter(l => l.lead_type === 'bad_website').length,
      weak_seo: leadsToday.filter(l => l.lead_type === 'weak_seo').length,
      skipped: leadsToday.filter(l => l.lead_type === 'skip').length
    };

    // 2. Get outreach sent today
    const { data: logsToday } = await supabase
      .from('outreach_log')
      .select('channel, message_type, lead_id')
      .gte('sent_at', todayISO);

    const emailsSent = logsToday.filter(l => l.channel === 'email' && (l.message_type === 'cold' || l.message_type === 'auto_reply')).length;
    
    // For WhatsApp, we might need to check the queue for 'sent' status today as well
    const { data: waSentToday } = await supabase
      .from('whatsapp_queue')
      .select('id')
      .eq('status', 'sent')
      .gte('sent_at', todayISO);
    
    const whatsappSent = waSentToday?.length || 0;
    const repliesToday = logsToday.filter(l => l.message_type === 'reply_received').length;

    // 3. Hot leads details
    // We'll look for leads that were contacted today
    const { data: contactedLeads } = await supabase
      .from('leads')
      .select('id, business_name, area, lead_type, pagespeed_score, outreach_channel, outreach_status')
      .neq('outreach_status', 'new')
      .neq('outreach_status', 'skipped')
      .gte('last_contacted_at', todayISO)
      .limit(10); // Show top 10

    let leadDetails = '';
    if (contactedLeads && contactedLeads.length > 0) {
      leadDetails = contactedLeads.map(l => {
        const typeLabel = l.lead_type === 'no_website' ? 'No website' : 
                         l.lead_type === 'bad_website' ? `Bad website (${l.pagespeed_score}/100)` : 
                         'Weak SEO';
        
        // Find which channels were used for this lead today
        const hasEmail = logsToday.some(log => log.lead_id === l.id && log.channel === 'email');
        const hasWA = waSentToday && waSentToday.some(wa => wa.lead_id === l.id); // Note: we'd need lead_id in whatsapp_queue for this to be perfect

        return `- ${l.business_name} (${l.area}) — ${typeLabel} — ${hasEmail ? 'Email ✅ ' : ''}${hasWA ? 'WhatsApp ✅' : ''}`;
      }).join('\n');
    } else {
      leadDetails = '- No leads contacted yet today.';
    }

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const reportMessage = `📊 *Outreach Report — ${dateStr}*

🎯 *Leads Targeted Today:*
🔴 No Website: ${counts.no_website} leads
🟡 Bad Website: ${counts.bad_website} leads
🟢 Weak SEO: ${counts.weak_seo} leads
⛔ Skipped (good website): ${counts.skipped} leads

📧 Emails Sent: ${emailsSent}
📱 WhatsApp Sent: ${whatsappSent}

🔥 *Hot leads contacted:*
${leadDetails}

💬 Replies received today: ${repliesToday}`;

    await sendMessage(reportMessage);
    console.log('✅ Outreach report sent to Telegram.');

  } catch (error) {
    console.error('❌ Error generating outreach report:', error.message);
  }
}

module.exports = { generateOutreachReport };
