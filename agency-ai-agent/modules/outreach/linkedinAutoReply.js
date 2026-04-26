const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage: sendTelegramAlert } = require('../../config/telegram');
const { askClaudeWithSystem } = require('../../config/claude');
const { loginLinkedIn } = require('./linkedinOutreach');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const SESSION_FILE = path.join(__dirname, '../../data/linkedin_session.json');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function checkLinkedInReplies() {
  console.log('\n📬 Checking LinkedIn messages for new replies...');
  
  if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
    console.log('❌ LinkedIn credentials missing');
    return;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    const loggedIn = await loginLinkedIn(page);
    if (!loggedIn) return;

    // Go to LinkedIn Messaging
    await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'networkidle2' });
    await delay(5000);

    // Look for conversations
    const conversations = await page.$$('.msg-conversations-list__item');
    
    for (let i = 0; i < Math.min(conversations.length, 5); i++) {
      await conversations[i].click();
      await delay(3000);

      // Get last message text and sender name
      const data = await page.evaluate(() => {
        const messages = document.querySelectorAll('.msg-s-event-listitem__body');
        const nameEl = document.querySelector('.msg-entity-lockup__title');
        
        if (messages.length === 0) return null;
        
        return {
          lastMessage: messages[messages.length - 1].textContent.trim(),
          name: nameEl ? nameEl.textContent.trim() : null
        };
      });

      if (!data || !data.lastMessage || !data.name) continue;

      // 1. Match with lead in DB (by name or profile URL if possible)
      // Since matching by name is loose, we'll try to find a lead that was messaged on LinkedIn
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .ilike('business_name', `%${data.name}%`)
        .eq('linkedin_sent', true)
        .maybeSingle();

      if (!lead) continue;

      // Check if we already handled this message
      const { data: existingLog } = await supabase
        .from('outreach_log')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('channel', 'linkedin')
        .eq('message_text', data.lastMessage)
        .maybeSingle();

      if (existingLog) continue;

      console.log(`💬 New reply from ${data.name}: "${data.lastMessage}"`);

      // 2. Generate AI reply
      const systemPrompt = `You are Nahid, Founder of Naisora web design agency in Bangalore.
You are replying to a restaurant owner on LinkedIn.
Rules:
- Professional but warm LinkedIn tone
- Max 4-5 lines
- Clear and direct
- End with one question or CTA
- Goal: book a discovery call
- Price: website from ₹8,000, SEO from ₹3,000/month
- If not interested: professional goodbye
Business: ${lead.business_name} in ${lead.area}
Lead type: ${lead.lead_type}`;

      const aiReply = await askClaudeWithSystem(systemPrompt, data.lastMessage);

      // 3. Send reply
      const inputArea = await page.$('div[role="textbox"]') || await page.$('.msg-form__contenteditable');
      if (inputArea) {
        await inputArea.click();
        await inputArea.type(aiReply, { delay: 60 });
        await delay(1000);
        
        const sendBtn = await page.$('button.msg-form__send-button');
        if (sendBtn) await sendBtn.click();
        
        await delay(2000);

        // 4. Log and Alert
        await supabase.from('outreach_log').insert({
          lead_id: lead.id,
          channel: 'linkedin',
          message_type: 'reply_received',
          message_text: data.lastMessage,
          sent_at: new Date().toISOString()
        });

        await supabase.from('outreach_log').insert({
          lead_id: lead.id,
          channel: 'linkedin',
          message_type: 'auto_reply',
          message_text: aiReply,
          sent_at: new Date().toISOString()
        });

        await sendTelegramAlert(
          `🔔 *NEW REPLY — LinkedIn*\n\n` +
          `👤 *Business:* ${lead.business_name}\n` +
          `📍 *Area:* ${lead.area}\n` +
          `💬 *Their message:* ${data.lastMessage}\n` +
          `🤖 *Our auto reply:* ${aiReply}\n` +
          `📊 *Lead type:* ${lead.lead_type}\n` +
          `🌡️ *Status:* ${lead.lead_category || 'hot'}`
        );

        console.log(`✅ Sent auto-reply to ${data.name}`);
      }
    }

  } catch (err) {
    console.error('LinkedIn auto-reply error:', err.message);
  } finally {
    await browser.close();
  }
}

module.exports = { checkLinkedInReplies };
