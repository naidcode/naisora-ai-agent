
const { createClient } = require('@supabase/supabase-js');
const { askClaudeWithSystem } = require('../../config/claude');
const { sendMessage: sendTelegram } = require('../../config/telegram');

// Initialize Supabase (re-init because this might run in a separate context or need its own instance)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const INTENT_SYSTEM_PROMPT = `You are an AI assistant for Naisora, a Bangalore-based web design agency.
Your task is to detect the intent of a restaurant owner replying to our cold WhatsApp message.

CATEGORIES:
1. "interested" — User wants to see the audit, growth plan, or says yes/sure/okay/send it.
2. "question" — User asks "who are you?", "what is the price?", "how much?", or "what is this?".
3. "not_interested" — User says no, stop, remove me, not interested, or is rude.
4. "unknown" — Anything else that doesn't fit the above.

Respond with ONLY the category name in lowercase.`;

async function handleIncomingWhatsApp(sock, from, text) {
  try {
    const phone = from.split('@')[0];
    console.log(`🤖 Processing incoming WhatsApp from ${phone}: "${text}"`);

    // 1. Detect Intent
    const intent = await askClaudeWithSystem(INTENT_SYSTEM_PROMPT, text);
    console.log(`🎯 Detected intent: ${intent}`);

    let autoReply = "";

    if (intent === 'interested') {
      autoReply = `Great! 😊

Here's what I found in your free audit:

🔴 Slow mobile loading (hurting your ranking)
🔴 Missing Google Search optimization
🔴 Design doesn't match your food quality

I can fix all of this and get you more customers from Google within 30 days — guaranteed.

Can we get on a quick 10 minute call this week?

— Nahid, Naisora`;
    } else if (intent === 'question') {
      autoReply = `Great question! 😊

I'm Nahid from Naisora — we build websites and do SEO for restaurants in Bangalore.

Our packages start from ₹8,000 one time for a full website.
SEO starts from ₹3,000/month.

But first let me show you your free audit — no commitment needed.

Want me to send it over?

— Nahid, Naisora`;
    } else if (intent === 'not_interested') {
      autoReply = `No problem at all! 🙏
I won't message you again.
If you ever need help with your online presence, we're here.

— Nahid, Naisora`;

      // Mark lead as opted out
      await supabase
        .from('leads')
        .update({ outreach_status: 'opted_out' })
        .eq('phone', `+${phone}`); // Assuming phone in DB has + prefix
    } else {
      autoReply = `Thanks for your reply! 😊 Just checking if you wanted me to send over that free growth plan/audit I prepared for your restaurant?

— Nahid, Naisora`;
    }

    // 2. Send Auto-Reply
    if (autoReply) {
      await sock.sendMessage(from, { text: autoReply });
      console.log(`📤 Sent auto-reply for intent: ${intent}`);
    }

    // 3. Save to Supabase
    await supabase.from('whatsapp_replies').insert({
      phone: phone,
      message: text,
      intent: intent,
      auto_reply_sent: autoReply || 'none'
    });

    // 4. Send Telegram Alert
    const telegramMsg = `
📱 <b>WhatsApp Reply Received!</b>
From: <code>${phone}</code>
Message: "${text}"
Intent: <b>${intent}</b>
Auto-reply: ${autoReply ? '✅ Sent' : '❌ Not sent'}
    `.trim();

    await sendTelegram(telegramMsg);

  } catch (error) {
    console.error('❌ Auto-reply error:', error.message);
  }
}

module.exports = { handleIncomingWhatsApp };
