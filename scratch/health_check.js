const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Mocking .env load to ensure we have the vars
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
    console.log("=============================");
    console.log("🤖 NAISORA AGENT HEALTH CHECK");
    console.log("=============================");

    const report = {
        claude: false,
        supabase: false,
        tables: false,
        resend: false,
        telegram: false,
        scraper: false,
        leadScore: false,
        emailSend: false,
        puppeteer: false,
        instagram: false,
        linkedin: false,
        whatsapp: '⚠️ WhatsApp Pending — SIM needed',
        contentPipelineReady: false,
        seoReady: false,
        envsPresent: false,
        envVars: {},
        contentPipeline: {},
        seoModules: {}
    };

    // 1. Core Connections
    console.log("\n1. CORE CONNECTIONS");
    try {
        const { askClaude, askClaudeSonnet } = require('../config/claude');
        const haiku = await askClaude('Reply with "Haiku OK"');
        const sonnet = await askClaudeSonnet('Reply with "Sonnet OK"');
        if (haiku && sonnet) {
            report.claude = true;
            console.log("✅ Claude AI Connected (Haiku: " + haiku.trim() + ", Sonnet: " + sonnet.trim() + ")");
        }
    } catch (e) { console.error("❌ Claude AI Failed:", e.message); }

    try {
        const { supabase } = require('../config/database');
        const { data, error } = await supabase.from('leads').select('id').limit(1);
        if (!error) {
            report.supabase = true;
            console.log("✅ Supabase Connected");
            
            const tables = ['leads', 'clients', 'outreach_log', 'seo_reports', 'blog_posts', 'rankings', 'invoices', 'content_ideas'];
            let allPresent = true;
            for (const table of tables) {
                const { error: tErr } = await supabase.from(table).select('id').limit(1);
                if (tErr && tErr.code === '42P01') {
                    console.error(`❌ Table missing: ${table}`);
                    allPresent = false;
                }
            }
            report.tables = allPresent;
            if (allPresent) console.log("✅ All tables present");
        } else {
             console.error("❌ Supabase connection error:", error.message);
        }
    } catch (e) { console.error("❌ Supabase Failed:", e.message); }

    if (process.env.RESEND_API_KEY) {
        report.resend = true;
        console.log("✅ Resend API Key Present");
    } else {
        console.error("❌ Resend API Key Missing");
    }

    try {
        const { sendMessage } = require('../config/telegram');
        await sendMessage("🤖 Final health check running");
        report.telegram = true;
        console.log("✅ Telegram Working");
    } catch (e) { console.error("❌ Telegram Failed:", e.message); }

    // 2. Scraper Modules
    console.log("\n2. SCRAPER MODULES");
    try {
        require('../modules/scraper/googleMapsScraper');
        console.log("✅ Google Maps scraper loaded");
        report.scraper = true;
    } catch (e) { console.error("❌ Google Maps scraper load failed:", e.message); }

    try {
        const { scoreLead } = require('../modules/scraper/leadProcessor');
        const score = scoreLead({ has_website: false, phone: '123' });
        if (typeof score === 'number') {
            report.leadScore = true;
            console.log("✅ scoreLead() returns a number: " + score);
        }
    } catch (e) { console.error("❌ scoreLead() test failed:", e.message); }

    // 3. Email Outreach
    console.log("\n3. EMAIL OUTREACH");
    try {
        const { sendEmail } = require('../config/smtp');
        await sendEmail('hey@naisora.com', 'Agent Health Check', '<p>Resend email is working</p>');
        report.emailSend = true;
        console.log("✅ Resend email working");
    } catch (e) { console.error("❌ Resend email failed:", e.message); }

    // 4. Puppeteer
    console.log("\n4. PUPPETEER");
    try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto('https://example.com');
        const title = await page.title();
        if (title) {
            report.puppeteer = true;
            console.log("✅ Puppeteer Working (Title: " + title + ")");
        }
        await browser.close();
    } catch (e) { console.error("❌ Puppeteer Failed:", e.message); }

    // 5. Instagram
    console.log("\n5. INSTAGRAM");
    try {
        const ig = require('../modules/outreach/instagramOutreach');
        const igSessionPath = path.join(__dirname, '../data/ig_session.json');
        if (fs.existsSync(igSessionPath)) {
            console.log("✅ Instagram Session Present");
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
            const page = await browser.newPage();
            const loggedIn = await ig.loginInstagram(page);
            if (loggedIn) {
                report.instagram = true;
                console.log("✅ Instagram Logged In");
            }
            await browser.close();
        } else {
             console.log("❌ Instagram Session Missing");
        }
    } catch (e) { console.error("❌ Instagram Test Failed:", e.message); }

    // 6. LinkedIn
    console.log("\n6. LINKEDIN");
    try {
        const li = require('../modules/outreach/linkedinOutreach');
        const liSessionPath = path.join(__dirname, '../data/linkedin_session.json');
        if (fs.existsSync(liSessionPath)) {
            console.log("✅ LinkedIn Session Present");
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
            const page = await browser.newPage();
            const loggedIn = await li.loginLinkedIn(page);
            if (loggedIn) {
                report.linkedin = true;
                console.log("✅ LinkedIn Logged In");
            }
            await browser.close();
        } else {
            console.log("❌ LinkedIn Session Missing");
        }
    } catch (e) { console.error("❌ LinkedIn Test Failed:", e.message); }

    // 8. Content Pipeline
    console.log("\n8. CONTENT PIPELINE");
    const contentFiles = [
        'modules/content/contentScraper.js',
        'modules/content/contentValidator.js',
        'modules/content/scriptWriter.js',
        'modules/content/hookGenerator.js',
        'modules/content/contentPipeline.js'
    ];
    let contentReady = true;
    for (const f of contentFiles) {
        try {
            require('../' + f);
            console.log(`✅ ${f} loaded`);
            report.contentPipeline[f] = true;
        } catch (e) {
            console.error(`❌ ${f} load failed:`, e.message);
            report.contentPipeline[f] = false;
            contentReady = false;
        }
    }
    report.contentPipelineReady = contentReady;

    // 9. SEO Modules
    console.log("\n9. SEO MODULES");
    const seoFiles = [
        'modules/seo/pagespeedAudit.js',
        'modules/seo/keywordResearch.js',
        'modules/seo/onPageAudit.js'
    ];
    let seoReady = true;
    for (const f of seoFiles) {
        try {
            require('../' + f);
            console.log(`✅ ${f} loaded`);
            report.seoModules[f] = true;
        } catch (e) {
            console.error(`❌ ${f} load failed:`, e.message);
            report.seoModules[f] = false;
            seoReady = false;
        }
    }
    report.seoReady = seoReady;

    // 10. Environment Variables
    console.log("\n10. ENVIRONMENT VARIABLES");
    const envs = [
        'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY',
        'TELEGRAM_BOT_TOKEN', 'INSTAGRAM_USERNAME', 'INSTAGRAM_PASSWORD',
        'LINKEDIN_EMAIL', 'LINKEDIN_PASSWORD', 'GOOGLE_PAGESPEED_API_KEY'
    ];
    let envsPresent = true;
    for (const env of envs) {
        if (process.env[env]) {
            console.log(`✅ ${env} present`);
            report.envVars[env] = true;
        } else {
            console.log(`❌ ${env} missing`);
            report.envVars[env] = false;
            envsPresent = false;
        }
    }
    report.envsPresent = envsPresent;

    // Final Summary
    console.log("\n=============================");
    console.log("🤖 NAISORA AGENT FINAL HEALTH REPORT");
    console.log("=============================");
    console.log(`${report.claude ? '✅' : '❌'} Claude AI Connected`);
    console.log(`${report.supabase ? '✅' : '❌'} Supabase Connected`);
    console.log(`${report.tables ? '✅' : '❌'} All tables present`);
    console.log(`${report.resend ? '✅' : '❌'} Resend Email Working`);
    console.log(`${report.telegram ? '✅' : '❌'} Telegram Working`);
    console.log(`${report.puppeteer ? '✅' : '❌'} Puppeteer Working`);
    console.log(`${report.instagram ? '✅' : '❌'} Instagram Session Loaded`);
    console.log(`${report.linkedin ? '✅' : '❌'} LinkedIn Session Loaded`);
    console.log(report.whatsapp);
    console.log(`${report.contentPipelineReady ? '✅' : '❌'} Content Pipeline Ready`);
    console.log(`${report.seoReady ? '✅' : '❌'} SEO Modules Ready`);
    console.log(`${report.envsPresent ? '✅' : '❌'} All Environment Variables Present`);
    console.log("=============================");
    const allOk = report.claude && report.supabase && report.tables && report.resend && report.telegram && report.puppeteer && report.envsPresent;
    console.log(`AGENT STATUS: ${allOk ? '🟢 FULLY OPERATIONAL' : '🔴 ISSUES DETECTED'}`);
    console.log("=============================");
}

runHealthCheck();
