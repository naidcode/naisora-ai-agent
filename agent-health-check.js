const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');

// Global counters
let totalChecks = 0;
let passed = 0;
let warnings = 0;
let failed = 0;
let issues = [];

function log(msg, type = 'info') {
    if (type === 'pass') {
        passed++;
        console.log(`✅ ${msg}`);
    } else if (type === 'fail') {
        failed++;
        console.log(`❌ ${msg}`);
        issues.push(`❌ ${msg}`);
    } else if (type === 'warn') {
        warnings++;
        console.log(`⚠️ ${msg}`);
        issues.push(`⚠️ ${msg}`);
    } else {
        console.log(msg);
    }
}

async function run() {
    totalChecks = 7; // Specified in the request
    const envPath = path.join(process.cwd(), '.env');

    console.log('\nStarting Naisora Agent Health Check...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- CHECK 1: .env Variables ---
    console.log('CHECK 1 — .env Variables');
    let envContent = '';
    const envVars = {};
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/\r/g, '');
                envVars[key] = val;
            }
        });

        const keysToCheck = [
            'SUPABASE_URL', 'SUPABASE_KEY', 'ANTHROPIC_API_KEY',
            'DASHBOARD_PORT', 'DASHBOARD_API_KEY',
            'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'
        ];

        keysToCheck.forEach(key => {
            if (envVars[key] && envVars[key] !== '') {
                log(`${key} = set`, 'pass');
            } else {
                log(`${key} = MISSING`, 'fail');
            }
        });
    } catch (e) {
        log('.env file could not be read', 'fail');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- CHECK 2: Module Files Exist ---
    console.log('CHECK 2 — Module Files Exist');
    const filesToCheck = [
        'modules/scraper/googleMapsScraper.js',
        'modules/scraper/leadProcessor.js',
        'modules/scraper/emailScraper.js',
        'modules/scraper/leadDeduplicator.js',
        'modules/outreach/whatsappSender.js',
        'modules/outreach/followUpEngine.js',
        'modules/seo/seoAudit.js',
        'modules/seo/pagespeedAudit.js',
        'modules/seo/keywordResearch.js',
        'modules/content/blogWriter.js',
        'modules/content/socialWriter.js',
        'dashboard-server.js',
        'index.html'
    ];

    filesToCheck.forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            log(`${file} = found`, 'pass');
        } else {
            log(`${file} = MISSING`, 'fail');
        }
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- CHECK 3: Module require() Test ---
    console.log('CHECK 3 — Module require() Test');
    // We only require JS files, skip index.html
    filesToCheck.filter(f => f.endsWith('.js')).forEach(file => {
        const fullPath = path.resolve(process.cwd(), file);
        try {
            require(fullPath);
            log(`${file} = loads OK`, 'pass');
        } catch (e) {
            log(`${file} = ERROR: [${e.message}]`, 'fail');
        }
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- CHECK 4: Supabase Connection ---
    console.log('CHECK 4 — Supabase Connection');
    if (envVars.SUPABASE_URL && envVars.SUPABASE_KEY) {
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_KEY);
            
            const { count, error } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            
            if (error) {
                log(`Supabase error: [${error.message}]`, 'fail');
            } else {
                log(`Supabase connected — leads table: ${count} rows`, 'pass');
            }

            const tables = ['leads', 'clients', 'logs', 'notifications'];
            for (const table of tables) {
                const { error: tError } = await supabase.from(table).select('*', { count: 'exact', head: true });
                if (tError) {
                    log(`${table} table missing or error: [${tError.message}]`, 'fail');
                } else {
                    log(`${table} table exists`, 'pass');
                }
            }
        } catch (e) {
            log(`Supabase library error: [${e.message}]`, 'fail');
        }
    } else {
        log('Supabase credentials missing in .env, skipping connection check', 'warn');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- CHECK 5: PM2 Process Status ---
    console.log('CHECK 5 — PM2 Process Status');
    await new Promise((resolve) => {
        exec('pm2 jlist', (error, stdout, stderr) => {
            if (error) {
                log(`PM2 check failed: ${error.message}`, 'fail');
                return resolve();
            }
            try {
                const processes = JSON.parse(stdout);
                if (processes.length === 0) {
                    log('No PM2 processes found', 'warn');
                } else {
                    processes.forEach(p => {
                        const name = p.name;
                        const status = p.pm2_env.status;
                        const restarts = p.pm2_env.restart_time;
                        const memory = (p.monit.memory / 1024 / 1024).toFixed(1) + 'MB';
                        
                        let msg = `${name} | ${status} | restarts: ${restarts} | mem: ${memory}`;
                        
                        if (status !== 'online') {
                            log(`${msg} (DOWN)`, 'fail');
                        } else if (restarts > 10) {
                            log(`${msg} (HIGH RESTARTS)`, 'warn');
                        } else {
                            log(msg, 'pass');
                        }
                    });
                }
            } catch (e) {
                log(`Failed to parse PM2 output: ${e.message}`, 'fail');
            }
            resolve();
        });
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- CHECK 6: CRLF Corruption Check ---
    console.log('CHECK 6 — CRLF Corruption Check');
    try {
        const buffer = fs.readFileSync(envPath);
        let crlfCount = 0;
        for (let i = 0; i < buffer.length; i++) {
            if (buffer[i] === 0x0D) { // \r
                crlfCount++;
            }
        }
        if (crlfCount > 0) {
            log(`CRLF corruption detected: ${crlfCount} lines affected`, 'fail');
        } else {
            log('No CRLF issues', 'pass');
        }
    } catch (e) {
        log('Failed to read .env for CRLF check', 'fail');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- CHECK 7: Dashboard API Health ---
    console.log('CHECK 7 — Dashboard API Health');
    const port = envVars.DASHBOARD_PORT || 3001;
    const apiKey = envVars.DASHBOARD_API_KEY;
    if (apiKey) {
        await new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: port,
                path: '/api/health',
                method: 'GET',
                headers: { 'x-api-key': apiKey }
            };
            const req = http.request(options, (res) => {
                if (res.statusCode === 200) {
                    log('Dashboard API responding', 'pass');
                } else {
                    log(`Dashboard API returned status: ${res.statusCode}`, 'fail');
                }
                resolve();
            });
            req.on('error', (e) => {
                log(`Dashboard API not reachable: ${e.message}`, 'fail');
                resolve();
            });
            req.end();
        });
    } else {
        log('DASHBOARD_API_KEY missing in .env, skipping API check', 'warn');
    }

    // --- FINAL SUMMARY ---
    const now = new Date().toLocaleString();
    console.log('\n═══════════════════════════════════');
    console.log('NAISORA AGENT HEALTH REPORT');
    console.log(`Date: ${now}`);
    console.log('═══════════════════════════════════');
    console.log(`Total Checks:  ${totalChecks}`);
    console.log(`Passed:        ${passed}  ✅`);
    console.log(`Warnings:      ${warnings}  ⚠️`);
    console.log(`Failed:        ${failed}  ❌`);
    console.log('═══════════════════════════════════');
    if (issues.length > 0) {
        issues.forEach(issue => console.log(issue));
    } else {
        console.log('All systems nominal.');
    }
    console.log('═══════════════════════════════════\n');
}

run();
