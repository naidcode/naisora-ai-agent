// scripts/test_linkedin_msg.js
const { launchBrowser } = require('../config/puppeteer');
const { loginLinkedIn } = require('../modules/outreach/linkedinOutreach');
const { sendMessage: sendTelegramAlert } = require('../config/telegram');

async function testLinkedInMsg() {
  console.log('🧪 Testing LinkedIn Outreach...');
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(30000);
  
  try {
    const loggedIn = await loginLinkedIn(page);
    if (!loggedIn) throw new Error('LinkedIn login failed');

    // Nahid Pasha's profile URL - you might need a real public one or a slug
    const targetProfile = 'https://www.linkedin.com/in/pashanahid/'; 
    const message = `✅ LinkedIn outreach is working! Naisora AI Agent test message — ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

    console.log(`📤 Sending test message to Nahid Pasha...`);
    
    await page.goto(targetProfile, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));

    // Try to find Message button
    let messageBtn = await page.$('button[aria-label^="Message"]') ||
                     await page.$('button.pvs-profile-actions__action.artdeco-button--primary');

    if (!messageBtn) throw new Error('Message/Connect button not found');
    
    await messageBtn.click();
    await new Promise(r => setTimeout(r, 3000));

    const inputArea = await page.$('div[role="textbox"]') || await page.$('.msg-form__contenteditable');
    if (inputArea) {
      await inputArea.click();
      await inputArea.type(message, { delay: 60 });
      const sendBtn = await page.$('button.msg-form__send-button');
      if (sendBtn) await sendBtn.click();
      console.log('✅ LinkedIn direct message sent!');
    } else {
      // Fallback for connection request note
      const noteInput = await page.$('textarea[name="message"]');
      if (noteInput) {
        await noteInput.type(message.substring(0, 199), { delay: 60 });
        const sendBtn = await page.$('button[aria-label="Send now"]');
        if (sendBtn) await sendBtn.click();
        console.log('✅ LinkedIn connection note sent!');
      } else {
        throw new Error('Could not find message input or note area');
      }
    }

    await sendTelegramAlert('💼 ✅ *LinkedIn Outreach Test:* Working! Test message sent to Nahid Pasha');
    
  } catch (err) {
    console.error('❌ LinkedIn Test Failed:', err.message);
    await sendTelegramAlert(`💼 ❌ *LinkedIn Outreach Test:* Failed!\nError: ${err.message}`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testLinkedInMsg();
}

module.exports = { testLinkedInMsg };
