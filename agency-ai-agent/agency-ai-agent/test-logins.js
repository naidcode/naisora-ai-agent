// test-logins.js
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Load .env manual
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

const { loginInstagram } = require('./modules/outreach/instagramOutreach');
const { loginLinkedIn } = require('./modules/outreach/linkedinOutreach');

async function testLogins() {
  console.log('🧪 Testing Social Media Logins...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Test Instagram
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📸 Attempting Instagram login...');
    const igSuccess = await loginInstagram(page);
    
    if (igSuccess) {
      console.log('✅ Instagram login successful');
    } else {
      console.log('❌ Instagram login failed — loginInstagram returned false');
    }
    await page.close();
  } catch (err) {
    console.log(`❌ Instagram login failed — ${err.message}`);
  }

  // 2. Test LinkedIn
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('\n💼 Attempting LinkedIn login...');
    const liSuccess = await loginLinkedIn(page);
    
    if (liSuccess) {
      console.log('✅ LinkedIn login successful');
    } else {
      console.log('❌ LinkedIn login failed — loginLinkedIn returned false');
    }
    await page.close();
  } catch (err) {
    console.log(`❌ LinkedIn login failed — ${err.message}`);
  }

  await browser.close();
  console.log('\n🏁 Dual login test complete.');
}

testLogins().catch(err => {
    console.error('Fatal error during test:', err);
    process.exit(1);
});
