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

    console.log(`📤 Starting direct DM flow for @${targetAccount}...`);
    
    // Navigate directly to DM page
    await page.goto(`https://www.instagram.com/direct/new/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Search for user
    const searchInput = await page.waitForSelector('input[placeholder="Search..."], input[name="queryBox"]', { timeout: 15000 });
    await searchInput.type(targetAccount, { delay: 100 });
    await new Promise(r => setTimeout(r, 3000));

    // Click the first result
    const firstResult = await page.evaluateHandle((name) => {
      const elements = Array.from(document.querySelectorAll('span, div'));
      return elements.find(el => el.textContent === name);
    }, targetAccount);

    if (firstResult && firstResult.asElement()) {
      await firstResult.asElement().click();
    } else {
       await page.keyboard.press('Tab');
       await page.keyboard.press('Enter');
    }
    await new Promise(r => setTimeout(r, 2000));

    // Click Next/Chat button
    const nextBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      return btns.find(b => b.textContent.includes('Next') || b.textContent.includes('Chat'));
    });
    if (nextBtn && nextBtn.asElement()) await nextBtn.asElement().click();
    await new Promise(r => setTimeout(r, 5000));

    // Type and send
    const inputSelector = 'div[contenteditable="true"], textarea[placeholder="Message..."], div[aria-label="Message"]';
    const inputArea = await page.waitForSelector(inputSelector, { timeout: 15000 });
    
    if (!inputArea) throw new Error('Message input area not found');
    
    await inputArea.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.type(message, { delay: 60 });
    await new Promise(r => setTimeout(r, 2000));
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
