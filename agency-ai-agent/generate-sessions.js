// generate-sessions.js
// Naisora AI Agent — Session Generator Tool
// Used to log in manually and save cookies to bypass bot detection

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const IG_SESSION_FILE = path.join(__dirname, 'data/ig_session.json');
const LI_SESSION_FILE = path.join(__dirname, 'data/linkedin_session.json');

async function generateSessions() {
  console.log('🚀 Starting Naisora Session Generator...');
  
  // Ensure data directory exists
  if (!fs.existsSync('data')) {
    console.log('📂 Creating data/ directory...');
    fs.mkdirSync('data');
  }

  const browser = await puppeteer.launch({
    headless: false, // Visible browser window for manual login
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  try {
    // 1. Instagram
    console.log('\n🌐 Browser opened — please log into Instagram manually');
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
    console.log('⏳ Waiting 60 seconds for you to complete login...');
    console.log('   (The script will automatically grab cookies after 60s)');
    
    await new Promise(r => setTimeout(r, 60000));
    
    const igCookies = await page.cookies();
    fs.writeFileSync(IG_SESSION_FILE, JSON.stringify(igCookies, null, 2));
    console.log('✅ Instagram session saved to data/ig_session.json');

    // 2. LinkedIn
    console.log('\n🌐 Browser opened — please log into LinkedIn manually');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
    console.log('⏳ Waiting 60 seconds for you to complete login...');
    
    await new Promise(r => setTimeout(r, 60000));
    
    const liCookies = await page.cookies();
    fs.writeFileSync(LI_SESSION_FILE, JSON.stringify(liCookies, null, 2));
    console.log('✅ LinkedIn session saved to data/linkedin_session.json');

    console.log('\n🎉 ALL SESSIONS SAVED SUCCESSFULLY.');
    console.log('You can now deploy these files to Railway to bypass login blocks.');

  } catch (err) {
    console.error('❌ Error generating sessions:', err.message);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

generateSessions().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
