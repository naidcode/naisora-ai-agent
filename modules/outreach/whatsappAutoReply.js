const { askClaudeWithSystem } = require('../../config/claude');
const { supabase } = require('../../config/database');

/**
 * Handle incoming WhatsApp replies using Claude Haiku
 * @param {string} phone - Normalised phone number (+91...)
 * @param {string} messageText - The message sent by the lead
 * @returns {Promise<string|null>} - Claude's response text
 */
async function handleWhatsAppReply(phone, messageText) {
  console.log(`📩 Processing WhatsApp reply from ${phone}: ${messageText.substring(0, 50)}...`);

  // 1. Find the lead in Supabase
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    console.error('Error finding lead:', error.message);
    return null;
  }

  if (!lead) {
    console.log(`⚠️ Lead not found for phone ${phone}. Skipping auto-reply.`);
    return null;
  }

  // 2. Build the system prompt
  const systemPrompt = `You are Nahid from Naisora, a web design agency in Bangalore that builds websites and does SEO for restaurants and cafes.

You are replying to a restaurant owner on WhatsApp who responded to your cold outreach.

Rules:
- Be friendly, warm, confident — like a real person texting
- Natural Indian English tone
- Max 4-5 lines per reply
- Always end with one question to keep conversation going
- Goal: move them toward booking a call or sending an audit
- If they mention "price", "cost", "how much" → website from ₹8,000, SEO from ₹3,000/month
- If they mention "call", "meet", "talk", "interested" → send Calendly link: https://calendly.com/naisora/15min or ask for availability
- If they say "not interested", "no thanks", "remove" → be polite, wish them well, and I will mark them as opted out.
- Never use corporate language or sound like a bot

Their lead type: ${lead.lead_type || 'unknown'}
Their business: ${lead.business_name} in ${lead.area}
${lead.website_audit ? `Their website audit: ${JSON.stringify(lead.website_audit)}` : ''}`;

  // 3. Get response from Claude
  try {
    const response = await askClaudeWithSystem(systemPrompt, messageText);
    
    // 3.1 Handle Opt-out
    if (messageText.toLowerCase().includes('not interested') || messageText.toLowerCase().includes('no thanks') || messageText.toLowerCase().includes('remove')) {
      await supabase.from('leads').update({ opted_out: true }).eq('id', lead.id);
      console.log(`   ⛔ Lead opted out: ${lead.business_name}`);
    }
    
    // 3.2 Handle Hot Lead (Interest shown)
    if (messageText.toLowerCase().match(/call|meet|talk|interested|yes|price|cost|how much/)) {
      await supabase.from('leads').update({ lead_category: 'hot' }).eq('id', lead.id);
      const { sendMessage } = require('../../config/telegram');
      await sendMessage(`🔥 *HOT LEAD — ${lead.business_name}* wants to meet on WhatsApp!\nReply: ${messageText}`);
    }

    // 4. Log the incoming message
    await supabase.from('outreach_log').insert({
      lead_id: lead.id,
      channel: 'whatsapp',
      message_type: 'reply_received',
      message_text: messageText,
      sent_at: new Date().toISOString()
    });

    // 5. Update lead status
    await supabase
      .from('leads')
      .update({ 
        outreach_status: 'replied',
        reply_received_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    const { sendMessage } = require('../../config/telegram');
    await sendMessage(
      `🔔 *NEW REPLY — WhatsApp*\n\n` +
      `👤 *Business:* ${lead.business_name}\n` +
      `📍 *Area:* ${lead.area}\n` +
      `💬 *Their message:* ${messageText}\n` +
      `🤖 *Our auto reply:* ${response}\n` +
      `📊 *Lead type:* ${lead.lead_type}\n` +
      `🌡️ *Status:* ${lead.lead_category || 'hot'}`
    );

    return response;
  } catch (err) {
    console.error('Claude auto-reply error:', err.message);
    return null;
  }
}

module.exports = { handleWhatsAppReply };
