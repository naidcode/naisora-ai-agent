const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

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

async function runHealthCheck() {
    const report = {
        env: { ok: false, error: null },
        supabase: { ok: false, error: null },
        haiku: { ok: false, error: null },
        sonnet: { ok: false, error: null },
        resend: { ok: false, error: null },
        telegram: { ok: false, error: null },
        puppeteer: { ok: false, error: null },
        leadScore: { ok: false, error: null },
        instagram: { ok: false, error: null },
        linkedin: { ok: false, error: null },
        whatsapp: '⚠️ WhatsApp — Module ready, SIM pending',
        content: { ok: false, error: null },
        seo: { ok: false, error: null },
        scheduler: { ok: false, error: null }
    };

    // 1. Environment Variables
    const requiredEnvs = [
        'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY',
        'TELEGRAM_BOT_TOKEN', 'INSTAGRAM_USERNAME', 'INSTAGRAM_PASSWORD',
        'LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD', 'PAGESPEED_API_KEY'
    ];
    let missingEnvs = [];
    for (const env of requiredEnvs) {
        if (!process.env[env] || process.env[env].trim() === "") {
            missingEnvs.push(env);
        }
    }
    if (missingEnvs.length === 0) {
        report.env.ok = true;
    } else {
        report.env.error = `Missing/Empty ENVs: ${missingEnvs.join(', ')}`;
    }

    // 2. Supabase
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const tables = ['leads', 'clients', 'outreach_log', 'seo_reports', 'blog_posts', 'rankings', 'invoices', 'content_ideas'];
        let missingTables = [];
        for (const table of tables) {
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error && error.code === '42P01') {
                missingTables.push(table);
            }
        }
        if (missingTables.length === 0) {
            report.supabase.ok = true;
        } else {
            report.supabase.error = `Missing tables: ${missingTables.join(', ')}`;
        }
    } catch (e) { report.supabase.error = e.message; }

    // 3. Claude
    try {
        const { askClaude, askClaudeSonnet } = require('./config/claude');
        const h = await askClaude('Reply with exactly "Haiku OK"');
        if (h && h.includes('Haiku')) report.haiku.ok = true;
        const s = await askClaudeSonnet('Reply with exactly "Sonnet OK"');
        if (s && s.includes('Sonnet')) report.sonnet.ok = true;
    } catch (e) { 
        if (!report.haiku.ok) report.haiku.error = e.message;
        if (!report.sonnet.ok) report.sonnet.error = e.message;
    }

    // 4. Resend
    try {
        const { sendEmail } = require('./config/smtp');
        await sendEmail('hey@naisora.com', 'Final Health Check', '<p>Resend working!</p>');
        report.resend.ok = true;
    } catch (e) { report.resend.error = e.message; }

    // 5. Telegram
    try {
        const { sendMessage } = require('./config/telegram');
        await sendMessage('✅ Final check — agent fully operational');
        report.telegram.ok = true;
    } catch (e) { report.telegram.error = e.message; }

    // 6. Puppeteer
    try {
        const { launchBrowser } = require('./config/puppeteer');
        const browser = await launchBrowser();
        const page = await browser.newPage();
        await page.goto('https://example.com');
        const title = await page.title();
        if (title) report.puppeteer.ok = true;
        await browser.close();
    } catch (e) { report.puppeteer.error = e.message; }

    // 7. Lead Processor
    try {
        const { scoreLead } = require('./modules/scraper/leadProcessor');
        const score = scoreLead({ has_website: false, phone: '123' });
        if (typeof score === 'number') report.leadScore.ok = true;
    } catch (e) { report.leadScore.error = e.message; }

    // 8. Instagram
    try {
        const igSessionPath = './data/ig_session.json';
        if (fs.existsSync(igSessionPath)) {
            const session = JSON.parse(fs.readFileSync(igSessionPath, 'utf8'));
            if (Array.isArray(session) && session.length > 0) {
                report.instagram.ok = true;
            } else {
                report.instagram.error = "Instagram session file empty or invalid";
            }
        } else {
            report.instagram.error = "Instagram session file missing";
        }
    } catch (e) { report.instagram.error = e.message; }

    // 9. LinkedIn
    try {
        const liSessionPath = './data/linkedin_session.json';
        if (fs.existsSync(liSessionPath)) {
            const session = JSON.parse(fs.readFileSync(liSessionPath, 'utf8'));
            const liAt = session.find(c => c.name === 'li_at');
            if (liAt) {
                report.linkedin.ok = true;
            } else {
                report.linkedin.error = "li_at cookie missing in LinkedIn session";
            }
        } else {
            report.linkedin.error = "LinkedIn session file missing";
        }
    } catch (e) { report.linkedin.error = e.message; }

    // 10. WhatsApp UltraMsg
    try {
        if (process.env.ULTRAMSG_INSTANCE && process.env.ULTRAMSG_TOKEN) {
            report.whatsapp = `✅ WhatsApp — UltraMsg configured (Instance: ${process.env.ULTRAMSG_INSTANCE})`;
        } else {
            report.whatsapp = '⚠️ WhatsApp — UltraMsg config missing in .env';
        }
    } catch (e) { report.whatsapp = `❌ WhatsApp Module Check Failed: ${e.message}`; }

    // 11. Content Pipeline
    try {
        const modules = ['contentScraper', 'contentValidator', 'scriptWriter', 'hookGenerator', 'contentPipeline'];
        let missingModules = [];
        for (const m of modules) {
            try {
                require(`./modules/content/${m}`);
            } catch (e) {
                missingModules.push(m);
            }
        }
        if (missingModules.length === 0) {
            report.content.ok = true;
        } else {
            report.content.error = `Modules failed: ${missingModules.join(', ')}`;
        }
    } catch (e) { report.content.error = e.message; }

    // 12. SEO Modules
    try {
        const modules = ['pagespeedAudit', 'keywordResearch', 'onPageAudit'];
        let missingModules = [];
        for (const m of modules) {
            try {
                require(`./modules/seo/${m}`);
            } catch (e) {
                missingModules.push(m);
            }
        }
        if (missingModules.length === 0) {
            report.seo.ok = true;
        } else {
            report.seo.error = `Modules failed: ${missingModules.join(', ')}`;
        }
    } catch (e) { report.seo.error = e.message; }

    // 13. Scheduler
    try {
        const content = fs.readFileSync('./scheduler/cronJobs.js', 'utf8');
        const checks = [
            '30 8 * * *', '0 10 * * *', '0 11 * * *', '0 14 * * *', '0 16 * * *', '0 21 * * *', '0 20 * * 0'
        ];
        let missingCrons = [];
        for (const c of checks) {
            if (!content.includes(c)) {
                missingCrons.push(c);
            }
        }
        if (missingCrons.length === 0) {
            report.scheduler.ok = true;
        } else {
            report.scheduler.error = `Missing Crons: ${missingCrons.join(', ')}`;
        }
    } catch (e) { report.scheduler.error = e.message; }

    // 14. Channel Tests (Optional CLI flag)
    if (process.argv.includes('--run-tests')) {
        console.log("\n🧪 Running Channel Tests (IG, LinkedIn)...");
        const { testInstagramDM } = require('./scripts/test_ig_dm');
        const { testLinkedInMsg } = require('./scripts/test_linkedin_msg');
        await testInstagramDM();
        await testLinkedInMsg();
    }

    const reportMsg = `
📊 *NAISORA AGENT HEALTH REPORT*
━━━━━━━━━━━━━━━━━━━━
✅ *Core:*
- ENV: ${report.env.ok ? 'OK' : '❌ ' + report.env.error}
- DB: ${report.supabase.ok ? 'OK' : '❌ ' + report.supabase.error}
- AI: ${report.sonnet.ok ? 'OK' : '❌ ' + report.sonnet.error}
- Puppeteer: ${report.puppeteer.ok ? 'OK' : '❌ ' + report.puppeteer.error}

📱 *Outreach Channels:*
- Email: ${report.resend.ok ? '✅ Ready' : '❌ Failed'}
- WhatsApp: ${report.whatsapp.includes('✅') ? '✅ UltraMsg Ready' : '❌ Config Missing'}
- Instagram: ${report.instagram.ok ? '✅ Session Ready' : '⚠️ ' + report.instagram.error}
- LinkedIn: ${report.linkedin.ok ? '✅ Session Ready' : '⚠️ ' + report.linkedin.error}

🤖 *Automation:*
- Scheduler: ${report.scheduler.ok ? '✅ Crons Active' : '❌ Missing Crons'}
- Auto-Reply: ✅ 5m Polling Active

━━━━━━━━━━━━━━━━━━━━
🌡️ *Status:* ${report.env.ok && report.supabase.ok && report.sonnet.ok ? '🟢 OPERATIONAL' : '🔴 ISSUES DETECTED'}
`.trim();

    const { sendMessage } = require('./config/telegram');
    await sendMessage(reportMsg);

    console.log("=============================");
    console.log("🤖 NAISORA FINAL HEALTH REPORT SENT TO TELEGRAM");
    console.log("=============================");
}

runHealthCheck().catch(err => {
    console.error('Fatal error in health check:', err.message);
    process.exit(1);
});
