// modules/outreach/whatsappSender.js
// Naisora AI Agent — WhatsApp Sender (Baileys Version)

const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');
const { sendWhatsAppMessage } = require('../../config/whatsapp');

const DAILY_LIMIT = 25;

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Check how many messages sent today
async function getTodayCount() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('outreach_log')
    .select('*', { count: 'exact', head: true })
    .eq('channel', 'whatsapp')
    .gte('sent_at', todayStart.toISOString());

  return count || 0;
}

// Main daily outreach
async function sendDailyWhatsApp() {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    console.log('⏭️  WhatsApp outreach disabled (WHATSAPP_ENABLED != true)');
    return;
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — WhatsApp Outreach (Baileys)    ║');
  console.log('╚══════════════════════════════════════════════╝');

  const todayCount = await getTodayCount();
  const remaining = DAILY_LIMIT - todayCount;

  if (remaining <= 0) {
    console.log('🛑 Daily WhatsApp limit reached');
    await sendMessage('🛑 Daily WhatsApp limit reached (25 messages)');
    return;
  }

  console.log(`📊 Today: ${todayCount} sent, ${remaining} remaining\n`);

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_category', 'hot')
    .neq('outreach_status', 'whatsapp_sent')
    .not('phone', 'is', null)
    .order('lead_score', { ascending: false })
    .limit(remaining);

  if (!leads || leads.length === 0) {
    console.log('📭 No hot leads ready for WhatsApp today.');
    return;
  }

  console.log(`🎯 ${leads.length} hot leads to contact today\n`);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    console.log(`\n📱 [${i + 1}/${leads.length}] Contacting: ${lead.business_name}`);

    const message = `Hi ${lead.business_name} 👋

I noticed your restaurant doesn't have a strong online presence.
I help restaurants in Bangalore get more customers from Google — without paying Zomato commission.

I already did a free audit for your website. Can I share the results?

— Nahid, Naisora`;

    const success = await sendWhatsAppMessage(lead.phone, message);

    if (success) {
      sent++;
      await supabase.from('outreach_log').insert({
        lead_id: lead.id,
        channel: 'whatsapp',
        message_type: 'cold',
        message_text: message,
        sent_at: new Date().toISOString(),
        delivered: true
      });

      await supabase
        .from('leads')
        .update({
          outreach_status: 'whatsapp_sent',
          outreach_channel: 'whatsapp',
          whatsapp_count: (lead.whatsapp_count || 0) + 1,
          last_contacted_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
    } else {
      failed++;
    }

    if (sent + todayCount >= DAILY_LIMIT) {
      console.log('🛑 Daily WhatsApp limit reached');
      break;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 WhatsApp Summary: ${sent} sent, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await sendMessage(
    `📱 *WhatsApp Outreach Complete*\n\n` +
    `✅ Sent: ${sent}\n` +
    `❌ Failed: ${failed}\n` +
    `📊 Today total: ${todayCount + sent}/${DAILY_LIMIT}`
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

  let sent = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    const message = `Hi ${lead.business_name} 👋, just following up on my previous message. Did you get a chance to see the free audit I did for your website?`;

    const success = await sendWhatsAppMessage(lead.phone, message);

    if (success) {
      sent++;
      await supabase
        .from('leads')
        .update({
          outreach_status: 'followup_1',
          last_contacted_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
    }

    if (sent + todayCount >= DAILY_LIMIT) {
      console.log('🛑 Daily WhatsApp limit reached');
      break;
    }
  }

  console.log(`✅ Follow-ups sent: ${sent}`);
  if (sent > 0) {
    await sendMessage(`🔄 Follow-ups sent: ${sent} WhatsApp messages`);
  }
}

module.exports = { sendDailyWhatsApp, sendFollowUp };