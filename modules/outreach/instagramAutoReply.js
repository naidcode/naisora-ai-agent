const { launchBrowser } = require('../../config/puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { askClaudeWithSystem } = require('../../config/claude');
const { loginInstagram } = require('./instagramOutreach');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const SESSION_FILE = path.join(__dirname, '../../data/ig_session.json');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function checkInstagramReplies() {
  console.log('\n📬 Checking Instagram DMs for new replies...');
  
  if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
    console.log('❌ Instagram credentials missing');
    return;
  }

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    const loggedIn = await loginInstagram(page);
    if (!loggedIn) return;

    // Go to Instagram Direct Messages
    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });
    await delay(5000);

    // Look for unread/new messages
    // This is tricky with Puppeteer as IG layout changes.
    // We'll look for conversation items in the inbox.
    const conversations = await page.$$('div[role="link"]');
    
    for (let i = 0; i < Math.min(conversations.length, 5); i++) {
      await conversations[i].click();
      await delay(3000);

      // Get last message text
      const lastMessage = await page.evaluate(() => {
        const messages = document.querySelectorAll('div[dir="auto"]');
        if (messages.length === 0) return null;
        
        const lastMsgEl = messages[messages.length - 1];
        // Check if last message is from THEM (not us)
        // Usually our messages have a different class or alignment.
        // On IG web, our messages are often in a container with 'x1nh372m' or similar.
        // This is fragile. A better way is to check if we already replied in our DB.
        
        return lastMsgEl.textContent.trim();
      });

      const username = await page.evaluate(() => {
        const header = document.querySelector('header span[dir="auto"]');
        return header ? header.textContent.trim() : null;
      });

      if (!lastMessage || !username) continue;

      // 1. Check if it's a new reply (not from us and not already handled)
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('instagram_handle', username)
        .maybeSingle();

      if (!lead) continue;

      // Check if we already saved this specific message to avoid double-replying
      const { data: existingLog } = await supabase
        .from('outreach_log')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('channel', 'instagram')
        .eq('message_text', lastMessage)
        .maybeSingle();

      if (existingLog) continue;

      console.log(`💬 New reply from @${username}: "${lastMessage}"`);

      // 2. Generate AI reply
      const systemPrompt = `You are Nahid from Naisora, a web design agency in Bangalore for restaurants.
You are replying to a restaurant owner on Instagram DM.
Rules:
- Casual, friendly Instagram tone
- Max 3-4 lines
- Natural Indian English
- End with one question
- Goal: book a call or send audit
- Price: website from ₹8,000, SEO from ₹3,000/month
- If not interested: polite goodbye
Business: ${lead.business_name} in ${lead.area}
Lead type: ${lead.lead_type}`;

      const aiReply = await askClaudeWithSystem(systemPrompt, lastMessage);

      // 3. Send reply
      const inputArea = await page.$('div[aria-label="Message"]') || await page.$('div[role="textbox"]');
      if (inputArea) {
        await inputArea.click();
        await inputArea.type(aiReply, { delay: 60 });
        await delay(1000);
        await page.keyboard.press('Enter');
        await delay(2000);

        // 4. Log and Alert
        await supabase.from('outreach_log').insert({
          lead_id: lead.id,
          channel: 'instagram',
          message_type: 'reply_received',
          message_text: lastMessage,
          sent_at: new Date().toISOString()
        });

        await supabase.from('outreach_log').insert({
          lead_id: lead.id,
          channel: 'instagram',
          message_type: 'auto_reply',
          message_text: aiReply,
          sent_at: new Date().toISOString()
        });

        await sendTelegramAlert(
          `🔔 *NEW REPLY — Instagram*\n\n` +
          `👤 *Business:* ${lead.business_name}\n` +
          `📍 *Area:* ${lead.area}\n` +
          `💬 *Their message:* ${lastMessage}\n` +
          `🤖 *Our auto reply:* ${aiReply}\n` +
          `📊 *Lead type:* ${lead.lead_type}\n` +
          `🌡️ *Status:* ${lead.lead_category || 'hot'}`
        );

        console.log(`✅ Sent auto-reply to @${username}`);
      }
    }

  } catch (err) {
    console.error('Instagram auto-reply error:', err.message);
  } finally {
    await browser.close();
  }
}

module.exports = { checkInstagramReplies };
