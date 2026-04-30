// scripts/test_ig_dm.js
const { launchBrowser } = require('../config/puppeteer');
const { loginInstagram } = require('../modules/outreach/instagramOutreach');
const { sendMessage: sendTelegramAlert } = require('../config/telegram');
const fs = require('fs');
const path = require('path');

async function testInstagramDM() {
  console.log('🧪 Testing Instagram Outreach...');
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(30000);
  
  try {
    const loggedIn = await loginInstagram(page);
    if (!loggedIn) throw new Error('Instagram login failed');

    const targetAccount = 'naisora.official';
    const message = `✅ Instagram outreach is working! Naisora AI Agent test message — ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

    console.log(`📤 Sending test DM to @${targetAccount}...`);
    
    await page.goto(`https://www.instagram.com/${targetAccount}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));

    // Click Message button
    const messageBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      return btns.find(b => b.textContent.includes('Message'));
    });

    if (!messageBtn) throw new Error('Message button not found');
    await messageBtn.asElement().click();
    await new Promise(r => setTimeout(r, 5000));

    // Type and send
    const inputArea = await page.waitForSelector('div[aria-label="Message"], div[role="textbox"], textarea[placeholder="Message..."]', { timeout: 15000 });
    
    if (!inputArea) throw new Error('Message input area not found');
    
    await inputArea.click();
    await page.keyboard.type(message, { delay: 60 });
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 3000));

    console.log('✅ Instagram test DM sent!');
    await sendTelegramAlert('📸 ✅ *Instagram Outreach Test:* Working! Test DM sent to @naisora.official');
    
  } catch (err) {
    console.error('❌ Instagram Test Failed:', err.message);
    await sendTelegramAlert(`📸 ❌ *Instagram Outreach Test:* Failed!\nError: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

if (require.main === module) {
  testInstagramDM();
}

module.exports = { testInstagramDM };
