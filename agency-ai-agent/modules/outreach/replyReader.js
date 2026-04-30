// modules/outreach/replyReader.js
// Naisora AI Agent — WhatsApp Reply Reader
// Checks UltraMsg for incoming WhatsApp replies
// Saves new replies to Supabase, triggers replyAnalyser + call booking automatically

const { supabase } = require('../../config/database');
const { sendMessage } = require('../../config/telegram');
const { sendUltraMsg } = require('../../config/ultramsg');

// ─── Fetch messages from UltraMsg ───────────────────────────────────────────────
async function checkReplies() {
  console.log('\n📬 Checking WhatsApp replies via UltraMsg...');

  const instance = process.env.ULTRAMSG_INSTANCE;
  const token = process.env.ULTRAMSG_TOKEN;
  
  try {
    const url = `https://api.ultramsg.com/${instance}/messages?token=${token}&msgId=&to=&page=1&limit=50&sort=desc`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Filter for inbound messages only
    const replies = (data.messages || []).filter(m => m.fromMe === false && m.type === 'chat');

    if (replies.length === 0) {
      console.log('   No new replies found.');
      return [];
    }

    console.log(`   Found ${replies.length} recent messages`);
    const newReplies = [];

    for (const message of replies) {
      const alreadySaved = await replyAlreadySaved(message.id);
      if (alreadySaved) continue;

      const fromPhone = message.from.split('@')[0];
      const lead = await matchReplyToLead(fromPhone);
      if (!lead) {
        console.log(`   ⚠️  Unknown number: ${fromPhone} — skipping`);
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
  } catch (err) {
    console.error('UltraMsg fetch error:', err.message);
    return [];
  }
}

// ─── Match reply to lead in Supabase ─────────────────────────────────────────
async function matchReplyToLead(fromNumber) {
  const normalised = fromNumber.replace(/\D/g, '');
  // Try to match with or without 91 prefix
  const cleanPhone = normalised.startsWith('91') && normalised.length > 10 ? normalised.substring(2) : normalised;
  
  const { data } = await supabase
    .from('leads')
    .select('*')
    .or(`phone.eq.${normalised},phone.eq.${cleanPhone}`)
    .maybeSingle();
  return data || null;
}

// ─── Check if we already saved this reply (avoid duplicates) ─────────────────
async function replyAlreadySaved(msgId) {
  const { data } = await supabase
    .from('outreach_log')
    .select('id')
    .eq('external_msg_id', msgId)
    .maybeSingle();
  return !!data;
}

// ─── Save reply to outreach_log ───────────────────────────────────────────────
async function saveReply(lead, message) {
  await supabase.from('outreach_log').insert({
    lead_id: lead.id,
    channel: 'whatsapp',
    message_type: 'reply_received',
    message_text: message.body,
    sent_at: new Date(message.timestamp * 1000).toISOString(),
    external_msg_id: message.id,
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

module.exports = { checkReplies, triggerCallBooking };