const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path to save the session file
const SESSION_FILE = path.join(__dirname, '../data/linkedin_session.json');

async function login() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     NAISORA — LinkedIn Session Generator     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\n🚀 Starting LinkedIn browser for manual login...');
  
  // Launch in headful mode so the user can interact
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();
  
  // Set a realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('🔗 Opening LinkedIn login page...');
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👉 ACTION REQUIRED:');
  console.log('   1. Log in manually in the browser window.');
  console.log('   2. Complete any MFA/Captcha if prompted.');
  console.log('   3. Wait until you see your LinkedIn Feed.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Once you are logged in and see your FEED, press [ENTER] here to save session: ', async () => {
      rl.close();
      
      console.log('\n💾 Capturing and saving session cookies...');
      
      try {
        const cookies = await page.cookies();
        
        // Ensure data directory exists
        const dir = path.dirname(SESSION_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        // Save cookies as JSON
        fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ SUCCESS: LinkedIn session saved!`);
        console.log(`📍 Path: ${SESSION_FILE}`);
        console.log(`✨ Cookies saved: ${cookies.length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
      } catch (err) {
        console.error(`❌ FAILED to save session: ${err.message}`);
      } finally {
        await browser.close();
        console.log('👋 Browser closed. You can now run outreach modules.');
        resolve();
      }
    });
  });
}

// Run the script
login().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message);
  process.exit(1);
});
