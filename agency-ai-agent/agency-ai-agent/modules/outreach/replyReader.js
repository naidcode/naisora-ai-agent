// modules/outreach/replyReader.js
// Naisora AI Agent — WhatsApp Reply Reader
// Checks Twilio every 2 hours for incoming WhatsApp replies
// Saves new replies to Supabase, triggers replyAnalyser + call booking automatically

const fs = require('fs');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const cleaned = line.replace(/\r/g, '').trim();
    if (cleaned && !cleaned.startsWith('#') && cleaned.includes('=')) {
      const [key, ...rest] = cleaned.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const twilio = require('twilio');
const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');

// ─── Fetch messages from Twilio ───────────────────────────────────────────────
async function fetchTwilioReplies(hoursBack = 2) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const since = new Date();
  since.setHours(since.getHours() - hoursBack);

  try {
    const messages = await client.messages.list({
      to: process.env.TWILIO_WHATSAPP_NUMBER,
      dateSentAfter: since,
    });
    return messages.filter(m => m.direction === 'inbound');
  } catch (err) {
    console.error('Twilio fetch error:', err.message);
    return [];
  }
}

// ─── Match reply to lead in Supabase ─────────────────────────────────────────
async function matchReplyToLead(fromNumber) {
  const normalised = fromNumber.replace('whatsapp:', '');
  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('phone', normalised)
    .single();
  return data || null;
}

// ─── Check if we already saved this reply (avoid duplicates) ─────────────────
async function replyAlreadySaved(twilioSid) {
  const { data } = await supabase
    .from('outreach_log')
    .select('id')
    .eq('twilio_sid', twilioSid)
    .single();
  return !!data;
}

// ─── Save reply to outreach_log ───────────────────────────────────────────────
async function saveReply(lead, message) {
  await supabase.from('outreach_log').insert({
    lead_id: lead.id,
    channel: 'whatsapp',
    message_type: 'reply_received',
    message_text: message.body,
    sent_at: message.dateSent,
    replied: true,
    reply_text: message.body,
  });

  await supabase
    .from('leads')
    .update({
      outreach_status: 'replied',
      reply_text: message.body,
      reply_received_at: new Date().toISOString(),
    })
    .eq('id', lead.id);
}

// ─── Call booking trigger — fires when a lead shows interest ─────────────────
async function triggerCallBooking(lead, replyText) {
  const interestSignals = [
    'interested', 'yes', 'sure', 'okay', 'ok', 'tell me more',
    'send', 'audit', 'how', 'what', 'price', 'cost', 'free', 'show me', 'when'
  ];

  const lowerReply = (replyText || '').toLowerCase();
  const isInterested = interestSignals.some(signal => lowerReply.includes(signal));
  if (!isInterested) return;

  console.log(`   🔥 INTERESTED LEAD: ${lead.business_name} — triggering call booking alert`);

  await supabase.from('leads').update({
    outreach_status: 'interested',
    interested_at: new Date().toISOString(),
  }).eq('id', lead.id);

  await sendMessage(
    `🔥 *HOT LEAD — INTERESTED REPLY*\n\n` +
    `Business: ${lead.business_name}\n` +
    `Area: ${lead.area}\n` +
    `Phone: ${lead.phone}\n\n` +
    `Their reply: "${replyText}"\n\n` +
    `⚡ Send this NOW:\n` +
    `_"I can show you exactly how to fix this in 10 minutes — when are you free today?"_`
  );
}

// ─── Main reply check function ────────────────────────────────────────────────
async function checkReplies() {
  console.log('\n📬 Checking WhatsApp replies...');

  const replies = await fetchTwilioReplies(2);

  if (replies.length === 0) {
    console.log('   No new replies in last 2 hours.');
    return [];
  }

  console.log(`   Found ${replies.length} incoming messages`);
  const newReplies = [];

  for (const message of replies) {
    const alreadySaved = await replyAlreadySaved(message.sid);
    if (alreadySaved) continue;

    const lead = await matchReplyToLead(message.from);
    if (!lead) {
      console.log(`   ⚠️  Unknown number: ${message.from} — skipping`);
      continue;
    }

    await saveReply(lead, message);
    await triggerCallBooking(lead, message.body);

    console.log(`   💬 Reply from ${lead.business_name}: "${message.body.substring(0, 60)}..."`);
    newReplies.push({ lead, message: message.body });
  }

  if (newReplies.length > 0) {
    console.log(`\n✅ Saved ${newReplies.length} new replies — triggering analyser...`);
    const { analyseReply } = require('./replyAnalyser');
    for (const { lead, message } of newReplies) {
      await analyseReply(lead, message);
    }
  }

  return newReplies;
}

module.exports = { checkReplies, fetchTwilioReplies, triggerCallBooking };