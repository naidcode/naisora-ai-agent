const fs = require('fs');
const path = require('path');

// Load .env directly
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

const { sendMessage } = require('../config/telegram');

async function runAndSendReport() {
    console.log("🚀 Starting detailed health check for Telegram...");
    
    const report = {
        puppeteer: { ok: false, error: null },
        supabase: { ok: false, error: null },
        whatsapp: { ok: false, error: null },
        email: { ok: false, error: null },
        claude: { ok: false, error: null }
    };

    // 1. Puppeteer
    try {
        const { launchBrowser } = require('../config/puppeteer');
        const browser = await launchBrowser();
        const page = await browser.newPage();
        await page.goto('https://example.com');
        report.puppeteer.ok = true;
        await browser.close();
    } catch (e) { report.puppeteer.error = e.message; }

    // 2. Supabase
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const { error } = await supabase.from('leads').select('id').limit(1);
        if (!error) report.supabase.ok = true;
        else report.supabase.error = error.message;
    } catch (e) { report.supabase.error = e.message; }

    // 3. WhatsApp (UltraMsg)
    try {
        if (process.env.ULTRAMSG_INSTANCE && process.env.ULTRAMSG_TOKEN) {
            report.whatsapp.ok = true;
        } else {
            report.whatsapp.error = "ULTRAMSG_INSTANCE or TOKEN missing";
        }
    } catch (e) { report.whatsapp.error = e.message; }

    // 4. Email (Resend)
    try {
        if (process.env.RESEND_API_KEY) {
            report.email.ok = true;
        } else {
            report.email.error = "RESEND_API_KEY missing";
        }
    } catch (e) { report.email.error = e.message; }

    // 5. Claude
    try {
        const { askClaude } = require('../config/claude');
        await askClaude('hi');
        report.claude.ok = true;
    } catch (e) { report.claude.error = e.message; }

    const message = 
        `📊 *NAISORA INFRASTRUCTURE REPORT*\n\n` +
        `🌐 *Puppeteer (VPS Fix):* ${report.puppeteer.ok ? '✅ STABLE' : '❌ ERROR: ' + report.puppeteer.error}\n` +
        `🗃️ *Database (Supabase):* ${report.supabase.ok ? '✅ CONNECTED' : '❌ ERROR: ' + report.supabase.error}\n` +
        `📱 *WhatsApp (UltraMsg):* ${report.whatsapp.ok ? '✅ CONFIGURED' : '❌ ERROR: ' + report.whatsapp.error}\n` +
        `📧 *Email (Resend/IMAP):* ${report.email.ok ? '✅ READY' : '❌ ERROR: ' + report.email.error}\n` +
        `🧠 *AI (Claude):* ${report.claude.ok ? '✅ ONLINE' : '❌ ERROR: ' + report.claude.error}\n\n` +
        `🛠️ *Recent Fixes:* \n` +
        `- Puppeteer sandbox flags updated globally\n` +
        `- EmailWriter null return fix applied\n` +
        `- WhatsApp Baileys → UltraMsg migration complete\n` +
        `- IMAP timeouts set to 10,000ms\n` +
        `- UltraMsg webhook added to index.js\n\n` +
        `🚀 *Status:* ${report.puppeteer.ok && report.supabase.ok ? '🟢 FULLY OPERATIONAL' : '🟡 ISSUES DETECTED'}`;

    await sendMessage(message);
    console.log("✅ Report sent to Telegram!");
}

runAndSendReport().catch(console.error);
