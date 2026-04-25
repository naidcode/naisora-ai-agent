const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { sendMessage } = require('../config/telegram');
const { askClaude } = require('../config/claude');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runHealthCheck() {
  console.log('🏥 Starting Full Agent Health Check...');
  const results = {
    working: [],
    broken: [],
    warnings: [],
    score: 0
  };

  const today = new Date().toLocaleString();

  // 1. Check Module Loading
  const folders = [
    'modules/scraper/',
    'modules/outreach/',
    'modules/email/',
    'modules/seo/',
    'modules/reporting/',
    'brain/',
    'config/',
    'scheduler/'
  ];

  for (const folder of folders) {
    const dirPath = path.join(__dirname, '..', folder);
    if (!fs.existsSync(dirPath)) {
      results.broken.push(`${folder}: Directory missing`);
      continue;
    }
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        require(path.join(dirPath, file));
        results.working.push(`${folder}${file}`);
      } catch (err) {
        results.broken.push(`${folder}${file}: ${err.message}`);
      }
    }
  }

  // 2. Check Connections
  try {
    const { data, error } = await supabase.from('leads').select('id').limit(1);
    if (error) throw error;
    results.working.push('Supabase Connection');
  } catch (err) {
    results.broken.push(`Supabase: ${err.message}`);
  }

  try {
    const resp = await askClaude('health check');
    if (!resp) throw new Error('Empty response');
    results.working.push('Claude API');
  } catch (err) {
    results.broken.push(`Claude: ${err.message}`);
  }

  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    await browser.close();
    results.working.push('Puppeteer');
  } catch (err) {
    results.broken.push(`Puppeteer: ${err.message}`);
  }

  // 3. Check Files
  const criticalFiles = [
    'data/ig_session.json',
    'data/linkedin_session.json',
    'auth_info_baileys/creds.json',
    '.env'
  ];
  for (const f of criticalFiles) {
    if (fs.existsSync(path.join(__dirname, '..', f))) {
      results.working.push(f);
    } else {
      results.warnings.push(`${f} missing`);
    }
  }

  // 4. Check DB Schema
  const schemaChecks = [
    { table: 'leads', cols: 'id, business_name, area, phone, website, email, lead_type, outreach_status, instagram_handle, linkedin_url' },
    { table: 'outreach_log', cols: 'id, lead_id, channel, message_text, sent_at' },
    { table: 'whatsapp_queue', cols: 'id, phone, message, status' }
  ];

  for (const check of schemaChecks) {
    const { error } = await supabase.from(check.table).select(check.cols).limit(0);
    if (error) {
      results.broken.push(`Table ${check.table} missing columns: ${error.message}`);
    } else {
      results.working.push(`Schema: ${check.table}`);
    }
  }

  // Calculate Score
  const totalChecks = results.working.length + results.broken.length;
  results.score = Math.round((results.working.length / totalChecks) * 100);

  // Send Report
  const workingList = results.working.slice(0, 10).map(w => `- ${w}`).join('\n');
  const brokenList = results.broken.map(b => `- ${b}`).join('\n');
  const warningList = results.warnings.map(w => `- ${w}`).join('\n');

  const report = `🏥 *Daily Health Report — ${today}*

✅ *Working perfectly:*
${workingList}
${results.working.length > 10 ? `...and ${results.working.length - 10} more` : ''}

❌ *Broken — needs fix:*
${brokenList || 'None'}

⚠️ *Warnings:*
${warningList || 'None'}

📊 *Overall Health:* ${results.score}%

🔧 *Action needed:* ${results.broken.length > 0 ? 'yes' : 'no'}
${results.broken.length > 0 ? `👉 Fix: ${results.broken[0].split(':')[0]}` : ''}`;

  await sendMessage(report);

  // Urgent Alert
  if (results.broken.length > 0) {
    await sendMessage(
      `🚨 *URGENT — Agent Module Down!*\n\n` +
      `Module: ${results.broken[0].split(':')[0]}\n` +
      `Error: ${results.broken[0].split(':')[1]}\n` +
      `Impact: Critical operations might be stopped.\n` +
      `Fix immediately!`
    );
  }

  console.log(`✅ Health check complete. Score: ${results.score}%`);
}

module.exports = { runHealthCheck };

if (require.main === module) {
  runHealthCheck();
}
