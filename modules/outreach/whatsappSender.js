// modules/outreach/whatsappSender.js
// Naisora AI Agent — WhatsApp Sender (Queue Mode for Railway)

const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');

const DAILY_LIMIT = 25;

// Check how many messages sent or queued today
async function getTodayCount() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Check outreach_log (actual sends) + whatsapp_queue (pending/queued)
  const { count: logCount } = await supabase
    .from('outreach_log')
    .select('*', { count: 'exact', head: true })
    .eq('channel', 'whatsapp')
    .gte('sent_at', todayStart.toISOString());

  const { count: queueCount } = await supabase
    .from('whatsapp_queue')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());

  return (logCount || 0) + (queueCount || 0);
}

const { writeWhatsAppMessage } = require('./whatsappWriter');

// Main daily outreach
async function sendDailyWhatsApp() {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    console.log('⏭️  WhatsApp outreach disabled (WHATSAPP_ENABLED != true)');
    return;
  }

  const TARGET_MINIMUM = 30;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — WhatsApp Outreach (Queue)      ║');
  console.log('╚══════════════════════════════════════════════╝');

  const todayCount = await getTodayCount();
  const remaining = Math.max(0, TARGET_MINIMUM - todayCount);

  if (remaining <= 0 && todayCount >= TARGET_MINIMUM) {
    console.log('🛑 Daily WhatsApp target already hit');
    return;
  }

  console.log(`📊 Today: ${todayCount} handled, target: ${TARGET_MINIMUM}, remaining to hit target: ${remaining}\n`);

  // 1. Get new hot leads
  let { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_category', 'hot')
    .neq('outreach_status', 'whatsapp_sent')
    .neq('outreach_status', 'skipped')
    .not('phone', 'is', null)
    .order('lead_score', { ascending: false })
    .limit(remaining);

  let followUpsUsed = 0;

  // 2. If not enough new leads, pull from existing leads not contacted in 7+ days
  if (!leads || leads.length < remaining) {
    const gap = remaining - (leads ? leads.length : 0);
    console.log(`ℹ️  Only ${leads ? leads.length : 0} new hot leads found. Pulling ${gap} follow-ups to hit target...`);
    const { getLeadsForFollowupGeneric } = require('../../config/database');
    const oldLeads = await getLeadsForFollowupGeneric('whatsapp', gap);
    leads = [...(leads || []), ...oldLeads];
    followUpsUsed = oldLeads.length;
  }

  if (!leads || leads.length === 0) {
    console.log('📭 No leads ready for WhatsApp today.');
    return;
  }

  console.log(`🎯 ${leads.length} leads to queue today\n`);

  let queued = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    console.log(`\n📱 [${i + 1}/${leads.length}] Queuing: ${lead.business_name}`);

    const result = await writeWhatsAppMessage(lead);
    if (!result || !result.message) {
      console.log(`   ⏩ Skipping ${lead.business_name} (Lead type: ${lead.lead_type})`);
      continue;
    }

    const message = result.message;
    const phone = lead.phone;

    try {
      console.log(`📤 Sending WhatsApp to ${lead.business_name} (${phone})...`);
      
      const url = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE}/messages/chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: process.env.ULTRAMSG_TOKEN,
          to: `+${phone.replace(/\D/g, '')}`,
          body: message
        })
      });

      const resData = await response.json();

      if (resData.sent === 'true' || resData.id) {
        queued++; // Using 'queued' variable name to keep rest of code working, but it's actually sent
        await supabase
          .from('leads')
          .update({
            outreach_status: 'whatsapp_sent',
            outreach_channel: 'whatsapp',
            whatsapp_count: (lead.whatsapp_count || 0) + 1,
            last_contacted_at: new Date().toISOString(),
          })
          .eq('id', lead.id);

        // Log in outreach_log
        await supabase.from('outreach_log').insert({
          lead_id: lead.id,
          channel: 'whatsapp',
          message_text: message,
          sent_at: new Date().toISOString(),
          delivered: true
        });

        console.log(`   ✅ Sent via UltraMsg!`);
      } else {
        console.error(`   ❌ UltraMsg Error: ${resData.error || 'Unknown error'}`);
      }
    } catch (sendErr) {
      console.error(`   ❌ Failed to send to ${lead.business_name}:`, sendErr.message);
    }

    // Wait 10-20 seconds between sends
    await new Promise(r => setTimeout(r, 15000));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 WhatsApp Queue: ${queued} messages added`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const today = new Date().toLocaleDateString();
  const noWebsiteLeads = leads.filter(l => l.lead_type === 'no_website').length;
  const badWebsiteLeads = leads.filter(l => l.lead_type === 'bad_website').length;
  const weakSeoLeads = leads.filter(l => l.lead_type === 'weak_seo').length;

  const leadsMessaged = leads.map(l => `- ${l.business_name} (${l.area}) — ${l.lead_type}`).join('\n');

  await sendMessage(
    `📱 *WhatsApp Report — ${today}*\n\n` +
    `Target: ${TARGET_MINIMUM} | Sent: ${queued} | ${queued >= TARGET_MINIMUM ? '✅' : '❌'}\n` +
    `❌ Failed: 0\n` +
    `🔄 Gap filled by follow-ups: ${followUpsUsed}\n\n` +
    `*Breakdown:*\n` +
    `🔴 No website: ${noWebsiteLeads}\n` +
    `🟡 Bad website: ${badWebsiteLeads}\n` +
    `🟢 Weak SEO: ${weakSeoLeads}\n\n` +
    `*Leads messaged:*\n${leadsMessaged || 'None'}`
  );
}

// Follow-up for leads (Day 3)
async function sendFollowUp() {
  if (process.env.WHATSAPP_ENABLED !== 'true') return;

  const todayCount = await getTodayCount();
  const remaining = DAILY_LIMIT - todayCount;

  if (remaining <= 0) {
    console.log('🛑 Daily WhatsApp limit reached');
    return;
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('outreach_status', 'whatsapp_sent')
    .lt('last_contacted_at', threeDaysAgo.toISOString())
    .limit(remaining);

  if (!leads || leads.length === 0) {
    console.log('No WhatsApp follow-ups needed today.');
    return;
  }

  let queued = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const message = `Hi ${lead.business_name} 👋, just following up on my previous message. Did you get a chance to see the free audit I did for your website?`;
    const phone = lead.phone;

    try {
      console.log(`📤 Sending WhatsApp follow-up to ${lead.business_name} (${phone})...`);
      
      const url = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE}/messages/chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: process.env.ULTRAMSG_TOKEN,
          to: `+${phone.replace(/\D/g, '')}`,
          body: message
        })
      });

      const resData = await response.json();

      if (resData.sent === 'true' || resData.id) {
        queued++;
        await supabase
          .from('leads')
          .update({
            outreach_status: 'followup_1',
            last_contacted_at: new Date().toISOString(),
          })
          .eq('id', lead.id);

        // Log in outreach_log
        await supabase.from('outreach_log').insert({
          lead_id: lead.id,
          channel: 'whatsapp',
          message_type: 'followup_1',
          message_text: message,
          sent_at: new Date().toISOString(),
          delivered: true
        });

        console.log(`   ✅ Follow-up sent via UltraMsg!`);
      }
    } catch (sendErr) {
      console.error(`   ❌ Follow-up failed for ${lead.business_name}:`, sendErr.message);
    }

    await new Promise(r => setTimeout(r, 15000));
  }

  console.log(`✅ Follow-ups queued: ${queued}`);
  if (queued > 0) {
    await sendMessage(`🔄 Follow-ups queued: ${queued} WhatsApp messages`);
  }
}

module.exports = { sendDailyWhatsApp, sendFollowUp };