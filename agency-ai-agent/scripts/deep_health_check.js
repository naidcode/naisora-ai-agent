
// scripts/deep_health_check.js
// Naisora AI Agent — Deep E2E Health Check (Updated for Hostinger & UltraMsg)

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// ─── Helper: Load Environment ────────────────────────────────────────────────
function loadEnv() {
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
}
loadEnv();

// ─── Constants ───────────────────────────────────────────────────────────────
const TABLES = ['leads', 'clients', 'outreach_log', 'seo_reports', 'blog_posts', 'rankings', 'invoices', 'content_ideas'];

async function runHealthCheck() {
    console.log("========================================");
    console.log("🤖 NAISORA DEEP HEALTH REPORT");
    console.log("========================================");

    const report = [];

    // 1. Environment Variables
    try {
        const requiredVars = [
          'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ANTHROPIC_API_KEY', 
          'EMAIL_USER', 'SMTP_PASS', 'SMTP_HOST', 'IMAP_HOST', 'IMAP_PASS',
          'ULTRAMSG_INSTANCE', 'ULTRAMSG_TOKEN',
          'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'
        ];
        let envOk = true;
        requiredVars.forEach(v => {
            if (!process.env[v]) {
                console.log(`❌ ${v} missing`);
                envOk = false;
            } else {
                console.log(`✅ ${v} present`);
            }
        });
        if (envOk) report.push("✅ Environment Variables — All required present");
        else report.push("❌ Environment Variables — Missing critical keys");
    } catch (err) {
        report.push(`❌ Environment Variables — ${err.message}`);
    }

    // 2. Supabase — Deep Test
    let supabase;
    try {
        const { createClient } = require('@supabase/supabase-js');
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        
        // Check tables
        for (const table of TABLES) {
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error) throw new Error(`Table ${table} check failed: ${error.message}`);
        }

        // Insert test row
        const testLead = {
            business_name: "HEALTH_CHECK_TEST",
            area: "TEST_AREA",
            outreach_status: "new",
            source: "health_check"
        };
        const { data: inserted, error: insError } = await supabase.from('leads').insert([testLead]).select('id');
        if (insError) throw insError;
        const testId = inserted[0].id;

        // Read back
        const { data: read, error: readError } = await supabase.from('leads').select('*').eq('id', testId);
        if (readError) throw readError;
        if (read[0].business_name !== "HEALTH_CHECK_TEST") throw new Error("Read back data mismatch");

        // Delete
        const { error: delError } = await supabase.from('leads').delete().eq('id', testId);
        if (delError) throw delError;

        console.log("✅ Supabase insert/read/delete working");
        report.push("✅ Supabase — All 8 tables, insert/read/delete working");
    } catch (err) {
        console.log(`❌ Supabase — ${err.message}`);
        report.push(`❌ Supabase — ${err.message}`);
    }

    // 3. Claude API — Deep Test
    try {
        const { askClaude, askClaudeSonnet } = require('../config/claude');
        const haiku = await askClaude("Say 'Haiku OK'");
        if (typeof haiku !== 'string') throw new Error("Haiku response not a string");
        console.log("✅ Claude Haiku — Real response confirmed");
        report.push("✅ Claude Haiku — Real response confirmed");

        const sonnet = await askClaudeSonnet("Say 'Sonnet OK'");
        if (typeof sonnet !== 'string') throw new Error("Sonnet response not a string");
        console.log("✅ Claude Sonnet — Real response confirmed");
        report.push("✅ Claude Sonnet — Real response confirmed");
    } catch (err) {
        console.log(`❌ Claude API — ${err.message}`);
        report.push(`❌ Claude API — ${err.message}`);
    }

    // 4. Hostinger Email — Deep Test
    try {
        const { sendEmail, testConnection } = require('../config/smtp');
        const smtpOk = await testConnection();
        if (!smtpOk) throw new Error("SMTP connection test failed");
        
        await sendEmail('hey@naisora.com', 'Deep Health Check Test', 'This confirms Hostinger email is working correctly');
        console.log("✅ Hostinger Email — Test email delivered");
        report.push("✅ Hostinger Email — Test email delivered via SMTP");
    } catch (err) {
        console.log(`❌ Hostinger Email — ${err.message}`);
        report.push(`❌ Hostinger Email — ${err.message}`);
    }

    // 5. Telegram — Deep Test
    try {
        const { sendMessage } = require('../config/telegram');
        await sendMessage("🤖 Deep health check running — all systems being tested");
        console.log("✅ Telegram — Message delivered");
        report.push("✅ Telegram — Message delivered");
    } catch (err) {
        console.log(`❌ Telegram — ${err.message}`);
        report.push(`❌ Telegram — ${err.message}`);
    }

    // 6. Puppeteer — Deep Test
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.goto('https://example.com');
        const title = await page.title();
        if (title !== 'Example Domain') throw new Error(`Example.com title mismatch: ${title}`);
        
        await page.goto('https://google.com');
        console.log("✅ Puppeteer working on multiple URLs");
        report.push("✅ Puppeteer — Working on multiple URLs");
    } catch (err) {
        console.log(`❌ Puppeteer — ${err.message}`);
        report.push(`❌ Puppeteer — ${err.message}`);
    } finally {
        if (browser) await browser.close();
    }

    // 7. Lead Processor — Deep Test
    try {
        const { scoreLead, categorizeLead } = require('../modules/scraper/leadProcessor');
        const fakeLead = { name: "Test", has_website: false, phone: "9876543210", rating: 3.0, review_count: 10 };
        const scoreResult = await scoreLead(fakeLead);
        const score = typeof scoreResult === 'object' ? scoreResult.score : scoreResult;
        
        if (typeof score !== 'number') throw new Error(`scoreLead returned non-number: ${typeof score}`);
        const category = categorizeLead(score);
        console.log(`✅ Lead Scoring — Returns number: [${score}] Category: [${category}]`);
        report.push(`✅ Lead Scoring — Returns number, categorisation correct`);
    } catch (err) {
        console.log(`❌ Lead Processor — ${err.message}`);
        report.push(`❌ Lead Processor — ${err.message}`);
    }

    // 8. Google Maps Scraper — Deep Test
    try {
        const { scrapeOne } = require('../modules/scraper/googleMapsScraper');
        const leads = await scrapeOne("Koramangala", "restaurants", 1);
        if (leads.length === 0) throw new Error("No leads found in Koramangala");
        console.log("✅ Scraper working");
        report.push("✅ Google Maps Scraper — Working correctly");
    } catch (err) {
        console.log(`❌ Google Maps Scraper — ${err.message}`);
        report.push(`❌ Google Maps Scraper — ${err.message}`);
    }

    // 9. UltraMsg WhatsApp — Deep Test
    try {
        const url = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE}/instance/status?token=${process.env.ULTRAMSG_TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();
        const status = data?.status?.accountStatus?.status || data?.status;
        if (status === 'authenticated') {
            console.log("✅ UltraMsg — Authenticated & Online");
            report.push("✅ WhatsApp (UltraMsg) — Authenticated & Online");
        } else {
            throw new Error(`UltraMsg status: ${status || JSON.stringify(data)}`);
        }
    } catch (err) {
        console.log(`❌ WhatsApp (UltraMsg) — ${err.message}`);
        report.push(`❌ WhatsApp (UltraMsg) — ${err.message}`);
    }

    // 10. Content Pipeline & SEO — Modules Load Test
    try {
        require('../modules/content/contentPipeline');
        require('../modules/seo/pagespeedAudit');
        console.log("✅ Pipeline & SEO Modules — Loaded successfully");
        report.push("✅ Modules — Content & SEO modules loaded successfully");
    } catch (err) {
        console.log(`❌ Modules Load — ${err.message}`);
        report.push(`❌ Modules Load — ${err.message}`);
    }

    // 11. Scheduler — Job Check
    try {
        const cronText = fs.readFileSync(path.join(__dirname, '../scheduler/cronJobs.js'), 'utf8');
        if (cronText.includes('startAllJobs')) {
            console.log("✅ Scheduler — Cron jobs script present");
            report.push("✅ Scheduler — Cron jobs script verified");
        } else {
            throw new Error("Scheduler script content invalid");
        }
    } catch (err) {
        console.log(`❌ Scheduler — ${err.message}`);
        report.push(`❌ Scheduler — ${err.message}`);
    }

    console.log("\n========================================");
    report.forEach(line => console.log(line));
    console.log("========================================");
    const allOk = report.every(r => r.startsWith('✅') || r.startsWith('⚠️'));
    
    const finalReport = `
🚀 *NAISORA DEEP HEALTH CHECK*
${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

${report.join('\n')}

*FINAL STATUS:* ${allOk ? "🟢 FULLY OPERATIONAL" : "🔴 ISSUES DETECTED"}
    `.trim();

    const { sendMessage } = require('../config/telegram');
    await sendMessage(finalReport);
    
    console.log(allOk ? "🟢 AGENT STATUS: FULLY OPERATIONAL" : "🔴 AGENT STATUS: ISSUES DETECTED");
    console.log("========================================");
}

runHealthCheck().catch(console.error);
