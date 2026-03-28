// modules/outreach/whatsappSender.js
// Naisora AI Agent — WhatsApp Sender (Clean v3)

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DAILY_LIMIT = 30;

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = () => delay(Math.floor(Math.random() * (8 * 60000 - 3 * 60000) + 3 * 60000));

// Twilio initialised inside function — never at top level
function getTwilioClient() {
  const twilio = require('twilio');
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN missing from .env');
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function getFromNumber() {
  return process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
}

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

// Send a single WhatsApp message
async function sendWhatsApp(lead, message) {
  const toNumber = `whatsapp:${lead.phone}`;

  try {
    const client = getTwilioClient();
    const result = await client.messages.create({
      from: getFromNumber(),
      to: toNumber,
      body: message,
    });

    await supabase.from('outreach_log').insert({
      lead_id: lead.id,
      channel: 'whatsapp',
      message_type: 'cold',
      message_text: message,
      sent_at: new Date().toISOString(),
      delivered: true,
      twilio_sid: result.sid,
    });

    await supabase
      .from('leads')
      .update({
        outreach_status: 'contacted',
        outreach_channel: 'whatsapp',
        whatsapp_count: (lead.whatsapp_count || 0) + 1,
        last_contacted_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    console.log(`✅ WhatsApp sent → ${lead.business_name} (${lead.phone})`);
    return { success: true, sid: result.sid };

  } catch (err) {
    console.error(`❌ WhatsApp failed → ${lead.business_name}: ${err.message}`);

    await supabase.from('outreach_log').insert({
      lead_id: lead.id,
      channel: 'whatsapp',
      message_type: 'cold',
      message_text: message,
      sent_at: new Date().toISOString(),
      delivered: false,
    });

    return { success: false, error: err.message };
  }
}

// Main daily outreach
async function sendDailyWhatsApp() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — WhatsApp Outreach              ║');
  console.log('╚══════════════════════════════════════════════╝');

  const todayCount = await getTodayCount();
  const remaining = DAILY_LIMIT - todayCount;

  if (remaining <= 0) {
    console.log(`⛔ Daily limit reached (${DAILY_LIMIT} messages). Try again tomorrow.`);
    return;
  }

  console.log(`📊 Today: ${todayCount} sent, ${remaining} remaining\n`);

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_category', 'hot')
    .eq('outreach_status', 'new')
    .not('phone', 'is', null)
    .order('lead_score', { ascending: false })
    .limit(remaining);

  if (!leads || leads.length === 0) {
    console.log('📭 No new hot leads to contact today.');
    await sendTelegramAlert('📭 WhatsApp Outreach: No new hot leads today. Run scraper to find more.');
    return;
  }

  console.log(`🎯 ${leads.length} hot leads to contact today\n`);

  const { writeWhatsAppMessage } = require('./whatsappWriter');
  const { humanize } = require('./humanizer');

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    console.log(`\n📱 [${i + 1}/${leads.length}] Contacting: ${lead.business_name} (${lead.area})`);

    const rawMessage = await writeWhatsAppMessage(lead);
    const finalMessage = await humanize(rawMessage);
    const result = await sendWhatsApp(lead, finalMessage);

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Delay between messages — skip after last one
    if (i < leads.length - 1) {
      const waitMin = Math.floor(Math.random() * 5 + 3);
      console.log(`⏳ Waiting ${waitMin} minutes before next message...`);
      await randomDelay();
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 WhatsApp Summary: ${sent} sent, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await sendTelegramAlert(
    `📱 *WhatsApp Outreach Complete*\n\n` +
    `✅ Sent: ${sent}\n` +
    `❌ Failed: ${failed}\n` +
    `📊 Today total: ${todayCount + sent}/${DAILY_LIMIT}`
  );
}

// Follow-up for leads that didn't reply (Day 3)
async function sendFollowUp() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('outreach_status', 'contacted')
    .eq('outreach_channel', 'whatsapp')
    .lt('last_contacted_at', threeDaysAgo.toISOString())
    .limit(15);

  if (!leads || leads.length === 0) {
    console.log('No follow-ups needed today.');
    return;
  }

  const { writeFollowUpMessage } = require('./whatsappWriter');
  const { humanize } = require('./humanizer');

  let sent = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    const rawMessage = await writeFollowUpMessage(lead);
    const finalMessage = await humanize(rawMessage);

    await sendWhatsApp(lead, finalMessage);

    await supabase
      .from('leads')
      .update({
        outreach_status: 'followup_1',
        last_contacted_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    sent++;

    if (i < leads.length - 1) {
      await delay(Math.random() * 300000 + 180000);
    }
  }

  console.log(`✅ Follow-ups sent: ${sent}`);
  await sendTelegramAlert(`🔄 Follow-ups sent: ${sent} WhatsApp messages`);
}

module.exports = { sendDailyWhatsApp, sendWhatsApp, sendFollowUp };