// ============================================
// config/telegram.js
// Sends you alerts on Telegram
// When a hot lead appears → you get pinged
// ============================================

// Load .env directly — dotenv was adding hidden \r characters to keys
const fs = require('fs');
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
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ============================================
// SEND A MESSAGE TO YOUR TELEGRAM
// ============================================
async function sendMessage(text) {
  try {
    await axios.post(`${BASE_URL}/sendMessage`, {
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'HTML',   // Allows bold, italic formatting
    });
    console.log('📲 Telegram notification sent!');
  } catch (error) {
    console.error('❌ Telegram error:', error.message);
  }
}

// ============================================
// 🔥 HOT LEAD ALERT
// Called when Claude detects an interested reply
// ============================================
async function sendHotLeadAlert(lead, replyContent) {
  const message = `
🔥 <b>HOT LEAD ALERT!</b> 🔥

👤 <b>Name:</b> ${lead.name}
🏢 <b>Business:</b> ${lead.business_name}
📧 <b>Email:</b> ${lead.email}
📱 <b>Phone:</b> ${lead.phone || 'Not provided'}
📍 <b>City:</b> ${lead.city}

💬 <b>They said:</b>
"${replyContent.substring(0, 300)}..."

👉 <b>Reply now:</b> ${lead.email}

⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
  `.trim();

  await sendMessage(message);
}

// ============================================
// WEEKLY BUSINESS REPORT
// Sent every Monday 8 AM
// ============================================
async function sendWeeklyReport(stats) {
  const message = `
📊 <b>WEEKLY AGENCY REPORT</b>
${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

━━━━━━━━━━━━━━━━━━
🕷️ <b>Leads Found:</b> ${stats.newLeads}
📧 <b>Emails Sent:</b> ${stats.emailsSent}
💬 <b>Replies Received:</b> ${stats.replies}
🔥 <b>Hot Leads:</b> ${stats.hotLeads}

💰 <b>Reply Rate:</b> ${stats.emailsSent > 0 ? ((stats.replies / stats.emailsSent) * 100).toFixed(1) : 0}%
━━━━━━━━━━━━━━━━━━

Keep building. Every email sent is one step closer. 💪
  `.trim();

  await sendMessage(message);
}

// ============================================
// DAILY SUMMARY
// Sent every evening — what agent did today
// ============================================
async function sendDailySummary(emailsSent, leadsFound) {
  const message = `
✅ <b>Daily Agent Summary</b>

🕷️ New leads found: <b>${leadsFound}</b>
📧 Emails sent today: <b>${emailsSent}</b>

Agent is running smoothly. Good night! 🌙
  `.trim();

  await sendMessage(message);
}

// ============================================
// ERROR ALERT
// If something breaks, you get notified
// ============================================
async function sendErrorAlert(errorMsg) {
  const message = `
⚠️ <b>AGENT ERROR</b>

Something went wrong:
<code>${errorMsg}</code>

Check your Railway logs.
  `.trim();

  await sendMessage(message);
}

// ============================================
// TEST — Make sure Telegram works
// ============================================
async function testConnection() {
  console.log('📲 Testing Telegram connection...');
  await sendMessage('✅ <b>AgencyBot connected!</b>\n\nYour AI agent is online and ready. 🚀');
  console.log('✅ Telegram test message sent! Check your phone.');
}

// ============================================
// FIRST TIME SETUP: Find your Chat ID
// 1. Create a bot via @BotFather on Telegram
// 2. Send any message to your bot
// 3. Run this function to get your chat_id
// ============================================
async function getChatId() {
  try {
    const response = await axios.get(`${BASE_URL}/getUpdates`);
    const updates = response.data.result;
    if (updates.length > 0) {
      const chatId = updates[0].message.chat.id;
      console.log('✅ YOUR CHAT ID (save in .env):');
      console.log('TELEGRAM_CHAT_ID=' + chatId);
    } else {
      console.log('⚠️  No messages found. Send any message to your bot first, then run this again.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

module.exports = {
  sendMessage,
  sendHotLeadAlert,
  sendWeeklyReport,
  sendDailySummary,
  sendErrorAlert,
  testConnection,
  getChatId,
};
