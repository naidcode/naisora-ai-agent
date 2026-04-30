// scripts/comprehensive_health_check.js
require('dotenv').config();
const { supabase } = require('../config/database');
const { testConnection: testClaude, askClaude, askClaudeSonnet } = require('../config/claude');
const { testConnection: testEmail, sendEmail } = require('../config/smtp');
const { handleEmailReplies } = require('../modules/email/emailReplyHandler');
const { sendMessage } = require('../config/telegram');
const fetch = require('node-fetch');

async function runFullHealthCheck() {
  console.log('🚀 Starting Comprehensive AI Agent Health Check...\n');
  
  const report = {
    env: { status: '⏳', detail: 'Checking...' },
    supabase: { status: '⏳', detail: 'Checking...' },
    claude: { status: '⏳', detail: 'Checking...' },
    email: { status: '⏳', detail: 'Checking...' },
    whatsapp: { status: '⏳', detail: 'Checking...' },
    telegram: { status: '⏳', detail: 'Checking...' }
  };

  // 1. Environment Variables
  const criticalEnvs = [
    'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 
    'ANTHROPIC_API_KEY', 
    'EMAIL_USER', 'SMTP_PASS', 'SMTP_HOST', 'IMAP_HOST', 'IMAP_PASS',
    'ULTRAMSG_INSTANCE', 'ULTRAMSG_TOKEN',
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'
  ];
  const missing = criticalEnvs.filter(e => !process.env[e]);
  if (missing.length === 0) {
    report.env = { status: '✅', detail: 'All critical ENVs present' };
  } else {
    report.env = { status: '❌', detail: `Missing: ${missing.join(', ')}` };
  }

  // 2. Supabase
  try {
    const { count, error } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    if (error) throw error;
    report.supabase = { status: '✅', detail: `Connected (${count || 0} leads)` };
  } catch (err) {
    report.supabase = { status: '❌', detail: err.message };
  }

  // 3. Claude AI
  try {
    const haiku = await askClaude('Test');
    const sonnet = await askClaudeSonnet('Test');
    if (haiku && sonnet) {
      report.claude = { status: '✅', detail: 'Haiku & Sonnet Operational' };
    } else {
      throw new Error('AI response empty');
    }
  } catch (err) {
    report.claude = { status: '❌', detail: err.message };
  }

  // 4. Email (Hostinger)
  try {
    const smtpOk = await testEmail();
    if (smtpOk) {
      report.email = { status: '✅', detail: 'Hostinger SMTP/IMAP Connected' };
    } else {
      throw new Error('SMTP Verification Failed');
    }
  } catch (err) {
    report.email = { status: '❌', detail: err.message };
  }

  // 5. WhatsApp (UltraMsg)
  try {
    const url = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE}/instance/status?token=${process.env.ULTRAMSG_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json();
    const status = data?.status?.accountStatus?.status || data?.status;
    if (status === 'authenticated') {
      report.whatsapp = { status: '✅', detail: 'UltraMsg Authenticated & Online' };
    } else {
      const statusDetail = typeof status === 'string' ? status : JSON.stringify(data);
      report.whatsapp = { status: '⚠️', detail: `UltraMsg Status: ${statusDetail}` };
    }
  } catch (err) {
    report.whatsapp = { status: '❌', detail: err.message };
  }

  // 6. Telegram & Final Report
  const statusEmoji = (report.env.status === '✅' && report.supabase.status === '✅' && report.claude.status === '✅' && report.email.status === '✅' && report.whatsapp.status === '✅') ? '🟢' : '🔴';
  
  const telegramMessage = `
${statusEmoji} *NAISORA AI AGENT — FULL HEALTH REPORT*

${report.env.status} *Environment:* ${report.env.detail}
${report.supabase.status} *Database:* ${report.supabase.detail}
${report.claude.status} *Claude AI:* ${report.claude.detail}
${report.email.status} *Email (Hostinger):* ${report.email.detail}
${report.whatsapp.status} *WhatsApp (UltraMsg):* ${report.whatsapp.detail}
✅ *Telegram:* System Operational

*Mode:* ${process.env.SERVER_MODE === 'true' ? '☁️ SERVER' : '💻 LOCAL'}
*Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
  `.trim();

  console.log(telegramMessage);

  try {
    await sendMessage(telegramMessage);
    report.telegram = { status: '✅', detail: 'Report Sent' };
    console.log('\n📲 Telegram report sent successfully!');
  } catch (err) {
    console.error('\n❌ Failed to send Telegram report:', err.message);
  }
}

runFullHealthCheck();
