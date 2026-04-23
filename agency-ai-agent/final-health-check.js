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
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
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

    // 10. WhatsApp Baileys
    try {
        require('./modules/outreach/whatsappSender');
    } catch (e) { report.whatsapp = `❌ WhatsApp Module Load Failed: ${e.message}`; }

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

    console.log("=============================");
    console.log("🤖 NAISORA FINAL HEALTH REPORT");
    console.log("=============================");
    
    console.log(`${report.env.ok ? '✅' : '❌'} Environment Variables — ${report.env.ok ? 'All present' : report.env.error}`);
    console.log(`${report.supabase.ok ? '✅' : '❌'} Supabase — ${report.supabase.ok ? 'Connected, all 8 tables present' : report.supabase.error}`);
    console.log(`${report.haiku.ok ? '✅' : '❌'} Claude Haiku — ${report.haiku.ok ? 'Connected' : report.haiku.error}`);
    console.log(`${report.sonnet.ok ? '✅' : '❌'} Claude Sonnet — ${report.sonnet.ok ? 'Connected' : report.sonnet.error}`);
    console.log(`${report.resend.ok ? '✅' : '❌'} Resend Email — ${report.resend.ok ? 'Working' : report.resend.error}`);
    console.log(`${report.telegram.ok ? '✅' : '❌'} Telegram — ${report.telegram.ok ? 'Working' : report.telegram.error}`);
    console.log(`${report.puppeteer.ok ? '✅' : '❌'} Puppeteer — ${report.puppeteer.ok ? 'Working' : report.puppeteer.error}`);
    console.log(`${report.leadScore.ok ? '✅' : '❌'} Lead Scoring — ${report.leadScore.ok ? 'Returns number correctly' : report.leadScore.error}`);
    console.log(`${report.instagram.ok ? '✅' : '❌'} Instagram Session — ${report.instagram.ok ? 'Loaded' : report.instagram.error}`);
    console.log(`${report.linkedin.ok ? '✅' : '❌'} LinkedIn Session — ${report.linkedin.ok ? 'Loaded' : report.linkedin.error}`);
    console.log(report.whatsapp);
    console.log(`${report.content.ok ? '✅' : '❌'} Content Pipeline — ${report.content.ok ? 'All 5 modules ready' : report.content.error}`);
    console.log(`${report.seo.ok ? '✅' : '❌'} SEO Modules — ${report.seo.ok ? 'All ready' : report.seo.error}`);
    console.log(`${report.scheduler.ok ? '✅' : '❌'} Scheduler — ${report.scheduler.ok ? 'All 7 cron jobs registered' : report.scheduler.error}`);
    
    console.log("=============================");
    const allOk = report.env.ok && report.supabase.ok && report.haiku.ok && report.sonnet.ok && report.resend.ok && report.telegram.ok && report.puppeteer.ok && report.leadScore.ok && report.instagram.ok && report.linkedin.ok && report.content.ok && report.seo.ok && report.scheduler.ok;
    console.log(`AGENT STATUS: ${allOk ? '🟢 FULLY OPERATIONAL' : '🔴 ISSUES DETECTED'}`);
    console.log("=============================");
}

runHealthCheck();
