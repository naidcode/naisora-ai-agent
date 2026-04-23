// test-puppeteer.js
const puppeteer = require('puppeteer');

(async () => {
    console.log('🧪 Testing Puppeteer connection...');
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('https://example.com');
        const title = await page.title();
        console.log(`✅ Title found: ${title}`);
        await browser.close();
        console.log('✅ Puppeteer is working correctly');
    } catch (error) {
        console.error('❌ Puppeteer failed to launch:');
        console.error(error.message);
        process.exit(1);
    }
})();
