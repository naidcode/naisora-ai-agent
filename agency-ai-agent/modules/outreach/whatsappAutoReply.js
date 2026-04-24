
const { createClient } = require('@supabase/supabase-js');
const { askClaudeWithSystem } = require('../../config/claude');
const { sendMessage: sendTelegram } = require('../../config/telegram');

// Initialize Supabase (re-init because this might run in a separate context or need its own instance)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const AUTO_REPLY_SYSTEM_PROMPT = `You are Nahid from Naisora, a web design agency in Bangalore that helps restaurants get more customers from Google. You are replying to a restaurant owner on WhatsApp who responded to your cold outreach message.

Your goal is to:
- Be friendly, confident and professional
- Understand what they are asking or saying
- Move them towards booking a free 10 minute call
- Never be pushy or salesy
- Keep replies short — max 4-5 lines
- Use simple English with a natural Indian tone
- Always end with a question to keep conversation going

Business details:
- Website package: starting ₹8,000 one time
- SEO package: starting ₹3,000/month
- Guarantee: results in 30 days or money back
- Contact: hey@naisora.com
- Website: naisora.com

Detect the intent of the message:
- "not_interested": if they say no, stop, remove me, or don't want to talk.
- "interested": if they say yes, send it, okay, or show interest.
- "question": if they ask about price, service, or who you are.
- "unknown": for anything else.

Response format: Return a JSON object with two fields: "intent" and "reply".
Example: {"intent": "interested", "reply": "Glad to hear that! I can send over the audit right away. Would you be free for a quick 10 min call tomorrow to discuss how we can improve your Google ranking?"}`;

async function handleIncomingWhatsApp(sock, from, text) {
  try {
    const phone = from.split('@')[0];
    console.log(`🤖 Processing incoming WhatsApp from ${phone}: "${text}"`);

    // 1. Generate Dynamic Reply and Detect Intent
    const response = await askClaudeWithSystem(AUTO_REPLY_SYSTEM_PROMPT, `Lead message: "${text}"`);
    
    let result;
    try {
      result = JSON.parse(response);
    } catch (e) {
      console.log('⚠️ Failed to parse Claude JSON, using fallback parsing');
      const intentMatch = response.match(/"intent":\s*"([^"]+)"/);
      const replyMatch = response.match(/"reply":\s*"([^"]+)"/);
      result = {
        intent: intentMatch ? intentMatch[1] : 'unknown',
        reply: replyMatch ? replyMatch[1] : response
      };
    }

    const { intent, reply } = result;
    console.log(`🎯 Detected intent: ${intent}`);
    console.log(`✍️  Generated reply: ${reply}`);

    // 2. Handle Opt-Outs
    if (intent === 'not_interested') {
      console.log(`🚫 Marking ${phone} as opted_out`);
      await supabase
        .from('leads')
        .update({ outreach_status: 'opted_out' })
        .eq('phone', `+${phone}`);
    }

    // 3. Send Auto-Reply
    if (reply) {
      await sock.sendMessage(from, { text: reply });
      console.log(`📤 Sent auto-reply to ${phone}`);
    }

    // 4. Save to Supabase
    await supabase.from('whatsapp_replies').insert({
      phone: phone,
      message: text,
      intent: intent,
      auto_reply_sent: reply || 'none'
    });

    // 5. Send Telegram Alert
    const telegramMsg = `
📱 <b>WhatsApp Reply Received!</b>
From: <code>${phone}</code>
Message: "${text}"
Intent: <b>${intent}</b>
Auto-reply: <i>${reply}</i>
    `.trim();

    await sendTelegram(telegramMsg);

  } catch (error) {
    console.error('❌ Auto-reply error:', error.message);
  }
}

module.exports = { handleIncomingWhatsApp };
